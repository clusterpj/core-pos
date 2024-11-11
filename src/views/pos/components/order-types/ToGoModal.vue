<template>
  <!-- Template remains unchanged -->
  <v-dialog v-model="dialog" max-width="600">
    <template v-slot:activator="{ props: dialogProps }">
      <v-btn
        color="primary"
        v-bind="dialogProps"
        prepend-icon="mdi-shopping"
        :loading="loading"
        :disabled="disabled"
      >
        TO GO
      </v-btn>
    </template>

    <v-card>
      <v-card-title class="text-h5">
        To Go Order
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

          <!-- Customer Information Form -->
          <template v-else>
            <v-row>
              <v-col cols="12">
                <v-text-field
                  v-model="customerInfo.name"
                  label="Customer Name"
                  variant="outlined"
                  density="comfortable"
                  :error-messages="validationErrors.name"
                  @input="clearError('name')"
                  required
                ></v-text-field>
              </v-col>
            </v-row>

            <v-row>
              <v-col cols="12">
                <v-text-field
                  v-model="customerInfo.phone"
                  label="Phone Number"
                  variant="outlined"
                  density="comfortable"
                  :error-messages="validationErrors.phone"
                  @input="clearError('phone')"
                  required
                ></v-text-field>
              </v-col>
            </v-row>

            <v-row>
              <v-col cols="12">
                <v-textarea
                  v-model="customerInfo.instructions"
                  label="Special Instructions (Optional)"
                  variant="outlined"
                  density="comfortable"
                  rows="3"
                ></v-textarea>
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
                :disabled="!canProcessOrder || processing"
              >
                {{ getButtonText }}
              </v-btn>
              </v-col>
            </v-row>
          </template>
        </v-container>
      </v-card-text>
    </v-card>
  </v-dialog>

  <!-- Payment Dialog -->
  <PaymentDialog
    v-model="showPaymentDialog"
    :invoice="currentInvoice"
    @payment-complete="handlePaymentComplete"
  />
</template>

<script setup>
import { ref, computed, watch, reactive, onMounted } from 'vue'
import { useOrderType } from '../../composables/useOrderType'
import { usePosStore } from '@/stores/pos-store'
import { useCartStore } from '@/stores/cart-store'
import { useCompanyStore } from '@/stores/company'
import { logger } from '@/utils/logger'
import PaymentDialog from '../dialogs/PaymentDialog.vue'
import { convertHeldOrderToInvoice } from '../held-orders/utils/invoiceConverter'

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
const companyStore = useCompanyStore()

// Composables
const { 
  setOrderType, 
  processOrder: processOrderType, 
  ORDER_TYPES, 
  error: orderError,
  setCustomerInfo
} = useOrderType()

// Computed properties for store and cashier state
const selectedStore = computed(() => companyStore.selectedStore)
const selectedCashier = computed(() => companyStore.selectedCashier)

// Local state
const dialog = ref(false)
const loading = ref(false)
const processing = ref(false)
const error = ref(null)

watch(orderError, (newError) => {
  error.value = newError
})
const showPaymentDialog = ref(false)
const currentInvoice = ref(null)

// Form state
const customerInfo = reactive({
  name: '',
  phone: '',
  instructions: ''
})

// Validation
const validationErrors = reactive({
  name: '',
  phone: ''
})

// Computed properties
const canProcessOrder = computed(() => {
  const hasStore = !!selectedStore.value
  const hasCashier = !!selectedCashier.value
  const hasItems = !cartStore.isEmpty
  const hasValidCustomerInfo = customerInfo.name.trim() && customerInfo.phone.trim()
  
  logger.debug('[ToGoModal] Order prerequisites:', {
    hasStore,
    hasCashier,
    hasItems,
    hasValidCustomerInfo,
    storeId: selectedStore.value,
    cashierId: selectedCashier.value,
    customerInfo: {
      name: customerInfo.name,
      phone: customerInfo.phone
    }
  })
  
  return hasStore && hasCashier && hasItems && hasValidCustomerInfo
})

const getButtonText = computed(() => {
  if (!selectedStore.value) return 'Store Not Selected'
  if (!selectedCashier.value) return 'Cashier Not Selected'
  if (cartStore.isEmpty) return 'Cart Empty'
  return 'Create To Go Order'
})

// Watch for store/cashier changes
watch([selectedStore, selectedCashier], ([newStore, newCashier], [oldStore, oldCashier]) => {
  logger.debug('[ToGoModal] Store/Cashier state changed:', {
    store: { old: oldStore, new: newStore },
    cashier: { old: oldCashier, new: newCashier }
  })
})

// Watch for dialog open to set order type
watch(dialog, (newValue) => {
  logger.debug('[ToGoModal] Dialog state changed:', { newValue })
  if (newValue) {
    logger.info('[ToGoModal] Opening TO-GO modal, setting order type')
    setOrderType(ORDER_TYPES.TO_GO)
  } else {
    logger.debug('[ToGoModal] Closing TO-GO modal, resetting form')
    customerInfo.name = ''
    customerInfo.phone = ''
    customerInfo.instructions = ''
    clearAllErrors()
  }
})

