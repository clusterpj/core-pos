import { apiClient } from '../../services/api/client'
import { logger } from '../../utils/logger'

export const customerModule = {
  state: () => ({
    customers: [],
    selectedCustomer: null,
    loading: false,
    error: null
  }),

  getters: {
    hasSelectedCustomer: (state) => !!state.selectedCustomer,
    
    currentCustomer: (state) => {
      return state.customers.find(customer => customer.id === state.selectedCustomer)
    },

    customersForDisplay: (state) => {
      return (state.customers || [])
        .filter(customer => customer.status_customer === 'A')
        .map(customer => ({
          title: customer.name,
          value: customer.id,
          companyId: customer.company_id
        }))
    },

    selectedCustomerDisplay: (state) => {
      const customer = state.customers.find(c => c.id === state.selectedCustomer)
      return customer?.name || ''
    }
  },

  actions: {
    async fetchCustomers() {
      if (this.loading) {
        logger.warn('Customer fetch already in progress, skipping')
        return
      }

      logger.startGroup('Company Store: Fetch Customers')
      this.loading = true
      this.error = null

      try {
        const response = await apiClient.get('customers', {
          params: { limit: 'all' }
        })
        
        if (response.data?.customers?.data) {
          this.customers = response.data.customers.data
          logger.info(`Loaded ${this.customers.length} customers`)
        } else {
          throw new Error('Invalid response format: missing customers data')
        }
      } catch (error) {
        logger.error('Failed to fetch customers', error)
        this.error = error.message
        this.customers = []
      } finally {
        this.loading = false
        logger.endGroup()
      }
    },

    async setSelectedCustomer(customerId) {
      logger.info('Manual customer selection:', customerId)
      
      const customer = this.customers.find(c => c.id === customerId)
      if (customer) {
        this.selectedCustomer = customerId
        localStorage.setItem('selectedCustomer', customerId)
        localStorage.setItem('companyId', customer.company_id)
        return customer.company_id
      } else {
        logger.warn('Customer not found for ID:', customerId)
        return null
      }
    },

    clearCustomerSelection() {
      this.selectedCustomer = null
      localStorage.removeItem('selectedCustomer')
      localStorage.removeItem('companyId')
    }
  }
}
