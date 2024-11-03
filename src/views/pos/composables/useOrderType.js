import { ref, computed } from 'vue'
import { useCartStore } from '../../../stores/cart-store'
import { usePosStore } from '../../../stores/pos-store'
import { logger } from '../../../utils/logger'
import { posOperations } from '../../../services/api/pos-operations'

// Order type constants
export const ORDER_TYPES = {
  DINE_IN: 'DINE_IN',
  TO_GO: 'TO_GO',
  DELIVERY: 'DELIVERY',
  PICKUP: 'PICKUP'
}

export function useOrderType() {
  const cartStore = useCartStore()
  const posStore = usePosStore()
  
  // State
  const orderType = ref(null)
  const customerInfo = ref({
    name: '',
    phone: '',
    address: '', // For delivery
    pickupTime: '', // For pickup
    instructions: ''
  })
  const loading = ref(false)
  const error = ref(null)

  // Computed
  const isValid = computed(() => {
    if (!orderType.value) return false

    const { name, phone, address } = customerInfo.value
    
    switch (orderType.value) {
      case ORDER_TYPES.DINE_IN:
        return true // Table selection handled separately
      case ORDER_TYPES.TO_GO:
        return name.trim() && phone.trim()
      case ORDER_TYPES.DELIVERY:
        return name.trim() && phone.trim() && address.trim()
      case ORDER_TYPES.PICKUP:
        return name.trim() && phone.trim()
      default:
        return false
    }
  })

  const requiresCustomerInfo = computed(() => {
    return orderType.value && orderType.value !== ORDER_TYPES.DINE_IN
  })

  const canCreateOrder = computed(() => {
    return !cartStore.isEmpty && posStore.systemReady
  })

  const currentOrderType = computed(() => {
    try {
      // First try to parse from notes
      if (cartStore.notes) {
        try {
          const notesObj = JSON.parse(cartStore.notes)
          if (notesObj.type && Object.values(ORDER_TYPES).includes(notesObj.type)) {
            logger.debug('Order type found in notes:', notesObj.type)
            return notesObj.type
          }
        } catch (e) {
          logger.warn('Failed to parse order type from notes:', e)
        }
      }

      // If we have a held invoice, try to determine type from the name
      if (cartStore.holdInvoiceId) {
        // Check if any order type prefix exists in the invoice name
        const invoiceName = cartStore.holdInvoiceName || ''
        for (const type of Object.values(ORDER_TYPES)) {
          if (invoiceName.startsWith(type)) {
            logger.debug('Order type determined from hold invoice name:', type)
            // Update notes to preserve the type
            const orderInfo = {
              type,
              customer: { ...customerInfo.value }
            }
            cartStore.setNotes(JSON.stringify(orderInfo))
            return type
          }
        }
      }

      // If no type found, default to TO_GO for held orders
      if (cartStore.holdInvoiceId) {
        logger.debug('No order type found for held order, defaulting to TO_GO')
        const orderInfo = {
          type: ORDER_TYPES.TO_GO,
          customer: { ...customerInfo.value }
        }
        cartStore.setNotes(JSON.stringify(orderInfo))
        return ORDER_TYPES.TO_GO
      }

      logger.debug('No order type found')
      return null
    } catch (e) {
      logger.error('Error determining current order type:', e)
      return null
    }
  })

  // Methods
  const setOrderType = (type) => {
    if (!Object.values(ORDER_TYPES).includes(type)) {
      logger.error('Invalid order type:', type)
      throw new Error('Invalid order type')
    }
    
    orderType.value = type
    // Reset customer info when changing order type
    customerInfo.value = {
      name: '',
      phone: '',
      address: '',
      pickupTime: '',
      instructions: ''
    }
    error.value = null

    // Update notes with new order type
    const orderInfo = {
      type,
      customer: { ...customerInfo.value }
    }
    cartStore.setNotes(JSON.stringify(orderInfo))
    logger.debug('Order type set:', type)
  }

  const setCustomerInfo = (info) => {
    customerInfo.value = {
      ...customerInfo.value,
      ...info
    }
    // Update notes with new customer info
    const orderInfo = {
      type: orderType.value,
      customer: { ...customerInfo.value }
    }
    cartStore.setNotes(JSON.stringify(orderInfo))
    logger.debug('Customer info updated:', customerInfo.value)
  }

  const processOrder = async () => {
    if (!isValid.value) {
      throw new Error('Invalid order information')
    }

    if (!canCreateOrder.value) {
      throw new Error('Cannot create order: Cart is empty or system is not ready')
    }

    loading.value = true
    error.value = null

    try {
      // Add order type and customer info to cart store notes
      const orderInfo = {
        type: orderType.value,
        customer: { ...customerInfo.value }
      }
      cartStore.setNotes(JSON.stringify(orderInfo))

      // For dine-in, tables are handled separately
      if (orderType.value === ORDER_TYPES.DINE_IN) {
        return { success: true }
      }

      // For TO_GO orders, create hold invoice and then convert to regular invoice
      if (orderType.value === ORDER_TYPES.TO_GO) {
        // First create hold invoice
        const holdOrderData = cartStore.prepareHoldInvoiceData(
          posStore.selectedStore,
          posStore.selectedCashier,
          `${orderType.value}_${customerInfo.value.name}`
        )

        logger.debug('Creating hold order with data:', holdOrderData)
        const holdResult = await posStore.holdOrder(holdOrderData)
        
        if (!holdResult || holdResult.success === false) {
          throw new Error(holdResult?.message || 'Failed to create hold order')
        }

        // Now create regular invoice from the hold order
        const invoiceData = cartStore.prepareInvoiceData(
          posStore.selectedStore,
          posStore.selectedCashier,
          `${orderType.value}_${customerInfo.value.name}`
        )
        
        // Add hold invoice ID to the invoice data
        invoiceData.hold_invoice_id = holdResult.data.id
        invoiceData.is_hold_invoice = true

        logger.debug('Creating invoice with data:', invoiceData)
        const invoiceResult = await posOperations.createInvoice(invoiceData)

        if (!invoiceResult || invoiceResult.success === false) {
          throw new Error(invoiceResult?.message || 'Failed to create invoice')
        }

        logger.info('TO_GO order processed successfully:', {
          holdOrder: holdResult,
          invoice: invoiceResult
        })

        return {
          success: true,
          holdOrder: holdResult.data,
          invoice: invoiceResult.invoice
        }
      }

      // For other types, create hold invoice
      const orderData = cartStore.prepareHoldInvoiceData(
        posStore.selectedStore,
        posStore.selectedCashier,
        `${orderType.value}_${customerInfo.value.name}`
      )

      logger.debug('Processing order with data:', orderData)

      const result = await posStore.holdOrder(orderData)
      
      if (!result || result.success === false) {
        throw new Error(result?.message || 'Failed to process order')
      }

      logger.info('Order processed successfully:', result)
      return result

    } catch (err) {
      logger.error('Failed to process order:', err)
      error.value = err.message || 'Failed to process order'
      throw err
    } finally {
      loading.value = false
    }
  }

  const reset = () => {
    orderType.value = null
    customerInfo.value = {
      name: '',
      phone: '',
      address: '',
      pickupTime: '',
      instructions: ''
    }
    error.value = null
  }

  return {
    // State
    orderType,
    customerInfo,
    loading,
    error,

    // Computed
    isValid,
    requiresCustomerInfo,
    canCreateOrder,
    currentOrderType,

    // Methods
    setOrderType,
    setCustomerInfo,
    processOrder,
    reset,

    // Constants
    ORDER_TYPES
  }
}
