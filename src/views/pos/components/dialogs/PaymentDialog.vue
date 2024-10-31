// src/views/pos/components/dialogs/PaymentDialog.vue
<template>
  <v-dialog v-model="show" max-width="600" @update:model-value="handleDialogUpdate">
    <v-card>
      <v-card-title>Process Payment</v-card-title>
      <v-card-text>
        <v-select
          v-model="selectedMethod"
          label="Payment Method"
          :items="paymentMethods"
          item-title="name"
          item-value="id"
          density="compact"
          class="mb-4"
        />

        <div class="d-flex justify-space-between mb-4">
          <span class="text-h6">Total Amount:</span>
          <span class="text-h6">${{ formatPrice(total) }}</span>
        </div>

        <template v-if="selectedMethod">
          <v-text-field
            v-model="amount"
            label="Amount"
            type="number"
            :min="0"
            :max="total"
            density="compact"
            class="mb-4"
          />

          <v-textarea
            v-model="notes"
            label="Notes"
            rows="2"
            density="compact"
          />
        </template>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn color="grey" variant="text" @click="close">Cancel</v-btn>
        <v-btn
          color="success"
          :loading="processing"
          :disabled="!canProcess"
          @click="confirm"
        >
          Process Payment
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { usePayment } from '../../composables/usePayment'

const props = defineProps({
  modelValue: Boolean,
  total: {
    type: Number,
    required: true
  }
})

const emit = defineEmits(['update:modelValue', 'confirm'])

const {
  selectedMethod,
  amount,
  notes,
  processing,
  paymentMethods,
  formatPrice,
  canProcess,
  processPayment
} = usePayment(props.total)

const show = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const handleDialogUpdate = (value) => {
  if (!value) {
    // Reset form when dialog closes
    selectedMethod.value = null
    amount.value = props.total
    notes.value = ''
  }
}

// Update amount when total changes
watch(() => props.total, (newTotal) => {
  amount.value = newTotal
})

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
</script>
