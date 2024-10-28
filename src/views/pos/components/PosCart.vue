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
          <tr v-for="(item, index) in cartStore.items" :key="index">
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
                  @click="editItem(item, index)"
                />
                <v-btn
                  icon="mdi-delete"
                  size="x-small"
                  variant="text"
                  color="error"
                  @click="removeItem(item.id, index)"
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
            <v-chip-group v-model="selectedQuickMods" multiple>
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
import { ref, computed, watch } from 'vue'
import { useCartStore } from '../../../stores/cart-store'
import { logger } from '../../../utils/logger'

const cartStore = useCartStore()

// Local state for discount inputs
const discountType = ref(cartStore.$state.discountType)
const discountValue = ref(cartStore.$state.discountValue)

// Edit dialog state
const showEditDialog = ref(false)
const editingItem = ref(null)
const editingIndex = ref(null)
const newModification = ref('')
const currentModifications = ref([])
const selectedQuickMods = ref([])
const splitQuantity = ref(1)

// Common modifications that can be quickly added
const commonModifications = [
  'No onions',
  'No tomato',
  'Extra cheese',
  'No sauce',
  'Spicy',
  'Well done'
]

// Computed
const canSplit = computed(() => {
  return editingItem.value &&
         splitQuantity.value > 0 &&
         splitQuantity.value < editingItem.value.quantity
})

// Format price from cents to dollars
const formatPrice = (price) => {
  if (!price) return '0.00'
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

// Watch for quick modification changes
watch(selectedQuickMods, (newMods) => {
  // Add only new modifications that aren't already in currentModifications
  const modsToAdd = newMods
    .map(index => commonModifications[index])
    .filter(mod => !currentModifications.value.includes(mod))
  
  currentModifications.value = [
    ...currentModifications.value,
    ...modsToAdd
  ]
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

const updateDiscount = () => {
  cartStore.setDiscount(discountType.value, Number(discountValue.value))
}

const editItem = (item, index) => {
  editingItem.value = { ...item }
  editingIndex.value = index
  currentModifications.value = [...(item.modifications || [])]
  selectedQuickMods.value = currentModifications.value
    .map(mod => commonModifications.indexOf(mod))
    .filter(index => index !== -1)
  showEditDialog.value = true
}

const addModification = () => {
  if (newModification.value && !currentModifications.value.includes(newModification.value)) {
    currentModifications.value.push(newModification.value)
    newModification.value = ''
  }
}

const removeModification = (index) => {
  currentModifications.value.splice(index, 1)
  // Update quick mods selection
  selectedQuickMods.value = currentModifications.value
    .map(mod => commonModifications.indexOf(mod))
    .filter(index => index !== -1)
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
  currentModifications.value = []
  selectedQuickMods.value = []
  newModification.value = ''
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

.discount-type-select :deep(.v-field__input) {
  padding: 0;
}
</style>