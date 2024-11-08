import { ref, computed } from 'vue'
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
      logger.debug('Loading order:', invoice)
      
      // Clear current cart
      cartStore.clearCart()
      
      // Add each hold item to cart
      if (!Array.isArray(invoice.hold_items)) {
        throw new Error('Invalid invoice: missing items')
      }

      invoice.hold_items.forEach(item => {
        if (!item.item_id || !item.name) {
          throw new Error('Invalid item data: missing required fields')
        }

        cartStore.addItem(
          {
            id: item.item_id,
            name: item.name,
            description: item.description,
            price: item.price,
            unit_name: item.unit_name
          },
          Number(item.quantity)
        )
      })

      // Set other cart properties
      if (invoice.discount_type && invoice.discount) {
        cartStore.setDiscount(
          invoice.discount_type,
          Number(invoice.discount)
        )
      }
      
      if (invoice.tip_type && invoice.tip) {
        cartStore.setTip(
          invoice.tip_type,
          Number(invoice.tip)
        )
      }

      // Set order type directly
      if (invoice.type) {
        cartStore.setType(invoice.type)
      }

      // Parse customer notes from notes field
      if (invoice.notes) {
        try {
          const notesObj = JSON.parse(invoice.notes)
          const customerNotes = parseOrderNotes(invoice.notes)

          // Create new notes object with only customer info and notes
          const newNotes = {
            orderInfo: {
              customer: notesObj.orderInfo?.customer || notesObj.customer || {}
            },
            customerNotes: customerNotes
          }

          // Set the notes in cart store
          cartStore.setNotes(JSON.stringify(newNotes))
        } catch (e) {
          logger.warn('Failed to parse notes, setting as is:', e)
          cartStore.setNotes(invoice.notes)
        }
      }

      // Set the hold invoice ID and description in cart store
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
