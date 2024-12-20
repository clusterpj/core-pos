// vite.config.js
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vuetify from 'vite-plugin-vuetify'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [
    vue({
      template: {
        compilerOptions: {
          sourceMap: true
        }
      }
    }),
    vuetify({ autoImport: true })
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
    extensions: ['.js', '.json', '.jsx', '.mjs', '.ts', '.tsx', '.vue']
  },
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `@import "@/styles/variables.scss";`
      }
    }
  },
  build: {
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'vuetify': ['vuetify']
        }
      }
    }
  },
  optimizeDeps: {
    include: ['vuetify'],
    exclude: [],
    esbuildOptions: {
      target: 'esnext'
    }
  },
  server: {
    host: true,
    port: 3000,
    strictPort: true,
    sourcemapIgnoreList: false,
    fs: {
      strict: false,
      allow: ['..', './**/node_modules/**']
    },
    proxy: {
      '/api': {
        target: 'http://localhost',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    },
    watch: {
      usePolling: true,
      interval: 100
    }
  },
  optimizeDeps: {
    // Add Vue to the include list to ensure proper debugging
    include: ['vuetify', 'vue']
  },
  define: {
    __API_URL__: JSON.stringify(process.env.VITE_API_URL || 'http://localhost/api'),
    __DEV__: process.env.NODE_ENV !== 'production'
  },
  // Add experimental features for better module resolution
  experimental: {
    renderBuiltUrl(filename) {
      return filename
    }
  }
})