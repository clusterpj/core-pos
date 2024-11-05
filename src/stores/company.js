// src/stores/company.js
import { defineStore } from 'pinia'
import { apiClient } from '../services/api/client'
import { logger } from '../utils/logger'

export const useCompanyStore = defineStore('company', {
  state: () => ({
    // Customer State
    customers: [],
    selectedCustomer: null,
    loading: false,
    error: null,

    // Store State
    stores: [],
    selectedStore: null,
    loadingStores: false,
    storeError: null,

    // Cashier State
    cashRegisters: [],
    selectedCashier: null,
    loadingCashRegisters: false,
    cashRegisterError: null
  }),

  getters: {
    hasSelectedCustomer: (state) => !!state.selectedCustomer,
    hasSelectedStore: (state) => !!state.selectedStore,
    hasSelectedCashier: (state) => !!state.selectedCashier,
    
    currentCustomer: (state) => {
      return state.customers.find(customer => customer.id === state.selectedCustomer)
    },

    currentStore: (state) => {
      return state.stores.find(store => store.id === state.selectedStore)
    },

    currentCashRegister: (state) => {
      return state.cashRegisters.find(register => register.id === state.selectedCashier)
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
    },

    storesForDisplay: (state) => {
      return (state.stores || []).map(store => ({
        title: store.name,
        value: store.id,
        description: store.description,
        subtitle: store.company_name
      }))
    },

    selectedStoreDisplay: (state) => {
      const store = state.stores.find(s => s.id === state.selectedStore)
      return store?.name || ''
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
    },

    isConfigured: (state) => {
      return state.selectedCustomer && state.selectedStore && state.selectedCashier
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

    async fetchStores(companyId) {
      logger.startGroup('Company Store: Fetch Stores')
      this.loadingStores = true
      this.storeError = null

      try {
        logger.debug('Fetching stores for company:', companyId)

        const params = {
          limit: 10000,
          orderByField: 'name',
          orderBy: 'asc'
        }

        const config = {
          params,
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
            company: companyId
          }
        }

        const response = await apiClient.get('/v1/pos/store', config)

        if (response.data?.success && response.data?.stores?.data) {
          this.stores = response.data.stores.data
          logger.info(`Loaded ${this.stores.length} stores`)
        } else {
          throw new Error(response.data?.message || 'Failed to load stores')
        }
      } catch (error) {
        logger.error('Failed to fetch stores', error)
        this.storeError = error.message
        this.stores = []
      } finally {
        this.loadingStores = false
        logger.endGroup()
      }
    },

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
        return
      }

      // Set cashier
      this.selectedCashier = registerId
      localStorage.setItem('selectedCashier', registerId)

      // Auto-select customer and fetch stores
      if (register.customer_id) {
        this.selectedCustomer = register.customer_id
        localStorage.setItem('selectedCustomer', register.customer_id)
        
        const customer = this.customers.find(c => c.id === register.customer_id)
        if (customer) {
          localStorage.setItem('companyId', customer.company_id)
          // Fetch stores for the customer's company
          await this.fetchStores(customer.company_id)
        }
      }

      // Auto-select store
      if (register.store_id) {
        // Verify store exists in fetched stores
        const storeExists = this.stores.some(s => s.id === register.store_id)
        if (storeExists) {
          this.selectedStore = register.store_id
          localStorage.setItem('selectedStore', register.store_id)
        } else {
          logger.warn('Store not found in available stores:', register.store_id)
          throw new Error('Associated store not available')
        }
      }

      logger.info('Auto-selected customer and store:', {
        cashier: registerId,
        customer: register.customer_id,
        store: register.store_id
      })
    },

    // Optional manual selection methods
    async setSelectedCustomer(customerId) {
      logger.info('Manual customer selection:', customerId)
      
      const customer = this.customers.find(c => c.id === customerId)
      if (customer) {
        this.selectedCustomer = customerId
        localStorage.setItem('selectedCustomer', customerId)
        localStorage.setItem('companyId', customer.company_id)
        
        // Fetch stores for the selected customer's company
        await this.fetchStores(customer.company_id)
      } else {
        logger.warn('Customer not found for ID:', customerId)
      }
    },

    async setSelectedStore(storeId) {
      logger.info('Manual store selection:', storeId)
      
      const store = this.stores.find(s => s.id === storeId)
      if (store) {
        this.selectedStore = storeId
        localStorage.setItem('selectedStore', storeId)
      } else {
        logger.warn('Store not found for ID:', storeId)
      }
    },

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

    clearSelections() {
      logger.info('Clearing all selections')
      this.selectedCustomer = null
      this.selectedStore = null
      this.selectedCashier = null
      this.stores = []
      this.cashRegisters = []
      localStorage.removeItem('selectedCustomer')
      localStorage.removeItem('selectedStore')
      localStorage.removeItem('selectedCashier')
      localStorage.removeItem('companyId')
    }
  }
})
