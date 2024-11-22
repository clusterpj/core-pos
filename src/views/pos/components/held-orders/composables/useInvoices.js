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

      const response = await apiClient.get('/api/v1/invoices', {
        params: {
          customer_id: customerId,
          status,
          from_date: fromDate,
          to_date: toDate,
          invoice_number: invoiceNumber,
          customcode,
          unit,
          orderByField,
          orderBy,
          v2: true,
          page,
          limit
        }
      })

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
