<!-- src/views/pos/components/dialogs/PaymentDetailsDialog.vue -->
<template>
  <v-dialog 
    :model-value="modelValue" 
    @update:model-value="$emit('update:modelValue', $event)"
    max-width="600"
  >
    <v-card>
      <v-card-title class="text-h5">
        Payment
        <v-spacer></v-spacer>
        <v-btn icon @click="$emit('update:modelValue', false)">
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
        <v-btn color="grey" variant="text" @click="$emit('update:modelValue', false)">Cancel</v-btn>
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
</template>

<script setup>
import { watch } from 'vue'
import { useCartStore } from '../../../../stores/cart-store'
import { usePaymentProcessing } from '../../composables/usePaymentProcessing'

const props = defineProps({
  modelValue: {
    type: Boolean,
    required: true
  }
})

const emit = defineEmits(['update:modelValue'])

const cartStore = useCartStore()
const {
  isProcessingPayment,
  loadingPaymentMethods,
  paymentMethods,
  selectedPaymentMethod,
  receivedAmount,
  selectedPaymentMethodDetails,
  canProcessPayment,
  loadPaymentMethods,
  handleDenominationClick,
  calculateChange,
  resetPaymentForm,
  processPayment
} = usePaymentProcessing()

// Format currency helper
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount)
}

// Watch for dialog open
watch(() => props.modelValue, async (newValue) => {
  if (newValue) {
    resetPaymentForm()
    await loadPaymentMethods()
  }
})

const handlePayment = async () => {
  const success = await processPayment()
  if (success) {
    emit('update:modelValue', false)
  }
}
</script>
