<template>
  <div>
    <v-dialog
      v-model="dialog"
      fullscreen
      transition="dialog-bottom-transition"
      :scrim="false"
      class="payment-dialog"
    >
      <v-card class="modal-card">
        <v-toolbar
          color="primary"
          :elevation="1"
        >
          <v-toolbar-title class="text-h6 font-weight-medium">
            <v-icon icon="mdi-cash-register" size="large" class="mr-2"></v-icon>
            Process Payment
          </v-toolbar-title>
          <v-spacer></v-spacer>
          <v-btn
            icon
            @click="closeDialog"
          >
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-toolbar>

        <div class="payment-content">
          <!-- Error Alert -->
          <v-alert
            v-if="error"
            type="error"
            variant="tonal"
            closable
            class="error-alert"
            @click:close="error = null"
          >
            {{ error }}
          </v-alert>

          <!-- Loading State -->
          <div v-if="processing" class="processing-state">
            <v-progress-circular
              indeterminate
              color="primary"
              size="64"
            ></v-progress-circular>
            <div class="text-h6 mt-4">Processing Payment...</div>
          </div>

          <!-- Cart Empty Warning -->
          <v-alert
            v-else-if="!hasItems"
            type="warning"
            variant="tonal"
            class="mb-4"
          >
            Please add items to cart before proceeding with payment.
          </v-alert>

          <!-- Payment Content -->
          <v-container v-else class="payment-container pa-4">
            <v-row>
              <v-col cols="12" class="text-center">
                <v-card variant="outlined" class="invoice-summary-card mb-4">
                  <v-card-text class="py-4">
                    <div class="d-flex justify-space-between mb-2">
                      <span>Subtotal:</span>
                      <strong>{{ formatCurrency(cartStore.subtotal) }}</strong>
                    </div>
                    <div class="d-flex justify-space-between mb-2">
                      <span>Tax:</span>
                      <strong>{{ formatCurrency(cartStore.taxAmount) }}</strong>
                    </div>
                    <div v-if="cartStore.discountAmount > 0" class="d-flex justify-space-between mb-2">
                      <span>Discount:</span>
                      <strong>-{{ formatCurrency(cartStore.discountAmount) }}</strong>
                    </div>
                    <v-divider class="my-2"></v-divider>
                    <div class="d-flex justify-space-between mb-2">
                      <span class="text-h6">Total:</span>
                      <strong class="text-h6">{{ formatCurrency(cartStore.total) }}</strong>
                    </div>
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>
            <v-row>
              <v-col cols="12" class="d-flex justify-center">
                <v-btn
                  color="primary"
                  size="large"
                  min-width="120"
                  height="48"
                  @click="processPayment"
                  :loading="processing"
                  :disabled="!canPay"
                  class="text-none px-6"
                  rounded="pill"
                  elevation="2"
                >
                  <v-icon start icon="mdi-cash-register" class="mr-1"></v-icon>
                  Pay Now
                </v-btn>
              </v-col>
            </v-row>
          </v-container>
        </div>
      </v-card>
    </v-dialog>

    <!-- Add Payment Dialog -->
    <PaymentDialog
      v-model="showPaymentDialog"
      :invoice="currentInvoice"
      @payment-complete="handlePaymentComplete"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useCartStore } from '@/stores/cart-store'
import { useCompanyStore } from '@/stores/company'
import { useAuthStore } from '@/stores/auth'
import { posApi } from '@/services/api/pos-api'
import { logger } from '@/utils/logger'
import { PriceUtils } from '@/utils/price'
import { OrderType, PaidStatus } from '@/types/order'
import PaymentDialog from './PaymentDialog.vue'

