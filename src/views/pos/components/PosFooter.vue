<!-- src/views/pos/components/PosFooter.vue -->
<template>
  <v-footer app class="d-flex flex-column pa-4">
    <div class="d-flex gap-2 justify-space-between w-100">
      <!-- Order Type Actions -->
      <div class="d-flex gap-2">
        <held-orders-modal :disabled="isDisabled" />
        <dine-in-modal :disabled="isDisabled" />
        <to-go-modal :disabled="isDisabled" />
        <delivery-modal :disabled="isDisabled" />
        <pickup-modal :disabled="isDisabled" />
      </div>

      <!-- Order Actions -->
      <div class="d-flex gap-2">
        <v-btn
          color="info"
          prepend-icon="mdi-printer"
          @click="$emit('print-order')"
          :disabled="isDisabled"
        >
          Print
        </v-btn>
        
        <v-btn
          color="success"
          prepend-icon="mdi-cash-register"
          @click="showPaymentDialog = true"
          :disabled="!canPay"
          :loading="isProcessingPayment"
        >
          Pay {{ formatCurrency(cartStore.total) }}
        </v-btn>
      </div>
    </div>

    <!-- Payment Dialog -->
    <v-dialog v-model="showPaymentDialog" max-width="600">
      <v-card>
        <v-card-title class="text-h5">
          Payment
          <v-spacer></v-spacer>
          <v-btn icon @click="showPaymentDialog = false">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-card-title>

        <v-card-text>
          <v-container>
            <!-- Order Details Section -->
            <v-row>
              <v-col cols="12">
                <v-card variant="outlined" class="mb-4">
                  <v-card-title class="text-subtitle-1 py-2">
                    Order Details
                    <v-chip
                      color="warning"
                      size="small"
                      class="ml-2"
                      prepend-icon="mdi-clock-outline"
                    >
                      Held Order
                    </v-chip>
                  </v-card-title>
                  
                  <!-- Items List -->
                  <v-list density="compact">
                    <v-list-item
                      v-for="item in cartStore.items"
                      :key="item.id"
                      :title="item.name"
                      :subtitle="item.modifications?.length ? item.modifications.join(', ') : null"
                    >
                      <template v-slot:append>
                        <div class="d-flex align-center">
                          <span class="mr-2">x{{ item.quantity }}</span>
                          <span>{{ formatCurrency(item.price * item.quantity) }}</span>
                        </div>
                      </template>
                    </v-list-item>
                  </v-list>

                  <!-- Order Summary -->
                  <v-divider></v-divider>
                  <v-list density="compact">
                    <v-list-item>
                      <template v-slot:title>
                        <div class="d-flex justify-space-between">
                          <span>Subtotal</span>
                          <span>{{ formatCurrency(cartStore.subtotal) }}</span>
                        </div>
                      </template>
                    </v-list-item>

                    <v-list-item v-if="cartStore.discountAmount > 0">
                      <template v-slot:title>
                        <div class="d-flex justify-space-between">
                          <span>
                            Discount 
                            <span class="text-caption">
                              ({{ cartStore.discountType === '%' ? cartStore.discountValue + '%' : formatCurrency(cartStore.discountValue) }})
                            </span>
                          </span>
                          <span>-{{ formatCurrency(cartStore.discountAmount) }}</span>
                        </div>
                      </template>
                    </v-list-item>

                    <v-list-item>
                      <template v-slot:title>
                        <div class="d-flex justify-space-between">
                          <span>Tax ({{ (cartStore.taxRate * 100).toFixed(1) }}%)</span>
                          <span>{{ formatCurrency(cartStore.taxAmount) }}</span>
                        </div>
                      </template>
                    </v-list-item>

                    <v-list-item>
                      <template v-slot:title>
                        <div class="d-flex justify-space-between font-weight-bold">
                          <span>Total</span>
                          <span>{{ formatCurrency(cartStore.total) }}</span>
                        </div>
                      </template>
                    </v-list-item>
                  </v-list>
                </v-card>
              </v-col>

              <!-- Payment Method Selection -->
              <v-col cols="12">
                <v-select
                  v-model="selectedPaymentMethod"
                  :items="paymentMethods"
                  item-title="name"
                  item-value="id"
                  label="Select Payment Method"
                  :loading="loadingPaymentMethods"
                  :disabled="loadingPaymentMethods"
                  variant="outlined"
                  density="comfortable"
                ></v-select>
              </v-col>

              <v-col cols="12" v-if="selectedPaymentMethod && selectedPaymentMethodDetails">
                <div v-if="selectedPaymentMethodDetails.pos_money?.length">
                  <h4 class="text-subtitle-1 mb-2">Available Denominations:</h4>
                  <v-chip-group>
                    <v-chip
                      v-for="money in selectedPaymentMethodDetails.pos_money"
                      :key="money.id"
                      :value="money.amount"
                      @click="handleDenominationClick(money)"
                    >
                      {{ formatCurrency(parseFloat(money.amount)) }}
                    </v-chip>
                  </v-chip-group>
                </div>

                <v-text-field
                  v-model="receivedAmount"
                  label="Amount Received"
                  type="number"
                  variant="outlined"
                  density="comfortable"
                  class="mt-4"
                  @input="calculateChange"
                ></v-text-field>

                <div v-if="parseFloat(receivedAmount) > cartStore.total" class="mt-2">
                  <strong>Change Due: {{ formatCurrency(parseFloat(receivedAmount) - cartStore.total) }}</strong>
                </div>
              </v-col>
            </v-row>
          </v-container>
        </v-card-text>

        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="grey" variant="text" @click="showPaymentDialog = false">Cancel</v-btn>
          <v-btn 
            color="success" 
            @click="handlePayment"
            :loading="isProcessingPayment"
            :disabled="!canProcessPayment"
          >
            Process Payment
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-footer>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { storeToRefs } from 'pinia'
import HeldOrdersModal from './HeldOrdersModal.vue'
import DineInModal from './order-types/DineInModal.vue'
import ToGoModal from './order-types/ToGoModal.vue'
import DeliveryModal from './order-types/DeliveryModal.vue'
import PickupModal from './order-types/PickupModal.vue'
import { useCartStore } from '../../../stores/cart-store'
import { useCompanyStore } from '../../../stores/company'
import { usePosStore } from '../../../stores/pos-store'
import { usePosOperations } from '../../../services/api/pos-operations'
import { logger } from '../../../utils/logger'

