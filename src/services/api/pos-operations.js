import apiClient from './client'
import { logger } from '../../utils/logger'

/**
 * POS Operations Service
 * Implements core POS operations from the API documentation
 */

export const posOperations = {
  // Table Management
  async getTables(cashRegisterId) {
    logger.startGroup('POS Operations: Get Tables')
    try {
      const response = await apiClient.get(`/api/core-pos/table-cash-register/${cashRegisterId}`)
      logger.info('Tables fetched successfully')
      return response.data
    } catch (error) {
      logger.error('Failed to fetch tables', error)
      throw error
    } finally {
      logger.endGroup()
    }
  },

  async assignTable(tableData) {
    logger.startGroup('POS Operations: Assign Table')
    try {
      const response = await apiClient.post('/api/core-pos/tables', tableData)
      logger.info('Table assigned successfully')
      return response.data
    } catch (error) {
      logger.error('Failed to assign table', error)
      throw error
    } finally {
      logger.endGroup()
    }
  },

  // Hold Invoice Operations
  async createHoldInvoice(invoiceData) {
    logger.startGroup('POS Operations: Create Hold Invoice')
    try {
      const response = await apiClient.post('/api/core-pos/hold-invoices', invoiceData)
      logger.info('Hold invoice created successfully')
      return response.data
    } catch (error) {
      logger.error('Failed to create hold invoice', error)
      throw error
    } finally {
      logger.endGroup()
    }
  },

  async getHoldInvoices() {
    logger.startGroup('POS Operations: Get Hold Invoices')
    try {
      const response = await apiClient.get('/api/core-pos/hold-invoices')
      logger.info('Hold invoices fetched successfully')
      return response.data
    } catch (error) {
      logger.error('Failed to fetch hold invoices', error)
      throw error
    } finally {
      logger.endGroup()
    }
  },

  async deleteHoldInvoice(invoiceId) {
    logger.startGroup('POS Operations: Delete Hold Invoice')
    try {
      const response = await apiClient.post('/api/core-pos/hold-invoice/delete', {
        id: invoiceId
      })
      logger.info('Hold invoice deleted successfully')
      return response.data
    } catch (error) {
      logger.error('Failed to delete hold invoice', error)
      throw error
    } finally {
      logger.endGroup()
    }
  },

  // Cash Register Operations
  async getCashRegisterReport(registerId, cashHistoryId) {
    logger.startGroup('POS Operations: Get Cash Register Report')
    try {
      const response = await apiClient.get(`/api/core-pos/cash-register/report/${registerId}`, {
        params: { cash_history_id: cashHistoryId }
      })
      logger.info('Cash register report fetched successfully')
      return response.data
    } catch (error) {
      logger.error('Failed to fetch cash register report', error)
      throw error
    } finally {
      logger.endGroup()
    }
  },

  async getCashAmountPayments(params) {
    logger.startGroup('POS Operations: Get Cash Amount Payments')
    try {
      const response = await apiClient.get('/api/core-pos/cash-register/getCashAmountPayments', { params })
      logger.info('Cash amount payments fetched successfully')
      return response.data
    } catch (error) {
      logger.error('Failed to fetch cash amount payments', error)
      throw error
    } finally {
      logger.endGroup()
    }
  },

  // Payment Processing
  async processPayment(paymentData) {
    logger.startGroup('POS Operations: Process Payment')
    try {
      const response = await apiClient.post('/api/core-pos/payments', paymentData)
      logger.info('Payment processed successfully')
      return response.data
    } catch (error) {
      logger.error('Failed to process payment', error)
      throw error
    } finally {
      logger.endGroup()
    }
  },

  // Order Management
  async submitOrder(orderData) {
    logger.startGroup('POS Operations: Submit Order')
    try {
      // First create the invoice
      const invoiceResponse = await apiClient.post('/api/core-pos/invoices', {
        ...orderData,
        status: 'COMPLETED'
      })
      
      logger.info('Invoice created successfully')
      
      // Then process the payment if provided
      if (orderData.payment) {
        const paymentResponse = await this.processPayment({
          ...orderData.payment,
          invoice_id: invoiceResponse.data.invoice.id
        })
        
        logger.info('Payment processed successfully')
        
        return {
          success: true,
          invoice: invoiceResponse.data.invoice,
          payment: paymentResponse.data.payment
        }
      }
      
      return {
        success: true,
        invoice: invoiceResponse.data.invoice
      }
    } catch (error) {
      logger.error('Failed to submit order', error)
      throw error
    } finally {
      logger.endGroup()
    }
  },

  // Print Operations
  async printOrder(orderId) {
    logger.startGroup('POS Operations: Print Order')
    try {
      const response = await apiClient.get(`/api/core-pos/print/order/${orderId}`)
      logger.info('Print request sent successfully')
      return response.data
    } catch (error) {
      logger.error('Failed to print order', error)
      throw error
    } finally {
      logger.endGroup()
    }
  }
}

export default posOperations
