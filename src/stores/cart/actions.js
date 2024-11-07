import { logger } from '../../utils/logger'
import { priceHelpers } from './helpers'

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
  }
}
