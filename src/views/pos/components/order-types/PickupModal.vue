<template>
  <v-dialog v-model="dialog" max-width="600">
    <template v-slot:activator="{ props: dialogProps }">
      <v-btn
        color="primary"
        v-bind="dialogProps"
        prepend-icon="mdi-store-clock"
        :loading="loading"
        :disabled="disabled"
      >
        PICKUP
      </v-btn>
    </template>

    <v-card>
      <v-card-title class="text-h5">
        Pickup Order
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

          <!-- Pickup Information Form -->
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

            <!-- Pickup Time Section -->
            <v-row>
              <v-col cols="12">
                <div class="text-subtitle-1 mb-2">Pickup Time</div>
                <v-select
                  v-model="customerInfo.pickupTime"
                  :items="pickupTimeOptions"
                  label="Select Pickup Time"
                  variant="outlined"
                  density="comfortable"
                  :error-messages="validationErrors.pickupTime"
                  @update:modelValue="clearError('pickupTime')"
                  required
                ></v-select>
              </v-col>
            </v-row>

            <!-- Special Instructions -->
            <v-row>
              <v-col cols="12">
                <v-textarea
                  v-model="customerInfo.instructions"
                  label="Special Instructions (Optional)"
                  variant="outlined"
                  density="comfortable"
                  rows="2"
                  hint="Any special instructions for pickup"
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
                  Create Pickup Order
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
  pickupTime: '',
  instructions: ''
})

// Validation
const validationErrors = reactive({
  name: '',
  phone: '',
  pickupTime: ''
})

// Generate pickup time options (next 2 hours in 15-minute intervals)
const pickupTimeOptions = computed(() => {
  const options = []
  const now = new Date()
  const currentHour = now.getHours()
  const currentMinute = now.getMinutes()
  
  // Round up to next 15-minute interval
  const startMinute = Math.ceil(currentMinute / 15) * 15
  let hour = currentHour
  let minute = startMinute

  // Generate times for the next 2 hours
  for (let i = 0; i < 8; i++) { // 8 fifteen-minute intervals = 2 hours
    if (minute >= 60) {
      hour++
      minute = 0
    }

    const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
    const label = formatTimeLabel(hour, minute)
    options.push({ title: label, value: timeString })

    minute += 15
  }

  return options
})

// Format time label with AM/PM
const formatTimeLabel = (hour, minute) => {
  const period = hour >= 12 ? 'PM' : 'AM'
  const displayHour = hour % 12 || 12
  return `${displayHour}:${minute.toString().padStart(2, '0')} ${period}`
}

// Watch for dialog open to set order type
watch(dialog, (newValue) => {
  if (newValue) {
    setOrderType(ORDER_TYPES.PICKUP)
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

  if (!customerInfo.pickupTime) {
    validationErrors.pickupTime = 'Pickup time is required'
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
      pickupTime: customerInfo.pickupTime,
      instructions: customerInfo.instructions.trim(),
      sendPaymentLink: sendPaymentLink.value
    })

    await processOrderType()
    dialog.value = false
    // Show success message
    window.toastr?.['success']('Pickup order created successfully')
  } catch (err) {
    logger.error('Failed to process pickup order:', err)
    error.value = err.message || 'Failed to create pickup order'
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
