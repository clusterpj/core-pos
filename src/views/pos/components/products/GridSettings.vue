<!-- src/views/pos/components/products/GridSettings.vue -->
<template>
  <div class="d-flex align-center">
    <v-select
      v-model="localColumns"
      :items="columnOptions"
      label="Items per row"
      density="compact"
      hide-details
      variant="outlined"
      class="grid-select me-3"
      @update:model-value="updateColumns"
      bg-color="white"
    />

    <v-select
      v-model="localRows"
      :items="rowOptions"
      label="Rows"
      density="compact"
      hide-details
      variant="outlined"
      class="grid-select me-3"
      @update:model-value="updateRows"
      bg-color="white"
    />

    <v-btn-toggle
      v-model="localLayout"
      mandatory
      density="compact"
      rounded="lg"
      class="grid-toggle"
      @update:model-value="updateLayout"
    >
      <v-btn
        value="comfortable"
        size="small"
        prepend-icon="mdi-view-grid"
        class="grid-btn"
      >
        Large
      </v-btn>
      <v-btn
        value="compact"
        size="small"
        prepend-icon="mdi-view-grid-compact"
        class="grid-btn"
      >
        Compact
      </v-btn>
    </v-btn-toggle>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  modelValue: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['update:modelValue'])

const localLayout = ref(props.modelValue.layout)
const localColumns = ref(props.modelValue.columns)
const localRows = ref(props.modelValue.rows || 3)

const columnOptions = [
  { title: '4 Items', value: 4 },
  { title: '6 Items', value: 6 }
]

const rowOptions = [
  { title: '2 Rows', value: 2 },
  { title: '3 Rows', value: 3 }
]

watch(() => props.modelValue, (newValue) => {
  localLayout.value = newValue.layout
  localColumns.value = newValue.columns
  localRows.value = newValue.rows || 3
}, { deep: true })

const updateLayout = (value) => {
  emit('update:modelValue', {
    ...props.modelValue,
    layout: value
  })
}

const updateColumns = (value) => {
  emit('update:modelValue', {
    ...props.modelValue,
    columns: value
  })
}

const updateRows = (value) => {
  emit('update:modelValue', {
    ...props.modelValue,
    rows: value
  })
}
</script>

<style scoped>
.grid-select {
  width: 150px;
}

.grid-toggle {
  height: 40px;
}

.grid-btn {
  min-width: 110px !important;
  padding: 0 16px !important;
}

:deep(.v-select .v-field__input) {
  min-height: 40px;
  padding-top: 0;
  padding-bottom: 0;
}

:deep(.v-select .v-field) {
  height: 40px;
}

:deep(.v-btn--size-small) {
  letter-spacing: normal;
}

:deep(.v-select .v-field__input) {
  font-size: 14px;
}

:deep(.v-select .v-field__label) {
  font-size: 14px;
  margin-top: -8px;
}

:deep(.v-field--variant-outlined .v-field__outline) {
  --v-field-border-width: 1px;
}

:deep(.v-field--variant-outlined .v-field__outline__start) {
  border-color: rgba(0, 0, 0, 0.12);
}

:deep(.v-field--variant-outlined .v-field__outline__end) {
  border-color: rgba(0, 0, 0, 0.12);
}

:deep(.v-field.v-field--appended) {
  --v-field-padding-end: 8px;
}

:deep(.v-select__selection) {
  margin-top: 8px;
}
</style>
