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
          <th class="text-center" style="min-width: 100px">Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="invoice in invoices" :key="invoice.id">
          <td>{{ invoice?.created_at ? formatDate(invoice.created_at) : 'N/A' }}</td>
          <td>{{ invoice?.invoice_number || 'N/A' }}</td>
          <td class="text-truncate" style="max-width: 200px">
            {{ invoice?.contact?.name || invoice?.first_name || invoice?.name || 'Walk-in Customer' }}
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
          <td class="text-center d-flex justify-center gap-2">
            <v-btn
              v-if="invoice.paid_status === 'UNPAID'"
              color="success"
              size="small"
              variant="elevated"
              @click="handlePayClick(invoice)"
            >
              <v-icon size="small" class="mr-1">mdi-cash-register</v-icon>
              Pay
            </v-btn>
            <v-btn
              color="info"
              size="small"
              variant="elevated"
              @click="showInvoiceDetails(invoice)"
            >
              <v-icon size="small" class="mr-1">mdi-information</v-icon>
              Details
            </v-btn>
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
                <strong>Name:</strong> {{ selectedInvoiceDetails.contact?.name || 'N/A' }}
              </div>
              <div class="mb-2">
                <strong>Phone:</strong> {{ selectedInvoiceDetails.contact?.phone || 'N/A' }}
              </div>
              <div class="mb-2">
                <strong>Email:</strong> {{ selectedInvoiceDetails.contact?.email || 'N/A' }}
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
                    <td class="text-right">{{ formatCurrency(item.price / 100) }}</td>
                    <td class="text-right">{{ formatCurrency(item.total / 100) }}</td>
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
                <span>{{ formatCurrency(selectedInvoiceDetails.sub_total / 100) }}</span>
              </div>
              <div class="d-flex justify-space-between mb-2">
                <strong>Tax:</strong>
                <span>{{ formatCurrency(selectedInvoiceDetails.tax / 100) }}</span>
              </div>
              <v-divider class="my-2"></v-divider>
              <div class="d-flex justify-space-between">
                <strong>Total:</strong>
                <span class="text-h6">{{ formatCurrency(selectedInvoiceDetails.total / 100) }}</span>
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
import { ref, computed } from 'vue'

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

const emits = defineEmits(['update:page', 'refresh'])

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

// Payment Dialog
const showPaymentDialog = ref(false)
const showConfirmDialog = ref(false)
const selectedInvoice = ref(null)

// Details Dialog
const showDetailsDialog = ref(false)
const selectedInvoiceDetails = ref(null)

const showInvoiceDetails = async (invoice) => {
  try {
    // If we already have all the needed details in the invoice object
    selectedInvoiceDetails.value = invoice
    showDetailsDialog.value = true
    
    // Optionally, if you need to fetch more details:
    /*
    const response = await posApi.invoice.get(invoice.id)
    if (response?.invoice) {
      selectedInvoiceDetails.value = response.invoice
    }
    */
  } catch (error) {
    logger.error('Failed to load invoice details:', error)
    window.toastr?.error('Failed to load invoice details')
  }
}

const handlePayClick = (invoice) => {
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
    selectedInvoice.value = null
    if (result) {
      window.toastr?.['success']('Payment processed successfully')
      // Get emit from defineEmits
      emits('refresh')
    }
  } catch (error) {
    console.error('Payment completion error:', error)
    window.toastr?.['error']('Failed to complete payment process')
  }
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
