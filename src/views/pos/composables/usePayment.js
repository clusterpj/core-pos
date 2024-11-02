// src/views/pos/composables/usePayment.js
import { ref, computed } from 'vue'
import { useCartStore } from '../../../stores/cart-store'
import { useCompanyStore } from '../../../stores/company'
import { posOperations } from '../../../services/api/pos-operations'
import { logger } from '../../../utils/logger'
import { v4 as uuidv4 } from 'uuid'

export function usePayment() {
  const cartStore = useCartStore()
  const companyStore = useCompanyStore()
  
  // Payment state
  const loading = ref(false)
  const error = ref(null)
  const paymentMethods = ref([])
  const selectedPayments = ref([])
  const cashReceived = ref(0)
  const changeAmount = ref(0)
  const currentInvoice = ref(null)
  const denominations = ref([])
  const settings = ref(null)

  // Computed values
  const totalPaid = computed(() => {
    return selectedPayments.value.reduce((sum, payment) => sum + payment.amount, 0) / 100
  })

  const remainingAmount = computed(() => {
    return Math.max(0, cartStore.total - totalPaid.value)
  })

  const isFullyPaid = computed(() => {
    return totalPaid.value >= cartStore.total
  })

  const canProcessPayment = computed(() => {
    return selectedPayments.value.length > 0 && isFullyPaid.value
  })

  // Validation helpers
  const validatePaymentMethod = (method) => {
    if (!method) {
      throw new Error('Invalid payment method')
    }
    if (method.status !== 'A' || method.deleted_at) {
      throw new Error('Payment method is not active')
    }
    return true
  }

  const validatePaymentAmount = (amount, methodId) => {
    if (!amount || amount <= 0) {
      throw new Error('Invalid payment amount')
    }
    if (amount > remainingAmount.value) {
      throw new Error('Payment amount exceeds remaining balance')
    }
    const method = paymentMethods.value.find(m => m.id === methodId)
    if (!method) {
      throw new Error('Invalid payment method')
    }
    return true
  }

  // Methods
  const loadSettings = async () => {
    try {
      logger.startGroup('Payment: Load Settings')
      logger.debug('Loading company settings')
      const response = await posOperations.getCompanySettings()
      
      if (!response.success) {
        throw new Error(response.message || 'Failed to load settings')
      }
      
      settings.value = response.data
      logger.info('Company settings loaded:', settings.value)
      return settings.value
    } catch (err) {
      logger.error('Failed to load company settings:', {
        error: err.message,
        stack: err.stack
      })
      throw err
    } finally {
      logger.endGroup()
    }
  }

  const loadPaymentMethods = async () => {
    loading.value = true
    error.value = null
    try {
      logger.startGroup('Payment: Load Payment Methods')
      logger.debug('Starting payment methods load process')

      // First load settings
      logger.debug('Loading settings')
      const settingsResult = await loadSettings()
      logger.debug('Settings loaded:', settingsResult)

      // Then get payment methods
      logger.debug('Requesting payment methods')
      const response = await posOperations.getPaymentMethods()
      logger.debug('Payment methods response:', response)
      
      if (!response.success) {
        throw new Error(response.message || 'Failed to load payment methods')
      }

      // Store all valid payment methods
      paymentMethods.value = response.payment_methods
      logger.info('Payment methods stored:', paymentMethods.value)

      // Set up denominations for cash payments
      const cashMethod = paymentMethods.value.find(m => m.only_cash === 1)
      logger.debug('Cash payment method:', cashMethod)

      if (cashMethod?.pos_money) {
        denominations.value = cashMethod.pos_money.map(denom => ({
          amount: Number(denom.amount),
          name: denom.name,
          is_coin: denom.is_coin === 1
        }))
        logger.info('Cash denominations set:', denominations.value)
      } else {
        logger.warn('No cash denominations found')
      }

      logger.info('Payment methods loaded successfully')
    } catch (err) {
      error.value = err.message || 'Failed to load payment methods'
      logger.error('Failed to load payment methods:', {
        error: err.message,
        stack: err.stack,
        response: err.response?.data
      })
      throw err
    } finally {
      loading.value = false
      logger.endGroup()
    }
  }

  const addPayment = (methodId, amount) => {
    logger.debug('Adding payment:', { methodId, amount })
    try {
      const method = paymentMethods.value.find(m => m.id === methodId)
      validatePaymentMethod(method)
      validatePaymentAmount(amount, methodId)

      const payment = {
        id: methodId,
        name: method.name,
        amount: cartStore.toCents(amount),
        received: method.only_cash ? cartStore.toCents(cashReceived.value) : undefined,
        returned: method.only_cash ? cartStore.toCents(changeAmount.value) : undefined,
        id_raw: uuidv4(),
        valid: true
      }

      logger.debug('Created payment:', payment)
      selectedPayments.value.push(payment)
      logger.info('Payment added successfully')
    } catch (err) {
      logger.error('Failed to add payment:', err)
      throw err
    }
  }

  const removePayment = (index) => {
    logger.debug('Removing payment at index:', index)
    const removed = selectedPayments.value.splice(index, 1)
    logger.debug('Removed payment:', removed)
  }

  const calculateChange = (received) => {
    logger.debug('Calculating change for received amount:', received)
    cashReceived.value = Number(received)
    if (cashReceived.value > remainingAmount.value) {
      changeAmount.value = cashReceived.value - remainingAmount.value
    } else {
      changeAmount.value = 0
    }
    logger.debug('Change calculation result:', {
      received: cashReceived.value,
      remaining: remainingAmount.value,
      change: changeAmount.value
    })
  }

  const createInvoice = async () => {
    logger.startGroup('Payment: Create Invoice')
    try {
      // Get next invoice number
      logger.debug('Getting next invoice number')
      const { nextNumber, prefix } = await posOperations.getNextNumber('invoice')
      logger.debug('Next invoice number:', { nextNumber, prefix })
      
      // Calculate due date based on settings
      const invoiceDate = new Date().toISOString().split('T')[0]
      const dueDate = new Date(Date.now() + (Number(settings.value.invoice_issuance_period) * 24 * 60 * 60 * 1000))
        .toISOString().split('T')[0]
      
      logger.debug('Calculated dates:', { invoiceDate, dueDate })

      // Get store and cash register IDs
      const storeId = companyStore.selectedStore
      const cashRegisterId = companyStore.selectedCashier
      logger.debug('Store and register IDs:', { storeId, cashRegisterId })

      // Prepare invoice data
      const invoiceData = {
        invoice_date: invoiceDate,
        due_date: dueDate,
        invoice_number: `${prefix}${nextNumber}`,
        user_id: companyStore.currentCustomer?.creator_id,
        hold_invoice_id: cartStore.holdInvoiceId,
        store_id: storeId,
        cash_register_id: cashRegisterId,
        sub_total: cartStore.toCents(cartStore.subtotal),
        total: cartStore.toCents(cartStore.total),
        due_amount: cartStore.toCents(cartStore.total),
        tax: cartStore.toCents(cartStore.taxAmount),
        discount: cartStore.discountValue.toString(),
        discount_type: cartStore.discountType,
        discount_val: cartStore.toCents(cartStore.discountAmount),
        tip: cartStore.tipValue.toString(),
        tip_type: cartStore.tipType,
        tip_val: cartStore.toCents(cartStore.tipAmount),
        items: cartStore.items.map(item => ({
          id: item.id,
          name: item.name,
          price: cartStore.toCents(item.price),
          quantity: item.quantity
        })),
        notes: cartStore.notes
      }

      logger.debug('Prepared invoice data:', invoiceData)
      
      // Create the invoice
      const response = await posOperations.createInvoice(invoiceData)
      logger.debug('Invoice creation response:', response)
      
      if (!response.success) {
        throw new Error(response.message || 'Failed to create invoice')
      }

      currentInvoice.value = response.invoice
      logger.info('Invoice created successfully:', currentInvoice.value)
      
      return response.invoice
    } catch (err) {
      logger.error('Failed to create invoice:', {
        error: err.message,
        stack: err.stack,
        response: err.response?.data
      })
      throw err
    } finally {
      logger.endGroup()
    }
  }

  const processPayment = async () => {
    if (!canProcessPayment.value) {
      logger.warn('Cannot process payment:', {
        hasSelectedPayments: selectedPayments.value.length > 0,
        isFullyPaid: isFullyPaid.value
      })
      return
    }

    loading.value = true
    error.value = null

    try {
      logger.startGroup('Payment: Process Payment')

      // Step 1: Create invoice if we don't have one
      if (!currentInvoice.value) {
        logger.debug('No current invoice, creating new invoice')
        currentInvoice.value = await createInvoice()
      }

      // Step 2: Get next payment number
      logger.debug('Getting next payment number')
      const { paymentPrefix, paymentNumAttribute } = await posOperations.getNextNumber('payment')
      const payment_number = `${paymentPrefix}-${paymentNumAttribute}`
      logger.debug('Payment number:', { paymentPrefix, paymentNumAttribute, payment_number })

      // Step 3: Prepare payment data
      const paymentData = {
        payment_date: new Date().toISOString().split('T')[0],
        paymentPrefix,
        paymentNumAttribute,
        payment_number,
        amount: cartStore.toCents(cartStore.total),
        invoice_id: currentInvoice.value.id,
        is_multiple: true,
        notes: "POS payment",
        payment_methods: selectedPayments.value,
        status: {
          value: "Approved",
          text: "Approved"
        },
        user_id: companyStore.currentCustomer?.creator_id
      }

      logger.debug('Prepared payment data:', paymentData)

      // Step 4: Process the payment
      const response = await posOperations.processPayment(paymentData)
      logger.debug('Payment processing response:', response)

      if (!response.success) {
        throw new Error(response.message || 'Payment processing failed')
      }

      // Step 5: Get payment details
      logger.debug('Getting payment details')
      const paymentDetails = await posOperations.getPayment(response.payment.id)
      logger.debug('Payment details:', paymentDetails)

      // Clear payment state
      selectedPayments.value = []
      cashReceived.value = 0
      changeAmount.value = 0
      currentInvoice.value = null

      logger.info('Payment processed successfully')
      return response
    } catch (err) {
      error.value = err.message || 'Payment processing failed'
      logger.error('Payment processing failed:', {
        error: err.message,
        stack: err.stack,
        response: err.response?.data
      })
      throw err
    } finally {
      loading.value = false
      logger.endGroup()
    }
  }

  const reset = () => {
    logger.debug('Resetting payment state')
    selectedPayments.value = []
    cashReceived.value = 0
    changeAmount.value = 0
    error.value = null
    currentInvoice.value = null
    logger.info('Payment state reset')
  }

  // Format helpers
  const formatPrice = (amount) => {
    return (amount / 100).toFixed(2)
  }

  return {
    // State
    loading,
    error,
    paymentMethods,
    selectedPayments,
    cashReceived,
    changeAmount,
    denominations,
    currentInvoice,
    settings,

    // Computed
    totalPaid,
    remainingAmount,
    isFullyPaid,
    canProcessPayment,

    // Methods
    loadPaymentMethods,
    addPayment,
    removePayment,
    calculateChange,
    processPayment,
    reset,
    formatPrice
  }
}
