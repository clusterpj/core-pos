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
      <product-search @search="handleSearch" />

      <!-- Categories -->
      <category-tabs
        :categories="posStore.categoriesForDisplay"
        @change="handleCategoryChange"
      />

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
      <template v-else>
        <product-grid
          v-if="posStore.products.length > 0"
          :products="posStore.products"
          @select="quickAdd"
        />

        <!-- Empty State -->
        <v-alert
          v-else
          type="info"
          class="ma-4"
        >
          No items found
        </v-alert>
      </template>

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
import { onMounted } from 'vue'
import { usePosStore } from '@/stores/pos-store'
import { useCartStore } from '@/stores/cart-store'
import { logger } from '@/utils/logger'

import ProductSearch from './products/ProductSearch.vue'
import CategoryTabs from './products/CategoryTabs.vue'
import ProductGrid from './products/ProductGrid.vue'

const posStore = usePosStore()
const cartStore = useCartStore()

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

const handleSearch = async (query) => {
  logger.startGroup('POS Products: Search')
  try {
    posStore.searchQuery = query
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

const quickAdd = (product) => {
  if (product.stock <= 0) return
  
  logger.info('Quick adding product', { product })
  cartStore.addItem(product, 1)
}
</script>

<style scoped>
.pos-products-container {
  height: 100%;
  overflow-y: auto;
}
</style>
