<!-- src/views/pos/components/PosFooter.vue -->
<template>
  <v-footer app class="d-flex flex-column pa-6">
    <div class="d-flex justify-space-between w-100">
      <!-- Order Type Actions -->
      <div class="d-flex gap-4">
        <held-orders-modal 
          v-model="showHeldOrdersModal"
          :disabled="false" 
        />
        <dine-in-modal :disabled="isDisabled" />
        <to-go-modal :disabled="isDisabled" />
        <delivery-modal :disabled="isDisabled" />
        <pickup-modal :disabled="isDisabled" />
      </div>

      <!-- Order Actions -->
      <div class="d-flex gap-6">
        <v-btn
          color="info"
          prepend-icon="mdi-printer"
          @click="$emit('print-order')"
          :disabled="isDisabled"
          class="text-none px-6"
          rounded="pill"
          elevation="2"
          size="large"
        >
          PRINT
        </v-btn>
        
        <v-btn
          color="success"
          prepend-icon="mdi-cash-register"
          @click="handlePayment"
          :disabled="!canPay"
          :loading="isProcessingPayment"
          class="text-none px-6"
          rounded="pill"
          elevation="2"
          size="large"
        >
          PAY {{ formatCurrency(cartStore.total) }}
        </v-btn>
      </div>
    </div>

    <!-- Payment Dialog -->
    <payment-dialog
      v-model="showPaymentDialog"
      :invoice="currentInvoice"
      @payment-complete="handlePaymentComplete"
    />
  </v-footer>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import HeldOrdersModal from './held-orders/HeldOrdersModal.vue'
import DineInModal from './order-types/DineInModal.vue'
import ToGoModal from './order-types/ToGoModal.vue'
import DeliveryModal from './order-types/DeliveryModal.vue'
import PickupModal from './order-types/PickupModal.vue'
import PaymentDialog from './dialogs/PaymentDialog.vue'
import { useCartStore } from '@/stores/cart-store'
import { useCompanyStore } from '@/stores/company'
import { usePayment } from '../composables/usePayment'
import { logger } from '@/utils/logger'
import { convertHeldOrderToInvoice } from './held-orders/utils/invoiceConverter'
import { usePosStore } from '@/stores/pos-store'

const cartStore = useCartStore()
const companyStore = useCompanyStore()
const posStore = usePosStore()
const { isProcessingPayment } = usePayment()

// Local state
const showPaymentDialog = ref(false)
const currentInvoice = ref(null)
const showHeldOrdersModal = ref(false)

// Use storeToRefs to maintain reactivity for store state
const { items, holdInvoiceId } = storeToRefs(cartStore)
const { isConfigured } = storeToRefs(companyStore)

// Compute if cart is empty based on items length
const isEmpty = computed(() => items.value.length === 0)

// Compute disabled state for all buttons
const isDisabled = computed(() => {
  return isEmpty.value || !isConfigured.value
})

// Compute if payment can be processed
const canPay = computed(() => {
  const canPayValue = !isEmpty.value && isConfigured.value && holdInvoiceId.value !== null
  logger.debug('Can pay computed:', {
    isEmpty: isEmpty.value,
    isConfigured: isConfigured.value,
    holdInvoiceId: holdInvoiceId.value,
    canPay: canPayValue
  })
  return canPayValue
})

// Format currency helper
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount)
}

// Handle payment initiation
const handlePayment = async () => {
  logger.debug('Handle payment called')
  
  if (!holdInvoiceId.value) {
    logger.error('No held order loaded')
    window.toastr?.['error']('No held order loaded')
    return
  }

  try {
    // Get the current hold invoice from the POS store
    const holdInvoice = posStore.holdInvoices.find(inv => inv.id === holdInvoiceId.value)
    
    if (!holdInvoice) {
      throw new Error('Hold invoice not found')
    }

    logger.debug('Found hold invoice:', holdInvoice)
    
    // Calculate subtotal from items
    const subTotal = cartStore.items.reduce((total, item) => {
      return total + (item.price * item.quantity)
    }, 0)
    
    // Create new invoice data while preserving original fields
    const invoiceData = {
      ...holdInvoice, // Keep original data including user_id
      description: cartStore.holdOrderDescription || holdInvoice.description,
      store_id: holdInvoice.store_id,
      cash_register_id: holdInvoice.cash_register_id,
      sub_total: subTotal,
      total: cartStore.total,
      tax: cartStore.tax,
      discount: cartStore.discount,
      discount_type: cartStore.discountType,
      discount_val: cartStore.discountValue,
      tip: cartStore.tip,
      tip_type: cartStore.tipType,
      tip_val: cartStore.tipValue,
      hold_items: cartStore.items.map(item => ({
        item_id: item.id,
        name: item.name,
        description: item.description || '',
        price: item.price,
        quantity: item.quantity,
        unit_name: item.unit_name || 'units',
        tax: item.tax || 0
      })),
      notes: cartStore.notes || holdInvoice.notes
    }

    logger.debug('Prepared invoice data:', {
      id: invoiceData.id,
      user_id: invoiceData.user_id,
      store_id: invoiceData.store_id,
      total: invoiceData.total,
      items: invoiceData.hold_items?.length
    })

    // Convert the order to invoice using the same converter as HeldOrdersModal
    const result = await convertHeldOrderToInvoice(invoiceData)
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to create invoice')
    }

    // Store the created invoice
    currentInvoice.value = result.invoice

    // Show payment dialog
    showPaymentDialog.value = true

    logger.info('Invoice created successfully:', {
      invoiceId: result.invoice?.id,
      holdInvoiceId: holdInvoiceId.value
    })
  } catch (error) {
    logger.error('Failed to create invoice:', error)
    window.toastr?.['error'](error.message || 'Failed to create invoice')
  }
}

// Handle payment completion
const handlePaymentComplete = async (result) => {
  logger.info('Payment completion handler called with result:', result)

  try {
    if (!holdInvoiceId.value) {
      throw new Error('Missing hold invoice ID')
    }

    // Delete the held order
    const deleteResponse = await posStore.deleteHoldInvoice(holdInvoiceId.value)
    
    if (!deleteResponse.success) {
      throw new Error(deleteResponse.message || 'Failed to delete hold invoice')
    }

    // Show success message
    window.toastr?.['success']('Payment processed successfully')

    // Reset state
    currentInvoice.value = null
    showPaymentDialog.value = false
    cartStore.clearCart()

  } catch (error) {
    logger.error('Failed to complete payment process:', error)
    window.toastr?.['error']('Failed to complete payment process')
  }
}

// Debug mounted state
onMounted(() => {
  logger.debug('PosFooter mounted:', {
    isEmpty: isEmpty.value,
    isConfigured: isConfigured.value,
    holdInvoiceId: holdInvoiceId.value,
    canPay: canPay.value,
    items: items.value.length
  })
})

defineEmits(['print-order', 'submit-order'])
</script>

<style scoped>
.v-footer {
  border-top: 1px solid rgba(0, 0, 0, 0.12);
}
</style>
