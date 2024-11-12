<!-- src/views/pos/components/PosCart.vue -->
<template>
  <div class="pos-cart-container">
    <div class="cart-header px-4 pt-4 pb-2">
      <div class="d-flex justify-space-between align-center">
        <div>
          <h2 class="text-h6 font-weight-medium">Current Order</h2>
          <div class="d-flex align-center gap-2">
            <template v-if="cartStore.isHoldOrder">
              <v-chip
                color="warning"
                size="small"
                variant="elevated"
                class="mt-1 font-weight-medium"
                prepend-icon="mdi-clock-outline"
              >
                Held Order: {{ cartStore.holdOrderDescription || 'No Description' }}
              </v-chip>
              <v-btn
                color="warning"
                size="small"
                variant="tonal"
                class="mt-1 text-none"
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
          variant="tonal"
          density="comfortable"
          :disabled="cartStore.isEmpty"
          @click="clearOrder"
          prepend-icon="mdi-delete-outline"
          class="text-none"
        >
          Clear Cart
        </v-btn>
      </div>
    </div>

    <div class="cart-content">
      <!-- Empty Cart State -->
      <v-alert
        v-if="cartStore.isEmpty"
        type="info"
        variant="tonal"
        class="mx-4 mb-4"
        border="start"
        density="comfortable"
        prepend-icon="mdi-cart-outline"
      >
        <div class="text-subtitle-1 font-weight-medium">Cart is Empty</div>
        <div class="text-body-2">Add items from the product list to get started.</div>
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

    <!-- Order Notes -->
    <order-notes v-if="!cartStore.isEmpty" />

    <!-- Order Summary - Always visible at bottom -->
    <div class="cart-summary-wrapper px-4 pb-4 elevation-1">
      <cart-summary
        :subtotal="cartStore.subtotal"
        :discount-amount="cartStore.discountAmount"
        :tax-rate="cartStore.taxRate"
        :tax-amount="cartStore.taxAmount"
        :total="cartStore.total"
      />
    </div>

    <!-- Edit Item Dialog -->
    <edit-item-dialog
      v-model="showEditDialog"
      :item="editingItem"
      :index="editingIndex"
      max-width="500"
      transition="dialog-bottom-transition"
      persistent
    >
      <template #default>
        <v-card>
          <v-card-title class="text-h6 pa-4">
            Edit Item
            <v-btn
              icon="mdi-close"
              variant="text"
              size="small"
              @click="showEditDialog = false"
              class="float-right"
            />
          </v-card-title>
          <v-card-text class="pa-4">
            <!-- Edit form content here -->
          </v-card-text>
          <v-card-actions class="pa-4">
            <v-spacer />
            <v-btn
              color="grey-darken-1"
              variant="text"
              @click="showEditDialog = false"
              class="text-none"
            >
              Cancel
            </v-btn>
            <v-btn
              color="primary"
              @click="saveChanges"
              class="text-none"
              :loading="saving"
            >
              Save Changes
            </v-btn>
          </v-card-actions>
        </v-card>
      </template>
    </edit-item-dialog>

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
import { ref } from 'vue'
import CartItemList from './cart/CartItemList.vue'
import CartSummary from './cart/CartSummary.vue'
import EditItemDialog from './cart/EditItemDialog.vue'
import OrderNotes from './cart/OrderNotes.vue'
import { useCart } from './cart/composables/useCart'

const { cartStore, updating, clearOrder, updateQuantity, removeItem, updateOrder } = useCart()

// Local state for edit dialog
const showEditDialog = ref(false)
const editingItem = ref(null)
const editingIndex = ref(null)

// Methods
const editItem = (item, index) => {
  editingItem.value = { ...item }
  editingIndex.value = index
  showEditDialog.value = true
}
</script>

<style scoped>
.pos-cart-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: rgb(250, 250, 250);
  border-radius: 8px;
  overflow: hidden;
}

.cart-header {
  background-color: white;
  border-bottom: 1px solid rgba(0, 0, 0, 0.12);
  flex-shrink: 0;
}

.cart-content {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 16px 0;
}

.cart-summary-wrapper {
  background-color: white;
  border-top: 1px solid rgba(0, 0, 0, 0.12);
  flex-shrink: 0;
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
