import { defineStore } from 'pinia'
import { logger } from '../utils/logger'

export const useCartStore = defineStore('cart', {
  state: () => ({
    items: [],
    discountType: '%',
    discountValue: 0,
    taxRate: 0.08, // 8% tax rate
    loading: false,
    error: null
  }),

  getters: {
    subtotal: (state) => {
      // Prices are already in cents
      return state.items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
    },

    discountAmount: (state) => {
      if (state.discountType === '%') {
        return Math.round(state.subtotal * (state.discountValue / 100))
      }
      // If discount is in dollars, convert to cents
      return Math.round(Number(state.discountValue) * 100) || 0
    },

    taxableAmount: (state) => {
      return state.subtotal - state.discountAmount
    },

    taxAmount: (state) => {
      // Calculate tax on the amount in cents
      return Math.round(state.taxableAmount * state.taxRate)
    },

    total: (state) => {
      return state.taxableAmount + state.taxAmount
    },

    itemCount: (state) => {
      return state.items.reduce((sum, item) => sum + item.quantity, 0)
    },

    isEmpty: (state) => {
      return state.items.length === 0
    }
  },

  actions: {
    addItem(product, quantity = 1) {
      logger.info('Adding item to cart:', { product, quantity })
      
      const existingItem = this.items.find(item => item.id === product.id)
      // Price is already in cents from the backend, no need to multiply by 100
      const price = product.sale_price || product.price
      
      if (existingItem) {
        existingItem.quantity += quantity
        logger.info('Updated existing item quantity:', existingItem)
      } else {
        this.items.push({
          id: product.id,
          name: product.name,
          price: price,
          quantity,
          product // Keep reference to original product
        })
        logger.info('Added new item to cart')
      }
    },

    updateItemQuantity(itemId, quantity) {
      logger.info('Updating item quantity:', { itemId, quantity })
      
      const item = this.items.find(item => item.id === itemId)
      if (item) {
        if (quantity > 0) {
          item.quantity = quantity
        } else {
          this.removeItem(itemId)
        }
      }
    },

    removeItem(itemId) {
      logger.info('Removing item from cart:', itemId)
      this.items = this.items.filter(item => item.id !== itemId)
    },

    setDiscount(type, value) {
      logger.info('Setting discount:', { type, value })
      this.discountType = type
      this.discountValue = value
    },

    clearCart() {
      logger.info('Clearing cart')
      this.items = []
      this.discountType = '%'
      this.discountValue = 0
    },

    async createHoldInvoice(description = '') {
      logger.startGroup('Cart Store: Create Hold Invoice')
      this.loading = true
      this.error = null

      try {
        // Format items for hold invoice
        const holdItems = this.items.map(item => ({
          item_id: item.id,
          quantity: item.quantity,
          price: item.price, // Already in cents
          name: item.name
        }))

        const holdInvoice = {
          description,
          total: this.total, // Already in cents
          sub_total: this.subtotal, // Already in cents
          tax: this.taxAmount, // Already in cents
          discount_type: this.discountType,
          discount: this.discountValue,
          discount_val: this.discountAmount, // Already in cents
          items: holdItems
        }

        logger.info('Hold invoice data prepared:', holdInvoice)
        
        return {
          success: true,
          holdInvoice
        }
      } catch (error) {
        logger.error('Failed to create hold invoice:', error)
        this.error = error.message
        throw error
      } finally {
        this.loading = false
        logger.endGroup()
      }
    },

    async submitOrder() {
      logger.startGroup('Cart Store: Submit Order')
      this.loading = true
      this.error = null

      try {
        // Format items for order submission
        const orderItems = this.items.map(item => ({
          item_id: item.id,
          quantity: item.quantity,
          price: item.price, // Already in cents
          name: item.name
        }))

        const order = {
          items: orderItems,
          total: this.total, // Already in cents
          subtotal: this.subtotal, // Already in cents
          tax: this.taxAmount, // Already in cents
          discount_type: this.discountType,
          discount: this.discountValue,
          discount_amount: this.discountAmount // Already in cents
        }

        logger.info('Order data prepared:', order)
        
        return {
          success: true,
          order
        }
      } catch (error) {
        logger.error('Failed to submit order:', error)
        this.error = error.message
        throw error
      } finally {
        this.loading = false
        logger.endGroup()
      }
    }
  }
})
