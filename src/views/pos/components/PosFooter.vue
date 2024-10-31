<!-- src/views/pos/components/PosFooter.vue -->
<template>
  <v-footer app class="d-flex flex-column pa-4">
    <div class="d-flex gap-2 justify-space-between w-100">
      <!-- Order Type Actions -->
      <div class="d-flex gap-2">
        <held-orders-modal />
        <v-btn
          color="primary"
          prepend-icon="mdi-table"
          @click="$emit('assign-table')"
        >
          Assign Table
        </v-btn>
        <v-btn
          color="primary"
          prepend-icon="mdi-food-takeout-box"
          @click="$emit('to-go')"
        >
          To Go
        </v-btn>
        <v-btn
          color="primary"
          prepend-icon="mdi-notebook"
          @click="$emit('open-tab')"
        >
          Open Tab
        </v-btn>
      </div>

      <!-- Order Actions -->
      <div class="d-flex gap-2">
        <v-btn
          color="success"
          prepend-icon="mdi-cash-register"
          @click="$emit('process-payment')"
        >
          Payment
        </v-btn>
        <v-btn
          color="info"
          prepend-icon="mdi-printer"
          @click="$emit('print-order')"
        >
          Print
        </v-btn>
        <v-btn
          color="warning"
          prepend-icon="mdi-send"
          @click="$emit('submit-order')"
        >
          Submit
        </v-btn>
      </div>
    </div>
  </v-footer>
</template>

<script setup>
import HeldOrdersModal from './HeldOrdersModal.vue'

defineEmits([
  'assign-table',
  'to-go',
  'open-tab',
  'process-payment',
  'print-order',
  'submit-order'
])
</script>

<style scoped>
.v-footer {
  border-top: 1px solid rgba(0, 0, 0, 0.12);
}
</style>
