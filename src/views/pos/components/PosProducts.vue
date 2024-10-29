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
      <!-- Search Bar -->
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
          <v-card
            :disabled="item.stock <= 0"
            elevation="2"
            class="product-card h-100"
            @click="selectProduct(item)"
          >
            <!-- Item Image -->
            <v-img
              :src="getImageUrl(item)"
              height="200"
              cover
              class="bg-grey-lighten-2"
            >
              <template v-slot:placeholder>
                <div class="d-flex align-center justify-center fill-height">
                  <v-progress-circular
                    color="grey-lighten-4"
                    indeterminate
                  />
                </div>
              </template>
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

            <!-- Quick Add Button -->
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
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { usePosStore } from '../../../stores/pos-store'
import { useCartStore } from '../../../stores/cart-store'
import { logger } from '../../../utils/logger'

const posStore = usePosStore()
const cartStore = useCartStore()

// Local state
const selectedCategory = ref(posStore.selectedCategory)
const showQuantityDialog = ref(false)
const selectedItem = ref(null)
const selectedQuantity = ref(1)

// Format price from cents to dollars
const formatPrice = (price) => {
  if (!price) return '0.00'
  const priceInDollars = Number(price) / 100
  return priceInDollars.toFixed(2)
}

// Get proper image URL
const getImageUrl = (item) => {
  if (item.media && item.media.length > 0 && item.media[0].original_url) {
    return item.media[0].original_url
  }
  if (item.picture) {
    return item.picture
  }
  return '/api/placeholder/400/320'
}

onMounted(async () => {
  logger.startGroup('POS Products Component: Mount')
  try {
    await posStore.initialize()
  } catch (err) {
    logger.error('Error during initialization', err)
  } finally {
    logger.endGroup()
  }
})

const handleSearch = async () => {
  logger.startGroup('POS Products: Search')
  try {
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
</script>

<style scoped>
.pos-products-container {
  height: 100%;
  overflow-y: auto;
}

.product-card {
  cursor: pointer;
  transition: transform 0.2s;
}

.product-card:not(:disabled):hover {
  transform: translateY(-2px);
}
</style>
