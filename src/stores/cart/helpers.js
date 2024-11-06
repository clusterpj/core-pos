import { useCompanyStore } from '../company'
import { logger } from '../../utils/logger'

export const priceHelpers = {
  toCents: (amount) => Math.round(amount * 100),
  toDollars: (amount) => amount / 100,
  normalizePrice: (price) => price > 100 ? price / 100 : price
}

export const prepareItemsForApi = (items) => {
  const companyStore = useCompanyStore()
  
  return items.map(item => {
    const price = priceHelpers.normalizePrice(item.price)
    
    return {
      item_id: item.id,
      name: item.name,
      description: item.description || null,
      price: priceHelpers.toCents(price),
      quantity: item.quantity.toString(),
      unit_name: item.unit_name || null,
      discount: item.discount || "0.00",
      discount_val: item.discount_val || 0,
      tax: 0,
      total: priceHelpers.toCents(price * item.quantity),
      company_id: companyStore.company?.id || 1,
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
