<template>
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
  if (newValue) {
    setOrderType(ORDER_TYPES.TO_GO)
  } else {
    // Reset form when dialog closes
    customerInfo.name = ''
    customerInfo.phone = ''
    customerInfo.instructions = ''
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
    // Update customer info in the order type composable
    setCustomerInfo({
      name: customerInfo.name.trim(),
      phone: customerInfo.phone.trim(),
      instructions: customerInfo.instructions.trim()
    })

    await processOrderType()
    dialog.value = false
    // Show success message
    window.toastr?.['success']('To Go order created successfully')
  } catch (err) {
    logger.error('Failed to process to-go order:', err)
    error.value = err.message || 'Failed to create to-go order'
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
