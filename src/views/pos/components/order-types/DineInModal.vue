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
              <p>No tables available</p>
            </v-col>
          </v-row>

          <!-- Table Selection -->
          <template v-else>
            <v-row>
              <v-col cols="12">
                <v-select
                  v-model="selectedTable"
                  :items="tables"
                  label="Select Table"
                  item-title="name"
                  item-value="id"
                  variant="outlined"
                  density="comfortable"
                  :error-messages="tableError"
                ></v-select>
              </v-col>
            </v-row>

            <v-row>
              <v-col cols="12" class="text-center">
                <v-btn
                  color="primary"
                  size="large"
                  block
                  @click="processOrder"
                  :loading="processing"
                  :disabled="!selectedTable || processing"
                >
                  Confirm Table
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
const { tables, selectedTable, loading: tablesLoading, loadTables } = useTableAssignment()
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
    selectedTable.value = null
    tableError.value = ''
  }
})

// Process the order
const processOrder = async () => {
  if (!selectedTable.value) {
    tableError.value = 'Please select a table'
    return
  }

  processing.value = true
  tableError.value = ''

  try {
    // Set table information in cart store
    cartStore.setSelectedTables([selectedTable.value])

    // Set customer info with table details
    const selectedTableInfo = tables.value.find(t => t.id === selectedTable.value)
    setCustomerInfo({
      tableNumber: selectedTableInfo?.name || selectedTable.value,
      tableId: selectedTable.value
    })

    await processOrderType()
    dialog.value = false
    // Show success message
    window.toastr?.['success']('Table assigned successfully')
  } catch (err) {
    logger.error('Failed to process dine-in order:', err)
    tableError.value = err.message || 'Failed to assign table'
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
