<!-- src/views/pos/components/held-orders/components/OrderInvoicesTable.vue -->
<template>
  <div class="order-invoices-table">
    <div class="table-container">
      <v-table
        fixed-header
        class="invoices-table"
      >
        <thead>
          <tr>
            <th class="text-left date-col">Date</th>
            <th class="text-left invoice-col">Invoice #</th>
            <th class="text-left customer-col">Customer</th>
            <th class="text-left status-col">Status</th>
            <th class="text-left payment-col">Payment</th>
            <th class="text-right total-col">Total</th>
            <th class="text-center actions-col">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="invoice in invoices" :key="invoice.id">
            <td>{{ invoice?.created_at ? formatDate(invoice.created_at) : 'N/A' }}</td>
            <td>{{ invoice?.invoice_number || 'N/A' }}</td>
            <td class="text-truncate">
              {{ invoice?.contact?.name || invoice?.first_name || invoice?.name || 'Walk-in Customer' }}
            </td>
            <td>
              <v-chip
                :color="getStatusColor(invoice.status)"
                size="small"
                variant="flat"
                class="status-chip"
              >
                {{ invoice.status }}
              </v-chip>
            </td>
            <td>
              <v-chip
                :color="getPaidStatusColor(invoice.paid_status)"
                size="small"
                variant="flat"
                class="status-chip"
              >
                {{ invoice.paid_status || 'UNPAID' }}
              </v-chip>
            </td>
            <td class="text-right">{{ PriceUtils.format(invoice.total) }}</td>
            <td>
              <div class="actions-wrapper">
                <v-btn
                  v-if="invoice.paid_status === 'UNPAID'"
                  color="success"
                  size="small"
                  variant="flat"
                  @click="handlePayClick(invoice)"
                >
                  <v-icon size="small" class="mr-1">mdi-cash-register</v-icon>
                  PAY
                </v-btn>
                <v-btn
                  color="info"
                  size="small"
                  variant="flat"
                  @click="showInvoiceDetails(invoice)"
                >
                  <v-icon size="small" class="mr-1">mdi-information</v-icon>
                  DETAILS
                </v-btn>
                <v-btn
                  v-if="['DRAFT', 'SENT'].includes(invoice.status)"
                  color="primary"
                  size="small"
                  variant="flat"
                  @click="loadInvoiceToCart(invoice)"
                >
                  <v-icon size="small" class="mr-1">mdi-cart-arrow-down</v-icon>
                  LOAD TO CART
                </v-btn>
              </div>
            </td>
          </tr>
        </tbody>
      </v-table>
    </div>

    <div v-if="showPagination" class="pagination-container">
      <v-pagination
        :model-value="page"
        @update:model-value="$emit('update:page', $event)"
        :length="totalPages"
        :total-visible="5"
      ></v-pagination>
    </div>
  </div>

  <!-- Payment Confirmation Dialog -->
  <v-dialog v-model="showConfirmDialog" max-width="400">
    <v-card>
      <v-card-title class="text-h6">
        Confirm Payment
      </v-card-title>
      <v-card-text>
        Are you sure you want to process payment for invoice #{{ selectedInvoice?.invoice_number }}?
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn
          color="grey-darken-1"
          variant="text"
          @click="showConfirmDialog = false"
        >
          Cancel
        </v-btn>
        <v-btn
          color="success"
          @click="confirmPayment"
        >
          Proceed to Payment
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- Payment Dialog -->
  <PaymentDialog
    v-model="showPaymentDialog"
    :invoice="{
      invoice: selectedInvoice,
      invoicePrefix: selectedInvoice?.invoice_prefix || 'INV',
      nextInvoiceNumber: selectedInvoice?.id
    }"
    @payment-complete="handlePaymentComplete"
  />

  <!-- Invoice Details Dialog -->
  <v-dialog v-model="showDetailsDialog" max-width="700">
    <v-card>
      <v-toolbar color="primary" density="comfortable">
        <v-toolbar-title class="text-h6">
          Invoice Details
        </v-toolbar-title>
        <v-spacer></v-spacer>
        <v-btn icon="mdi-close" variant="text" @click="showDetailsDialog = false" />
      </v-toolbar>

      <v-card-text class="pa-4">
        <template v-if="selectedInvoiceDetails">
          <!-- Basic Information -->
          <v-row>
            <v-col cols="12" sm="6">
              <div class="text-subtitle-1 font-weight-bold mb-2">Basic Information</div>
              <div class="mb-2">
                <strong>Invoice Number:</strong> {{ selectedInvoiceDetails.invoice_number }}
              </div>
              <div class="mb-2">
                <strong>Date:</strong> {{ formatDate(selectedInvoiceDetails.created_at) }}
              </div>
              <div class="mb-2">
                <strong>Status:</strong>
                <v-chip
                  :color="getStatusColor(selectedInvoiceDetails.status)"
                  size="small"
                  class="text-uppercase ml-2"
                >
                  {{ selectedInvoiceDetails.status }}
                </v-chip>
              </div>
              <div class="mb-2">
                <strong>Payment Status:</strong>
                <v-chip
                  :color="getPaidStatusColor(selectedInvoiceDetails.paid_status)"
                  size="small"
                  class="text-uppercase ml-2"
                >
                  {{ selectedInvoiceDetails.paid_status || 'UNPAID' }}
                </v-chip>
              </div>
            </v-col>
            <v-col cols="12" sm="6">
              <div class="text-subtitle-1 font-weight-bold mb-2">Customer Information</div>
              <div class="mb-2">
                <strong>Name:</strong> {{ selectedInvoiceDetails.contact?.name || selectedInvoiceDetails.first_name || selectedInvoiceDetails.name || 'N/A' }}
              </div>
              <div class="mb-2">
                <strong>Phone:</strong> {{ selectedInvoiceDetails.contact?.phone || selectedInvoiceDetails.customer?.phone || selectedInvoiceDetails.phone || 'N/A' }}
              </div>
              <div class="mb-2">
                <strong>Email:</strong> {{ selectedInvoiceDetails.contact?.email || selectedInvoiceDetails.email || 'N/A' }}
              </div>
            </v-col>
          </v-row>

          <!-- Items Table -->
          <v-row class="mt-4">
            <v-col cols="12">
              <div class="text-subtitle-1 font-weight-bold mb-2">Order Items</div>
              <v-table density="comfortable">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th class="text-right">Quantity</th>
                    <th class="text-right">Price</th>
                    <th class="text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="item in selectedInvoiceDetails.items" :key="item.id">
                    <td>{{ item.name }}</td>
                    <td class="text-right">{{ item.quantity }}</td>
                    <td class="text-right">{{ PriceUtils.format(item.price) }}</td>
                    <td class="text-right">{{ PriceUtils.format(item.total) }}</td>
                  </tr>
                </tbody>
              </v-table>
            </v-col>
          </v-row>

          <!-- Totals -->
          <v-row class="mt-4">
            <v-col cols="12" sm="6" offset-sm="6">
              <div class="d-flex justify-space-between mb-2">
                <strong>Subtotal:</strong>
                <span>{{ PriceUtils.format(selectedInvoiceDetails.sub_total) }}</span>
              </div>
              <div class="d-flex justify-space-between mb-2">
                <strong>Tax:</strong>
                <span>{{ PriceUtils.format(selectedInvoiceDetails.tax) }}</span>
              </div>
              <v-divider class="my-2"></v-divider>
              <div class="d-flex justify-space-between">
                <strong>Total:</strong>
                <span class="text-h6">{{ PriceUtils.format(selectedInvoiceDetails.total) }}</span>
              </div>
            </v-col>
          </v-row>

          <!-- Notes -->
          <v-row v-if="selectedInvoiceDetails.notes" class="mt-4">
            <v-col cols="12">
              <div class="text-subtitle-1 font-weight-bold mb-2">Notes</div>
              <v-card variant="outlined" class="pa-3">
                {{ selectedInvoiceDetails.notes }}
              </v-card>
            </v-col>
          </v-row>
        </template>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<script setup>
