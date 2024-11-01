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
        <v-list-item
          v-for="item in navItems"
          :key="item.title"
          :to="item.to"
          :prepend-icon="item.icon"
          :title="rail ? '' : item.title"
          :value="item.title"
        />
      </v-list>
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

const authStore = useAuthStore()
const companyStore = useCompanyStore()
const drawer = ref(true)
const rail = ref(false)
const appTitle = ref('CorePOS')

// Save rail state to localStorage
watch(rail, (newValue) => {
  localStorage.setItem('navigationRail', newValue.toString())
})

const navItems = computed(() => [
  {
    title: 'Dashboard',
    icon: 'mdi-view-dashboard',
    to: '/dashboard'
  },
  {
    title: 'Point of Sale',
    icon: 'mdi-cash-register',
    to: '/pos'
  },
  {
    title: 'Items',
    icon: 'mdi-package-variant-closed',
    to: '/items'
  },
  {
    title: 'Reports',
    icon: 'mdi-chart-bar',
    to: '/reports'
  },
  {
    title: 'Settings',
    icon: 'mdi-cog',
    to: '/settings'
  }
])

// Handle selection changes
const handleCustomerChange = async (value) => {
  if (!value) return
  await companyStore.setSelectedCustomer(value)
}

const handleStoreChange = async (value) => {
  if (!value) return
  await companyStore.setSelectedStore(value)
}

const handleCashierChange = (value) => {
  if (!value) return
  companyStore.setSelectedCashier(value)
}

// Initialize
onMounted(async () => {
  try {
    // First fetch customers
    await companyStore.fetchCustomers()

    // Get stored selections
    const storedCustomer = localStorage.getItem('selectedCustomer')
    const storedStore = localStorage.getItem('selectedStore')
    const storedCashier = localStorage.getItem('selectedCashier')
    const savedRail = localStorage.getItem('navigationRail')
    if (savedRail !== null) {
      rail.value = savedRail === 'true'
    }

    // Wait for customers to load before setting stored values
    if (companyStore.customers.length > 0) {
      // If we have a stored customer and it exists in the loaded customers
      if (storedCustomer && companyStore.customers.find(c => c.id === storedCustomer)) {
        await companyStore.setSelectedCustomer(storedCustomer)

        // If we have a stored store
        if (storedStore) {
          await companyStore.setSelectedStore(storedStore)

          // If we have a stored cashier
          if (storedCashier) {
            companyStore.setSelectedCashier(storedCashier)
          }
        }
      }
      // If no stored customer but only one available, select it
      else if (companyStore.customersForDisplay.length === 1) {
        const customer = companyStore.customersForDisplay[0]
        await handleCustomerChange(customer.value)
      }
    }
  } catch (error) {
    console.error('Failed to initialize selections:', error)
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
</style>
