<!-- src/views/pos/components/PosFooter.vue -->
<template>
  <v-footer app class="d-flex flex-column pos-footer">
    <div class="footer-content">
      <!-- Order Type Actions -->
      <div class="d-flex gap-8 justify-center">
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
      <div class="d-flex gap-12 justify-center">
        <v-btn
          color="info"
          prepend-icon="mdi-printer"
          @click="$emit('print-order')"
          :disabled="isDisabled"
          class="text-none"
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
          class="text-none"
          rounded="pill"
          elevation="2"
          size="large"
        >
          PAY {{ PriceUtils.format(cartStore.total) }}
        </v-btn>
      </div>
    </div>

    <!-- Payment Dialog -->
    <retail-payment-dialog
      v-model="showPaymentDialog"
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
import RetailPaymentDialog from './dialogs/RetailPaymentDialog.vue'
import { useCartStore } from '@/stores/cart-store'
import { useCompanyStore } from '@/stores/company'
import { usePayment } from '../composables/usePayment'
import { logger } from '@/utils/logger'
import { convertHeldOrderToInvoice } from './held-orders/utils/invoiceConverter'
import { usePosStore } from '@/stores/pos-store'
import { PriceUtils } from '@/utils/price'

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
  const canPayValue = !isEmpty.value && isConfigured.value
  logger.debug('Can pay computed:', {
    isEmpty: isEmpty.value,
    isConfigured: isConfigured.value,
    canPay: canPayValue
  })
  return canPayValue
})

// Handle payment initiation
const handlePayment = async () => {
  logger.debug('Handle payment called')
  showPaymentDialog.value = true
}

// Handle payment completion
const handlePaymentComplete = async (result) => {
  logger.info('Payment completion handler called with result:', result)
  
  if (result) {
    // Clear the cart after successful payment
    await cartStore.$reset()
    window.toastr?.['success']('Payment processed successfully')
  }
  
  showPaymentDialog.value = false
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
.pos-footer {
  border-top: 1px solid rgba(0, 0, 0, 0.12);
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 100;
  background: white;
  height: 64px !important;
  min-height: 64px !important;
  box-shadow: 0 -2px 4px rgba(0,0,0,0.1);
  padding: 0 !important;
  width: 100vw !important;
}

.footer-content {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 48px;
}

@media (max-width: 600px) {
  .pos-footer {
    height: 88px;
    padding: 8px 12px !important;
  }
  
  .footer-content {
    flex-direction: column;
    gap: 8px;
  }
  
  .d-flex {
    width: 100%;
    gap: 8px;
  }
  
  .gap-8 {
    flex-wrap: wrap;
    justify-content: center;
    gap: 16px;
  }
  
  .gap-12 {
    justify-content: center;
    gap: 24px;
  }
  
  .v-btn {
    padding: 0 16px !important;
  }
}
</style>
