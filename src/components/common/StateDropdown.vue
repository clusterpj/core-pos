<template>
  <v-autocomplete
    v-model="selectedState"
    :items="states"
    :loading="loading"
    :error-messages="error"
    :label="label"
    :required="required"
    :disabled="disabled"
    item-title="name"
    item-value="code"
    variant="outlined"
    density="comfortable"
    :hint="loading ? 'Loading states...' : undefined"
    persistent-hint
    @update:model-value="onStateSelect"
  >
    <template v-slot:no-data>
      <v-list-item v-if="loading">
        <v-list-item-title>
          Loading states...
        </v-list-item-title>
      </v-list-item>
      <v-list-item v-else>
        <v-list-item-title>
          No states found
        </v-list-item-title>
      </v-list-item>
    </template>
  </v-autocomplete>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import type { State, StateDropdownProps } from '@/types/state'
import { statesApi } from '@/services/api/states'
import { logger } from '@/utils/logger'

const props = withDefaults(defineProps<StateDropdownProps>(), {
  label: 'State',
  required: true,
  disabled: false,
  countryCode: 'US'
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'state-selected', state: State): void
}>()

const loading = ref(false)
const states = ref<State[]>([])
const selectedState = ref(props.modelValue)

const fetchStates = async () => {
  loading.value = true
  try {
    const response = await statesApi.getStates(props.countryCode)
    states.value = response.states
    logger.info(`Loaded ${states.value.length} states`)
  } catch (error) {
    logger.error('Failed to fetch states:', error)
    throw error
  } finally {
    loading.value = false
  }
}

const onStateSelect = (stateCode: string) => {
  const selectedState = states.value.find(state => state.code === stateCode)
  if (selectedState) {
    emit('update:modelValue', stateCode)
    emit('state-selected', selectedState)
    logger.debug('State selected:', selectedState)
  }
}

watch(() => props.modelValue, (newValue) => {
  selectedState.value = newValue
})

onMounted(() => {
  fetchStates()
})
</script>
