import { defineStore } from 'pinia'
import { customerModule } from './company/customer'
import { storeModule } from './company/store'
import { cashRegisterModule } from './company/cashRegister'
import { logger } from '../utils/logger'

export const useCompanyStore = defineStore('company', {
  state: () => ({
    ...customerModule.state(),
    ...storeModule.state(),
    ...cashRegisterModule.state(),
    initializationComplete: false
  }),

  getters: {
    ...customerModule.getters,
    ...storeModule.getters,
    ...cashRegisterModule.getters,

    isConfigured: (state) => {
      return state.selectedCustomer && state.selectedStore && state.selectedCashier
    }
  },

  actions: {
    ...customerModule.actions,
    ...storeModule.actions,
    ...cashRegisterModule.actions,

    async initializeFromCashier(cashierData) {
      logger.startGroup('Company Store: Initialize from Cashier')
      try {
        this.clearSelections()
        
        await this.setSelectedCustomer(cashierData.customer_id)
        logger.debug('Customer set:', cashierData.customer_id)
        
        await this.setSelectedStore(cashierData.store_id)
        logger.debug('Store set:', cashierData.store_id)
        
        await this.setSelectedCashier(cashierData.id)
        logger.debug('Cashier set:', cashierData.id)
        
        this.initializationComplete = true
        logger.info('Company store initialized successfully from cashier')
        
        return true
      } catch (error) {
        logger.error('Failed to initialize from cashier:', error)
        this.clearSelections()
        throw error
      } finally {
        logger.endGroup()
      }
    },

    async initializeStore() {
      logger.startGroup('Company Store: Initialize')
      try {
        await this.fetchCustomers()
        
        const storedCustomer = localStorage.getItem('selectedCustomer')
        const storedStore = localStorage.getItem('selectedStore')
        const storedCashier = localStorage.getItem('selectedCashier')

        if (storedCustomer) {
          await this.setSelectedCustomer(Number(storedCustomer))
          await this.fetchStores()

          if (storedStore) {
            await this.setSelectedStore(Number(storedStore))
            await this.fetchCashRegisters()

            if (storedCashier) {
              await this.setSelectedCashier(Number(storedCashier))
            }
          }
        }

        this.initializationComplete = true
        return true
      } catch (error) {
        logger.error('Store initialization failed:', error)
        this.clearSelections()
        throw error
      } finally {
        logger.endGroup()
      }
    },

    clearSelections() {
      this.selectedCustomer = null
      this.selectedStore = null
      this.selectedCashier = null
      localStorage.removeItem('selectedCustomer')
      localStorage.removeItem('selectedStore')
      localStorage.removeItem('selectedCashier')
      this.initializationComplete = false
    }
  }
})
