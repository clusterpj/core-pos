<!-- src/views/pos/components/held-orders/components/OrderInvoicesTable.vue -->
<template>
  <v-container class="px-2">
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
          <td>{{ invoice.invoice_number }}</td>
          <td>
            <v-chip
              :color="getOrderTypeColor(getOrderType(invoice))"
              size="small"
            >
              {{ getOrderType(invoice) }}
            </v-chip>
          </td>
          <td class="text-truncate" style="max-width: 200px">
            {{ invoice.customer?.name || 'Walk-in Customer' }}
          </td>
          <td>{{ formatDate(invoice.created_at) }}</td>
          <td>{{ invoice.items?.length || 0 }} items</td>
          <td>{{ formatCurrency(invoice.total / 100) }}</td>
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
const props = defineProps({
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
