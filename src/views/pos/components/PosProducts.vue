<!-- src/views/pos/components/PosProducts.vue -->
<template>
  <div class="pos-products-container">
    <!-- System Prerequisites Check -->
    <v-alert
      v-if="!posStore.systemReady"
      type="warning"
      class="ma-2"
    >
      {{ posStore.setupMessage }}
    </v-alert>

    <template v-else>
      <div class="products-header">
        <v-container fluid class="pa-4">
          <!-- Search and Grid Settings Row -->
          <v-row no-gutters align="center" class="mb-4 flex-column flex-sm-row">
            <v-col cols="12" sm="7" md="8" lg="9" class="pe-sm-4 mb-3 mb-sm-0">
              <div class="search-field">
                <product-search @search="handleSearch" />
              </div>
            </v-col>
            <v-col cols="12" sm="5" md="4" lg="3" class="d-flex justify-end align-center">
              <v-btn
                prepend-icon="mdi-cog"
                variant="outlined"
                color="primary"
                size="small"
                class="grid-settings-btn"
                @click="showGridSettings = true"
              >
                Grid Settings
              </v-btn>

              <v-dialog
                v-model="showGridSettings"
                max-width="700"
                transition="dialog-bottom-transition"
              >
                <v-card>
                  <v-card-title class="d-flex justify-space-between align-center pa-4">
                    <span>Grid Display Settings</span>
                    <v-btn
                      icon="mdi-close"
                      variant="text"
                      size="small"
                      @click="showGridSettings = false"
                    />
                  </v-card-title>
                  
                  <v-card-text class="pa-6">
                    <grid-settings
                      v-model="gridSettings"
                      @update:model-value="updateGridSettings"
                    />
                  </v-card-text>
                </v-card>
              </v-dialog>
            </v-col>
          </v-row>

          <!-- Categories Row -->
          <v-row no-gutters>
            <v-col cols="12">
              <category-tabs
                :categories="posStore.categoriesForDisplay"
                @change="handleCategoryChange"
              />
            </v-col>
          </v-row>
        </v-container>
      </div>

      <v-container fluid class="products-content pa-0">
        <!-- Loading State -->
        <div v-if="posStore.loading.products" class="d-flex justify-center align-center" style="min-height: 200px;">
          <v-progress-circular
            indeterminate
            color="primary"
            size="32"
          />
        </div>

        <!-- Products Grid -->
        <template v-else>
          <product-grid
            v-if="posStore.products.length > 0"
            :products="posStore.products"
            :grid-settings="gridSettings"
            @select="quickAdd"
          />

          <!-- Empty State -->
          <v-alert
            v-else
            type="info"
            variant="tonal"
            class="mx-4"
          >
            <template v-slot:prepend>
              <v-icon icon="mdi-information" />
            </template>
            No items found
          </v-alert>
        </template>
      </v-container>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
const showGridSettings = ref(false)
import { usePosStore } from '../../../stores/pos-store'
import { useCartStore } from '../../../stores/cart-store'
import { logger } from '../../../utils/logger'

import ProductSearch from './products/ProductSearch.vue'
import CategoryTabs from './products/CategoryTabs.vue'
import ProductGrid from './products/ProductGrid.vue'
import GridSettings from './products/GridSettings.vue'

const posStore = usePosStore()
const cartStore = useCartStore()

// Grid Settings with localStorage persistence
const gridSettings = ref(
  JSON.parse(localStorage.getItem('gridSettings')) || {
    layout: 'comfortable',
    columns: 4,
    rows: 3
  }
)

// Save grid settings to localStorage when they change
const updateGridSettings = (newSettings) => {
  gridSettings.value = newSettings
  localStorage.setItem('gridSettings', JSON.stringify(newSettings))
  showGridSettings.value = false
}

watch(gridSettings, (newSettings) => {
  localStorage.setItem('gridSettings', JSON.stringify(newSettings))
}, { deep: true })

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
  display: flex;
  flex-direction: column;
  background-color: rgb(250, 250, 250);
  overflow: hidden;
}

@media (max-width: 600px) {
  .pos-products-container {
    max-height: calc(100vh - 120px); /* Account for mobile footer */
  }
  
  .products-header .v-container {
    padding: 8px;
  }
  
  .grid-settings-btn {
    min-width: auto;
    padding: 0 12px;
  }
}

.products-header {
  background-color: white;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.03);
  position: sticky;
  top: 0;
  z-index: 2;
}

.search-field {
  width: 100%;
  max-width: 800px;
}

.grid-settings-btn {
  min-width: 135px;
}


.products-content {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  padding: 16px 0;
}

/* Tablet Optimizations */
@media (max-width: 960px) {
  .products-header {
    padding: 8px 0;
  }
}

/* Mobile Optimizations */
@media (max-width: 600px) {
  .products-header .v-container {
    padding: 8px 12px;
  }
  
  .search-field {
    max-width: 100%;
  }
}
</style>
