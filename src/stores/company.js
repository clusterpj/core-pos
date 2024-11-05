import { defineStore } from 'pinia'
import { customerModule } from './company/customer'
import { storeModule } from './company/store'
import { cashRegisterModule } from './company/cashRegister'
import { logger } from '../utils/logger'

export const useCompanyStore = defineStore('company', {
  state: () => ({
    ...customerModule.state(),
    ...storeModule.state(),
    ...cashRegisterModule.state()
  }),

  getters: {
    // Combine all getters from modules
    ...customerModule.getters,
    ...storeModule.getters,
    ...cashRegisterModule.getters,

    // Additional composed getters
    isConfigured: (state) => {
      return state.selectedCustomer && state.selectedStore && state.selectedCashier
    }
  },

  actions: {
    // Initialize the entire store
    async initializeStore() {
      logger.startGroup('Company Store: Initialize')
      try {
        await this.fetchCustomers()
        await this.fetchCashRegisters()
        
        // If we have a selected customer, fetch stores
        if (this.selectedCustomer) {
          const customer = this.customers.find(c => c.id === this.selectedCustomer)
          if (customer) {
            await this.fetchStores(customer.company_id)
          }
        }
        
        logger.info('Company store initialized successfully')
      } catch (error) {
        logger.error('Failed to initialize company store', error)
        throw error
      } finally {
        logger.endGroup()
      }
    },

    // Combine all actions from modules
    ...customerModule.actions,
    ...storeModule.actions,
    ...cashRegisterModule.actions,

    // Override setSelectedCashier to handle the complex interaction between modules
    async setSelectedCashier(registerId) {
      const result = await cashRegisterModule.actions.setSelectedCashier.call(this, registerId)
      
      if (!result.success) {
        return
      }

      // Auto-select customer and fetch stores
      if (result.customerId) {
        await this.setSelectedCustomer(result.customerId)
        const customer = this.customers.find(c => c.id === result.customerId)
        if (customer) {
          // Fetch stores for the customer's company
          await this.fetchStores(customer.company_id)
        }
      }

      // Auto-select store
      if (result.storeId) {
        // Verify store exists in fetched stores
        const storeExists = this.stores.some(s => s.id === result.storeId)
        if (storeExists) {
          await this.setSelectedStore(result.storeId)
        } else {
          logger.warn('Store not found in available stores:', result.storeId)
          throw new Error('Associated store not available')
        }
      }

      logger.info('Auto-selected customer and store:', {
        cashier: registerId,
        customer: result.customerId,
        store: result.storeId
      })
    },

    // Clear all selections
    clearSelections() {
      logger.info('Clearing all selections')
      this.clearCustomerSelection()
      this.clearStoreSelection()
      this.clearCashierSelection()
    }
  }
})
