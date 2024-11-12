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

    // Get base invoice data
    const baseInvoiceData = cartStore.prepareHoldInvoiceData(
      selectedStore.value,
      selectedCashier.value,
      `TO_GO_${customerInfo.name}`
    )

    // Create hold invoice data without tip fields
    const holdInvoiceData = {
      ...baseInvoiceData,
      type: OrderType.TO_GO,
      description: `TO_GO_${customerInfo.name}`,
      hold_items: cartStore.items.map(item => ({
        item_id: item.id,
        name: item.name,
        description: item.description || '',
        price: item.price,
        quantity: item.quantity,
        unit_name: item.unit_name || 'units',
        tax: item.tax || 0
      }))
    }

    // Remove tip-related fields that aren't supported for hold invoices
    delete holdInvoiceData.tip
    delete holdInvoiceData.tip_type
    delete holdInvoiceData.tip_val

    // Validate items exist
    if (!holdInvoiceData.hold_items?.length) {
      throw new Error('No items found in cart')
    }
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

    console.log('ToGoModal: About to create hold order with data:', {
      type: holdInvoiceData.type,
      description: holdInvoiceData.description,
      total: holdInvoiceData.total,
      items: holdInvoiceData.hold_items?.length,
      notes: holdInvoiceData.notes
    })

    // Create hold order
    const result = await posStore.holdOrder(holdInvoiceData)
    
    console.log('ToGoModal: Hold order API response:', result)
    logger.debug('Hold order response:', result)

    if (!result?.success) {
      throw new Error(result?.message || 'Failed to create hold order')
    }

    // Fetch the latest hold invoices to get our new one
    await posStore.fetchHoldInvoices()
    
    // Find our newly created hold invoice
    const holdInvoice = posStore.holdInvoices.find(inv => 
      inv.description === holdInvoiceData.description &&
      inv.type === OrderType.TO_GO
    )

    if (!holdInvoice) {
      logger.error('Could not find newly created hold invoice')
      throw new Error('Failed to retrieve created hold invoice')
    }

    // Validate essential fields
    if (!holdInvoice.total || !holdInvoice.hold_items?.length) {
      logger.error('Missing required hold invoice fields:', holdInvoice)
      throw new Error('Invalid hold invoice data: missing total or items')
    }

    // Store the hold invoice ID
    const holdInvoiceId = holdInvoice.id
    cartStore.setHoldInvoiceId(holdInvoiceId)

    logger.info('TO-GO hold order created successfully:', {
      holdInvoiceId: holdInvoiceId,
      description: holdInvoice.description,
      total: holdInvoice.total,
      items: holdInvoice.hold_items?.length
    })

    // Show payment dialog with the hold order data
    console.log('ToGoModal: Setting up payment dialog with invoice:', {
      holdInvoiceId,
      description: holdInvoice.description,
      total: holdInvoice.total,
      items: holdInvoice.hold_items?.length
    })

    currentInvoice.value = {
      invoice: holdInvoice,
      invoicePrefix: 'TO-GO',
      nextInvoiceNumber: holdInvoiceId,
      description: holdInvoice.description
    }

    console.log('ToGoModal: Current invoice value set:', currentInvoice.value)

    // Double check the invoice data is valid
    if (!currentInvoice.value.invoice?.total) {
      logger.error('Invalid invoice data for payment:', currentInvoice.value)
      throw new Error('Invalid invoice data for payment')
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
