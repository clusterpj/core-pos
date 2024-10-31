<!-- src/views/pos/components/dialogs/ReferenceDialog.vue -->
<template>
  <v-dialog v-model="show" max-width="400">
    <v-card>
      <v-card-title>Enter Reference Number</v-card-title>
      <v-card-text>
        <v-text-field
          v-model="reference"
          label="Reference Number"
          :rules="[v => !!v || 'Reference number is required']"
          required
          @keyup.enter="confirm"
        />
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn color="grey" variant="text" @click="close">Cancel</v-btn>
        <v-btn
          color="primary"
          :disabled="!reference"
          @click="confirm"
        >
          Submit
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  modelValue: Boolean
})

const emit = defineEmits(['update:modelValue', 'confirm'])

const reference = ref('')

const show = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const confirm = () => {
  if (reference.value) {
    emit('confirm', reference.value)
    close()
  }
}

const close = () => {
  reference.value = ''
  show.value = false
}
</script>
