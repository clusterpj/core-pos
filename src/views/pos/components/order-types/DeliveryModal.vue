<template>
  <v-dialog v-model="dialog" max-width="600" :scrim="true" transition="dialog-bottom-transition" class="rounded-lg">
    <PaymentDialog
      v-model="showPaymentDialog"
      :create-invoice-only="true"
      @payment-complete="onPaymentComplete"
    />
    <template v-slot:activator="{ props: dialogProps }">
      <v-btn
        color="primary"
        v-bind="dialogProps"
        prepend-icon="mdi-truck-delivery"
        :loading="loading"
        :disabled="disabled || cartStore.isEmpty"
        class="text-none px-6"
        rounded="pill"
        elevation="2"
        size="large"
      >
        DELIVERY
      </v-btn>
    </template>

    <v-card class="rounded-lg">
      <v-toolbar color="primary" density="comfortable">
        <v-toolbar-title class="text-h6 font-weight-medium">
          Delivery Order
        </v-toolbar-title>
        <v-spacer></v-spacer>
        <v-btn icon="mdi-close" variant="text" @click="closeModal" />
      </v-toolbar>

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
                <v-autocomplete
                  v-model="selectedCustomer"
                  v-model:search="customerSearch"
                  :items="searchResults"
                  :loading="isSearching"
                  :error-messages="validationErrors.name"
                  label="Search Customer"
                  item-title="name"
                  item-value="id"
                  variant="outlined"
                  density="comfortable"
                  persistent-hint
                  hint="Search by name, phone, or email (min. 3 characters)"
                  return-object
                  @update:search="onCustomerSearch"
                  @update:model-value="onCustomerSelect"
                >
                  <template v-slot:append-inner>
                    <v-icon
                      v-if="selectedCustomer"
                      color="error"
                      @click.stop="clearSelectedCustomer"
                    >
                      mdi-close
                    </v-icon>
                  </template>
                  <template v-slot:no-data>
                    <v-list-item>
                      <v-list-item-title>
                        No customers found
                      </v-list-item-title>
                      <template v-slot:append>
                        <v-btn
                          color="primary"
                          variant="text"
                          @click="showCreateCustomer = true"
                        >
                          Create New
                        </v-btn>
                      </template>
                    </v-list-item>
                  </template>
                  <template v-slot:item="{ props, item }">
                    <v-list-item v-bind="props">
                      <v-list-item-title>{{ item.raw.name }}</v-list-item-title>
                      <v-list-item-subtitle>
                        {{ item.raw.phone || 'No phone' }}
                        {{ item.raw.email ? `• ${item.raw.email}` : '' }}
                      </v-list-item-subtitle>
                      <v-list-item-subtitle v-if="item.raw.address_street_1">
                        {{ item.raw.address_street_1 }}
                        {{ item.raw.address_street_2 ? `, ${item.raw.address_street_2}` : '' }}
                        {{ item.raw.city ? `, ${item.raw.city}` : '' }}
                        {{ item.raw.state ? ` ${item.raw.state}` : '' }}
                        {{ item.raw.zip_code ? ` ${item.raw.zip_code}` : '' }}
                      </v-list-item-subtitle>
                    </v-list-item>
                  </template>
                </v-autocomplete>

                <CreateCustomerDialog
                  v-model="showCreateCustomer"
                  @customer-created="onCustomerCreated"
                />
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

            <v-row>
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="customerInfo.city"
                  label="City"
                  variant="outlined"
                  density="comfortable"
                  :error-messages="validationErrors.city"
                  @input="clearError('city')"
                  required
                ></v-text-field>
              </v-col>
              <v-col cols="12" sm="6">
                <StateDropdown
                  v-model="customerInfo.state"
                  :error="validationErrors.state"
                  @state-selected="onStateSelect"
                  @update:model-value="clearError('state')"
                />
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

            <!-- SMS Toggle -->
            <v-row>
              <v-col cols="12">
                <v-switch
                  v-model="sendSms"
                  color="primary"
                  label="Send invoice via SMS"
                  hint="Customer will receive an SMS with the invoice link"
                  persistent-hint
                ></v-switch>
              </v-col>
            </v-row>

            <!-- Submit Button -->
            <v-row class="mt-4">
              <v-col cols="12">
                <v-btn
                  color="primary"
                  size="large"
                  block
                  height="56"
                  @click="processOrder"
                  :loading="processing"
                  :disabled="!canProcessOrder || processing"
                  elevation="2"
                >
                  <v-icon start>mdi-check-circle</v-icon>
                  Process Order
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
import StateDropdown from '@/components/common/StateDropdown.vue'
import CreateCustomerDialog from '../customer/CreateCustomerDialog.vue'
import PaymentDialog from '../dialogs/PaymentDialog.vue'
import { useOrderType } from '../../composables/useOrderType'
import { useCustomerSearch } from '../../composables/useCustomerSearch'
import { usePosStore } from '@/stores/pos-store'
import { useCartStore } from '@/stores/cart-store'
import { useCompanyStore } from '@/stores/company'
import { logger } from '../../../../utils/logger'
import { apiClient } from '@/services/api/client'

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

// Customer search integration
const { 
  searchResults,
  isSearching,
  searchError,
  searchCustomers,
  createCustomer
} = useCustomerSearch()

// Local state
const dialog = ref(false)
const loading = ref(false)
const processing = ref(false)
const sendSms = ref(false)
const showPaymentDialog = ref(false)
const error = computed(() => orderError.value || searchError.value)

