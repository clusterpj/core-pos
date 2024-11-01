// src/views/pos/composables/usePayment.js
import { ref, computed } from 'vue'
import { useCartStore } from '../../../stores/cart-store'
import { useCompanyStore } from '../../../stores/company'
import { posOperations } from '../../../services/api/pos-operations'
import { logger } from '../../../utils/logger'

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

  // Cash denominations
  const denominations = ref([
    { amount: 10000, name: '$100', is_coin: false },
    { amount: 5000, name: '$50', is_coin: false },
    { amount: 2000, name: '$20', is_coin: false },
    { amount: 1000, name: '$10', is_coin: false },
    { amount: 500, name: '$5', is_coin: false },
    { amount: 100, name: '$1', is_coin: false },
    { amount: 25, name: '25¢', is_coin: true },
    { amount: 10, name: '10¢', is_coin: true },
    { amount: 5, name: '5¢', is_coin: true },
    { amount: 1, name: '1¢', is_coin: true }
  ])

  // Computed values
  const totalPaid = computed(() => {
    return selectedPayments.value.reduce((sum, payment) => sum + payment.amount, 0)
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

  // Methods
  const loadPaymentMethods = async () => {
    loading.value = true
    error.value = null
    try {
      const response = await posOperations.getPaymentMethods()
      paymentMethods.value = response.data.payment_methods
    } catch (err) {
      error.value = 'Failed to load payment methods'
      logger.error('Failed to load payment methods:', err)
    } finally {
      loading.value = false
    }
  }

  const addPayment = (methodId, amount) => {
    const method = paymentMethods.value.find(m => m.id === methodId)
    if (!method) return

    selectedPayments.value.push({
      id: methodId,
      name: method.name,
      amount: Number(amount),
      received: method.only_cash ? Number(cashReceived.value) : null,
      returned: method.only_cash ? Number(changeAmount.value) : null
    })
  }

  const removePayment = (index) => {
    selectedPayments.value.splice(index, 1)
  }

  const calculateChange = (received) => {
    cashReceived.value = Number(received)
    if (cashReceived.value > remainingAmount.value) {
      changeAmount.value = cashReceived.value - remainingAmount.value
    } else {
      changeAmount.value = 0
    }
  }

  const processPayment = async () => {
    if (!canProcessPayment.value) return

    loading.value = true
    error.value = null

    try {
      // Get next payment number
      const { nextNumber, prefix } = await posOperations.getNextPaymentNumber()
      const paymentNumber = `${prefix}-${nextNumber}`

      // Prepare payment data
      const paymentData = {
        amount: cartStore.toCents(cartStore.total),
        invoice_id: cartStore.currentInvoice?.id,
        payment_number: paymentNumber,
        payment_date: new Date().toISOString().split('T')[0],
        user_id: companyStore.currentCustomer?.creator_id,
        payment_methods: selectedPayments.value.map(payment => ({
          id: payment.id,
          name: payment.name,
          amount: cartStore.toCents(payment.amount),
          received: payment.received ? cartStore.toCents(payment.received) : undefined,
          returned: payment.returned ? cartStore.toCents(payment.returned) : undefined
        })),
        is_multiple: true,
        status: {
          value: 'Approved',
          text: 'Approved'
        }
      }

      // Process the payment
      const response = await posOperations.processPayment(paymentData)

      // Clear payment state
      selectedPayments.value = []
      cashReceived.value = 0
      changeAmount.value = 0

      return response
    } catch (err) {
      error.value = 'Payment processing failed'
      logger.error('Payment processing failed:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  const reset = () => {
    selectedPayments.value = []
    cashReceived.value = 0
    changeAmount.value = 0
    error.value = null
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
