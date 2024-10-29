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
            <div class="d-flex align-center px-4 py-2">
              <v-text-field
                v-model="searchQuery"
                label="Search products"
                prepend-inner-icon="mdi-magnify"
                variant="outlined"
                density="comfortable"
                class="mr-4"
                @update:model-value="handleSearch"
              ></v-text-field>
              
              <v-select
                v-model="selectedCategory"
                :items="categories"
                label="Category"
                variant="outlined"
                density="comfortable"
                @update:model-value="handleCategoryChange"
              ></v-select>
            </div>
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
          :disabled="!companyStore.isConfigured || cartStore.isEmpty"
          @click="assignTable"
        >
          Assign Table
        </v-btn>
        <v-btn
          prepend-icon="mdi-shopping-outline"
          color="success"
          :disabled="!companyStore.isConfigured || cartStore.isEmpty"
          @click="toGoOrder"
        >
          To-Go Order
        </v-btn>
        <v-btn
          prepend-icon="mdi-notebook-outline"
          color="secondary"
          :disabled="!companyStore.isConfigured || cartStore.isEmpty"
          @click="openTab"
        >
          Open Tab
        </v-btn>
      </div>

      <div class="d-flex gap-2">
        <held-orders-modal />
        <v-btn
          prepend-icon="mdi-cash-register"
          color="success"
          :disabled="!companyStore.isConfigured || cartStore.isEmpty"
          @click="processPayment"
        >
          Pay
        </v-btn>
        <v-btn
          color="pink"
          :disabled="!companyStore.isConfigured || cartStore.isEmpty"
          @click="submitOrder"
        >
          Submit Order
        </v-btn>
        <v-btn
          icon="mdi-printer"
          variant="outlined"
          :disabled="!companyStore.isConfigured || cartStore.isEmpty"
          @click="printOrder"
        />
      </div>
    </v-footer>

    <!-- Table Assignment Dialog -->
    <v-dialog v-model="showTableDialog" max-width="500">
      <v-card>
        <v-card-title>Assign Table</v-card-title>
        <v-card-text>
          <v-select
            v-model="selectedTable"
            label="Select Table"
            :items="availableTables"
            item-title="name"
            item-value="id"
            :loading="loadingTables"
            density="compact"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn
            color="grey"
            variant="text"
            @click="showTableDialog = false"
          >
            Cancel
          </v-btn>
          <v-btn
            color="primary"
            :loading="assigningTable"
            :disabled="!selectedTable"
            @click="confirmTableAssignment"
          >
            Assign
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Payment Dialog -->
    <v-dialog v-model="showPaymentDialog" max-width="600">
      <v-card>
        <v-card-title>Process Payment</v-card-title>
        <v-card-text>
          <v-select
            v-model="selectedPaymentMethod"
            label="Payment Method"
            :items="paymentMethods"
            item-title="name"
            item-value="id"
            density="compact"
            class="mb-4"
          />

          <div class="d-flex justify-space-between mb-4">
            <span class="text-h6">Total Amount:</span>
            <span class="text-h6">${{ formatPrice(cartStore.total) }}</span>
          </div>

          <template v-if="selectedPaymentMethod">
            <v-text-field
              v-model="paymentAmount"
              label="Amount"
              type="number"
              :min="0"
              :max="cartStore.total"
              density="compact"
              class="mb-4"
            />

            <v-textarea
              v-model="paymentNotes"
              label="Notes"
              rows="2"
              density="compact"
            />
          </template>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn
            color="grey"
            variant="text"
            @click="showPaymentDialog = false"
          >
            Cancel
          </v-btn>
          <v-btn
            color="success"
            :loading="processingPayment"
            :disabled="!canProcessPayment"
            @click="confirmPayment"
          >
            Process Payment
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

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
import { ref, computed, onMounted } from 'vue'
import { useCompanyStore } from '@/stores/company'
import { useCartStore } from '@/stores/cart-store'
import PosCart from './components/PosCart.vue'
import PosProducts from './components/PosProducts.vue'
import HeldOrdersModal from './components/HeldOrdersModal.vue'
import { posOperations } from '@/services/api/pos-operations'
import { logger } from '@/utils/logger'

const companyStore = useCompanyStore()
const cartStore = useCartStore()

// UI state
const loading = ref(false)
const error = ref(null)
const notifications = ref([])
const searchQuery = ref('')
const selectedCategory = ref('all')

