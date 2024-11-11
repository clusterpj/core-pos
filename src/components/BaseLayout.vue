<!-- src/components/BaseLayout.vue -->
<template>
  <v-app>
    <v-navigation-drawer 
      v-model="drawer" 
      :rail="rail"
      permanent
      @click="rail = false"
    >
      <v-list-item>
        <template v-slot:prepend>
          <v-btn
            variant="text"
            icon="mdi-format-list-bulleted"
            @click.stop="rail = !rail"
          />
        </template>
        <v-list-item-title v-if="!rail">
          Menu
        </v-list-item-title>
      </v-list-item>

      <v-divider></v-divider>
      <!-- Navigation Items -->
      <v-list density="compact" nav>
        <div v-for="item in navItems" :key="item.title" class="nav-item-container">
          <v-list-item
            :to="item.to"
            :prepend-icon="item.icon"
            :title="rail ? '' : item.title"
            :value="item.title"
          />
          <div v-if="rail" class="icon-reference text-caption text-center">{{ item.title }}</div>
        </div>
      </v-list>

      <!-- Corebill Button -->
      <template v-slot:append>
        <v-divider></v-divider>
        <!-- Logout Button -->
        <div class="nav-item-container pa-2">
          <v-btn
            block
            :icon="rail"
            color="error"
            variant="tonal"
            prepend-icon="mdi-logout"
            @click="handleLogout"
          >
            <template v-if="!rail">
              Logout
            </template>
          </v-btn>
          <div v-if="rail" class="icon-reference text-caption text-center">Logout</div>
        </div>
        <!-- Corebill Button -->
        <div class="nav-item-container pa-2">
          <v-btn
            block
            :icon="rail"
            color="primary"
            variant="tonal"
            prepend-icon="mdi-arrow-left-circle"
            @click="goToCorebill"
          >
            <template v-if="!rail">
              Back to Corebill
            </template>
          </v-btn>
          <div v-if="rail" class="icon-reference text-caption text-center">Corebill</div>
        </div>
      </template>
    </v-navigation-drawer>

    <v-app-bar>
      <v-app-bar-title class="mr-4">{{ appTitle }}</v-app-bar-title>
      
      <!-- Selection Controls -->
      <div class="d-flex align-center selection-controls">
        <v-select
          :model-value="companyStore.selectedCustomerDisplay"
          label="Customer"
          :items="companyStore.customersForDisplay"
          :loading="companyStore.loading"
          item-title="title"
          item-value="value"
          density="compact"
          hide-details
          class="selection-field mr-2"
          @update:model-value="handleCustomerChange"
          :return-object="false"
          variant="outlined"
        />

        <v-select
          :model-value="companyStore.selectedStoreDisplay"
          label="Store"
          :items="companyStore.storesForDisplay"
          :loading="companyStore.loadingStores"
          item-title="title"
          item-value="value"
          density="compact"
          hide-details
          class="selection-field mr-2"
          :disabled="!companyStore.selectedCustomer"
          @update:model-value="handleStoreChange"
          :return-object="false"
          variant="outlined"
        />

        <v-select
          :model-value="companyStore.selectedCashierDisplay"
          label="Cash Register"
          :items="companyStore.cashRegistersForDisplay"
          :loading="companyStore.loadingCashRegisters"
          item-title="title"
          item-value="value"
          density="compact"
          hide-details
          class="selection-field"
          :disabled="!companyStore.selectedStore"
          @update:model-value="handleCashierChange"
          :return-object="false"
          variant="outlined"
        />
      </div>
    </v-app-bar>

    <v-main>
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </v-main>
  </v-app>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useCompanyStore } from '../stores/company'
import { useRouter } from 'vue-router'
import { logger } from '../utils/logger'

const router = useRouter()
const authStore = useAuthStore()
const companyStore = useCompanyStore()
const drawer = ref(true)
const rail = ref(true) // Set to true by default to keep sidebar collapsed
const appTitle = ref('CorePOS')

// Save rail state to localStorage
watch(rail, (newValue) => {
  localStorage.setItem('navigationRail', newValue.toString())
})

