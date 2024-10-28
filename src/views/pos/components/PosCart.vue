<!-- src/views/pos/components/PosCart.vue -->
<template>
    <div class="pos-cart-container pa-4">
      <div class="d-flex justify-space-between align-center mb-4">
        <h2 class="text-h6">Current Order:</h2>
        <v-btn
          color="error"
          variant="text"
          @click="clearOrder"
        >
          Clear Order
        </v-btn>
      </div>
  
      <!-- Cart Items -->
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
            <tr v-for="item in cartItems" :key="item.id">
              <td>{{ item.name }}</td>
              <td class="text-center">
                <div class="d-flex align-center justify-center">
                  <v-btn
                    icon="mdi-minus"
                    size="x-small"
                    variant="text"
                    @click="decreaseQuantity(item)"
                  />
                  {{ item.quantity }}
                  <v-btn
                    icon="mdi-plus"
                    size="x-small"
                    variant="text"
                    @click="increaseQuantity(item)"
                  />
                </div>
              </td>
              <td class="text-right">${{ item.price.toFixed(2) }}</td>
              <td class="text-right">${{ (item.price * item.quantity).toFixed(2) }}</td>
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
                    @click="removeItem(item)"
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
          <span>${{ subtotal.toFixed(2) }}</span>
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
            />
          </div>
          <v-text-field
            v-model="discountValue"
            density="compact"
            hide-details
            type="number"
            style="max-width: 100px"
            class="text-right"
          />
        </div>
  
        <div class="d-flex justify-space-between mb-2 success--text">
          <span>Discount Amount:</span>
          <span>-${{ discountAmount.toFixed(2) }}</span>
        </div>
  
        <div class="d-flex justify-space-between mb-2">
          <span>Tax (8%):</span>
          <span>${{ tax.toFixed(2) }}</span>
        </div>
  
        <v-divider class="my-2" />
  
        <div class="d-flex justify-space-between text-h6">
          <span>Total:</span>
          <span>${{ total.toFixed(2) }}</span>
        </div>
      </div>
    </div>
  </template>
  
  <script setup>
  import { ref, computed } from 'vue'
  
  // Mock cart items
  const cartItems = ref([
    { id: 1, name: 'Classic Burger', quantity: 1, price: 12.99 },
    { id: 2, name: 'Caesar Salad', quantity: 1, price: 8.99 },
    { id: 3, name: 'Chocolate Cake', quantity: 1, price: 6.99 }
  ])
  
  const discountType = ref('%')
  const discountValue = ref(0)
  
  // Computed values
  const subtotal = computed(() => {
    return cartItems.value.reduce((sum, item) => sum + (item.price * item.quantity), 0)
  })
  
  const discountAmount = computed(() => {
    if (discountType.value === '%') {
      return subtotal.value * (discountValue.value / 100)
    }
    return Number(discountValue.value) || 0
  })
  
  const tax = computed(() => {
    return (subtotal.value - discountAmount.value) * 0.08
  })
  
  const total = computed(() => {
    return subtotal.value - discountAmount.value + tax.value
  })
  
  // Methods
  const clearOrder = () => {
    cartItems.value = []
  }
  
  const increaseQuantity = (item) => {
    item.quantity++
  }
  
  const decreaseQuantity = (item) => {
    if (item.quantity > 1) {
      item.quantity--
    }
  }
  
  const editItem = (item) => {
    // Implement edit functionality
  }
  
  const removeItem = (item) => {
    cartItems.value = cartItems.value.filter(i => i.id !== item.id)
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