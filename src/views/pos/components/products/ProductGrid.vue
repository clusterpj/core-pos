<!-- src/views/pos/components/products/ProductGrid.vue -->
<template>
  <v-row>
    <v-col
      v-for="item in products"
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
        @click="$emit('select', item)"
      >
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
      </v-card>
    </v-col>
  </v-row>
</template>

<script setup>
defineProps({
  products: {
    type: Array,
    required: true
  }
})

defineEmits(['select'])

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
.product-card {
  cursor: pointer;
  transition: transform 0.2s;
}

.product-card:not(:disabled):hover {
  transform: translateY(-2px);
}
</style>
