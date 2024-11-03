import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useCartStore } from './cart-store'
import { usePosApi } from '../services/api/pos-api'
import { usePosOperations } from '../services/api/pos-operations'
import { useCompanyStore } from './company'
import { logger } from '../utils/logger'

export const usePosStore = defineStore('pos', () => {
  const cartStore = useCartStore()
  const companyStore = useCompanyStore()
  const posApi = usePosApi()
  const posOperations = usePosOperations()

  // State
  const loading = ref({
    categories: false,
    products: false,
    stores: false,
    cashiers: false,
    employees: false,
    itemOperation: false,
    holdInvoices: false,
    conversion: false
  })
  const error = ref(null)
  const categories = ref([])
  const products = ref([])
  const selectedCategory = ref('all')
  const searchQuery = ref('')
  const currentPage = ref(1)
  const itemsPerPage = ref(20)
  const totalItems = ref(0)
  const stores = ref([])
  const cashiers = ref([])
  const employees = ref([])
  const holdInvoices = ref([])
  const activeOrderType = ref(null)
  const selectedTable = ref(null)
  const orderReference = ref('')
  const customerInfo = ref(null)
  const isTableMode = ref(false)

  // Getters
  const hasActiveOrder = computed(() => {
    return cartStore.items.length > 0
  })

  const canPlaceOrder = computed(() => {
    return hasActiveOrder.value && activeOrderType.value
  })

  const categoriesForDisplay = computed(() => {
    return [
      { id: 'all', name: 'All Categories', value: 'all' },
      ...(categories.value || []).map(category => ({
        id: category.item_category_id,
        name: category.name,
        value: category.item_category_id
      }))
    ]
  })

  const systemReady = computed(() => {
    return companyStore.isConfigured
  })

  const setupMessage = computed(() => {
    if (!companyStore.selectedCustomer) return 'Please select a customer'
    if (!companyStore.selectedStore) return 'Please select a store'
    if (!companyStore.selectedCashier) return 'Please select a cash register'
    return ''
  })

  // Actions
  const initialize = async () => {
    logger.startGroup('POS Store: Initialize')
    try {
      await companyStore.initializeStore()
      await fetchCategories()
      await fetchHoldInvoices()
      logger.info('POS Store initialized successfully')
    } catch (error) {
      logger.error('Failed to initialize POS store', error)
      throw error
    } finally {
      logger.endGroup()
    }
  }

  const setOrderType = (type) => {
    activeOrderType.value = type
  }

  const setTableSelection = (table) => {
    selectedTable.value = table
  }

  const setOrderReference = (reference) => {
    orderReference.value = reference
  }

  const setCustomerInfo = (info) => {
    customerInfo.value = info
  }

  const toggleTableMode = (value) => {
    isTableMode.value = value
  }

  const setCategory = async (categoryId) => {
    selectedCategory.value = categoryId
    currentPage.value = 1
    await fetchProducts()
  }

  const fetchCategories = async () => {
    if (!companyStore.isConfigured) {
      logger.warn('Company configuration incomplete, skipping categories fetch')
      return
    }

    logger.startGroup('POS Store: Fetch Categories')
    loading.value.categories = true
    error.value = null
    
    try {
      const response = await posApi.getItemCategories()
      
      if (response.success) {
        categories.value = Array.isArray(response.data) ? response.data : []
        logger.info(`Loaded ${categories.value.length} categories`)
        
        if (categories.value.length > 0) {
          logger.info('Categories loaded, fetching products')
          await fetchProducts()
        } else {
          logger.warn('No categories available')
        }
      } else {
        logger.warn('Failed to load categories', response.error)
        categories.value = []
      }
    } catch (error) {
      logger.error('Failed to fetch categories', error)
      error.value = error.message || 'Failed to load categories'
      categories.value = []
    } finally {
      loading.value.categories = false
      logger.endGroup()
    }
  }

  const fetchProducts = async () => {
    if (!companyStore.isConfigured) {
      logger.warn('Company configuration incomplete, skipping products fetch')
      return
    }

    logger.startGroup('POS Store: Fetch Products')
    loading.value.products = true
    error.value = null
    
    try {
      const categoryIds = selectedCategory.value === 'all'
        ? categories.value.map(c => c.item_category_id)
        : [selectedCategory.value]

      const params = {
        search: searchQuery.value,
        categories_id: categoryIds,
        avalara_bool: false,
        is_pos: 1,
        id: companyStore.selectedStore,
        limit: itemsPerPage.value,
        page: currentPage.value
      }

      logger.debug('Fetch products params', params)
      const response = await posApi.getItems(params)
      
      if (response.items?.data) {
        products.value = Array.isArray(response.items.data) ? response.items.data : []
        totalItems.value = response.itemTotalCount || 0
        logger.info(`Loaded ${products.value.length} products`)
      } else {
        logger.warn('No products data in response', response)
        products.value = []
        totalItems.value = 0
      }
    } catch (error) {
      logger.error('Failed to fetch products', error)
      error.value = error.message || 'Failed to load products'
      products.value = []
      totalItems.value = 0
    } finally {
      loading.value.products = false
      logger.endGroup()
    }
  }

  const fetchHoldInvoices = async () => {
    logger.startGroup('POS Store: Fetch Hold Invoices')
    loading.value.holdInvoices = true
    error.value = null
    
    try {
      const response = await posApi.holdInvoice.getAll()
      logger.debug('Hold invoices response:', response)

      if (response?.data?.hold_invoices?.data) {
        holdInvoices.value = response.data.hold_invoices.data
        logger.info(`Loaded ${holdInvoices.value.length} hold invoices`)
        return
      }

      logger.warn('Invalid hold invoices response format:', response)
      holdInvoices.value = []
    } catch (error) {
      logger.error('Failed to fetch hold invoices', error)
      error.value = error.message || 'Failed to fetch hold invoices'
      holdInvoices.value = []
    } finally {
      loading.value.holdInvoices = false
      logger.endGroup()
    }
  }

  const holdOrder = async (orderData) => {
    logger.startGroup('POS Store: Hold Order')
    loading.value.holdInvoices = true
    error.value = null
    
    try {
      logger.debug('Hold order request data:', orderData)

      const response = await posApi.holdInvoice.create(orderData)
      logger.debug('Hold order API response:', response)

      if (response.success || response.id) {
        logger.info('Order created successfully:', response)
        await fetchHoldInvoices()
        return { success: true, data: response }
      }

      const errorMessage = response.message || 'Failed to hold order'
      logger.error('Hold order failed:', {
        message: errorMessage,
        response
      })
      throw new Error(errorMessage)

    } catch (error) {
      logger.error('Hold order error:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      })

      error.value = error.message
      throw error
    } finally {
      loading.value.holdInvoices = false
      logger.endGroup()
    }
  }

  const deleteHoldInvoice = async (id) => {
    logger.startGroup('POS Store: Delete Hold Invoice')
    loading.value.holdInvoices = true
    error.value = null
    
    try {
      const response = await posApi.holdInvoice.delete(id)
      if (response.success) {
        holdInvoices.value = holdInvoices.value.filter(invoice => invoice.id !== id)
        return { success: true }
      } else {
        throw new Error(response.message || 'Failed to delete hold invoice')
      }
    } catch (error) {
      logger.error('Failed to delete hold invoice', error)
      error.value = error.message
      throw error
    } finally {
      loading.value.holdInvoices = false
      logger.endGroup()
    }
  }

  const resetOrder = () => {
    cartStore.clearCart()
    activeOrderType.value = null
    selectedTable.value = null
    orderReference.value = ''
    customerInfo.value = null
  }

  const resetState = () => {
    categories.value = []
    products.value = []
    selectedCategory.value = 'all'
    searchQuery.value = ''
    currentPage.value = 1
    totalItems.value = 0
    error.value = null
    holdInvoices.value = []
  }

  return {
    // State
    loading,
    error,
    categories,
    products,
    selectedCategory,
    searchQuery,
    currentPage,
    itemsPerPage,
    totalItems,
    stores,
    cashiers,
    employees,
    holdInvoices,
    activeOrderType,
    selectedTable,
    orderReference,
    customerInfo,
    isTableMode,

    // Getters
    hasActiveOrder,
    canPlaceOrder,
    categoriesForDisplay,
    systemReady,
    setupMessage,

    // Actions
    initialize,
    setOrderType,
    setTableSelection,
    setOrderReference,
    setCustomerInfo,
    toggleTableMode,
    setCategory,
    fetchCategories,
    fetchProducts,
    fetchHoldInvoices,
    holdOrder,
    deleteHoldInvoice,
    resetOrder,
    resetState
  }
})
