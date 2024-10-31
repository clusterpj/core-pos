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
            <div v-if="item.modifications?.length > 0" class="text-caption text-grey">
              <div v-for="(mod, i) in item.modifications" :key="i">
                - {{ mod }}
              </div>
            </div>
          </td>
          <td class="text-center">
            <div class="d-flex align-center justify-center">
              <v-btn
                icon="mdi-minus"
                size="x-small"
                variant="text"
                @click="updateQuantity(item.id, item.quantity - 1, index)"
              />
              {{ item.quantity }}
              <v-btn
                icon="mdi-plus"
                size="x-small"
                variant="text"
                @click="updateQuantity(item.id, item.quantity + 1, index)"
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
                @click="$emit('edit', item, index)"
              />
              <v-btn
                icon="mdi-delete"
                size="x-small"
                variant="text"
                color="error"
                @click="$emit('remove', item.id, index)"
              />
            </div>
          </td>
        </tr>
      </tbody>
    </v-table>
  </div>
</template>

<script setup>
defineProps({
  items: {
    type: Array,
    required: true
  }
})

defineEmits(['edit', 'remove', 'updateQuantity'])

const formatPrice = (price) => {
  if (!price) return '0.00'
  const priceInDollars = Number(price) / 100
  return priceInDollars.toFixed(2)
}
</script>
