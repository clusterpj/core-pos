<template>
  <v-dialog v-model="dialog" max-width="600">
    <template v-slot:activator="{ props: dialogProps }">
      <v-btn
        color="primary"
        v-bind="dialogProps"
        prepend-icon="mdi-table-furniture"
        :loading="loading"
        :disabled="disabled"
      >
        DINE IN
      </v-btn>
    </template>

    <v-card>
      <v-card-title class="text-h5">
        Table Selection
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
            <v-col cols="12" class="text-center">
              <v-alert type="error" variant="tonal">
                {{ error }}
              </v-alert>
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

          <!-- Table Selection -->
          <template v-else>
            <!-- Selected Tables List -->
            <v-row v-if="selectedTables.length > 0">
              <v-col cols="12">
                <v-list>
                  <v-list-item v-for="table in selectedTables" :key="table.table_id">
                    <template v-slot:prepend>
                      <v-icon>mdi-table-furniture</v-icon>
                    </template>
                    
                    <v-list-item-title>{{ table.name }}</v-list-item-title>
                    
                    <template v-slot:append>
                      <v-text-field
                        v-model.number="table.quantity"
                        type="number"
                        min="1"
                        label="Persons"
                        density="compact"
                        style="width: 100px"
                        hide-details
                        @update:model-value="updateQuantity(table.table_id, $event)"
                      ></v-text-field>
                      <v-btn
                        icon="mdi-close"
                        size="small"
                        class="ml-2"
                        @click="removeTable(table.table_id)"
                      ></v-btn>
                    </template>
                  </v-list-item>
                </v-list>
              </v-col>
            </v-row>

            <!-- Add Table Section -->
            <v-row>
              <v-col cols="8">
                <v-select
                  v-model="selectedTableId"
                  :items="availableTables"
                  label="Select Table"
                  item-title="name"
                  item-value="id"
                  variant="outlined"
                  density="comfortable"
                  :error-messages="tableError"
                  :disabled="loading"
                ></v-select>
              </v-col>
              <v-col cols="4">
                <v-text-field
                  v-model.number="newTableQuantity"
                  type="number"
                  min="1"
                  label="Persons"
                  density="comfortable"
                  hide-details
                  :disabled="loading"
                ></v-text-field>
              </v-col>
            </v-row>

            <v-row>
              <v-col cols="12">
                <v-btn
                  color="primary"
                  variant="outlined"
                  block
                  @click="addSelectedTable"
                  :disabled="!selectedTableId || loading"
                >
                  Add Table
                </v-btn>
              </v-col>
            </v-row>

            <v-divider class="my-4"></v-divider>

            <!-- Confirm Button -->
            <v-row>
              <v-col cols="12" class="text-center">
                <v-btn
                  color="primary"
                  size="large"
                  block
                  @click="processOrder"
                  :loading="processing"
                  :disabled="!selectedTables.length || processing"
                >
                  Confirm Tables
                </v-btn>
              </v-col>
            </v-row>
          </template>
        </v-container>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useTableAssignment } from '../../composables/useTableAssignment'
import { useOrderType } from '../../composables/useOrderType'
import { usePosStore } from '@/stores/pos-store'
import { useCartStore } from '@/stores/cart-store'
import { logger } from '@/utils/logger'

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
  tables,
  selectedTables,
  loading: tablesLoading,
  loadTables,
  addTable,
  removeTable,
  updateTableQuantity,
  clearTableSelection,
  getSelectedTablesForApi
} = useTableAssignment()

const {
  setOrderType,
  processOrder: processOrderType,
  ORDER_TYPES,
  error: orderError,
  setCustomerInfo
} = useOrderType()

// Local state
const dialog = ref(false)
const loading = computed(() => tablesLoading.value)
const processing = ref(false)
const error = computed(() => orderError.value)
const tableError = ref('')
const selectedTableId = ref(null)
const newTableQuantity = ref(1)

// Computed
const availableTables = computed(() => {
  return tables.value.filter(table => 
    !selectedTables.value.some(selected => selected.table_id === table.id)
  )
})

// Watch for dialog open to load tables and set order type
watch(dialog, async (newValue) => {
  if (newValue) {
    try {
      setOrderType(ORDER_TYPES.DINE_IN)
      await loadTables()
    } catch (err) {
      logger.error('Failed to initialize dine-in modal:', err)
      error.value = err.message || 'Failed to load tables'
    }
  } else {
    // Reset state when dialog closes
    selectedTableId.value = null
    newTableQuantity.value = 1
    tableError.value = ''
    clearTableSelection()
  }
})

// Methods
const addSelectedTable = () => {
  if (selectedTableId.value) {
    addTable(selectedTableId.value, newTableQuantity.value || 1)
    selectedTableId.value = null
    newTableQuantity.value = 1
  }
}

const updateQuantity = (tableId, quantity) => {
  if (quantity > 0) {
    updateTableQuantity(tableId, quantity)
  }
}

// Process the order
const processOrder = async () => {
  if (!selectedTables.value.length) {
    tableError.value = 'Please select at least one table'
    return
  }

  processing.value = true
  tableError.value = ''

  try {
    // Set table information in cart store
    cartStore.setSelectedTables(getSelectedTablesForApi())

    // Set customer info with table details
    const tableNames = selectedTables.value.map(t => t.name).join(', ')
    setCustomerInfo({
      tableNumbers: tableNames,
      tables: getSelectedTablesForApi()
    })

    await processOrderType()
    dialog.value = false
    window.toastr?.['success']('Tables assigned successfully')
  } catch (err) {
    logger.error('Failed to process dine-in order:', err)
    tableError.value = err.message || 'Failed to assign tables'
  } finally {
    processing.value = false
  }
}

// Close modal handler
const closeModal = () => {
  if (!processing.value) {
    dialog.value = false
  }
}
</script>

<style scoped>
.v-card-text {
  padding-top: 20px;
}
</style>
