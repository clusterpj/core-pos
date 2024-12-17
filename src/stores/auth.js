import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { authApi } from '@/services/api/auth'
import { logger } from '@/utils/logger'

export const useAuthStore = defineStore('auth', () => {
  // State
  const user = ref(null)
  const token = ref(null)
  const isAuthenticated = ref(false)
  const loading = ref(false)

  // Router instance
  const router = useRouter()

  // Getters
  const userPermissions = computed(() => user.value?.permissions || [])
  const isAdmin = computed(() => user.value?.role === 'admin')

  // Actions
  async function login(credentials) {
    loading.value = true
    try {
      const response = await authApi.login(credentials)

      // API returns { type: "Bearer", token: "...", role: "super_admin" }
      const { token: authToken, role } = response

      // Set auth state
      token.value = authToken
      isAuthenticated.value = true
      user.value = {
        email: credentials.email,
        role: role,
        permissions: ['view_dashboard', 'access_pos', 'view_products', 'view_customers', 'view_reports'] // Default permissions for development
      }

      // Store token in localStorage
      localStorage.setItem('token', authToken)

      // Load full user profile
      await loadUserProfile()

      logger.info('User logged in successfully', { email: credentials.email })

      return response
    } catch (error) {
      logger.error('Login failed', error)
      clearAuthState()
      throw error
    } finally {
      loading.value = false
    }
  }

  async function logout() {
    try {
      if (isAuthenticated.value) {
        await authApi.logout()
      }
    } catch (error) {
      logger.warn('Logout API call failed', error)
    } finally {
      clearAuthState()
      router.push('/login')
    }
  }

  function clearAuthState() {
    token.value = null
    user.value = null
    isAuthenticated.value = false
    localStorage.removeItem('token')
  }

  async function loadUserProfile() {
    try {
      const response = await authApi.getProfile()
      user.value = {
        ...user.value,
        ...response.data
      }
    } catch (error) {
      logger.error('Failed to load user profile', error)
      throw error
    }
  }

  async function restoreSession() {
    const storedToken = localStorage.getItem('token')
    if (!storedToken) return false

    try {
      token.value = storedToken
      await loadUserProfile()
      isAuthenticated.value = true
      return true
    } catch (error) {
      logger.error('Session restoration failed', error)
      clearAuthState()
      return false
    }
  }

  // Add hasPermission method
  function hasPermission(permission) {
    if (isAdmin.value) return true
    return userPermissions.value.includes(permission)
  }

  return {
    // State
    user,
    token,
    isAuthenticated,
    loading,

    // Getters
    userPermissions,
    isAdmin,

    // Actions
    login,
    logout,
    restoreSession,
    hasPermission,
    loadUserProfile
  }
})
