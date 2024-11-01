import apiClient from './client'
import { logger } from '../../utils/logger'
import api from './pos-api'

/**
 * POS Operations Service
 * Implements core POS operations from the API documentation
 */

export const posOperations = {
  // Table Management
  async getTables(cashRegisterId) {
    logger.startGroup('POS Operations: Get Tables')
    try {
      const response = await apiClient.get(`/api/v1/core-pos/table-cash-register/${cashRegisterId}`)
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
      const response = await apiClient.post('/api/v1/core-pos/tables', tableData)
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
      // Use the API service for hold invoice creation
      const response = await api.holdInvoice.create(invoiceData)
      logger.debug('Hold invoice created:', response)
      return response
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
      const response = await api.holdInvoice.getAll()
      return response.data
    } catch (error) {
      logger.error('Failed to fetch hold invoices', error)
      throw error
    } finally {
      logger.endGroup()
    }
  },

  async getHoldInvoice(id) {
    logger.startGroup('POS Operations: Get Hold Invoice')
    try {
      const response = await api.holdInvoice.getById(id)
      return response.data
    } catch (error) {
      logger.error('Failed to fetch hold invoice', error)
      throw error
    } finally {
      logger.endGroup()
    }
  },

  async deleteHoldInvoice(id) {
    logger.startGroup('POS Operations: Delete Hold Invoice')
    try {
      const response = await api.holdInvoice.delete(id)
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
      const response = await apiClient.get(`/api/v1/core-pos/cash-register/report/${registerId}`, {
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
      const response = await apiClient.get('/api/v1/core-pos/cash-register/getCashAmountPayments', { params })
      logger.info('Cash amount payments fetched successfully')
      return response.data
    } catch (error) {
      logger.error('Failed to fetch cash amount payments', error)
      throw error
    } finally {
      logger.endGroup()
    }
  },

  // Payment Operations
  async getPaymentMethods() {
    logger.startGroup('POS Operations: Get Payment Methods')
    try {
      const response = await apiClient.get('/api/v1/payments/multiple/get-payment-methods')
      logger.info('Payment methods fetched successfully')
      return response.data
    } catch (error) {
      logger.error('Failed to fetch payment methods', error)
      throw error
    } finally {
      logger.endGroup()
    }
  },

  async getNextPaymentNumber() {
    logger.startGroup('POS Operations: Get Next Payment Number')
    try {
      const response = await apiClient.get('/api/v1/next-number', {
        params: { key: 'payment' }
      })
      logger.info('Next payment number fetched successfully')
      return response.data
    } catch (error) {
      logger.error('Failed to fetch next payment number', error)
      throw error
    } finally {
      logger.endGroup()
    }
  },

  async processPayment(paymentData) {
    logger.startGroup('POS Operations: Process Payment')
    try {
      logger.debug('Processing payment with data:', paymentData)
      const response = await apiClient.post('/api/v1/payments/multiple/create', paymentData)
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
      // For regular orders, submit directly to orders endpoint
      const response = await apiClient.post('/api/v1/core-pos/orders', {
        ...orderData,
        is_hold_invoice: false,
        avalara_bool: false,
        banType: true,
        is_invoice_pos: 1,
        is_pdf_pos: true
      })
      
      logger.info('Order submitted successfully')
      
      // Process payment if provided
      if (orderData.payment) {
        const paymentResponse = await this.processPayment({
          ...orderData.payment,
          order_id: response.data.id
        })
        
        logger.info('Payment processed successfully')
        
        return {
          success: true,
          order: response.data,
          payment: paymentResponse
        }
      }
      
      return {
        success: true,
        order: response.data
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
      const response = await apiClient.get(`/api/v1/core-pos/print/order/${orderId}`)
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
