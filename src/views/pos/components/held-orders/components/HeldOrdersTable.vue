<!-- src/views/pos/components/held-orders/components/HeldOrdersTable.vue -->
<template>
  <div class="table-wrapper">
    <div class="filters-row">
      <div class="search-field">
        <v-text-field
          v-model="searchQuery"
          prepend-inner-icon="mdi-magnify"
          label="Search orders"
          variant="outlined"
          density="compact"
          hide-details
          class="search-input"
        ></v-text-field>
      </div>

      <div class="filter-controls">
        <v-select
          v-model="selectedFilter"
          :items="filterItems"
          label="Type"
          variant="outlined"
          density="compact"
          hide-details
          class="filter-select"
          prepend-inner-icon="mdi-filter"
        ></v-select>

        <v-select
          v-model="selectedStatus"
          :items="statusItems"
          label="Status"
          variant="outlined"
          density="compact"
          hide-details
          class="filter-select"
          prepend-inner-icon="mdi-check-circle-outline"
        ></v-select>

        <v-select
          v-model="selectedPaymentStatus"
          :items="paymentStatusItems"
          label="Payment"
          variant="outlined"
          density="compact"
          hide-details
          class="filter-select"
          prepend-inner-icon="mdi-cash"
        ></v-select>
      </div>
    </div>

    <div class="table-container">
      <v-table class="orders-table" fixed-header :height="$vuetify.display.mobile ? 'calc(100vh - 250px)' : '600px'">
        <thead>
          <tr>
            <th class="text-left order-type-col">Order Type</th>
            <th class="text-left description-col">Description</th>
            <th class="text-left created-col">Created</th>
            <th class="text-center items-col">Items</th>
            <th class="text-right total-col">Total</th>
            <th class="text-left status-col">Status</th>
            <th v-if="!hideActions" class="text-center actions-col">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="invoice in invoices" :key="invoice.id">
            <td>
              <v-chip
                :color="getOrderTypeColor(getOrderType(invoice))"
                size="small"
                class="order-type-chip"
                variant="flat"
              >
                {{ getOrderType(invoice) }}
              </v-chip>
            </td>
            <td class="text-truncate" :style="{ maxWidth: $vuetify.display.mobile ? '150px' : '200px' }">
              <v-tooltip
                :text="getTooltipText(invoice)"
                location="top"
                open-delay="300"
              >
                <template v-slot:activator="{ props }">
                  <span v-bind="props" class="cursor-help">
                    {{ invoice.description }}
                    <v-icon
                      v-if="hasNotes(invoice)"
                      size="x-small"
                      color="grey-darken-1"
                      class="ml-1"
                    >
                      mdi-note-text-outline
                    </v-icon>
                  </span>
                </template>
              </v-tooltip>
            </td>
            <td>{{ formatDate(invoice.created_at) }}</td>
            <td class="text-center">{{ invoice.hold_items?.length || 0 }}</td>
            <td class="text-right">{{ formatCurrency(invoice.total / 100) }}</td>
            <td>
              <v-chip
                :color="getStatusColor(invoice.paid_status)"
                size="small"
                variant="flat"
                class="status-chip"
              >
                {{ invoice.paid_status || 'UNPAID' }}
              </v-chip>
            </td>
            <td v-if="!hideActions" class="text-center">
              <div class="actions-wrapper">
                <v-btn
                  size="small"
                  color="info"
                  variant="flat"
                  @click.prevent="$emit('load', invoice)"
                  :loading="loadingOrder === invoice.id"
                  :disabled="convertingOrder === invoice.id || deletingOrder === invoice.id || invoice.paid_status === 'PAID'"
                >
                  <v-icon size="small" class="mr-1">mdi-cart-arrow-down</v-icon>
                  LOAD
                </v-btn>
                <v-btn
                  size="small"
                  color="success"
                  variant="flat"
                  @click.prevent="$emit('convert', invoice)"
                  :loading="convertingOrder === invoice.id"
                  :disabled="loadingOrder === invoice.id || deletingOrder === invoice.id || invoice.paid_status === 'PAID'"
                >
                  <v-icon size="small" class="mr-1">mdi-cash-register</v-icon>
                  PAY
                </v-btn>
                <v-btn
                  size="small"
                  color="error"
                  variant="flat"
                  @click="$emit('delete', invoice)"
                  :loading="deletingOrder === invoice.id"
                  :disabled="loadingOrder === invoice.id || convertingOrder === invoice.id || invoice.paid_status === 'PAID'"
                >
                  <v-icon size="small" class="mr-1">mdi-delete</v-icon>
                  DELETE
                </v-btn>
              </div>
            </td>
          </tr>
        </tbody>
      </v-table>
    </div>

    <div v-if="showPagination" class="pagination-wrapper">
      <v-pagination
        :model-value="page"
        @update:model-value="$emit('update:page', $event)"
        :length="totalPages"
        :total-visible="7"
        rounded="circle"
      ></v-pagination>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { parseOrderNotes } from '../../../../../stores/cart/helpers'

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
  },
  hideActions: {
    type: Boolean,
    default: false
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

const emit = defineEmits(['load', 'convert', 'delete', 'update:page', 'refresh'])

// Add logging utility
const logOrderInfo = (action, invoice) => {
  console.log(`[HeldOrdersTable] ${action}:`, {
    id: invoice.id,
    type: props.getOrderType(invoice),
    description: invoice.description,
    itemCount: invoice.hold_items?.length || 0,
    total: invoice.total,
    formattedTotal: props.formatCurrency(invoice.total / 100)
  })
}

// Payment Dialog
const showPaymentDialog = ref(false)
const showConfirmDialog = ref(false)
const selectedInvoice = ref(null)

const handlePayClick = (invoice) => {
  logOrderInfo('Payment initiated', invoice)
  selectedInvoice.value = invoice
  showConfirmDialog.value = true
}

const confirmPayment = () => {
  showConfirmDialog.value = false
  showPaymentDialog.value = true
}

const handlePaymentComplete = async (result) => {
  try {
    showPaymentDialog.value = false
    if (selectedInvoice.value) {
      console.log('[HeldOrdersTable] Payment completed:', {
        success: result,
        invoiceId: selectedInvoice.value.id
      })
    }
    selectedInvoice.value = null
    if (result) {
      window.toastr?.['success']('Payment processed successfully')
      emit('refresh')
    }
  } catch (error) {
    console.error('[HeldOrdersTable] Payment completion error:', error)
    window.toastr?.['error']('Failed to complete payment process')
  }
}

const hasNotes = (invoice) => {
  const notes = parseOrderNotes(invoice.notes)
  return notes && notes.trim().length > 0
}

const getTooltipText = (invoice) => {
  const notes = parseOrderNotes(invoice.notes)
  if (!notes) return invoice.description
  return `${invoice.description}\n\nNotes: ${notes}`
}

const getStatusColor = (status) => {
  switch (status) {
    case 'PAID':
      return 'success'
    case 'UNPAID':
      return 'warning'
    default:
      return 'info'
  }
}

const handleConvert = (invoice) => {
  if (invoice.paid_status === 'PAID') {
    window.toastr?.['error']('Cannot convert a paid invoice')
    return
  }
  
  // Add is_hold_invoice flag to identify this as a hold invoice that needs conversion
  const holdInvoice = {
    ...invoice,
    is_hold_invoice: true
  }
  
  console.log('HeldOrdersTable: Convert button clicked for invoice:', holdInvoice)
  console.log('HeldOrdersTable: Emitting convert event with hold invoice data:', {
    id: holdInvoice.id,
    description: holdInvoice.description,
    total: holdInvoice.total,
    items: holdInvoice.hold_items?.length,
    is_hold_invoice: holdInvoice.is_hold_invoice
  })
  emit('convert', holdInvoice)
}

// Watch for prop changes to track loading states
watch(() => props.loadingOrder, (newVal, oldVal) => {
  if (newVal) {
    const invoice = props.invoices.find(i => i.id === newVal)
    if (invoice) {
      logOrderInfo('Loading order', invoice)
    }
  }
})

watch(() => props.convertingOrder, (newVal, oldVal) => {
  if (newVal) {
    const invoice = props.invoices.find(i => i.id === newVal)
    if (invoice) {
      logOrderInfo('Converting order', invoice)
    }
  }
})
</script>

<style scoped>
.table-wrapper {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  padding: 16px;
  gap: 16px;
}

.filters-row {
  display: flex;
  gap: 16px;
  flex: 0 0 auto;
  flex-wrap: wrap;
}

.search-field {
  flex: 1;
  min-width: 200px;
}

.filter-controls {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.filter-select {
  width: 160px;
}

.table-container {
  flex: 1;
  overflow: auto;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 4px;
}

.orders-table {
  width: 100%;
  background: white;
}

.order-type-col { width: 120px; }
.description-col { width: 200px; }
.created-col { width: 120px; }
.items-col { width: 80px; }
.total-col { width: 100px; }
.status-col { width: 100px; }
.actions-col { width: 280px; }

.order-type-chip,
.status-chip {
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: uppercase;
}

.actions-wrapper {
  display: flex;
  gap: 8px;
  justify-content: center;
}

.pagination-wrapper {
  flex: 0 0 auto;
  display: flex;
  justify-content: center;
  padding: 8px 0;
}

@media (max-width: 768px) {
  .table-wrapper {
    padding: 8px;
    gap: 8px;
  }

  .filters-row {
    gap: 8px;
  }

  .search-field {
    width: 100%;
    flex: none;
  }

  .filter-controls {
    width: 100%;
  }

  .filter-select {
    flex: 1;
    min-width: 120px;
  }

  .orders-table {
    font-size: 0.875rem;
  }

  .order-type-col { width: 100px; }
  .description-col { width: 150px; }
  .created-col { width: 100px; }
  .items-col { width: 60px; }
  .total-col { width: 80px; }
  .status-col { width: 90px; }
  .actions-col { width: 240px; }

  .actions-wrapper {
    gap: 4px;
  }
}
</style>
