// src/views/pos/composables/usePayment.js
import { ref, computed } from 'vue'
import { useCartStore } from '@/stores/cart-store'
import { posOperations } from '@/services/api/pos-operations'
import { logger } from '@/utils/logger'

export function usePayment(total) {
  const cartStore = useCartStore()
  const selectedMethod = ref(null)
  const amount = ref(total)
  const notes = ref('')
  const processing = ref(false)

  const paymentMethods = [
    { id: 'cash', name: 'Cash' },
    { id: 'card', name: 'Credit Card' },
    { id: 'other', name: 'Other' }
  ]

  const canProcess = computed(() => {
    return selectedMethod.value && 
           amount.value > 0 && 
           amount.value <= total
  })

  const formatPrice = (price) => {
    if (!price) return '0.00'
    return Number(price).toFixed(2)
  }

  const processPayment = async () => {
    if (!canProcess.value) return
    
    processing.value = true
    try {
      const orderData = {
        items: cartStore.items,
        total: cartStore.total,
        subtotal: cartStore.subtotal,
        tax: cartStore.taxAmount,
        discount_type: cartStore.discountType,
        discount: cartStore.discountValue,
        discount_amount: cartStore.discountAmount,
        payment: {
          amount: amount.value,
          payment_method_id: selectedMethod.value,
          notes: notes.value
        }
      }
      
      await posOperations.submitOrder(orderData)
      cartStore.clearCart()
    } catch (error) {
      logger.error('Payment processing failed:', error)
      throw error
    } finally {
      processing.value = false
    }
  }

  return {
    selectedMethod,
    amount,
    notes,
    processing,
    paymentMethods,
    formatPrice,
    canProcess,
    processPayment
  }
}
