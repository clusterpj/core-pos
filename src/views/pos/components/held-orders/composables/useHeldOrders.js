import { ref, computed } from 'vue'
import { usePosStore } from '../../../../../stores/pos-store'
import { useCartStore } from '../../../../../stores/cart-store'
import { storeToRefs } from 'pinia'
import { logger } from '../../../../../utils/logger'
import { ORDER_TYPES } from '../../../composables/useOrderType'

export function useHeldOrders() {
  const posStore = usePosStore()
  const cartStore = useCartStore()
  const { holdInvoices } = storeToRefs(posStore)

  const loading = ref(false)
  const loadingOrder = ref(null)
  const deletingOrder = ref(null)
  const convertingOrder = ref(null)
  const search = ref('')
  const selectedType = ref('ALL')

  // Order type options for filter
  const orderTypes = [
    { title: 'All Orders', value: 'ALL' },
    { title: 'Dine In', value: ORDER_TYPES.DINE_IN },
    { title: 'To Go', value: ORDER_TYPES.TO_GO },
    { title: 'Delivery', value: ORDER_TYPES.DELIVERY },
    { title: 'Pickup', value: ORDER_TYPES.PICKUP }
  ]

  // Get order type from invoice
  const getOrderType = (invoice) => {
    try {
      if (invoice.notes) {
        const orderInfo = JSON.parse(invoice.notes)
        return orderInfo.type || 'UNKNOWN'
      }
    } catch (err) {
      logger.error('Failed to parse order type:', err)
    }
    return 'UNKNOWN'
  }

  // Get color for order type chip
  const getOrderTypeColor = (type) => {
    const colors = {
      [ORDER_TYPES.DINE_IN]: 'primary',
      [ORDER_TYPES.TO_GO]: 'success',
      [ORDER_TYPES.DELIVERY]: 'warning',
      [ORDER_TYPES.PICKUP]: 'info',
      'UNKNOWN': 'grey'
    }
    return colors[type] || 'grey'
  }

  // Filter invoices based on search and type
  const filteredInvoices = computed(() => {
    let filtered = holdInvoices.value

    // Apply type filter
    if (selectedType.value !== 'ALL') {
      filtered = filtered.filter(invoice => getOrderType(invoice) === selectedType.value)
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

  // Format date
  const formatDate = (date) => {
    return new Date(date).toLocaleDateString()
  }

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  // Convert to invoice
  const convertToInvoice = async (invoice) => {
    try {
      convertingOrder.value = invoice.id
      logger.debug('Converting order to invoice:', invoice)
      
      // Clear current cart
      cartStore.clearCart()
      
      // Add each hold item to cart
      invoice.hold_items?.forEach(item => {
        cartStore.addItem({
          id: item.item_id,
          name: item.name,
          description: item.description,
          price: item.price, // Price is already in cents from API
          unit_name: item.unit_name,
          quantity: Number(item.quantity)
        })
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

      if (invoice.notes) {
        cartStore.setNotes(invoice.notes)
      }

      // Create invoice
      await cartStore.createInvoice()
      
      // Delete the held order after successful conversion
      await posStore.deleteHoldInvoice(invoice.id)
      
      // Show success message
      window.toastr?.['success']('Order converted to invoice successfully')
      
      logger.info('Order converted to invoice successfully:', invoice.id)
      return true
    } catch (error) {
      logger.error('Failed to convert order to invoice:', error)
      window.toastr?.['error']('Failed to convert order to invoice')
      return false
    } finally {
      convertingOrder.value = null
    }
  }

  // Load order
  const loadOrder = async (invoice) => {
    try {
      loadingOrder.value = invoice.id
      logger.debug('Loading order:', invoice)
      
      // Clear current cart
      cartStore.clearCart()
      
      // Add each hold item to cart
      invoice.hold_items?.forEach(item => {
        cartStore.addItem({
          id: item.item_id,
          name: item.name,
          description: item.description,
          price: item.price, // Price is already in cents from API
          unit_name: item.unit_name,
          quantity: Number(item.quantity)
        })
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

      if (invoice.notes) {
        cartStore.setNotes(invoice.notes)
      }

      // Set the hold invoice ID and description in cart store
      cartStore.setHoldInvoiceId(invoice.id)
      cartStore.setHoldOrderDescription(invoice.description || `Order #${invoice.id}`)

      logger.info('Order loaded successfully:', invoice.id)
      return true
    } catch (error) {
      logger.error('Failed to load order:', error)
      window.toastr?.['error']('Failed to load order')
      return false
    } finally {
      loadingOrder.value = null
    }
  }

  // Delete order
  const deleteOrder = async (invoiceId) => {
    try {
      deletingOrder.value = invoiceId
      
      const response = await posStore.deleteHoldInvoice(invoiceId)
      
      if (response.success) {
        // Show success message
        window.toastr?.['success']('Order deleted successfully')
        return true
      } else {
        throw new Error(response.message || 'Failed to delete order')
      }
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
    } finally {
      loading.value = false
    }
  }

  return {
    loading,
    loadingOrder,
    deletingOrder,
    convertingOrder,
    search,
    selectedType,
    orderTypes,
    holdInvoices,
    filteredInvoices,
    getOrderType,
    getOrderTypeColor,
    formatDate,
    formatCurrency,
    convertToInvoice,
    loadOrder,
    deleteOrder,
    fetchHoldInvoices
  }
}
