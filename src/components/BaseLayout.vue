<!-- src/components/BaseLayout.vue -->
<template>
  <v-app>
    <v-fade-transition>
      <v-btn
        v-show="!drawer"
        size="large"
        variant="elevated"
        color="primary"
        @click="drawer = true"
        class="menu-toggle"
      >
        <v-icon
          size="24"
          color="white"
        >
          mdi-menu
        </v-icon>
        
        <v-tooltip
          activator="parent"
          location="right"
          open-delay="500"
        >
          Open Menu
        </v-tooltip>
      </v-btn>
    </v-fade-transition>

    <v-navigation-drawer 
      v-model="drawer"
      :temporary="drawerBehavior.temporary"
      :permanent="drawerBehavior.permanent"
    >
      <!-- Top Actions -->
      <div class="d-flex flex-column pa-2 gap-2">
        <v-btn
          block
          color="error"
          variant="tonal"
          prepend-icon="mdi-logout"
          @click="handleLogout"
        >
          Logout
        </v-btn>
        <v-btn
          block
          color="primary"
          variant="tonal"
          prepend-icon="mdi-arrow-left-circle"
          @click="goToCorebill"
        >
          Back to Corebill
        </v-btn>
      </div>

      <v-divider class="my-2"></v-divider>

      <v-list-item>
        <template v-slot:prepend>
          <v-btn
            variant="text"
            icon="mdi-close"
            @click.stop="drawer = false"
          />
        </template>
        <v-list-item-title>
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
            :title="item.title"
            :value="item.title"
          />
        </div>
      </v-list>

      <v-divider class="my-4"></v-divider>

      <!-- Selection Controls Section -->
      <div class="px-3">
        <div class="text-subtitle-2 mb-2">Selections</div>
        <v-select
          :model-value="companyStore.selectedCustomerDisplay"
          label="Customer"
          :items="companyStore.customersForDisplay"
          :loading="companyStore.loading"
          item-title="title"
          item-value="value"
          density="compact"
          hide-details
          class="mb-2"
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
          class="mb-2"
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
          :disabled="!companyStore.selectedStore"
          @update:model-value="handleCashierChange"
          :return-object="false"
          variant="outlined"
        />
      </div>

    </v-navigation-drawer>


    <v-main class="main-content">
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
import { useDisplay } from 'vuetify'
import { useAuthStore } from '../stores/auth'
import { useCompanyStore } from '../stores/company'
import { useRouter } from 'vue-router'
import { logger } from '../utils/logger'

const router = useRouter()
const authStore = useAuthStore()
const companyStore = useCompanyStore()
const drawer = ref(false)
const { mobile, mdAndUp } = useDisplay()

// Computed property for drawer behavior
const drawerBehavior = computed(() => ({
  temporary: mobile.value,
  permanent: mdAndUp.value && drawer.value,
}))

// Update drawer state management
const handleDrawerState = (newValue) => {
  drawer.value = newValue
  localStorage.setItem('navigationDrawer', newValue.toString())
}

// Watch for drawer changes
watch(drawer, handleDrawerState)

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
    // Initialize drawer state from localStorage
    const savedState = localStorage.getItem('navigationDrawer')
    if (savedState !== null) {
      drawer.value = savedState === 'true'
    }

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
:deep(.v-select .v-field) {
  --v-field-padding-top: 8px !important;
  --v-field-padding-bottom: 8px !important;
}

:deep(.v-select) {
  transition: all 0.3s ease;
}


.menu-toggle {
  position: fixed;
  bottom: 10px;
  left: 16px;
  z-index: 1001;
  border-radius: 50%;
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
  width: 44px; /* Smaller, more compact size */
  height: 44px; /* Maintain perfect circle */
  min-width: 44px !important; /* Ensure button doesn't expand */
  min-height: 44px !important; /* Ensure button doesn't expand */
  transition: all 0.2s ease;
  padding: 0 !important; /* Force remove padding */
  display: flex !important; /* Ensure proper centering */
  align-items: center !important;
  justify-content: center !important;
}

.menu-toggle :deep(.v-icon) {
  margin: 0 !important;
  padding: 0 !important;
  font-size: 20px !important; /* Slightly smaller icon */
}

.menu-toggle:hover {
  box-shadow: 0 4px 12px rgba(0,0,0,0.2);
  transform: translateY(-2px);
}

.menu-toggle:active {
  transform: scale(0.95);
}

@media (max-width: 600px) {
  .menu-toggle {
    bottom: 88px;
    left: 12px;
    width: 40px; /* Even smaller on mobile */
    height: 40px;
    min-width: 40px !important;
    min-height: 40px !important;
  }
  
  .menu-toggle :deep(.v-icon) {
    font-size: 18px !important; /* Smaller icon for mobile */
  }
}

.v-fade-transition-enter-active,
.v-fade-transition-leave-active {
  transition: opacity 0.2s ease;
}

.v-fade-transition-enter-from,
.v-fade-transition-leave-to {
  opacity: 0;
}

/* Navigation styles */
.nav-item-container {
  position: relative;
  margin-bottom: 8px;
}

.main-content {
  height: 100vh;
  overflow: hidden;
}
</style>
