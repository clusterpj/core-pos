<!-- src/views/pos/components/cart/CartItemList.vue -->
<template>
  <div class="cart-items" :class="$attrs.class">
    <v-list class="cart-list pa-0" density="compact">
      <v-list-item
        v-for="(item, index) in items"
        :key="index"
        class="cart-item py-1"
        :class="{ 'border-b': index !== items.length - 1 }"
      >
        <div class="d-flex align-center w-100 gap-2">
          <!-- Quantity Badge -->
          <div class="quantity-badge">
            {{ item.quantity }}
          </div>

          <!-- Item Info -->
          <div class="item-info flex-grow-1 min-width-0">
            <div class="item-name text-body-2 font-weight-medium text-truncate">
              {{ item.name }}
            </div>
            <div class="item-price text-caption text-grey-darken-1">
              ${{ formatPrice(item.price) }} each
            </div>
          </div>

          <!-- Total and Actions -->
          <div class="d-flex align-center gap-1">
            <span class="item-total text-body-2 font-weight-medium">
              ${{ formatPrice(item.price * item.quantity) }}
            </span>
            
            <div class="action-buttons d-flex">
              <v-btn
                icon="mdi-minus"
                size="small"
                variant="tonal"
                density="comfortable" 
                color="primary"
                :disabled="item.quantity <= 1"
                @click="emit('updateQuantity', item.id, Math.max(0, item.quantity - 1), index)"
                class="touch-btn"
              />
              <v-btn
                icon="mdi-plus"
                size="small"
                variant="tonal"
                density="comfortable"
                color="primary"
                @click="emit('updateQuantity', item.id, item.quantity + 1, index)"
                class="touch-btn"
              />
              <v-btn
                v-if="item.quantity > 1"
                icon="mdi-call-split"
                size="small"
                variant="tonal"
                density="comfortable"
                color="info"
                @click="openSplitDialog(item)"
                class="touch-btn"
              />
              <v-btn
                icon="mdi-delete"
                size="small"
                variant="tonal"
                density="comfortable"
                color="error"
                @click="emit('remove', item.id, index)"
                class="touch-btn"
              />
            </div>
          </div>
        </div>
      </v-list-item>
    </v-list>
  </div>

  <split-item-dialog
    v-model="showSplitDialog"
    :item="selectedItem"
    @split="handleSplit"
  />
</template>

<script setup>
import { ref } from 'vue'
import SplitItemDialog from './SplitItemDialog.vue'

const props = defineProps({
  items: {
    type: Array,
    required: true
  }
})

const emit = defineEmits(['edit', 'remove', 'updateQuantity', 'split'])

const showSplitDialog = ref(false)
const selectedItem = ref(null)

const openSplitDialog = (item) => {
  selectedItem.value = item
  showSplitDialog.value = true
}

const handleSplit = ({ itemId, quantity }) => {
  const itemToSplit = props.items.find(item => item.id === itemId)
  if (!itemToSplit) {
    window.toastr?.['error']('Item not found for splitting')
    return
  }
  if (!quantity || quantity >= itemToSplit.quantity) {
    window.toastr?.['error']('Invalid split quantity')
    return
  }
  
  // Ensure we pass the correct price and item_id
  const itemForSplit = {
    ...itemToSplit,
    price: itemToSplit.price,
    item_id: itemToSplit.item_id || itemToSplit.id
  }
  emit('split', itemForSplit, quantity)
}

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
  padding: 8px 12px;
  transition: all 0.2s ease;
  border-radius: 4px;
}

.cart-item:hover {
  background-color: rgb(250, 250, 250);
}

.border-b {
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.quantity-badge {
  background: rgba(var(--v-theme-primary), 0.1);
  color: rgb(var(--v-theme-primary));
  min-width: 32px;
  height: 32px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.875rem;
  font-weight: 500;
}

.item-info {
  line-height: 1.2;
}

.item-name {
  margin-bottom: 2px;
}

.gap-1 {
  gap: 4px;
}

.gap-2 {
  gap: 8px;
}

.min-width-0 {
  min-width: 0;
}

.text-truncate {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Touch Optimizations */
.touch-btn {
  margin: 0 2px;
  min-width: 36px !important;
  width: 36px;
  height: 36px !important;
}

.touch-btn:active {
  transform: scale(0.95);
}

/* Mobile Optimizations */
@media (max-width: 600px) {
  .cart-item {
    padding: 8px;
  }
  
  .quantity-badge {
    min-width: 28px;
    height: 28px;
    font-size: 0.875rem;
  }
  
  .action-buttons {
    gap: 4px;
  }
}
</style>
