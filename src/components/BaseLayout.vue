<!-- src/components/BaseLayout.vue -->
<template>
  <v-app>
    <v-navigation-drawer v-model="drawer" permanent>
      <v-list>
        <v-list-item
          v-for="item in navItems"
          :key="item.title"
          :to="item.to"
          :prepend-icon="item.icon"
          :title="item.title"
        />
      </v-list>
    </v-navigation-drawer>

    <v-app-bar>
      <v-app-bar-title>{{ appTitle }}</v-app-bar-title>
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
import { ref, computed } from 'vue'
import { useAuthStore } from '../stores/auth'

const authStore = useAuthStore()
const drawer = ref(true)
const appTitle = ref('CorePOS')

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
</style>
