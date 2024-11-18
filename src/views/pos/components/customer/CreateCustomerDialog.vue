<template>
  <v-dialog v-model="dialog" max-width="500">
    <v-card>
      <v-card-title class="text-h5">
        Create New Customer
        <v-spacer></v-spacer>
        <v-btn icon @click="closeDialog">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-card-title>

      <v-card-text>
        <v-container>
          <v-row>
            <v-col cols="12">
              <v-text-field
                v-model="formData.name"
                label="Full Name"
                :error-messages="errors.name"
                @input="clearError('name')"
                required
                variant="outlined"
                density="comfortable"
              ></v-text-field>
            </v-col>
          </v-row>

          <v-row>
            <v-col cols="12">
              <v-text-field
                v-model="formData.phone"
                label="Phone Number"
                :error-messages="errors.phone"
                @input="clearError('phone')"
                required
                variant="outlined"
                density="comfortable"
              ></v-text-field>
            </v-col>
          </v-row>

          <v-row>
            <v-col cols="12">
              <v-text-field
                v-model="formData.email"
                label="Email (Optional)"
                variant="outlined"
                density="comfortable"
              ></v-text-field>
            </v-col>
          </v-row>

          <v-row>
            <v-col cols="12">
              <v-text-field
                v-model="formData.address"
                label="Street Address"
                :error-messages="errors.address"
                @input="clearError('address')"
                required
                variant="outlined"
                density="comfortable"
              ></v-text-field>
            </v-col>
          </v-row>
        </v-container>
      </v-card-text>

      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn
          color="primary"
          @click="createCustomer"
          :loading="creating"
          :disabled="creating"
        >
          Create Customer
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { useCustomerSearch } from '../../composables/useCustomerSearch'

const props = defineProps({
  modelValue: Boolean,
})

const emit = defineEmits(['update:modelValue', 'customer-created'])

const { createCustomer: apiCreateCustomer } = useCustomerSearch()

const dialog = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const formData = reactive({
  name: '',
  phone: '',
  email: '',
  address: '',
})

const initialFormData = { ...formData }

const resetForm = () => {
  Object.assign(formData, initialFormData)
  clearAllErrors()
}

const errors = reactive({
  name: '',
  phone: '',
  address: '',
})

const creating = ref(false)

const validateForm = () => {
  let isValid = true
  clearAllErrors()

  if (!formData.name.trim()) {
    errors.name = 'Name is required'
    isValid = false
  }

  if (!formData.phone.trim()) {
    errors.phone = 'Phone number is required'
    isValid = false
  } else if (!/^\+?[\d\s-]{10,}$/.test(formData.phone.trim())) {
    errors.phone = 'Please enter a valid phone number'
    isValid = false
  }

  if (!formData.address.trim()) {
    errors.address = 'Address is required'
    isValid = false
  }

  if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
    errors.email = 'Please enter a valid email address'
    isValid = false
  }

  return isValid
}

const clearError = (field) => {
  errors[field] = ''
}

const clearAllErrors = () => {
  Object.keys(errors).forEach(key => {
    errors[key] = ''
  })
}

const createCustomer = async () => {
  if (!validateForm()) return

  creating.value = true

  try {
    const customerData = {
      name: formData.name.trim(),
      phone: formData.phone.trim(),
      email: formData.email.trim() || null,
      address_street_1: formData.address.trim(),
      status_customer: 'A'
    }

    const response = await apiCreateCustomer(customerData)
    
    if (!response?.id) {
      throw new Error('Invalid response from server')
    }

    const customer = {
      id: response.id,
      ...customerData
    }

    emit('customer-created', customer)
    resetForm()
    closeDialog()
    window.toastr?.['success']('Customer created successfully')
  } catch (error) {
    console.error('Customer creation error:', error)
    window.toastr?.['error'](
      error.response?.data?.message || 
      error.message || 
      'Failed to create customer'
    )
  } finally {
    creating.value = false
  }
}

const closeDialog = () => {
  if (creating.value) {
    return
  }
  
  resetForm()
  dialog.value = false
}

// Prevent closing dialog while submitting
watch(() => props.modelValue, (newVal) => {
  if (!newVal && creating.value) {
    dialog.value = true
  }
})
</script>
