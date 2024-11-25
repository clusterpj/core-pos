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

  <v-container v-else class="px-2 d-flex flex-column">
    <v-table fixed-header height="550px" class="elevation-1 w-100">
      <thead>
        <tr>
          <th class="text-left" style="min-width: 150px">Date</th>
          <th class="text-left" style="min-width: 150px">Invoice Number</th>
          <th class="text-left" style="min-width: 200px">Customer</th>
          <th class="text-left" style="min-width: 120px">Status</th>
          <th class="text-left" style="min-width: 120px">Payment Status</th>
          <th class="text-right" style="min-width: 150px">Total</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="invoice in invoices" :key="invoice.id">
          <td>{{ invoice?.created_at ? formatDate(invoice.created_at) : 'N/A' }}</td>
          <td>{{ invoice?.invoice_number || 'N/A' }}</td>
          <td class="text-truncate" style="max-width: 200px">
            {{ invoice?.customer?.name || 'Walk-in Customer' }}
          </td>
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
            <v-chip
              :color="getPaidStatusColor(invoice.paid_status)"
              size="small"
              class="text-uppercase"
            >
              {{ invoice.paid_status || 'UNPAID' }}
            </v-chip>
          </td>
          <td class="text-right">
            {{ invoice?.total ? formatCurrency(invoice.total / 100) : formatCurrency(0) }}
          </td>
        </tr>
      </tbody>
    </v-table>
    
    <div v-if="showPagination" class="d-flex justify-center align-center mt-4">
      <v-pagination
        :model-value="page"
        @update:model-value="$emit('update:page', $event)"
        :length="totalPages"
        :total-visible="7"
        rounded="circle"
      ></v-pagination>
    </div>
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
  },
  showPagination: {
    type: Boolean,
    default: false
  },
  page: {
    type: Number,
    default: 1
  },
  totalPages: {
    type: Number,
    default: 1
  }
})

defineEmits(['update:page'])

const getStatusColor = (status) => {
  switch (status?.toUpperCase()) {
    case 'COMPLETED':
      return 'success'
    case 'SENT':
      return 'info'
    case 'VIEWED':
      return 'primary'
    case 'OVERDUE':
      return 'error'
    case 'DUE':
      return 'warning'
    case 'DRAFT':
    case 'SAVE_DRAFT':
      return 'grey'
    default:
      return 'info'
  }
}

const getPaidStatusColor = (status) => {
  switch (status?.toUpperCase()) {
    case 'PAID':
      return 'success'
    case 'PARTIALLY_PAID':
      return 'warning'
    case 'UNPAID':
      return 'error'
    default:
      return 'error'
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
