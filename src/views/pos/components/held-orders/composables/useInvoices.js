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

      // Build params object only with defined values
      const params = {}
      
      if (customerId) params.customer_id = customerId
      if (status) params.status = status
      if (fromDate) params.from_date = fromDate
      if (toDate) params.to_date = toDate
      if (invoiceNumber) params.invoice_number = invoiceNumber
      if (customcode) params.customcode = customcode
      if (unit) params.unit = unit
      if (orderByField) params.order_by_field = orderByField
      if (orderBy) params.order_by = orderBy
      
      // Add required params
      params.v2 = true
      params.page = page
      params.limit = limit

      const response = await apiClient.getPaginated('/api/v1/invoices', { params })

      invoices.value = response.data.data || []
      logger.info('Invoices fetched successfully:', invoices.value.length)
      return { success: true, data: invoices.value }
    } catch (err) {
      const errorResponse = handleApiError(err)
      error.value = errorResponse.message
      logger.error('Failed to fetch invoices:', errorResponse)
      return { success: false, error: errorResponse.message }
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
