import { logger } from '../../utils/logger'
import { priceHelpers } from './helpers'
import { posApi } from '../../services/api/pos-api'
import { useCompanyStore } from '../company'

export const actions = {
  addItem(state, product, quantity = 1) {
    logger.info('Adding item to cart:', { product, quantity })
    
    const price = priceHelpers.normalizePrice(product.price)
    
    const existingItem = state.items.find(item => item.id === product.id)
    
    if (existingItem) {
      existingItem.quantity += quantity
      existingItem.total = existingItem.price * existingItem.quantity
      existingItem.sub_total = existingItem.total
      logger.info('Updated existing item quantity:', existingItem)
    } else {
      state.items.push({
        ...product,
        price,
        quantity,
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

  updateItemQuantity(state, { itemId, quantity, index = null }) {
    logger.info('Updating item quantity:', { itemId, quantity, index })
    
    let item
    if (index !== null) {
      item = state.items[index]
    } else {
      item = state.items.find(item => item.id === itemId)
    }

    if (item) {
      if (quantity > 0) {
        item.quantity = quantity
        item.total = item.price * quantity
        item.sub_total = item.total
      } else {
        this.removeItem(state, { itemId, index })
      }
    }
  },

  splitItem(state, index, splitQuantity) {
    logger.info('Splitting item:', { index, splitQuantity })
    
    const originalItem = state.items[index]
    if (!originalItem || splitQuantity >= originalItem.quantity) {
      logger.error('Invalid split operation:', { originalItem, splitQuantity })
      return
    }

    // Calculate remaining quantity for original item
    const remainingQuantity = originalItem.quantity - splitQuantity

    // Update original item quantity
    originalItem.quantity = remainingQuantity
    originalItem.total = originalItem.price * remainingQuantity
    originalItem.sub_total = originalItem.total

    // Create new item with split quantity
    const newItem = {
      ...originalItem,
      quantity: splitQuantity,
      total: originalItem.price * splitQuantity,
      sub_total: originalItem.price * splitQuantity
    }

    // Insert new item after the original item
    state.items.splice(index + 1, 0, newItem)
    
    logger.info('Split completed:', { 
      originalItem: state.items[index],
      newItem: state.items[index + 1]
    })
  },

  removeItem(state, { itemId, index = null }) {
    logger.info('Removing item from cart:', { itemId, index })
    if (index !== null) {
      state.items.splice(index, 1)
    } else {
      state.items = state.items.filter(item => item.id !== itemId)
    }
  },

  setDiscount(state, { type, value }) {
    logger.info('Setting discount:', { type, value })
    state.discountType = type
    state.discountValue = value
  },

  setNotes(state, notes) {
    state.notes = notes
  },

  setType(state, type) {
    logger.info('Setting order type:', type)
    state.type = type
  },

  setSelectedTables(state, tables) {
    state.selectedTables = tables
  },

  setHoldInvoiceId(state, id) {
    logger.info('Setting hold invoice ID:', id)
    state.holdInvoiceId = id
    if (!id) {
      state.holdOrderDescription = null
    }
  },

  setHoldOrderDescription(state, description) {
    logger.info('Setting hold order description:', description)
    state.holdOrderDescription = description
  },

  clearCart(state) {
    logger.info('Clearing cart')
    state.items = []
    state.discountType = 'fixed'
    state.discountValue = 0
    state.notes = ''
    state.selectedTables = []
    state.holdInvoiceId = null
    state.holdOrderDescription = null
    state.type = null // Clear type when clearing cart
  },

  loadInvoice(state, invoice) {
    logger.startGroup('Cart Store: Loading Invoice')
    try {
      // Clear existing cart first
      this.clearCart(state)
        
      // Set editing invoice details
      state.editingInvoiceId = invoice.id
      state.editingInvoiceNumber = invoice.invoice_number
      state.editingInvoiceStatus = invoice.status

      // Load items
      state.items = invoice.items.map(item => ({
        id: item.item_id,
        name: item.name,
        description: item.description || '',
        price: priceHelpers.toDollars(item.price),
        quantity: item.quantity,
        unit_name: item.unit_name || 'units',
        tax: priceHelpers.toDollars(item.tax || 0),
        total: priceHelpers.toDollars(item.total || 0),
        sub_total: priceHelpers.toDollars(item.sub_total || 0)
      }))

      // Set other invoice properties
      state.notes = invoice.notes || ''
      state.type = invoice.type || null
      state.discountType = invoice.discount_type || 'fixed'
      state.discountValue = invoice.discount_val ? priceHelpers.toDollars(invoice.discount_val) : 0

      logger.info('Invoice loaded into cart:', {
        itemCount: state.items.length,
        type: state.type,
        discount: { type: state.discountType, value: state.discountValue }
      })
    } catch (error) {
      logger.error('Failed to load invoice into cart:', error)
      throw error
    } finally {
      logger.endGroup()
    }
  },

  async updateInvoice(state) {
    logger.startGroup('Cart Store: Updating Invoice')
    const companyStore = useCompanyStore()
    try {
      if (!state.editingInvoiceId) {
        throw new Error('No invoice being edited')
      }

      // Get current date and due date
      const currentDate = new Date()
      const dueDate = new Date(currentDate)
      dueDate.setDate(dueDate.getDate() + 7)

      // Prepare invoice data with all required fields
      const invoiceData = {
        // Basic invoice info
        invoice_number: state.editingInvoiceNumber,
        invoice_date: currentDate.toISOString().split('T')[0],
        due_date: dueDate.toISOString().split('T')[0],
        
        // Amounts (convert to cents)
        sub_total: Math.round(Number(state.items.reduce((sum, item) => sum + (item.price * item.quantity), 0) * 100)),
        total: Math.round(Number(this.total * 100)),
        tax: Math.round(Number(this.taxAmount * 100)),
        due_amount: Math.round(Number(this.total * 100)),
        
        // Items with proper formatting
        items: state.items.map(item => ({
          item_id: Number(item.id),
          name: item.name,
          description: item.description || '',
          price: Math.round(Number(item.price * 100)),
          quantity: Math.round(Number(item.quantity)),
          unit_name: item.unit_name || 'units',
          sub_total: Math.round(Number(item.price * item.quantity * 100)),
          total: Math.round(Number(item.total * 100)),
          tax: Math.round(Number(item.tax * 100)),
          discount: "0",
          discount_val: 0,
          discount_type: "fixed",
          retention_amount: 0,
          retention_concept: null,
          retention_percentage: null,
          retentions_id: null
        })),

        // Status and type
        status: state.editingInvoiceStatus || 'DRAFT',
        type: state.type,
        
        // Discount - ensure all discount fields are properly set
        discount_type: state.discountType || 'fixed',
        discount: (state.discountValue || 0).toString(),
        discount_val: Math.round(Number(state.discountValue || 0) * 100),
        discount_per_item: "NO",

        // Additional required fields
        notes: state.notes || '',
        is_invoice_pos: 1,
        is_pdf_pos: true,
        avalara_bool: false,
        banType: true,
        package_bool: false,
        print_pdf: false,
        save_as_draft: false,
        send_email: false,
        not_charge_automatically: false,
        is_edited: 1,
        
        // Required IDs
        user_id: companyStore.selectedCustomer?.id || 1,
        store_id: companyStore.selectedStore?.id || 1,
        cash_register_id: companyStore.selectedCashier?.id || 1,
        company_id: companyStore.company?.id || 1,
        invoice_template_id: 1,
        invoice_pbx_modify: 0,
        
        // Required arrays
        tables_selected: [],
        packages: [],
        taxes: [],

        // Additional required fields
        tip: "0",
        tip_type: "fixed", 
        tip_val: 0,
        retention: "NO",
        retention_total: 0,
        late_fee_amount: 0,
        late_fee_taxes: 0,
        pbx_service_price: 0,
        sent: 0,
        viewed: 0,
        
        // Ensure these required fields are set
        tax_per_item: "NO",
        retention_active: "NO",
        retention_percentage: 0,
        retention_concept: null,
        retention_amount: 0,
        package_bool: 0,
        save_as_draft: 0,
        not_charge_automatically: 0
      }

      logger.debug('Updating invoice with data:', invoiceData)

      try {
        // Call API to update invoice
        const response = await posApi.invoice.update(state.editingInvoiceId, invoiceData)
        
        if (!response?.success) {
          throw new Error(response?.message || 'Failed to update invoice')
        }

        // Clear editing state after successful update
        state.editingInvoiceId = null
        state.editingInvoiceNumber = null
        state.editingInvoiceStatus = null

        // Show success message
        window.toastr?.success('Invoice updated successfully')

        return response
      } catch (error) {
        // Show error message
        window.toastr?.error(error.message || 'Failed to update invoice')
        throw error
      }
    } catch (error) {
      logger.error('Failed to update invoice:', error)
      throw error
    } finally {
      logger.endGroup()
    }
  }
}
