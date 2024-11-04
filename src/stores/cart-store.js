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
    holdInvoiceId: null,
    holdOrderDescription: null
  }),

  getters: {
    subtotal: (state) => {
      return state.items.reduce((sum, item) => {
        // Convert price to dollars if it's in cents
        const price = item.price > 100 ? item.price / 100 : item.price
        const itemTotal = price * item.quantity
        return sum + itemTotal
      }, 0)
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
      return Math.round(state.taxableAmount * state.taxRate * 100) / 100
    },

    total: (state) => {
      return Math.round((state.taxableAmount + state.taxAmount) * 100) / 100
    },

    itemCount: (state) => {
      return state.items.reduce((sum, item) => sum + item.quantity, 0)
    },

    isEmpty: (state) => {
      return state.items.length === 0
    },

    isHoldOrder: (state) => {
      return state.holdInvoiceId !== null
    }
  },

  actions: {
    addItem(product, quantity = 1, modifications = []) {
      logger.info('Adding item to cart:', { product, quantity, modifications })
      
      // Convert price to dollars if it's in cents
      const price = product.price > 100 ? product.price / 100 : product.price
      
      // When adding a new item with modifications, always create a new entry
      if (modifications && modifications.length > 0) {
        this.items.push({
          ...product,
          price,
          quantity,
          modifications,
          total: price * quantity,
          sub_total: price * quantity,
          discount_type: 'fixed',
          discount: 0,
          discount_val: 0,
          item_id: product.id
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
          ...product,
          price,
          quantity,
          modifications: [],
          total: price * quantity,
          sub_total: price * quantity,
          discount_type: 'fixed',
          discount: 0,
          discount_val: 0,
          item_id: product.id
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

    setNotes(notes) {
      this.notes = notes
    },

    setSelectedTables(tables) {
      this.selectedTables = tables
    },

    setHoldInvoiceId(id) {
      logger.info('Setting hold invoice ID:', id)
      this.holdInvoiceId = id
      if (!id) {
        this.holdOrderDescription = null
      }
    },

    setHoldOrderDescription(description) {
      logger.info('Setting hold order description:', description)
      this.holdOrderDescription = description
    },

    clearCart() {
      logger.info('Clearing cart')
      this.items = []
      this.discountType = 'fixed'
      this.discountValue = 0
      this.notes = ''
      this.selectedTables = []
      this.holdInvoiceId = null
      this.holdOrderDescription = null
    },

    // Convert dollar amount to cents
    toCents(amount) {
      return Math.round(amount * 100)
    },

    // Convert cents to dollars
    toDollars(amount) {
      return amount / 100
    },

    // New helper method to prepare items for API
    prepareItemsForApi() {
      const companyStore = useCompanyStore()
      return this.items.map(item => {
        // Convert price to dollars if it's in cents
        const price = item.price > 100 ? item.price / 100 : item.price
        return {
          item_id: item.id,
          name: item.name,
          description: item.description || null,
          price: this.toCents(price), // Convert to cents for API
          quantity: item.quantity.toString(), // API expects string
          unit_name: item.unit_name || null,
          discount: item.discount || "0.00",
          discount_val: item.discount_val || 0,
          tax: 0, // Tax is calculated at invoice level
          total: this.toCents(price * item.quantity), // Convert to cents for API
          company_id: companyStore.company?.id || 1,
          modifications: item.modifications || [],
          retention_amount: 0,
          retention_concept: 'NO_RETENTION',
          retention_percentage: 0
        }
      })
    },

    prepareInvoiceData(storeId, cashRegisterId, referenceNumber) {
      logger.startGroup('Cart Store: Prepare Invoice Data')
      try {
        const companyStore = useCompanyStore()
        const currentCustomer = companyStore.currentCustomer

        if (!currentCustomer?.creator_id) {
          throw new Error('Creator ID not found in current customer')
        }

        if (!storeId || !cashRegisterId) {
          logger.warn('Missing store or cashier ID:', { storeId, cashRegisterId })
        }

        // Get current date and due date (7 days from now)
        const currentDate = new Date().toISOString().split('T')[0]
        const dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

        // Parse notes to determine order type
        let orderType = 'UNKNOWN'
        try {
          const notesObj = JSON.parse(this.notes)
          orderType = notesObj.type || 'UNKNOWN'
        } catch (e) {
          logger.warn('Failed to parse notes for order type')
        }

        const invoice = {
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
          total: this.toCents(this.total), // Convert to cents for API
          due_amount: this.toCents(this.total), // Convert to cents for API
          sub_total: this.toCents(this.subtotal), // Convert to cents for API
          tax: this.toCents(this.taxAmount), // Convert to cents for API
          discount_type: this.discountType,
          discount: this.discountValue.toString(),
          discount_val: this.toCents(this.discountAmount), // Convert to cents for API
          discount_per_item: "NO",
          items: this.prepareItemsForApi(),
          invoice_template_id: 1,
          banType: true,
          invoice_pbx_modify: 0,
          packages: [],
          cash_register_id: cashRegisterId || 1,
          store_id: storeId || 1,
          company_id: companyStore.company?.id || 1,
          taxes: {},
          notes: this.notes,
          contact: {},
          description: this.holdOrderDescription || referenceNumber,
          retention_total: 0,
          retention: "NO",
          status: "SENT",
          paid_status: "UNPAID",
          tax_per_item: "NO",
          late_fee_amount: 0,
          late_fee_taxes: 0,
          pbx_service_price: 0,
          sent: 0,
          viewed: 0
        }

        // If this is a hold order being converted to invoice
        if (this.holdInvoiceId) {
          invoice.hold_invoice_id = this.holdInvoiceId
          invoice.is_hold_invoice = true
        }

        // Only include tables_selected for DINE_IN orders
        if (orderType === 'DINE_IN' && this.selectedTables.length > 0) {
          invoice.tables_selected = this.selectedTables
        }

        logger.info('Invoice data prepared:', invoice)
        return invoice
      } catch (error) {
        logger.error('Failed to prepare invoice data:', error)
        throw error
      } finally {
        logger.endGroup()
      }
    },

    prepareHoldInvoiceData(storeId, cashRegisterId, referenceNumber) {
      const data = this.prepareInvoiceData(storeId, cashRegisterId, referenceNumber)
      return {
        ...data,
        is_hold_invoice: true,
        hold_invoice_id: null
      }
    }
  }
})
