import apiClient from '../client'
import { logger } from '../../../utils/logger'
import api from '../pos-api'
import { handleApiError, validateHoldOrder } from './utils'

export const invoiceOperations = {
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

  async getHoldInvoice(id) {
    logger.startGroup('POS Operations: Get Hold Invoice')
    try {
      logger.debug('Requesting hold invoice:', id)
      const response = await api.holdInvoice.getById(id)
      
      // Handle both possible response structures
      const invoiceData = response.data?.data || response.data
      
      if (!invoiceData) {
        throw new Error('Invalid hold invoice response')
      }

      logger.debug('Hold invoice response:', invoiceData)
      logger.info('Hold invoice fetched successfully')
      return invoiceData
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

      // Skip hold invoice validation if we're creating from prepared data
      // This is the case when creating from cart store data during payment
      if (invoiceData.hold_invoice_id && !invoiceData.is_prepared_data) {
        const holdOrder = await this.getHoldInvoice(invoiceData.hold_invoice_id)
        if (!holdOrder) {
          throw new Error('Failed to fetch hold invoice')
        }
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
  }
}

export default invoiceOperations
