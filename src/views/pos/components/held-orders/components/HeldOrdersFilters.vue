<!-- src/views/pos/components/held-orders/components/HeldOrdersFilters.vue -->
<template>
  <v-row>
    <!-- Search Field -->
    <v-col cols="12" sm="4">
      <v-text-field
        :model-value="search"
        @update:model-value="$emit('update:search', $event)"
        label="Search orders"
        prepend-inner-icon="mdi-magnify"
        variant="outlined"
        density="comfortable"
      ></v-text-field>
    </v-col>
    
    <!-- Type Filter -->
    <v-col cols="12" sm="4">
      <v-select
        :model-value="selectedType"
        @update:model-value="$emit('update:selectedType', $event)"
        :items="orderTypes"
        label="Filter by type"
        variant="outlined"
        density="comfortable"
        prepend-inner-icon="mdi-filter"
      ></v-select>
    </v-col>

    <!-- Status Filter -->
    <v-col cols="12" sm="4">
      <v-select
        :model-value="selectedStatus"
        @update:model-value="$emit('update:selectedStatus', $event)"
        :items="statusTypes"
        label="Filter by status"
        variant="outlined"
        density="comfortable"
        prepend-inner-icon="mdi-filter-variant"
      ></v-select>
    </v-col>
  </v-row>
</template>

<script setup>
import { PaidStatus, InvoiceStatus } from '../../../../../types/order'

const props = defineProps({
  search: {
    type: String,
    required: true
  },
  selectedType: {
    type: String,
    required: true
  },
  selectedStatus: {
    type: String,
    required: true,
    default: 'ALL'
  },
  orderTypes: {
    type: Array,
    required: true
  },
  mode: {
    type: String,
    default: 'active', // 'active', 'delivery', or 'history'
    required: false
  }
})

const statusTypes = computed(() => {
  switch (props.mode) {
    case 'active':
      return [
        { title: 'All Status', value: 'ALL' },
        { title: 'Paid', value: PaidStatus.PAID },
        { title: 'Unpaid', value: PaidStatus.UNPAID }
      ]
    case 'delivery':
    case 'history':
      return [
        { title: 'All Status', value: 'ALL' },
        { title: 'Pending', value: InvoiceStatus.PENDING },
        { title: 'Generated', value: InvoiceStatus.GENERATED },
        { title: 'Failed', value: InvoiceStatus.FAILED },
        { title: 'Cancelled', value: InvoiceStatus.CANCELLED }
      ]
    default:
      return [
        { title: 'All Status', value: 'ALL' }
      ]
  }
})

defineEmits(['update:search', 'update:selectedType', 'update:selectedStatus'])
</script>
