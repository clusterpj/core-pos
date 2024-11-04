<!-- src/views/pos/components/held-orders/HeldOrdersModal.vue -->
<template>
  <div>
    <v-btn
      color="primary"
      prepend-icon="mdi-clipboard-list"
      @click="dialog = true"
      :disabled="disabled"
    >
      Orders
    </v-btn>

    <v-dialog
      v-model="dialog"
      max-width="1200"
    >
      <v-card>
        <v-card-title class="text-h5">
          Held Orders
          <v-spacer></v-spacer>
          <v-btn icon @click="dialog = false">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-card-title>

        <v-card-text>
          <v-container>
            <v-row v-if="loading">
              <v-col cols="12" class="text-center">
                <v-progress-circular indeterminate></v-progress-circular>
              </v-col>
            </v-row>

            <v-row v-else-if="!holdInvoices.length">
              <v-col cols="12" class="text-center">
                <p>No held orders found</p>
              </v-col>
            </v-row>

            <template v-else>
              <HeldOrdersFilters
                :search="search"
                :selectedType="selectedType"
                :orderTypes="orderTypes"
                @update:search="search = $event"
                @update:selectedType="selectedType = $event"
              />

              <v-row>
                <v-col cols="12">
                  <HeldOrdersTable
                    :invoices="filteredInvoices"
                    :loadingOrder="loadingOrder"
                    :convertingOrder="convertingOrder"
                    :deletingOrder="deletingOrder"
                    :getOrderType="getOrderType"
                    :getOrderTypeColor="getOrderTypeColor"
                    :formatDate="formatDate"
                    :formatCurrency="formatCurrency"
                    @load="handleLoadOrder"
                    @convert="handleConvertOrder"
                    @delete="handleDeleteOrder"
                  />
                </v-col>
              </v-row>
            </template>
          </v-container>
        </v-card-text>
      </v-card>

      <DeleteConfirmationDialog
        v-model="deleteDialog"
        :loading="isDeleting"
        @confirm="confirmDelete"
      />

      <PaymentDialog
        v-model="showPaymentDialog"
        :invoice="currentInvoice"
        @payment-complete="handlePaymentComplete"
      />
    </v-dialog>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useHeldOrders } from './composables/useHeldOrders'
import HeldOrdersFilters from './components/HeldOrdersFilters.vue'
import HeldOrdersTable from './components/HeldOrdersTable.vue'
import DeleteConfirmationDialog from './components/DeleteConfirmationDialog.vue'
import PaymentDialog from '../dialogs/PaymentDialog.vue'

const props = defineProps({
  disabled: {
    type: Boolean,
    default: false
  }
})

const dialog = ref(false)
const deleteDialog = ref(false)
const isDeleting = ref(false)
const selectedInvoice = ref(null)

const {
  loading,
  loadingOrder,
  deletingOrder,
  convertingOrder,
  search,
  selectedType,
  orderTypes,
  holdInvoices,
  filteredInvoices,
  getOrderType,
  getOrderTypeColor,
  formatDate,
  formatCurrency,
  convertToInvoice,
  loadOrder,
  deleteOrder,
  fetchHoldInvoices,
  showPaymentDialog,
  currentInvoice,
  handlePaymentComplete
} = useHeldOrders()

const handleLoadOrder = async (invoice) => {
  const success = await loadOrder(invoice)
  if (success) {
    dialog.value = false
  }
}

const handleConvertOrder = async (invoice) => {
  const result = await convertToInvoice(invoice)
  if (result.success) {
    // Payment dialog will be shown automatically
    // Dialog will be closed after successful payment
  }
}

const handleDeleteOrder = (invoice) => {
  selectedInvoice.value = invoice
  deleteDialog.value = true
}

const confirmDelete = async () => {
  if (!selectedInvoice.value) return

  try {
    isDeleting.value = true
    const success = await deleteOrder(selectedInvoice.value.id)
    
    if (success) {
      deleteDialog.value = false
      await fetchHoldInvoices()
    }
  } finally {
    isDeleting.value = false
    selectedInvoice.value = null
  }
}

// Watch for dialog open to refresh the list
watch(dialog, async (newValue) => {
  if (newValue) {
    await fetchHoldInvoices()
  }
})

// Watch for payment completion
watch(showPaymentDialog, async (newValue) => {
  if (!newValue) {
    // Payment dialog was closed
    if (currentInvoice.value) {
      // Refresh the list
      await fetchHoldInvoices()
      // Close the main dialog
      dialog.value = false
    }
  }
})

// Initial fetch
fetchHoldInvoices()
</script>
