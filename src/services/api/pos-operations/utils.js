import { logger } from '../../../utils/logger'
import { v4 as uuidv4 } from 'uuid'

/**
 * Validates a hold order structure and its data
 */
export const validateHoldOrder = (order) => {
  if (!order || !order.id) {
    throw new Error('Invalid hold order data')
  }
  if (order.status === 'inactive') {
    throw new Error('Hold order is not active')
  }
  if (!order.hold_items || !order.hold_items.length) {
    throw new Error('Hold order has no items')
  }
  // Validate total matches items
  const calculatedTotal = order.hold_items.reduce((sum, item) => {
    return sum + (Number(item.price) * Number(item.quantity))
  }, 0)
  if (calculatedTotal !== order.total) {
    throw new Error('Hold order total mismatch')
  }
}

/**
 * Generates a unique idempotency key for API requests
 */
export const generateIdempotencyKey = () => {
  return `pos_${Date.now()}_${uuidv4()}`
}

/**
 * Standardized API error handler
 */
export const handleApiError = (error) => {
  const errorResponse = {
    success: false,
    message: error.message,
    errors: {}
  }

  if (error.response) {
    switch (error.response.status) {
      case 400:
        errorResponse.message = 'Invalid request parameters'
        break
      case 401:
        errorResponse.message = 'Authentication required'
        break
      case 404:
        errorResponse.message = 'Resource not found'
        break
      case 422:
        errorResponse.message = 'Validation failed'
        errorResponse.errors = error.response.data.errors || {}
        break
      case 500:
        errorResponse.message = 'Internal server error'
        break
      default:
        errorResponse.message = 'An unexpected error occurred'
    }
    errorResponse.statusCode = error.response.status
  }

  logger.error('API Error:', {
    message: errorResponse.message,
    status: error.response?.status,
    errors: errorResponse.errors,
    originalError: error.message
  })

  throw errorResponse
}
