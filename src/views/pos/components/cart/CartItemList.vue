<!-- src/views/pos/components/cart/CartItemList.vue -->
<template>
  <div class="cart-items">
    <v-list class="cart-list pa-0">
      <v-list-item
        v-for="(item, index) in items"
        :key="index"
        class="cart-item"
        :class="{ 'border-b': index !== items.length - 1 }"
      >
        <!-- Item Details -->
        <div class="d-flex flex-column flex-grow-1">
          <div class="d-flex justify-space-between align-center mb-1">
            <div class="item-name text-subtitle-1 font-weight-medium text-truncate">
              {{ item.name }}
            </div>
            <div class="item-total text-subtitle-1 font-weight-medium">
              ${{ formatPrice(item.price * item.quantity) }}
            </div>
          </div>
          
          <div class="d-flex justify-space-between align-center">
            <!-- Quantity Controls -->
            <div class="quantity-controls d-flex align-center">
              <v-btn
                icon="mdi-minus"
                size="small"
                variant="tonal"
                density="comfortable"
                color="primary"
                :disabled="item.quantity <= 1"
                @click="emit('updateQuantity', item.id, Math.max(0, item.quantity - 1), index)"
              />
              <span class="quantity-display mx-3 text-body-1">{{ item.quantity }}</span>
              <v-btn
                icon="mdi-plus"
                size="small"
                variant="tonal"
                density="comfortable"
                color="primary"
                @click="emit('updateQuantity', item.id, item.quantity + 1, index)"
              />
            </div>

            <!-- Action Buttons -->
            <div class="action-buttons d-flex align-center gap-2">
              <v-btn
                icon="mdi-pencil"
                size="small"
                variant="text"
                color="primary"
                @click="emit('edit', item, index)"
              />
              <v-btn
                icon="mdi-delete"
                size="small"
                variant="text"
                color="error"
                @click="emit('remove', item.id, index)"
              />
            </div>
          </div>
        </div>
      </v-list-item>
    </v-list>
  </div>
</template>

<script setup>
const props = defineProps({
  items: {
    type: Array,
    required: true
  }
})

const emit = defineEmits(['edit', 'remove', 'updateQuantity'])

// Format price for display, converting from cents to dollars if needed
const formatPrice = (price) => {
  if (!price) return '0.00'
  // If price is in cents (> 100), convert to dollars
  const dollars = price > 100 ? price / 100 : price
  return Number(dollars).toFixed(2)
}
</script>

<style scoped>
.cart-items {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  position: relative;
}

.cart-list {
  background: transparent;
}

.cart-item {
  padding: 12px;
  transition: background-color 0.2s ease;
}

.cart-item:hover {
  background-color: rgb(250, 250, 250);
}

.border-b {
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
}

.item-name {
  max-width: 70%;
}

.quantity-controls {
  min-width: 120px;
}

.quantity-display {
  min-width: 24px;
  text-align: center;
  font-weight: 500;
}

.gap-2 {
  gap: 8px;
}

.text-truncate {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Mobile Optimizations */
@media (max-width: 600px) {
  .cart-item {
    padding: 8px;
  }
  
  .quantity-controls {
    min-width: 100px;
  }
  
  .quantity-display {
    min-width: 20px;
    margin: 0 8px;
  }
}
</style>
