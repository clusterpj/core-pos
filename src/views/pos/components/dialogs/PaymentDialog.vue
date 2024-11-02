<template>
  <v-dialog v-model="show" max-width="800" @update:model-value="handleDialogUpdate">
    <v-card>
      <v-card-title class="d-flex justify-space-between align-center">
        <span>Process Payment</span>
        <v-chip
          :color="isFullyPaid ? 'success' : 'warning'"
          class="ml-4"
        >
          {{ isFullyPaid ? 'Fully Paid' : `Remaining: $${formatPrice(remainingAmount)}` }}
        </v-chip>
      </v-card-title>

      <v-card-text>
        <!-- Error Alert -->
        <v-alert
          v-if="error"
          type="error"
          class="mb-4"
          closable
          @click:close="error = null"
        >
          {{ error }}
        </v-alert>

        <!-- Order Type Indicator -->
        <v-alert
          v-if="cartStore.isHoldOrder"
          type="info"
          class="mb-4"
          density="compact"
        >
          Converting hold order to invoice
        </v-alert>

        <v-container>
          <v-row v-if="loading">
            <v-col cols="12" class="text-center">
              <v-progress-circular indeterminate></v-progress-circular>
            </v-col>
          </v-row>

          <v-row v-else>
            <!-- Payment Method Selection -->
            <v-col cols="12" md="6">
              <v-select
                v-model="selectedMethod"
                label="Payment Method"
                :items="paymentMethods"
                item-title="formattedNameLabel"
                item-value="id"
                density="compact"
                :disabled="loading"
                :error-messages="methodError"
                class="mb-4"
                @update:model-value="handleMethodChange"
              />

              <v-text-field
                v-model="displayAmount"
                label="Amount"
                prefix="$"
                type="number"
                :min="0"
                :max="remainingAmount"
                :step="0.01"
                density="compact"
                :disabled="loading || !selectedMethod"
                :error-messages="amountError"
                class="mb-4"
                @update:model-value="handleAmountChange"
              />

              <!-- Cash Payment Section -->
              <template v-if="isCashPayment">
                <v-text-field
                  v-model="displayCashReceived"
                  label="Cash Received"
                  prefix="$"
                  type="number"
                  :min="displayAmount"
                  :step="0.01"
                  density="compact"
                  :disabled="loading"
                  :error-messages="cashError"
                  class="mb-4"
                  @update:model-value="handleCashReceived"
                />

                <v-chip
                  v-if="changeAmount > 0"
                  color="info"
                  class="mb-4"
                >
                  Change Due: ${{ formatPrice(changeAmount) }}
                </v-chip>

                <!-- Cash Denominations -->
                <v-row class="mb-4">
                  <v-col
                    v-for="denom in denominations"
                    :key="denom.amount"
                    cols="4"
                    class="pa-1"
                  >
                    <v-btn
                      block
                      :color="denom.is_coin ? 'warning' : 'success'"
                      variant="outlined"
                      @click="addDenomination(denom.amount)"
                    >
                      ${{ formatPrice(denom.amount) }}
                    </v-btn>
                  </v-col>
                </v-row>
              </template>

              <v-btn
                block
                color="primary"
                :disabled="!canAddPayment"
                :loading="loading"
                @click="addCurrentPayment"
              >
                Add Payment Method
              </v-btn>
            </v-col>

            <!-- Selected Payments List -->
            <v-col cols="12" md="6">
              <v-list>
                <v-list-subheader>Selected Payment Methods</v-list-subheader>
                <v-list-item
                  v-for="(payment, index) in selectedPayments"
                  :key="payment.id_raw"
                  :title="payment.name"
                  :subtitle="`$${formatPrice(payment.amount / 100)}`"
                >
                  <template #append>
                    <v-btn
                      icon="mdi-delete"
                      variant="text"
                      color="error"
                      density="compact"
                      @click="removePayment(index)"
                    />
                  </template>
                </v-list-item>
              </v-list>

              <!-- Payment Summary -->
              <v-list class="mt-4">
                <v-list-subheader>Payment Summary</v-list-subheader>
                <v-list-item title="Subtotal" :subtitle="`$${formatPrice(cartStore.subtotal)}`" />
                <v-list-item
                  v-if="cartStore.discountAmount > 0"
                  title="Discount"
                  :subtitle="`-$${formatPrice(cartStore.discountAmount)}`"
                />
                <v-list-item title="Tax" :subtitle="`$${formatPrice(cartStore.taxAmount)}`" />
                <v-list-item
                  v-if="cartStore.tipAmount > 0"
                  title="Tip"
                  :subtitle="`$${formatPrice(cartStore.tipAmount)}`"
                />
                <v-list-item
                  title="Total"
                  :subtitle="`$${formatPrice(cartStore.total)}`"
                  class="font-weight-bold"
                />
                <v-list-item
                  title="Amount Paid"
                  :subtitle="`$${formatPrice(totalPaid)}`"
                  class="font-weight-bold"
                />
              </v-list>
            </v-col>
          </v-row>
        </v-container>
      </v-card-text>

      <v-card-actions>
        <v-spacer />
        <v-btn
          color="grey"
          variant="text"
          :disabled="loading"
          @click="close"
        >
          Cancel
        </v-btn>
        <v-btn
          color="success"
          :loading="loading"
          :disabled="!canProcessPayment"
          @click="confirm"
        >
          Process Payment
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { usePayment } from '../../composables/usePayment'
import { useCartStore } from '../../../../stores/cart-store'
import { logger } from '../../../../utils/logger'

const props = defineProps({
  modelValue: Boolean
})

const emit = defineEmits(['update:modelValue', 'confirm'])

