import { ref, computed } from 'vue'
import { usePosStore } from '../../../../../stores/pos-store'
import { useCartStore } from '../../../../../stores/cart-store'
import { storeToRefs } from 'pinia'
import { logger } from '../../../../../utils/logger'
import { ORDER_TYPES } from '../../../composables/useOrderType'
import { posApi } from '../../../../../services/api/pos-api'
import { usePayment } from '../../../composables/usePayment'

export function useHeldOrders() {
  const posStore = usePosStore()
  const cartStore = useCartStore()
  const { holdInvoices, holdInvoiceSettings } = storeToRefs(posStore)
  const { fetchPaymentMethods } = usePayment()

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

  // Format date for API (YYYY-MM-DD)
  const formatApiDate = (date) => {
    return date.toISOString().split('T')[0]
  }

  // Format date for display
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

  // Convert decimal to cents (biginteger)
  const toCents = (amount) => {
    if (!amount) return 0
    return Math.round(parseFloat(amount) * 100)
  }

  // Validate invoice data before API call
  const validateInvoiceData = (data) => {
    const requiredFields = [
      'invoice_number',
      'invoice_date',
      'due_date',
      'total',
      'sub_total',
      'items'
    ]

    const missingFields = requiredFields.filter(field => !data[field])
    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`)
    }

    if (!Array.isArray(data.items) || data.items.length === 0) {
      throw new Error('Invoice must have at least one item')
    }

    // Validate items
    data.items.forEach((item, index) => {
      if (!item.id || !item.name || !item.price || !item.quantity) {
        throw new Error(`Invalid item data at index ${index}`)
      }
    })

    return true
  }

  // Handle payment completion
  const handlePaymentComplete = async (paymentResult) => {
    try {
      logger.info('Payment completed successfully:', paymentResult)
      
      if (!currentInvoice.value?.hold_invoice_id) {
        throw new Error('Missing hold invoice ID')
      }
      
      // Delete the held order
      const deleteResponse = await posStore.deleteHoldInvoice(currentInvoice.value.hold_invoice_id)
      
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
      logger.debug('Converting order to invoice:', invoice)
      
      // 1. Get company settings
      const settings = await posApi.getCompanySettings()
      logger.debug('Company settings:', settings)

      // Validate required settings
      if (!settings.invoice_auto_generate || !settings.invoice_issuance_period) {
        throw new Error('Required company settings are missing')
      }

      // 2. Get next invoice number if auto-generate is enabled
      let invoiceNumber
      if (settings.invoice_auto_generate === 'YES') {
        const nextNumberResponse = await posApi.invoice.getNextNumber()
        logger.debug('Next number response:', nextNumberResponse)

        if (!nextNumberResponse?.invoice_number) {
          throw new Error('Failed to get next invoice number')
        }
        invoiceNumber = nextNumberResponse.invoice_number
      } else {
        throw new Error('Manual invoice number entry is not supported')
      }

      // Calculate dates
      const currentDate = new Date()
      const dueDate = new Date(currentDate)
      dueDate.setDate(dueDate.getDate() + parseInt(settings.invoice_issuance_period || 7))

      // Validate items exist
      if (!Array.isArray(invoice.hold_items) || invoice.hold_items.length === 0) {
        throw new Error('No items found in hold invoice')
      }

      // Format items according to API requirements
      const formattedItems = invoice.hold_items.map(item => {
        if (!item.item_id || !item.name) {
          throw new Error('Invalid item data: missing required fields')
        }
        return {
          id: item.item_id,
          name: item.name,
          description: item.description || null,
          price: toCents(item.price),
          quantity: parseInt(item.quantity),
          unit_name: item.unit_name || 'units',
          discount: item.discount || "0",
          discount_val: toCents(item.discount_val || 0),
          tax: toCents(item.tax || 0),
          total: toCents(item.total),
          sub_total: toCents(item.total),
          allow_taxes: item.allow_taxes || 0,
          no_taxable: item.no_taxable || 0
        }
      })

      // 3. Prepare invoice data according to API requirements
      const invoiceData = {
        // Required boolean flags
        avalara_bool: false,
        banType: true,
        package_bool: false,
        print_pdf: false,
        save_as_draft: false,
        send_email: false,
        not_charge_automatically: false,
        is_hold_invoice: true,
        is_invoice_pos: 1,
        is_pdf_pos: settings.pdf_format_pos === '1',

        // IDs and references
        invoice_number: invoiceNumber,
        invoice_template_id: 1,
        invoice_pbx_modify: 0,
        hold_invoice_id: invoice.id,
        store_id: invoice.store_id,
        cash_register_id: invoice.cash_register_id,
        user_id: invoice.user_id,

        // Dates
        invoice_date: formatApiDate(currentDate),
        due_date: formatApiDate(dueDate),

        // Amounts (in cents)
        sub_total: toCents(invoice.sub_total),
        total: toCents(invoice.total),
        due_amount: toCents(invoice.total),
        tax: toCents(invoice.tax || 0),
        
        // Discount
        discount: invoice.discount || "0",
        discount_type: invoice.discount_type || "fixed",
        discount_val: toCents(invoice.discount_val || 0),
        discount_per_item: settings.discount_per_item || "NO",

        // Tip
        tip: invoice.tip || "0",
        tip_type: invoice.tip_type || "fixed",
        tip_val: toCents(invoice.tip_val || 0),

        // Arrays
        items: formattedItems,
        taxes: invoice.taxes || [],
        packages: [],
        tables_selected: [],

        // Optional fields
        notes: invoice.notes || null,
        description: invoice.description || `Order #${invoice.id}`,
        contact: null // Optional contact information
      }

      // Validate invoice data before sending
      validateInvoiceData(invoiceData)

      logger.debug('Prepared invoice data:', invoiceData)

      // 4. Create the invoice
      const invoiceResponse = await posApi.invoice.create(invoiceData)
      
      if (!invoiceResponse?.invoice?.id) {
        throw new Error('Failed to create invoice: Invalid response')
      }

      // 5. Get created invoice details
      const createdInvoice = await posApi.invoice.getById(invoiceResponse.invoice.id)
      if (!createdInvoice) {
        throw new Error('Failed to fetch created invoice details')
      }

      // 6. Get payment methods
      await fetchPaymentMethods()

      // 7. Show payment dialog
      currentInvoice.value = createdInvoice
      showPaymentDialog.value = true
      
      logger.info('Order converted to invoice successfully:', createdInvoice.id)
      return {
        success: true,
        invoice: createdInvoice
      }
    } catch (error) {
      logger.error('Failed to convert order to invoice:', error)
      window.toastr?.['error'](error.message || 'Failed to convert order to invoice')
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
    fetchHoldInvoices,
    showPaymentDialog,
    currentInvoice,
    handlePaymentComplete
  }
}
