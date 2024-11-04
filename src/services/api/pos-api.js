import apiClient from './client'
import { logger } from '../../utils/logger'
import { getApiEndpoint } from './config'

/**
 * POS API Service
 * Implements endpoints from CorePOS API Implementation Guide
 */
const operations = {
  // User Management
  async getEmployees() {
    logger.startGroup('POS API: Get Employees')
    try {
      const endpoint = getApiEndpoint('pos.employees')
      logger.info('Fetching employees from endpoint:', endpoint)
      
      const response = await apiClient.get(endpoint)
      logger.http('GET', endpoint, {}, response)

      if (!response.data) {
        throw new Error('Invalid response format: missing data')
      }

      return {
        success: true,
        employees: response.data
      }
    } catch (error) {
      logger.error('Failed to fetch employees', error)
      throw error
    } finally {
      logger.endGroup()
    }
  },

  // Cash Register Management
  async getCashiers() {
    logger.startGroup('POS API: Get Cashiers')
    try {
      const endpoint = getApiEndpoint('pos.cashiers')
      logger.info('Fetching cashiers from endpoint:', endpoint)
      
      const response = await apiClient.get(endpoint)
      logger.http('GET', endpoint, {}, response)
      
      if (!response.data) {
        throw new Error('Invalid response format: missing data')
      }

      return {
        success: true,
        cashiers: response.data
      }
    } catch (error) {
      logger.error('Failed to fetch cashiers', error)
      throw error
    } finally {
      logger.endGroup()
    }
  },

  // Product Management
  async getItems(params = {}) {
    logger.startGroup('POS API: Get Items')
    try {
      const endpoint = getApiEndpoint('pos.items')
      logger.info('Fetching items from endpoint:', endpoint)
      logger.debug('Request parameters', params)

      const response = await apiClient.get(endpoint, { params })
      logger.http('GET', endpoint, { params }, response)

      if (!response.data) {
        throw new Error('Invalid response format: missing data')
      }

      return response.data
    } catch (error) {
      logger.error('Failed to fetch items', {
        error,
        endpoint: getApiEndpoint('pos.items'),
        params
      })
      throw error
    } finally {
      logger.endGroup()
    }
  },

  async getItemCategories() {
    logger.startGroup('POS API: Get Item Categories')
    try {
      const endpoint = getApiEndpoint('pos.categories')
      logger.info('Fetching item categories from endpoint:', endpoint)
      
      const response = await apiClient.get(endpoint)
      logger.http('GET', endpoint, {}, response)

      if (!response.data) {
        throw new Error('Invalid response format: missing data')
      }

      if (response.data.success === true) {
        const categories = response.data.data || []
        logger.info(`Categories fetched successfully. Count: ${categories.length}`)
        logger.debug('Categories:', categories)
        return {
          success: true,
          data: categories
        }
      } else {
        logger.warn('Unexpected API response structure', response.data)
        return {
          success: false,
          data: [],
          error: 'Invalid API response format'
        }
      }
    } catch (error) {
      logger.error('Failed to fetch categories', {
        error,
        endpoint: getApiEndpoint('pos.categories')
      })
      throw error
    } finally {
      logger.endGroup()
    }
  },

  // Store Management
  async getStores() {
    logger.startGroup('POS API: Get Stores')
    try {
      const endpoint = getApiEndpoint('pos.store')
      logger.info('Fetching stores from endpoint:', endpoint)

      const params = {
        limit: 10000,
        orderByField: 'name',
        orderBy: 'asc'
      }

      const response = await apiClient.get(endpoint, { params })
      logger.http('GET', endpoint, { params }, response)

      if (!response.data) {
        throw new Error('Invalid response format: missing data')
      }

      return {
        success: true,
        stores: response.data
      }
    } catch (error) {
      logger.error('Failed to fetch stores', {
        error,
        endpoint: getApiEndpoint('pos.store')
      })
      throw error
    } finally {
      logger.endGroup()
    }
  },

  // Invoice Operations
  invoice: {
    async getNextNumber() {
      logger.startGroup('POS API: Get Next Invoice Number')
      try {
        const endpoint = getApiEndpoint('pos.invoice.nextNumber')
        logger.info('Fetching next invoice number from endpoint:', endpoint)
        
        const response = await apiClient.get(endpoint)
        logger.debug('Next invoice number response:', response.data)
        
        return response.data
      } catch (error) {
        logger.error('Failed to get next invoice number', error)
        throw error
      } finally {
        logger.endGroup()
      }
    },

    async create(invoiceData) {
      logger.startGroup('POS API: Create Invoice')
      try {
        const endpoint = getApiEndpoint('pos.invoice.create')
        logger.info('Creating invoice at endpoint:', endpoint)
        logger.debug('Invoice data:', invoiceData)

        const response = await apiClient.post(endpoint, invoiceData)
        logger.debug('Invoice creation response:', response.data)

        return response.data
      } catch (error) {
        logger.error('Failed to create invoice', error)
        throw error
      } finally {
        logger.endGroup()
      }
    }
  },

  // Hold Invoice Operations
  holdInvoice: {
    async create(invoiceData) {
      logger.startGroup('POS API: Create Hold Invoice')
      try {
        const endpoint = getApiEndpoint('pos.holdInvoices')
        logger.info('Creating hold invoice at endpoint:', endpoint)
        logger.debug('Hold invoice data:', invoiceData)

        const response = await apiClient.post(endpoint, invoiceData)
        logger.debug('Hold invoice response:', response.data)

        return response.data
      } catch (error) {
        logger.error('Failed to create hold invoice', error)
        throw error
      } finally {
        logger.endGroup()
      }
    },

    async update(description, invoiceData) {
      logger.startGroup('POS API: Update Hold Invoice')
      try {
        const endpoint = getApiEndpoint('pos.holdInvoices')
        logger.info(`Updating hold invoice with description: ${description}`)
        logger.debug('Hold invoice update data:', invoiceData)

        const response = await apiClient.post(endpoint, {
          ...invoiceData,
          description,
          is_hold_invoice: true
        })
        logger.debug('Hold invoice update response:', response.data)

        return {
          success: true,
          data: response.data
        }
      } catch (error) {
        logger.error('Failed to update hold invoice', error)
        return {
          success: false,
          error: error.message,
          message: 'Failed to update hold invoice'
        }
      } finally {
        logger.endGroup()
      }
    },

    async getAll() {
      logger.startGroup('POS API: Get All Hold Invoices')
      try {
        const endpoint = getApiEndpoint('pos.holdInvoices')
        const response = await apiClient.get(endpoint)
        logger.debug('Hold invoices response:', response.data)
        
        return {
          success: true,
          data: {
            hold_invoices: response.data.hold_invoices
          }
        }
      } catch (error) {
        logger.error('Failed to fetch hold invoices', error)
        throw error
      } finally {
        logger.endGroup()
      }
    },

    async getById(id) {
      logger.startGroup('POS API: Get Hold Invoice')
      try {
        const endpoint = `${getApiEndpoint('pos.holdInvoices')}/${id}`
        const response = await apiClient.get(endpoint)
        logger.debug('Hold invoice response:', response.data)
        return response.data
      } catch (error) {
        logger.error('Failed to fetch hold invoice', error)
        throw error
      } finally {
        logger.endGroup()
      }
    },

    async delete(id) {
      logger.startGroup('POS API: Delete Hold Invoice')
      try {
        const endpoint = '/v1/core-pos/hold-invoice/delete'
        logger.info('Deleting hold invoice at endpoint:', endpoint)
        
        const response = await apiClient.post(endpoint, { id })
        logger.debug('Delete response:', response.data)
        return {
          success: true,
          data: response.data
        }
      } catch (error) {
        logger.error('Failed to delete hold invoice', error)
        return {
          success: false,
          error: error.message,
          message: 'Failed to delete hold invoice'
        }
      } finally {
        logger.endGroup()
      }
    }
  }
}

// Export both the composable-style function and the direct operations object
export const usePosApi = () => operations
export const posApi = operations
export default operations
