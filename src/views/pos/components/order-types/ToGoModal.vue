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
                  :disabled="processing"
                >
                  Create To Go Order
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
import { ref, computed, watch, reactive } from 'vue'
import { useOrderType } from '../../composables/useOrderType'
import { usePosStore } from '@/stores/pos-store'
import { useCartStore } from '@/stores/cart-store'
import { logger } from '@/utils/logger'
import PaymentDialog from '../dialogs/PaymentDialog.vue'
import { convertHeldOrderToInvoice } from '../held-orders/utils/invoiceConverter'

logger.info('[ToGoModal] Initializing TO-GO modal component')

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
  setOrderType, 
  processOrder: processOrderType, 
  ORDER_TYPES, 
  error: orderError,
  setCustomerInfo
} = useOrderType()

// Local state
const dialog = ref(false)
const loading = ref(false)
const processing = ref(false)
const error = computed(() => orderError.value)
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

// Watch for dialog open to set order type
watch(dialog, (newValue) => {
  logger.debug('[ToGoModal] Dialog state changed:', { newValue })
  if (newValue) {
    logger.info('[ToGoModal] Opening TO-GO modal, setting order type')
    setOrderType(ORDER_TYPES.TO_GO)
  } else {
    logger.debug('[ToGoModal] Closing TO-GO modal, resetting form')
    // Reset form when dialog closes
    customerInfo.name = ''
    customerInfo.phone = ''
    customerInfo.instructions = ''
    clearAllErrors()
  }
})

// Validation helper
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
  }

  logger.debug('[ToGoModal] Form validation result:', { isValid, validationErrors })
  return isValid
}

// Clear validation errors
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

// Process the order
const processOrder = async () => {
  logger.info('[ToGoModal] Starting TO-GO order processing', {
    customerInfo,
    cartItems: cartStore.items?.length
  })

  if (!validateForm()) {
    logger.warn('[ToGoModal] Form validation failed, aborting order processing')
    return
  }

  processing.value = true

  try {
    // Update customer info in the order type composable
    logger.debug('[ToGoModal] Setting customer info')
    setCustomerInfo({
      name: customerInfo.name.trim(),
      phone: customerInfo.phone.trim(),
      instructions: customerInfo.instructions.trim()
    })

    // Process the order first
    logger.debug('[ToGoModal] Creating hold order')
    const orderResult = await processOrderType()
    
    if (!orderResult.success) {
      logger.error('[ToGoModal] Failed to create hold order:', orderResult)
      throw new Error('Failed to create order')
    }

    logger.info('[ToGoModal] Hold order created successfully:', orderResult.data)

    // Convert to invoice immediately for TO-GO orders
    logger.debug('[ToGoModal] Converting hold order to invoice')
    const invoiceResult = await convertHeldOrderToInvoice(orderResult.data)
    
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
    logger.debug('[ToGoModal] Opening payment dialog')
    
    // Close the TO-GO modal
    dialog.value = false
    logger.debug('[ToGoModal] Closing TO-GO modal')
  } catch (err) {
    logger.error('[ToGoModal] Order processing failed:', {
      error: err,
      customerInfo,
      cartItems: cartStore.items?.length
    })
    error.value = err.message || 'Failed to create to-go order'
  } finally {
    processing.value = false
    logger.debug('[ToGoModal] Order processing completed')
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
