<!-- src/views/pos/components/dialogs/PaymentDialog.vue -->
<template>
  <v-dialog 
    v-model="dialog" 
    fullscreen
    transition="dialog-bottom-transition"
    :scrim="false"
    class="payment-dialog"
  >
    <v-card class="modal-card">
      <v-toolbar 
        color="primary"
        :elevation="1"
      >
        <v-toolbar-title class="text-h6 font-weight-medium">
          <v-icon icon="mdi-cash-register" size="large" class="mr-2"></v-icon>
          Process Payment
        </v-toolbar-title>
        <v-spacer></v-spacer>
        <v-btn
          icon
          @click="closeDialog"
        >
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-toolbar>

      <div class="payment-content">
        <!-- Loading State -->
        <div v-if="loading" class="loading-state">
          <v-progress-circular
            indeterminate
            color="primary"
            size="64"
          ></v-progress-circular>
          <div class="text-h6 mt-4">Loading Payment Methods...</div>
        </div>

        <template v-else>
          <v-container class="payment-container">
            <v-row>
              <v-col cols="12" md="4">
                <!-- Invoice Summary Card -->
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

                <!-- Tip Button -->
                <v-btn
                  block
                  color="primary"
                  variant="outlined"
                  @click="showTipDialog = true"
                  class="mb-4 tip-button"
                  height="48"
                >
                  {{ tipAmount > 0 ? `Update Tip (${formatCurrency(tipAmount)})` : 'Add Tip' }}
                </v-btn>
              </v-col>

              <v-col cols="12" md="8">
                <!-- Payment Methods Selection -->
                <div class="text-subtitle-1 mb-3 font-weight-medium">Select Payment Method</div>
                <v-row class="payment-methods-grid">
                  <v-col v-for="method in paymentMethods" 
                         :key="method.id" 
                         cols="6" 
                         sm="4">
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

                <!-- Active Payment Methods -->
                <div v-if="payments.length > 0" class="active-payments-section">
                  <div v-for="(payment, index) in payments" :key="index" class="payment-section">
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

                      <!-- Amount Display -->
                      <div class="payment-field-container">
                        <div class="payment-field-header">
                          <span class="payment-field-label">Amount</span>
                          <span class="payment-field-required">Required</span>
                        </div>
                        <div class="payment-field-input"
                             :class="{ 'has-error': !isValidAmount(payment) }">
                          <span class="payment-field-currency">$</span>
                          <input
                            v-model="payment.displayAmount"
                            type="number"
                            class="payment-field-value"
                            @input="validateAmount(index)"
                            :class="{ 'is-invalid': !isValidAmount(payment) }"
                          />
                        </div>
                        <div v-if="!isValidAmount(payment)" class="payment-field-error">
                          Full payment amount is required
                        </div>
                      </div>

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
                                    class="denomination-btn"
                                    size="small"
                                    @click="handleDenominationClick(money, index)">
                                {{ formatCurrency(PriceUtils.toCents(money.amount)) }}
                              </v-btn>
                            </v-col>
                          </v-row>
                        </div>

                        <!-- Received Amount -->
                        <div class="payment-field-container">
                          <div class="payment-field-header">
                            <span class="payment-field-label">Amount Received</span>
                            <span class="payment-field-required">Required</span>
                          </div>
                          <div class="payment-field-input"
                               :class="{ 'has-error': !isValidReceivedAmount(payment) }">
                            <span class="payment-field-currency">$</span>
                            <input
                              v-model="payment.displayReceived"
                              type="number"
                              class="payment-field-value"
                              @input="calculateChange(index)"
                              :class="{ 'is-invalid': !isValidReceivedAmount(payment) }"
                            />
                          </div>
                          <div v-if="!isValidReceivedAmount(payment)" class="payment-field-error">
                            Received amount must be greater than or equal to payment amount
                          </div>
                        </div>

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
                    block
                    color="primary"
                    variant="outlined"
                    @click="addPayment"
                    class="mt-4"
                    height="48"
                  >
                    <v-icon start>mdi-plus</v-icon>
                    Add Another Payment Method
                  </v-btn>
                </div>
              </v-col>
            </v-row>

            <!-- Error Message -->
            <v-alert
              v-if="error"
              type="error"
              variant="tonal"
              closable
              class="error-alert"
              @click:close="error = null"
            >
              {{ error }}
            </v-alert>

            <!-- Process Payment Button -->
            <div class="process-payment-footer">
              <v-btn
                color="primary"
                size="large"
                block
                height="56"
                @click="processPayment"
                :loading="processing"
                :disabled="!isValid || processing"
                class="process-payment-btn"
              >
                <v-icon start>mdi-cash-register</v-icon>
                Process Payment
              </v-btn>
            </div>
          </v-container>
        </template>
      </div>
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

