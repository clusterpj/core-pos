import { useCompanyStore } from '../company'
import { logger } from '../../utils/logger'

export const priceHelpers = {
  toCents: (amount) => {
    // Handle null or undefined
    if (amount == null) return 0
    // Convert to number and round to avoid floating point issues
    const value = Number(amount)
    return Math.round(value * 100)
  },
  toDollars: (amount) => {
    // Handle null or undefined
    if (amount == null) return 0
    // Convert to number and divide by 100
    return Number(amount) / 100
  },
  normalizePrice: (price) => {
    // Handle null or undefined
    if (price == null) return 0
    // Convert to number
    const value = Number(price)
    // If price is already in cents (> 100), convert to dollars
    return value > 100 ? value / 100 : value
  }
}

export const prepareItemsForApi = (items) => {
  const companyStore = useCompanyStore()
  
  return items.map(item => {
    // Normalize price to dollars first, then convert to cents
    const normalizedPrice = priceHelpers.normalizePrice(item.price)
    const itemPrice = priceHelpers.toCents(normalizedPrice)
    const itemQuantity = parseInt(item.quantity)
    const itemTotal = itemPrice * itemQuantity
    
    return {
      item_id: Number(item.id),
      name: item.name,
      description: item.description || null,
      price: itemPrice,
      quantity: itemQuantity,
      unit_name: item.unit_name || 'units',
      sub_total: itemTotal,
      total: itemTotal,
      discount: "0",
      discount_val: 0,
      discount_type: "fixed",
      tax: priceHelpers.toCents(item.tax || 0),
      company_id: Number(companyStore.company?.id) || 1,
      retention_amount: 0,
      retention_concept: 'NO_RETENTION',
      retention_percentage: 0
    }
  })
}

export const parseOrderType = (notes) => {
  let orderType = 'UNKNOWN'
  try {
    const notesObj = JSON.parse(notes)
    orderType = notesObj.orderInfo?.type || notesObj.type || 'UNKNOWN'
  } catch (e) {
    logger.warn('Failed to parse notes for order type')
  }
  return orderType
}

export const parseOrderNotes = (notes) => {
  try {
    const notesObj = JSON.parse(notes)
    return notesObj.customerNotes || ''
  } catch (e) {
    // If notes is a plain string, return it as is
    return typeof notes === 'string' ? notes : ''
  }
}

export const getCurrentDate = () => new Date().toISOString().split('T')[0]

export const getDueDate = (daysFromNow = 7) => {
  return new Date(Date.now() + daysFromNow * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0]
}
