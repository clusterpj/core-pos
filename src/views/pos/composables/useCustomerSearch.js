import { ref, computed } from 'vue'
import { apiClient } from '../../../services/api/client'
import { logger } from '../../../utils/logger'
import debounce from 'lodash/debounce'

export function useCustomerSearch() {
  const searchResults = ref([])
  const isSearching = ref(false)
  const searchError = ref(null)
  
  // Debounced search function
  const searchCustomers = debounce(async (query) => {
    if (!query || query.length < 3) {
      searchResults.value = []
      return
    }

    isSearching.value = true
    searchError.value = null

    try {
      const response = await apiClient.get('/api/v1/customers', {
        params: {
          search: query,
          status_customer: 'A',
          page: 1
        }
      })

      if (response.data?.customers?.data) {
        searchResults.value = response.data.customers.data.map(customer => ({
          id: customer.id,
          name: customer.name,
          phone: customer.phone,
          email: customer.email,
          address: customer.address_street_1
        }))
      }
    } catch (error) {
      logger.error('Customer search failed:', error)
      searchError.value = 'Failed to search customers'
      searchResults.value = []
    } finally {
      isSearching.value = false
    }
  }, 350)

  const createCustomer = async (customerData) => {
    try {
      const response = await apiClient.post('/api/v2/core-pos/customer', customerData)
      return response.data
    } catch (error) {
      logger.error('Customer creation failed:', error)
      throw error
    }
  }

  return {
    searchResults,
    isSearching,
    searchError,
    searchCustomers,
    createCustomer
  }
}
