<template>
  <v-dialog v-model="dialog" max-width="600" :scrim="true" transition="dialog-bottom-transition" class="rounded-lg">
    <DeliveryPaymentDialog
      v-model="showPaymentDialog"
      :invoice="invoiceData"
      @payment-complete="onPaymentComplete"
    />
    <template v-slot:activator="{ props: dialogProps }">
      <v-btn
        color="primary"
        v-bind="dialogProps"
        prepend-icon="mdi-store-clock"
        :loading="loading"
        :disabled="disabled"
        class="text-none px-6"
        rounded="pill"
        elevation="2"
        size="large"
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
import { useCustomerSearch } from '../../composables/useCustomerSearch'
import { usePosStore } from '../../../../stores/pos-store'
import { useCartStore } from '../../../../stores/cart-store'
import { useCompanyStore } from '../../../../stores/company'
import { logger } from '../../../../utils/logger'
import { posApi } from '../../../../services/api/pos-api'
import DeliveryPaymentDialog from '../dialogs/DeliveryPaymentDialog.vue'

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

// Payment dialog state
const showPaymentDialog = ref(false)
const invoiceData = ref({
  invoice: null,
  invoicePrefix: '',
  nextInvoiceNumber: ''
})

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
  searchCustomers
} = useCustomerSearch()

// Local state
const dialog = ref(false)
const loading = ref(false)
const processing = ref(false)
const error = computed(() => orderError.value || searchError.value)
const customerSearch = ref('')
const selectedCustomer = ref(null)

// Customer search handlers
const onCustomerSearch = async (search) => {
  customerSearch.value = search
  if (search && search.length >= 3) {
    await searchCustomers(search)
  }
}

const onCustomerSelect = (customer) => {
  if (customer) {
    customerInfo.name = customer.name
    customerInfo.phone = customer.phone || ''
    customerSearch.value = customer.name
  }
}

const clearSelectedCustomer = () => {
  selectedCustomer.value = null
  customerSearch.value = ''
  Object.keys(customerInfo).forEach(key => {
    customerInfo[key] = ''
  })
}

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
    // Get current date and due date
    const currentDate = new Date()
    const dueDate = new Date(currentDate)
    dueDate.setDate(dueDate.getDate() + 7)

    // Get next invoice number
    const nextInvoice = await posApi.invoice.getNextNumber()
    
    if (!nextInvoice) {
      throw new Error('Failed to get next invoice number')
    }

    // Create invoice data
    const orderData = {
      invoice_date: currentDate.toISOString().split('T')[0],
      due_date: dueDate.toISOString().split('T')[0],
      invoice_number: `${nextInvoice.prefix}-${nextInvoice.nextNumber}`,
      sub_total: Math.round(Number(cartStore.subtotal) || 0),
      total: Math.round(Number(cartStore.total) || 0),
      tax: Math.round(Number(cartStore.taxAmount) || 0),
      items: cartStore.items.map(item => ({
        item_id: item.id,
        name: item.name,
        description: item.description || '',
        price: Math.round(Number(item.price) || 0),
        quantity: Math.round(Number(item.quantity) || 1),
        unit_name: item.unit_name || 'units',
        sub_total: Math.round(Number(item.subtotal) || 0),
        total: Math.round(Number(item.total) || 0),
        tax: Math.round(Number(item.tax) || 0)
      })),

      // Boolean flags
      avalara_bool: false,
      banType: true,
      package_bool: false,
      print_pdf: false,
      save_as_draft: false,
      send_email: false,
      not_charge_automatically: false,
      is_hold_invoice: true,
      is_invoice_pos: 1,
      is_pdf_pos: true,

      // IDs and references
      invoice_template_id: 1,
      invoice_pbx_modify: 0,
      store_id: companyStore.selectedStore?.id,
      cash_register_id: companyStore.selectedCashier?.id,
      user_id: selectedCustomer.value?.id || 1,

      // Order type and status
      type: ORDER_TYPES.PICKUP,
      status: 'HELD',
      description: 'Pickup Order',

      // Customer contact info
      contact: {
        name: customerInfo.name.trim().split(' ')[0] || customerInfo.name.trim(),
        last_name: customerInfo.name.trim().split(' ').slice(1).join(' ') || 'N/A',
        email: '',
        phone: customerInfo.phone.trim(),
        second_phone: 'N/A',
        identification: 'N/A'
      },

      // Arrays
      tables_selected: [],
      packages: [],
      taxes: [],

      // Amounts and calculations
      discount: "0",
      discount_type: "fixed",
      discount_val: Math.round(Number(0)),
      discount_per_item: "NO",

      // Additional info
      notes: `Pickup Time: ${customerInfo.pickupTime}\n${customerInfo.instructions || ''}`.trim(),
      hold_invoice_id: null,
      tip: "0",
      tip_type: "fixed",
      tip_val: 0
    }

    // Create invoice
    const invoiceResult = await posApi.invoice.create(orderData)
    
    if (!invoiceResult?.invoice) {
      throw new Error('No invoice data received')
    }

    // Update invoice data ref
    invoiceData.value = {
      invoice: invoiceResult.invoice,
      invoicePrefix: nextInvoice.prefix,
      nextInvoiceNumber: nextInvoice.nextNumber
    }

    // Show payment dialog
    showPaymentDialog.value = true
  } catch (err) {
    logger.error('Failed to prepare pickup order:', {
      error: err,
      message: err.message,
      data: { customerInfo }
    })
    window.toastr?.error(err.message || 'Failed to prepare pickup order')
  } finally {
    processing.value = false
  }
}

const onPaymentComplete = async (success) => {
  if (success) {
    dialog.value = false
    window.toastr?.['success']('Pickup order created successfully')
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
