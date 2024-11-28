import { useCompanyStore } from '../company'
import { logger } from '../../utils/logger'

import { PriceUtils } from '@/utils/price'

export const priceHelpers = {
  toCents: (amount) => PriceUtils.toCents(amount),
  toDollars: (amount) => Number(PriceUtils.toDollars(amount)),
  normalizePrice: (price) => Number(PriceUtils.toDollars(price))
}

export const prepareItemsForApi = (items) => {
  const companyStore = useCompanyStore()
  
  return items.map(item => {
    const itemPrice = PriceUtils.toCents(item.price)
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
      tax: PriceUtils.toCents(item.tax || 0),
      company_id: Number(companyStore.company?.id) || 1,
      retention_amount: 0,
      retention_concept: 'NO_RETENTION',
      retention_percentage: 0
    }
  })
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
