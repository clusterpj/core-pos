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
    hasselectedCashier: (state) => !!state.selectedCashier,
    
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

    storesForDisplay: (state) => {
      return (state.stores || []).map(store => ({
        title: store.name,
        value: store.id,
        description: store.description,
        subtitle: store.company_name
      }))
    },

    cashRegistersForDisplay: (state) => {
      return (state.cashRegisters || []).map(register => ({
        title: register.name,
        value: register.id,
        description: register.description,
        storeName: register.store_name
      }))
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

    async setSelectedCustomer(customerId) {
      logger.info('Setting selected customer:', customerId)
      this.selectedCustomer = customerId
      
      const customer = this.customers.find(c => c.id === customerId)
      if (customer) {
        logger.debug('Found customer:', customer)
        localStorage.setItem('companyId', customer.company_id)
      } else {
        logger.warn('Customer not found for ID:', customerId)
      }
      
      // Reset dependent selections
      this.selectedStore = null
      this.selectedCashier = null
      this.stores = []
      this.cashRegisters = []
      
      localStorage.setItem('selectedCustomer', customerId)
      
      // Only fetch stores if explicitly requested
      await this.fetchStores()
    },

    async fetchStores() {
      if (!this.selectedCustomer) {
        logger.warn('No customer selected, skipping store fetch')
        return
      }

      logger.startGroup('Company Store: Fetch Stores')
      this.loadingStores = true
      this.storeError = null

      try {
        const customer = this.customers.find(c => c.id === this.selectedCustomer)
        if (!customer) {
          throw new Error('Selected customer not found')
        }

        logger.debug('Fetching stores for company:', customer.company_id)

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
            company: customer.company_id
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

    async setSelectedStore(storeId) {
      logger.info('Setting selected store:', storeId)
      this.selectedStore = storeId
      
      // Reset dependent selections
      this.selectedCashier = null
      this.cashRegisters = []
      
      localStorage.setItem('selectedStore', storeId)
      
      // Only fetch registers if explicitly requested
      await this.fetchCashRegisters()
    },

    async fetchCashRegisters() {
      if (!this.selectedStore) {
        logger.warn('No store selected, skipping cash register fetch')
        return
      }

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
          let registers = response.data.data || []
          
          // Filter registers for current store
          registers = registers.filter(register => register.store_id === this.selectedStore)
          
          this.cashRegisters = registers
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

    setselectedCashier(registerId) {
      logger.info('Setting selected cash register:', registerId)
      this.selectedCashier = registerId
      localStorage.setItem('selectedCashier', registerId)
    },

    async initializeStore() {
      logger.startGroup('Company Store: Initialize')
      try {
        // Only fetch customers initially
        await this.fetchCustomers()
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
