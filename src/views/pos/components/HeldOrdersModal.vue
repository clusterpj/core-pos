<!-- src/views/pos/components/HeldOrdersModal.vue -->
<template>
  <v-dialog v-model="dialog" max-width="1200">
    <template v-slot:activator="{ props }">
      <v-btn
        color="primary"
        v-bind="props"
        prepend-icon="mdi-clipboard-list"
      >
        Orders
      </v-btn>
    </template>

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
            <v-row>
              <!-- Search Field -->
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="search"
                  label="Search orders"
                  prepend-inner-icon="mdi-magnify"
                  variant="outlined"
                  density="comfortable"
                ></v-text-field>
              </v-col>
              
              <!-- Type Filter -->
              <v-col cols="12" sm="6">
                <v-select
                  v-model="selectedType"
                  :items="orderTypes"
                  label="Filter by type"
                  variant="outlined"
                  density="comfortable"
                  prepend-inner-icon="mdi-filter"
                ></v-select>
              </v-col>
            </v-row>

            <v-row>
              <v-col cols="12">
                <v-table fixed-header height="500px">
                  <thead>
                    <tr>
                      <th class="text-left" style="min-width: 100px">Type</th>
                      <th class="text-left" style="min-width: 200px">Description</th>
                      <th class="text-left" style="min-width: 120px">Date</th>
                      <th class="text-left" style="min-width: 100px">Items</th>
                      <th class="text-left" style="min-width: 120px">Total</th>
                      <th class="text-left" style="min-width: 300px">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="invoice in filteredInvoices" :key="invoice.id">
                      <td>
                        <v-chip
                          :color="getOrderTypeColor(getOrderType(invoice))"
                          size="small"
                        >
                          {{ getOrderType(invoice) }}
                        </v-chip>
                      </td>
                      <td class="text-truncate" style="max-width: 200px">
                        {{ invoice.description }}
                      </td>
                      <td>{{ formatDate(invoice.created_at) }}</td>
                      <td>{{ invoice.hold_items?.length || 0 }} items</td>
                      <td>{{ formatCurrency(invoice.total / 100) }}</td>
                      <td>
                        <div class="d-flex gap-2">
                          <v-btn
                            size="small"
                            color="info"
                            variant="elevated"
                            @click="loadOrder(invoice)"
                            :loading="loadingOrder === invoice.id"
                            :disabled="convertingOrder === invoice.id || deletingOrder === invoice.id"
                          >
                            <v-icon size="small" class="mr-1">mdi-cart-arrow-down</v-icon>
                            Load
                          </v-btn>
                          <v-btn
                            size="small"
                            color="success"
                            variant="elevated"
                            @click="convertToInvoice(invoice)"
                            :loading="convertingOrder === invoice.id"
                            :disabled="loadingOrder === invoice.id || deletingOrder === invoice.id"
                          >
                            <v-icon size="small" class="mr-1">mdi-file-document-arrow-right</v-icon>
                            Convert
                          </v-btn>
                          <v-btn
                            size="small"
                            color="error"
                            variant="elevated"
                            @click="confirmDelete(invoice)"
                            :loading="deletingOrder === invoice.id"
                            :disabled="loadingOrder === invoice.id || convertingOrder === invoice.id"
                          >
                            <v-icon size="small" class="mr-1">mdi-delete</v-icon>
                            Delete
                          </v-btn>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </v-table>
              </v-col>
            </v-row>
          </template>
        </v-container>
      </v-card-text>
    </v-card>

    <!-- Delete Confirmation Dialog -->
    <v-dialog v-model="deleteDialog" max-width="400">
      <v-card>
        <v-card-title class="text-h6">
          Delete Order
        </v-card-title>
        <v-card-text>
          Are you sure you want to delete this order?
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="grey" variant="text" @click="deleteDialog = false">Cancel</v-btn>
          <v-btn 
            color="error" 
            @click="deleteOrder"
            :loading="isDeleting"
          >
            Delete
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-dialog>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { usePosStore } from '../../../stores/pos-store'
import { useCartStore } from '../../../stores/cart-store'
import { storeToRefs } from 'pinia'
import { logger } from '../../../utils/logger'
import { ORDER_TYPES } from '../composables/useOrderType'

const posStore = usePosStore()
const cartStore = useCartStore()
const { holdInvoices } = storeToRefs(posStore)

const dialog = ref(false)
const deleteDialog = ref(false)
const search = ref('')
const selectedType = ref('ALL')
const loading = ref(false)
const loadingOrder = ref(null)
const deletingOrder = ref(null)
const selectedInvoice = ref(null)
const isDeleting = ref(false)
const convertingOrder = ref(null)

// Order type options for filter
const orderTypes = [
  { title: 'All Orders', value: 'ALL' },
  { title: 'Dine In', value: ORDER_TYPES.DINE_IN },
  { title: 'To Go', value: ORDER_TYPES.TO_GO },
  { title: 'Delivery', value: ORDER_TYPES.DELIVERY },
  { title: 'Pickup', value: ORDER_TYPES.PICKUP }
]

// Get order type from invoice
const getOrderType = (invoice) => {
  try {
    if (invoice.notes) {
      const orderInfo = JSON.parse(invoice.notes)
      return orderInfo.type || 'UNKNOWN'
    }
  } catch (err) {
    logger.error('Failed to parse order type:', err)
  }
  return 'UNKNOWN'
}