const emit = defineEmits(['update:modelValue', 'paymentComplete'])

const props = defineProps({
  modelValue: Boolean,
  invoice: {
    type: Object,
    required: false,
    default: () => ({})
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
  const tipAmount = Math.round((dollarAmount * (percent / 100)) * 100)
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

const isValidAmount = (payment) => {
  if (!payment.displayAmount) return false
  if (Number(payment.displayAmount) <= 0) return false
  return Number(payment.displayAmount) === PriceUtils.toDollars(invoiceTotal.value + tipAmount.value)
}

const isValidReceivedAmount = (payment) => {
  if (!payment.displayReceived) return false
  return Number(payment.displayReceived) >= Number(payment.displayAmount)
}

const isValid = computed(() => {
  return payments.value.every(payment => {
    if (!payment.method_id || !payment.amount) return false
    if (isCashOnly(payment.method_id) && !payment.received) return false
    if (!isValidAmount(payment)) return false
    if (isCashOnly(payment.method_id) && !isValidReceivedAmount(payment)) return false
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
  const currentReceived = PriceUtils.toCents(payment.displayReceived || 0)
  const amountToAdd = PriceUtils.toCents(money.amount)
  const newTotal = currentReceived + amountToAdd
  
  payment.displayReceived = PriceUtils.toDollars(newTotal).toString()
  payment.received = newTotal
  calculateChange(index)
  
  // Provide haptic feedback if available
  if (window.navigator?.vibrate) {
    window.navigator.vibrate(50)
  }
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
.modal-card {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: rgb(var(--v-theme-surface));
}

.v-toolbar {
  position: relative;
  z-index: 1;
}

.payment-content {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  background-color: rgb(var(--v-theme-background));
}

.loading-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 300px;
}

.payment-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  max-width: 1400px;
  margin: 0 auto;
  padding: 16px;
}

.invoice-summary-card {
  position: sticky;
  top: 16px;
  z-index: 1;
}

.payment-methods-grid {
  margin: -8px;
}

.payment-method-btn {
  height: 64px !important;
  border-radius: 12px;
  text-transform: none;
  letter-spacing: 0.5px;
  font-size: 1rem;
  font-weight: 500;
  
  &:hover {
    transform: translateY(-2px);
    transition: transform 0.2s ease;
  }
  
  &.v-btn--disabled {
    opacity: 0.7;
  }
}

.active-payments-section {
  margin-top: 24px;
}

.payment-section {
  margin-bottom: 16px;
  
  .v-card {
    border-radius: 12px;
    transition: all 0.3s ease;
    
    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }
  }
}

.tip-button {
  border-radius: 12px;
  font-weight: 500;
}

.process-payment-footer {
  position: sticky;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 16px;
  background: rgb(var(--v-theme-surface));
  border-top: thin solid rgba(var(--v-border-color), var(--v-border-opacity));
  margin: 0 -16px -16px;
}

.process-payment-btn {
  max-width: 600px;
  margin: 0 auto;
  border-radius: 12px;
  text-transform: none;
  letter-spacing: 0.5px;
  font-size: 1.1rem;
  font-weight: 500;
}

.error-alert {
  position: fixed;
  bottom: 88px;
  left: 16px;
  right: 16px;
  z-index: 2;
  max-width: 600px;
  margin: 0 auto;
}

/* Touch-friendly form inputs */
:deep(.v-text-field .v-field__input),
:deep(.v-select .v-field__input) {
  min-height: 44px;
  padding-top: 8px;
  font-size: 1rem;
}

:deep(.v-text-field .v-field__input input) {
  font-size: 1rem;
}

/* Enhanced spacing and layout */
:deep(.v-row) {
  margin-bottom: 20px;
}

:deep(.v-col) {
  padding: 12px;
}

/* Modern payment field styling */
.payment-field-container {
  margin-bottom: 24px;
}

.payment-field-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.payment-field-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: rgba(var(--v-theme-on-surface), 0.87);
}

.payment-field-required {
  font-size: 0.75rem;
  color: rgb(var(--v-theme-error));
  text-transform: uppercase;
  letter-spacing: 0.025em;
}

.payment-field-input {
  position: relative;
  display: flex;
  align-items: center;
  background: rgb(var(--v-theme-surface));
  border: 2px solid rgba(var(--v-theme-on-surface), 0.12);
  border-radius: 12px;
  padding: 12px 16px;
  transition: all 0.2s ease;
  min-height: 64px;

  &:focus-within {
    border-color: rgb(var(--v-theme-primary));
    box-shadow: 0 0 0 4px rgba(var(--v-theme-primary), 0.1);
  }

  &.has-error {
    border-color: rgb(var(--v-theme-error));
    
    &:focus-within {
      box-shadow: 0 0 0 4px rgba(var(--v-theme-error), 0.1);
    }
  }
}

.payment-field-currency {
  font-size: 1.25rem;
  font-weight: 500;
  color: rgba(var(--v-theme-on-surface), 0.87);
  margin-right: 8px;
}

.payment-field-value {
  flex: 1;
  border: none;
  background: transparent;
  font-size: 1.25rem;
  font-weight: 500;
  color: rgb(var(--v-theme-on-surface));
  width: 100%;
  padding: 0;
  margin: 0;
  font-feature-settings: "tnum";
  font-variant-numeric: tabular-nums;

  &:focus {
    outline: none;
  }

  &.is-invalid {
    color: rgb(var(--v-theme-error));
  }
}

.payment-field-error {
  margin-top: 8px;
  font-size: 0.875rem;
  color: rgb(var(--v-theme-error));
  display: flex;
  align-items: center;
  gap: 8px;

  &::before {
    content: "!";
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: 16px;
    background: rgb(var(--v-theme-error));
    color: white;
    border-radius: 50%;
    font-size: 0.75rem;
  }
}
  
  :deep(.v-field__outline) {
    --v-field-border-width: 2px;
  }
  
  :deep(.v-label) {
    position: absolute;
    top: 8px;
    left: 36px;
    font-size: 0.875rem;
    color: rgba(var(--v-theme-on-surface), 0.7);
    background: transparent;
    padding: 0;
    margin: 0;
    line-height: 1;
    pointer-events: none;
    transform: none !important;
    opacity: 1;
  }

  :deep(.v-field--focused .v-label),
  :deep(.v-field--active .v-label) {
    color: rgb(var(--v-theme-primary));
  }
  
  :deep(.currency-symbol) {
    position: absolute;
    left: 16px;
    top: 58%;
    transform: translateY(-50%);
    color: rgba(var(--v-theme-on-surface), 0.85);
    font-size: 1.25rem;
    font-weight: 500;
    z-index: 1;
  }

  :deep(.v-field) {
    border-radius: 12px;
    background-color: rgb(var(--v-theme-surface));
    box-shadow: 0 2px 6px rgba(0,0,0,0.08);
    transition: all 0.2s ease;

    &:hover {
      box-shadow: 0 4px 12px rgba(0,0,0,0.12);
      transform: translateY(-1px);
    }

    &.v-field--focused {
      box-shadow: 0 6px 16px rgba(var(--v-theme-primary), 0.2);
      transform: translateY(-2px);
      
      .v-field__outline {
        border-color: rgb(var(--v-theme-primary));
        opacity: 1;
      }
    }
  }

  /* Improve number input appearance */
  :deep(input[type="number"]) {
    font-feature-settings: "tnum";
    font-variant-numeric: tabular-nums;
  }
}

/* Quick amount selection buttons */
.denomination-btn {
  min-height: 44px;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 500;
  letter-spacing: 0.5px;
  transition: all 0.2s ease;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0,0,0,0.1);
  }
  
  &:active {
    transform: translateY(0);
  }
}

