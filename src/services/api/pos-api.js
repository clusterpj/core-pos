import apiClient from './client'
import { logger } from '../../utils/logger'
import { getApiEndpoint } from './config'

/**
 * POS API Service
 * Implements endpoints from CorePOS API Implementation Guide
 */

// User Management
const getEmployees = async () => {
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
}

// Cash Register Management
const getCashiers = async () => {
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
}

// Product Management
const getItems = async (params = {}) => {
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
}

const getItemCategories = async () => {
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
}

// Store Management
const getStores = async () => {
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
}

// Hold Invoice Operations
const holdInvoiceOperations = {
  async create(invoiceData) {
    logger.startGroup('POS API: Create Hold Invoice')
    try {
      logger.info('Creating hold invoice at endpoint: /v1/core-pos/hold-invoices')
      logger.debug('Hold invoice data:', invoiceData)

      const response = await apiClient.post('/v1/core-pos/hold-invoices', invoiceData)
      logger.debug('Hold invoice response:', response.data)

      // If we have a response with an ID, consider it successful
      if (response.data?.id || response.data?.hold_invoice_id) {
        logger.info('Hold invoice created successfully')
        return {
          success: true,
          data: {
            ...response.data,
            id: response.data.id || response.data.hold_invoice_id
          }
        }
      }

      // If success is explicitly true, return the response
      if (response.data?.success === true) {
        logger.info('Hold invoice created successfully')
        return response.data
      }

      // If we get here, something went wrong
      throw new Error(response.data?.message || 'Failed to create hold invoice')
    } catch (error) {
      logger.error('Failed to create hold invoice', error)
      throw error
    } finally {
      logger.endGroup()
    }
  },

  async getAll() {
    logger.startGroup('POS API: Get All Hold Invoices')
    try {
      logger.info('Fetching hold invoices from endpoint: /v1/core-pos/hold-invoices')

      const response = await apiClient.get('/v1/core-pos/hold-invoices')
      logger.debug('Hold invoices response:', response.data)

      if (!response.data) {
        throw new Error('Invalid response format: missing data')
      }

      logger.info('Hold invoices fetched successfully')
      return response
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
      const endpoint = `/v1/core-pos/hold-invoices/${id}`
      logger.info('Fetching hold invoice from endpoint:', endpoint)

      const response = await apiClient.get(endpoint)
      logger.debug('Hold invoice response:', response.data)

      if (!response.data) {
        throw new Error('Invalid response format: missing data')
      }

      logger.info('Hold invoice fetched successfully')
      return response
    } catch (error) {
      logger.error('Failed to fetch hold invoice', {
        error,
        id
      })
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

      if (!response.data) {
        throw new Error('Invalid response format: missing data')
      }

      logger.info('Hold invoice deleted successfully')
      return response
    } catch (error) {
      logger.error('Failed to delete hold invoice', {
        error,
        id
      })
      throw error
    } finally {
      logger.endGroup()
    }
  }
}

const api = {
  getEmployees,
  getCashiers,
  getItems,
  getItemCategories,
  getStores,
  holdInvoice: holdInvoiceOperations
}

export default api
