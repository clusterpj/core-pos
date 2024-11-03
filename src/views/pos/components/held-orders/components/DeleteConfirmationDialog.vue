<!-- src/views/pos/components/held-orders/components/DeleteConfirmationDialog.vue -->
<template>
  <v-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)" max-width="400">
    <v-card>
      <v-card-title class="text-h6">
        Delete Order
      </v-card-title>
      <v-card-text>
        Are you sure you want to delete this order?
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="grey" variant="text" @click="$emit('update:modelValue', false)">Cancel</v-btn>
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
  }
})

defineEmits(['update:modelValue', 'confirm'])
</script>
