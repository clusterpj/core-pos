<!-- src/views/pos/components/products/GridSettings.vue -->
<template>
  <div class="grid-settings">
    <v-slide-x-transition>
      <div class="d-flex align-center">
        <v-tooltip
          location="top"
          text="Number of items to show in each row"
        >
          <template v-slot:activator="{ props }">
            <v-select
              v-bind="props"
              v-model="localColumns"
              :items="columnOptions"
              label="Items per row"
              density="compact"
              hide-details
              variant="outlined"
              class="grid-select"
              @update:model-value="updateColumns"
              bg-color="white"
              :menu-props="{ maxHeight: 200 }"
            >
              <template v-slot:prepend-inner>
                <v-icon size="small" color="primary">mdi-view-grid-outline</v-icon>
              </template>
            </v-select>
          </template>
        </v-tooltip>

        <v-tooltip
          location="top"
          text="Number of rows to display"
        >
          <template v-slot:activator="{ props }">
            <v-select
              v-bind="props"
              v-model="localRows"
              :items="rowOptions"
              label="Rows"
              density="compact"
              hide-details
              variant="outlined"
              class="grid-select me-3 mb-2"
              @update:model-value="updateRows"
              bg-color="white"
              :menu-props="{ maxHeight: 200 }"
            >
              <template v-slot:prepend-inner>
                <v-icon size="small" color="primary">mdi-view-sequential</v-icon>
              </template>
            </v-select>
          </template>
        </v-tooltip>

        <v-tooltip
          location="top"
          text="Toggle between comfortable and compact view"
        >
          <template v-slot:activator="{ props }">
            <v-btn-toggle
              v-bind="props"
              v-model="localLayout"
              mandatory
              density="compact"
              rounded="lg"
              class="grid-toggle mb-2"
              @update:model-value="updateLayout"
            >
              <v-btn
                value="comfortable"
                size="small"
                prepend-icon="mdi-view-grid"
                class="grid-btn"
                :ripple="false"
              >
                <span class="d-none d-sm-inline">Large</span>
                <v-icon class="d-sm-none">mdi-view-grid</v-icon>
              </v-btn>
              <v-btn
                value="compact"
                size="small"
                prepend-icon="mdi-view-grid-compact"
                class="grid-btn"
                :ripple="false"
              >
                <span class="d-none d-sm-inline">Compact</span>
                <v-icon class="d-sm-none">mdi-view-grid-compact</v-icon>
              </v-btn>
            </v-btn-toggle>
          </template>
        </v-tooltip>

        <v-tooltip
          location="top"
          text="Reset to default settings"
        >
          <template v-slot:activator="{ props }">
            <v-btn
              v-bind="props"
              icon="mdi-refresh"
              variant="text"
              size="small"
              color="grey-darken-1"
              class="ms-1"
              @click="resetToDefaults"
            />
          </template>
        </v-tooltip>
      </div>
    </v-slide-x-transition>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useDisplay } from 'vuetify'

const props = defineProps({
  modelValue: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['update:modelValue'])
const { mobile } = useDisplay()

const defaultSettings = {
  layout: 'comfortable',
  columns: mobile.value ? 4 : 6,
  rows: mobile.value ? 2 : 3
}

const localLayout = ref(props.modelValue.layout)
const localColumns = ref(props.modelValue.columns)
const localRows = ref(props.modelValue.rows || defaultSettings.rows)

const columnOptions = [
  { title: '4 Items', value: 4 },
  { title: '6 Items', value: 6 },
  { title: '8 Items', value: 8 }
]

const rowOptions = [
  { title: '2 Rows', value: 2 },
  { title: '3 Rows', value: 3 },
  { title: '4 Rows', value: 4 }
]

watch(() => props.modelValue, (newValue) => {
  localLayout.value = newValue.layout
  localColumns.value = newValue.columns
  localRows.value = newValue.rows || defaultSettings.rows
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

const resetToDefaults = () => {
  emit('update:modelValue', { ...defaultSettings })
}
</script>

<style scoped>
.grid-settings {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  align-items: center;
  justify-content: flex-end;
  width: 100%;
}

.grid-select {
  width: 120px;
  transition: all 0.3s ease;
  margin-right: 8px;
}

.grid-toggle {
  height: 40px;
  transition: all 0.3s ease;
}

.grid-btn {
  min-width: 90px !important;
  padding: 0 8px !important;
  transition: all 0.2s ease;
}

:deep(.v-select .v-field__input) {
  min-height: 40px;
  padding-top: 0;
  padding-bottom: 0;
}

:deep(.v-select .v-field) {
  height: 40px;
  transition: all 0.3s ease;
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
  --v-field-border-width: 1.5px;
}

:deep(.v-field--variant-outlined:hover .v-field__outline) {
  --v-field-border-width: 2px;
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

/* Mobile Optimizations */
@media (max-width: 600px) {
  .grid-select {
    width: 100px;
  }

  .grid-btn {
    min-width: 40px !important;
    padding: 0 4px !important;
  }
}

/* Hover Effects */
.grid-select:hover :deep(.v-field),
.grid-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

:deep(.v-btn-toggle .v-btn--active) {
  transform: scale(1.02);
}
</style>
