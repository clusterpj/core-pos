<!-- src/views/pos/components/held-orders/components/DeleteConfirmationDialog.vue -->
<template>
  <v-dialog 
    :model-value="modelValue" 
    @update:model-value="$emit('update:modelValue', $event)" 
    max-width="400"
    persistent
  >
    <v-card>
      <v-card-title class="text-h6">
        Delete Order
      </v-card-title>
      <v-card-text>
        <p class="mb-2">Are you sure you want to delete this order?</p>
        <v-alert
          v-if="orderDescription"
          type="warning"
          variant="tonal"
          class="mb-0"
        >
          <strong>Order Description:</strong><br>
          {{ orderDescription }}
        </v-alert>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn 
          color="grey" 
          variant="text" 
          @click="$emit('update:modelValue', false)"
          :disabled="loading"
        >
          Cancel
        </v-btn>
        <v-btn 
          color="error" 
          @click="$emit('confirm')"
          :loading="loading"
        >
          Delete
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
defineProps({
  modelValue: {
    type: Boolean,
    required: true
  },
  loading: {
    type: Boolean,
    default: false
  },
  orderDescription: {
    type: String,
    default: ''
  }
})

defineEmits(['update:modelValue', 'confirm'])
</script>

<style scoped>
.v-card-text p {
  margin-bottom: 16px;
}
</style>