import PaymentDialog from '../../../components/dialogs/PaymentInvoiceDialog.vue'
import { PriceUtils } from '@/utils/price'
import { ref, computed, watch } from 'vue'
import { useCartStore } from '@/stores/cart-store'

const props = defineProps({
  invoices: {
    type: Array,
    required: true,
    default: () => []
  },
  loading: {
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
  },
  getOrderType: {
    type: Function,
    required: false
  },
  getOrderTypeColor: {
    type: Function,
    required: false
  },
  formatDate: {
    type: Function,
    required: false
  },
  showPagination: {
    type: Boolean,
    default: false
  }
})

const cartStore = useCartStore()

// Log initial props
console.log('OrderInvoicesTable - Initial props:', {
  invoicesCount: props.invoices.length,
  loading: props.loading,
  page: props.page,
  totalPages: props.totalPages
})

// Watch for invoice changes
watch(() => props.invoices, (newInvoices, oldInvoices) => {
  console.log('OrderInvoicesTable - Invoices changed:', {
    oldCount: oldInvoices?.length || 0,
    newCount: newInvoices.length,
    invoices: newInvoices.map(invoice => ({
      id: invoice.id,
      invoice_number: invoice.invoice_number,
      status: invoice.status,
      paid_status: invoice.paid_status,
      total: invoice.total,
      formatted_total: PriceUtils.format(invoice.total)
    }))
  })
}, { deep: true })

