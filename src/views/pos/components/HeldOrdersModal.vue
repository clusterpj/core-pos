<!-- src/views/pos/components/HeldOrdersModal.vue -->
<template>
  <HeldOrdersModalComponent
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
  />
</template>

<script setup>
import HeldOrdersModalComponent from './held-orders/HeldOrdersModal.vue'

defineProps({
  modelValue: {
    type: Boolean,
    required: true
  }
})

defineEmits(['update:modelValue'])
</script>
