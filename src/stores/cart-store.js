import { defineStore } from 'pinia'
import { logger } from '../utils/logger'

export const useCartStore = defineStore('cart', {
  state: () => ({
    items: [],
    discountType: '%',
    discountValue: 0,
    taxRate: 0.08, // 8% tax rate
    loading: false,
    error: null,
    notes: '',
    selectedTables: [],
    tipType: 'fixed',
    tipValue: 0
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

    tipAmount: (state) => {
      if (state.tipType === '%') {
        return Math.round(state.taxableAmount * (state.tipValue / 100))
      }
      return Math.round(Number(state.tipValue) * 100) || 0
    },

    total: (state) => {
      return state.taxableAmount + state.taxAmount + state.tipAmount
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

    setTip(type, value) {
      logger.info('Setting tip:', { type, value })
      this.tipType = type
      this.tipValue = value
    },

    setNotes(notes) {
      this.notes = notes
    },

    setSelectedTables(tables) {
      this.selectedTables = tables
    },

    clearCart() {
      logger.info('Clearing cart')
      this.items = []
      this.discountType = '%'
      this.discountValue = 0
      this.tipType = 'fixed'
      this.tipValue = 0
      this.notes = ''
      this.selectedTables = []
    },

    prepareHoldInvoiceData(storeId, cashRegisterId, referenceNumber) {
      logger.startGroup('Cart Store: Prepare Hold Invoice Data')
      try {
        // Map cart items to hold invoice items format
        const holdItems = this.items.map(item => ({
          item_id: item.id,
          quantity: item.quantity,
          price: item.price,
          name: item.name,
          modifications: item.modifications || [],
          total: item.price * item.quantity,
          discount_type: 'fixed',
          discount: 0,
          discount_val: 0,
          sub_total: item.price * item.quantity
        }))

        // Get current date in YYYY-MM-DD format
        const currentDate = new Date().toISOString().split('T')[0]

        const holdInvoice = {
          description: referenceNumber,
          total: this.total,
          sub_total: this.subtotal,
          tax: this.taxAmount,
          discount_type: this.discountType,
          discount: this.discountValue,
          discount_val: this.discountAmount,
          tip_type: this.tipType,
          tip: this.tipValue,
          tip_val: this.tipAmount,
          notes: this.notes,
          store_id: storeId,
          cash_register_id: cashRegisterId,
          items: holdItems,
          taxes: {},
          tables_selected: this.selectedTables,
          contact: {},
          // Additional fields from old POS implementation
          avalara_bool: false,
          banType: true,
          discount_per_item: "NO",
          hold_invoice_id: null,
          invoice_date: currentDate,
          due_date: currentDate, // Set due date same as invoice date
          invoice_number: "-",
          invoice_pbx_modify: 0,
          invoice_template_id: 1,
          is_hold_invoice: false,
          is_invoice_pos: 1,
          is_pdf_pos: true,
          not_charge_automatically: false,
          package_bool: false,
          packages: [],
          print_pdf: false,
          save_as_draft: false,
          send_email: false,
          due_amount: this.total
        }

        logger.info('Hold invoice data prepared:', holdInvoice)
        return holdInvoice
      } catch (error) {
        logger.error('Failed to prepare hold invoice data:', error)
        throw error
      } finally {
        logger.endGroup()
      }
    }
  }
})