const emit = defineEmits(['update:page', 'invoice-paid', 'refresh'])

// Payment Dialog
const showPaymentDialog = ref(false)
const showConfirmDialog = ref(false)
const selectedInvoice = ref(null)
const showDetailsDialog = ref(false)
const selectedInvoiceDetails = ref(null)

// Computed
const showPaginationComputed = computed(() => props.totalPages > 1)

// Format date helper
const formatDate = (date) => {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

// Helper function to detect and normalize price
const normalizePriceFromBackend = (price) => {
  // If price is a string, convert to number
  const numPrice = Number(price);
  
  // If price is greater than 1000, assume it needs to be normalized down
  // This handles cases where 149 cents comes as 14900
  if (numPrice > 1000) {
    return Math.round(numPrice / 100);
  }
  
  // Otherwise, return the price as is, assuming it's already in cents
  // This handles cases where 149 cents comes as 149
  return numPrice;
}

const loadInvoiceToCart = async (invoice) => {
  // Normalize prices in the invoice before loading
  const normalizedInvoice = {
    ...invoice,
    total: normalizePriceFromBackend(invoice.total),
    items: invoice.items?.map(item => ({
      ...item,
      price: normalizePriceFromBackend(item.price),
      total: normalizePriceFromBackend(item.total)
    }))
  }

  console.log('OrderInvoicesTable - Loading invoice to cart:', {
    id: normalizedInvoice.id,
    invoice_number: normalizedInvoice.invoice_number,
    total: normalizedInvoice.total,
    formatted_total: PriceUtils.format(normalizedInvoice.total),
    items: normalizedInvoice.items?.map(item => ({
      id: item.id,
      name: item.name,
      price: item.price,
      formatted_price: PriceUtils.format(item.price),
      quantity: item.quantity
    }))
  })

  try {
    await cartStore.loadInvoice(normalizedInvoice)
    window.toastr?.success('Invoice loaded to cart successfully')
    console.log('OrderInvoicesTable - Invoice loaded to cart successfully:', {
      invoice_id: normalizedInvoice.id,
      invoice_number: normalizedInvoice.invoice_number
    })
  } catch (error) {
    console.error('OrderInvoicesTable - Failed to load invoice to cart:', error)
    window.toastr?.error('Failed to load invoice to cart')
  }
}

const getStatusColor = (status) => {
  const color = {
    'DRAFT': 'grey',
    'SENT': 'info',
    'VIEWED': 'warning',
    'EXPIRED': 'error',
    'DECLINED': 'error',
    'ACCEPTED': 'success',
    'COMPLETED': 'success'
  }[status?.toUpperCase()] || 'grey'

  console.log('OrderInvoicesTable - Status color:', {
    status,
    color
  })
  
  return color
}

const getPaidStatusColor = (status) => {
  const color = {
    'PAID': 'success',
    'PARTIALLY_PAID': 'warning',
    'UNPAID': 'error'
  }[status?.toUpperCase()] || 'error'

  console.log('OrderInvoicesTable - Paid status color:', {
    status,
    color
  })
  
  return color
}

const showInvoiceDetails = async (invoice) => {
  console.log('OrderInvoicesTable - Showing invoice details:', {
    id: invoice.id,
    invoice_number: invoice.invoice_number,
    status: invoice.status,
    paid_status: invoice.paid_status,
    total: invoice.total,
    formatted_total: PriceUtils.format(invoice.total)
  })
  
  selectedInvoiceDetails.value = invoice
  showDetailsDialog.value = true
}

const handlePayClick = (invoice) => {
  console.log('OrderInvoicesTable - Pay clicked:', {
    id: invoice.id,
    invoice_number: invoice.invoice_number,
    total: invoice.total,
    formatted_total: PriceUtils.format(invoice.total)
  })
  
  selectedInvoice.value = invoice
  showConfirmDialog.value = true
}

const confirmPayment = () => {
  console.log('OrderInvoicesTable - Payment confirmed:', {
    invoice_id: selectedInvoice.value?.id,
    invoice_number: selectedInvoice.value?.invoice_number
  })
  
  showConfirmDialog.value = false
  showPaymentDialog.value = true
}

const handlePaymentComplete = (result) => {
  console.log('OrderInvoicesTable - Payment completed:', {
    result,
    invoice_id: selectedInvoice.value?.id,
    invoice_number: selectedInvoice.value?.invoice_number
  })
  
  showPaymentDialog.value = false
  selectedInvoice.value = null
  emit('invoice-paid', result)
}
</script>

<style scoped>
.order-invoices-table {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  background-color: rgb(var(--v-theme-background));
}

.table-container {
  flex: 1;
  min-height: 0;
  overflow: auto;
  position: relative;
  display: flex;
  flex-direction: column;
}

.invoices-table {
  flex: 1;
  display: flex;
  flex-direction: column;
}

:deep(.v-table) {
  height: 100%;
  display: flex;
  flex-direction: column;
}

:deep(.v-table__wrapper) {
  flex: 1;
  overflow: auto;
}

:deep(.v-table__wrapper > table) {
  width: 100%;
  border-spacing: 0;
}

:deep(.v-table__wrapper > table > thead) {
  position: sticky;
  top: 0;
  z-index: 2;
  background-color: rgb(var(--v-theme-surface));
}

:deep(.v-table__wrapper > table > thead > tr > th) {
  font-weight: 600;
  color: rgb(var(--v-theme-on-surface));
  white-space: nowrap;
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  padding: 0 16px;
  height: 48px;
  overflow: hidden;
  text-overflow: ellipsis;
}

:deep(.v-table__wrapper > table > tbody > tr > td) {
  padding: 0 16px;
  height: 48px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

:deep(.v-table__wrapper > table > tbody > tr:not(:last-child) > td) {
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.pagination-container {
  padding: 8px 0;
  display: flex;
  justify-content: center;
  background-color: rgb(var(--v-theme-surface));
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.actions-wrapper {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.status-chip {
  min-width: 80px;
  justify-content: center;
}

.date-col {
  width: 120px;
}

.invoice-col {
  width: 120px;
}

.customer-col {
  width: 200px;
}

.status-col {
  width: 120px;
}

.payment-col {
  width: 120px;
}

.total-col {
  width: 100px;
}

.actions-col {
  width: 280px;
}
</style>
