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
          <v-icon icon="mdi-truck-delivery" size="large" class="mr-2"></v-icon>
          Process Delivery Order
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
          <v-row>
            <v-col cols="12" class="text-center">
              <v-icon icon="mdi-check-circle" color="success" size="64" class="mb-4"></v-icon>
              <h2 class="text-h5 mb-4">Delivery Order Created Successfully</h2>
              <v-card variant="outlined" class="invoice-summary-card mb-4">
                <v-card-text class="py-4">
                  <div class="d-flex justify-space-between mb-2">
                    <span>Invoice Number:</span>
                    <strong>{{ invoiceNumber }}</strong>
                  </div>
                  <div class="d-flex justify-space-between mb-2">
                    <span>Total Amount:</span>
                    <strong>{{ formatCurrency(invoiceTotal / 100) }}</strong>
                  </div>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>
        </v-container>
      </v-card-text>

      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn
          color="primary"
          @click="closeDialog"
        >
          Close
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, computed } from 'vue'
import { posApi } from '@/services/api/pos-api'
import { logger } from '@/utils/logger'
import { useCompanyStore } from '@/stores/company'
import { convertHeldOrderToInvoice } from '../held-orders/utils/invoiceConverter'

const props = defineProps({
  modelValue: Boolean,
  invoice: {
    type: Object,
    required: true,
    default: () => ({
      invoice: {},
      invoicePrefix: '',
      nextInvoiceNumber: ''
    })
  }
})

const emit = defineEmits(['update:modelValue', 'payment-complete'])

// State
const loading = ref(false)
const processing = ref(false)
const error = ref(null)

// Dialog computed property
const dialog = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

// Computed properties for invoice details
const invoiceNumber = computed(() => {
  return props.invoice?.invoice?.invoice_number || 
         `${props.invoice?.invoicePrefix}-${props.invoice?.nextInvoiceNumber}` || 
         ''
})

const invoiceTotal = computed(() => {
  return props.invoice?.invoice?.total || 0
})

// Methods
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount)
}

const closeDialog = () => {
  emit('payment-complete', true)
  dialog.value = false
}
</script>

<style scoped>
.payment-dialog {
  .v-dialog {
    border-radius: 16px;
    overflow: hidden;
  }
}

.payment-dialog-card {
  display: flex;
  flex-direction: column;
  height: 100%;
  border-radius: 16px;
  background-color: rgb(var(--v-theme-surface));
}

.payment-dialog-toolbar {
  border-top-left-radius: 16px;
  border-top-right-radius: 16px;
  background: linear-gradient(135deg, var(--v-primary-base) 0%, var(--v-primary-darken1) 100%);
  backdrop-filter: blur(10px);
  height: 64px !important;
}

.invoice-summary-card {
  background: linear-gradient(145deg, var(--v-surface-variant) 0%, var(--v-surface-base) 100%);
  border-radius: 24px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid rgba(var(--v-border-color), 0.05);
  backdrop-filter: blur(10px);
}

/* Responsive adjustments */
@media (max-width: 600px) {
  .v-dialog {
    margin: 0;
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    max-width: 100% !important;
    border-radius: 0;
  }
  
  .v-card {
    height: 100%;
    display: flex;
    flex-direction: column;
  }
  
  .v-card-text {
    flex: 1;
    overflow-y: auto;
  }
}
</style>
