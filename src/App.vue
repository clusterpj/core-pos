<!-- src/App.vue -->
<template>
  <v-app>
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
import { onBeforeMount, ref } from 'vue'
import { useAuthStore } from './stores/auth'
import { useCartStore } from './stores/cart-store'

const authStore = useAuthStore()
const cartStore = useCartStore()
const isReady = ref(false)

onBeforeMount(async () => {
  // Attempt to restore session before app mount
  await authStore.restoreSession()
  
  // Initialize cart from localStorage
  cartStore.initializeCart()
  
  isReady.value = true
})
</script>

<style>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

html, body {
  height: 100%;
  margin: 0;
  padding: 0;
}

#app {
  height: 100%;
}

.v-main--pos {
  padding-bottom: 0 !important;
}

.v-main--pos .v-main__wrap {
  padding: 0 !important;
}

.pos-layout .v-main {
  flex: 1 1 auto;
  height: calc(100% - 88px);
  overflow: hidden;
}

.pos-layout .v-main > .v-main__wrap {
  height: 100%;
  padding: 0 !important;
}
</style>
