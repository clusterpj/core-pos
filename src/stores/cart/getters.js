import { OrderType } from '../../types/order'

export const getters = {
  subtotal: (state) => {
    return state.items.reduce((sum, item) => {
      const price = item.price > 100 ? item.price / 100 : item.price
      const itemTotal = price * item.quantity
      return sum + itemTotal
    }, 0)
  },

  discountAmount: (state) => {
    if (state.discountType === '%') {
      return Math.round(state.items.reduce((sum, item) => {
        const price = item.price > 100 ? item.price / 100 : item.price
        return sum + (price * item.quantity)
      }, 0) * (state.discountValue / 100))
    }
    return Number(state.discountValue) || 0
  },

  taxableAmount: (state) => {
    const subtotal = state.items.reduce((sum, item) => {
      const price = item.price > 100 ? item.price / 100 : item.price
      return sum + (price * item.quantity)
    }, 0)
    
    const discount = state.discountType === '%' 
      ? Math.round(subtotal * (state.discountValue / 100))
      : Number(state.discountValue) || 0
    
    return subtotal - discount
  },

  taxAmount: (state) => {
    const taxableAmount = state.items.reduce((sum, item) => {
      const price = item.price > 100 ? item.price / 100 : item.price
      return sum + (price * item.quantity)
    }, 0) - (state.discountType === '%' 
      ? Math.round(state.items.reduce((sum, item) => {
          const price = item.price > 100 ? item.price / 100 : item.price
          return sum + (price * item.quantity)
        }, 0) * (state.discountValue / 100))
      : Number(state.discountValue) || 0)
    
    return Math.round(taxableAmount * state.taxRate * 100) / 100
  },

  total: (state) => {
    const subtotal = state.items.reduce((sum, item) => {
      const price = item.price > 100 ? item.price / 100 : item.price
      return sum + (price * item.quantity)
    }, 0)
    
    const discount = state.discountType === '%' 
      ? Math.round(subtotal * (state.discountValue / 100))
      : Number(state.discountValue) || 0
    
    const taxableAmount = subtotal - discount
    const taxAmount = Math.round(taxableAmount * state.taxRate * 100) / 100
    
    return Math.round((taxableAmount + taxAmount) * 100) / 100
  },

  itemCount: (state) => {
    return state.items.reduce((sum, item) => sum + item.quantity, 0)
  },

  isEmpty: (state) => {
    return state.items.length === 0
  },

  isHoldOrder: (state) => {
    return state.holdInvoiceId !== null
  },

  orderType: (state) => {
    return state.type || null
  },

  isValidOrderType: (state) => {
    return state.type && Object.values(OrderType).includes(state.type)
  },

  isEditingInvoice: (state) => {
    return state.editingInvoiceId !== null
  },

  canUpdateInvoice: (state) => {
    return state.editingInvoiceId !== null && 
           ['DRAFT', 'SENT'].includes(state.editingInvoiceStatus)
  }
}
