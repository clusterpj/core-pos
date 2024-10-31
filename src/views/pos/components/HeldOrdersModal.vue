<!-- src/views/pos/components/HeldOrdersModal.vue -->
<template>
  <v-dialog v-model="dialog" max-width="800">
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

          <v-row v-else-if="holdInvoices.length === 0">
            <v-col cols="12" class="text-center">
              <p>No held orders found</p>
            </v-col>
          </v-row>

          <template v-else>
            <v-row>
              <v-col cols="12">
                <v-text-field
                  v-model="search"
                  label="Search orders"
                  prepend-inner-icon="mdi-magnify"
                  variant="outlined"
                  density="comfortable"
                ></v-text-field>
              </v-col>
            </v-row>

            <v-row>
              <v-col cols="12">
                <v-table>
                  <thead>
                    <tr>
                      <th>Description</th>
                      <th>Date</th>
                      <th>Items</th>
                      <th>Total</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="invoice in filteredInvoices" :key="invoice.id">
                      <td>{{ invoice.description }}</td>
                      <td>{{ formatDate(invoice.created_at) }}</td>
                      <td>{{ invoice.items?.length || 0 }} items</td>
                      <td>{{ formatCurrency(invoice.total) }}</td>
                      <td>
                        <v-btn
                          size="small"
                          color="primary"
                          class="mr-2"
                          @click="loadOrder(invoice.id)"
                          :loading="loadingOrder === invoice.id"
                        >
                          Load
                        </v-btn>
                        <v-btn
                          size="small"
                          color="error"
                          @click="confirmDelete(invoice)"
                          :loading="deletingOrder === invoice.id"
                        >
                          Delete
                        </v-btn>
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

const posStore = usePosStore()
const cartStore = useCartStore()
const { holdInvoices } = storeToRefs(posStore)

const dialog = ref(false)
const deleteDialog = ref(false)
const search = ref('')
const loading = ref(false)
const loadingOrder = ref(null)
const deletingOrder = ref(null)
const selectedInvoice = ref(null)
const isDeleting = ref(false)

// Filter invoices based on search
const filteredInvoices = computed(() => {
  if (!search.value) return holdInvoices.value

  const searchTerm = search.value.toLowerCase()
  return holdInvoices.value.filter(invoice => 
    invoice.description?.toLowerCase().includes(searchTerm) ||
    invoice.id?.toString().includes(searchTerm)
  )
})

// Format date
const formatDate = (date) => {
  return new Date(date).toLocaleDateString()
}

// Format currency
const formatCurrency = (amount) => {
  if (!amount) return '$0.00'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(Number(amount))
}

// Load order
const loadOrder = async (id) => {
  try {
    loadingOrder.value = id
    const response = await posStore.loadHoldInvoice(id)
    logger.debug('Load order response:', response)
    
    if (response?.data?.success && response.data.hold_invoice) {
      // Clear current cart
      cartStore.clearCart()
      
      const holdInvoice = response.data.hold_invoice
      
      // Load items into cart with all original properties
      holdInvoice.items?.forEach(item => {
        cartStore.addItem({
          ...item,
          id: item.item_id,
          price: Number(item.price),
          sale_price: Number(item.price)
        }, Number(item.quantity), item.modifications || [])
      })

      // Set other cart properties
      if (holdInvoice.discount_type && holdInvoice.discount) {
        cartStore.setDiscount(
          holdInvoice.discount_type,
          Number(holdInvoice.discount)
        )
      }
      if (holdInvoice.notes) {
        cartStore.setNotes(holdInvoice.notes)
      }

      dialog.value = false
    }
  } catch (error) {
    logger.error('Failed to load order:', error)
  } finally {
    loadingOrder.value = null
  }
}

// Delete order
const confirmDelete = (invoice) => {
  selectedInvoice.value = invoice
  deleteDialog.value = true
}

const deleteOrder = async () => {
  if (!selectedInvoice.value) return

  try {
    isDeleting.value = true
    deletingOrder.value = selectedInvoice.value.id
    await posStore.deleteHoldInvoice(selectedInvoice.value.id)
    deleteDialog.value = false
    // Refresh the list after deletion
    await fetchHoldInvoices()
  } catch (error) {
    logger.error('Failed to delete order:', error)
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
</style>
