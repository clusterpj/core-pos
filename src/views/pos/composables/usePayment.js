import { ref } from 'vue'
import { usePosOperations } from '../../../services/api/pos-operations'
import { logger } from '../../../utils/logger'

export function usePayment() {
  const loading = ref(false)
  const paymentMethods = ref([])
  const error = ref(null)
  const settings = ref(null)
  const posOperations = usePosOperations()

  /**
   * Fetch company settings
   */
  const fetchSettings = async () => {
    try {
      const response = await posOperations.getCompanySettings()
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
      const response = await posOperations.getPaymentMethods()
      if (response.success && response.data) {
        paymentMethods.value = response.data
      } else {
        throw new Error('Failed to fetch payment methods')
      }
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

      // Get next payment number
      const nextNumberResponse = await posOperations.getNextNumber('payment')
      if (!nextNumberResponse?.number) {
        throw new Error('Failed to get next payment number')
      }

      // Validate payments
      for (const payment of payments) {
        // Validate denomination if method has denominations
        const method = paymentMethods.value.find(m => m.id === payment.method_id)
        if (method?.pos_money?.length && !payment.denomination) {
          throw new Error(`Denomination is required for ${method.name}`)
        }

        // Calculate and validate fees if active
        if (method?.IsPaymentFeeActive === 'YES') {
          payment.fees = calculateFees(payment.method_id, payment.amount)
        }
      }

      // Calculate total payment amount including fees
      const totalPayment = payments.reduce((sum, payment) => sum + payment.amount, 0)
      const totalFees = payments.reduce((sum, payment) => sum + (payment.fees || 0), 0)

      // Validate payment amount based on partial payment setting
      if (settings.value.allow_partial_pay !== '1' && totalPayment !== invoice.total) {
        throw new Error('Partial payments are not allowed. Full payment is required.')
      }

      // Format payment data according to API requirements
      const paymentData = {
        amount: totalPayment, // Amount in cents
        invoice_id: invoice.id,
        is_multiple: true,
        payment_date: new Date().toISOString().split('T')[0],
        paymentNumAttribute: nextNumberResponse.nextNumber,
        paymentPrefix: nextNumberResponse.prefix,
        payment_number: nextNumberResponse.number,
        payment_methods: payments.map(payment => {
          const method = getPaymentMethod(payment.method_id)
          return {
            id: payment.method_id,
            name: method.name,
            amount: payment.amount, // Amount in cents
            received: payment.received || 0, // Amount received in cents (for cash payments)
            returned: payment.returned || 0, // Amount returned in cents (for cash payments)
            valid: true
          }
        }),
        status: { value: "Approved", text: "Approved" },
        user_id: invoice.user_id,
        notes: `Payment for invoice ${invoice.invoice_number}`
      }

      // Create payment using the correct endpoint
      const response = await posOperations.createPayment(paymentData)
      
      if (!response?.success) {
        throw new Error('Failed to create payment')
      }

      return response.payment
    } catch (err) {
      error.value = err.message
      logger.error('Failed to create payment:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Check if a payment method is cash only
   * @param {number} methodId - Payment method ID
   * @returns {boolean}
   */
  const isCashOnly = (methodId) => {
    const method = paymentMethods.value.find(m => m.id === methodId)
    return method?.only_cash === 1
  }

  /**
   * Get available denominations for a payment method
   * @param {number} methodId - Payment method ID
   * @returns {Array}
   */
  const getDenominations = (methodId) => {
    const method = paymentMethods.value.find(m => m.id === methodId)
    return method?.pos_money || []
  }

  /**
   * Calculate fees for a payment method
   * @param {number} methodId - Payment method ID
   * @param {number} amount - Payment amount in cents
   * @returns {number} Fee amount in cents
   */
  const calculateFees = (methodId, amount) => {
    const method = paymentMethods.value.find(m => m.id === methodId)
    if (!method?.registrationdatafees) return 0

    const fees = method.registrationdatafees
    let totalFee = 0

    if (fees.type === 'FIXED') {
      totalFee = Math.round(fees.value * 100)
    } else if (fees.type === 'PERCENTAGE') {
      totalFee = Math.round((amount * fees.value) / 100)
    } else if (fees.type === 'FIXED_PLUS_PERCENTAGE') {
      const fixedFee = Math.round(fees.value.fixed * 100)
      const percentageFee = Math.round((amount * fees.value.percentage) / 100)
      totalFee = fixedFee + percentageFee
    }

    return totalFee
  }

  /**
   * Get payment method details
   * @param {number} methodId - Payment method ID
   * @returns {Object|null}
   */
  const getPaymentMethod = (methodId) => {
    return paymentMethods.value.find(m => m.id === methodId)
  }

  return {
    loading,
    error,
    paymentMethods,
    settings,
    fetchSettings,
    fetchPaymentMethods,
    createPayment,
    getDenominations,
    calculateFees,
    getPaymentMethod,
    isCashOnly
  }
}
