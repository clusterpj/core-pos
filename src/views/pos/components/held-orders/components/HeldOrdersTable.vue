<!-- src/views/pos/components/held-orders/components/HeldOrdersTable.vue -->
<template>
  <v-table fixed-header height="500px">
    <thead>
      <tr>
        <th class="text-left" style="min-width: 100px">Type</th>
        <th class="text-left" style="min-width: 200px">Description</th>
        <th class="text-left" style="min-width: 120px">Date</th>
        <th class="text-left" style="min-width: 100px">Items</th>
        <th class="text-left" style="min-width: 120px">Total</th>
        <th class="text-left" style="min-width: 300px">Actions</th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="invoice in invoices" :key="invoice.id">
        <td>
          <v-chip
            :color="getOrderTypeColor(getOrderType(invoice))"
            size="small"
          >
            {{ getOrderType(invoice) }}
          </v-chip>
        </td>
        <td class="text-truncate" style="max-width: 200px">
          {{ invoice.description }}
        </td>
        <td>{{ formatDate(invoice.created_at) }}</td>
        <td>{{ invoice.hold_items?.length || 0 }} items</td>
        <td>{{ formatCurrency(invoice.total / 100) }}</td>
        <td>
          <div class="d-flex gap-2">
            <v-btn
              size="small"
              color="info"
              variant="elevated"
              @click="$emit('load', invoice)"
              :loading="loadingOrder === invoice.id"
              :disabled="convertingOrder === invoice.id || deletingOrder === invoice.id"
            >
              <v-icon size="small" class="mr-1">mdi-cart-arrow-down</v-icon>
              Load
            </v-btn>
            <v-btn
              size="small"
              color="success"
              variant="elevated"
              @click="handleConvert(invoice)"
              :loading="convertingOrder === invoice.id"
              :disabled="loadingOrder === invoice.id || deletingOrder === invoice.id"
            >
              <v-icon size="small" class="mr-1">mdi-file-document-arrow-right</v-icon>
              Convert
            </v-btn>
            <v-btn
              size="small"
              color="error"
              variant="elevated"
              @click="$emit('delete', invoice)"
              :loading="deletingOrder === invoice.id"
              :disabled="loadingOrder === invoice.id || convertingOrder === invoice.id"
            >
              <v-icon size="small" class="mr-1">mdi-delete</v-icon>
              Delete
            </v-btn>
          </div>
        </td>
      </tr>
    </tbody>
  </v-table>
</template>

<script setup>
const props = defineProps({
  invoices: {
    type: Array,
    required: true
  },
  loadingOrder: {
    type: [String, Number],
    default: null
  },
  convertingOrder: {
    type: [String, Number],
    default: null
  },
  deletingOrder: {
    type: [String, Number],
    default: null
  },
  getOrderType: {
    type: Function,
    required: true
  },
  getOrderTypeColor: {
    type: Function,
    required: true
  },
  formatDate: {
    type: Function,
    required: true
  },
  formatCurrency: {
    type: Function,
    required: true
  }
})

const emit = defineEmits(['load', 'convert', 'delete'])

const handleConvert = (invoice) => {
  console.log('HeldOrdersTable: Convert button clicked for invoice:', invoice)
  console.log('HeldOrdersTable: Emitting convert event with invoice data:', {
    id: invoice.id,
    description: invoice.description,
    total: invoice.total,
    items: invoice.hold_items?.length
  })
  emit('convert', invoice)
}
</script>

<style scoped>
.v-table {
  width: 100%;
}

.gap-2 {
  gap: 8px;
}

.text-truncate {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
