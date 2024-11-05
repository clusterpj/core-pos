import { ORDER_TYPES } from '../../../composables/useOrderType'

// Format date for API (YYYY-MM-DD)
export const formatApiDate = (date) => {
  return date.toISOString().split('T')[0]
}

// Format date for display
export const formatDate = (date) => {
  return new Date(date).toLocaleDateString()
}

// Format currency
export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount)
}

// Convert decimal to cents (biginteger)
export const toCents = (amount) => {
  if (!amount) return 0
  return Math.round(parseFloat(amount) * 100)
}

// Get order type from invoice
export const getOrderType = (invoice) => {
  try {
    if (invoice.notes) {
      const orderInfo = JSON.parse(invoice.notes)
      return orderInfo.type || 'UNKNOWN'
    }
  } catch (err) {
    console.error('Failed to parse order type:', err)
  }
  return 'UNKNOWN'
}

// Get color for order type chip
export const getOrderTypeColor = (type) => {
  const colors = {
    [ORDER_TYPES.DINE_IN]: 'primary',
    [ORDER_TYPES.TO_GO]: 'success',
    [ORDER_TYPES.DELIVERY]: 'warning',
    [ORDER_TYPES.PICKUP]: 'info',
    'UNKNOWN': 'grey'
  }
  return colors[type] || 'grey'
}
