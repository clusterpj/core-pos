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

      // Validate payments
      for (const payment of payments) {
        // Validate denomination if method has denominations
        const method = paymentMethods.value.find(m => m.id === payment.method_id)
        if (method?.denominations?.length && !payment.denomination) {
          throw new Error(`Denomination is required for ${method.name}`)
        }

        // Validate reference if required
        if (method?.requires_reference && !payment.reference) {
          throw new Error(`Reference number is required for ${method.name}`)
        }

        // Calculate and validate fees
        payment.fees = calculateFees(payment.method_id, payment.amount)
      }

      // Calculate total payment amount including fees
      const totalPayment = payments.reduce((sum, payment) => sum + payment.amount, 0)
      const totalFees = payments.reduce((sum, payment) => sum + (payment.fees || 0), 0)

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
        total_fees: totalFees,
        payments: payments.map(payment => ({
          payment_method_id: payment.method_id,
          amount: payment.amount,
          reference: payment.reference || null,
          denomination: payment.denomination || null,
          fees: payment.fees || 0
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
   * @param {number} amount - Payment amount in cents
   * @returns {number} Fee amount in cents
   */
  const calculateFees = (methodId, amount) => {
    const method = paymentMethods.value.find(m => m.id === methodId)
    if (!method?.fees) return 0

    const { type, value } = method.fees
    
    switch (type) {
      case 'FIXED':
        // Fixed fee amount in cents
        return Math.round(value * 100)
      
      case 'PERCENTAGE':
        // Calculate percentage of the amount
        return Math.round((amount * value) / 100)
      
      case 'FIXED_PLUS_PERCENTAGE':
        // Both fixed fee and percentage
        const fixedFee = Math.round(value.fixed * 100)
        const percentageFee = Math.round((amount * value.percentage) / 100)
        return fixedFee + percentageFee
      
      default:
        logger.warn(`Unknown fee type: ${type}`)
        return 0
    }
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
