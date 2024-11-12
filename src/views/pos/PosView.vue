<!-- src/views/pos/PosView.vue -->
<template>
  <v-layout class="pos-layout fill-height" :class="{ 'mobile-layout': $vuetify.display.smAndDown }">
    <!-- Error Alert -->
    <v-alert
      v-if="error"
      type="error"
      closable
      class="ma-4"
      @click:close="clearError"
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
import { onMounted, watch } from 'vue'
import { useCompanyStore } from '../../stores/company'
import PosCart from './components/PosCart.vue'
import PosProducts from './components/PosProducts.vue'
import PosFooter from './components/PosFooter.vue'
import ReferenceDialog from './components/dialogs/ReferenceDialog.vue'
import { useCashierSelection } from './composables/useCashierSelection'
import { useOrderManagement } from './composables/useOrderManagement'
import { useErrorHandling } from './composables/useErrorHandling'
import { logger } from '../../utils/logger'

// Store initialization
const companyStore = useCompanyStore()

// Composables
const {
  showSelectionDialog,
  selectedCashier,
  cashierError,
  isReadyToContinue,
  handleCashierChange,
  initializeSelection
} = useCashierSelection()

const {
  showReferenceDialog,
  confirmHoldOrder,
  printOrder,
  submitOrder
} = useOrderManagement()

const {
  error,
  loading,
  clearError
} = useErrorHandling()

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
  
  try {
    await initializeSelection()
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
  padding-bottom: 0;
  overflow: hidden;
  position: relative;
}

.mobile-layout {
  padding-bottom: 120px; /* Increased padding for mobile footer */
}

:deep(.v-main) {
  flex: 1 1 auto;
  height: calc(100vh - 88px); /* Subtract footer height */
  overflow: hidden;
  margin-bottom: 88px; /* Add margin for footer */
}

:deep(.v-main > .v-main__wrap) {
  height: 100%;
}

@media (max-width: 600px) {
  :deep(.v-main) {
    height: calc(100vh - 120px);
    margin-bottom: 120px; /* Larger margin for mobile footer */
  }
}

@media (max-width: 600px) {
  .pos-cart-mobile, .pos-products-mobile {
    height: calc(50vh - 60px); /* Adjust for mobile header */
    max-height: none;
    overflow-y: auto;
  }
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
