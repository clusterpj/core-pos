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
      return state.items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
    },

    discountAmount: (state) => {
      if (state.discountType === '%') {
        return Math.round(state.subtotal * (state.discountValue / 100))
      }
      return Math.round(Number(state.discountValue) * 100) || 0
    },

    taxableAmount: (state) => {
      return state.subtotal - state.discountAmount
    },

    taxAmount: (state) => {
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
    addItem(product, quantity = 1, modifications = []) {
      logger.info('Adding item to cart:', { product, quantity, modifications })
      
      // When adding a new item with modifications, always create a new entry
      if (modifications && modifications.length > 0) {
        this.items.push({
          id: product.id,
          name: product.name,
          price: product.sale_price || product.price,
          quantity,
          modifications,
          product
        })
        logger.info('Added new item with modifications')
        return
      }

      // For items without modifications, combine quantities
      const existingItem = this.items.find(item => 
        item.id === product.id && 
        (!item.modifications || item.modifications.length === 0)
      )
      
      if (existingItem) {
        existingItem.quantity += quantity
        logger.info('Updated existing item quantity:', existingItem)
      } else {
        this.items.push({
          id: product.id,
          name: product.name,
          price: product.sale_price || product.price,
          quantity,
          modifications: [],
          product
        })
        logger.info('Added new item')
      }
    },

    updateItemQuantity(itemId, quantity, index = null) {
      logger.info('Updating item quantity:', { itemId, quantity, index })
      
      let item
      if (index !== null) {
        item = this.items[index]
      } else {
        item = this.items.find(item => item.id === itemId)
      }

      if (item) {
        if (quantity > 0) {
          item.quantity = quantity
        } else {
          this.removeItem(itemId, index)
        }
      }
    },

    removeItem(itemId, index = null) {
      logger.info('Removing item from cart:', { itemId, index })
      if (index !== null) {
        this.items.splice(index, 1)
      } else {
        this.items = this.items.filter(item => item.id !== itemId)
      }
    },

    updateItemModifications(index, modifications) {
      logger.info('Updating item modifications:', { index, modifications })
      if (index >= 0 && index < this.items.length) {
        this.items[index].modifications = modifications
      }
    },

    splitItem(index, quantity, modifications) {
      logger.info('Splitting item:', { index, quantity, modifications })
      if (index >= 0 && index < this.items.length) {
        const originalItem = this.items[index]
        
        // Reduce quantity from original item
        originalItem.quantity -= quantity

        // Create new item with specified quantity and modifications
        this.items.push({
          ...originalItem,
          quantity,
          modifications: modifications || []
        })

        // Remove original item if quantity becomes 0
        if (originalItem.quantity <= 0) {
          this.items.splice(index, 1)
        }
      }
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
        const holdItems = this.items.map(item => ({
          item_id: item.id,
          quantity: item.quantity,
          price: item.price,
          name: item.name,
          modifications: item.modifications
        }))

        const holdInvoice = {
          description,
          total: this.total,
          sub_total: this.subtotal,
          tax: this.taxAmount,
          discount_type: this.discountType,
          discount: this.discountValue,
          discount_val: this.discountAmount,
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
        const orderItems = this.items.map(item => ({
          item_id: item.id,
          quantity: item.quantity,
          price: item.price,
          name: item.name,
          modifications: item.modifications
        }))

        const order = {
          items: orderItems,
          total: this.total,
          subtotal: this.subtotal,
          tax: this.taxAmount,
          discount_type: this.discountType,
          discount: this.discountValue,
          discount_amount: this.discountAmount
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