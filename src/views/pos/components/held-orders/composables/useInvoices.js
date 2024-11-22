import { ref, computed } from 'vue'
import { apiClient } from '../../../../../services/api/client'
import { handleApiError } from '../../../../../services/api/pos-operations/utils'
import { logger } from '../../../../../utils/logger'

export function useInvoices() {
  const loading = ref(false)
  const invoices = ref([])
  const error = ref(null)

  const fetchInvoices = async ({
    customerId = '',
    status = '',
    fromDate = '',
    toDate = '',
    invoiceNumber = '',
    customcode = '',
    unit = '',
    orderByField = 'invoice_number',
    orderBy = 'desc',
    limit = 'all',
    page = 1
  } = {}) => {
    loading.value = true
    error.value = null

    try {
      logger.debug('Fetching invoices with params:', {
        customerId,
        status,
        fromDate,
        toDate,
        invoiceNumber,
        customcode,
        unit,
        orderByField,
        orderBy,
        limit,
        page
      })

      // Only include essential params
      const params = {
        page,
        limit
      }
      
      // Add filters only if they have actual values
      if (status && status !== 'ALL') params.status = status
      if (invoiceNumber?.trim()) params.invoice_number = invoiceNumber.trim()

      const response = await apiClient.getPaginated('v1/invoices', { params })
      
      // Check if response exists and has the expected structure
      if (!response || !response.data) {
        throw new Error('Invalid response format from server')
      }

      // Handle both possible response formats
      const invoiceData = Array.isArray(response.data) ? response.data : (response.data.data || [])
      invoices.value = invoiceData
      
      logger.info('Invoices fetched successfully:', invoices.value.length)
      return { success: true, data: invoices.value }
    } catch (err) {
      const errorResponse = handleApiError(err)
      error.value = errorResponse.message
      logger.error('Failed to fetch invoices:', {
        error: errorResponse,
        params: params
      })
      return { 
        success: false, 
        message: errorResponse.message || 'Failed to fetch invoices',
        errors: errorResponse.errors || {}
      }
    } finally {
      loading.value = false
    }
  }

  return {
    loading,
    invoices,
    error,
    fetchInvoices
  }
}
