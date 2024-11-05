<!-- src/views/pos/components/dialogs/PaymentDialog.vue -->
<template>
  <v-dialog v-model="dialog" max-width="600px" persistent>
    <v-card>
      <v-card-title class="text-h5">
        Process Payment
        <v-spacer></v-spacer>
        <v-btn icon @click="closeDialog">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-card-title>

      <v-card-text>
        <v-container>
          <!-- Loading State -->
          <v-row v-if="loading">
            <v-col cols="12" class="text-center">
              <v-progress-circular indeterminate></v-progress-circular>
            </v-col>
          </v-row>

          <template v-else>
            <!-- Invoice Summary -->
            <v-row>
              <v-col cols="12">
                <v-card variant="outlined">
                  <v-card-text>
                    <div class="d-flex justify-space-between mb-2">
                      <span>Invoice Number:</span>
                      <strong>{{ invoiceNumber }}</strong>
                    </div>
                    <div class="d-flex justify-space-between mb-2">
                      <span>Total Amount:</span>
                      <strong>{{ formatCurrency(invoiceTotal / 100) }}</strong>
                    </div>
                    <div class="d-flex justify-space-between">
                      <span>Remaining:</span>
                      <strong>{{ formatCurrency(remainingAmount / 100) }}</strong>
                    </div>
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>

            <!-- Payment Methods -->
            <v-row>
              <v-col cols="12">
                <div v-for="(payment, index) in payments" :key="index" class="mb-4">
                  <!-- Payment Method Selection -->
                  <v-select
                    v-model="payment.method_id"
                    :items="paymentMethods"
                    item-title="formattedNameLabel"
                    item-value="id"
                    label="Payment Method"
                    :rules="[v => !!v || 'Payment method is required']"
                    @update:model-value="handleMethodChange(index)"
                  ></v-select>

                  <!-- Amount Input -->
                  <v-text-field
                    v-model="payment.amount"
                    label="Amount"
                    type="number"
                    :rules="[
                      v => !!v || 'Amount is required',
                      v => v > 0 || 'Amount must be greater than 0',
                      v => allowPartialPay || v <= remainingAmount / 100 || 'Amount exceeds remaining balance',
                      v => allowPartialPay || Number(v) === invoiceTotal / 100 || 'Full payment is required'
                    ]"
                    :prefix="'$'"
                    @input="validateAmount(index)"
                  ></v-text-field>

                  <!-- Cash Payment Fields -->
                  <template v-if="isCashOnly(payment.method_id)">
                    <!-- Denominations Grid -->
                    <div v-if="getDenominations(payment.method_id)?.length" class="mb-4">
                      <div class="text-subtitle-2 mb-2">Quick Amount Selection</div>
                      <v-row>
                        <v-col v-for="money in getDenominations(payment.method_id)" 
                              :key="money.id" 
                              cols="4" 
                              class="pa-1">
                          <v-btn block
                                variant="outlined"
                                size="small"
                                @click="handleDenominationClick(money, index)">
                            {{ formatCurrency(Number(money.amount)) }}
                          </v-btn>
                        </v-col>
                      </v-row>
                    </div>

                    <!-- Received Amount -->
                    <v-text-field
                      v-model="payment.received"
                      label="Amount Received"
                      type="number"
                      :rules="[
                        v => !!v || 'Received amount is required',
                        v => Number(v) >= Number(payment.amount) || 'Received amount must be greater than or equal to payment amount'
                      ]"
                      :prefix="'$'"
                      @input="calculateChange(index)"
                    ></v-text-field>

                    <!-- Change Amount Display -->
                    <div v-if="payment.returned > 0" class="text-caption mb-2">
                      <div class="d-flex justify-space-between">
                        <span>Change:</span>
                        <strong>{{ formatCurrency(payment.returned) }}</strong>
                      </div>
                    </div>
                  </template>

                  <!-- Payment Fees -->
                  <div v-if="hasPaymentFees(payment.method_id)" class="text-caption mb-2">
                    <div class="d-flex justify-space-between">
                      <span>Service Fee:</span>
                      <strong>{{ formatCurrency(payment.fees / 100) }}</strong>
                    </div>
                    <div class="text-grey">
                      {{ getFeeDescription(payment.method_id, payment.amount * 100) }}
                    </div>
                  </div>

                  <!-- Remove Payment Button -->
                  <v-btn
                    v-if="index > 0"
                    color="error"
                    variant="outlined"
                    size="small"
                    class="mb-2"
                    @click="removePayment(index)"
                  >
                    Remove Payment Method
                  </v-btn>

                  <v-divider v-if="index < payments.length - 1" class="my-4"></v-divider>
                </div>

                <!-- Add Payment Method Button -->
                <v-btn
                  v-if="canAddMorePayments"
                  color="primary"
                  variant="outlined"
                  size="small"
                  class="mt-2"
                  @click="addPayment"
                >
                  Add Payment Method
                </v-btn>

                <!-- Total with Fees -->
                <v-card v-if="totalFees > 0" variant="outlined" class="mt-4">
                  <v-card-text>
                    <div class="d-flex justify-space-between mb-2">
                      <span>Subtotal:</span>
                      <strong>{{ formatCurrency(totalPayments / 100) }}</strong>
                    </div>
                    <div class="d-flex justify-space-between mb-2">
                      <span>Service Fees:</span>
                      <strong>{{ formatCurrency(totalFees / 100) }}</strong>
                    </div>
                    <div class="d-flex justify-space-between">
                      <span>Total:</span>
                      <strong>{{ formatCurrency((totalPayments + totalFees) / 100) }}</strong>
                    </div>
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>

            <!-- Error Message -->
            <v-row v-if="error">
              <v-col cols="12">
                <v-alert type="error" variant="tonal">
                  {{ error }}
                </v-alert>
              </v-col>
            </v-row>
          </template>
        </v-container>
      </v-card-text>

      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn
          color="primary"
          :loading="processing"
          :disabled="!isValid || processing"
          @click="processPayment"
        >
          Process Payment
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { usePayment } from '../../composables/usePayment'

