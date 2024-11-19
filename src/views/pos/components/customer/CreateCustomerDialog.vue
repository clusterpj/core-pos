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

          <v-row>
            <v-col cols="12" sm="6">
              <v-text-field
                v-model="formData.city"
                label="City"
                :error-messages="errors.city"
                @input="clearError('city')"
                required
                variant="outlined"
                density="comfortable"
              ></v-text-field>
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field
                v-model="formData.state"
                label="State"
                :error-messages="errors.state"
                @input="clearError('state')"
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
import { ref, reactive, computed, watch } from 'vue'
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
  city: '',
  state: '',
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
  city: '',
  state: '',
})

const creating = ref(false)

const validateForm = () => {
  let isValid = true
  clearAllErrors()

  if (!formData.name.trim()) {
    errors.name = 'Name is required'
    isValid = false
  } else if (formData.name.trim().length < 3) {
    errors.name = 'Name must be at least 3 characters'
    isValid = false
  } else if (formData.name.trim().length > 100) {
    errors.name = 'Name must not exceed 100 characters'
    isValid = false
  }

  if (formData.phone.trim() && (formData.phone.trim().length < 3 || formData.phone.trim().length > 25)) {
    errors.phone = 'Phone number must be between 3 and 25 characters'
    isValid = false
  }

  if (formData.address.trim() && (formData.address.trim().length < 3 || formData.address.trim().length > 120)) {
    errors.address = 'Address must be between 3 and 120 characters'
    isValid = false
  }

  if (!formData.city.trim()) {
    errors.city = 'City is required'
    isValid = false
  } else if (formData.city.trim().length > 50) {
    errors.city = 'City must not exceed 50 characters'
    isValid = false
  }

  if (!formData.state.trim()) {
    errors.state = 'State is required'
    isValid = false
  } else if (formData.state.trim().length > 2) {
    errors.state = 'Please use 2-letter state code'
    isValid = false
  }

  if (formData.email.trim()) {
    if (formData.email.trim().length < 5 || formData.email.trim().length > 120) {
      errors.email = 'Email must be between 5 and 120 characters'
      isValid = false
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      errors.email = 'Please enter a valid email address'
      isValid = false
    }
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
      phone: formData.phone.trim() || null,
      email: formData.email.trim() || null,
      address_street_1: formData.address.trim() || null,
      city: formData.city.trim() || null,
      state: formData.state.trim() || null,
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
    if (window.toastr) {
      window.toastr.success('Customer created successfully')
    }
  } catch (error) {
    console.error('Customer creation error:', error)
    const errorMessage = error.response?.data?.message || 
      error.message || 
      'Failed to create customer'
    
    if (window.toastr) {
      window.toastr.error(errorMessage)
    } else {
      console.error(errorMessage)
    }
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
