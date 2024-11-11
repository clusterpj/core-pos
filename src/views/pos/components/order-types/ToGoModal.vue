<template>
  <v-dialog v-model="dialog" max-width="600">
    <template v-slot:activator="{ props: dialogProps }">
      <v-btn
        color="primary"
        v-bind="dialogProps"
        prepend-icon="mdi-shopping"
        :loading="loading"
        :disabled="disabled || cartStore.isEmpty"
      >
        TO GO
      </v-btn>
    </template>

    <v-card>
      <v-card-title class="d-flex align-center pa-4">
        <span class="text-h5">To Go Order</span>
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
            <v-col cols="12">
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
              <v-col cols="12">
                <v-btn
                  color="primary"
                  size="large"
                  block
                  @click="processOrder"
                  :loading="processing"
                  :disabled="!canProcessOrder || processing"
                >
                  Process Order
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
import { useCartStore } from '../../../../stores/cart-store'
import { useCompanyStore } from '../../../../stores/company'
import { logger } from '../../../../utils/logger'
import { OrderType } from '../../../../types/order'
import { usePosStore } from '../../../../stores/pos-store'
import PaymentDialog from '../dialogs/PaymentDialog.vue'

// Props
defineProps({
  disabled: {
    type: Boolean,
    default: false
  }
})

// Store access
const cartStore = useCartStore()
const companyStore = useCompanyStore()
const posStore = usePosStore()

// Local state
const dialog = ref(false)
const loading = ref(false)
const processing = ref(false)
const error = ref(null)
const currentInvoice = ref(null)
const showPaymentDialog = ref(false)

// Form state
const customerInfo = reactive({
  name: '',
  phone: '',
  instructions: ''
})

const validationErrors = reactive({
  name: '',
  phone: ''
})

// Computed properties
const selectedStore = computed(() => companyStore.selectedStore)
const selectedCashier = computed(() => companyStore.selectedCashier)

const canProcessOrder = computed(() => {
  return !cartStore.isEmpty && 
         !!selectedStore.value && 
         !!selectedCashier.value && 
         customerInfo.name.trim() && 
         customerInfo.phone.trim()
})

// Methods
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
  } else {
    const phoneDigits = customerInfo.phone.replace(/\D/g, '')
    if (phoneDigits.length < 10) {
      validationErrors.phone = 'Please enter a valid phone number'
      isValid = false
    }
  }

  return isValid
}

const clearError = (field) => {
  validationErrors[field] = ''
}

const clearAllErrors = () => {
  Object.keys(validationErrors).forEach(key => {
    validationErrors[key] = ''
  })
}

const processOrder = async () => {
  if (!validateForm()) return

  processing.value = true
  error.value = null

  try {
    // Format phone number
    const formattedPhone = customerInfo.phone.replace(/\D/g, '')

    // Prepare hold invoice data
    const holdInvoiceData = cartStore.prepareHoldInvoiceData(
      selectedStore.value,
      selectedCashier.value,
      `TO_GO_${customerInfo.name}`
    )

    // Add TO-GO specific data
    holdInvoiceData.type = OrderType.TO_GO
    holdInvoiceData.description = `TO_GO_${customerInfo.name}`
    holdInvoiceData.notes = JSON.stringify({
      orderType: OrderType.TO_GO,
      orderInfo: {
        customer: {
          name: customerInfo.name.trim(),
          phone: formattedPhone,
          instructions: customerInfo.instructions.trim()
        }
      }
    })

    // Create hold order
    const result = await posStore.holdOrder(holdInvoiceData)

    if (!result?.success || !result?.hold_invoice?.id) {
      throw new Error('Failed to create hold order: Invalid response')
    }

    logger.info('TO-GO hold order created successfully:', {
      holdInvoiceId: result.hold_invoice.id,
      description: result.hold_invoice.description
    })

    // Show payment dialog with the hold order
    currentInvoice.value = {
      invoice: result.hold_invoice,
      invoicePrefix: 'TO-GO',
      nextInvoiceNumber: result.hold_invoice.id
    }
    showPaymentDialog.value = true
    dialog.value = false
  } catch (err) {
    error.value = err.message || 'Failed to process order'
    logger.error('Failed to process TO-GO order:', err)
  } finally {
    processing.value = false
  }
}

const handlePaymentComplete = async (result) => {
  if (result?.success) {
    // Clear the cart and reset state
    cartStore.clearCart()
    currentInvoice.value = null
    showPaymentDialog.value = false
    window.toastr?.['success']('TO-GO order processed successfully')

    // Refresh hold orders list
    await posStore.fetchHoldInvoices()
  } else {
    window.toastr?.['error']('Failed to process payment')
  }
}

const closeModal = () => {
  if (!processing.value) {
    dialog.value = false
    clearAllErrors()
    customerInfo.name = ''
    customerInfo.phone = ''
    customerInfo.instructions = ''
  }
}

// Watch for dialog open to validate prerequisites
watch(dialog, (newValue) => {
  if (newValue && (!selectedStore.value || !selectedCashier.value)) {
    error.value = 'Please select both store and cashier first'
    dialog.value = false
  }
})
</script>

<style scoped>
.v-card-text {
  padding-top: 20px;
}
</style>
