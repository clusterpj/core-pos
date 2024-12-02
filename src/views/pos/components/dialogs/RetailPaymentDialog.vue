<template>
  <v-dialog
    v-model="dialog"
    :fullscreen="$vuetify.display.mobile"
    :max-width="$vuetify.display.mobile ? '100%' : '800px'"
    persistent
    scrollable
    transition="dialog-bottom-transition"
    class="payment-dialog"
  >
    <v-card class="payment-dialog-card">
      <v-toolbar color="primary" class="payment-dialog-toolbar" :elevation="2">
        <v-toolbar-title class="text-h6 font-weight-medium">
          <v-icon icon="mdi-cash-register" size="large" class="mr-2"></v-icon>
          Process Payment
        </v-toolbar-title>
        <v-spacer></v-spacer>
        <v-btn
          icon="mdi-close"
          variant="text"
          @click="closeDialog"
          class="ml-2"
          size="large"
        ></v-btn>
      </v-toolbar>

      <v-card-text>
        <v-container>
          <!-- Error Alert -->
          <v-alert
            v-if="error"
            type="error"
            variant="tonal"
            closable
            class="mb-4"
            @click:close="error = null"
          >
            {{ error }}
          </v-alert>

          <!-- Loading State -->
          <div v-if="processing" class="text-center py-8">
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

          <!-- Payment Summary -->
          <v-row v-else>
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

              <!-- Success State -->
              <template v-if="currentInvoice">
                <v-icon icon="mdi-check-circle" color="success" size="64" class="mb-4"></v-icon>
                <h2 class="text-h5 mb-4">Payment Processed Successfully</h2>
                <v-card variant="outlined" class="invoice-summary-card mb-4">
                  <v-card-text class="py-4">
                    <div class="d-flex justify-space-between mb-2">
                      <span>Invoice Number:</span>
                      <strong>{{ invoiceNumber }}</strong>
                    </div>
                    <div class="d-flex justify-space-between mb-2">
                      <span>Total Amount:</span>
                      <strong>{{ formatCurrency(invoiceTotal) }}</strong>
                    </div>
                  </v-card-text>
                </v-card>
              </template>
            </v-col>
          </v-row>
        </v-container>
      </v-card-text>

      <v-card-actions class="pa-4">
        <v-spacer></v-spacer>
        <v-btn
          v-if="!currentInvoice"
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
        <v-btn
          v-else
          color="primary"
          size="large"
          min-width="120"
          height="48"
          @click="closeDialog"
          class="text-none px-6"
          rounded="pill"
          elevation="2"
        >
          <v-icon start icon="mdi-check" class="mr-1"></v-icon>
          Done
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useCartStore } from '@/stores/cart-store'
import { useCompanyStore } from '@/stores/company'
import { useAuthStore } from '@/stores/auth'
import { posApi } from '@/services/api/pos-api'
import { logger } from '@/utils/logger'
import { PriceUtils } from '@/utils/price'
import { OrderType, PaidStatus } from '@/types/order'
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
const { items } = storeToRefs(cartStore)

// Get user from auth store
const { user } = storeToRefs(authStore)

// State
const processing = ref(false)
const error = ref(null)
const currentInvoice = ref(null)

// Dialog computed property
const dialog = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

// Cart validation computed properties
const hasItems = computed(() => items.value.length > 0)
const canPay = computed(() => hasItems.value && !processing.value)