const canProcessOrder = computed(() => {
  return !cartStore.isEmpty && 
         customerInfo.name.trim() && 
         customerInfo.phone.trim() && 
         customerInfo.address.trim() && 
         customerInfo.city.trim() && 
         customerInfo.state.trim() && 
         customerInfo.zipCode.trim()
})
const customerSearch = ref('')
const selectedCustomer = ref(null)
const showCreateCustomer = ref(false)

// Customer search handlers
const onCustomerSearch = async (search) => {
  customerSearch.value = search // Maintain search text
  if (search && search.length >= 3) {
    await searchCustomers(search)
  }
}

const onCustomerSelect = async (customer) => {
  if (customer) {
    logger.debug('Customer selected:', customer)

    try {
      // Fetch full customer details including addresses
      const response = await apiClient.get(`/v1/customers/${customer.id}`, {
        params: {
          include: 'billing_address,addresses'
        }
      })
      
      const fullCustomer = response.data.customer
      const billingAddress = fullCustomer.billing_address || {}
      
      logger.debug('Full customer data:', fullCustomer)
      logger.debug('Billing address:', billingAddress)

      // Populate all available customer information
      customerInfo.name = fullCustomer.name || fullCustomer.first_name || ''
      customerInfo.phone = fullCustomer.phone || ''
      customerInfo.email = fullCustomer.email || ''
      
      // Set address information from billing address
      customerInfo.address = billingAddress.address_street_1 || ''
      customerInfo.unit = billingAddress.address_street_2 || ''
      customerInfo.city = billingAddress.city || ''
      customerInfo.zipCode = billingAddress.zip || ''
      
      // Handle state information
      if (billingAddress.state) {
        customerInfo.state = billingAddress.state.code || ''
        customerInfo.state_id = billingAddress.state.id || null
      } else {
        customerInfo.state = ''
        customerInfo.state_id = null
      }
    
      customerInfo.instructions = customer.notes || ''
      
      // Keep the search value after selection
      customerSearch.value = customer.name
      
      // Log the populated data for debugging
      logger.debug('Customer selected:', customer)
      logger.debug('Billing address:', billingAddress)
      logger.info('Customer data populated:', { 
        customer: customer.id,
        fields: { ...customerInfo }
      })

      // Clear any existing validation errors
      clearAllErrors()
    } catch (error) {
      logger.error('Error fetching customer details:', error)
      if (window.toastr) {
        window.toastr.error('Failed to load customer details')
      }
    }
  }
}

const clearSelectedCustomer = () => {
  selectedCustomer.value = null
  customerSearch.value = ''
  Object.keys(customerInfo).forEach(key => {
    customerInfo[key] = ''
  })
}

const onCustomerCreated = async (customer) => {
  try {
    logger.info('New customer created:', customer)
    
    // Close the create customer dialog
    showCreateCustomer.value = false
    
    // Set the selected customer and populate the form
    selectedCustomer.value = customer
    customerSearch.value = customer.name
    
    // Populate delivery form with customer data
    customerInfo.name = customer.name
    customerInfo.phone = customer.phone || ''
    customerInfo.email = customer.email || ''
    customerInfo.address = customer.address_street_1 || ''
    customerInfo.unit = customer.address_street_2 || ''
    customerInfo.city = customer.city || ''
    customerInfo.state = customer.state || ''
    customerInfo.zipCode = customer.zip || ''
    customerInfo.instructions = customer.notes || ''
    
    // Clear any existing validation errors
    clearAllErrors()
    
    // Show success message
    if (window.toastr) {
      window.toastr.success('Customer created and loaded successfully')
    }
  } catch (error) {
    logger.error('Error handling new customer:', error)
    if (window.toastr) {
      window.toastr.error('Error loading customer data')
    }
  }
}

// Form state
const customerInfo = reactive({
  name: '',
  phone: '',
  email: '',
  address: '',
  unit: '',
  zip: '',
  city: '',
  state: '',
  state_id: null,
  instructions: ''
})

const onStateSelect = (state) => {
  customerInfo.state_id = state.id
  customerInfo.state = state.code
}

// Validation
const validationErrors = reactive({
  name: '',
  phone: '',
  address: '',
  zip: '',
  city: '',
  state: ''
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
    validationErrors.address = 'Delivery address is required for delivery orders'
    isValid = false
  }

  if (!customerInfo.zipCode.trim()) {
    validationErrors.zipCode = 'ZIP code is required'
    isValid = false
  } else if (!/^\d{5}(-\d{4})?$/.test(customerInfo.zipCode.trim())) {
    validationErrors.zipCode = 'Invalid ZIP code format'
    isValid = false
  }

  if (!customerInfo.city.trim()) {
    validationErrors.city = 'City is required'
    isValid = false
  }

  if (!customerInfo.state.trim()) {
    validationErrors.state = 'State is required'
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
      customer_id: selectedCustomer.value?.id,
      name: customerInfo.name.trim(),
      phone: customerInfo.phone.trim(),
      address: fullAddress,
      instructions: customerInfo.instructions.trim(),
      zip: customerInfo.zipCode.trim(),
      state_id: customerInfo.state_id,
      email: customerInfo.email.trim(),
      send_sms: sendSms.value ? 1 : 0
    })

    // Show payment dialog instead of processing order directly
    showPaymentDialog.value = true
  } catch (err) {
    logger.error('Failed to prepare delivery order:', err)
    error.value = err.message || 'Failed to prepare delivery order'
  } finally {
    processing.value = false
  }
}

const onPaymentComplete = async (success) => {
  if (success) {
    dialog.value = false
    window.toastr?.['success']('Delivery order created successfully')
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
