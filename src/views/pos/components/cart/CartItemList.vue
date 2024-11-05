<!-- src/views/pos/components/cart/CartItemList.vue -->
<template>
  <div class="cart-items mb-4">
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
        <tr v-for="(item, index) in items" :key="index">
          <td>
            {{ item.name }}
          </td>
          <td class="text-center">
            <div class="d-flex align-center justify-center">
              <v-btn
                icon="mdi-minus"
                size="x-small"
                variant="text"
                @click="emit('updateQuantity', item.id, Math.max(0, item.quantity - 1), index)"
              />
              {{ item.quantity }}
              <v-btn
                icon="mdi-plus"
                size="x-small"
                variant="text"
                @click="emit('updateQuantity', item.id, item.quantity + 1, index)"
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
                @click="emit('edit', item, index)"
              />
              <v-btn
                icon="mdi-delete"
                size="x-small"
                variant="text"
                color="error"
                @click="emit('remove', item.id, index)"
              />
            </div>
          </td>
        </tr>
      </tbody>
    </v-table>
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
.v-table {
  width: 100%;
}

.gap-1 {
  gap: 8px;
}

.text-truncate {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