// Initialization
onMounted(async () => {
  logger.info('[ToGoModal] Component mounted')
  try {
    // Check if we need to initialize the company store
    if (!companyStore.isInitialized) {
      logger.debug('[ToGoModal] Initializing company store')
      await companyStore.initializeStore()
    }

    logger.info('[ToGoModal] Store state after mount:', {
      store: selectedStore.value,
      cashier: selectedCashier.value,
      companyStore: {
        selectedStore: companyStore.selectedStore,
        selectedCashier: companyStore.selectedCashier
      }
    })
  } catch (err) {
    logger.error('[ToGoModal] Initialization error:', err)
    error.value = 'Failed to initialize store selections'
  }
})

// Validation methods
const validateForm = () => {
  logger.debug('[ToGoModal] Validating form', customerInfo)
  let isValid = true
  clearAllErrors()

  if (!customerInfo.name.trim()) {
    logger.warn('[ToGoModal] Validation failed: Customer name required')
    validationErrors.name = 'Customer name is required'
    isValid = false
  }

  if (!customerInfo.phone.trim()) {
    logger.warn('[ToGoModal] Validation failed: Phone number required')
    validationErrors.phone = 'Phone number is required'
    isValid = false
  } else {
    // Basic phone number validation (can be enhanced based on requirements)
    const phoneDigits = customerInfo.phone.replace(/\D/g, '')
    if (phoneDigits.length !== 10) {
      validationErrors.phone = 'Please enter a valid 10-digit phone number'
      isValid = false
    }
  }

  logger.debug('[ToGoModal] Form validation result:', { isValid, validationErrors })
  return isValid
}

const clearError = (field) => {
  logger.debug('[ToGoModal] Clearing validation error:', field)
  validationErrors[field] = ''
}

const clearAllErrors = () => {
  logger.debug('[ToGoModal] Clearing all validation errors')
  Object.keys(validationErrors).forEach(key => {
    validationErrors[key] = ''
  })
}

// Process order
const processOrder = async () => {
  logger.info('[ToGoModal] Starting order processing', {
    customerInfo,
    storeState: {
      store: selectedStore.value,
      cashier: selectedCashier.value
    },
    cartState: {
      items: cartStore.items?.length,
      total: cartStore.total
    }
  })

  if (!selectedStore.value || !selectedCashier.value) {
    const missingSelection = !selectedStore.value ? 'store' : 'cashier'
    error.value = `Please select a ${missingSelection} first`
    logger.warn(`[ToGoModal] Missing ${missingSelection} selection`)
    return
  }

  if (!validateForm()) {
    return
  }

  processing.value = true

  try {
    // Format phone number (remove non-digits)
    const formattedPhone = customerInfo.phone.replace(/\D/g, '')
    
    // Update customer info
    setCustomerInfo({
      name: customerInfo.name.trim(),
      phone: formattedPhone,
      instructions: customerInfo.instructions.trim()
    })

    // Validate store and cashier selection
    if (!selectedStore.value || !selectedCashier.value) {
      const missing = !selectedStore.value ? 'store' : 'cashier'
      throw new Error(`${missing} selection required`)
    }

    logger.info('[ToGoModal] Processing order with IDs:', {
      storeId: selectedStore.value,
      cashierId: selectedCashier.value,
      customerName: customerInfo.name
    })

    // Prepare order data
    const orderData = {
      storeId: selectedStore.value,
      cashierId: selectedCashier.value,
      orderName: `TO_GO_${customerInfo.name}`,
      customerInfo: {
        name: customerInfo.name.trim(),
        phone: formattedPhone,
        instructions: customerInfo.instructions.trim()
      }
    }

    const orderResult = await processOrderType(orderData)
    
    if (!orderResult?.success) {
      throw new Error(orderResult?.message || 'Failed to create order')
    }

    // Ensure we have a data object even if it's empty
    const resultData = orderResult.data || {}
    logger.info('[ToGoModal] Hold order created successfully:', resultData)

    // Convert to invoice
    const invoiceResult = await convertHeldOrderToInvoice({
      ...orderResult.data,
      store_id: selectedStore.value,
      cash_register_id: selectedCashier.value
    })
    
    if (!invoiceResult.success) {
      logger.error('[ToGoModal] Failed to create invoice:', invoiceResult)
      throw new Error('Failed to create invoice')
    }

    logger.info('[ToGoModal] Invoice created successfully:', {
      invoiceId: invoiceResult.invoice?.id,
      invoiceNumber: invoiceResult.invoice?.invoice_number
    })

    // Set current invoice and show payment dialog
    currentInvoice.value = invoiceResult
    showPaymentDialog.value = true
    
    // Close the TO-GO modal
    dialog.value = false
    
    logger.info('[ToGoModal] Order processed successfully', {
      orderId: orderResult.data.id,
      invoiceId: invoiceResult.invoice?.id
    })
  } catch (err) {
    logger.error('[ToGoModal] Order processing failed:', err)
    error.value = err.message || 'Failed to create to-go order'
  } finally {
    processing.value = false
  }
}

// Handle payment completion
const handlePaymentComplete = (result) => {
  logger.info('[ToGoModal] Payment processing completed:', { 
    success: !!result,
    invoiceId: currentInvoice.value?.invoice?.id
  })
  
  if (result) {
    window.toastr?.['success']('To Go order processed and paid successfully')
  }
}

// Close modal handler
const closeModal = () => {
  logger.debug('[ToGoModal] Attempting to close modal', { 
    processing: processing.value 
  })
  
  if (!processing.value) {
    dialog.value = false
    logger.debug('[ToGoModal] Modal closed')
  }
}
</script>

<style scoped>
.v-card-text {
  padding-top: 20px;
}
</style>
