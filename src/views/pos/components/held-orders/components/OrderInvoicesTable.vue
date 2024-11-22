<!-- src/views/pos/components/held-orders/components/OrderInvoicesTable.vue -->
<template>
  <v-container class="px-2" v-if="loading">
    <v-skeleton-loader
      type="table-heading, table-row-divider, table-row@6"
      class="mx-auto"
    ></v-skeleton-loader>
  </v-container>
  
  <v-container class="px-2" v-else-if="!invoices.length">
    <v-row>
      <v-col cols="12" class="text-center">
        <p>No invoices found</p>
      </v-col>
    </v-row>
  </v-container>

  <v-container class="px-2" v-else>
    <v-table fixed-header height="600px" class="elevation-1 w-100">
      <thead>
        <tr>
          <th class="text-left" style="min-width: 100px">Invoice #</th>
          <th class="text-left" style="min-width: 100px">Type</th>
          <th class="text-left" style="min-width: 200px">Customer</th>
          <th class="text-left" style="min-width: 120px">Created</th>
          <th class="text-left" style="min-width: 100px">Items</th>
          <th class="text-left" style="min-width: 120px">Total</th>
          <th class="text-left" style="min-width: 100px">Status</th>
          <th class="text-left" style="min-width: 100px">Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="invoice in invoices" :key="invoice.id">
          <td>{{ invoice?.invoice_number || 'N/A' }}</td>
          <td>
            <v-chip
              :color="getOrderTypeColor(getOrderType(invoice))"
              size="small"
            >
              {{ getOrderType(invoice) || 'Unknown' }}
            </v-chip>
          </td>
          <td class="text-truncate" style="max-width: 200px">
            {{ invoice?.customer?.name || 'Walk-in Customer' }}
          </td>
          <td>{{ invoice?.created_at ? formatDate(invoice.created_at) : 'N/A' }}</td>
          <td>{{ Array.isArray(invoice?.items) ? invoice.items.length : 0 }} items</td>
          <td>{{ invoice?.total ? formatCurrency(invoice.total / 100) : formatCurrency(0) }}</td>
          <td>
            <v-chip
              :color="getStatusColor(invoice.status)"
              size="small"
              class="text-uppercase"
            >
              {{ invoice.status }}
            </v-chip>
          </td>
          <td>
            <v-btn
              size="small"
              color="primary"
              variant="elevated"
              @click="viewInvoice(invoice)"
            >
              <v-icon size="small" class="mr-1">mdi-eye</v-icon>
              View
            </v-btn>
          </td>
        </tr>
      </tbody>
    </v-table>
  </v-container>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  loading: {
    type: Boolean,
    default: false
  },
  invoices: {
    type: Array,
    required: true
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

const getStatusColor = (status) => {
  switch (status?.toUpperCase()) {
    case 'PAID':
      return 'success'
    case 'PENDING':
      return 'warning'
    case 'VOID':
      return 'error'
    default:
      return 'info'
  }
}

const viewInvoice = (invoice) => {
  // TODO: Implement invoice viewing functionality
  console.log('Viewing invoice:', invoice)
}
</script>

<style scoped>
.v-table {
  width: 100%;
}

.text-truncate {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
