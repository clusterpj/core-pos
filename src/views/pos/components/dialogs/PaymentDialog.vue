<!-- src/views/pos/components/dialogs/PaymentDialog.vue -->
<template>
  <v-dialog 
    v-model="dialog" 
    :fullscreen="$vuetify.display.mobile"
    :max-width="$vuetify.display.mobile ? '100%' : '800px'"
    persistent
    scrollable
    transition="dialog-bottom-transition"
    class="payment-dialog"
  >
    <v-card class="payment-dialog-card">
      <v-toolbar 
        color="primary" 
        class="payment-dialog-toolbar"
        :elevation="2"
      >
        <v-toolbar-title class="text-h6 font-weight-medium">
          <v-icon icon="mdi-cash-register" size="large" class="mr-2"></v-icon>
          Process Payment
        </v-toolbar-title>
        <v-spacer></v-spacer>
        <v-btn
          icon="mdi-close"
          variant="text"
          @click="closeDialog"
          class="ml-2"
          size="large"
        ></v-btn>
      </v-toolbar>

      <v-card-text>
        <v-container>
          <!-- Loading State -->
          <v-row v-if="loading">
            <v-col cols="12">
              <v-sheet class="pa-3">
                <v-skeleton-loader
                  type="article, actions"
                  class="mx-auto"
                ></v-skeleton-loader>
              </v-sheet>
            </v-col>
          </v-row>

          <template v-else>
            <!-- Invoice Summary -->
            <v-row>
              <v-col cols="12">
                <v-card
                  variant="elevated"
                  class="invoice-summary-card mb-4"
                  elevation="2"
                >
                  <v-card-item>
                    <template v-slot:prepend>
                      <v-icon
                        icon="mdi-receipt"
                        size="large"
                        color="primary"
                        class="mr-4"
                      ></v-icon>
                    </template>
                    <v-card-title class="text-h6 pb-2">
                      Invoice Summary
                    </v-card-title>
                  </v-card-item>
                  <v-divider></v-divider>
                  <v-card-text class="py-4">
                    <div class="d-flex justify-space-between mb-2">
                      <span>Invoice Number:</span>
                      <strong>{{ invoiceNumber }}</strong>
                    </div>
                    <div class="d-flex justify-space-between mb-2">
                      <span>Subtotal:</span>
                      <strong>{{ formatCurrency(invoiceTotal) }}</strong>
                    </div>
                    <div class="d-flex justify-space-between mb-2" v-if="tipAmount > 0">
                      <span>Tip:</span>
                      <strong>{{ formatCurrency(tipAmount) }}</strong>
                    </div>
                    <div class="d-flex justify-space-between mb-2">
                      <span>Total Amount:</span>
                      <strong>{{ formatCurrency(invoiceTotal + tipAmount) }}</strong>
                    </div>
                    <div class="d-flex justify-space-between">
                      <span>Remaining:</span>
                      <strong>{{ formatCurrency(remainingAmount) }}</strong>
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
                  {{ tipAmount > 0 ? `Update Tip (${formatCurrency(tipAmount)})` : 'Add Tip' }}
                </v-btn>
              </v-col>
            </v-row>

            <!-- Payment Methods Selection -->
            <v-row>
              <v-col cols="12">
                <div class="text-subtitle-1 mb-3">Select Payment Method</div>
                <v-row>
                  <v-col v-for="method in paymentMethods" 
                         :key="method.id" 
                         cols="12" 
                         sm="6" 
                         md="4">
                    <v-btn
                      block
                      :color="isMethodSelected(method.id) ? 'primary' : undefined"
                      :variant="isMethodSelected(method.id) ? 'flat' : 'outlined'"
                      class="payment-method-btn"
                      height="64"
                      @click="selectPaymentMethod(method.id)"
                      :disabled="isMethodDisabled(method.id)"
                    >
                      <v-icon :icon="getPaymentMethodIcon(method.name)" class="mr-2"></v-icon>
                      {{ method.name }}
                    </v-btn>
                  </v-col>
                </v-row>
              </v-col>
            </v-row>

            <!-- Active Payment Methods -->
            <v-row v-if="payments.length > 0">
              <v-col cols="12">
                <div v-for="(payment, index) in payments" :key="index" class="payment-section mb-4">
                  <v-card variant="outlined" class="pa-4">
                    <div class="d-flex align-center mb-4">
                      <v-icon :icon="getPaymentMethodIcon(getPaymentMethod(payment.method_id)?.name)" class="mr-2"></v-icon>
                      <span class="text-h6">{{ getPaymentMethod(payment.method_id)?.name }}</span>
                      <v-spacer></v-spacer>
                      <v-btn
                        icon="mdi-close"
                        variant="text"
                        density="comfortable"
                        @click="removePayment(index)"
                      ></v-btn>
                    </div>

                  <!-- Amount Input -->
                  <v-text-field
                    v-model="payment.displayAmount"
                    label="Amount"
                    type="number"
                    :rules="[
                      v => !!v || 'Amount is required',
                      v => v > 0 || 'Amount must be greater than 0',
                      v => Number(v) === (invoiceTotal + tipAmount) || 'Full payment is required'
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
                        <strong>{{ formatCurrency(payment.returned) }}</strong>
                      </div>
                    </div>
                  </template>

                  <!-- Payment Fees -->
                  <div v-if="hasPaymentFees(payment.method_id)" class="text-caption mb-2">
                    <div class="d-flex justify-space-between">
                      <span>Service Fee:</span>
                      <strong>{{ formatCurrency(payment.fees) }}</strong>
                    </div>
                    <div class="text-grey">
                      {{ getFeeDescription(payment.method_id, payment.amount) }}
                    </div>
                  </div>

                  <!-- Payment Amount Display -->
                  <div class="d-flex justify-space-between mb-2">
                    <span>Payment Amount:</span>
                    <strong>{{ formatCurrency(payment.amount) }}</strong>
                  </div>
                  <div v-if="payment.received" class="d-flex justify-space-between mb-2">
                    <span>Amount Received:</span>
                    <strong>{{ formatCurrency(payment.received) }}</strong>
                  </div>
                  <div v-if="payment.change" class="d-flex justify-space-between mb-2">
                    <span>Change:</span>
                    <strong>{{ formatCurrency(payment.change) }}</strong>
                  </div>
                  <div v-if="payment.fees" class="d-flex justify-space-between">
                    <span>Fees:</span>
                    <strong>{{ formatCurrency(payment.fees) }}</strong>
                  </div>

                  <!-- Remove Payment Button -->
                  <v-btn
                    color="error"
                    variant="outlined"
                    size="small"
                    class="mb-2"
                    @click="removePayment(index)"
                  >
                    Remove Payment Method
                  </v-btn>

                  <v-divider v-if="index < payments.length - 1" class="my-4"></v-divider>
                  </v-card>
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
                      <span>Total Payments:</span>
                      <strong>{{ formatCurrency(totalPayments) }}</strong>
                    </div>
                    <div class="d-flex justify-space-between mb-2">
                      <span>Total Fees:</span>
                      <strong>{{ formatCurrency(totalFees) }}</strong>
                    </div>
                    <div class="d-flex justify-space-between">
                      <span>Total with Fees:</span>
                      <strong>{{ formatCurrency(totalPayments + totalFees) }}</strong>
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
              <strong>{{ formatCurrency(calculatedTip) }}</strong>
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
import { useTableManagement } from '../../composables/useTableManagement'
import { convertHeldOrderToInvoice } from '../held-orders/utils/invoiceConverter'
import { posApi } from '@/services/api/pos-api'
import { PriceUtils } from '@/utils/price'

