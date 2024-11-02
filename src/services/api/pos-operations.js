import apiClient from './client'
import { logger } from '../../utils/logger'
import api from './pos-api'
import { getApiEndpoint } from './config'
import { v4 as uuidv4 } from 'uuid'

/**
 * Validation Helpers
 */
const validateHoldOrder = (order) => {
  if (!order || !order.id) {
    throw new Error('Invalid hold order data')
  }
  if (order.status === 'inactive') {
    throw new Error('Hold order is not active')
  }
  if (!order.hold_items || !order.hold_items.length) {
    throw new Error('Hold order has no items')
  }
  // Validate total matches items
  const calculatedTotal = order.hold_items.reduce((sum, item) => {
    return sum + (Number(item.price) * Number(item.quantity))
  }, 0)
  if (calculatedTotal !== order.total) {
    throw new Error('Hold order total mismatch')
  }
}

const validatePayment = (payment, invoice) => {
  if (!payment || !invoice) {
    throw new Error('Invalid payment or invoice data')
  }

  // Validate payment total matches invoice
  const paymentTotal = payment.payment_methods.reduce((sum, method) => {
    return sum + Number(method.amount)
  }, 0)

  // Compare totals (both should be in cents)
  if (paymentTotal !== invoice.total) {
    logger.error('Payment total mismatch:', {
      paymentTotal,
      invoiceTotal: invoice.total,
      difference: Math.abs(paymentTotal - invoice.total)
    })
    throw new Error('Payment total does not match invoice total')
  }

  // Validate payment methods
  payment.payment_methods.forEach(method => {
    if (!method.id || !method.amount) {
      throw new Error('Invalid payment method data')
    }
    if (method.amount <= 0) {
      throw new Error('Invalid payment amount')
    }
    // For cash payments, validate received and returned amounts
    if (method.received !== undefined) {
      if (method.received < method.amount) {
        throw new Error('Cash received must be greater than or equal to payment amount')
      }
      if (method.returned !== undefined && method.returned > method.received - method.amount) {
        throw new Error('Invalid change amount')
      }
    }
  })
}

const generateIdempotencyKey = () => {
  return `pos_${Date.now()}_${uuidv4()}`
}

const handleApiError = (error) => {
  const errorResponse = {
    success: false,
    message: error.message,
    errors: {}
  }

  if (error.response) {
    switch (error.response.status) {
      case 400:
        errorResponse.message = 'Invalid request parameters'
        break
      case 401:
        errorResponse.message = 'Authentication required'
        break
      case 404:
        errorResponse.message = 'Resource not found'
        break
      case 422:
        errorResponse.message = 'Validation failed'
        errorResponse.errors = error.response.data.errors || {}
        break
      case 500:
        errorResponse.message = 'Internal server error'
        break
      default:
        errorResponse.message = 'An unexpected error occurred'
    }
    errorResponse.statusCode = error.response.status
  }

  logger.error('API Error:', {
    message: errorResponse.message,
    status: error.response?.status,
    errors: errorResponse.errors,
    originalError: error.message
  })

  throw errorResponse
}

/**
 * POS Operations Service
 * Implements core POS operations from the API documentation
 */
