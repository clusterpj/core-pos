<template>
  <v-dialog v-model="dialog" max-width="1200">
    <template v-slot:activator="{ props: dialogProps }">
      <v-btn
        color="primary"
        v-bind="dialogProps"
        prepend-icon="mdi-table-furniture"
        :loading="loading"
        :disabled="disabled || cartStore.isEmpty"
      >
        DINE IN
      </v-btn>
    </template>

    <v-card>
      <v-card-title class="d-flex align-center pa-4">
        <span class="text-h5">Table Selection</span>
        <v-spacer></v-spacer>
        <v-btn icon @click="closeModal">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-card-title>

      <v-card-text>
        <v-container>
          <!-- Loading State -->
          <v-row v-if="loading">
            <v-col cols="12" class="text-center">
              <v-progress-circular indeterminate></v-progress-circular>
            </v-col>
          </v-row>

          <!-- Error State -->
          <v-row v-else-if="error">
            <v-col cols="12">
              <v-alert type="error" variant="tonal">
                {{ error }}
              </v-alert>
              <div class="text-center mt-4">
                <v-btn color="primary" @click="retryLoadTables">
                  Retry
                </v-btn>
              </div>
            </v-col>
          </v-row>

          <!-- No Tables State -->
          <v-row v-else-if="!tables.length">
            <v-col cols="12" class="text-center">
              <v-alert type="info" variant="tonal">
                No tables available for this cash register
              </v-alert>
            </v-col>
          </v-row>

          <!-- Table Grid -->
          <v-row v-else>
            <v-col
              v-for="table in tables"
              :key="table.id"
              cols="12"
              sm="6"
              md="4"
              lg="3"
            >
              <v-card
                :class="[
                  'table-card',
                  isTableSelected(table.id) ? 'selected' : '',
                  isTableAvailable(table) ? 'available' : 'occupied'
                ]"
                variant="outlined"
                @click="handleTableClick(table)"
              >
                <v-card-title class="d-flex justify-space-between align-center">
                  <span>{{ table.name }}</span>
                  <v-chip
                    :color="isTableAvailable(table) ? 'success' : 'error'"
                    :text-color="isTableAvailable(table) ? 'black' : 'white'"
                    size="small"
                  >
                    {{ isTableAvailable(table) ? 'Available' : 'Occupied' }}
                  </v-chip>
                </v-card-title>

                <v-card-text>
                  <template v-if="isTableSelected(table.id)">
                    <div class="d-flex align-center justify-center my-4">
                      <v-btn
                        icon
                        variant="outlined"
                        @click.stop="decrementQuantity(table.id)"
                        :disabled="getTableQuantity(table.id) <= 1"
                      >
                        <v-icon>mdi-minus</v-icon>
                      </v-btn>
                      <span class="mx-4 text-h5">{{ getTableQuantity(table.id) }}</span>
                      <v-btn
                        icon
                        variant="outlined"
                        @click.stop="incrementQuantity(table.id)"
                      >
                        <v-icon>mdi-plus</v-icon>
                      </v-btn>
                    </div>
                    <div class="text-center text-subtitle-1">Persons</div>
                  </template>
                  <template v-else-if="!isTableAvailable(table)">
                    <div class="d-flex flex-column gap-2">
                      <div class="d-flex align-center">
                        <v-icon size="small" class="mr-2">mdi-account-group</v-icon>
                        <span>{{ table.quantity || 0 }} Persons</span>
                      </div>
                      <div class="d-flex align-center">
                        <v-icon size="small" class="mr-2">mdi-food</v-icon>
                        <span>{{ table.items || 0 }} Items</span>
                      </div>
                    </div>
                  </template>
                  <template v-else>
                    <div class="text-subtitle-2 text-center py-4">
                      Click to select
                    </div>
                  </template>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>

          <!-- Confirm Button -->
          <v-row v-if="selectedTables.length > 0">
            <v-col cols="12" class="text-center mt-4">
              <v-btn
                color="primary"
                size="large"
                block
                @click="processOrder"
                :loading="processing"
                :disabled="!selectedTables.length || processing || cartStore.isEmpty"
              >
                Confirm and Hold Order
              </v-btn>
            </v-col>
          </v-row>
        </v-container>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useTableManagement } from '../../composables/useTableManagement'
import { useOrderType } from '../../composables/useOrderType'
import { usePosStore } from '../../../../stores/pos-store'
import { useCartStore } from '../../../../stores/cart-store'
import { logger } from '../../../../utils/logger'
import { OrderType } from '../../../../types/order'

// Props
const props = defineProps({
  disabled: {
    type: Boolean,
    default: false
  }
})

// Store access
const posStore = usePosStore()
const cartStore = useCartStore()

// Composables
const {
  loading: tableLoading,
  error,
  getTables,
  isTableOccupied,
  selectedCashier,
  currentCashRegister
} = useTableManagement()

const {
  setOrderType,
  setCustomerInfo,
  canCreateOrder
} = useOrderType()

