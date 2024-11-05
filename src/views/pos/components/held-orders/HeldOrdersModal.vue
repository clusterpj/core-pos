<!-- src/views/pos/components/held-orders/HeldOrdersModal.vue -->
<template>
  <div>
    <v-btn
      color="primary"
      prepend-icon="mdi-clipboard-list"
      @click="updateModelValue(true)"
      :disabled="disabled"
    >
      Orders
    </v-btn>

    <v-dialog
      :model-value="modelValue"
      @update:model-value="updateModelValue"
      max-width="1200"
    >
      <v-card>
        <v-card-title class="text-h5">
          Held Orders
          <v-spacer></v-spacer>
          <v-btn icon @click="updateModelValue(false)">
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
        :order-description="selectedInvoice?.description"
        @confirm="confirmDelete"
      />

      <PaymentDialog
        v-model="showPaymentDialog"
        :invoice="currentInvoice || {}"
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
  modelValue: {
    type: Boolean,
    required: true
  },
  disabled: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:model-value'])

const deleteDialog = ref(false)
const isDeleting = ref(false)
const selectedInvoice = ref(null)

const updateModelValue = (value) => {
  emit('update:model-value', value)
}

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
    updateModelValue(false)
  }
}

const handleConvertOrder = async (invoice) => {
  console.log('HeldOrdersModal: handleConvertOrder called with invoice:', {
    id: invoice.id,
    description: invoice.description,
    total: invoice.total,
    items: invoice.hold_items?.length
  })
  
  const result = await convertToInvoice(invoice)
  console.log('HeldOrdersModal: convertToInvoice result:', result)
  
  if (result.success) {
    console.log('HeldOrdersModal: Conversion successful, payment dialog should show automatically')
  } else {
    console.error('HeldOrdersModal: Conversion failed:', result.error)
  }
}

const handleDeleteOrder = (invoice) => {
  if (!invoice?.id) {
    window.toastr?.['error']('Invalid order selected')
    return
  }
  selectedInvoice.value = invoice
  deleteDialog.value = true
}

const confirmDelete = async () => {
  if (!selectedInvoice.value?.id) {
    window.toastr?.['error']('Invalid order selected')
    return
  }

  try {
    isDeleting.value = true
    const success = await deleteOrder(selectedInvoice.value.id)
    
    if (success) {
      deleteDialog.value = false
      await fetchHoldInvoices()
      window.toastr?.['success']('Order deleted successfully')
    }
  } catch (error) {
    window.toastr?.['error'](error.message || 'Failed to delete order')
  } finally {
    isDeleting.value = false
    selectedInvoice.value = null
  }
}

// Watch for dialog open to refresh the list
watch(() => props.modelValue, async (newValue) => {
  if (newValue) {
    await fetchHoldInvoices()
  }
})

// Watch for payment completion
watch(showPaymentDialog, async (newValue) => {
  console.log('HeldOrdersModal: Payment dialog state changed:', {
    showPaymentDialog: newValue,
    hasCurrentInvoice: !!currentInvoice.value
  })
  
  if (!newValue) {
    // Payment dialog was closed
    if (currentInvoice.value) {
      console.log('HeldOrdersModal: Payment dialog closed with current invoice, refreshing list')
      // Refresh the list
      await fetchHoldInvoices()
      // Close the main dialog
      updateModelValue(false)
    }
  }
})

// Initial fetch
fetchHoldInvoices()
</script>
