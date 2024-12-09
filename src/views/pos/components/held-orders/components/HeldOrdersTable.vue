<!-- src/views/pos/components/held-orders/components/HeldOrdersTable.vue -->
<template>
  <v-container class="px-2">
    <v-table fixed-header height="600px" class="elevation-1 w-100">
    <thead>
      <tr>
        <th class="text-left" style="min-width: 120px">Order Type</th>
        <th class="text-left" style="min-width: 200px">Description</th>
        <th class="text-left" style="min-width: 150px">Created</th>
        <th class="text-left" style="min-width: 100px">Items</th>
        <th class="text-right" style="min-width: 120px">Total</th>
        <th class="text-left" style="min-width: 120px">Status</th>
        <th v-if="!hideActions" class="text-center" style="min-width: 300px">Actions</th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="invoice in invoices" :key="invoice.id">
        <td>
          <v-chip
            :color="getOrderTypeColor(getOrderType(invoice))"
            size="small"
            class="text-uppercase"
          >
            {{ getOrderType(invoice) }}
          </v-chip>
        </td>
        <td class="text-truncate" style="max-width: 200px">
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
            class="text-uppercase"
          >
            {{ invoice.paid_status || 'UNPAID' }}
          </v-chip>
        </td>
        <td v-if="!hideActions" class="text-center">
          <div class="d-flex gap-2">
            <v-btn
              size="small"
              color="info"
              variant="elevated"
              @click.prevent="$emit('load', invoice)"
              :loading="loadingOrder === invoice.id"
              :disabled="convertingOrder === invoice.id || deletingOrder === invoice.id || invoice.paid_status === 'PAID'"
            >
              <v-icon size="small" class="mr-1">mdi-cart-arrow-down</v-icon>
              {{ loadingOrder === invoice.id ? 'Loading...' : 'Load' }}
            </v-btn>
            <v-btn
              size="small"
              color="success"
              variant="elevated"
              @click.prevent="$emit('convert', invoice)"
              :loading="convertingOrder === invoice.id"
              :disabled="loadingOrder === invoice.id || deletingOrder === invoice.id || invoice.paid_status === 'PAID'"
            >
              <v-icon size="small" class="mr-1">mdi-cash-register</v-icon>
              Pay
            </v-btn>
            <v-btn
              size="small"
              color="error"
              variant="elevated"
              @click="$emit('delete', invoice)"
              :loading="deletingOrder === invoice.id"
              :disabled="loadingOrder === invoice.id || convertingOrder === invoice.id || invoice.paid_status === 'PAID'"
            >
              <v-icon size="small" class="mr-1">mdi-delete</v-icon>
              Delete
            </v-btn>
          </div>
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

.cursor-help {
  cursor: help;
}
</style>
