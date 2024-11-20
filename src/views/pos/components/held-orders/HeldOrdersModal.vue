<!-- src/views/pos/components/held-orders/HeldOrdersModal.vue -->
<template>
  <div class="held-orders-container">
    <v-btn
      color="primary"
      prepend-icon="mdi-clipboard-list"
      @click="updateModelValue(true)"
      :disabled="disabled"
      class="text-none px-6 text-capitalize"
      rounded="pill"
      :elevation="$vuetify.display.mobile ? 1 : 2"
      size="large"
      :block="$vuetify.display.mobile"
    >
      <span class="text-subtitle-1 font-weight-medium">ORDERS</span>
    </v-btn>

    <v-dialog
      :model-value="modelValue"
      @update:model-value="updateModelValue"
      :fullscreen="$vuetify.display.mobile"
      :max-width="$vuetify.display.mobile ? undefined : '1400'"
      transition="dialog-bottom-transition"
      class="orders-dialog"
    >
      <v-card class="h-100">
        <v-toolbar
          color="primary"
          :elevation="1"
          prominent
        >
          <v-toolbar-title class="text-h6 font-weight-medium">
            Orders Management
          </v-toolbar-title>
          <v-spacer></v-spacer>
          <v-btn
            icon="mdi-close"
            variant="text"
            @click="updateModelValue(false)"
            class="ml-2"
          ></v-btn>
        </v-toolbar>

        <v-card-text class="pa-0">
          <v-container fluid class="pa-0">
            <v-tabs
              v-model="activeTab"
              color="primary"
              grow
              show-arrows
              class="v-tabs-sticky"
              :height="$vuetify.display.mobile ? 48 : 64"
            >
              <v-tab
                value="active"
                class="text-subtitle-1"
                :class="{ 'px-6': !$vuetify.display.mobile }"
              >
                <v-icon
                  start
                  :icon="activeTab === 'active' ? 'mdi-clipboard-list' : 'mdi-clipboard-list-outline'"
                  class="mr-2"
                ></v-icon>
                Active Orders
              </v-tab>
              <v-tab
                value="history"
                class="text-subtitle-1"
                :class="{ 'px-6': !$vuetify.display.mobile }"
              >
                <v-icon
                  start
                  :icon="activeTab === 'history' ? 'mdi-history' : 'mdi-history-outline'"
                  class="mr-2"
                ></v-icon>
                Order History
              </v-tab>
            </v-tabs>

            <v-window v-model="activeTab" class="mt-6">
              <!-- Active Orders Tab -->
              <v-window-item value="active">
                <template v-if="loading">
                  <v-fade-transition>
                    <v-sheet class="pa-4">
                      <v-skeleton-loader
                        type="table-heading, table-row-divider, table-row@6"
                        class="mx-auto"
                      ></v-skeleton-loader>
                    </v-sheet>
                  </v-fade-transition>
                </template>

                <v-row v-else-if="!activeOrders.length">
                  <v-col cols="12" class="text-center">
                    <p>No active orders found</p>
                  </v-col>
                </v-row>

                <template v-else>
                  <v-container class="px-2 pb-2">
                    <HeldOrdersFilters
                      :search="search"
                      :selectedType="selectedType"
                      :selectedStatus="selectedStatus"
                      :orderTypes="orderTypes"
                      @update:search="search = $event"
                      @update:selectedType="selectedType = $event"
                      @update:selectedStatus="selectedStatus = $event"
                    />
                  </v-container>

                  <v-row>
                    <v-col cols="12">
                      <HeldOrdersTable
                        :invoices="filteredActiveOrders"
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
              </v-window-item>

              <!-- Order History Tab -->
              <v-window-item value="history">
                <v-row v-if="loading">
                  <v-col cols="12" class="text-center">
                    <v-progress-circular indeterminate></v-progress-circular>
                  </v-col>
                </v-row>

                <v-row v-else-if="!orderHistory.length">
                  <v-col cols="12" class="text-center">
                    <p>No order history found</p>
                  </v-col>
                </v-row>

                <v-row v-if="orderHistory.length" class="mb-2">
                  <v-col cols="12" class="d-flex justify-end px-4">
                    <v-btn
                      color="error"
                      variant="outlined"
                      prepend-icon="mdi-delete-sweep"
                      @click="clearOrderHistory"
                      size="small"
                    >
                      Clear History
                    </v-btn>
                  </v-col>
                </v-row>

                <template v-else>
                  <v-container class="px-2 pb-2">
                    <HeldOrdersFilters
                      :search="historySearch"
                      :selectedType="historySelectedType"
                      :selectedStatus="historySelectedStatus"
                      :orderTypes="orderTypes"
                      @update:search="historySearch = $event"
                      @update:selectedType="historySelectedType = $event"
                      @update:selectedStatus="historySelectedStatus = $event"
                    />
                  </v-container>

                  <v-row>
                    <v-col cols="12">
                      <HeldOrdersTable
                        :invoices="filteredHistoryOrders"
                        :loadingOrder="loadingOrder"
                        :convertingOrder="convertingOrder"
                        :deletingOrder="deletingOrder"
                        :getOrderType="getOrderType"
                        :getOrderTypeColor="getOrderTypeColor"
                        :formatDate="formatDate"
                        :formatCurrency="formatCurrency"
                        :hideActions="true"
                      />
                    </v-col>
                  </v-row>
                </template>
              </v-window-item>
            </v-window>
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
import { ref, watch, computed } from 'vue'
import { logger } from '../../../../utils/logger'
import { useHeldOrders } from './composables/useHeldOrders'
import HeldOrdersFilters from './components/HeldOrdersFilters.vue'
import HeldOrdersTable from './components/HeldOrdersTable.vue'
import DeleteConfirmationDialog from './components/DeleteConfirmationDialog.vue'
import PaymentDialog from '../dialogs/PaymentDialog.vue'
import { PaidStatus } from '../../../../types/order'

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
const activeTab = ref('active')