const navItems = computed(() => [
  {
    title: 'Point of Sale',
    icon: 'mdi-cash-register',
    to: '/pos'
  },
  {
    title: 'Items',
    icon: 'mdi-package-variant-closed',
    to: '/items'
  }
])

// Handle selection changes
const handleCustomerChange = async (value) => {
  if (!value) return

  try {
    await companyStore.setSelectedCustomer(Number(value))
    
    // Clear downstream selections
    companyStore.clearStoreSelection()
    companyStore.clearCashierSelection()
    
    // Fetch stores for new customer
    await companyStore.fetchStores()
  } catch (error) {
    console.error('Failed to handle customer change:', error)
  }
}

const handleStoreChange = async (value) => {
  if (!value) return

  try {
    await companyStore.setSelectedStore(Number(value))
    
    // Clear cashier selection
    companyStore.clearCashierSelection()
    
    // Fetch cash registers for new store
    await companyStore.fetchCashRegisters()
  } catch (error) {
    console.error('Failed to handle store change:', error)
  }
}

const handleCashierChange = async (value) => {
  if (!value) return

  try {
    await companyStore.setSelectedCashier(Number(value))
  } catch (error) {
    console.error('Failed to handle cashier change:', error)
  }
}

const handleLogout = async () => {
  try {
    await authStore.logout()
  } catch (error) {
    console.error('Logout failed:', error)
  }
}

const goToCorebill = () => {
  // This is a placeholder function - replace URL with actual Corebill URL
  window.location.href = '/corebill'
}

// Initialize
onMounted(async () => {
  try {
    // Always start with rail collapsed
    rail.value = true
    localStorage.setItem('navigationRail', 'true')

    // Get stored selections
    const storedCustomer = localStorage.getItem('selectedCustomer')
    const storedStore = localStorage.getItem('selectedStore')
    const storedCashier = localStorage.getItem('selectedCashier')

    // Step 1: Fetch customers first
    await companyStore.fetchCustomers()
      .catch(error => {
        console.error('Failed to fetch customers:', error)
        throw error // Re-throw to prevent further initialization
      })

    // Step 2: Set customer if valid
    if (companyStore.customers.length > 0) {
      let customerId = null

      if (storedCustomer && companyStore.customers.find(c => c.id === Number(storedCustomer))) {
        customerId = Number(storedCustomer)
      } else if (companyStore.customersForDisplay.length === 1) {
        customerId = companyStore.customersForDisplay[0].value
      }

      if (customerId) {
        await companyStore.setSelectedCustomer(customerId)
          .catch(error => {
            console.error('Failed to set customer:', error)
            throw error
          })

        // Step 3: Fetch stores after customer is set
        await companyStore.fetchStores()
          .catch(error => {
            console.error('Failed to fetch stores:', error)
            throw error
          })

        // Step 4: Set store if valid
        if (storedStore && companyStore.stores.find(s => s.id === Number(storedStore))) {
          await companyStore.setSelectedStore(Number(storedStore))
            .catch(error => {
              console.error('Failed to set store:', error)
            })

          // Step 5: Fetch cash registers after store is set
          await companyStore.fetchCashRegisters()
            .catch(error => {
              console.error('Failed to fetch cash registers:', error)
            })

          // Step 6: Set cash register if valid
          if (storedCashier && companyStore.cashRegisters.find(r => r.id === Number(storedCashier))) {
            await companyStore.setSelectedCashier(Number(storedCashier))
              .catch(error => {
                console.error('Failed to set cash register:', error)
              })
          }
        }
      }
    }

    logger.info('Initialization completed successfully')
  } catch (error) {
    console.error('Failed to initialize:', error)
    // Optionally show error to user via toast or alert
  }
})
</script>

<style scoped>
/* Transition styles */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Selection controls styles */
.selection-controls {
  flex: 1;
  max-width: 800px;
}

.selection-field {
  width: 200px;
}

:deep(.v-field) {
  background-color: white !important;
}

/* Navigation styles */
.nav-item-container {
  position: relative;
  margin-bottom: 8px;
}

.icon-reference {
  font-size: 10px;
  color: rgba(0, 0, 0, 0.6);
  padding: 0 4px;
  margin-top: -8px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 56px;
  margin-left: auto;
  margin-right: auto;
}
</style>
