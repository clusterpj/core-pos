<!-- src/views/pos/components/dialogs/PaymentDialog.vue -->
<!-- Previous template code remains exactly the same until the script section -->
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
                      <span>Subtotal:</span>
                      <strong>{{ formatCurrency(invoiceTotal / 100) }}</strong>
                    </div>
                    <div class="d-flex justify-space-between mb-2" v-if="tipAmount > 0">
                      <span>Tip:</span>
                      <strong>{{ formatCurrency(tipAmount / 100) }}</strong>
                    </div>
                    <div class="d-flex justify-space-between mb-2">
                      <span>Total Amount:</span>
                      <strong>{{ formatCurrency((invoiceTotal + tipAmount) / 100) }}</strong>
                    </div>
                    <div class="d-flex justify-space-between">
                      <span>Remaining:</span>
                      <strong>{{ formatCurrency(remainingAmount / 100) }}</strong>
                    </div>
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>

            <!-- Tip Button -->
            <v-row>
              <v-col cols="12">
                <v-btn
                  block
                  color="primary"
                  variant="outlined"
                  @click="showTipDialog = true"
                  class="mb-4"
                >
                  {{ tipAmount > 0 ? `Update Tip (${formatCurrency(tipAmount / 100)})` : 'Add Tip' }}
                </v-btn>
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
                    v-model="payment.displayAmount"
                    label="Amount"
                    type="number"
                    :rules="[
                      v => !!v || 'Amount is required',
                      v => v > 0 || 'Amount must be greater than 0',
                      v => Number(v) === (invoiceTotal + tipAmount) / 100 || 'Full payment is required'
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
                      v-model="payment.displayReceived"
                      label="Amount Received"
                      type="number"
                      :rules="[
                        v => !!v || 'Received amount is required',
                        v => Number(v) >= Number(payment.displayAmount) || 'Received amount must be greater than or equal to payment amount'
                      ]"
                      :prefix="'$'"
                      @input="calculateChange(index)"
                    ></v-text-field>

                    <!-- Change Amount Display -->
                    <div v-if="payment.returned > 0" class="text-caption mb-2">
                      <div class="d-flex justify-space-between">
                        <span>Change:</span>
                        <strong>{{ formatCurrency(payment.returned / 100) }}</strong>
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
                      {{ getFeeDescription(payment.method_id, payment.amount) }}
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

  <!-- Tip Dialog -->
  <v-dialog v-model="showTipDialog" max-width="400px">
    <v-card>
      <v-card-title class="text-h6">
        Select Tip Amount
      </v-card-title>
      <v-card-text>
        <p class="text-subtitle-2 mb-4">Choose a tip percentage or enter a custom amount.</p>
        
        <!-- Preset Tip Percentages -->
        <v-row class="mb-4">
          <v-col v-for="percent in tipPercentages" :key="percent" cols="3">
            <v-btn
              block
              :variant="selectedTipPercent === percent ? 'flat' : 'outlined'"
              :color="selectedTipPercent === percent ? 'primary' : undefined"
              @click="selectTipPercent(percent)"
            >
              {{ percent }}%
            </v-btn>
          </v-col>
        </v-row>

        <!-- Custom Tip Input -->
        <v-row>
          <v-col cols="12">
            <v-text-field
              v-model="customTipPercent"
              label="Custom %"
              type="number"
              min="0"
              max="100"
              append-inner-text="%"
              @input="handleCustomTipInput"
            ></v-text-field>
          </v-col>
        </v-row>

        <!-- Tip Amount Display -->
        <v-row v-if="calculatedTip > 0">
          <v-col cols="12">
            <div class="d-flex justify-space-between">
              <span>Tip Amount:</span>
              <strong>{{ formatCurrency(calculatedTip / 100) }}</strong>
            </div>
          </v-col>
        </v-row>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="grey" variant="text" @click="cancelTip">
          Cancel
        </v-btn>
        <v-btn color="primary" @click="confirmTip">
          Confirm Tip
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
  displayAmount: '0',
  received: 0,
  displayReceived: '0',
  returned: 0,
  fees: 0 
}])

// Tip related state
const showTipDialog = ref(false)
const tipPercentages = [15, 18, 20, 25]
const selectedTipPercent = ref(null)
const customTipPercent = ref('')
const tipAmount = ref(0)
const tipType = ref('percentage')

// Computed properties for invoice details
const invoiceNumber = computed(() => {
  return props.invoice?.invoice?.invoice_number || 
         `${props.invoice?.invoicePrefix}-${props.invoice?.nextInvoiceNumber}` || 
         ''
})

const invoiceTotal = computed(() => {
  // Invoice total is already in cents (431 for $4.31)
  return props.invoice?.invoice?.total || 0
})

const calculatedTip = computed(() => {
  const percent = selectedTipPercent.value || Number(customTipPercent.value) || 0
  return Math.round((invoiceTotal.value * percent) / 100)
})

