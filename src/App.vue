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

const authStore = useAuthStore()
const isReady = ref(false)

onBeforeMount(async () => {
  // Attempt to restore session before app mount
  await authStore.restoreSession()
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
</style>
