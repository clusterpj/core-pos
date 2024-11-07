import { OrderType } from '../../../../../types/order'

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
  // Use the type field directly
  if (invoice.type && Object.values(OrderType).includes(invoice.type)) {
    return invoice.type
  }
  return OrderType.DINE_IN // Default to DINE IN if no type is set
}

// Get color for order type chip
export const getOrderTypeColor = (type) => {
  const colors = {
    [OrderType.DINE_IN]: 'primary',
    [OrderType.TO_GO]: 'success',
    [OrderType.DELIVERY]: 'warning',
    [OrderType.PICKUP]: 'info'
  }
  return colors[type] || 'grey'
}
