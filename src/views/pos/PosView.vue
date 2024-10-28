<!-- src/views/pos/PosView.vue -->
<template>
  <v-layout class="pos-layout fill-height">
    <!-- Top Bar -->
    <v-app-bar flat class="px-4">
      <v-select
        v-model="selectedCustomer"
        label="Customer"
        :items="companyStore.customersForDisplay"
        :loading="companyStore.loading"
        density="compact"
        hide-details
        class="max-w-[200px] mr-2"
        @update:model-value="handleCustomerChange"
      />

      <v-select
        v-model="selectedStore"
        label="Store"
        :items="companyStore.storesForDisplay"
        :loading="companyStore.loadingStores"
        density="compact"
        hide-details
        class="max-w-[200px] mr-2"
        :disabled="!selectedCustomer"
        @update:model-value="handleStoreChange"
      />

      <v-select
        v-model="selectedCashier"
        label="Cash Register"
        :items="companyStore.cashRegistersForDisplay"
        :loading="companyStore.loadingCashRegisters"
        density="compact"
        hide-details
        class="max-w-[200px]"
        :disabled="!selectedStore"
        @update:model-value="handleCashierChange"
      />

      <v-spacer />
      
      <div class="notification-indicator">
        <v-badge
          :content="notifications.length"
          :model-value="notifications.length > 0"
          color="error"
        >
          <v-icon icon="mdi-bell" />
        </v-badge>
      </div>
    </v-app-bar>

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

    <!-- System Not Ready Alert -->
    <v-alert
      v-if="!companyStore.isConfigured"
      type="warning"
      class="ma-4"
    >
      Please select a customer, store, and cash register to continue.
    </v-alert>

    <!-- Main Content -->
    <v-main v-else class="pos-main">
      <v-container fluid class="fill-height pa-0">
        <v-row no-gutters class="fill-height">
          <!-- Left Side - Cart -->
          <v-col cols="12" md="4" class="pos-cart border-r">
            <pos-cart />
          </v-col>

          <!-- Right Side - Products -->
          <v-col cols="12" md="8" class="pos-products">
            <pos-products />
          </v-col>
        </v-row>
      </v-container>
    </v-main>

    <!-- Bottom Bar -->
    <v-footer app class="pos-footer d-flex justify-space-between px-4 py-2">
      <div class="d-flex gap-2">
        <v-btn
          prepend-icon="mdi-account-group"
          color="primary"
          :disabled="!companyStore.isConfigured"
          @click="assignTable"
        >
          Assign Table
        </v-btn>
        <v-btn
          prepend-icon="mdi-shopping-outline"
          color="success"
          :disabled="!companyStore.isConfigured"
          @click="toGoOrder"
        >
          To-Go Order
        </v-btn>
        <v-btn
          prepend-icon="mdi-notebook-outline"
          color="secondary"
          :disabled="!companyStore.isConfigured"
          @click="openTab"
        >
          Open Tab
        </v-btn>
      </div>

      <div class="d-flex gap-2">
        <v-btn
          prepend-icon="mdi-clock-outline"
          color="info"
          :disabled="!companyStore.isConfigured"
          @click="viewOrders"
        >
          Orders
        </v-btn>
        <v-btn
          prepend-icon="mdi-cash-register"
          color="success"
          :disabled="!companyStore.isConfigured"
          @click="processPayment"
        >
          Pay
        </v-btn>
        <v-btn
          color="pink"
          :disabled="!companyStore.isConfigured"
          @click="submitOrder"
        >
          Submit Order
        </v-btn>
        <v-btn
          icon="mdi-printer"
          variant="outlined"
          :disabled="!companyStore.isConfigured"
          @click="printOrder"
        />
      </div>
    </v-footer>

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
import { ref, onMounted } from 'vue'
import { useCompanyStore } from '@/stores/company'
import PosCart from './components/PosCart.vue'
import PosProducts from './components/PosProducts.vue'
import { logger } from '@/utils/logger'

const companyStore = useCompanyStore()

// UI state
const loading = ref(false)
const error = ref(null)
const notifications = ref([])

// Selected values - synced with store
const selectedCustomer = ref(companyStore.selectedCustomer)
const selectedStore = ref(companyStore.selectedStore)
const selectedCashier = ref(companyStore.selectedCashier)

// Handle selection changes
const handleCustomerChange = async (customerId) => {
  if (!customerId) return
  
  try {
    await companyStore.setSelectedCustomer(customerId)
    selectedStore.value = null
    selectedCashier.value = null
  } catch (err) {
    error.value = err.message
    logger.error('Failed to set customer:', err)
  }
}

const handleStoreChange = async (storeId) => {
  if (!storeId) return
  
  try {
    await companyStore.setSelectedStore(storeId)
    selectedCashier.value = null
  } catch (err) {
    error.value = err.message
    logger.error('Failed to set store:', err)
  }
}

const handleCashierChange = async (cashierId) => {
  if (!cashierId) return
  
  try {
    await companyStore.setselectedCashier(cashierId)
  } catch (err) {
    error.value = err.message
    logger.error('Failed to set cashier:', err)
  }
}

// Initialize store data
onMounted(async () => {
  logger.startGroup('POS View: Mount')
  loading.value = true
  error.value = null
  
  try {
    await companyStore.fetchCustomers()
    
    // Restore selections from store if they exist
    if (companyStore.selectedCustomer) {
      selectedCustomer.value = companyStore.selectedCustomer
    }
    if (companyStore.selectedStore) {
      selectedStore.value = companyStore.selectedStore
    }
    if (companyStore.selectedCashier) {
      selectedCashier.value = companyStore.selectedCashier
    }
  } catch (err) {
    error.value = err.message || 'Failed to initialize POS view'
    logger.error('Failed to initialize POS view:', err)
  } finally {
    loading.value = false
    logger.endGroup()
  }
})

// Action handlers
const assignTable = async () => {
  try {
    // Implement table assignment logic
    logger.info('Table assignment requested')
  } catch (err) {
    error.value = err.message
    logger.error('Failed to assign table:', err)
  }
}

const toGoOrder = async () => {
  try {
    // Implement to-go order logic
    logger.info('To-go order requested')
  } catch (err) {
    error.value = err.message
    logger.error('Failed to create to-go order:', err)
  }
}

const openTab = async () => {
  try {
    // Implement open tab logic
    logger.info('Open tab requested')
  } catch (err) {
    error.value = err.message
    logger.error('Failed to open tab:', err)
  }
}

const viewOrders = async () => {
  try {
    // Implement orders view logic
    logger.info('View orders requested')
  } catch (err) {
    error.value = err.message
    logger.error('Failed to view orders:', err)
  }
}

const processPayment = async () => {
  try {
    // Implement payment processing logic
    logger.info('Payment processing requested')
  } catch (err) {
    error.value = err.message
    logger.error('Failed to process payment:', err)
  }
}

const submitOrder = async () => {
  try {
    // Implement order submission logic
    logger.info('Order submission requested')
  } catch (err) {
    error.value = err.message
    logger.error('Failed to submit order:', err)
  }
}

const printOrder = async () => {
  try {
    // Implement print functionality
    logger.info('Print order requested')
  } catch (err) {
    error.value = err.message
    logger.error('Failed to print order:', err)
  }
}
</script>

<style scoped>
.pos-layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.pos-main {
  flex: 1;
  overflow: hidden;
}

.pos-cart, .pos-products {
  height: 100%;
  overflow-y: auto;
}

.border-r {
  border-right: 1px solid rgba(0, 0, 0, 0.12);
}
</style>
