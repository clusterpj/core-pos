import { ref, computed } from 'vue'
import { usePosOperations } from '../../../services/api/pos-operations'
import { useCartStore } from '../../../stores/cart-store'
import { usePosStore } from '../../../stores/pos-store'
import { useCompanyStore } from '../../../stores/company'
import { logger } from '../../../utils/logger'

export function usePaymentProcessing() {
  const posOperations = usePosOperations()
  const cartStore = useCartStore()
  const posStore = usePosStore()
  const companyStore = useCompanyStore()

  const isProcessingPayment = ref(false)
  const loadingPaymentMethods = ref(false)
  const paymentMethods = ref([])
  const selectedPaymentMethod = ref(null)
  const receivedAmount = ref('')

  const selectedPaymentMethodDetails = computed(() => {
    return paymentMethods.value.find(method => method.id === selectedPaymentMethod.value)
  })

  const canProcessPayment = computed(() => {
    if (!selectedPaymentMethod.value || !receivedAmount.value) return false
    return parseFloat(receivedAmount.value) >= cartStore.total
  })

  const loadPaymentMethods = async () => {
    try {
      loadingPaymentMethods.value = true
      const response = await posOperations.getPaymentMethods()
      if (response.success && response.data) {
        paymentMethods.value = response.data
      } else {
        throw new Error('Failed to load payment methods')
      }
    } catch (error) {
      logger.error('Failed to load payment methods:', error)
      window.toastr?.['error']('Failed to load payment methods')
    } finally {
      loadingPaymentMethods.value = false
    }
  }

  const handleDenominationClick = (money) => {
    const amount = parseFloat(money.amount)
    const current = parseFloat(receivedAmount.value) || 0
    receivedAmount.value = (current + amount).toString()
    calculateChange()
  }

  const calculateChange = () => {
    if (!receivedAmount.value) return
    const received = parseFloat(receivedAmount.value)
    if (received < cartStore.total) {
      window.toastr?.['error']('Received amount must be greater than or equal to total')
    }
  }

  const resetPaymentForm = () => {
    receivedAmount.value = ''
    selectedPaymentMethod.value = null
  }

  const processPayment = async () => {
    try {
      isProcessingPayment.value = true
      logger.info('Processing payment for order:', cartStore.holdInvoiceId)

      // Get next invoice number
      const { nextNumber, prefix } = await posOperations.getNextNumber('invoice')
      const invoiceNumber = `${prefix}-${nextNumber}`

      // Get next payment number
      const paymentNumberResponse = await posOperations.getNextNumber('payment')
      const paymentNumber = `PAY-${paymentNumberResponse.nextNumber}`

      // Create invoice from hold order
      const invoiceData = cartStore.prepareInvoiceData(
        posStore.currentStore?.id,
        posStore.currentRegister?.id,
        invoiceNumber
      )

      const invoiceResponse = await posOperations.createInvoice(invoiceData)
      if (!invoiceResponse.success) {
        throw new Error('Failed to create invoice')
      }

      // Process payment
      const paymentData = {
        amount: cartStore.toCents(cartStore.total),
        invoice_id: invoiceResponse.invoice.id,
        is_multiple: true,
        payment_date: new Date().toISOString().split('T')[0],
        payment_number: paymentNumber,
        payment_methods: [{
          id: selectedPaymentMethod.value,
          name: selectedPaymentMethodDetails.value.name,
          amount: cartStore.toCents(cartStore.total),
          received: cartStore.toCents(parseFloat(receivedAmount.value)),
          returned: cartStore.toCents(parseFloat(receivedAmount.value) - cartStore.total)
        }],
        status: { value: "Approved", text: "Approved" },
        user_id: companyStore.currentCustomer?.creator_id
      }

      const paymentResponse = await posOperations.createPayment(paymentData)
      if (!paymentResponse.success) {
        throw new Error('Failed to process payment')
      }

      // Clear cart after successful payment
      cartStore.clearCart()
      
      // Show success message
      window.toastr?.['success']('Payment processed successfully')
      
      // Refresh hold orders list to update statuses
      await posStore.fetchHoldInvoices()
      
      logger.info('Payment processed successfully')
      return true
    } catch (error) {
      logger.error('Payment processing failed:', error)
      window.toastr?.['error'](error.message || 'Failed to process payment')
      return false
    } finally {
      isProcessingPayment.value = false
    }
  }

  return {
    isProcessingPayment,
    loadingPaymentMethods,
    paymentMethods,
    selectedPaymentMethod,
    receivedAmount,
    selectedPaymentMethodDetails,
    canProcessPayment,
    loadPaymentMethods,
    handleDenominationClick,
    calculateChange,
    resetPaymentForm,
    processPayment
  }
}
