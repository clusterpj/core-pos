// src/views/pos/components/dialogs/TableDialog.vue
<template>
  <v-dialog v-model="show" max-width="500" @update:model-value="handleDialogUpdate">
    <v-card>
      <v-card-title>Assign Table</v-card-title>
      <v-card-text>
        <v-select
          v-model="selectedTable"
          label="Select Table"
          :items="tables"
          item-title="name"
          item-value="id"
          :loading="loading"
          density="compact"
        />
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn color="grey" variant="text" @click="close">Cancel</v-btn>
        <v-btn
          color="primary"
          :loading="assigning"
          :disabled="!selectedTable"
          @click="confirm"
        >
          Assign
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useTableAssignment } from '../../composables/useTableAssignment'

const props = defineProps({
  modelValue: Boolean
})

const emit = defineEmits(['update:modelValue', 'assigned'])

const {
  selectedTable,
  tables,
  loading,
  assigning,
  loadTables,
  assignTable
} = useTableAssignment()

const show = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const handleDialogUpdate = async (value) => {
  if (value) {
    await loadTables()
  } else {
    selectedTable.value = null
  }
}

const close = () => {
  show.value = false
}

const confirm = async () => {
  try {
    await assignTable()
    emit('assigned')
    close()
  } catch (error) {
    // Error will be handled by the parent component
    close()
  }
}
</script>
