import { defineStore } from 'pinia'
import { posApi } from '../services/api/pos-api'
import { useCompanyStore } from './company'
import { logger } from '../utils/logger'
import apiClient from '../services/api/client'

export const usePosStore = defineStore('pos', {
  state: () => ({
    loading: {
      categories: false,
      products: false,
      stores: false,
      cashiers: false,
      employees: false,
      itemOperation: false,
      holdInvoices: false
    },
    error: null,
    categories: [],
    products: [],
    selectedCategory: 'all',
    searchQuery: '',
    currentPage: 1,
    itemsPerPage: 20,
    totalItems: 0,
    stores: [],
    cashiers: [],
    employees: [],
    holdInvoices: []
  }),

  getters: {
    categoriesForDisplay: (state) => {
      return (state.categories || []).map(category => ({
        id: category.item_category_id,
        name: category.name,
        value: category.item_category_id
      }))
    },

    storesForDisplay: (state) => {
      return (state.stores || []).map(store => ({
        title: store.name,
        value: store.id
      }))
    },

    cashiersForDisplay: (state) => {
      return (state.cashiers || []).map(cashier => ({
        title: cashier.name,
        value: cashier.id
      }))
    },

    employeesForDisplay: (state) => {
      return (state.employees || []).map(employee => ({
        title: employee.name,
        value: employee.id
      }))
    },

    systemReady: (state) => {
      const companyStore = useCompanyStore()
      return companyStore.isConfigured
    },

    setupMessage: () => {
      const companyStore = useCompanyStore()
      if (!companyStore.selectedCustomer) return 'Please select a customer'
      if (!companyStore.selectedStore) return 'Please select a store'
      if (!companyStore.selectedCashier) return 'Please select a cash register'
      return ''
    }
  },

  actions: {
    async initialize() {
      logger.startGroup('POS Store: Initialize')
      try {
        const companyStore = useCompanyStore()
        await companyStore.initializeStore()
        await this.fetchCategories()
        await this.fetchHoldInvoices()
        logger.info('POS Store initialized successfully')
      } catch (error) {
        logger.error('Failed to initialize POS store', error)
        throw error
      } finally {
        logger.endGroup()
      }
    },

    async fetchCategories() {
      const companyStore = useCompanyStore()
      if (!companyStore.isConfigured) {
        logger.warn('Company configuration incomplete, skipping categories fetch')
        return
      }

      logger.startGroup('POS Store: Fetch Categories')
      this.loading.categories = true
      this.error = null
      
      try {
        const response = await posApi.getItemCategories()
        
        if (response.success) {
          this.categories = Array.isArray(response.data) ? response.data : []
          logger.info(`Loaded ${this.categories.length} categories`)
          
          if (this.categories.length > 0) {
            logger.info('Categories loaded, fetching products')
            await this.fetchProducts()
          } else {
            logger.warn('No categories available')
          }
        } else {
          logger.warn('Failed to load categories', response.error)
          this.categories = []
        }
      } catch (error) {
        logger.error('Failed to fetch categories', error)
        this.error = error.message || 'Failed to load categories'
        this.categories = []
      } finally {
        this.loading.categories = false
        logger.endGroup()
      }
    },

    async fetchProducts() {
      const companyStore = useCompanyStore()
      if (!companyStore.isConfigured) {
        logger.warn('Company configuration incomplete, skipping products fetch')
        return
      }

      logger.startGroup('POS Store: Fetch Products')
      this.loading.products = true
      this.error = null
      
      try {
        const categoryIds = this.selectedCategory === 'all'
          ? this.categories.map(c => c.item_category_id)
          : [this.selectedCategory]

        const params = {
          search: this.searchQuery,
          categories_id: categoryIds,
          avalara_bool: false,
          is_pos: 1,
          id: companyStore.selectedStore,
          limit: this.itemsPerPage,
          page: this.currentPage
        }

        logger.debug('Fetch products params', params)
        const response = await posApi.getItems(params)
        
        if (response.items?.data) {
          this.products = Array.isArray(response.items.data) ? response.items.data : []
          this.totalItems = response.itemTotalCount || 0
          logger.info(`Loaded ${this.products.length} products`)
        } else {
          logger.warn('No products data in response', response)
          this.products = []
          this.totalItems = 0
        }
      } catch (error) {
        logger.error('Failed to fetch products', error)
        this.error = error.message || 'Failed to load products'
        this.products = []
        this.totalItems = 0
      } finally {
        this.loading.products = false
        logger.endGroup()
      }
    },

    // Hold Invoice Operations
    async fetchHoldInvoices() {
      logger.startGroup('POS Store: Fetch Hold Invoices')
      this.loading.holdInvoices = true
      this.error = null
      
      try {
        const response = await posApi.holdInvoice.getAll()
        if (response.data?.success && response.data.hold_invoices?.data) {
          this.holdInvoices = response.data.hold_invoices.data
          logger.info(`Loaded ${this.holdInvoices.length} hold invoices`)
        } else {
          throw new Error(response.data?.message || 'Failed to load hold invoices')
        }
      } catch (error) {
        logger.error('Failed to fetch hold invoices', error)
        this.error = error.message
        this.holdInvoices = []
      } finally {
        this.loading.holdInvoices = false
        logger.endGroup()
      }
    },

    async holdOrder(orderData) {
      logger.startGroup('POS Store: Hold Order')
      this.loading.holdInvoices = true
      this.error = null
      
      try {
        const response = await posApi.holdInvoice.create(orderData)
        if (response.data?.success) {
          await this.fetchHoldInvoices()
          return response.data
        } else {
          throw new Error(response.data?.message || 'Failed to hold order')
        }
      } catch (error) {
        logger.error('Failed to hold order', error)
        this.error = error.message || 'Failed to hold order'
        throw error
      } finally {
        this.loading.holdInvoices = false
        logger.endGroup()
      }
    },

    async loadHoldInvoice(id) {
      logger.startGroup('POS Store: Load Hold Invoice')
      this.loading.holdInvoices = true
      this.error = null
      
      try {
        const response = await posApi.holdInvoice.getById(id)
        if (response.data?.success) {
          return response.data
        } else {
          throw new Error(response.data?.message || 'Failed to load hold invoice')
        }
      } catch (error) {
        logger.error('Failed to load hold invoice', error)
        this.error = error.message || 'Failed to load hold invoice'
        throw error
      } finally {
        this.loading.holdInvoices = false
        logger.endGroup()
      }
    },

    async deleteHoldInvoice(id) {
      logger.startGroup('POS Store: Delete Hold Invoice')
      this.loading.holdInvoices = true
      this.error = null
      
      try {
        const response = await apiClient.post('/v1/core-pos/hold-invoice/delete', { id })
        if (response.data?.success) {
          // Remove the deleted invoice from the local state
          this.holdInvoices = this.holdInvoices.filter(invoice => invoice.id !== id)
          return { success: true }
        } else {
          throw new Error(response.data?.message || 'Failed to delete hold invoice')
        }
      } catch (error) {
        logger.error('Failed to delete hold invoice', error)
        this.error = error.message
        throw error
      } finally {
        this.loading.holdInvoices = false
        logger.endGroup()
      }
  
    },

    setCategory(categoryId) {
      this.selectedCategory = categoryId
      this.currentPage = 1
      this.fetchProducts()
    },

    setSearchQuery(query) {
      this.searchQuery = query
      this.currentPage = 1
      this.fetchProducts()
    },

    setPage(page) {
      this.currentPage = page
      this.fetchProducts()
    },

    resetState() {
      this.categories = []
      this.products = []
      this.selectedCategory = 'all'
      this.searchQuery = ''
      this.currentPage = 1
      this.totalItems = 0
      this.error = null
      this.holdInvoices = []
    }
  }
})