// Get color for order type chip
const getOrderTypeColor = (type) => {
  const colors = {
    [ORDER_TYPES.DINE_IN]: 'primary',
    [ORDER_TYPES.TO_GO]: 'success',
    [ORDER_TYPES.DELIVERY]: 'warning',
    [ORDER_TYPES.PICKUP]: 'info',
    'UNKNOWN': 'grey'
  }
  return colors[type] || 'grey'
}

// Filter invoices based on search and type
const filteredInvoices = computed(() => {
  let filtered = holdInvoices.value

  // Apply type filter
  if (selectedType.value !== 'ALL') {
    filtered = filtered.filter(invoice => getOrderType(invoice) === selectedType.value)
  }

  // Apply search filter
  if (search.value) {
    const searchTerm = search.value.toLowerCase()
    filtered = filtered.filter(invoice => 
      invoice.description?.toLowerCase().includes(searchTerm) ||
      invoice.id?.toString().includes(searchTerm)
    )
  }

  return filtered
})

// Format date
const formatDate = (date) => {
  return new Date(date).toLocaleDateString()
}

// Format currency
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount)
}

// Convert to invoice
const convertToInvoice = async (invoice) => {
  try {
    convertingOrder.value = invoice.id
    logger.debug('Converting order to invoice:', invoice)
    
    // Clear current cart
    cartStore.clearCart()
    
    // Add each hold item to cart
    invoice.hold_items?.forEach(item => {
      cartStore.addItem({
        id: item.item_id,
        name: item.name,
        description: item.description,
        price: item.price / 100, // Convert cents to dollars
        unit_name: item.unit_name,
        quantity: Number(item.quantity)
      })
    })

    // Set other cart properties
    if (invoice.discount_type && invoice.discount) {
      cartStore.setDiscount(
        invoice.discount_type,
        Number(invoice.discount)
      )
    }
    
    if (invoice.tip_type && invoice.tip) {
      cartStore.setTip(
        invoice.tip_type,
        Number(invoice.tip)
      )
    }

    if (invoice.notes) {
      cartStore.setNotes(invoice.notes)
    }

    // Create invoice
    await cartStore.createInvoice()
    
    // Delete the held order after successful conversion
    await posStore.deleteHoldInvoice(invoice.id)
    
    // Show success message
    window.toastr?.['success']('Order converted to invoice successfully')
    
    // Close modal
    dialog.value = false
    
    logger.info('Order converted to invoice successfully:', invoice.id)
  } catch (error) {
    logger.error('Failed to convert order to invoice:', error)
    window.toastr?.['error']('Failed to convert order to invoice')
  } finally {
    convertingOrder.value = null
  }
}

// Load order
const loadOrder = async (invoice) => {
  try {
    loadingOrder.value = invoice.id
    logger.debug('Loading order:', invoice)
    
    // Clear current cart
    cartStore.clearCart()
    
    // Add each hold item to cart
    invoice.hold_items?.forEach(item => {
      cartStore.addItem({
        id: item.item_id,
        name: item.name,
        description: item.description,
        price: item.price / 100, // Convert cents to dollars
        unit_name: item.unit_name,
        quantity: Number(item.quantity)
      })
    })

    // Set other cart properties
    if (invoice.discount_type && invoice.discount) {
      cartStore.setDiscount(
        invoice.discount_type,
        Number(invoice.discount)
      )
    }
    
    if (invoice.tip_type && invoice.tip) {
      cartStore.setTip(
        invoice.tip_type,
        Number(invoice.tip)
      )
    }

    if (invoice.notes) {
      cartStore.setNotes(invoice.notes)
    }

    // Set the hold invoice ID and description in cart store
    cartStore.setHoldInvoiceId(invoice.id)
    cartStore.setHoldOrderDescription(invoice.description || `Order #${invoice.id}`)

    dialog.value = false
    logger.info('Order loaded successfully:', invoice.id)
  } catch (error) {
    logger.error('Failed to load order:', error)
    window.toastr?.['error']('Failed to load order')
  } finally {
    loadingOrder.value = null
  }
}

const confirmDelete = (invoice) => {
  selectedInvoice.value = invoice
  deleteDialog.value = true
}

const deleteOrder = async () => {
  if (!selectedInvoice.value) return

  try {
    isDeleting.value = true
    deletingOrder.value = selectedInvoice.value.id
    
    const response = await posStore.deleteHoldInvoice(selectedInvoice.value.id)
    
    if (response.success) {
      deleteDialog.value = false
      // Show success message
      window.toastr?.['success']('Order deleted successfully')
      // Refresh the list after deletion
      await fetchHoldInvoices()
    } else {
      throw new Error(response.message || 'Failed to delete order')
    }
  } catch (error) {
    logger.error('Failed to delete order:', error)
    window.toastr?.['error'](error.message || 'Failed to delete order')
  } finally {
    isDeleting.value = false
    deletingOrder.value = null
    selectedInvoice.value = null
  }
}

// Fetch held orders when modal opens
const fetchHoldInvoices = async () => {
  try {
    loading.value = true
    await posStore.fetchHoldInvoices()
  } catch (error) {
    logger.error('Failed to fetch hold invoices:', error)
  } finally {
    loading.value = false
  }
}

// Watch for dialog open to refresh the list
watch(dialog, async (newValue) => {
  if (newValue) {
    await fetchHoldInvoices()
  }
})

// Initial fetch
onMounted(async () => {
  await fetchHoldInvoices()
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
</style>
