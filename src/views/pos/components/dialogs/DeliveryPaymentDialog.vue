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
          <!-- Loading State -->
          <v-row v-if="loading">
            <v-col cols="12">
              <v-sheet class="pa-3">
                <v-skeleton-loader
                  type="article, actions"
                  class="mx-auto"
                ></v-skeleton-loader>
              </v-sheet>
            </v-col>
          </v-row>

          <template v-else>
            <!-- Invoice Summary -->
            <v-row>
              <v-col cols="12">
                <v-card variant="elevated" class="invoice-summary-card mb-4" elevation="2">
                  <v-card-item>
                    <template v-slot:prepend>
                      <v-icon icon="mdi-receipt" size="large" color="primary" class="mr-4"></v-icon>
                    </template>
                    <v-card-title class="text-h6 pb-2">
                      Invoice Summary
                    </v-card-title>
                  </v-card-item>
                  <v-divider></v-divider>
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

            <!-- Error Message -->
            <v-row v-if="error">
              <v-col cols="12">
                <v-alert type="error" variant="tonal">
                  {{ error }}
                </v-alert>
              </v-col>
            </v-row>
          </template>
        </v-container>
      </v-card-text>

      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn
          color="primary"
          :loading="processing"
          :disabled="processing"
          @click="processDeliveryOrder"
        >
          Create Delivery Order
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, computed } from 'vue'
import { posApi } from '@/services/api/pos-api'
import { logger } from '@/utils/logger'
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
  if (!processing.value) {
    dialog.value = false
  }
}

const processDeliveryOrder = async () => {
  if (processing.value) return

  processing.value = true
  error.value = null

  try {
    logger.info('Starting delivery order processing')

    // Get the hold invoice data
    const holdInvoice = props.invoice.invoice
    if (!holdInvoice) {
      throw new Error('Invoice data not provided')
    }

    // Ensure SMS flag is set
    holdInvoice.send_sms = 1

    // Convert to regular invoice
    const invoiceResult = await convertHeldOrderToInvoice(holdInvoice)
    
    if (!invoiceResult.success) {
      throw new Error('Failed to create invoice')
    }

    logger.info('Delivery invoice created successfully:', {
      invoiceId: invoiceResult.invoice.id,
      invoiceNumber: invoiceResult.invoice.invoice_number
    })

    // Add back to held orders
    try {
      const heldOrderData = {
        ...invoiceResult.invoice,
        is_hold_invoice: true,
        status: 'HELD',
        description: invoiceResult.invoice.description || 'Delivery Order'
      }
      
      const holdResult = await posApi.holdInvoice.create(heldOrderData)
      
      if (!holdResult.success) {
        throw new Error('Failed to add invoice to held orders')
      }

      logger.info('Delivery order added to held orders successfully')
      window.toastr?.['success']('Delivery order created successfully')
      
      emit('payment-complete', true)
      dialog.value = false
    } catch (err) {
      logger.error('Failed to add to held orders:', err)
      throw new Error('Failed to add delivery order to held orders')
    }
  } catch (err) {
    logger.error('Failed to process delivery order:', err)
    error.value = err.message || 'Failed to process delivery order'
    window.toastr?.['error'](error.value)
  } finally {
    processing.value = false
  }
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
