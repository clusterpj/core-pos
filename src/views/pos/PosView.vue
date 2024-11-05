<!-- src/views/pos/PosView.vue -->
<template>
  <v-layout class="pos-layout fill-height">
    <!-- Error Alert -->
    <v-alert
      v-if="error"
      type="error"
      closable
      class="ma-4"
      @click:close="error = null"
    >
      {{ error }}
    </v-alert>

    <!-- Selection Dialog -->
    <v-dialog
      v-model="showSelectionDialog"
      persistent
      max-width="500px"
      :eager="true"
    >
      <v-card>
        <v-card-title>Select Cashier</v-card-title>
        <v-card-text>
          <v-select
            v-model="selectedCashier"
            :items="companyStore.cashRegistersForDisplay"
            label="Select Cashier"
            item-title="title"
            item-value="value"
            :error-messages="cashierError"
            :loading="companyStore.loadingCashRegisters"
            :disabled="companyStore.loadingCashRegisters"
            @update:model-value="handleCashierChange"
          >
            <template #item="{ props, item }">
              <v-list-item v-bind="props">
                <v-list-item-title>{{ item.raw.title }}</v-list-item-title>
                <v-list-item-subtitle>
                  Store: {{ item.raw.storeName || 'Not assigned' }}
                </v-list-item-subtitle>
              </v-list-item>
            </template>
          </v-select>

          <!-- Display selected info -->
          <v-list v-if="selectedCashier" density="compact" class="mt-4">
            <v-list-item>
              <template #prepend>
                <v-icon icon="mdi-store" class="mr-2" />
              </template>
              <v-list-item-title>Store</v-list-item-title>
              <v-list-item-subtitle>
                <template v-if="companyStore.loadingStores">
                  <v-progress-linear
                    indeterminate
                    color="primary"
                    class="mt-2"
                  />
                </template>
                <template v-else>
                  {{ companyStore.selectedStoreDisplay || 'No store selected' }}
                </template>
              </v-list-item-subtitle>
            </v-list-item>

            <v-list-item>
              <template #prepend>
                <v-icon icon="mdi-account-multiple" class="mr-2" />
              </template>
              <v-list-item-title>Customer</v-list-item-title>
              <v-list-item-subtitle>
                <template v-if="companyStore.loading">
                  <v-progress-linear
                    indeterminate
                    color="primary"
                    class="mt-2"
                  />
                </template>
                <template v-else>
                  {{ companyStore.selectedCustomerDisplay || 'No customer selected' }}
                </template>
              </v-list-item-subtitle>
            </v-list-item>
          </v-list>

          <!-- Error Messages -->
          <v-alert
            v-if="companyStore.storeError"
            type="error"
            density="compact"
            class="mt-4"
          >
            Failed to load store information: {{ companyStore.storeError }}
          </v-alert>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn
            color="primary"
            :disabled="!isReadyToContinue"
            :loading="companyStore.loadingStores || companyStore.loading"
            @click="showSelectionDialog = false"
          >
            Continue
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Main Content -->
    <template v-if="companyStore.isConfigured">
      <v-main class="pos-main">
        <v-container fluid class="fill-height pa-0">
          <v-row no-gutters class="fill-height">
            <!-- Left Side - Cart -->
            <v-col 
              cols="12" 
              sm="12" 
              md="5" 
              lg="4" 
              xl="3" 
              class="pos-cart border-r"
              :class="{'pos-cart-mobile': $vuetify.display.smAndDown}"
            >
              <pos-cart />
            </v-col>

            <!-- Right Side - Products -->
            <v-col 
              cols="12" 
              sm="12" 
              md="7" 
              lg="8" 
              xl="9" 
              class="pos-products"
              :class="{'pos-products-mobile': $vuetify.display.smAndDown}"
            >
              <pos-products />
            </v-col>
          </v-row>
        </v-container>
      </v-main>

      <!-- Footer -->
      <pos-footer
        @print-order="printOrder"
        @submit-order="submitOrder"
      />
    </template>

    <!-- Reference Number Dialog -->
    <reference-dialog
      v-model="showReferenceDialog"
      @confirm="confirmHoldOrder"
    />

    <!-- Loading Overlay -->
    <v-overlay
      :model-value="loading"
      class="align-center justify-center"
    >
      <v-progress-circular
        size="64"
        color="primary"
        indeterminate
      />
    </v-overlay>
  </v-layout>