const props = defineProps({
  modelValue: Boolean,
  invoice: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['update:modelValue', 'payment-complete'])

const {
  loading,
  error,
  paymentMethods,
  settings,
  createPayment,
  fetchPaymentMethods,
  fetchSettings,
  getDenominations,
  calculateFees,
  getPaymentMethod,
  isCashOnly
} = usePayment()

const processing = ref(false)
const payments = ref([{ 
  method_id: null, 
  amount: 0, 
  received: 0,
  returned: 0,
  fees: 0 
}])

// Computed properties for invoice details
const invoiceNumber = computed(() => {
  return props.invoice?.invoice?.invoice_number || 
         `${props.invoice?.invoicePrefix}-${props.invoice?.nextInvoiceNumber}` || 
         ''
})

const invoiceTotal = computed(() => {
  return props.invoice?.invoice?.total || 0
})

const allowPartialPay = computed(() => settings.value?.allow_partial_pay === '1')

// Dialog computed property
const dialog = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const remainingAmount = computed(() => {
  const totalPaid = payments.value.reduce((sum, payment) => {
    return sum + (Number(payment.amount) || 0) * 100
  }, 0)
  return invoiceTotal.value - totalPaid
})

const totalPayments = computed(() => {
  return payments.value.reduce((sum, payment) => {
    return sum + (Number(payment.amount) || 0) * 100
  }, 0)
})

const totalFees = computed(() => {
  return payments.value.reduce((sum, payment) => {
    return sum + (payment.fees || 0)
  }, 0)
})

const canAddMorePayments = computed(() => {
  return (allowPartialPay.value || remainingAmount.value > 0) && 
         payments.value.length < paymentMethods.value.length
})

const isValid = computed(() => {
  return payments.value.every(payment => {
    if (!payment.method_id || !payment.amount) return false
    if (isCashOnly(payment.method_id) && !payment.received) return false
    return true
  }) && (allowPartialPay.value || remainingAmount.value === 0)
})

// Methods
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount)
}

