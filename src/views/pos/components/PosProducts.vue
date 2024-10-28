<!-- src/views/pos/components/PosProducts.vue -->
<template>
  <div class="pos-products-container pa-4">
    <!-- System Prerequisites Check -->
    <v-alert
      v-if="!posStore.systemReady"
      type="warning"
      class="mb-4"
    >
      {{ posStore.setupMessage }}
    </v-alert>

    <template v-else>
      <!-- Search and Actions Bar -->
      <div class="d-flex gap-2 mb-4">
        <v-text-field
          v-model="posStore.searchQuery"
          prepend-inner-icon="mdi-magnify"
          label="Search items"
          density="compact"
          hide-details
          class="flex-grow-1"
          @update:model-value="handleSearch"
        />
        
        <!-- Item Management Actions -->
        <v-btn
          color="success"
          prepend-icon="mdi-plus"
          @click="openItemModal()"
        >
          New Item
        </v-btn>
        
        <v-btn
          v-if="selectedItems.length > 0"
          color="error"
          prepend-icon="mdi-delete"
          @click="confirmDeleteSelected"
        >
          Delete ({{ selectedItems.length }})
        </v-btn>
      </div>

      <!-- Categories -->
      <v-tabs
        v-model="selectedCategory"
        density="compact"
        class="mb-4"
        show-arrows
        @update:model-value="handleCategoryChange"
      >
        <v-tab value="all">All Items</v-tab>
        <v-tab
          v-for="category in posStore.categoriesForDisplay"
          :key="category.id"
          :value="category.id"
        >
          {{ category.name }}
        </v-tab>
      </v-tabs>

      <!-- Loading State -->
      <div v-if="posStore.loading.products" class="d-flex justify-center ma-4">
        <v-progress-circular indeterminate color="primary" />
      </div>

      <!-- Error State -->
      <v-alert
        v-else-if="posStore.error"
        type="error"
        class="ma-4"
      >
        {{ posStore.error }}
      </v-alert>

      <!-- Products Grid -->
      <v-row v-else-if="posStore.products.length > 0">
        <v-col
          v-for="item in posStore.products"
          :key="item.id"
          cols="12"
          sm="6"
          md="4"
          lg="3"
        >
          <v-hover v-slot="{ isHovering, props: hoverProps }">
            <v-card
              v-bind="hoverProps"
              :disabled="item.stock <= 0"
              elevation="2"
              class="product-card h-100"
            >
              <!-- Selection Checkbox -->
              <v-checkbox
                v-show="isHovering || isSelected(item.id)"
                v-model="selectedItems"
                :value="item.id"
                class="item-select-checkbox ma-2"
                hide-details
                @click.stop
              />

              <!-- Item Image -->
              <v-img
                :src="getImageUrl(item)"
                height="200"
                cover
                class="bg-grey-lighten-2"
                @click="selectProduct(item)"
              >
                <!-- Management Actions Overlay -->
                <template v-slot:placeholder>
                  <div class="d-flex align-center justify-center fill-height">
                    <v-progress-circular
                      color="grey-lighten-4"
                      indeterminate
                    />
                  </div>
                </template>

                <div
                  v-show="isHovering"
                  class="d-flex justify-end pa-2 management-overlay"
                >
                  <v-btn
                    icon="mdi-pencil"
                    size="small"
                    color="primary"
                    variant="flat"
                    class="mr-2"
                    @click.stop="openItemModal(item)"
                  />
                  <v-btn
                    icon="mdi-delete"
                    size="small"
                    color="error"
                    variant="flat"
                    @click.stop="confirmDelete(item)"
                  />
                </div>
              </v-img>
              
              <v-card-title class="text-subtitle-1 py-2">
                {{ item.name }}
              </v-card-title>

              <v-card-text class="py-2">
                <div class="d-flex justify-space-between align-center">
                  <span class="text-primary text-h6">
                    ${{ formatPrice(item.sale_price || item.price) }}
                  </span>
                  <v-chip
                    size="small"
                    :color="item.stock > 0 ? 'success' : 'error'"
                  >
                    {{ item.stock > 0 ? 'In Stock' : 'Out of Stock' }}
                  </v-chip>
                </div>
              </v-card-text>

              <!-- Quick Add Buttons -->
              <v-card-actions v-if="item.stock > 0">
                <v-btn
                  variant="text"
                  color="primary"
                  block
                  @click.stop="quickAdd(item)"
                >
                  Add to Cart
                </v-btn>
              </v-card-actions>
            </v-card>
          </v-hover>
        </v-col>
      </v-row>

      <!-- Empty State -->
      <v-alert
        v-else
        type="info"
        class="ma-4"
      >
        No items found
      </v-alert>

      <!-- Pagination -->
      <div 
        v-if="posStore.products.length > 0"
        class="d-flex justify-center mt-4"
      >
        <v-pagination
          v-model="posStore.currentPage"
          :length="Math.ceil(posStore.totalItems / posStore.itemsPerPage)"
          @update:model-value="posStore.setPage"
        />
      </div>
    </template>

    <!-- Item Management Modal -->
    <ItemManagementModal
      v-model="showItemModal"
      :edit-item="editingItem"
      @item-saved="handleItemSaved"
    />

    <!-- Product Selection Dialog -->
    <v-dialog
      v-model="showQuantityDialog"
      max-width="400px"
    >
      <v-card>
        <v-card-title>
          {{ selectedItem?.name }}
        </v-card-title>

        <v-card-text>
          <v-text-field
            v-model="selectedQuantity"
            label="Quantity"
            type="number"
            min="1"
            :max="selectedItem?.stock"
            density="compact"
            hide-details
            class="mb-4"
          />

          <div class="d-flex gap-2 mb-4">
            <v-btn
              v-for="qty in [1, 2, 5, 10]"
              :key="qty"
              variant="outlined"
              size="small"
              :disabled="selectedItem?.stock < qty"
              @click="selectedQuantity = qty"
            >
              {{ qty }}
            </v-btn>
          </div>
        </v-card-text>

        <v-card-actions>
          <v-spacer />
          <v-btn
            color="grey"
            variant="text"
            @click="showQuantityDialog = false"
          >
            Cancel
          </v-btn>
          <v-btn
            color="primary"
            @click="addToCart"
            :disabled="!selectedQuantity || selectedQuantity < 1"
          >
            Add to Cart
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Delete Confirmation Dialog -->
    <v-dialog v-model="showDeleteDialog" max-width="400">
      <v-card>
        <v-card-title>Confirm Delete</v-card-title>
        <v-card-text>
          Are you sure you want to delete {{ deletingMultiple ? `${selectedItems.length} items` : 'this item' }}?
          This action cannot be undone.
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn
            color="grey"
            variant="text"
            @click="showDeleteDialog = false"
          >
            Cancel
          </v-btn>
          <v-btn
            color="error"
            :loading="posStore.loading.itemOperation"
            @click="deleteConfirmed"
          >
            Delete
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { usePosStore } from '@/stores/pos-store'
import { useCartStore } from '@/stores/cart-store'
import { logger } from '@/utils/logger'
import ItemManagementModal from './ItemManagementModal.vue'