// Active orders filters
const search = ref('')
const selectedType = ref('ALL')
const selectedStatus = ref('ALL')

// History filters
const historySearch = ref('')
const historySelectedType = ref('ALL')
const historySelectedStatus = ref('ALL')

const updateModelValue = (value) => {
  emit('update:model-value', value)
}

const {
  loading,
  loadingOrder,
  deletingOrder,
  convertingOrder,
  orderTypes,
  holdInvoices,
  orderHistory,
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
  handlePaymentComplete,
  clearOrderHistory
} = useHeldOrders()

// Computed properties for active orders
const activeOrders = computed(() => 
  holdInvoices.value.filter(invoice => invoice.paid_status === PaidStatus.UNPAID)
)

const filteredActiveOrders = computed(() => {
  let filtered = activeOrders.value

  if (selectedType.value !== 'ALL') {
    filtered = filtered.filter(invoice => invoice.type === selectedType.value)
  }

  if (selectedStatus.value !== 'ALL') {
    filtered = filtered.filter(invoice => invoice.paid_status === selectedStatus.value)
  }

  if (search.value) {
    const searchTerm = search.value.toLowerCase()
    filtered = filtered.filter(invoice => 
      invoice.description?.toLowerCase().includes(searchTerm) ||
      invoice.id?.toString().includes(searchTerm)
    )
  }

  return filtered
})

// Computed properties for history orders
const filteredHistoryOrders = computed(() => {
  let filtered = orderHistory.value

  if (historySelectedType.value !== 'ALL') {
    filtered = filtered.filter(invoice => invoice.type === historySelectedType.value)
  }

  if (historySelectedStatus.value !== 'ALL') {
    filtered = filtered.filter(invoice => invoice.paid_status === historySelectedStatus.value)
  }

  if (historySearch.value) {
    const searchTerm = historySearch.value.toLowerCase()
    filtered = filtered.filter(invoice => 
      invoice.description?.toLowerCase().includes(searchTerm) ||
      invoice.id?.toString().includes(searchTerm)
    )
  }

  return filtered
})

const handleLoadOrder = async (invoice) => {
  logger.info('Loading order:', {
    id: invoice.id,
    description: invoice.description,
    type: invoice.type
  })
  
  const success = await loadOrder(invoice)
  if (success) {
    window.toastr?.['success']('Order loaded successfully')
    updateModelValue(false)
  } else {
    window.toastr?.['error']('Failed to load order')
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
