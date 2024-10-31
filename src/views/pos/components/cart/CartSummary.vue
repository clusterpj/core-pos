<!-- src/views/pos/components/cart/CartSummary.vue -->
<template>
  <div class="order-summary">
    <div class="d-flex justify-space-between mb-2">
      <span>Subtotal:</span>
      <span>${{ formatPrice(subtotal) }}</span>
    </div>
    
    <div class="d-flex align-center justify-space-between mb-2">
      <div class="d-flex align-center">
        <span class="mr-2">Discount:</span>
        <v-select
          v-model="discountType"
          :items="[
            { title: '%', value: '%' },
            { title: '$', value: 'fixed' }
          ]"
          item-title="title"
          item-value="value"
          density="compact"
          hide-details
          class="discount-type-select"
          style="max-width: 80px"
          @update:model-value="updateDiscount"
        />
      </div>
      <v-text-field
        v-model="discountValue"
        density="compact"
        hide-details
        type="number"
        style="max-width: 100px"
        class="text-right"
        @update:model-value="updateDiscount"
      />
    </div>

    <div class="d-flex justify-space-between mb-2 success--text">
      <span>Discount Amount:</span>
      <span>-${{ formatPrice(discountAmount) }}</span>
    </div>

    <div class="d-flex justify-space-between mb-2">
      <span>Tax ({{ taxRate * 100 }}%):</span>
      <span>${{ formatPrice(taxAmount) }}</span>
    </div>

    <v-divider class="my-2" />

    <div class="d-flex justify-space-between text-h6">
      <span>Total:</span>
      <span>${{ formatPrice(total) }}</span>
    </div>
  </div>
</template>

<script setup>
import { useCartDiscount } from '../../composables/useCartDiscount'

const props = defineProps({
  subtotal: Number,
  discountAmount: Number,
  taxRate: Number,
  taxAmount: Number,
  total: Number
})

const { discountType, discountValue, updateDiscount } = useCartDiscount()

// Format price for display only, keeping raw values in the store
const formatPrice = (price) => {
  if (!price) return '0.00'
  return Number(price).toFixed(2)
}
</script>

<style scoped>
.discount-type-select :deep(.v-field__input) {
  padding: 0;
}
</style>
