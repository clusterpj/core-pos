import { defineStore } from 'pinia'
import { state, mutations } from './cart/state'
import { actions } from './cart/actions'
import { getters } from './cart/getters'
import { invoiceActions } from './cart/invoice'
import { logger } from '@/utils/logger'

// Constants for localStorage keys
const CART_STORAGE_KEY = 'core_pos_cart'
const MODIFICATIONS_STORAGE_KEY = 'core_pos_modifications'

export const useCartStore = defineStore('cart', {
  state,
  getters,
  actions: {
    ...actions,
    ...invoiceActions,

    // Initialize cart from localStorage
    initializeCart() {
      try {
        const savedCart = localStorage.getItem(CART_STORAGE_KEY)
        if (savedCart) {
          const cartData = JSON.parse(savedCart)
          this.items = cartData.items || []
          this.notes = cartData.notes || ''
          this.type = cartData.type || null
          logger.info('Cart initialized from localStorage')
        }
      } catch (error) {
        logger.error('Failed to initialize cart from localStorage:', error)
      }
    },

    // Save cart to localStorage
    persistCart() {
      try {
        const cartData = {
          items: this.items,
          notes: this.notes,
          type: this.type
        }
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartData))
        logger.debug('Cart persisted to localStorage')
      } catch (error) {
        logger.error('Failed to persist cart to localStorage:', error)
      }
    },

    // Add new actions for item modifications
    updateItemModifications({ index, notes, modifications }) {
      if (index < 0 || index >= this.items.length) return
      
      const item = this.items[index]
      item.notes = notes
      item.modifications = modifications
      
      // Persist changes
      this.persistCart()
    },

    // Enhance split item functionality
    splitItem(index, splitQuantity) {
      if (index < 0 || index >= this.items.length) return
      
      const originalItem = this.items[index]
      if (!originalItem || splitQuantity >= originalItem.quantity) return
      
      const remainingQuantity = originalItem.quantity - splitQuantity
      
      // Update original item quantity
      originalItem.quantity = remainingQuantity
      originalItem.total = originalItem.price * remainingQuantity
      originalItem.sub_total = originalItem.total
      
      // Create new split item
      const newItem = {
        ...originalItem,
        quantity: splitQuantity,
        total: originalItem.price * splitQuantity,
        sub_total: originalItem.price * splitQuantity,
        notes: '', // Reset notes for the new item
        modifications: [] // Reset modifications for the new item
      }
      
      // Insert new item after the original
      this.items.splice(index + 1, 0, newItem)
      
      // Persist changes
      this.persistCart()
    },

    // Add item with support for modifications
    addItem(product, quantity = 1, modifications = [], notes = '') {
      const existingItem = this.items.find(item => 
        item.id === product.id && 
        !item.notes && 
        (!item.modifications || item.modifications.length === 0)
      )

      if (existingItem) {
        existingItem.quantity += quantity
        existingItem.total = existingItem.price * existingItem.quantity
        existingItem.sub_total = existingItem.total
      } else {
        const price = product.price
        const newItem = {
          ...product,
          price,
          quantity,
          total: price * quantity,
          sub_total: price * quantity,
          notes,
          modifications,
          discount_type: 'fixed',
          discount: 0,
          discount_val: 0,
          item_id: product.id
        }
        this.items.push(newItem)
      }
      
      // Persist changes
      this.persistCart()
    },

    // Override existing actions to include persistence
    setNotes(notes) {
      mutations.setNotes(this, notes)
      this.persistCart()
    },

    setSelectedTables(tables) {
      mutations.setSelectedTables(this, tables)
      this.persistCart()
    },

    setDiscount(type, value) {
      mutations.setDiscount(this, { type, value })
      this.persistCart()
    },

    setType(type) {
      mutations.setType(this, type)
      this.persistCart()
    },

    clearCart() {
      mutations.clearCart(this)
      localStorage.removeItem(CART_STORAGE_KEY)
    },

    // Override hold invoice actions to include modifications
    prepareHoldInvoiceData(storeId, cashRegisterId, referenceNumber) {
      const invoiceData = invoiceActions.prepareHoldInvoiceData(this, this, {
        storeId,
        cashRegisterId,
        referenceNumber
      })

      // Add modifications data to each item
      if (invoiceData.items) {
        invoiceData.items = invoiceData.items.map(item => ({
          ...item,
          notes: item.notes || '',
          modifications: item.modifications || [],
          modification_data: JSON.stringify({
            notes: item.notes,
            modifications: item.modifications
          })
        }))
      }

      return invoiceData
    },

    // Override load invoice to handle modifications
    loadInvoice(invoice) {
      actions.loadInvoice(this, invoice)

      // Process modifications for each item
      if (this.items) {
        this.items = this.items.map(item => {
          let notes = ''
          let modifications = []

          try {
            if (item.modification_data) {
              const modData = JSON.parse(item.modification_data)
              notes = modData.notes || ''
              modifications = modData.modifications || []
            }
          } catch (error) {
            logger.error('Failed to parse item modifications:', error)
          }

          return {
            ...item,
            notes,
            modifications
          }
        })
      }

      // Persist the loaded cart
      this.persistCart()
    }
  }
})