/* Payment section cards */
.payment-section {
  .v-card {
    border-radius: 12px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.05);
    transition: all 0.3s ease;
    
    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 16px rgba(0,0,0,0.1);
    }
  }
}

/* Responsive adjustments */
@media (max-width: 600px) {
  .payment-input {
    :deep(.v-field__input) {
      font-size: 1rem;
    }
  }
  
  .denomination-btn {
    min-height: 40px;
    font-size: 0.95rem;
  }
}

/* Dialog transition */
.dialog-bottom-transition-enter-active,
.dialog-bottom-transition-leave-active {
  transition: transform 0.3s ease-in-out;
}

.dialog-bottom-transition-enter-from,
.dialog-bottom-transition-leave-to {
  transform: translateY(100%);
}

/* Responsive adjustments */
@media (max-width: 960px) {
  .payment-container {
    padding: 12px;
  }
  
  .process-payment-footer {
    margin: 0 -12px -12px;
  }
  
  .invoice-summary-card {
    position: relative;
    top: 0;
  }
}

@media (max-width: 600px) {
  .payment-method-btn {
    height: 56px !important;
  }
  
  :deep(.v-card-title) {
    font-size: 1.1rem;
  }
  
  :deep(.v-card-text) {
    font-size: 0.95rem;
  }
}
</style>
