<!-- src/views/pos/components/PosFooter.vue -->
<template>
  <v-footer app class="d-flex flex-column pa-4">
    <div class="d-flex gap-2 justify-space-between w-100">
      <!-- Order Type Actions -->
      <div class="d-flex gap-2">
        <held-orders-modal />
        <dine-in-modal :disabled="isDisabled" />
        <to-go-modal :disabled="isDisabled" />
        <delivery-modal :disabled="isDisabled" />
        <pickup-modal :disabled="isDisabled" />
      </div>

      <!-- Order Actions -->
      <div class="d-flex gap-2">
        <v-btn
          color="success"
          prepend-icon="mdi-cash-register"
          @click="$emit('process-payment')"
          :disabled="isDisabled"
        >
          Payment
        </v-btn>
        <v-btn
          color="info"
          prepend-icon="mdi-printer"
          @click="$emit('print-order')"
          :disabled="isDisabled"
        >
          Print
        </v-btn>
        <v-btn
          color="warning"
          prepend-icon="mdi-send"
          @click="$emit('submit-order')"
          :disabled="isDisabled"
        >
          Submit
        </v-btn>
      </div>
    </div>
  </v-footer>
</template>

<script setup>
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import HeldOrdersModal from './HeldOrdersModal.vue'
import DineInModal from './order-types/DineInModal.vue'
import ToGoModal from './order-types/ToGoModal.vue'
import DeliveryModal from './order-types/DeliveryModal.vue'
import PickupModal from './order-types/PickupModal.vue'
import { useCartStore } from '@/stores/cart-store'
import { useCompanyStore } from '@/stores/company'

const cartStore = useCartStore()
const companyStore = useCompanyStore()

// Use storeToRefs to maintain reactivity for store state
const { items } = storeToRefs(cartStore)
const { isConfigured } = storeToRefs(companyStore)

// Compute if cart is empty based on items length
const isEmpty = computed(() => items.value.length === 0)

// Compute disabled state for all buttons
const isDisabled = computed(() => {
  return isEmpty.value || !isConfigured.value
})

defineEmits([
  'process-payment',
  'print-order',
  'submit-order'
])
</script>

<style scoped>
.v-footer {
  border-top: 1px solid rgba(0, 0, 0, 0.12);
}
</style>