const cartStore = useCartStore()
const {
  loading,
  error,
  paymentMethods,
  selectedPayments,
  cashReceived,
  changeAmount,
  denominations,
  totalPaid,
  remainingAmount,
  isFullyPaid,
  canProcessPayment,
  currentInvoice,
  settings,
  loadPaymentMethods,
  addPayment,
  removePayment,
  calculateChange,
  processPayment,
  reset,
  formatPrice
} = usePayment()

// Local state
const selectedMethod = ref(null)
const currentAmount = ref(0)
const methodError = ref(null)
const amountError = ref(null)
const cashError = ref(null)

// Display values for amount inputs
const displayAmount = computed({
  get: () => (currentAmount.value || 0).toFixed(2),
  set: (val) => {
    currentAmount.value = Number(val)
    handleAmountChange(val)
  }
})

const displayCashReceived = computed({
  get: () => (cashReceived.value || 0).toFixed(2),
  set: (val) => {
    handleCashReceived(Number(val))
  }
})

// Computed
const show = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const isCashPayment = computed(() => {
  const method = paymentMethods.value.find(m => m.id === selectedMethod.value)
  return method?.only_cash === 1
})

const canAddPayment = computed(() => {
  return selectedMethod.value &&
         currentAmount.value > 0 &&
         currentAmount.value <= remainingAmount.value &&
         (!isCashPayment.value || cashReceived.value >= currentAmount.value)
})

// Methods
const clearMethodError = () => {
  methodError.value = null
  amountError.value = null
  cashError.value = null
}

const handleMethodChange = (value) => {
  clearMethodError()
  if (value) {
    // Set initial amount to remaining amount when method is selected
    currentAmount.value = remainingAmount.value
    // Reset cash values when switching methods
    cashReceived.value = 0
    changeAmount.value = 0
  }
}

const handleDialogUpdate = async (value) => {
  if (value) {
    // Dialog is opening
    try {
      await loadPaymentMethods()
      // Initialize with remaining amount
      currentAmount.value = remainingAmount.value
    } catch (error) {
      logger.error('Failed to initialize payment dialog:', error)
      if (error.errors) {
        // Handle validation errors
        Object.entries(error.errors).forEach(([field, messages]) => {
          switch (field) {
            case 'payment_method':
              methodError.value = messages[0]
              break
            case 'amount':
              amountError.value = messages[0]
              break
            default:
              error.value = messages[0]
          }
        })
      } else {
        error.value = error.message
      }
    }
  } else {
    // Dialog is closing
    reset()
    clearMethodError()
    selectedMethod.value = null
    currentAmount.value = 0
  }
}

const handleAmountChange = (value) => {
  amountError.value = null
  const numValue = Number(value)
  
  // Validate amount
  if (isNaN(numValue) || numValue < 0) {
    amountError.value = 'Invalid amount'
    return
  }

  // Ensure amount doesn't exceed remaining amount
  if (numValue > remainingAmount.value) {
    currentAmount.value = remainingAmount.value
    amountError.value = `Maximum amount is $${formatPrice(remainingAmount.value)}`
  }

  // Reset cash values when amount changes
  if (isCashPayment.value) {
    cashReceived.value = 0
    changeAmount.value = 0
  }
}

const handleCashReceived = (value) => {
  cashError.value = null
  const numValue = Number(value)
  
  // Validate cash amount
  if (isNaN(numValue) || numValue < 0) {
    cashError.value = 'Invalid amount'
    return
  }

  if (numValue < currentAmount.value) {
    cashError.value = 'Cash received must be greater than or equal to payment amount'
  }
  calculateChange(numValue)
}

const addDenomination = (amount) => {
  const newAmount = Number(cashReceived.value || 0) + amount
  cashReceived.value = newAmount
  handleCashReceived(newAmount)
}

const addCurrentPayment = () => {
  try {
    if (!canAddPayment.value) return
    addPayment(selectedMethod.value, currentAmount.value)
    selectedMethod.value = null
    currentAmount.value = remainingAmount.value
    cashReceived.value = 0
    clearMethodError()
  } catch (err) {
    if (err.errors) {
      Object.entries(err.errors).forEach(([field, messages]) => {
        switch (field) {
          case 'payment_method':
            methodError.value = messages[0]
            break
          case 'amount':
            amountError.value = messages[0]
            break
          case 'cash_received':
            cashError.value = messages[0]
            break
          default:
            error.value = messages[0]
        }
      })
    } else {
      error.value = err.message
    }
  }
}

const close = () => {
  show.value = false
}

const confirm = async () => {
  try {
    logger.startGroup('Payment Dialog: Process Payment')
    logger.info('Starting payment process', {
      isHoldOrder: cartStore.isHoldOrder,
      holdInvoiceId: cartStore.holdInvoiceId,
      total: cartStore.total,
      selectedPayments: selectedPayments.value
    })

    await processPayment()
    emit('confirm')
    close()
  } catch (error) {
    logger.error('Payment processing failed:', error)
    if (error.errors) {
      // Handle validation errors
      Object.entries(error.errors).forEach(([field, messages]) => {
        switch (field) {
          case 'payment_method':
            methodError.value = messages[0]
            break
          case 'amount':
            amountError.value = messages[0]
            break
          default:
            error.value = messages[0]
        }
      })
    } else {
      error.value = error.message || 'Payment processing failed'
    }
  } finally {
    logger.endGroup()
  }
}

// Watch for remaining amount changes
watch(() => remainingAmount.value, (newAmount) => {
  if (currentAmount.value > newAmount) {
    currentAmount.value = newAmount
  }
})

// Initialize when mounted
onMounted(async () => {
  if (show.value) {
    await loadPaymentMethods()
    currentAmount.value = remainingAmount.value
  }
})
</script>

<style scoped>
.v-list {
  background: transparent;
}
</style>
