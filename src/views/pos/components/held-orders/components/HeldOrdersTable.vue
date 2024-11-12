<!-- src/views/pos/components/held-orders/components/HeldOrdersTable.vue -->
<template>
  <v-container class="px-2">
    <v-table fixed-header height="600px" class="elevation-1 w-100">
    <thead>
      <tr>
        <th class="text-left" style="min-width: 100px">Type</th>
        <th class="text-left" style="min-width: 200px">Description</th>
        <th class="text-left" style="min-width: 120px">Created</th>
        <th v-if="hideActions" class="text-left" style="min-width: 120px">Paid</th>
        <th class="text-left" style="min-width: 100px">Items</th>
        <th class="text-left" style="min-width: 120px">Total</th>
        <th class="text-left" style="min-width: 100px">Status</th>
        <th v-if="!hideActions" class="text-left" style="min-width: 300px">Actions</th>
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
        <td v-if="hideActions">{{ formatDate(invoice.paid_at) }}</td>
        <td>{{ invoice.hold_items?.length || 0 }} items</td>
        <td>{{ formatCurrency(invoice.total / 100) }}</td>
        <td>
          <v-chip
            :color="getStatusColor(invoice.paid_status)"
            size="small"
            class="text-uppercase"
          >
            {{ invoice.paid_status || 'UNPAID' }}
          </v-chip>
        </td>
        <td v-if="!hideActions">
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
              <v-icon size="small" class="mr-1">mdi-file-document-arrow-right</v-icon>
              Convert
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
  </v-container>
</template>

<script setup>
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
  }
})

const emit = defineEmits(['load', 'convert', 'delete'])

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

.cursor-help {
  cursor: help;
}
</style>
