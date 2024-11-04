import { ref } from 'vue'
import { posApi } from '../../../services/api/pos-api'
import { logger } from '../../../utils/logger'

export function usePayment() {
  const loading = ref(false)
  const paymentMethods = ref([])
  const error = ref(null)
  const settings = ref(null)

  /**
   * Fetch company settings
   */
  const fetchSettings = async () => {
    try {
      const response = await posApi.getCompanySettings()
      settings.value = response
      return response
    } catch (err) {
      error.value = err.message
      logger.error('Failed to fetch company settings:', err)
      throw err
    }
  }

  /**
   * Fetch available payment methods for POS
   */
  const fetchPaymentMethods = async () => {
    loading.value = true
    error.value = null
    
    try {
      const response = await posApi.payment.getMethods()
      paymentMethods.value = response.data || []
      return response.data
    } catch (err) {
      error.value = err.message
      logger.error('Failed to fetch payment methods:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Create a payment for an invoice
   * @param {Object} invoice - The invoice object
   * @param {Array} payments - Array of payment method objects
   */
  const createPayment = async (invoice, payments) => {
    loading.value = true
    error.value = null

    try {
      // Ensure we have settings
      if (!settings.value) {
        await fetchSettings()
      }

      // Get next payment number if auto-generate is enabled
      let paymentNumber
      if (settings.value.payment_auto_generate === 'YES') {
        const nextNumberResponse = await posApi.payment.getNextNumber()
        if (!nextNumberResponse?.payment_number) {
          throw new Error('Failed to get next payment number')
        }
        paymentNumber = nextNumberResponse.payment_number
      } else {
        // For manual number entry, we should handle this case
        // For now, we'll throw an error as we don't have UI for manual entry
        throw new Error('Manual payment number entry is not supported')
      }

      // Calculate total payment amount
      const totalPayment = payments.reduce((sum, payment) => sum + payment.amount, 0)

      // Validate payment amount based on partial payment setting
      if (settings.value.allow_partial_pay !== '1' && totalPayment !== invoice.total) {
        throw new Error('Partial payments are not allowed. Full payment is required.')
      }

      // Prepare payment data
      const paymentData = {
        payment_number: paymentNumber,
        payment_date: new Date().toISOString().split('T')[0],
        invoice_id: invoice.id,
        total: totalPayment,
        payments: payments.map(payment => ({
          payment_method_id: payment.method_id,
          amount: payment.amount,
          reference: payment.reference || null
        })),
        is_pos: true,
        status: 'COMPLETED',
        notes: `Payment for invoice ${invoice.invoice_number}`
      }

      // Create payment
      const response = await posApi.payment.create(paymentData)
      
      if (!response?.payment?.id) {
        throw new Error('Failed to create payment')
      }

      // Get payment details
      const paymentDetails = await posApi.payment.getById(response.payment.id)
      
      // Update invoice if needed (e.g., mark as paid if full payment)
      if (totalPayment === invoice.total) {
        // You might want to add an API call here to update invoice status
        logger.info('Invoice fully paid:', invoice.id)
      }

      return paymentDetails
    } catch (err) {
      error.value = err.message
      logger.error('Failed to create payment:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Check if a payment method requires a reference number
   * @param {number} methodId - Payment method ID
   * @returns {boolean}
   */
  const requiresReference = (methodId) => {
    const method = paymentMethods.value.find(m => m.id === methodId)
    return method?.requires_reference || false
  }

  /**
   * Get available denominations for a payment method
   * @param {number} methodId - Payment method ID
   * @returns {Array}
   */
  const getDenominations = (methodId) => {
    const method = paymentMethods.value.find(m => m.id === methodId)
    return method?.denominations || []
  }

  /**
   * Calculate fees for a payment method
   * @param {number} methodId - Payment method ID
   * @param {number} amount - Payment amount
   * @returns {number}
   */
  const calculateFees = (methodId, amount) => {
    const method = paymentMethods.value.find(m => m.id === methodId)
    if (!method?.fees) return 0

    // Implement fee calculation based on method.fees configuration
    // This is a placeholder - implement actual fee calculation logic
    return 0
  }

  return {
    loading,
    error,
    paymentMethods,
    settings,
    fetchSettings,
    fetchPaymentMethods,
    createPayment,
    requiresReference,
    getDenominations,
    calculateFees
  }
}
