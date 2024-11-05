import { apiClient } from '../../services/api/client'
import { logger } from '../../utils/logger'

export const cashRegisterModule = {
  state: () => ({
    cashRegisters: [],
    selectedCashier: null,
    loadingCashRegisters: false,
    cashRegisterError: null
  }),

  getters: {
    hasSelectedCashier: (state) => !!state.selectedCashier,

    currentCashRegister: (state) => {
      return state.cashRegisters.find(register => register.id === state.selectedCashier)
    },

    cashRegistersForDisplay: (state) => {
      return (state.cashRegisters || []).map(register => ({
        title: register.name,
        value: register.id,
        description: register.description,
        storeName: register.store_name,
        customerId: register.customer_id,
        storeId: register.store_id
      }))
    },

    selectedCashierDisplay: (state) => {
      const register = state.cashRegisters.find(r => r.id === state.selectedCashier)
      return register?.name || ''
    }
  },

  actions: {
    async fetchCashRegisters() {
      logger.startGroup('Company Store: Fetch Cash Registers')
      this.loadingCashRegisters = true
      this.cashRegisterError = null

      try {
        const companyId = localStorage.getItem('companyId')
        logger.debug('Fetching cash registers for company:', companyId)

        const config = {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
            company: companyId
          }
        }

        const response = await apiClient.get('/v1/core-pos/cash-register/getCashRegistersUser', config)

        if (response.data?.success) {
          this.cashRegisters = response.data.data || []
          logger.info(`Loaded ${this.cashRegisters.length} cash registers`)
        } else {
          throw new Error(response.data?.message || 'Failed to load cash registers')
        }
      } catch (error) {
        logger.error('Failed to fetch cash registers', error)
        this.cashRegisterError = error.message
        this.cashRegisters = []
      } finally {
        this.loadingCashRegisters = false
        logger.endGroup()
      }
    },

    async setSelectedCashier(registerId) {
      logger.info('Setting selected cash register:', registerId)
      
      const register = this.cashRegisters.find(r => r.id === registerId)
      if (!register) {
        logger.warn('Cash register not found for ID:', registerId)
        return {
          success: false,
          error: 'Cash register not found'
        }
      }

      this.selectedCashier = registerId
      localStorage.setItem('selectedCashier', registerId)

      return {
        success: true,
        customerId: register.customer_id,
        storeId: register.store_id
      }
    },

    clearCashierSelection() {
      this.selectedCashier = null
      this.cashRegisters = []
      localStorage.removeItem('selectedCashier')
    }
  }
}
