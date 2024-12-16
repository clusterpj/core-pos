<template>
  <v-dialog
    v-model="showDialog"
    max-width="500"
    persistent
  >
    <v-card>
      <v-card-title class="text-h6">
        Edit Item
      </v-card-title>

      <v-card-text>
        <div class="mb-4">
          <div class="text-subtitle-1 font-weight-medium">{{ item?.name }}</div>
          <div class="text-body-2 text-grey">
            Quantity: {{ item?.quantity }} | Price: ${{ formatPrice(item?.price) }} each
          </div>
        </div>

        <v-textarea
          v-model="itemNotes"
          label="Item Notes"
          placeholder="Add special instructions for this item..."
          rows="3"
          hide-details
          class="mb-4"
        />

        <v-expansion-panels>
          <v-expansion-panel>
            <v-expansion-panel-title>
              Modifications
            </v-expansion-panel-title>
            <v-expansion-panel-text>
              <div class="modifications-list">
                <v-checkbox
                  v-for="mod in availableModifications"
                  :key="mod.id"
                  v-model="selectedModifications"
                  :label="mod.name"
                  :value="mod.id"
                  density="comfortable"
                  hide-details
                  class="mb-2"
                />
              </div>
            </v-expansion-panel-text>
          </v-expansion-panel>
        </v-expansion-panels>

        <div class="d-flex align-center mt-4">
          <v-btn
            variant="text"
            color="primary"
            @click="openSplitDialog"
          >
            Split Item
          </v-btn>
          <v-spacer />
          <div class="text-caption text-grey">
            Click Split Item to separate this item for different modifications
          </div>
        </div>
      </v-card-text>

      <v-card-actions>
        <v-spacer />
        <v-btn
          color="grey-darken-1"
          variant="text"
          @click="closeDialog"
        >
          Cancel
        </v-btn>
        <v-btn
          color="primary"
          variant="text"
          @click="saveChanges"
        >
          Save
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <split-item-dialog
    v-model="showSplitDialog"
    :item="item"
    @split="handleSplit"
  />
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useCartStore } from '@/stores/cart-store'
import { PriceUtils } from '@/utils/price'
import SplitItemDialog from './SplitItemDialog.vue'

const props = defineProps({
  modelValue: {
    type: Boolean,
    required: true
  },
  item: {
    type: Object,
    default: null
  },
  index: {
    type: Number,
    default: null
  }
})

const emit = defineEmits(['update:modelValue'])

const cartStore = useCartStore()
const showSplitDialog = ref(false)
const itemNotes = ref('')
const selectedModifications = ref([])

// Mock data for available modifications - replace with actual data from your backend
const availableModifications = [
  { id: 'no_tomato', name: 'No Tomato' },
  { id: 'no_onion', name: 'No Onion' },
  { id: 'no_lettuce', name: 'No Lettuce' },
  { id: 'no_cheese', name: 'No Cheese' },
  { id: 'no_mustard', name: 'No Mustard' },
  { id: 'no_mayo', name: 'No Mayo' },
  { id: 'extra_sauce', name: 'Extra Sauce' },
  { id: 'well_done', name: 'Well Done' }
]

const showDialog = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

watch(() => props.item, (newItem) => {
  if (newItem) {
    itemNotes.value = newItem.notes || ''
    selectedModifications.value = newItem.modifications || []
  }
}, { immediate: true })

const closeDialog = () => {
  showDialog.value = false
  itemNotes.value = ''
  selectedModifications.value = []
}

const saveChanges = () => {
  if (!props.item || props.index === null) return

  cartStore.updateItemModifications({
    index: props.index,
    notes: itemNotes.value,
    modifications: selectedModifications.value
  })

  closeDialog()
}

const openSplitDialog = () => {
  showSplitDialog.value = true
}

const handleSplit = (splitQuantity) => {
  cartStore.splitItem(props.index, splitQuantity)
  showSplitDialog.value = false
  closeDialog()
}

const formatPrice = (price) => PriceUtils.format(price)
</script>

<style scoped>
.modifications-list {
  max-height: 200px;
  overflow-y: auto;
}
</style>
