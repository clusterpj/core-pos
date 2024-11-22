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

      const response = await apiClient.getPaginated('invoices', { params })
      
      logger.debug('Raw API response:', response)

      // Handle different response formats
      let invoiceData = []
      if (response?.data) {
        if (Array.isArray(response.data)) {
          invoiceData = response.data
        } else if (response.data.data && Array.isArray(response.data.data)) {
          invoiceData = response.data.data
        } else if (typeof response.data === 'object') {
          // If it's an object but not an array, try to extract values
          invoiceData = Object.values(response.data).filter(item => 
            item && typeof item === 'object' && item.id
          )
        }
      }

      invoices.value = invoiceData
      
      logger.info('Invoices fetched successfully:', {
        total: invoiceData.length,
        firstInvoice: invoiceData[0]?.id,
        format: Array.isArray(response.data) ? 'array' : 
                (response.data?.data ? 'paginated' : 'object')
      })
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
