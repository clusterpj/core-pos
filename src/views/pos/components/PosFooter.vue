<!-- src/views/pos/components/PosFooter.vue -->
<template>
  <v-footer app class="d-flex flex-column pa-4">
    <div class="d-flex gap-2 justify-space-between w-100">
      <!-- Order Type Actions -->
      <div class="d-flex gap-2">
        <held-orders-modal :disabled="false" />
        <dine-in-modal :disabled="isDisabled" />
        <to-go-modal :disabled="isDisabled" />
        <delivery-modal :disabled="isDisabled" />
        <pickup-modal :disabled="isDisabled" />
      </div>

      <!-- Order Actions -->
      <div class="d-flex gap-2">
        <v-btn
          color="info"
          prepend-icon="mdi-printer"
          @click="$emit('print-order')"
          :disabled="isDisabled"
        >
          Print
        </v-btn>
        
        <v-btn
          color="success"
          prepend-icon="mdi-cash-register"
          @click="showPaymentDialog = true"
          :disabled="!canPay"
          :loading="isProcessingPayment"
        >
          Pay {{ formatCurrency(cartStore.total) }}
        </v-btn>
      </div>
    </div>

    <!-- Payment Dialog -->
    <payment-details-dialog
      v-model="showPaymentDialog"
    />
  </v-footer>
</template>

<script setup>
import { ref, computed } from 'vue'
import { storeToRefs } from 'pinia'
import HeldOrdersModal from './HeldOrdersModal.vue'
import DineInModal from './order-types/DineInModal.vue'
import ToGoModal from './order-types/ToGoModal.vue'
import DeliveryModal from './order-types/DeliveryModal.vue'
import PickupModal from './order-types/PickupModal.vue'
import PaymentDetailsDialog from './dialogs/PaymentDetailsDialog.vue'
import { useCartStore } from '../../../stores/cart-store'
import { useCompanyStore } from '../../../stores/company'
import { usePaymentProcessing } from '../composables/usePaymentProcessing'

const cartStore = useCartStore()
const companyStore = useCompanyStore()
const { isProcessingPayment } = usePaymentProcessing()

// Use storeToRefs to maintain reactivity for store state
const { items, holdInvoiceId } = storeToRefs(cartStore)
const { isConfigured } = storeToRefs(companyStore)

const showPaymentDialog = ref(false)

// Compute if cart is empty based on items length
const isEmpty = computed(() => items.value.length === 0)

// Compute disabled state for all buttons
const isDisabled = computed(() => {
  return isEmpty.value || !isConfigured.value
})

// Compute if payment can be processed
const canPay = computed(() => {
  return !isEmpty.value && isConfigured.value && holdInvoiceId.value !== null
})

// Format currency helper
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount)
}

defineEmits([
  'print-order',
  'submit-order'
])
</script>

<style scoped>
.v-footer {
  border-top: 1px solid rgba(0, 0, 0, 0.12);
}
</style>
