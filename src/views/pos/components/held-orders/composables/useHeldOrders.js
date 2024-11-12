import { ref, computed, onMounted } from 'vue'
import { usePosStore } from '../../../../../stores/pos-store'
import { useCartStore } from '../../../../../stores/cart-store'
import { storeToRefs } from 'pinia'
import { logger } from '../../../../../utils/logger'
import { OrderType, PaidStatus } from '../../../../../types/order'
import { usePayment } from '../../../composables/usePayment'
import { useTableManagement } from '../../../composables/useTableManagement'
import { 
  formatDate, 
  formatCurrency, 
  getOrderType, 
  getOrderTypeColor 
} from '../utils/formatters'
import { parseOrderNotes } from '../../../../../stores/cart/helpers'

const HISTORY_STORAGE_KEY = 'core_pos_order_history'

export function useHeldOrders() {
  const posStore = usePosStore()
  const cartStore = useCartStore()
  const { holdInvoices, holdInvoiceSettings } = storeToRefs(posStore)
  const { fetchPaymentMethods } = usePayment()
  const { releaseTablesAfterPayment } = useTableManagement()

  // State
  const loading = ref(false)
  const loadingOrder = ref(null)
  const deletingOrder = ref(null)
  const convertingOrder = ref(null)
  const search = ref('')
  const selectedType = ref('ALL')
  const selectedStatus = ref('ALL')
  const showPaymentDialog = ref(false)
  const currentInvoice = ref(null)
  const originalHoldInvoice = ref(null)
  const orderHistory = ref([])

  // Initialize order history from localStorage
  const initializeOrderHistory = () => {
    try {
      const storedHistory = localStorage.getItem(HISTORY_STORAGE_KEY)
      if (storedHistory) {
        orderHistory.value = JSON.parse(storedHistory)
        logger.info('Initialized order history from localStorage:', orderHistory.value.length)
      }
    } catch (error) {
      logger.error('Failed to initialize order history from localStorage:', error)
    }
  }

  // Persist order history to localStorage
  const persistOrderHistory = () => {
    try {
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(orderHistory.value))
      logger.debug('Persisted order history to localStorage')
    } catch (error) {
      logger.error('Failed to persist order history to localStorage:', error)
    }
  }

  // Order type options for filter
  const orderTypes = [
    { title: 'All Orders', value: 'ALL' },
    { title: 'Dine In', value: OrderType.DINE_IN },
    { title: 'To Go', value: OrderType.TO_GO },
    { title: 'Delivery', value: OrderType.DELIVERY },
    { title: 'Pickup', value: OrderType.PICKUP }
  ]

  // Move paid order to history
  const moveToHistory = async (invoice) => {
    try {
      // Create a copy of the invoice without table information
      const historicalOrder = {
        ...invoice,
        tables_selected: [],
        hold_tables: [],
        paid_status: PaidStatus.PAID,
        paid_at: new Date().toISOString()
      }

      // Add to history
      orderHistory.value.unshift(historicalOrder)
      persistOrderHistory() // Persist after adding to history

      // Delete the original order
      await deleteOrder(invoice.id)

      // Release the tables
      if (invoice.tables_selected?.length) {
        await releaseTablesAfterPayment(invoice.tables_selected)
      }
      if (invoice.hold_tables?.length) {
        await releaseTablesAfterPayment(invoice.hold_tables)
      }

      return true
    } catch (error) {
      logger.error('Failed to move order to history:', error)
      return false
    }
  }

  // Handle payment completion
  const handlePaymentComplete = async (paymentResult) => {
    console.log('Payment completion handler called with result:', paymentResult)
    
    try {
      logger.info('Payment completed successfully:', paymentResult)
      
      if (!originalHoldInvoice.value?.id) {
        throw new Error('Original hold invoice not found')
      }

      // Move the order to history
      const success = await moveToHistory(originalHoldInvoice.value)
      
      if (!success) {
        throw new Error('Failed to move order to history')
      }
      
      // Show success message
      window.toastr?.['success']('Payment processed successfully')
      
      // Reset state
      currentInvoice.value = null
      originalHoldInvoice.value = null
      showPaymentDialog.value = false
      
      return true
    } catch (error) {
      console.error('Failed to complete payment process:', error)
      logger.error('Failed to complete payment process:', error)
      window.toastr?.['error']('Failed to complete payment process')
      return false
    }
  }

  // Convert to invoice
  const convertToInvoice = async (invoice) => {
    try {
      if (!invoice?.id) {
        throw new Error('Invalid invoice: missing ID')
      }

      convertingOrder.value = invoice.id
      originalHoldInvoice.value = invoice // Store the original hold invoice
      
      // Get payment methods before showing dialog
      console.log('Fetching payment methods')
      await fetchPaymentMethods()

      // Show payment dialog directly with held order data
      console.log('Setting up payment dialog')
      currentInvoice.value = {
        invoice: invoice,
        invoicePrefix: invoice.invoice_prefix || 'INV',
        nextInvoiceNumber: invoice.id
      }
      showPaymentDialog.value = true
      
      return { success: true }
    } catch (error) {
      console.error('Failed to prepare for payment:', error)
      logger.error('Failed to prepare for payment:', error)
      window.toastr?.['error'](error.message || 'Failed to prepare for payment')
      return {
        success: false,
        error: error.message
      }
    } finally {
      convertingOrder.value = null
    }
  }

  // Load order
  const loadOrder = async (invoice) => {
    try {
      if (!invoice?.id) {
        throw new Error('Invalid invoice: missing ID')
      }

      loadingOrder.value = invoice.id
      logger.startGroup('Loading held order')
      logger.debug('Loading order details:', {
        id: invoice.id,
        description: invoice.description,
        type: invoice.type,
        itemCount: invoice.hold_items?.length
      })
      
      // Clear current cart first
      await cartStore.clearCart()
      logger.debug('Cart cleared successfully')
      
      // Validate items array
      if (!Array.isArray(invoice.hold_items)) {
        throw new Error('Invalid invoice: missing items array')
      }

      // Load items into cart
      logger.debug(`Processing ${invoice.hold_items.length} items`)
      for (const item of invoice.hold_items) {
        // Validate item data
        if (!item.item_id || !item.name) {
          logger.error('Invalid item data:', item)
          throw new Error(`Invalid item data: missing required fields for item ${item.name || 'unknown'}`)
        }

        const product = {
          id: item.item_id,
          name: item.name,
          description: item.description,
          price: item.price,
          unit_name: item.unit_name
        }

        logger.debug('Adding item to cart:', {
          productId: product.id,
          name: product.name,
          quantity: item.quantity
        })

        try {
          await cartStore.addItem(product, Number(item.quantity))
        } catch (error) {
          logger.error('Failed to add item to cart:', {
            error: error.message,
            item: product
          })
          throw new Error(`Failed to add item ${product.name} to cart: ${error.message}`)
        }
      }

      // Set cart properties
      logger.debug('Setting cart properties')
      
      try {
        // Set discount if present
        if (invoice.discount_type && invoice.discount) {
          logger.debug('Setting discount:', {
            type: invoice.discount_type,
            amount: invoice.discount
          })
          await cartStore.setDiscount(
            invoice.discount_type,
            Number(invoice.discount)
          )
        }
        
        // Set tip if present
        if (invoice.tip_type && invoice.tip) {
          logger.debug('Setting tip:', {
            type: invoice.tip_type,
            amount: invoice.tip
          })
          await cartStore.setTip(
            invoice.tip_type,
            Number(invoice.tip)
          )
        }

        // Set order type
        if (invoice.type) {
          logger.debug('Setting order type:', invoice.type)
          await cartStore.setType(invoice.type)
        }

        // Handle notes
        if (invoice.notes) {
          logger.debug('Processing order notes')
          try {
            const notesObj = JSON.parse(invoice.notes)
            const customerNotes = parseOrderNotes(invoice.notes)

            const newNotes = {
              orderInfo: {
                customer: notesObj.orderInfo?.customer || notesObj.customer || {}
              },
              customerNotes: customerNotes
            }

            logger.debug('Setting parsed notes:', newNotes)
            await cartStore.setNotes(JSON.stringify(newNotes))
          } catch (e) {
            logger.warn('Failed to parse notes, using raw value:', e)
            await cartStore.setNotes(invoice.notes)
          }
        }

        // Set hold invoice ID and description last
        logger.debug('Setting hold invoice reference:', {
          id: invoice.id,
          description: invoice.description
        })
        
        await cartStore.setHoldInvoiceId(invoice.id)
        await cartStore.setHoldInvoiceDescription(invoice.description)
        
        logger.info('Order loaded successfully:', {
          id: invoice.id,
          description: invoice.description,
          type: invoice.type,
          itemCount: invoice.hold_items.length
        })
        
        return true
      } catch (error) {
        logger.error('Failed to set cart properties:', error)
        throw new Error(`Failed to set cart properties: ${error.message}`)
      }
    } catch (error) {
      logger.error('Failed to load order:', error)
      window.toastr?.['error'](error.message || 'Failed to load order')
      return false
    } finally {
      loadingOrder.value = null
    }
  }

  // Delete order
  const deleteOrder = async (invoiceId) => {
    try {
      if (!invoiceId) {
        throw new Error('Invalid invoice ID')
      }

      deletingOrder.value = invoiceId
      logger.debug('Deleting hold invoice:', invoiceId)
      
      const response = await posStore.deleteHoldInvoice(invoiceId)
      
      if (!response.success) {
        throw new Error(response.message || 'Failed to delete order')
      }

      window.toastr?.['success']('Order deleted successfully')
      return true
    } catch (error) {
      logger.error('Failed to delete order:', error)
      window.toastr?.['error'](error.message || 'Failed to delete order')
      return false
    } finally {
      deletingOrder.value = null
    }
  }

  // Fetch held orders
  const fetchHoldInvoices = async () => {
    try {
      loading.value = true
      await posStore.fetchHoldInvoices()
    } catch (error) {
      logger.error('Failed to fetch hold invoices:', error)
      window.toastr?.['error']('Failed to fetch hold invoices')
    } finally {
      loading.value = false
    }
  }

  // Initialize on mount
  onMounted(() => {
    initializeOrderHistory()
  })

  return {
    // State
    loading,
    loadingOrder,
    deletingOrder,
    convertingOrder,
    search,
    selectedType,
    selectedStatus,
    orderTypes,
    holdInvoices,
    orderHistory,
    filteredInvoices: computed(() => holdInvoices.value),
    showPaymentDialog,
    currentInvoice,

    // Formatters
    getOrderType,
    getOrderTypeColor,
    formatDate,
    formatCurrency,

    // Actions
    convertToInvoice,
    loadOrder,
    deleteOrder,
    fetchHoldInvoices,
    handlePaymentComplete
  }
}
