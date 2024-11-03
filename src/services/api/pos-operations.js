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
const operations = {
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
        prefix: response.data.prefix
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

  async updateHoldInvoice(id, invoiceData) {
    logger.startGroup('POS Operations: Update Hold Invoice')
    try {
      logger.debug('Updating hold invoice:', { id, data: invoiceData })

      const response = await api.holdInvoice.update(id, {
        ...invoiceData,
        is_hold_invoice: true
      })

      logger.debug('Hold invoice update response:', response)
      logger.info('Hold invoice updated successfully:', {
        invoiceId: id,
        total: invoiceData.total
      })

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

  async createInvoice(invoiceData) {
    logger.startGroup('POS Operations: Create Invoice')
    try {
      logger.debug('Creating invoice with data:', invoiceData)

      // Validate hold order if converting from one
      if (invoiceData.hold_invoice_id) {
        const holdOrder = await this.getHoldInvoice(invoiceData.hold_invoice_id)
        validateHoldOrder(holdOrder)
      }

      const response = await apiClient.post('invoices', invoiceData)

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

  // Payment Operations
  async getPaymentMethods() {
    logger.startGroup('POS Operations: Get Payment Methods')
    try {
      logger.debug('Requesting payment methods')
      const response = await apiClient.get('payments/multiple/get-payment-methods')
      
      if (!response.data?.payment_methods) {
        throw new Error('Invalid payment methods response')
      }

      logger.debug('Payment methods response:', response.data)
      logger.info('Payment methods fetched successfully')
      return {
        success: true,
        data: response.data.payment_methods
      }
    } catch (error) {
      return handleApiError(error)
    } finally {
      logger.endGroup()
    }
  },

  async createPayment(paymentData) {
    logger.startGroup('POS Operations: Create Payment')
    try {
      logger.debug('Creating payment with data:', paymentData)

      const idempotencyKey = generateIdempotencyKey()
      logger.debug('Generated idempotency key:', idempotencyKey)

      const response = await apiClient.post('payments/multiple/create', paymentData, {
        headers: {
          'Idempotency-Key': idempotencyKey
        }
      })

      logger.debug('Payment creation response:', response.data)
      logger.info('Payment created successfully:', {
        paymentId: response.data.payment?.id,
        amount: response.data.payment?.amount
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

  // Kitchen Display Operations
  async getOrders() {
    logger.startGroup('POS Operations: Get Orders')
    try {
      logger.debug('Requesting orders')
      const response = await apiClient.get('orders')
      
      if (!response.data) {
        throw new Error('Invalid orders response')
      }

      logger.debug('Orders response:', response.data)
      logger.info('Orders fetched successfully')
      return {
        success: true,
        data: Array.isArray(response.data) ? response.data : response.data.data || []
      }
    } catch (error) {
      return handleApiError(error)
    } finally {
      logger.endGroup()
    }
  },

  async getOrderById(orderId) {
    logger.startGroup('POS Operations: Get Order By ID')
    try {
      logger.debug('Requesting order:', orderId)
      const response = await apiClient.get(`orders/${orderId}`)
      
      if (!response.data) {
        throw new Error('Invalid order response')
      }

      logger.debug('Order response:', response.data)
      logger.info('Order fetched successfully')
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

  async updateOrderStatus(orderId, statusData) {
    logger.startGroup('POS Operations: Update Order Status')
    try {
      logger.debug('Updating order status:', { orderId, statusData })

      const response = await apiClient.patch(`orders/${orderId}/status`, statusData)

      logger.debug('Order status update response:', response.data)
      logger.info('Order status updated successfully:', {
        orderId,
        newStatus: statusData.status
      })

      return {
        success: true,
        data: response.data
      }
    } catch (error) {
      return handleApiError(error)
    } finally {
      logger.endGroup()
    }
  }
}

// Export both the composable-style function and the direct operations object
export const usePosOperations = () => operations
export const posOperations = operations
export default operations