// Computed properties for invoice details
const invoiceNumber = computed(() => currentInvoice.value?.invoice_number || '')
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
  try {
    // 1. Get next invoice number
    const nextNumberResponse = await posApi.invoice.getNextNumber()
    if (!nextNumberResponse?.nextNumber) {
      throw new Error('Failed to get next invoice number')
    }

    // Log detailed invoice data for comprehensive debugging
    logger.debug('Invoice Creation Details', {
      storeId: companyStore.currentStore?.id,
      userId: getCurrentUserId.value,
      total: PriceUtils.toCents(cartStore.total),
      subtotal: PriceUtils.toCents(cartStore.subtotal),
      tax: PriceUtils.toCents(cartStore.taxAmount),
      itemCount: cartStore.items.length,
      invoiceNumber: `${nextNumberResponse.prefix}-${nextNumberResponse.nextNumber}`
    })

    // 2. Prepare invoice data
    const invoiceData = {
      invoice: {
        invoice_number: `${nextNumberResponse.prefix}-${nextNumberResponse.nextNumber}`,
        total: PriceUtils.toCents(cartStore.total),
        subtotal: PriceUtils.toCents(cartStore.subtotal),
        tax: PriceUtils.toCents(cartStore.taxAmount),
        store_id: companyStore.currentStore?.id,
        cash_register_id: companyStore.currentRegister?.id,
        user_id: getCurrentUserId.value,
        type: OrderType.RETAIL,
        status: 'SENT',
        paid_status: PaidStatus.UNPAID,
        description: 'Retail Point of Sale Transaction',
        
        // Add missing required fields
        banType: true,  // Revert back to camelCase to match backend expectation
        avalara_bool: false,
        package_bool: false,
        print_pdf: false,
        save_as_draft: false,
        send_email: false,
        not_charge_automatically: false,
        is_invoice_pos: 1,
        is_pdf_pos: companyStore.pdfFormatPos === '1',
        is_prepared_data: true,
        invoice_template_id: 1,
        invoice_pbx_modify: 0,
        
        // Customer details for walk-in
        customer_id: null,
        customer_name: 'Walk-in Customer',
        customer_email: null,
        customer_phone: null,
        customer_address: null,
        
        // Payment and discount details
        payment_terms: companyStore.invoiceIssuancePeriod || '7',
        due_amount: PriceUtils.toCents(cartStore.total),
        discount: String(cartStore.discountAmount || 0),
        discount_type: cartStore.discountType || "fixed",
        discount_val: cartStore.discountValue || 0,
        discount_per_item: companyStore.discountPerItem || "NO",
        
        // Additional arrays and optional fields
        taxes: [],
        packages: [],
        tables_selected: [],
        notes: '',
        tip: "0",
        tip_type: "fixed",
        tip_val: 0
      },
      invoicePrefix: nextNumberResponse.prefix,
      nextInvoiceNumber: nextNumberResponse.nextNumber,
      items: formatInvoiceItems(cartStore.items)
    }

    // 3. Create invoice
    const response = await posApi.invoice.create(invoiceData)
    if (!response?.data?.id) {
      throw new Error(response?.message || 'Failed to create invoice')
    }

    return response.data

  } catch (err) {
    logger.error('Error creating invoice:', err)
    throw new Error(`Failed to create invoice: ${err.message || 'Unknown error occurred'}`)
  }
}

const processPayment = async () => {
  if (!hasItems.value) {
    error.value = 'Cannot process payment: Cart is empty'
    return
  }

  try {
    processing.value = true
    error.value = null

    // 0. Ensure user profile is loaded
    await ensureUserProfile()

    // 1. Create invoice first
    const invoice = await createInvoice()
    
    // 2. Process payment
    const paymentData = {
      invoice_id: invoice.id,
      amount: cartStore.total,
      payment_method: 'cash', // TODO: Make this dynamic based on selected payment method
      payment_date: formatDate(new Date()),
      notes: '',
      store_id: companyStore.currentStore?.id
    }

    const paymentResponse = await posApi.payment.createPayment(paymentData)
    if (!paymentResponse?.data?.id) {
      throw new Error(paymentResponse?.message || 'Payment processing failed')
    }

    // 3. Update invoice status
    await posApi.invoice.updateInvoice(invoice.id, {
      paid_status: PaidStatus.PAID
    })

    // 4. Store current invoice and clear cart
    currentInvoice.value = invoice
    await cartStore.clearCart()
    
    // 5. Emit success
    emit('payment-complete', { invoice, payment: paymentResponse.data })

  } catch (err) {
    logger.error('Payment processing error:', err)
    error.value = `Payment failed: ${err.message || 'Unknown error occurred'}`
  } finally {
    processing.value = false
  }
}

const closeDialog = () => {
  if (!processing.value) {
    error.value = null
    currentInvoice.value = null
    emit('update:modelValue', false)
  }
}
</script>

<style scoped>
.payment-dialog {
  .v-dialog {
    display: flex;
    flex-direction: column;
    height: 100%;
    max-height: 100%;
  }
}

.payment-dialog-card {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.payment-dialog-toolbar {
  flex: 0 0 auto;
}

.v-card-text {
  flex: 1 1 auto;
  overflow-y: auto;
}

.v-card-actions {
  flex: 0 0 auto;
}

.invoice-summary-card {
  max-width: 400px;
  margin: 0 auto;
}
</style>
