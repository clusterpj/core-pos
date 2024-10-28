<!-- src/views/auth/Login.vue -->
<template>
  <v-container fluid class="fill-height bg-grey-lighten-4">
    <v-row align="center" justify="center">
      <v-col cols="12" sm="8" md="4">
        <v-card class="elevation-12">
          <v-toolbar color="primary" dark flat>
            <v-toolbar-title>{{ appTitle }}</v-toolbar-title>
          </v-toolbar>

          <v-card-text>
            <v-form @submit.prevent="handleLogin" ref="form">
              <v-text-field
                v-model="formData.email"
                :rules="[rules.required, rules.email]"
                label="Email"
                prepend-icon="mdi-email"
                variant="outlined"
                :error-messages="errors.email"
                @update:model-value="clearError('email')"
                required
                autocomplete="username"
              />

              <v-text-field
                v-model="formData.password"
                :rules="[rules.required, rules.minLength]"
                label="Password"
                prepend-icon="mdi-lock"
                :append-icon="showPassword ? 'mdi-eye' : 'mdi-eye-off'"
                @click:append="showPassword = !showPassword"
                :type="showPassword ? 'text' : 'password'"
                variant="outlined"
                :error-messages="errors.password"
                @update:model-value="clearError('password')"
                required
                autocomplete="current-password"
              />
            </v-form>
          </v-card-text>

          <v-divider></v-divider>

          <v-card-actions>
            <v-spacer />
            <v-btn
              color="primary"
              size="large"
              :loading="loading"
              :disabled="!formIsValid"
              @click="handleLogin"
            >
              Login
            </v-btn>
          </v-card-actions>

          <!-- Error Alert -->
          <v-alert
            v-if="error"
            type="error"
            variant="tonal"
            closable
            class="mx-4 mb-4"
            @click:close="error = null"
          >
            {{ error }}
          </v-alert>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { validateForm } from '@/utils/validation'
import { logger } from '@/utils/logger'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const form = ref(null)
const showPassword = ref(false)
const loading = ref(false)
const error = ref(null)
const errors = reactive({
  email: null,
  password: null
})

const appTitle = import.meta.env.VITE_APP_TITLE || 'CorePOS'

const formData = reactive({
  email: '',
  password: ''
})

const rules = {
  required: v => !!v || 'This field is required',
  email: v => /.+@.+\..+/.test(v) || 'Please enter a valid email',
  minLength: v => v.length >= 6 || 'Password must be at least 6 characters'
}

const formIsValid = computed(() => {
  return formData.email && formData.password &&
         !errors.email && !errors.password
})

function clearError(field) {
  errors[field] = null
  error.value = null
}

async function handleLogin() {
  if (!formIsValid.value) return

  // Validate form
  const validationErrors = validateForm(formData, {
    email: ['required', 'email'],
    password: ['required', ['minLength', 6]]
  })

  if (validationErrors) {
    Object.assign(errors, validationErrors)
    return
  }

  loading.value = true
  error.value = null

  try {
    await authStore.login({
      email: formData.email,
      password: formData.password
    })

    logger.info('Login successful', { email: formData.email })
    
    // Navigate to the redirect path or default to POS
    const redirectPath = route.query.redirect || '/pos'
    router.push(redirectPath)
  } catch (err) {
    logger.error('Login failed', err)
    
    if (err.details) {
      Object.assign(errors, err.details)
      error.value = 'Please correct the errors below'
    } else {
      error.value = err.message || 'Login failed. Please try again.'
    }
  } finally {
    loading.value = false
  }
}
</script>