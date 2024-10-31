// src/services/api/pos-api.js
import apiClient from './client'
import { logger } from '../../utils/logger'
import { apiConfig } from './config'

/**
 * POS API Service
 * Implements endpoints from CorePOS API Implementation Guide
 */

const getApiEndpoint = (path) => {
  const endpoints = path.split('.')
  return endpoints.reduce((acc, curr) => acc[curr], apiConfig.endpoints)
}

// User Management
export const getEmployees = async () => {
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
export const getCashiers = async () => {
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
export const getItems = async (params = {}) => {
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

export const deleteItems = async (itemIds) => {
  logger.startGroup('POS API: Delete Items')
  try {
    const endpoint = `${getApiEndpoint('pos.items')}/delete`
    logger.info('Deleting items at endpoint:', endpoint)
    
    const response = await apiClient.post(endpoint, { ids: itemIds })
    logger.http('POST', endpoint, { ids: itemIds }, response)

    if (!response.data) {
      throw new Error('Invalid response format: missing data')
    }

    return {
      success: true,
      data: response.data
    }
  } catch (error) {
    logger.error('Failed to delete items', {
      error,
      itemIds,
      endpoint: getApiEndpoint('pos.items')
    })
    throw error
  } finally {
    logger.endGroup()
  }
}

export const getItemCategories = async () => {
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
export const getStores = async () => {
  logger.startGroup('POS API: Get Stores')
  try {
    const endpoint = getApiEndpoint('pos.stores')
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
      endpoint: getApiEndpoint('pos.stores')
    })
    throw error
  } finally {
    logger.endGroup()
  }
}

// Hold Invoice Operations
export const holdInvoiceOperations = {
  create(invoiceData) {
    return apiClient.post('/v1/core-pos/hold-invoices', invoiceData)
  },

  getAll() {
    return apiClient.get('/v1/core-pos/hold-invoices')
  },

  getById(id) {
    return apiClient.get(`/v1/core-pos/hold-invoices/${id}`)
  },

  delete(id) {
    return apiClient.delete(`/v1/core-pos/hold-invoices/${id}`)
  }
}

export const posApi = {
  getCashiers,
  getEmployees,
  getItems,
  deleteItems,
  getItemCategories,
  getStores,
  holdInvoice: holdInvoiceOperations
}

export default posApi