export const posOperations = {
  // Configuration Operations
  async getCompanySettings() {
    logger.startGroup('POS Operations: Get Company Settings')
    try {
      const settings = [
        'invoice_auto_generate',
        'invoice_issuance_period',
        'payment_auto_generate',
        'allow_invoice_form_pos',
        'allow_partial_pay',
        'pdf_format_pos'
      ]

      logger.debug('Requesting company settings with params:', { settings })

      const response = await apiClient.get('company/settings', {
        params: { 'settings[]': settings }
      })

      logger.debug('Company settings response:', response.data)
      logger.info('Company settings fetched successfully')
      return {
        success: true,
        data: response.data
      }
    } catch (error) {
      return handleApiError(error)
    } finally {
      logger.endGroup()
    }
  },

  async getNextNumber(type) {
    logger.startGroup(`POS Operations: Get Next ${type} Number`)
    try {
      logger.debug(`Requesting next ${type} number`)
      const response = await apiClient.get('next-number', {
        params: { key: type }
      })
      
      if (!response.data.nextNumber || !response.data.prefix) {
        throw new Error('Invalid next number response')
      }

      logger.debug(`Next ${type} number response:`, response.data)
      logger.info(`Next ${type} number fetched successfully`)
      
      return {
        nextNumber: response.data.nextNumber,
        prefix: response.data.prefix,
        paymentPrefix: type === 'payment' ? response.data.prefix : undefined,
        paymentNumAttribute: type === 'payment' ? response.data.nextNumber : undefined
      }
    } catch (error) {
      return handleApiError(error)
    } finally {
      logger.endGroup()
    }
  },

  async getPaymentMethods() {
    logger.startGroup('POS Operations: Get Payment Methods')
    try {
      logger.debug('Requesting payment methods')
      const response = await apiClient.get('payments/multiple/get-payment-methods')
      
      logger.debug('Raw payment methods response:', response.data)
      
      if (!response.data?.payment_methods) {
        throw new Error('Invalid payment methods response structure')
      }

      // Validate and filter active payment methods
      const validMethods = response.data.payment_methods.filter(method => {
        const isValid = method.status === 'A' && !method.deleted_at
        if (!isValid) {
          logger.debug(`Filtered out payment method ${method.id}: inactive or deleted`)
        }
        return isValid
      })

      logger.debug('Valid payment methods found:', validMethods.length)
      validMethods.forEach((method, index) => {
        logger.debug(`Payment method ${index + 1}:`, {
          id: method.id,
          name: method.name,
          type: method.account_accepted,
          only_cash: method.only_cash,
          denominations: method.pos_money?.length || 0,
          isPaymentFeeActive: method.IsPaymentFeeActive
        })
      })

      return {
        success: true,
        payment_methods: validMethods
      }
    } catch (error) {
      return handleApiError(error)
    } finally {
      logger.endGroup()
    }
  },

  async getTables(cashRegisterId) {
    logger.startGroup('POS Operations: Get Tables')
    try {
      if (!cashRegisterId) {
        throw new Error('Cash register ID is required')
      }

      logger.debug('Requesting tables for cash register:', cashRegisterId)
      const companyId = localStorage.getItem('companyId')
      const endpoint = `${getApiEndpoint('pos.tables')}/${cashRegisterId}`
      
      const config = {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
          company: companyId
        }
      }

      logger.debug('Tables request config:', { endpoint, config })
      const response = await apiClient.get(endpoint, config)
      
      // Validate response structure
      if (!response.data) {
        throw new Error('Invalid response structure')
      }

      // Ensure we have a data array, even if empty
      const tables = Array.isArray(response.data) ? response.data : 
                    (response.data.data && Array.isArray(response.data.data)) ? response.data.data : 
                    []

      logger.debug('Tables response processed:', {
        rawResponse: response.data,
        processedTables: tables,
        tableCount: tables.length
      })

      return {
        success: true,
        data: tables.map(table => ({
          id: table.id,
          name: table.name || `Table ${table.id}`,
          is_occupied: !!table.is_occupied,
          quantity: table.quantity || 0,
          items: table.items || 0
        }))
      }
    } catch (error) {
      logger.error('Failed to fetch tables', {
        error: error.message,
        response: error.response?.data,
        status: error.response?.status,
        cashRegisterId
      })
      return {
        success: false,
        error: error.message,
        data: []
      }
    } finally {
      logger.endGroup()
    }
  },

  async getHoldInvoices() {
    logger.startGroup('POS Operations: Get Hold Invoices')
    try {
      logger.debug('Requesting hold invoices')
      const response = await api.holdInvoice.getAll()
      
      if (!response.data?.data) {
        throw new Error('Invalid hold invoices response')
      }

      // Validate each hold invoice
      response.data.data.forEach(invoice => {
        try {
          validateHoldOrder(invoice)
        } catch (error) {
          logger.warn(`Invalid hold order ${invoice.id}:`, error.message)
        }
      })

      logger.debug('Hold invoices response:', response.data)
      logger.info('Hold invoices fetched successfully')
      return {
        success: true,
        ...response.data
      }
    } catch (error) {
      return handleApiError(error)
    } finally {
      logger.endGroup()
    }
  },

  async createInvoice(invoiceData) {
    logger.startGroup('POS Operations: Create Invoice')
    try {
      logger.debug('Creating invoice with data:', invoiceData)

      // Validate hold order if converting from one
      if (invoiceData.hold_invoice_id) {
        const holdOrder = await this.getHoldInvoice(invoiceData.hold_invoice_id)
        validateHoldOrder(holdOrder)
      }

      const response = await apiClient.post('invoices', {
        invoice_date: invoiceData.invoice_date,
        due_date: invoiceData.due_date,
        invoice_number: invoiceData.invoice_number,
        invoice_template_id: 1,
        is_invoice_pos: 1,
        is_pdf_pos: true,
        user_id: invoiceData.user_id,
        hold_invoice_id: invoiceData.hold_invoice_id,
        store_id: invoiceData.store_id,
        cash_register_id: invoiceData.cash_register_id,
        sub_total: invoiceData.sub_total,
        total: invoiceData.total,
        due_amount: invoiceData.due_amount,
        tax: invoiceData.tax,
        discount: invoiceData.discount,
        discount_type: invoiceData.discount_type,
        discount_val: invoiceData.discount_val,
        tip: invoiceData.tip,
        tip_type: invoiceData.tip_type,
        tip_val: invoiceData.tip_val,
        items: invoiceData.items.map(item => ({
          item_id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity.toString()
        })),
        status: "SENT",
        paid_status: "UNPAID",
        save_as_draft: 0,
        not_charge_automatically: 0,
        tax_per_item: "NO",
        notes: invoiceData.notes || null,
        late_fee_amount: 0,
        late_fee_taxes: 0,
        pbx_service_price: 0,
        sent: 0,
        viewed: 0
      })

      logger.debug('Invoice creation response:', response.data)
      logger.info('Invoice created successfully:', {
        invoiceId: response.data.invoice?.id,
        total: response.data.invoice?.total
      })
      
      return {
        success: true,
        ...response.data
      }
    } catch (error) {
      return handleApiError(error)
    } finally {
      logger.endGroup()
    }
  },

  async processPayment(paymentData) {
    logger.startGroup('POS Operations: Process Payment')
    try {
      logger.debug('Processing payment with data:', paymentData)

      // Generate idempotency key
      const idempotencyKey = generateIdempotencyKey()
      logger.debug('Generated idempotency key:', idempotencyKey)

      // Validate payment against invoice
      validatePayment(paymentData, await this.getInvoice(paymentData.invoice_id))

      const response = await apiClient.post('payments/multiple/create', 
        {
          payment_date: paymentData.payment_date,
          paymentPrefix: paymentData.paymentPrefix,
          paymentNumAttribute: paymentData.paymentNumAttribute,
          payment_number: paymentData.payment_number,
          amount: paymentData.amount,
          invoice_id: paymentData.invoice_id,
          is_multiple: true,
          notes: paymentData.notes || "POS payment",
          payment_methods: paymentData.payment_methods.map(method => ({
            id: method.id,
            name: method.name,
            amount: method.amount,
            received: method.received,
            returned: method.returned,
            id_raw: method.id_raw,
            valid: true
          })),
          status: {
            value: "Approved",
            text: "Approved"
          },
          user_id: paymentData.user_id
        },
        {
          headers: {
            'Idempotency-Key': idempotencyKey
          }
        }
      )

      logger.debug('Payment processing response:', response.data)
      logger.info('Payment processed successfully:', {
        paymentId: response.data.payment?.id,
        amount: response.data.payment?.amount,
        invoiceId: paymentData.invoice_id,
        idempotencyKey
      })

      return {
        success: true,
        ...response.data
      }
    } catch (error) {
      return handleApiError(error)
    } finally {
      logger.endGroup()
    }
  },

  async getInvoice(id) {
    logger.startGroup('POS Operations: Get Invoice')
    try {
      logger.debug('Requesting invoice:', id)
      const response = await apiClient.get(`invoices/${id}`)
      
      if (!response.data?.invoice) {
        throw new Error('Invalid invoice response')
      }

      logger.debug('Invoice response:', response.data)
      logger.info('Invoice fetched successfully')
      return {
        success: true,
        ...response.data.invoice
      }
    } catch (error) {
      return handleApiError(error)
    } finally {
      logger.endGroup()
    }
  },

  async getPayment(id) {
    logger.startGroup('POS Operations: Get Payment')
    try {
      logger.debug('Requesting payment:', id)
      const response = await apiClient.get(`payments/${id}`)
      
      if (!response.data?.payment) {
        throw new Error('Invalid payment response')
      }

      logger.debug('Payment response:', response.data)
      logger.info('Payment fetched successfully')
      return {
        success: true,
        ...response.data.payment
      }
    } catch (error) {
      return handleApiError(error)
    } finally {
      logger.endGroup()
    }
  }
}

export default posOperations