const posStore = usePosStore()
const cartStore = useCartStore()

// Local state
const selectedCategory = ref(posStore.selectedCategory)
const showQuantityDialog = ref(false)
const selectedItem = ref(null)
const selectedQuantity = ref(1)
const selectedItems = ref([])
const showItemModal = ref(false)
const editingItem = ref(null)
const showDeleteDialog = ref(false)
const itemToDelete = ref(null)

// Computed
const deletingMultiple = computed(() => selectedItems.value.length > 0 && !itemToDelete.value)

// Format price from cents to dollars
const formatPrice = (price) => {
  if (!price) return '0.00'
  const priceInDollars = Number(price) / 100
  return priceInDollars.toFixed(2)
}

// Get proper image URL
const getImageUrl = (item) => {
  // First try to get the image from media array
  if (item.media && item.media.length > 0 && item.media[0].original_url) {
    return item.media[0].original_url
  }
  
  // Then try the picture field
  if (item.picture) {
    return item.picture
  }
  
  // Finally fallback to placeholder
  return '/api/placeholder/400/320'
}

// Check if item is selected
const isSelected = (itemId) => {
  return selectedItems.value.includes(itemId)
}

onMounted(async () => {
  logger.startGroup('POS Products Component: Mount')
  logger.info('Component mounted, initializing store')
  
  try {
    await posStore.initialize()
    logger.info('Store initialized successfully')
  } catch (err) {
    logger.error('Error during initialization', err)
  } finally {
    logger.endGroup()
  }
})

const handleSearch = async () => {
  logger.startGroup('POS Products: Search')
  try {
    logger.info('Handling search', { query: posStore.searchQuery })
    await posStore.fetchProducts()
  } catch (err) {
    logger.error('Search failed', err)
  } finally {
    logger.endGroup()
  }
}

const handleCategoryChange = async (categoryId) => {
  logger.startGroup('POS Products: Category Change')
  try {
    logger.info('Handling category change', { categoryId })
    await posStore.setCategory(categoryId)
  } catch (err) {
    logger.error('Category change failed', err)
  } finally {
    logger.endGroup()
  }
}

// Product Selection and Cart Operations
const selectProduct = (product) => {
  if (product.stock <= 0) return
  
  logger.info('Product selected', { product })
  selectedItem.value = product
  selectedQuantity.value = 1
  showQuantityDialog.value = true
}

const quickAdd = (product) => {
  if (product.stock <= 0) return
  
  logger.info('Quick adding product', { product })
  cartStore.addItem(product, 1)
}

const addToCart = () => {
  if (!selectedItem.value || !selectedQuantity.value) return
  
  logger.info('Adding to cart', {
    product: selectedItem.value,
    quantity: selectedQuantity.value
  })
  
  cartStore.addItem(selectedItem.value, Number(selectedQuantity.value))
  showQuantityDialog.value = false
  selectedItem.value = null
  selectedQuantity.value = 1
}

// Item Management Operations
const openItemModal = (item = null) => {
  editingItem.value = item
  showItemModal.value = true
}

const handleItemSaved = async (response) => {
  logger.info('Item saved:', response)
  // Refresh products list
  await posStore.fetchProducts()
}

const confirmDelete = (item) => {
  itemToDelete.value = item
  showDeleteDialog.value = true
}

const confirmDeleteSelected = () => {
  itemToDelete.value = null
  showDeleteDialog.value = true
}

const deleteConfirmed = async () => {
  try {
    if (deletingMultiple.value) {
      await posStore.deleteMultipleItems(selectedItems.value)
      selectedItems.value = []
    } else {
      await posStore.deleteItem(itemToDelete.value.id)
    }
    showDeleteDialog.value = false
    itemToDelete.value = null
  } catch (error) {
    logger.error('Delete operation failed:', error)
  }
}
</script>

<style scoped>
.pos-products-container {
  height: 100%;
  overflow-y: auto;
}

.product-card {
  cursor: pointer;
  transition: transform 0.2s;
  position: relative;
}

.product-card:not(:disabled):hover {
  transform: translateY(-2px);
}

.item-select-checkbox {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 1;
}

.management-overlay {
  position: absolute;
  top: 0;
  right: 0;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 0 0 0 8px;
}
</style>