// Selected values - synced with store
const selectedCustomer = ref(companyStore.selectedCustomer)
const selectedStore = ref(companyStore.selectedStore)
const selectedCashier = ref(companyStore.selectedCashier)

// Table Dialog State
const showTableDialog = ref(false)
const loadingTables = ref(false)
const assigningTable = ref(false)
const selectedTable = ref(null)
const availableTables = ref([])

// Payment Dialog State
const showPaymentDialog = ref(false)
const processingPayment = ref(false)
const selectedPaymentMethod = ref(null)
const paymentAmount = ref(0)
const paymentNotes = ref('')
const paymentMethods = ref([
  { id: 'cash', name: 'Cash' },
  { id: 'card', name: 'Credit Card' },
  { id: 'other', name: 'Other' }
])

// Categories
const categories = ref([
  { title: 'All Categories', value: 'all' }
])

// Computed
const canProcessPayment = computed(() => {
  return selectedPaymentMethod.value && 
         paymentAmount.value > 0 && 
         paymentAmount.value <= cartStore.total
})

// Format price
const formatPrice = (price) => {
  if (!price) return '0.00'
  return Number(price).toFixed(2)
}

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

const handleSearch = (value) => {
  searchQuery.value = value
}

const handleCategoryChange = (value) => {
  selectedCategory.value = value
}

// Table Management
const loadTables = async () => {
  if (!companyStore.selectedCashier) return
  
  loadingTables.value = true
  try {
    const response = await posOperations.getTables(companyStore.selectedCashier)
    availableTables.value = response || []
    logger.info('Loaded tables:', availableTables.value)
  } catch (err) {
    error.value = err.message
    logger.error('Failed to load tables:', err)
  } finally {
    loadingTables.value = false
  }
}

const assignTable = async () => {
  showTableDialog.value = true
  await loadTables()
}

const confirmTableAssignment = async () => {
  if (!selectedTable.value) return
  
  assigningTable.value = true
  try {
    await posOperations.assignTable({
      table_id: selectedTable.value,
      cash_register_id: companyStore.selectedCashier
    })
    
    showTableDialog.value = false
    selectedTable.value = null
    
    // Create hold invoice for the table
    await createHoldInvoice(`Table ${selectedTable.value} Order`)
  } catch (err) {
    error.value = err.message
    logger.error('Failed to assign table:', err)
  } finally {
    assigningTable.value = false
  }
}

// Order Management
const createHoldInvoice = async (description = '') => {
  try {
    const holdInvoice = await cartStore.createHoldInvoice(description)
    await posOperations.createHoldInvoice(holdInvoice)
    cartStore.clearCart()
  } catch (err) {
    error.value = err.message
    logger.error('Failed to create hold invoice:', err)
  }
}

const toGoOrder = async () => {
  try {
    await createHoldInvoice('To-Go Order')
  } catch (err) {
    error.value = err.message
    logger.error('Failed to create to-go order:', err)
  }
}

const openTab = async () => {
  try {
    await createHoldInvoice('Open Tab')
  } catch (err) {
    error.value = err.message
    logger.error('Failed to open tab:', err)
  }
}

// Payment Processing
const processPayment = () => {
  showPaymentDialog.value = true
  paymentAmount.value = cartStore.total
}

const confirmPayment = async () => {
  if (!canProcessPayment.value) return
  
  processingPayment.value = true
  try {
    const orderData = {
      items: cartStore.items,
      total: cartStore.total,
      subtotal: cartStore.subtotal,
      tax: cartStore.taxAmount,
      discount_type: cartStore.discountType,
      discount: cartStore.discountValue,
      discount_amount: cartStore.discountAmount,
      payment: {
        amount: paymentAmount.value,
        payment_method_id: selectedPaymentMethod.value,
        notes: paymentNotes.value
      }
    }
    
    await posOperations.submitOrder(orderData)
    
    showPaymentDialog.value = false
    cartStore.clearCart()
  } catch (err) {
    error.value = err.message
    logger.error('Failed to process payment:', err)
  } finally {
    processingPayment.value = false
  }
}

const submitOrder = async () => {
  try {
    const orderData = {
      items: cartStore.items,
      total: cartStore.total,
      subtotal: cartStore.subtotal,
      tax: cartStore.taxAmount,
      discount_type: cartStore.discountType,
      discount: cartStore.discountValue,
      discount_amount: cartStore.discountAmount
    }
    
    await posOperations.submitOrder(orderData)
    cartStore.clearCart()
  } catch (err) {
    error.value = err.message
    logger.error('Failed to submit order:', err)
  }
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