const hasPaymentFees = (methodId) => {
  const method = getPaymentMethod(methodId)
  return method?.IsPaymentFeeActive === 'YES'
}

const getFeeDescription = (methodId, amount) => {
  const method = getPaymentMethod(methodId)
  if (!method?.registrationdatafees) return ''

  const fees = method.registrationdatafees
  switch (fees.type) {
    case 'FIXED':
      return `Fixed fee: ${formatCurrency(fees.value)}`
    case 'PERCENTAGE':
      return `${fees.value}% of transaction amount`
    case 'FIXED_PLUS_PERCENTAGE':
      return `${formatCurrency(fees.value.fixed)} + ${fees.value.percentage}% of transaction amount`
    default:
      return ''
  }
}

const handleMethodChange = (index) => {
  const payment = payments.value[index]
  payment.received = payment.amount
  payment.returned = 0
  payment.fees = 0
  validateAmount(index)
}

const handleDenominationClick = (money, index) => {
  const payment = payments.value[index]
  payment.received = Number(payment.received || 0) + Number(money.amount)
  calculateChange(index)
}

const calculateChange = (index) => {
  const payment = payments.value[index]
  if (!payment.received || !payment.amount) return

  const received = Number(payment.received)
  const amount = Number(payment.amount)
  
  if (received >= amount) {
    payment.returned = received - amount
  } else {
    payment.returned = 0
  }
}

const validateAmount = (index) => {
  const payment = payments.value[index]
  if (!payment.amount) return

  if (!allowPartialPay.value) {
    // If partial pay is not allowed, force full payment
    payment.amount = invoiceTotal.value / 100
  } else {
    // Otherwise, limit to remaining amount
    payment.amount = Math.min(
      Number(payment.amount),
      remainingAmount.value / 100
    )
  }

  // Calculate fees if applicable
  if (hasPaymentFees(payment.method_id)) {
    payment.fees = calculateFees(payment.method_id, payment.amount * 100)
  }

  // Set initial received amount for cash payments
  if (isCashOnly(payment.method_id)) {
    payment.received = payment.amount
    payment.returned = 0
  }
}

const addPayment = () => {
  payments.value.push({ 
    method_id: null, 
    amount: 0, 
    received: 0,
    returned: 0,
    fees: 0 
  })
}

const removePayment = (index) => {
  payments.value.splice(index, 1)
  // Recalculate amounts for remaining payments
  payments.value.forEach((payment, idx) => validateAmount(idx))
}

const closeDialog = () => {
  if (!processing.value) {
    dialog.value = false
  }
}

const processPayment = async () => {
  if (!isValid.value || processing.value) return

  processing.value = true
  try {
    // Format payments for API
    const formattedPayments = payments.value.map(payment => ({
      method_id: payment.method_id,
      name: getPaymentMethod(payment.method_id).name,
      amount: Math.round(payment.amount * 100), // Convert to cents
      received: Math.round(payment.received * 100), // Convert to cents
      returned: Math.round(payment.returned * 100), // Convert to cents
      valid: true
    }))

    // Create payment
    const result = await createPayment(props.invoice.invoice, formattedPayments)
    
    // Emit success
    emit('payment-complete', result)
    
    // Close dialog
    dialog.value = false
  } catch (err) {
    console.error('Payment failed:', err)
    window.toastr?.['error'](err.message || 'Failed to process payment')
  } finally {
    processing.value = false
  }
}

// Initialize
watch(() => dialog.value, async (newValue) => {
  if (newValue) {
    try {
      // Get company settings
      await fetchSettings()

      // Reset state
      payments.value = [{
        method_id: null,
        amount: settings.value?.allow_partial_pay === '1' ? 0 : invoiceTotal.value / 100,
        received: 0,
        returned: 0,
        fees: 0
      }]
      processing.value = false
      
      // Fetch payment methods
      await fetchPaymentMethods()
    } catch (error) {
      console.error('Failed to initialize payment dialog:', error)
      window.toastr?.['error']('Failed to initialize payment')
      dialog.value = false
    }
  }
})
</script>

<style scoped>
.v-card-text {
  padding-top: 20px;
}
</style>
