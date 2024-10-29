// src/router/index.js
import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import BaseLayout from '../components/BaseLayout.vue'
import posRoutes from '../views/pos/pos.routes'

const routes = [
  {
    path: '/login',
    name: 'login',
    component: () => import('../views/auth/Login.vue'),
    meta: {
      requiresAuth: false,
      layout: 'none'
    }
  },
  {
    path: '/',
    component: BaseLayout,
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        redirect: '/dashboard'
      },
      {
        path: 'dashboard',
        name: 'dashboard',
        component: () => import('../views/Dashboard.vue'),
        meta: {
          title: 'Dashboard'
        }
      },
      {
        path: 'items',
        name: 'items',
        component: () => import('../views/Items.vue'),
        meta: {
          title: 'Items Management'
        }
      },
      posRoutes // Add POS routes here
    ]
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('../views/errors/NotFound.vue'),
    meta: {
      requiresAuth: false,
      layout: 'none'
    }
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

// Keep track of initial session restoration
let initialSessionRestored = false

// Navigation guards
router.beforeEach(async (to, from, next) => {
  // Debug logging in development only
  if (import.meta.env.DEV) {
    console.log('Navigation to:', to.path)
  }

  // Set document title
  document.title = to.meta.title
    ? `${to.meta.title} - CorePOS`
    : 'CorePOS'

  try {
    const authStore = useAuthStore()
    const requiresAuth = to.matched.some(record => record.meta.requiresAuth !== false)

    // On first navigation, ensure session is restored
    if (!initialSessionRestored) {
      await authStore.restoreSession()
      initialSessionRestored = true
    }

    // Handle authentication
    if (requiresAuth && !authStore.isAuthenticated) {
      if (import.meta.env.DEV) {
        console.log('Auth required, redirecting to login')
      }
      return next({
        path: '/login',
        query: { redirect: to.fullPath }
      })
    }

    // Redirect authenticated users away from login
    if (to.path === '/login' && authStore.isAuthenticated) {
      if (import.meta.env.DEV) {
        console.log('Already authenticated, redirecting to dashboard')
      }
      return next('/dashboard')
    }

    next()
  } catch (error) {
    console.error('Navigation error:', error)
    next('/login')
  }
})

// After navigation complete
router.afterEach((to, from) => {
  if (import.meta.env.DEV) {
    console.log('Navigation completed:', to.path)
  }
})

export default router
