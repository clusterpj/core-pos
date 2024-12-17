<!-- src/views/auth/SelectCashier.vue -->
<template>
  <div class="select-cashier-page">
    <v-container fluid class="fill-height">
      <v-row align="center" justify="center" no-gutters>
        <v-col cols="12" sm="8" md="6" lg="4" xl="3">
          <v-card class="select-cashier-card elevation-3">
            <!-- Header -->
            <v-card-item class="select-cashier-header">
              <div class="d-flex flex-column align-center py-8">
                <v-icon
                  icon="mdi-cash-register"
                  color="primary"
                  size="64"
                  class="mb-4"
                />
                <h1 class="text-h4 font-weight-bold text-primary mb-2">
                  Select Location
                </h1>
                <p class="text-body-1 text-medium-emphasis">
                  Choose your store and cash register to continue
                </p>
              </div>
            </v-card-item>

            <v-card-text class="px-6 pt-2 pb-4">
              <!-- Store Selection -->
              <v-select
                v-model="selectedStore"
                :items="stores"
                item-title="name"
                item-value="id"
                label="Select your store"
                :loading="loading"
                required
                variant="outlined"
                bg-color="surface"
                class="mb-4"
                :disabled="loading"
                :error-messages="storeError"
                @update:model-value="handleStoreChange"
              >
                <template v-slot:item="{ props, item }">
                  <v-list-item v-bind="props" :title="item.raw.name">
                    <template v-slot:subtitle>
                      {{ item.raw.description }}
                    </template>
                  </v-list-item>
                </template>
              </v-select>

              <!-- Cashier Selection -->
              <v-select
                v-model="selectedCashier"
                :items="filteredCashiers"
                item-title="name"
                item-value="id"
                label="Select your cash register"
                :loading="loading"
                required
                variant="outlined"
                bg-color="surface"
                :disabled="loading || !selectedStore"
                :error-messages="cashierError"
              >
                <template v-slot:item="{ props, item }">
                  <v-list-item v-bind="props" :title="item.raw.name">
                    <template v-slot:subtitle>
                      Store: {{ item.raw.store_name }}
                    </template>
                  </v-list-item>
                </template>
              </v-select>

              <v-alert
                v-if="error"
                type="error"
                variant="tonal"
                class="mt-4"
                closable
                @click:close="error = null"
              >
                {{ error }}
              </v-alert>
            </v-card-text>

            <v-card-actions class="pa-6 pt-0">
              <v-spacer />
              <v-btn
                color="primary"
                :loading="loading"
                :disabled="!isValid"
                @click="handleSelection"
                size="large"
                block
                height="48"
              >
                <v-icon start icon="mdi-login" class="mr-2" />
                Continue
              </v-btn>
            </v-card-actions>

            <v-card-text class="text-center pt-0">
              <v-btn
                color="error"
                variant="text"
                size="small"
                @click="handleLogout"
                :disabled="loading"
              >
                Sign Out
              </v-btn>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </v-container>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useCompanyStore } from '@/stores/company'
import { logger } from '@/utils/logger'

const router = useRouter()
const authStore = useAuthStore()
const companyStore = useCompanyStore()

const loading = ref(false)
const error = ref(null)
const wasValidated = ref(false)
const storeError = ref('')
const cashierError = ref('')
const selectedStore = ref(null)
const selectedCashier = ref(null)

// Computed properties
const stores = computed(() => {
  if (!Array.isArray(authStore.availableCashiers)) return []
  
  const uniqueStores = new Map()
  authStore.availableCashiers.forEach(cashier => {
    if (!uniqueStores.has(cashier.store_id)) {
      uniqueStores.set(cashier.store_id, {
        id: cashier.store_id,
        name: cashier.store_name || 'Unknown Store',
        description: cashier.description || ''
      })
    }
  })
  return Array.from(uniqueStores.values())
})

// Filter cashiers by selected store
const filteredCashiers = computed(() => {
  if (!selectedStore.value || !Array.isArray(authStore.availableCashiers)) return []
  return authStore.availableCashiers.filter(cashier => 
    cashier.store_id === selectedStore.value
  )
})

const isValid = computed(() => {
  return selectedStore.value && selectedCashier.value
})

function handleStoreChange(storeId) {
  selectedStore.value = storeId
  selectedCashier.value = null // Reset cashier when store changes
  storeError.value = ''
  cashierError.value = ''
  error.value = null
  wasValidated.value = false
}

async function handleSelection() {
  wasValidated.value = true
  if (!isValid.value) {
    if (!selectedStore.value) storeError.value = 'Please select a store'
    if (!selectedCashier.value) cashierError.value = 'Please select a cash register'
    return
  }
  
  loading.value = true
  try {
    const cashier = filteredCashiers.value.find(c => c.id === selectedCashier.value)
    if (!cashier) {
      throw new Error('Selected cash register not found')
    }
    
    // Initialize company store with selected cashier
    await companyStore.initializeFromCashier(cashier)
    
    // Navigate to POS
    router.push('/pos')
  } catch (err) {
    error.value = 'Failed to select cash register. Please try again.'
    logger.error('Failed to select cashier:', err)
  } finally {
    loading.value = false
  }
}

function handleLogout() {
  authStore.logout()
}

// Load cashiers on mount
onMounted(async () => {
  loading.value = true
  try {
    await authStore.loadAvailableCashiers()
    if (!authStore.hasCashiers) {
      error.value = 'No cash registers are available. Please contact your administrator.'
    }
  } catch (err) {
    error.value = 'Failed to load cash registers. Please try again.'
    logger.error('Failed to load cashiers:', err)
  } finally {
    loading.value = false
  }
})
</script>

<style>
.select-cashier-page {
  min-height: 100vh;
  background-color: rgb(var(--v-theme-background));
}

.select-cashier-card {
  border-radius: 12px;
}

.select-cashier-header {
  background: linear-gradient(to right, rgba(var(--v-theme-primary), 0.1), rgba(var(--v-theme-primary), 0.05));
}
</style>
