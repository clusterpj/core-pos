<!-- src/views/pos/components/products/ProductGrid.vue -->
<template>
  <div class="product-grid-container">
    <div class="product-grid-scroll">
      <v-row class="product-grid ma-0">
        <v-col
          v-for="item in displayedProducts"
          :key="item.id"
          :cols="gridSettings.layout === 'list' ? 12 : 12 / gridSettings.columns"
          class="product-grid-item"
        >
          <v-card
            elevation="0"
            class="product-card"
            :class="[gridSettings.layout, 'rounded-lg']"
            @click="$emit('select', item)"
          >
            <template v-if="gridSettings.layout !== 'list'">
              <v-img
                :src="getImageUrl(item)"
                :height="getImageHeight"
                cover
                class="bg-grey-lighten-2"
              >
                <template v-slot:placeholder>
                  <div class="d-flex align-center justify-center fill-height">
                    <v-progress-circular
                      color="grey-lighten-4"
                      indeterminate
                      size="20"
                    />
                  </div>
                </template>
              </v-img>
                
              <div class="product-info">
                <div class="product-title px-3 pt-3">{{ item.name }}</div>
                <div class="d-flex align-center justify-space-between px-3 pb-3">
                  <span class="text-primary price-text">${{ formatPrice(item.sale_price || item.price) }}</span>
                  <v-btn
                    density="comfortable"
                    variant="tonal"
                    color="primary"
                    size="small"
                    icon="mdi-plus"
                    class="add-btn"
                  />
                </div>
              </div>
            </template>

            <template v-else>
              <div class="d-flex align-center pa-3">
                <div class="flex-grow-1">
                  <div class="product-title mb-1">{{ item.name }}</div>
                  <div class="text-primary price-text">${{ formatPrice(item.sale_price || item.price) }}</div>
                </div>
                <v-btn
                  density="comfortable"
                  variant="tonal"
                  color="primary"
                  size="small"
                  icon="mdi-plus"
                  class="add-btn ms-2"
                />
              </div>
            </template>
          </v-card>
        </v-col>
      </v-row>
    </div>

    <!-- Pagination -->
    <div class="pagination-wrapper">
      <v-pagination
        v-model="currentPage"
        :length="totalPages"
        :total-visible="7"
        density="compact"
        @update:model-value="handlePageChange"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
  products: {
    type: Array,
    required: true
  },
  gridSettings: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['select'])

// Computed values based on grid settings
const getImageHeight = computed(() => {
  return props.gridSettings.layout === 'comfortable' ? '160' : '120'
})

const getCardHeight = computed(() => {
  return props.gridSettings.layout === 'comfortable' ? '260px' : '200px'
})

// Pagination
const itemsPerPage = computed(() => {
  return props.gridSettings.columns * props.gridSettings.rows
})

const currentPage = ref(1)

const totalPages = computed(() => {
  return Math.ceil(props.products.length / itemsPerPage.value)
})

const displayedProducts = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value
  const end = start + itemsPerPage.value
  return props.products.slice(start, end)
})

// Reset pagination when products or grid settings change
watch([() => props.products, () => props.gridSettings], () => {
  currentPage.value = 1
})

const handlePageChange = (page) => {
  currentPage.value = page
}

// Format price for display, converting from cents to dollars if needed
const formatPrice = (price) => {
  if (!price) return '0.00'
  // If price is in cents (> 100), convert to dollars
  const dollars = price > 100 ? price / 100 : price
  return Number(dollars).toFixed(2)
}

const getImageUrl = (item) => {
  if (item.media && item.media.length > 0 && item.media[0].original_url) {
    return item.media[0].original_url
  }
  if (item.picture) {
    return item.picture
  }
  return '/api/placeholder/400/320'
}
</script>

<style scoped>
.product-grid-container {
  display: flex;
  flex-direction: column;
  height: 100% !important;
  min-height: 100% !important;
  width: 100% !important;
  overflow: hidden;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
}

.product-grid-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

@media (max-width: 600px) {
  .product-grid-container {
    height: calc(100% - 16px);
  }
  
  .pagination-wrapper {
    padding: 4px;
  }
}

.product-grid-scroll {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
  padding-bottom: 60px; /* Ensure space for footer */
}

.product-grid {
  padding: 4px;
  height: 100%;
}

.product-grid-item {
  padding: 4px;
}

.product-card {
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  flex-direction: column;
  border: 1px solid rgba(0, 0, 0, 0.08);
  background: white;
}

.product-card:hover {
  border-color: rgba(var(--v-theme-primary), 0.5);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08) !important;
  transform: translateY(-2px);
}

.product-card.comfortable {
  height: v-bind(getCardHeight);
}

.product-card.compact {
  height: v-bind(getCardHeight);
}

.product-card.list {
  height: auto;
  margin-bottom: 4px;
}

.product-card.list .product-title {
  height: auto;
  font-size: 0.95rem;
  -webkit-line-clamp: 1;
}

.add-btn {
  opacity: 0.9;
  transition: all 0.2s ease;
}

.product-card:hover .add-btn {
  opacity: 1;
  transform: scale(1.05);
}

.add-btn:hover {
  transform: scale(1.1) !important;
}

.product-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.product-title {
  font-size: 0.85rem;
  line-height: 1.2;
  height: 2.4em;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  white-space: normal;
}

.comfortable .product-title {
  font-size: 1rem;
}

.price-text {
  font-size: 1.2rem;
  font-weight: bold;
}

.comfortable .price-text {
  font-size: 1.4rem;
}

.pagination-wrapper {
  padding: 8px;
  background: white;
  border-top: 1px solid rgba(0, 0, 0, 0.12);
  position: sticky;
  bottom: 0;
  z-index: 1;
}

/* Mobile & Tablet Optimizations */
@media (max-width: 960px) {
  .product-card.comfortable {
    height: 240px;
  }
  
  .product-card.compact {
    height: 180px;
  }
  
  .comfortable .product-title {
    font-size: 0.9rem;
  }
  
  .comfortable .price-text {
    font-size: 1.3rem;
  }
}
</style>