// Local state
const dialog = ref(false)
const loading = computed(() => tableLoading.value)
const processing = ref(false)
const tables = ref([])
const selectedTables = ref([])

// Methods
const isTableAvailable = (table) => {
  return !isTableOccupied(table.id) || isTableSelected(table.id)
}

const isTableSelected = (tableId) => {
  return selectedTables.value.some(t => t.id === tableId)
}

const getTableQuantity = (tableId) => {
  const table = selectedTables.value.find(t => t.id === tableId)
  return table ? table.quantity : 1
}

const handleTableClick = (table) => {
  if (!isTableAvailable(table)) return

  const index = selectedTables.value.findIndex(t => t.id === table.id)
  if (index >= 0) {
    selectedTables.value.splice(index, 1)
  } else {
    selectedTables.value.push({
      id: table.id,
      name: table.name,
      quantity: 1
    })
  }
}

const incrementQuantity = (tableId) => {
  const table = selectedTables.value.find(t => t.id === tableId)
  if (table) {
    table.quantity++
  }
}

const decrementQuantity = (tableId) => {
  const table = selectedTables.value.find(t => t.id === tableId)
  if (table && table.quantity > 1) {
    table.quantity--
  }
}

const retryLoadTables = async () => {
  try {
    tables.value = await getTables()
  } catch (err) {
    logger.error('Failed to retry loading tables:', err)
    window.toastr?.['error']('Failed to load tables')
  }
}

// Process the order
const processOrder = async () => {
  if (!selectedTables.value.length || !canCreateOrder.value) {
    return
  }

  processing.value = true

  try {
    // Set order type
    setOrderType(OrderType.DINE_IN)

    // Prepare table information
    const selectedTablesData = selectedTables.value.map(table => ({
      table_id: table.id,
      name: table.name,
      quantity: table.quantity
    }))
    
    const tableNames = selectedTablesData.map(t => t.name).join(', ')
    const totalCustomers = selectedTablesData.reduce((sum, table) => sum + table.quantity, 0)

    // Set customer info
    setCustomerInfo({
      tableNumbers: tableNames,
      tables: selectedTablesData,
      customerCount: totalCustomers
    })

    // Set cart store information
    cartStore.setSelectedTables(selectedTablesData)
    
    // Set only customer-related information in notes
    cartStore.setNotes(JSON.stringify({
      orderInfo: {
        customer: {
          tableNumbers: tableNames,
          customerCount: totalCustomers
        },
        tables: selectedTablesData
      }
    }))

    // Create hold invoice data
    const orderData = cartStore.prepareHoldInvoiceData(
      posStore.selectedStore,
      selectedCashier.value,
      `DINE_IN_Table_${tableNames}`
    )

    try {
      // Hold the order
      await posStore.holdOrder(orderData)
      
      // If we get here, assume success since errors would be caught
      cartStore.clearCart()
      dialog.value = false
      window.toastr?.['success']('Dine-in order held successfully')
    } catch (holdError) {
      // Log error but continue checking if order was created
      logger.error('Hold order error:', holdError)

      // Check if the order was actually created despite the error
      await new Promise(resolve => setTimeout(resolve, 500))
      await posStore.fetchHoldInvoices()
      
      // Look for our order in the latest invoices
      const orderExists = posStore.holdInvoices.some(invoice => 
        invoice.type === OrderType.DINE_IN && 
        invoice.description?.includes(`DINE_IN_Table_${tableNames}`)
      )

      if (orderExists) {
        // Order was created successfully despite the error
        cartStore.clearCart()
        dialog.value = false
        window.toastr?.['success']('Dine-in order held successfully')
      }
    }
  } catch (err) {
    logger.error('Failed to hold dine-in order:', err)
    window.toastr?.['error']('Failed to create dine-in order')
  } finally {
    processing.value = false
  }
}

// Close modal handler
const closeModal = () => {
  if (!processing.value) {
    dialog.value = false
    selectedTables.value = []
  }
}

// Watch for dialog open to load tables and set order type
watch(dialog, async (newValue) => {
  if (newValue) {
    try {
      setOrderType(OrderType.DINE_IN)
      tables.value = await getTables()
    } catch (err) {
      logger.error('Failed to initialize dine-in modal:', err)
      window.toastr?.['error']('Failed to load tables')
    }
  } else {
    selectedTables.value = []
  }
})

// Expose dialog ref for parent component
defineExpose({
  dialog
})
</script>

<style scoped>
.table-card {
  transition: all 0.3s ease;
  cursor: pointer;
}

.table-card.available {
  border: 2px solid rgb(var(--v-theme-success));
}

.table-card.occupied {
  border: 2px solid rgb(var(--v-theme-error));
  cursor: not-allowed;
}

.table-card.selected {
  border: 2px solid rgb(var(--v-theme-primary));
  background-color: rgb(var(--v-theme-primary), 0.1);
}

.v-card-text {
  padding-top: 16px;
}
</style>
