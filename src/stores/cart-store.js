import { defineStore } from 'pinia'
import { logger } from '../utils/logger'
import { useCompanyStore } from './company'

export const useCartStore = defineStore('cart', {
  state: () => ({
    items: [],
    discountType: 'fixed',
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
      return Number(state.discountValue) || 0
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
      return Number(state.tipValue) || 0
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
          ...product, // Keep all original product properties
          quantity,
          modifications,
          total: product.price * quantity,
          sub_total: product.price * quantity,
          discount_type: 'fixed',
          discount: 0,
          discount_val: 0,
          item_id: product.id // Required by API
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
        existingItem.total = existingItem.price * existingItem.quantity
        existingItem.sub_total = existingItem.total
        logger.info('Updated existing item quantity:', existingItem)
      } else {
        this.items.push({
          ...product, // Keep all original product properties
          quantity,
          modifications: [],
          total: product.price * quantity,
          sub_total: product.price * quantity,
          discount_type: 'fixed',
          discount: 0,
          discount_val: 0,
          item_id: product.id // Required by API
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
          item.total = item.price * quantity
          item.sub_total = item.total
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
      this.discountType = 'fixed'
      this.discountValue = 0
      this.tipType = 'fixed'
      this.tipValue = 0
      this.notes = ''
      this.selectedTables = []
    },

    prepareHoldInvoiceData(storeId, cashRegisterId, referenceNumber) {
      logger.startGroup('Cart Store: Prepare Hold Invoice Data')
      try {
        const companyStore = useCompanyStore()
        const currentCustomer = companyStore.currentCustomer

        if (!currentCustomer?.creator_id) {
          throw new Error('Creator ID not found in current customer')
        }

        // Get current date and due date (7 days from now)
        const currentDate = new Date().toISOString().split('T')[0]
        const dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

        // Prepare data according to API documentation structure
        const holdInvoice = {
          print_pdf: false,
          is_invoice_pos: 1,
          is_pdf_pos: true,
          avalara_bool: false,
          send_email: false,
          save_as_draft: false,
          not_charge_automatically: false,
          package_bool: false,
          invoice_date: currentDate,
          due_date: dueDate,
          invoice_number: "-",
          user_id: currentCustomer.creator_id,
          total: this.total,
          due_amount: this.total,
          sub_total: this.subtotal,
          tax: this.taxAmount,
          discount_type: this.discountType,
          discount: this.discountValue,
          discount_val: this.discountAmount,
          tip_type: this.tipType,
          tip: this.tipValue,
          tip_val: this.tipAmount,
          discount_per_item: "NO",
          items: this.items, // Using full item objects with all properties
          invoice_template_id: 1,
          banType: true,
          invoice_pbx_modify: 0,
          packages: [],
          cash_register_id: cashRegisterId,
          taxes: {},
          notes: this.notes,
          contact: {},
          description: referenceNumber,
          tables_selected: this.selectedTables,
          hold_invoice_id: null,
          is_hold_invoice: false,
          store_id: storeId
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
