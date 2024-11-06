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
  // Handle null or undefined
  if (amount == null) return 0
  
  // Convert to number and handle potential string input
  const value = Number(amount)
  
  // Handle potential NaN
  if (isNaN(value)) return 0
  
  // If value is already in cents (> 100), return as is
  if (value > 100) return Math.round(value)
  
  // Convert to cents and round to avoid floating point issues
  return Math.round(value * 100)
}

// Convert cents to dollars
export const toDollars = (amount) => {
  // Handle null or undefined
  if (amount == null) return 0
  
  // Convert to number
  const value = Number(amount)
  
  // Handle potential NaN
  if (isNaN(value)) return 0
  
  // Convert to dollars
  return value / 100
}

// Get order type from invoice
export const getOrderType = (invoice) => {
  try {
    if (invoice.notes) {
      const notesObj = JSON.parse(invoice.notes)
      // Check both new and old structure
      return notesObj.orderInfo?.type || notesObj.type || 'UNKNOWN'
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
