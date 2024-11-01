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
      @process-payment="processPayment"
      @print-order="printOrder"
      @submit-order="submitOrder"
    />

    <!-- Reference Number Dialog -->
    <reference-dialog
      v-model="showReferenceDialog"
      @confirm="confirmHoldOrder"
    />

    <!-- Payment Dialog -->
    <payment-dialog
      v-model="showPaymentDialog"
      @confirm="handlePaymentComplete"
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
import { ref, onMounted } from 'vue'
import { useCompanyStore } from '../../stores/company'
import { useCartStore } from '../../stores/cart-store'
import PosCart from './components/PosCart.vue'
import PosProducts from './components/PosProducts.vue'
import PosFooter from './components/PosFooter.vue'
import PaymentDialog from './components/dialogs/PaymentDialog.vue'
import ReferenceDialog from './components/dialogs/ReferenceDialog.vue'
import { posOperations } from '../../services/api/pos-operations'
import { logger } from '../../utils/logger'

const companyStore = useCompanyStore()
const cartStore = useCartStore()

// UI state
const loading = ref(false)
const error = ref(null)

// Dialog state
const showReferenceDialog = ref(false)
const showPaymentDialog = ref(false)

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

// Payment Processing
const processPayment = () => {
  if (!cartStore.items.length) {
    error.value = 'Cart is empty'
    return
  }
  showPaymentDialog.value = true
}

const handlePaymentComplete = async () => {
  try {
    // Payment was successful, clear the cart
    cartStore.clearCart()
    // Optionally show success message or trigger other actions
  } catch (err) {
    error.value = err.message
    logger.error('Error handling payment completion:', err)
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