const cartStore = useCartStore()
const companyStore = useCompanyStore()
const posStore = usePosStore()
const posOperations = usePosOperations()

// Use storeToRefs to maintain reactivity for store state
const { items, holdInvoiceId } = storeToRefs(cartStore)
const { isConfigured } = storeToRefs(companyStore)

const isProcessingPayment = ref(false)
const showPaymentDialog = ref(false)
const loadingPaymentMethods = ref(false)
const paymentMethods = ref([])
const selectedPaymentMethod = ref(null)
const receivedAmount = ref('')

// Compute if cart is empty based on items length
const isEmpty = computed(() => items.value.length === 0)

// Compute disabled state for all buttons
const isDisabled = computed(() => {
  return isEmpty.value || !isConfigured.value
})

// Compute if payment can be processed
const canPay = computed(() => {
  return !isEmpty.value && isConfigured.value && holdInvoiceId.value !== null
})

// Get selected payment method details
const selectedPaymentMethodDetails = computed(() => {
  return paymentMethods.value.find(method => method.id === selectedPaymentMethod.value)
})

// Compute if payment can be processed
const canProcessPayment = computed(() => {
  if (!selectedPaymentMethod.value || !receivedAmount.value) return false
  return parseFloat(receivedAmount.value) >= cartStore.total
})

// Format currency helper
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount)
}

// Handle denomination click
const handleDenominationClick = (money) => {
  const amount = parseFloat(money.amount)
  const current = parseFloat(receivedAmount.value) || 0
  receivedAmount.value = (current + amount).toString()
  calculateChange()
}

// Calculate change
const calculateChange = () => {
  if (!receivedAmount.value) return
  const received = parseFloat(receivedAmount.value)
  if (received < cartStore.total) {
    window.toastr?.['error']('Received amount must be greater than or equal to total')
  }
}

// Load payment methods
const loadPaymentMethods = async () => {
  try {
    loadingPaymentMethods.value = true
    const response = await posOperations.getPaymentMethods()
    if (response.success && response.data) {
      paymentMethods.value = response.data
    } else {
      throw new Error('Failed to load payment methods')
    }
  } catch (error) {
    logger.error('Failed to load payment methods:', error)
    window.toastr?.['error']('Failed to load payment methods')
  } finally {
    loadingPaymentMethods.value = false
  }
}

// Watch for payment dialog open
watch(showPaymentDialog, async (newValue) => {
  if (newValue) {
    receivedAmount.value = ''
    selectedPaymentMethod.value = null
    await loadPaymentMethods()
  }
})

const handlePayment = async () => {
  try {
    isProcessingPayment.value = true
    logger.info('Processing payment for order:', holdInvoiceId.value)

    // Get next invoice number
    const { nextNumber, prefix } = await posOperations.getNextNumber('invoice')
    const invoiceNumber = `${prefix}-${nextNumber}`

    // Get next payment number
    const paymentNumberResponse = await posOperations.getNextNumber('payment')
    const paymentNumber = `PAY-${paymentNumberResponse.nextNumber}`

    // Create invoice from hold order
    const invoiceData = cartStore.prepareInvoiceData(
      posStore.currentStore?.id,
      posStore.currentRegister?.id,
      invoiceNumber
    )

    const invoiceResponse = await posOperations.createInvoice(invoiceData)
    if (!invoiceResponse.success) {
      throw new Error('Failed to create invoice')
    }

    // Process payment
    const paymentData = {
      amount: cartStore.toCents(cartStore.total),
      invoice_id: invoiceResponse.invoice.id,
      is_multiple: true,
      payment_date: new Date().toISOString().split('T')[0],
      payment_number: paymentNumber,
      payment_methods: [{
        id: selectedPaymentMethod.value,
        name: selectedPaymentMethodDetails.value.name,
        amount: cartStore.toCents(cartStore.total),
        received: cartStore.toCents(parseFloat(receivedAmount.value)),
        returned: cartStore.toCents(parseFloat(receivedAmount.value) - cartStore.total)
      }],
      status: { value: "Approved", text: "Approved" },
      user_id: companyStore.currentCustomer?.creator_id
    }

    const paymentResponse = await posOperations.createPayment(paymentData)
    if (!paymentResponse.success) {
      throw new Error('Failed to process payment')
    }

    // Clear cart after successful payment
    cartStore.clearCart()
    
    // Show success message
    window.toastr?.['success']('Payment processed successfully')
    
    // Refresh hold orders list to update statuses
    await posStore.fetchHoldInvoices()
    
    // Close payment dialog
    showPaymentDialog.value = false
    
    logger.info('Payment processed successfully')
  } catch (error) {
    logger.error('Payment processing failed:', error)
    window.toastr?.['error'](error.message || 'Failed to process payment')
  } finally {
    isProcessingPayment.value = false
  }
}

defineEmits([
  'print-order',
  'submit-order'
])
</script>

<style scoped>
.v-footer {
  border-top: 1px solid rgba(0, 0, 0, 0.12);
}
</style>
