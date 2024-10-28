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
      <!-- Search and Categories -->
      <div class="mb-4">
        <v-text-field
          v-model="posStore.searchQuery"
          prepend-inner-icon="mdi-magnify"
          label="Search items"
          density="compact"
          hide-details
          @update:model-value="handleSearch"
        />
      </div>

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
      <div v-if="posStore.loading.items" class="d-flex justify-center ma-4">
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
            @click="selectProduct(item)"
            class="product-card h-100"
            elevation="2"
          >
            <v-img
              :src="getImageUrl(item)"
              height="200"
              cover
              class="bg-grey-lighten-2"
            />
            
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
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { usePosStore } from '@/stores/pos-store'
import { logger } from '@/utils/logger'

const posStore = usePosStore()
const selectedCategory = ref(posStore.selectedCategory)

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

const selectProduct = (product) => {
  logger.info('Product selected', { product })
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

.product-card:hover {
  transform: translateY(-2px);
}
</style>