</template>

<script setup>
import { ref, onMounted, watch, computed } from 'vue'
import { useCompanyStore } from '../../stores/company'
import { useCartStore } from '../../stores/cart-store'
import PosCart from './components/PosCart.vue'
import PosProducts from './components/PosProducts.vue'
import PosFooter from './components/PosFooter.vue'
import ReferenceDialog from './components/dialogs/ReferenceDialog.vue'
import { posOperations } from '../../services/api/pos-operations'
import { logger } from '../../utils/logger'

const companyStore = useCompanyStore()
const cartStore = useCartStore()

// UI state
const loading = ref(false)
const error = ref(null)
const cashierError = ref('')
const showSelectionDialog = ref(false)

// Dialog state
const showReferenceDialog = ref(false)

// Selected values
const selectedCashier = ref(null)

// Computed
const isReadyToContinue = computed(() => {
  return companyStore.isConfigured && 
         !companyStore.loadingStores && 
         !companyStore.loading &&
         !companyStore.storeError
})

// Handle cashier selection
const handleCashierChange = async (cashierId) => {
  if (!cashierId) return
  
  try {
    cashierError.value = ''
    await companyStore.setSelectedCashier(cashierId)
    
    // Validate configuration after selection
    if (!companyStore.isConfigured) {
      cashierError.value = 'Selected cashier has incomplete configuration'
      return
    }
  } catch (err) {
    error.value = err.message
    cashierError.value = err.message
    logger.error('Failed to set cashier:', err)
  }
}

// Hold Order Management
const confirmHoldOrder = async (referenceNumber) => {
  if (!referenceNumber) return
  
  try {
    const holdInvoice = cartStore.prepareHoldInvoiceData(
      companyStore.selectedStore,
      companyStore.selectedCashier,
      referenceNumber
    )
    await posOperations.createHoldInvoice(holdInvoice)
    cartStore.clearCart()
  } catch (err) {
    error.value = err.message
    logger.error('Failed to create hold invoice:', err)
    throw err
  }
}

const submitOrder = () => {
  showReferenceDialog.value = true
}

const printOrder = async (orderId = null) => {
  try {
    if (orderId) {
      await posOperations.printOrder(orderId)
    } else {
      // Print current cart
      const orderData = {
        items: cartStore.items,
        total: cartStore.total,
        subtotal: cartStore.subtotal,
        tax: cartStore.taxAmount
      }
      
      const response = await posOperations.submitOrder(orderData)
      await posOperations.printOrder(response.invoice.id)
    }
  } catch (err) {
    error.value = err.message
    logger.error('Failed to print order:', err)
  }
}

// Watch for configuration changes
watch(
  () => companyStore.isConfigured,
  (isConfigured) => {
    if (!isConfigured && !showSelectionDialog.value) {
      showSelectionDialog.value = true
    }
  },
  { immediate: true }
)

// Initialize store data
onMounted(async () => {
  logger.startGroup('POS View: Mount')
  loading.value = true
  error.value = null
  
  try {
    await companyStore.initializeStore()
    
    // Show selection dialog if not configured
    if (!companyStore.isConfigured) {
      showSelectionDialog.value = true
    }
  } catch (err) {
    error.value = err.message || 'Failed to initialize POS view'
    logger.error('Failed to initialize POS view:', err)
  } finally {
    loading.value = false
    logger.endGroup()
  }
})
</script>

<style scoped>
.pos-layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
}

.pos-main {
  flex: 1;
  overflow: hidden;
}

.pos-cart, .pos-products {
  height: 100%;
  overflow-y: auto;
}

.pos-cart-mobile {
  height: 50vh;
  border-bottom: 1px solid rgba(0, 0, 0, 0.12);
}

.pos-products-mobile {
  height: 50vh;
}

.border-r {
  border-right: 1px solid rgba(0, 0, 0, 0.12);
}
</style>
