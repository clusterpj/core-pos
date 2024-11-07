import { ref, computed } from 'vue'
import { usePosStore } from '../../../../../stores/pos-store'
import { useCartStore } from '../../../../../stores/cart-store'
import { storeToRefs } from 'pinia'
import { logger } from '../../../../../utils/logger'
import { OrderType } from '../../../../../types/order'
import { usePayment } from '../../../composables/usePayment'
import { 
  formatDate, 
  formatCurrency, 
  getOrderType, 
  getOrderTypeColor 
} from '../utils/formatters'
import { convertHeldOrderToInvoice } from '../utils/invoiceConverter'
import { parseOrderNotes } from '../../../../../stores/cart/helpers'

export function useHeldOrders() {
  const posStore = usePosStore()
  const cartStore = useCartStore()
  const { holdInvoices, holdInvoiceSettings } = storeToRefs(posStore)
  const { fetchPaymentMethods } = usePayment()

  // State
  const loading = ref(false)
  const loadingOrder = ref(null)
  const deletingOrder = ref(null)
  const convertingOrder = ref(null)
  const search = ref('')
  const selectedType = ref('ALL')
  const showPaymentDialog = ref(false)
  const currentInvoice = ref(null)

  // Order type options for filter
  const orderTypes = [
    { title: 'All Orders', value: 'ALL' },
    { title: 'Dine In', value: OrderType.DINE_IN },
    { title: 'To Go', value: OrderType.TO_GO },
    { title: 'Delivery', value: OrderType.DELIVERY },
    { title: 'Pickup', value: OrderType.PICKUP }
  ]

  // Filter invoices based on search and type
  const filteredInvoices = computed(() => {
    let filtered = holdInvoices.value

    // Apply type filter
    if (selectedType.value !== 'ALL') {
      filtered = filtered.filter(invoice => invoice.type === selectedType.value)
    }

    // Apply search filter
    if (search.value) {
      const searchTerm = search.value.toLowerCase()
      filtered = filtered.filter(invoice => 
        invoice.description?.toLowerCase().includes(searchTerm) ||
        invoice.id?.toString().includes(searchTerm)
      )
    }

    return filtered
  })

  // Handle payment completion
  const handlePaymentComplete = async (paymentResult) => {
    console.log('Payment completion handler called with result:', paymentResult)
    
    try {
      logger.info('Payment completed successfully:', paymentResult)
      
      if (!currentInvoice.value?.hold_invoice_id) {
        throw new Error('Missing hold invoice ID')
      }
      
      // Delete the held order
      const deleteResponse = await posStore.deleteHoldInvoice(currentInvoice.value.hold_invoice_id)
      console.log('Delete held order response:', deleteResponse)
      
      if (!deleteResponse.success) {
        throw new Error(deleteResponse.message || 'Failed to delete hold invoice')
      }
      
      // Show success message
      window.toastr?.['success']('Payment processed successfully')
      
      // Reset state
      currentInvoice.value = null
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
      
      // Convert the order to invoice
      const result = await convertHeldOrderToInvoice(invoice)
      
      if (result.success) {
        // Get payment methods
        console.log('Fetching payment methods')
        await fetchPaymentMethods()

        // Show payment dialog
        console.log('Setting up payment dialog')
        currentInvoice.value = result.invoice
        showPaymentDialog.value = true
      }
      
      return result
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
      cartStore.setHoldInvoiceId(invoice.id)
      cartStore.setHoldOrderDescription(invoice.description || `Order #${invoice.id}`)

      logger.info('Order loaded successfully:', invoice.id)
      return true
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

  return {
    // State
    loading,
    loadingOrder,
    deletingOrder,
    convertingOrder,
    search,
    selectedType,
    orderTypes,
    holdInvoices,
    filteredInvoices,
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
