import { logger } from '../../../../../utils/logger'

// Validate invoice data before API call
export const validateInvoiceData = (data) => {
  logger.debug('Validating invoice data:', data)
  
  const requiredFields = [
    'invoice_number',
    'invoice_date',
    'due_date',
    'total',
    'sub_total',
    'items',
    'user_id'
  ]

  const missingFields = requiredFields.filter(field => !data[field])
  if (missingFields.length > 0) {
    throw new Error(`Missing required fields: ${missingFields.join(', ')}`)
  }

  if (!Array.isArray(data.items) || data.items.length === 0) {
    throw new Error('Invoice must have at least one item')
  }

  // Validate items
  data.items.forEach((item, index) => {
    if (!item.item_id || !item.name || !item.price || !item.quantity) {
      throw new Error(`Invalid item data at index ${index}`)
    }
  })

  logger.debug('Invoice data validation passed')
  return true
}

// Validate invoice for conversion
export const validateInvoiceForConversion = (invoice) => {
  if (!invoice?.id) {
    throw new Error('Invalid invoice: missing ID')
  }

  if (!Array.isArray(invoice.hold_items) || invoice.hold_items.length === 0) {
    throw new Error('No items found in hold invoice')
  }

  invoice.hold_items.forEach((item, index) => {
    if (!item.item_id || !item.name) {
      throw new Error(`Invalid item data at index ${index}: missing required fields`)
    }
  })

  return true
}
