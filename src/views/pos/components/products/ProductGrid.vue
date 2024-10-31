<!-- src/views/pos/components/products/ProductGrid.vue -->
<template>
  <div class="product-grid-container">
    <div class="product-grid-scroll">
      <v-row class="product-grid ma-0">
        <v-col
          v-for="item in displayedProducts"
          :key="item.id"
          :cols="12 / gridSettings.columns"
          class="product-grid-item"
        >
          <v-card
            elevation="2"
            class="product-card"
            :class="gridSettings.layout"
            @click="$emit('select', item)"
          >
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
              <div class="price-wrapper px-3 pb-3">
                <span class="text-primary price-text">${{ formatPrice(item.sale_price || item.price) }}</span>
              </div>
            </div>
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

const formatPrice = (price) => {
  if (!price) return '0.00'
  const priceInDollars = Number(price) / 100
  return priceInDollars.toFixed(2)
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
  height: 100%;
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
  transition: transform 0.2s;
  display: flex;
  flex-direction: column;
}

.product-card.comfortable {
  height: v-bind(getCardHeight);
}

.product-card.compact {
  height: v-bind(getCardHeight);
}

.product-card:not(:disabled):hover {
  transform: translateY(-2px);
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