const emit = defineEmits(['update:modelValue'])

const props = defineProps({
  modelValue: Boolean,
  invoice: {
    type: Object,
    required: true
  }
})

// Get invoice total in cents from the invoice object
const invoiceTotal = computed(() => {
  const total = props.invoice?.invoice?.total || 0
  console.log('PaymentDialog - Raw invoice total:', {
    rawTotal: total,
    invoice: props.invoice?.invoice,
    isDollarAmount: PriceUtils.isInDollars(total),
    isCentsAmount: total > 100
  })
  return total // Already in cents
})

const {
  loading: paymentLoading,
  error: paymentError,
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

const {
  loading: tableLoading,
  error: tableError,
  releaseTablesAfterPayment
} = useTableManagement()

const loading = computed(() => paymentLoading.value || tableLoading.value)
const error = computed(() => paymentError.value || tableError.value)

const processing = ref(false)
const payments = ref([])

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

const calculatedTip = computed(() => {
  const percent = selectedTipPercent.value || Number(customTipPercent.value) || 0
  const dollarAmount = PriceUtils.toDollars(invoiceTotal.value)
  const tipAmount = Math.round((dollarAmount * percent) * 100)
  console.log('PaymentDialog - Tip calculation:', {
    percent,
    invoiceTotalInCents: invoiceTotal.value,
    invoiceTotalInDollars: dollarAmount,
    calculatedTipInCents: tipAmount
  })
  return tipAmount
})

// Dialog computed property
const dialog = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const remainingAmount = computed(() => {
  const totalPaid = payments.value.reduce((sum, payment) => {
    return sum + payment.amount // amounts are in cents
  }, 0)
  const remaining = invoiceTotal.value + tipAmount.value - totalPaid
  console.log('PaymentDialog - Remaining amount:', {
    invoiceTotalInCents: invoiceTotal.value,
    tipAmountInCents: tipAmount.value,
    totalPaidInCents: totalPaid,
    remainingInCents: remaining
  })
  return remaining
})

const totalPayments = computed(() => {
  return payments.value.reduce((sum, payment) => {
    return sum + payment.amount // amounts are in cents
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
  console.log('PaymentDialog - Formatting currency:', {
    inputAmount: amount,
    isDollarAmount: PriceUtils.isInDollars(amount),
    isCentsAmount: amount > 100,
    formattedResult: PriceUtils.format(amount)
  })
  return PriceUtils.format(amount) // PriceUtils.format already handles cents to dollars conversion
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

const getPaymentMethodIcon = (methodName) => {
  const icons = {
    'Cash': 'mdi-cash',
    'Credit Card': 'mdi-credit-card',
    'Debit Card': 'mdi-credit-card-outline',
    'Check': 'mdi-checkbox-marked-circle-outline',
    'Gift Card': 'mdi-gift',
    'Mobile Payment': 'mdi-cellphone',
    'Bank Transfer': 'mdi-bank',
  }
  return icons[methodName] || 'mdi-currency-usd'
}

const isMethodSelected = (methodId) => {
  return payments.value.some(payment => payment.method_id === methodId)
}

const isMethodDisabled = (methodId) => {
  return isMethodSelected(methodId) || payments.value.length >= paymentMethods.value.length
}

const selectPaymentMethod = (methodId) => {
  if (isMethodSelected(methodId) || isMethodDisabled(methodId)) return
  
  // Add new payment with remaining amount
  const remaining = remainingAmount.value
  const displayAmount = PriceUtils.toDollars(remaining).toString()
  
  payments.value.push({
    method_id: methodId,
    amount: remaining,
    displayAmount,
    received: remaining,
    displayReceived: displayAmount,
    returned: 0,
    fees: 0
  })
  
  validateAmount(payments.value.length - 1)
}

const handleDenominationClick = (money, index) => {
  const payment = payments.value[index]
  const currentReceived = Number(payment.displayReceived || 0)
  payment.displayReceived = (currentReceived + Number(money.amount)).toString()
  payment.received = Math.round(Number(payment.displayReceived))
  calculateChange(index)
}

const calculateChange = (index) => {
  const payment = payments.value[index]
  if (!payment.displayReceived || !payment.displayAmount) return

  const received = Math.round(Number(payment.displayReceived))
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
  if (!payment) return

  // Set display amount based on remaining total
  const total = invoiceTotal.value + tipAmount.value
  console.log('PaymentDialog - Validating payment amount:', {
    paymentIndex: index,
    totalInCents: total,
    totalInDollars: PriceUtils.toDollars(total),
    currentPayment: { ...payment }
  })

  payment.displayAmount = PriceUtils.toDollars(total).toString()
  payment.amount = total

  // Calculate fees if applicable
  if (hasPaymentFees(payment.method_id)) {
    payment.fees = calculateFees(payment.method_id, payment.amount)
  }

  const method = paymentMethods.value.find(m => m.id === payment.method_id)
  if (method?.only_cash === 1) {
    // Handle cash payments - received amount is in dollars, convert to cents
    const receivedInCents = PriceUtils.toCents(payment.displayReceived)
    console.log('PaymentDialog - Cash payment received:', {
      displayReceived: payment.displayReceived,
      receivedInCents,
      paymentAmount: payment.amount
    })
    payment.received = receivedInCents
    payment.returned = Math.max(0, payment.received - payment.amount)
  } else {
    payment.displayReceived = payment.displayAmount
    payment.received = payment.amount
    payment.returned = 0
  }
}

const addPayment = () => {
  payments.value.push({ 
    method_id: null, 
    amount: 0,
    displayAmount: PriceUtils.toDollars(invoiceTotal.value + tipAmount.value).toString(), // Include tip
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
  console.log('PaymentDialog: Starting payment processing', {
    isValid: isValid.value,
    processing: processing.value,
    invoiceTotal: invoiceTotal.value,
    tipAmount: tipAmount.value,
    payments: payments.value
  })

  if (!isValid.value || processing.value) {
    console.log('PaymentDialog: Cannot process - validation failed or already processing')
    return
  }

  processing.value = true
  try {
    console.log('PaymentDialog: Starting invoice creation with props:', {
      invoice: props.invoice,
      hasInvoiceData: !!props.invoice?.invoice,
      invoiceTotal: invoiceTotal.value,
      tipAmount: tipAmount.value
    })

    // Use the prepared invoice data
    const holdInvoice = props.invoice.invoice
    if (!holdInvoice) {
      throw new Error('Invoice data not provided')
    }
    
    // Calculate the total with tip (convert from dollars to cents for API)
    const totalWithTip = invoiceTotal.value + tipAmount.value

    console.log('PaymentDialog: Prepared hold invoice data:', {
      id: holdInvoice.id,
      total: totalWithTip,
      originalTotal: holdInvoice.total,
      tipAmount: tipAmount.value
    })

    // Format tip data according to API requirements
    const tipPercentage = selectedTipPercent.value || Number(customTipPercent.value) || 0
    holdInvoice.tip = String(Math.round(tipPercentage)) // Ensure clean integer string
    holdInvoice.tip_type = "percentage"
    holdInvoice.tip_val = tipAmount.value // Convert dollars to cents for API
    holdInvoice.total = totalWithTip // Already in cents
    holdInvoice.due_amount = totalWithTip // Already in cents
    holdInvoice.sub_total = invoiceTotal.value // Already in cents
    
    // Log tip values for debugging
    console.log('Tip values:', {
      percentage: holdInvoice.tip,
      type: holdInvoice.tip_type,
      amount: holdInvoice.tip_val,
      total: holdInvoice.total
    })
    
    // Ensure other required fields are present
    holdInvoice.is_hold_invoice = false
    holdInvoice.is_invoice_pos = 1
    holdInvoice.is_pdf_pos = true
    holdInvoice.package_bool = false
    holdInvoice.print_pdf = false
    holdInvoice.save_as_draft = false
    holdInvoice.send_email = false
    holdInvoice.not_charge_automatically = false
    holdInvoice.avalara_bool = false
    holdInvoice.banType = true

    // Set dates
    const currentDate = new Date()
    holdInvoice.invoice_date = currentDate.toISOString().split('T')[0]
    const dueDate = new Date(currentDate)
    dueDate.setDate(dueDate.getDate() + 7) // Default to 7 days
    holdInvoice.due_date = dueDate.toISOString().split('T')[0]

    // Create invoice with tip included
    const invoiceResult = await convertHeldOrderToInvoice(holdInvoice)
    
    if (!invoiceResult.success) {
      throw new Error('Failed to create invoice')
    }

    // Add to held orders if in create-invoice-only mode
    if (props.createInvoiceOnly) {
      try {
        const heldOrderData = {
          ...invoiceResult.invoice,
          is_hold_invoice: true,
          status: 'HELD',
          description: invoiceResult.invoice.description || 'Delivery Order'
        }
        
        // Add to held orders through the API
        const holdResult = await posApi.holdInvoice.create(heldOrderData)
        
        if (!holdResult.success) {
          throw new Error('Failed to add invoice to held orders')
        }

        window.toastr?.['success']('Invoice created and added to held orders')
        emit('payment-complete', true)
        dialog.value = false
        return
      } catch (err) {
        console.error('Failed to add to held orders:', err)
        throw new Error('Failed to add invoice to held orders')
      }
    }

    // Format payments for API - amounts are already in cents
    const formattedPayments = payments.value.map(payment => ({
      method_id: payment.method_id,
      amount: payment.amount, // Already in cents
      received: payment.received, // Already in cents
      returned: payment.returned, // Already in cents
      fees: payment.fees || 0
    }))

    // Validate total payment amount matches invoice total (in cents)
    const totalPaymentAmount = formattedPayments.reduce((sum, payment) => sum + payment.amount, 0)
    if (totalPaymentAmount !== totalWithTip) {
      throw new Error('Payment amount must match invoice total including tip')
    }

    // Create payment using the created invoice
    const result = await createPayment(invoiceResult.invoice, formattedPayments)
    
    // Release tables if this was a dine-in order
    if (invoiceResult.invoice.type === 'DINE_IN' && invoiceResult.invoice.tables_selected?.length) {
      try {
        await releaseTablesAfterPayment(invoiceResult.invoice.tables_selected)
      } catch (err) {
        console.error('Failed to release tables:', err)
        // Don't throw error here, as payment was successful
        window.toastr?.['warning']('Payment successful, but failed to update table status')
      }
    }
    
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

      // Reset payments array
      payments.value = []
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
.payment-dialog {
  .v-dialog {
    border-radius: 16px;
    overflow: hidden;
  }
}

.payment-dialog-card {
  display: flex;
  flex-direction: column;
  height: 100%;
  border-radius: 16px;
  background-color: rgb(var(--v-theme-surface));
}

.payment-dialog-toolbar {
  border-top-left-radius: 16px;
  border-top-right-radius: 16px;
  background: linear-gradient(135deg, var(--v-primary-base) 0%, var(--v-primary-darken1) 100%);
  backdrop-filter: blur(10px);
  height: 64px !important;
}

.invoice-summary-card {
  background: linear-gradient(145deg, var(--v-surface-variant) 0%, var(--v-surface-base) 100%);
  border-radius: 24px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid rgba(var(--v-border-color), 0.05);
  backdrop-filter: blur(10px);
}

.invoice-summary-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 12px rgba(0,0,0,0.1);
}

.payment-method-btn {
  min-height: 56px;
  border-radius: 16px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  font-size: 1.1rem;
  letter-spacing: 0.5px;
  border: 1px solid rgba(var(--v-border-color), 0.05);
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 16px rgba(0,0,0,0.1);
  }
  
  &.v-btn--active {
    background: linear-gradient(135deg, var(--v-primary-base) 0%, var(--v-primary-darken1) 100%);
    color: white;
    border: none;
  }
}

.payment-method-btn:hover {
  transform: translateY(-2px);
}

.v-card-text {
  font-size: 1.1rem;
  line-height: 1.6;
}

/* Responsive Typography */
.text-h5 {
  font-size: 1.1rem !important;
  font-weight: 500;
}

.text-h6 {
  font-size: 1rem !important;
  font-weight: 500;
}

.text-subtitle-1 {
  font-size: 0.9rem !important;
}

/* Touch Targets */
@media (max-width: 600px) {
  .payment-method-btn {
    min-height: 56px;
    width: 100%;
  }
  
  .v-btn {
    min-height: 48px;
  }
  
  .v-text-field :deep(input) {
    font-size: 16px !important; /* Prevent zoom on iOS */
  }
}

/* Transitions */
.v-enter-active,
.v-leave-active {
  transition: opacity 0.3s ease;
}

.v-enter-from,
.v-leave-to {
  opacity: 0;
}

.v-card-title {
  font-size: 1.2rem !important;
  padding: 16px 20px !important;
}

.text-h5 {
  font-size: 1.2rem !important;
}

.text-h6 {
  font-size: 1.1rem !important;
}

.text-subtitle-1 {
  font-size: 1rem !important;
  font-weight: 500;
}

.text-subtitle-2 {
  font-size: 0.9rem !important;
}

.payment-method-btn {
  text-transform: none;
  letter-spacing: normal;
  font-size: 1rem;
  height: 60px !important;
}

.payment-method-btn .v-icon {
  font-size: 1.8rem;
  margin-right: 12px;
}

.payment-section {
  border-radius: 12px;
  transition: all 0.3s ease;
  margin-bottom: 24px !important;
}

.payment-section:hover {
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}

.v-text-field {
  font-size: 1rem;
}

.v-text-field :deep(input) {
  font-size: 1rem !important;
}

.v-text-field :deep(label) {
  font-size: 0.9rem !important;
}

.v-btn {
  font-size: 0.9rem;
  padding: 0 16px;
  height: 36px;
}

.v-btn--size-small {
  height: 32px;
  font-size: 0.85rem;
}

/* Responsive adjustments */
@media (max-width: 600px) {
  .v-dialog {
    margin: 0;
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    max-width: 100% !important;
    border-radius: 0;
  }
  
  .v-card {
    height: 100%;
    display: flex;
    flex-direction: column;
  }
  
  .v-card-text {
    flex: 1;
    overflow-y: auto;
  }
}

/* Additional spacing improvements */
.v-container {
  padding: 16px;
}

.v-row {
  margin-bottom: 16px;
}

.v-col {
  padding: 8px;
}

.mb-2 {
  margin-bottom: 8px !important;
}

.mb-4 {
  margin-bottom: 16px !important;
}

.mr-2 {
  margin-right: 8px !important;
}

.pa-4 {
  padding: 16px !important;
}
</style>