const formatApiDate = (date) => {
  const d = new Date(date)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const props = defineProps({
  modelValue: Boolean
})

const emit = defineEmits(['update:modelValue', 'payment-complete'])

// Store initialization
const cartStore = useCartStore()
const companyStore = useCompanyStore()
const authStore = useAuthStore()

// Ensure company data is loaded
onMounted(async () => {
  console.log('Component mounted, initializing company store...')
  try {
    await companyStore.initializeStore()
    console.log('Company data after initialization:', {
      selectedCustomer: companyStore.selectedCustomer,
      currentStore: companyStore.currentStore,
      isConfigured: companyStore.isConfigured
    })
  } catch (error) {
    console.error('Failed to initialize company store:', error)
  }
})

const { items } = storeToRefs(cartStore)

// Get user from auth store
const { user } = storeToRefs(authStore)
console.log('Auth Store User:', user.value)

// State
const processing = ref(false)
const error = ref(null)
const currentInvoice = ref(null)
const showPaymentDialog = ref(false)

// Dialog computed property
const dialog = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

// Cart validation computed properties
const hasItems = computed(() => items.value.length > 0)
const canPay = computed(() => hasItems.value && !processing.value)

// Computed properties for invoice details
const invoiceNumber = computed(() => {
  return currentInvoice.value?.invoice?.invoice_number || 
         `${currentInvoice.value?.invoicePrefix}-${currentInvoice.value?.nextInvoiceNumber}` || 
         ''
})
const invoiceTotal = computed(() => currentInvoice.value?.total || 0)

// Get current user ID
const getCurrentUserId = computed(() => {
  // Fallback to a default user ID if not available
  return user.value?.id || companyStore.currentStore?.default_user_id || 1
})

// Ensure user profile is loaded before processing payment
const ensureUserProfile = async () => {
  if (!user.value?.id) {
    try {
      await authStore.loadUserProfile()
    } catch (error) {
      logger.warn('Failed to load user profile, using fallback user ID')
    }
  }
}

// Methods
const formatCurrency = (amount) => PriceUtils.format(amount)

const formatInvoiceItems = (items) => {
  return items.map(item => ({
    item_id: Number(item.id),
    name: item.name,
    description: item.description || '',
    price: item.price,
    quantity: item.quantity,
    unit_name: item.unit_name || 'units',
    sub_total: item.price * item.quantity,
    total: item.price * item.quantity,
    discount: "0",
    discount_val: 0,
    discount_type: "fixed",
    tax: Math.round(Number(item.tax || 0)),
    retention_amount: 0,
    retention_concept: null,
    retention_percentage: null,
    retentions_id: null
  }))
}

const createInvoice = async () => {
  logger.startGroup('Creating Retail Invoice')
  try {
    // Ensure company store is initialized
    if (!companyStore.isConfigured) {
      await companyStore.initializeStore()
    }

    // Get next invoice number
    const nextInvoiceResponse = await posApi.invoice.getNextNumber()
    logger.debug('Next invoice number response:', nextInvoiceResponse)
    
    // Get current date
    const currentDate = new Date()
    const formattedDate = formatApiDate(currentDate)
    
    // Format items for invoice
    const formattedItems = formatInvoiceItems(cartStore.items)
    
    // Get the current store details
    const currentStore = companyStore.currentStore
    if (!currentStore) {
      throw new Error('No store selected')
    }
    
    // Prepare invoice data
    const invoiceData = {
      invoice_number: `${nextInvoiceResponse.prefix}-${nextInvoiceResponse.nextNumber}`,
      invoice_date: formattedDate,
      due_date: formatApiDate(new Date(currentDate.getTime() + 7 * 24 * 60 * 60 * 1000)),
      total: PriceUtils.toCents(cartStore.total),
      sub_total: PriceUtils.toCents(cartStore.subtotal),
      tax: PriceUtils.toCents(cartStore.taxAmount),
      items: formattedItems,
      hold_items: formattedItems, // Add hold_items for payment dialog
      taxes: [],
      packages: [],
      tables_selected: [],
      contact: {
        name: currentStore.company_name || "Walk-in Customer",
        company_name: currentStore.company_name || "Walk-in Customer",
        first_name: currentStore.company_name || "Walk-in",
        last_name: "Customer",
        email: currentStore.email || "walk-in@example.com",
        phone: currentStore.phone || "000-000-0000",
        second_phone: "N/A",
        identification: currentStore.tax_id || "N/A",
        type: "company"
      },
      type: OrderType.TO_GO, // Changed from RETAIL to TO_GO since RETAIL is not a valid order type
      status: "SENT",
      paid_status: PaidStatus.UNPAID,
      description: "Retail Point of Sale Transaction",
      user_id: getCurrentUserId.value,
      company_id: companyStore.company?.id,
      invoice_template_id: 1,
      is_invoice_pos: 1,
      is_pdf_pos: true,
      is_hold_invoice: false,
      avalara_bool: false,
      banType: true,
      package_bool: false,
      print_pdf: false,
      save_as_draft: false,
      send_email: false,
      not_charge_automatically: false,
      invoice_pbx_modify: 0,
      send_sms: 0,
      discount: "0",
      discount_type: "fixed",
      discount_val: 0,
      discount_per_item: "NO",
      tip: "0",
      tip_type: "fixed",
      tip_val: 0,
      notes: "",
      hold_invoice_id: null,
      store_id: currentStore.id || 0,
      cash_register_id: companyStore.selectedCashier?.id || 0
    }

    // Create the invoice
    const response = await posApi.invoice.create(invoiceData)
    
    // Set up the current invoice for payment dialog
    currentInvoice.value = {
      invoice: {
        ...invoiceData,
        id: response?.data?.id || `${nextInvoiceResponse.prefix}-${nextInvoiceResponse.nextNumber}`,
        type: OrderType.TO_GO,
        hold_items: formattedItems,
        total: cartStore.total,
        sub_total: cartStore.subtotal,
        tax: cartStore.taxAmount,
        is_prepared_data: true
      }
    }

    // Show payment dialog
    showPaymentDialog.value = true
    dialog.value = false

    logger.endGroup()
    return currentInvoice.value.invoice

  } catch (error) {
    logger.error('Invoice Creation Failed:', error)
    logger.endGroup()
    throw error
  }
}

const processPayment = async () => {
  if (!canPay.value) return
  
  processing.value = true
  error.value = null
  
  try {
    const invoice = await createInvoice()
    if (!invoice) {
      throw new Error('Failed to create invoice')
    }
  } catch (err) {
    error.value = err.message || 'Failed to process payment'
    logger.error('Payment processing error:', err)
  } finally {
    processing.value = false
  }
}

const handlePaymentComplete = async (result) => {
  logger.info('Payment completion handler called with result:', result)
  
  if (result) {
    // Close dialog and emit completion event
    closeDialog()
    emit('payment-complete', result)
  }
}

const closeDialog = () => {
  if (!processing.value) {
    error.value = null
    currentInvoice.value = null
    showPaymentDialog.value = false
    emit('update:modelValue', false)
  }
}
</script>

<style scoped>
.modal-card {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: rgb(var(--v-theme-surface));
}

.v-toolbar {
  position: relative;
  z-index: 1;
}

.payment-content {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  background-color: rgb(var(--v-theme-background));
}

.error-alert {
  position: sticky;
  top: 0;
  z-index: 1;
  margin: 16px;
}

.processing-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 300px;
}

.payment-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 24px;
  max-width: 1200px;
  margin: 0 auto;
}

/* Ensure buttons and interactive elements are large enough for touch */
:deep(.v-btn) {
  min-height: 48px;
}

:deep(.v-text-field .v-field__input),
:deep(.v-select .v-field__input) {
  min-height: 44px;
  padding-top: 8px;
}

/* Improve spacing and readability */
:deep(.v-card-title) {
  font-size: 1.2rem;
  padding: 16px 20px;
}

:deep(.v-card-text) {
  font-size: 1rem;
  line-height: 1.6;
}

/* Ensure proper spacing in container */
:deep(.v-container) {
  padding: 16px;
}

:deep(.v-row) {
  margin-bottom: 16px;
}

:deep(.v-col) {
  padding: 8px;
}

/* Dialog transition */
.dialog-bottom-transition-enter-active,
.dialog-bottom-transition-leave-active {
  transition: transform 0.3s ease-in-out;
}

.dialog-bottom-transition-enter-from,
.dialog-bottom-transition-leave-to {
  transform: translateY(100%);
}
</style>
