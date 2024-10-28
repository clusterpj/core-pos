<!-- src/views/pos/components/ItemManagementModal.vue -->
<template>
    <v-dialog
      v-model="dialogVisible"
      max-width="800"
      persistent
      @click:outside="closeDialog"
    >
      <v-card>
        <v-card-title class="d-flex justify-space-between align-center">
          {{ editingItem ? 'Edit Item' : 'New Item' }}
          <v-btn icon="mdi-close" variant="text" @click="closeDialog" />
        </v-card-title>
  
        <v-card-text>
          <v-form ref="form" @submit.prevent="saveItem">
            <!-- Basic Information -->
            <v-row>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="itemForm.name"
                  label="Item Name"
                  :rules="[rules.required]"
                  density="comfortable"
                  variant="outlined"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="itemForm.sku"
                  label="SKU"
                  :rules="[rules.required]"
                  density="comfortable"
                  variant="outlined"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="itemForm.price"
                  label="Price"
                  type="number"
                  prefix="$"
                  :rules="[rules.required, rules.numeric]"
                  density="comfortable"
                  variant="outlined"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-select
                  v-model="itemForm.category_id"
                  :items="categories"
                  item-title="name"
                  item-value="id"
                  label="Category"
                  :rules="[rules.required]"
                  density="comfortable"
                  variant="outlined"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="itemForm.stock_level"
                  label="Stock Level"
                  type="number"
                  :rules="[rules.required, rules.numeric]"
                  density="comfortable"
                  variant="outlined"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="itemForm.reorder_level"
                  label="Reorder Level"
                  type="number"
                  :rules="[rules.numeric]"
                  density="comfortable"
                  variant="outlined"
                />
              </v-col>
              <v-col cols="12">
                <v-textarea
                  v-model="itemForm.description"
                  label="Description"
                  rows="3"
                  density="comfortable"
                  variant="outlined"
                />
              </v-col>
            </v-row>
  
            <!-- Image Upload -->
            <v-row>
              <v-col cols="12">
                <div class="d-flex align-center mb-2">
                  <h3 class="text-subtitle-1">Item Image</h3>
                  <v-spacer />
                  <v-btn
                    color="primary"
                    prepend-icon="mdi-camera"
                    variant="text"
                    @click="triggerImageUpload"
                  >
                    Upload Image
                  </v-btn>
                </div>
                
                <input
                  ref="fileInput"
                  type="file"
                  accept="image/*"
                  class="d-none"
                  @change="handleImageUpload"
                />
  
                <v-card
                  v-if="itemForm.image || previewImage"
                  variant="outlined"
                  class="pa-2"
                >
                  <v-img
                    :src="previewImage || itemForm.image"
                    height="200"
                    cover
                    class="bg-grey-lighten-2"
                  />
                  <div class="d-flex justify-end pa-2">
                    <v-btn
                      color="error"
                      variant="text"
                      size="small"
                      @click="removeImage"
                    >
                      Remove
                    </v-btn>
                  </div>
                </v-card>
                <v-card
                  v-else
                  variant="outlined"
                  class="d-flex align-center justify-center"
                  height="200"
                  style="cursor: pointer"
                  @click="triggerImageUpload"
                >
                  <div class="text-center">
                    <v-icon size="48" color="grey">mdi-image-plus</v-icon>
                    <div class="text-grey mt-2">Click to add image</div>
                  </div>
                </v-card>
              </v-col>
            </v-row>
          </v-form>
        </v-card-text>
  
        <v-divider />
  
        <v-card-actions>
          <v-spacer />
          <v-btn
            color="error"
            variant="text"
            :disabled="loading"
            @click="closeDialog"
          >
            Cancel
          </v-btn>
          <v-btn
            color="primary"
            :loading="loading"
            @click="saveItem"
          >
            {{ editingItem ? 'Update' : 'Create' }} Item
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </template>
  
  <script setup>
  import { ref, reactive, computed, watch } from 'vue'
  import { usePosStore } from '@/stores/pos-store'
  import { logger } from '@/utils/logger'
  
  const props = defineProps({
    modelValue: {
      type: Boolean,
      default: false
    },
    editItem: {
      type: Object,
      default: null
    }
  })
  
  const emit = defineEmits(['update:modelValue', 'item-saved'])
  
  const posStore = usePosStore()
  const form = ref(null)
  const fileInput = ref(null)
  const loading = ref(false)
  const previewImage = ref(null)
  
  // Form validation rules
  const rules = {
    required: v => !!v || 'This field is required',
    numeric: v => !isNaN(parseFloat(v)) && isFinite(v) || 'Must be a number'
  }
  
  // Form data
  const itemForm = reactive({
    name: '',
    sku: '',
    description: '',
    price: '',
    category_id: null,
    stock_level: 0,
    reorder_level: 0,
    image: null
  })
  
  // Computed
  const dialogVisible = computed({
    get: () => props.modelValue,
    set: (value) => emit('update:modelValue', value)
  })
  
  const editingItem = computed(() => props.editItem)
  
  const categories = computed(() => posStore.categoriesForDisplay)
  
  // Watch for edit item changes
  watch(() => props.editItem, (newItem) => {
    if (newItem) {
      Object.keys(itemForm).forEach(key => {
        if (key === 'price') {
          itemForm[key] = (newItem[key] / 100).toFixed(2) // Convert cents to dollars
        } else {
          itemForm[key] = newItem[key] || itemForm[key]
        }
      })
      if (newItem.media && newItem.media.length > 0) {
        itemForm.image = newItem.media[0].original_url
      }
    }
  }, { immediate: true })
  
  // Methods
  function triggerImageUpload() {
    fileInput.value.click()
  }
  
  async function handleImageUpload(event) {
    const file = event.target.files[0]
    if (!file) return
  
    try {
      // Show preview
      const reader = new FileReader()
      reader.onload = (e) => {
        previewImage.value = e.target.result
      }
      reader.readAsDataURL(file)
  
      // Store file for upload
      itemForm.image = file
    } catch (error) {
      logger.error('Failed to handle image upload:', error)
    }
  }
  
  function removeImage() {
    itemForm.image = null
    previewImage.value = null
    fileInput.value.value = ''
  }
  
  async function saveItem() {
    if (!form.value) return
    const { valid } = await form.value.validate()
    if (!valid) return

    loading.value = true
    try {
      // Convert price to cents
      const formData = new FormData()
    
      // Basic item information
      formData.append('name', itemForm.name)
      formData.append('price', Math.round(parseFloat(itemForm.price) * 100))
      formData.append('description', itemForm.description || '')
      formData.append('item_category_id', itemForm.category_id)
      formData.append('stock_level', itemForm.stock_level)
      formData.append('reorder_level', itemForm.reorder_level || 0)
      
      // Handle image upload
      if (itemForm.image instanceof File) {
        formData.append('image', itemForm.image)
      }
      
      // Add SKU if provided
      if (itemForm.sku) {
        formData.append('sku', itemForm.sku)
      }
  
      let response
      if (editingItem.value) {
        response = await posStore.updateItem(editingItem.value.id, formData)
      } else {
        response = await posStore.createItem(formData)
      }
  
      emit('item-saved', response)
      closeDialog()
    } catch (error) {
      logger.error('Failed to save item:', error)
    } finally {
      loading.value = false
    }
  }
  
  function closeDialog() {
    dialogVisible.value = false
    form.value?.reset()
    previewImage.value = null
    Object.keys(itemForm).forEach(key => {
      itemForm[key] = key === 'stock_level' || key === 'reorder_level' ? 0 : ''
    })
  }
  </script>