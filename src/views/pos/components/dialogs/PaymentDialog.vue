<template>
  <v-dialog v-model="show" max-width="800" @update:model-value="handleDialogUpdate">
    <v-card>
      <v-card-title class="d-flex justify-space-between align-center">
        <span>Process Payment</span>
        <v-chip
          :color="isFullyPaid ? 'success' : 'warning'"
          class="ml-4"
        >
          {{ isFullyPaid ? 'Fully Paid' : 'Remaining: $' + formatPrice(remainingAmount) }}
        </v-chip>
      </v-card-title>

      <v-card-text>
        <!-- Payment Method Selection -->
        <v-row>
          <v-col cols="12" md="6">
            <v-select
              v-model="selectedMethod"
              label="Payment Method"
              :items="paymentMethods"
              item-title="name"
              item-value="id"
              density="compact"
              :disabled="loading"
              :error-messages="error"
              class="mb-4"
            />

            <v-text-field
              v-model="currentAmount"
              label="Amount"
              type="number"
              :min="0"
              :max="remainingAmount"
              density="compact"
              :disabled="loading || !selectedMethod"
              class="mb-4"
            />

            <!-- Cash Payment Section -->
            <template v-if="isCashPayment">
              <v-text-field
                v-model="cashReceived"
                label="Cash Received"
                type="number"
                :min="currentAmount"
                density="compact"
                :disabled="loading"
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
                    {{ denom.name }}
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
                :key="index"
                :title="payment.name"
                :subtitle="'$' + formatPrice(payment.amount)"
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
              <v-list-item title="Subtotal" :subtitle="'$' + formatPrice(cartStore.subtotal)" />
              <v-list-item
                v-if="cartStore.discountAmount > 0"
                title="Discount"
                :subtitle="'-$' + formatPrice(cartStore.discountAmount)"
              />
              <v-list-item title="Tax" :subtitle="'$' + formatPrice(cartStore.taxAmount)" />
              <v-list-item
                title="Total"
                :subtitle="'$' + formatPrice(cartStore.total)"
                class="font-weight-bold"
              />
              <v-list-item
                title="Amount Paid"
                :subtitle="'$' + formatPrice(totalPaid)"
                class="font-weight-bold"
              />
            </v-list>
          </v-col>
        </v-row>
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
const handleDialogUpdate = (value) => {
  if (!value) {
    reset()
  }
}

const handleCashReceived = (value) => {
  calculateChange(value)
}

const addDenomination = (amount) => {
  const newAmount = Number(cashReceived.value || 0) + (amount / 100)
  cashReceived.value = newAmount
  handleCashReceived(newAmount)
}

const addCurrentPayment = () => {
  if (!canAddPayment.value) return
  addPayment(selectedMethod.value, currentAmount.value)
  selectedMethod.value = null
  currentAmount.value = 0
  cashReceived.value = 0
}

const close = () => {
  show.value = false
}

const confirm = async () => {
  try {
    await processPayment()
    emit('confirm')
    close()
  } catch (error) {
    // Error will be handled by the parent component
    close()
  }
}

// Watchers
watch(() => remainingAmount.value, (newAmount) => {
  if (currentAmount.value > newAmount) {
    currentAmount.value = newAmount
  }
})

// Lifecycle
onMounted(async () => {
  await loadPaymentMethods()
  currentAmount.value = cartStore.total
})
</script>