// Dialog computed property
const dialog = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const remainingAmount = computed(() => {
  const totalPaid = payments.value.reduce((sum, payment) => {
    return sum + payment.amount
  }, 0)
  return (invoiceTotal.value + tipAmount.value) - totalPaid
})

const totalPayments = computed(() => {
  return payments.value.reduce((sum, payment) => {
    return sum + payment.amount
  }, 0)
})

const totalFees = computed(() => {
  return payments.value.reduce((sum, payment) => {
    return sum + (payment.fees || 0)
  }, 0)
})

const canAddMorePayments = computed(() => {
  return remainingAmount.value > 0 && payments.value.length < paymentMethods.value.length
})

const isValid = computed(() => {
  return payments.value.every(payment => {
    if (!payment.method_id || !payment.amount) return false
    if (isCashOnly(payment.method_id) && !payment.received) return false
    return true
  }) && remainingAmount.value === 0
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
  payment.displayReceived = payment.displayAmount
  payment.received = payment.amount
  payment.returned = 0
  payment.fees = 0
  validateAmount(index)
}

const handleDenominationClick = (money, index) => {
  const payment = payments.value[index]
  const currentReceived = Number(payment.displayReceived || 0)
  payment.displayReceived = (currentReceived + Number(money.amount)).toString()
  payment.received = Math.round(Number(payment.displayReceived) * 100)
  calculateChange(index)
}

const calculateChange = (index) => {
  const payment = payments.value[index]
  if (!payment.displayReceived || !payment.displayAmount) return

  const received = Math.round(Number(payment.displayReceived) * 100)
  const amount = payment.amount
  
  payment.received = received
  
  if (received >= amount) {
    payment.returned = received - amount
  } else {
    payment.returned = 0
  }
}

const validateAmount = (index) => {
  const payment = payments.value[index]
  if (!payment.displayAmount) return

  // Force full payment
  payment.displayAmount = ((invoiceTotal.value + tipAmount.value) / 100).toString()

  // Convert display amount to cents
  payment.amount = Math.round(Number(payment.displayAmount) * 100)

  // Calculate fees if applicable
  if (hasPaymentFees(payment.method_id)) {
    payment.fees = calculateFees(payment.method_id, payment.amount)
  }

  // Set initial received amount for cash payments
  if (isCashOnly(payment.method_id)) {
    payment.displayReceived = payment.displayAmount
    payment.received = payment.amount
    payment.returned = 0
  }
}

const addPayment = () => {
  payments.value.push({ 
    method_id: null, 
    amount: 0,
    displayAmount: ((invoiceTotal.value + tipAmount.value) / 100).toString(),
    received: 0,
    displayReceived: '0',
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

// Tip related methods
const selectTipPercent = (percent) => {
  selectedTipPercent.value = percent
  customTipPercent.value = ''
}

const handleCustomTipInput = () => {
  selectedTipPercent.value = null
}

const cancelTip = () => {
  showTipDialog.value = false
  selectedTipPercent.value = null
  customTipPercent.value = ''
}

const confirmTip = () => {
  tipAmount.value = calculatedTip.value
  tipType.value = 'percentage'
  showTipDialog.value = false
  
  // Update payment amounts after tip change
  payments.value.forEach((payment, index) => validateAmount(index))
}

const processPayment = async () => {
  if (!isValid.value || processing.value) return

  processing.value = true
  try {
    // Calculate total amount including tip
    const totalAmount = invoiceTotal.value + tipAmount.value

    // Format payments for API - amounts are already in cents
    const formattedPayments = payments.value.map(payment => ({
      method_id: payment.method_id,
      name: getPaymentMethod(payment.method_id).name,
      amount: payment.amount,
      received: payment.received,
      returned: payment.returned,
      valid: true
    }))

    // Create invoice data with tip and ensure total matches
    const invoiceData = {
      ...props.invoice.invoice,
      tip: selectedTipPercent.value || Number(customTipPercent.value) || 0,
      tip_type: tipType.value,
      tip_val: tipAmount.value,
      total: totalAmount, // Ensure total includes tip
      due_amount: totalAmount, // Update due amount to match total
      sub_total: invoiceTotal.value // Original amount without tip
    }

    // Create payment
    const result = await createPayment(invoiceData, formattedPayments)
    
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

      // Reset state with initial display amount
      const initialDisplayAmount = ((invoiceTotal.value + tipAmount.value) / 100).toString()
      payments.value = [{
        method_id: null,
        amount: 0,
        displayAmount: initialDisplayAmount,
        received: 0,
        displayReceived: '0',
        returned: 0,
        fees: 0
      }]
      processing.value = false
      
      // Reset tip state
      tipAmount.value = 0
      selectedTipPercent.value = null
      customTipPercent.value = ''
      
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
