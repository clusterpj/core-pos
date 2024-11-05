<!-- src/views/pos/components/PosCart.vue -->
<template>
  <div class="pos-cart-container">
    <div class="cart-header px-4 pt-4 pb-2">
      <div class="d-flex justify-space-between align-center">
        <div>
          <h2 class="text-h6">Current Order:</h2>
          <div class="d-flex align-center gap-2">
            <template v-if="cartStore.isHoldOrder">
              <v-chip
                color="warning"
                size="small"
                class="mt-1"
                prepend-icon="mdi-clock-outline"
              >
                Held Order: {{ cartStore.holdOrderDescription || 'No Description' }}
              </v-chip>
              <v-btn
                color="warning"
                size="small"
                class="mt-1"
                :loading="updating"
                @click="updateOrder"
                prepend-icon="mdi-content-save"
              >
                Update Order
              </v-btn>
            </template>
          </div>
        </div>
        <v-btn
          color="error"
          variant="text"
          density="comfortable"
          :disabled="cartStore.isEmpty"
          @click="clearOrder"
        >
          Clear Order
        </v-btn>
      </div>
    </div>

    <div class="cart-content">
      <!-- Empty Cart State -->
      <v-alert
        v-if="cartStore.isEmpty"
        type="info"
        class="mx-4 mb-4"
      >
        Cart is empty. Add items from the product list.
      </v-alert>

      <!-- Cart Items -->
      <template v-else>
        <cart-item-list
          :items="cartStore.items"
          @edit="editItem"
          @remove="removeItem"
          @update-quantity="updateQuantity"
        />
      </template>
    </div>

    <!-- Order Summary - Always visible at bottom -->
    <div class="cart-summary-wrapper px-4 pb-4">
      <cart-summary
        :subtotal="cartStore.subtotal"
        :discount-amount="cartStore.discountAmount"
        :tax-rate="cartStore.taxRate"
        :tax-amount="cartStore.taxAmount"
        :total="cartStore.total"
      />
    </div>

    <!-- Edit Item Dialog -->
    <v-dialog v-model="showEditDialog" max-width="500">
      <v-card>
        <v-card-title class="d-flex justify-space-between align-center">
          {{ editingItem?.name }}
          <v-chip>Qty: {{ editingItem?.quantity || 0 }}</v-chip>
        </v-card-title>

        <v-card-text>
          <!-- Split Item Option -->
          <div class="mb-4">
            <div class="text-subtitle-2 mb-2">Split Item</div>
            <div class="d-flex align-center gap-2">
              <v-text-field
                v-model="splitQuantity"
                type="number"
                label="Quantity to split"
                :min="1"
                :max="editingItem?.quantity - 1"
                density="compact"
                hide-details
                style="max-width: 120px"
              />
              <v-btn
                color="primary"
                variant="outlined"
                :disabled="!canSplit"
                @click="splitItem"
              >
                Split
              </v-btn>
            </div>
          </div>
        </v-card-text>

        <v-card-actions>
          <v-spacer />
          <v-btn
            color="grey"
            variant="text"
            @click="closeEditDialog"
          >
            Cancel
          </v-btn>
          <v-btn
            color="primary"
            @click="closeEditDialog"
          >
            Save
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

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
import { ref, computed } from 'vue'
import { useCartStore } from '../../../stores/cart-store'
import { usePosStore } from '../../../stores/pos-store'
import { logger } from '../../../utils/logger'
import CartItemList from './cart/CartItemList.vue'
import CartSummary from './cart/CartSummary.vue'

const cartStore = useCartStore()
const posStore = usePosStore()

// Local state
const showEditDialog = ref(false)
const editingItem = ref(null)
const editingIndex = ref(null)
const splitQuantity = ref(1)
const updating = ref(false)

// Computed
const canSplit = computed(() => {
  return editingItem.value &&
         splitQuantity.value > 0 &&
         splitQuantity.value < editingItem.value.quantity
})

// Methods
const clearOrder = () => {
  cartStore.clearCart()
}

const updateQuantity = (itemId, quantity, index) => {
  cartStore.updateItemQuantity(itemId, quantity, index)
}

const removeItem = (itemId, index) => {
  cartStore.removeItem(itemId, index)
}

const editItem = (item, index) => {
  editingItem.value = { ...item }
  editingIndex.value = index
  showEditDialog.value = true
}

const splitItem = () => {
  if (canSplit.value) {
    cartStore.splitItem(
      editingIndex.value,
      Number(splitQuantity.value)
    )
    closeEditDialog()
  }
}

const closeEditDialog = () => {
  showEditDialog.value = false
  editingItem.value = null
  editingIndex.value = null
  splitQuantity.value = 1
}

// Update held order
const updateOrder = async () => {
  try {
    const description = cartStore.holdOrderDescription
    if (!description) {
      throw new Error('No order description found')
    }

    updating.value = true
    logger.debug('Updating order with description:', description)

    // Prepare the order data from the current cart state
    const orderData = cartStore.prepareHoldInvoiceData(
      posStore.selectedStore,
      posStore.selectedCashier,
      description
    )

    // Update the hold invoice using description as identifier
    const response = await posStore.updateHoldInvoice(description, orderData)

    if (response.success) {
      window.toastr?.['success']('Order updated successfully')
      // Clear the hold invoice ID after successful update
      cartStore.setHoldInvoiceId(null)
      // Clear the cart after successful update
      cartStore.clearCart()
    } else {
      throw new Error(response.message || 'Failed to update order')
    }
  } catch (error) {
    logger.error('Failed to update order:', error)
    window.toastr?.['error'](error.message || 'Failed to update order')
  } finally {
    updating.value = false
  }
}
</script>

<style scoped>
.pos-cart-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: white;
}

.cart-header {
  background-color: white;
  border-bottom: 1px solid rgba(0, 0, 0, 0.12);
}

.cart-content {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}

.cart-summary-wrapper {
  background-color: white;
  border-top: 1px solid rgba(0, 0, 0, 0.12);
}

/* Mobile Optimizations */
@media (max-width: 600px) {
  .cart-header {
    position: sticky;
    top: 0;
    z-index: 2;
  }

  .cart-summary-wrapper {
    position: sticky;
    bottom: 0;
    z-index: 2;
  }
}

/* Tablet Optimizations */
@media (min-width: 601px) and (max-width: 960px) {
  .cart-header {
    position: sticky;
    top: 0;
    z-index: 2;
  }

  .cart-summary-wrapper {
    position: sticky;
    bottom: 0;
    z-index: 2;
  }
}
</style>
