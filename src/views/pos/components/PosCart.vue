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
    <template v-else>
      <cart-item-list
        :items="cartStore.items"
        @edit="editItem"
        @remove="removeItem"
        @update-quantity="updateQuantity"
      />
    </template>

    <!-- Order Summary -->
    <cart-summary
      :subtotal="cartStore.subtotal"
      :discount-amount="cartStore.discountAmount"
      :tax-rate="cartStore.taxRate"
      :tax-amount="cartStore.taxAmount"
      :total="cartStore.total"
    />

    <!-- Edit Item Dialog -->
    <v-dialog v-model="showEditDialog" max-width="500">
      <v-card>
        <v-card-title class="d-flex justify-space-between align-center">
          {{ editingItem?.name }}
          <v-chip>Qty: {{ editingItem?.quantity || 0 }}</v-chip>
        </v-card-title>

        <v-card-text>
          <!-- Quick Modifications -->
          <div class="mb-4">
            <div class="text-subtitle-2 mb-2">Quick Modifications</div>
            <v-chip-group v-model="selectedQuickMods" multiple @update:modelValue="handleQuickModsChange">
              <v-chip
                v-for="mod in commonModifications"
                :key="mod"
                filter
                variant="outlined"
              >
                {{ mod }}
              </v-chip>
            </v-chip-group>
          </div>

          <!-- Custom Modifications -->
          <div class="mb-4">
            <div class="text-subtitle-2 mb-2">Custom Modifications</div>
            <div class="d-flex gap-2 mb-2">
              <v-text-field
                v-model="newModification"
                placeholder="Add modification"
                density="compact"
                hide-details
                @keyup.enter="addModification"
              />
              <v-btn
                color="primary"
                @click="addModification"
                :disabled="!newModification"
              >
                Add
              </v-btn>
            </div>
          </div>

          <!-- Current Modifications -->
          <v-list v-if="currentModifications.length > 0" density="compact" class="bg-grey-lighten-4">
            <v-list-item
              v-for="(mod, index) in currentModifications"
              :key="index"
              :title="mod"
            >
              <template v-slot:append>
                <v-btn
                  icon="mdi-delete"
                  size="x-small"
                  variant="text"
                  color="error"
                  @click="removeModification(index)"
                />
              </template>
            </v-list-item>
          </v-list>

          <!-- Split Item Option -->
          <v-divider class="my-4" />
          
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
            @click="saveModifications"
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
import { useCartStore } from '@/stores/cart-store'
import { useCartModifications } from '../composables/useCartModifications'
import CartItemList from './cart/CartItemList.vue'
import CartSummary from './cart/CartSummary.vue'

const cartStore = useCartStore()

// Local state
const showEditDialog = ref(false)
const editingItem = ref(null)
const editingIndex = ref(null)
const splitQuantity = ref(1)

// Composables
const {
  currentModifications,
  selectedQuickMods,
  newModification,
  commonModifications,
  addModification,
  removeModification,
  resetModifications,
  initializeModifications
} = useCartModifications()

// Computed
const canSplit = computed(() => {
  return editingItem.value &&
         splitQuantity.value > 0 &&
         splitQuantity.value < editingItem.value.quantity
})

// Methods
const handleQuickModsChange = (selectedIndices) => {
  // Clear current modifications
  currentModifications.value = []
  
  // Add selected quick modifications
  selectedIndices.forEach(index => {
    if (index >= 0 && index < commonModifications.length) {
      currentModifications.value.push(commonModifications[index])
    }
  })
}

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
  initializeModifications(item.modifications)
  showEditDialog.value = true
}

const splitItem = () => {
  if (canSplit.value) {
    cartStore.splitItem(
      editingIndex.value,
      Number(splitQuantity.value),
      currentModifications.value
    )
    closeEditDialog()
  }
}

const saveModifications = () => {
  cartStore.updateItemModifications(editingIndex.value, currentModifications.value)
  closeEditDialog()
}

const closeEditDialog = () => {
  showEditDialog.value = false
  editingItem.value = null
  editingIndex.value = null
  resetModifications()
  splitQuantity.value = 1
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
</style>
