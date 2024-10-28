<!-- src/views/pos/components/PosCart.vue -->
<template>
  <div class="pos-cart-container pa-4">
    <div class="d-flex justify-space-between align-center mb-4">
      <h2 class="text-h6">Current Order:</h2>
      <v-btn
        color="error"
        variant="text"
        :disabled="cartStore.isEmpty"
        @click="clearOrder"
      >
        Clear Order
      </v-btn>
    </div>

    <!-- Empty Cart State -->
    <v-alert
      v-if="cartStore.isEmpty"
      type="info"
      class="mb-4"
    >
      Cart is empty. Add items from the product list.
    </v-alert>

    <!-- Cart Items -->
    <div v-else class="cart-items mb-4">
      <v-table density="compact">
        <thead>
          <tr>
            <th>Products</th>
            <th class="text-center">Qty</th>
            <th class="text-right">Price</th>
            <th class="text-right">Subtotal</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in cartStore.items" :key="item.id">
            <td>{{ item.name }}</td>
            <td class="text-center">
              <div class="d-flex align-center justify-center">
                <v-btn
                  icon="mdi-minus"
                  size="x-small"
                  variant="text"
                  @click="updateQuantity(item.id, item.quantity - 1)"
                />
                {{ item.quantity }}
                <v-btn
                  icon="mdi-plus"
                  size="x-small"
                  variant="text"
                  @click="updateQuantity(item.id, item.quantity + 1)"
                />
              </div>
            </td>
            <td class="text-right">${{ formatPrice(item.price) }}</td>
            <td class="text-right">${{ formatPrice(item.price * item.quantity) }}</td>
            <td>
              <div class="d-flex gap-1">
                <v-btn
                  icon="mdi-pencil"
                  size="x-small"
                  variant="text"
                  color="primary"
                  @click="editItem(item)"
                />
                <v-btn
                  icon="mdi-delete"
                  size="x-small"
                  variant="text"
                  color="error"
                  @click="removeItem(item.id)"
                />
              </div>
            </td>
          </tr>
        </tbody>
      </v-table>
    </div>

    <!-- Order Summary -->
    <div class="order-summary">
      <div class="d-flex justify-space-between mb-2">
        <span>Subtotal:</span>
        <span>${{ formatPrice(cartStore.subtotal) }}</span>
      </div>
      
      <div class="d-flex align-center justify-space-between mb-2">
        <div class="d-flex align-center">
          <span class="mr-2">Discount:</span>
          <v-select
            v-model="discountType"
            :items="['%', '$']"
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
        <span>-${{ formatPrice(cartStore.discountAmount) }}</span>
      </div>

      <div class="d-flex justify-space-between mb-2">
        <span>Tax ({{ cartStore.taxRate * 100 }}%):</span>
        <span>${{ formatPrice(cartStore.taxAmount) }}</span>
      </div>

      <v-divider class="my-2" />

      <div class="d-flex justify-space-between text-h6">
        <span>Total:</span>
        <span>${{ formatPrice(cartStore.total) }}</span>
      </div>
    </div>

    <!-- Loading Overlay -->
    <v-overlay
      :model-value="cartStore.loading"
      class="align-center justify-center"
    >
      <v-progress-circular
        size="64"
        color="primary"
        indeterminate
      />
    </v-overlay>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useCartStore } from '../../../stores/cart-store'
import { logger } from '../../../utils/logger'

const cartStore = useCartStore()

// Local state for discount inputs
const discountType = ref(cartStore.$state.discountType)
const discountValue = ref(cartStore.$state.discountValue)

// Format price from cents to dollars
const formatPrice = (price) => {
  if (!price) return '0.00'
  // Convert from cents to dollars
  const priceInDollars = Number(price) / 100
  return priceInDollars.toFixed(2)
}

// Watch for external discount changes
watch(() => cartStore.$state.discountType, (newType) => {
  discountType.value = newType
})

watch(() => cartStore.$state.discountValue, (newValue) => {
  discountValue.value = newValue
})

// Methods
const clearOrder = () => {
  cartStore.clearCart()
}

const updateQuantity = (itemId, quantity) => {
  cartStore.updateItemQuantity(itemId, quantity)
}

const removeItem = (itemId) => {
  cartStore.removeItem(itemId)
}

const updateDiscount = () => {
  cartStore.setDiscount(discountType.value, Number(discountValue.value))
}

const editItem = (item) => {
  // TODO: Implement edit functionality
  logger.info('Edit item requested:', item)
}
</script>

<style scoped>
.pos-cart-container {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.cart-items {
  flex: 1;
  overflow-y: auto;
}

.order-summary {
  margin-top: auto;
  padding-top: 1rem;
}

.discount-type-select :deep(.v-field__input) {
  padding: 0;
}
</style>
