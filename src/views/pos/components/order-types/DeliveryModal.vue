<template>
  <v-dialog v-model="dialog" max-width="600">
    <template v-slot:activator="{ props: dialogProps }">
      <v-btn
        color="primary"
        v-bind="dialogProps"
        prepend-icon="mdi-truck-delivery"
        :loading="loading"
        :disabled="disabled"
      >
        DELIVERY
      </v-btn>
    </template>

    <v-card>
      <v-card-title class="text-h5">
        Delivery Order
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

          <!-- Delivery Information Form -->
          <template v-else>
            <!-- Customer Information Section -->
            <v-row>
              <v-col cols="12">
                <div class="text-subtitle-1 mb-2">Customer Information</div>
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

            <!-- Delivery Address Section -->
            <v-row>
              <v-col cols="12">
                <div class="text-subtitle-1 mb-2">Delivery Address</div>
                <v-text-field
                  v-model="customerInfo.address"
                  label="Street Address"
                  variant="outlined"
                  density="comfortable"
                  :error-messages="validationErrors.address"
                  @input="clearError('address')"
                  required
                ></v-text-field>
              </v-col>
            </v-row>

            <v-row>
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="customerInfo.unit"
                  label="Apt/Suite/Unit (Optional)"
                  variant="outlined"
                  density="comfortable"
                ></v-text-field>
              </v-col>
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="customerInfo.zipCode"
                  label="ZIP Code"
                  variant="outlined"
                  density="comfortable"
                  :error-messages="validationErrors.zipCode"
                  @input="clearError('zipCode')"
                  required
                ></v-text-field>
              </v-col>
            </v-row>

            <!-- Delivery Instructions -->
            <v-row>
              <v-col cols="12">
                <v-textarea
                  v-model="customerInfo.instructions"
                  label="Delivery Instructions (Optional)"
                  variant="outlined"
                  density="comfortable"
                  rows="2"
                  hint="Special instructions for delivery driver"
                ></v-textarea>
              </v-col>
            </v-row>

            <!-- SMS Payment Link Option -->
            <v-row>
              <v-col cols="12">
                <v-switch
                  v-model="sendPaymentLink"
                  label="Send payment link via SMS"
                  color="primary"
                  hide-details
                ></v-switch>
              </v-col>
            </v-row>

            <!-- Submit Button -->
            <v-row class="mt-4">
              <v-col cols="12" class="text-center">
                <v-btn
                  color="primary"
                  size="large"
                  block
                  @click="processOrder"
                  :loading="processing"
                  :disabled="processing"
                >
                  Create Delivery Order
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
import { ref, computed, watch, reactive } from 'vue'
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
const sendPaymentLink = ref(true)

// Form state
const customerInfo = reactive({
  name: '',
  phone: '',
  address: '',
  unit: '',
  zipCode: '',
  instructions: ''
})

// Validation
const validationErrors = reactive({
  name: '',
  phone: '',
  address: '',
  zipCode: ''
})

// Watch for dialog open to set order type
watch(dialog, (newValue) => {
  if (newValue) {
    setOrderType(ORDER_TYPES.DELIVERY)
  } else {
    // Reset form when dialog closes
    Object.keys(customerInfo).forEach(key => {
      customerInfo[key] = ''
    })
    sendPaymentLink.value = true
    clearAllErrors()
  }
})

// Validation helper
const validateForm = () => {
  let isValid = true
  clearAllErrors()

  if (!customerInfo.name.trim()) {
    validationErrors.name = 'Customer name is required'
    isValid = false
  }

  if (!customerInfo.phone.trim()) {
    validationErrors.phone = 'Phone number is required'
    isValid = false
  }

  if (!customerInfo.address.trim()) {
    validationErrors.address = 'Delivery address is required'
    isValid = false
  }

  if (!customerInfo.zipCode.trim()) {
    validationErrors.zipCode = 'ZIP code is required'
    isValid = false
  } else if (!/^\d{5}(-\d{4})?$/.test(customerInfo.zipCode.trim())) {
    validationErrors.zipCode = 'Invalid ZIP code format'
    isValid = false
  }

  return isValid
}

// Clear validation errors
const clearError = (field) => {
  validationErrors[field] = ''
}

const clearAllErrors = () => {
  Object.keys(validationErrors).forEach(key => {
    validationErrors[key] = ''
  })
}

// Process the order
const processOrder = async () => {
  if (!validateForm()) return

  processing.value = true

  try {
    // Format full address
    const fullAddress = [
      customerInfo.address.trim(),
      customerInfo.unit.trim(),
      customerInfo.zipCode.trim()
    ].filter(Boolean).join(', ')

    // Update customer info in the order type composable
    setCustomerInfo({
      name: customerInfo.name.trim(),
      phone: customerInfo.phone.trim(),
      address: fullAddress,
      instructions: customerInfo.instructions.trim(),
      sendPaymentLink: sendPaymentLink.value
    })

    await processOrderType()
    dialog.value = false
    // Show success message
    window.toastr?.['success']('Delivery order created successfully')
  } catch (err) {
    logger.error('Failed to process delivery order:', err)
    error.value = err.message || 'Failed to create delivery order'
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

.text-subtitle-1 {
  color: rgba(var(--v-theme-on-surface), 0.7);
}
</style>
