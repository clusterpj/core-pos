import { defineStore } from 'pinia'
import { posApi } from '../services/api/pos-api'
import { useCompanyStore } from './company'
import { logger } from '../utils/logger'

export const usePosStore = defineStore('pos', {
  state: () => ({
    // Loading States
    loading: {
      categories: false,
      products: false,
      stores: false,
      cashiers: false,
      employees: false
    },
    error: null,

    // Product Data
    categories: [],
    products: [],
    selectedCategory: 'all',
    searchQuery: '',
    currentPage: 1,
    itemsPerPage: 20,
    totalItems: 0,

    // Store Data
    stores: [],
    cashiers: [],
    employees: []
  }),

  getters: {
    // Format categories for display in UI components
    categoriesForDisplay: (state) => {
      return (state.categories || []).map(category => ({
        id: category.item_category_id,
        name: category.name,
        value: category.item_category_id
      }))
    },

    // Format stores for display
    storesForDisplay: (state) => {
      return (state.stores || []).map(store => ({
        title: store.name,
        value: store.id
      }))
    },

    // Format cashiers for display
    cashiersForDisplay: (state) => {
      return (state.cashiers || []).map(cashier => ({
        title: cashier.name,
        value: cashier.id
      }))
    },

    // Format employees for display
    employeesForDisplay: (state) => {
      return (state.employees || []).map(employee => ({
        title: employee.name,
        value: employee.id
      }))
    },

    // Check if the POS system is ready for use
    systemReady: (state) => {
      const companyStore = useCompanyStore()
      return companyStore.isConfigured
    }
  },

  actions: {
    // Initialize the POS store
    async initialize() {
      logger.startGroup('POS Store: Initialize')
      try {
        const companyStore = useCompanyStore()
        
        // First ensure company store is initialized
        await companyStore.initializeStore()
        
        // Then fetch our categories and products
        await this.fetchCategories()
        
        logger.info('POS Store initialized successfully')
      } catch (error) {
        logger.error('Failed to initialize POS store', error)
        throw error
      } finally {
        logger.endGroup()
      }
    },

    // Product Category Management
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

    // Product Management
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
          store_id: companyStore.selectedStore,
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

    // Search and Filter Actions
    setCategory(categoryId) {
      this.selectedCategory = categoryId
      this.currentPage = 1 // Reset to first page
      this.fetchProducts()
    },

    setSearchQuery(query) {
      this.searchQuery = query
      this.currentPage = 1 // Reset to first page
      this.fetchProducts()
    },

    setPage(page) {
      this.currentPage = page
      this.fetchProducts()
    },

    // Store Management
    setStore(storeId) {
      const companyStore = useCompanyStore()
      companyStore.setSelectedStore(storeId)
    },

    setCashier(cashierId) {
      const companyStore = useCompanyStore()
      companyStore.setselectedCashier(cashierId)
    },

    setEmployee(employeeId) {
      // TODO: Implement employee selection logic
      logger.info('Setting employee:', employeeId)
    },

    // Reset store state
    resetState() {
      this.categories = []
      this.products = []
      this.selectedCategory = 'all'
      this.searchQuery = ''
      this.currentPage = 1
      this.totalItems = 0
      this.error = null
    }
  }
})
