<!-- src/views/auth/Login.vue -->
<template>
  <div class="login-page">
    <v-container fluid class="fill-height">
      <v-row align="center" justify="center" no-gutters>
        <v-col cols="12" sm="8" md="6" lg="4" xl="3">
          <v-card class="login-card">
            <!-- Header -->
            <v-card-item class="login-header">
              <div class="d-flex flex-column align-center py-8">
                <v-icon
                  icon="mdi-store"
                  color="primary"
                  size="64"
                  class="mb-4"
                />
                <h1 class="text-h4 font-weight-bold text-primary mb-2">
                  {{ appTitle }}
                </h1>
                <p class="text-body-1 text-medium-emphasis">
                  Sign in to your account
                </p>
              </div>
            </v-card-item>

            <v-card-text class="px-6 pt-2 pb-4">
              <v-form @submit.prevent="handleLogin" ref="form">
                <!-- Email Field -->
                <v-text-field
                  v-model="formData.email"
                  :rules="[rules.required, rules.email]"
                  label="Email"
                  prepend-inner-icon="mdi-email"
                  variant="outlined"
                  :error-messages="errors.email"
                  @update:model-value="clearError('email')"
                  required
                  autocomplete="username"
                  class="mb-4 login-field"
                  placeholder="Enter your email"
                  bg-color="surface"
                />

                <!-- Password Field -->
                <v-text-field
                  v-model="formData.password"
                  :rules="[rules.required, rules.minLength]"
                  label="Password"
                  prepend-inner-icon="mdi-lock"
                  :append-inner-icon="showPassword ? 'mdi-eye' : 'mdi-eye-off'"
                  @click:append-inner="showPassword = !showPassword"
                  :type="showPassword ? 'text' : 'password'"
                  variant="outlined"
                  :error-messages="errors.password"
                  @update:model-value="clearError('password')"
                  required
                  autocomplete="current-password"
                  class="mb-2 login-field"
                  placeholder="Enter your password"
                  bg-color="surface"
                />

                <!-- Error Alert -->
                <v-expand-transition>
                  <v-alert
                    v-if="error"
                    type="error"
                    variant="tonal"
                    closable
                    class="mb-4 login-alert"
                    @click:close="error = null"
                    density="comfortable"
                  >
                    {{ error }}
                  </v-alert>
                </v-expand-transition>

                <!-- Login Button -->
                <v-btn
                  color="primary"
                  size="large"
                  :loading="loading"
                  :disabled="!formIsValid"
                  @click="handleLogin"
                  block
                  class="mt-2 login-button"
                  height="48"
                >
                  <v-icon start icon="mdi-login" class="mr-2" />
                  Sign In
                </v-btn>
              </v-form>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </v-container>
  </div>
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

<style scoped>
.login-page {
  background: linear-gradient(135deg, rgb(var(--v-theme-primary)) 0%, rgba(var(--v-theme-primary), 0.8) 100%);
  min-height: 100vh;
  width: 100vw;
  display: flex;
  align-items: center;
  justify-content: center;
}

.login-card {
  border-radius: 16px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.1) !important;
  overflow: hidden;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  max-width: 100%;
}

.login-header {
  background-color: rgb(var(--v-theme-background));
  border-bottom: 1px solid rgba(var(--v-border-color), 0.12);
}

.login-field {
  transition: all 0.2s ease;
}

.login-field:hover :deep(.v-field) {
  border-color: rgba(var(--v-theme-primary), 0.5);
}

.login-field :deep(.v-field) {
  border-radius: 8px;
  transition: all 0.2s ease;
}

.login-button {
  transition: all 0.2s ease;
  text-transform: none;
  letter-spacing: 0.5px;
  font-weight: 500;
}

.login-button:not(:disabled):hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(var(--v-theme-primary), 0.2);
}

.login-alert {
  border-radius: 8px;
  transition: all 0.3s ease;
}

@media (max-width: 600px) {
  .login-card {
    margin: 16px;
    border-radius: 12px;
  }
}
</style>