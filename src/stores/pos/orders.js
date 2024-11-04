import { logger } from '../../utils/logger'

export const createOrdersModule = (state, posApi, posOperations) => {
  const fetchHoldInvoices = async () => {
    logger.startGroup('POS Store: Fetch Hold Invoices')
    state.loading.value.holdInvoices = true
    state.error.value = null
    
    try {
      const response = await posApi.holdInvoice.getAll()
      logger.debug('Hold invoices response:', response)

      if (response?.data?.hold_invoices?.data) {
        state.holdInvoices.value = response.data.hold_invoices.data
        logger.info(`Loaded ${state.holdInvoices.value.length} hold invoices`)
        return
      }

      logger.warn('Invalid hold invoices response format:', response)
      state.holdInvoices.value = []
    } catch (error) {
      logger.error('Failed to fetch hold invoices', error)
      state.error.value = error.message || 'Failed to fetch hold invoices'
      state.holdInvoices.value = []
    } finally {
      state.loading.value.holdInvoices = false
      logger.endGroup()
    }
  }

  const holdOrder = async (orderData) => {
    logger.startGroup('POS Store: Hold Order')
    state.loading.value.holdInvoices = true
    state.error.value = null
    
    try {
      logger.debug('Hold order request data:', orderData)

      const response = await posApi.holdInvoice.create(orderData)
      logger.debug('Hold order API response:', response)

      if (response.success || response.id) {
        logger.info('Order created successfully:', response)
        await fetchHoldInvoices()
        return { success: true, data: response }
      }

      const errorMessage = response.message || 'Failed to hold order'
      logger.error('Hold order failed:', {
        message: errorMessage,
        response
      })
      throw new Error(errorMessage)

    } catch (error) {
      logger.error('Hold order error:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      })

      state.error.value = error.message
      throw error
    } finally {
      state.loading.value.holdInvoices = false
      logger.endGroup()
    }
  }

  const updateHoldInvoice = async (id, orderData) => {
    logger.startGroup('POS Store: Update Hold Invoice')
    state.loading.value.updating = true
    state.error.value = null
    
    try {
      logger.debug('Update hold invoice request data:', { id, orderData })

      const response = await posOperations.updateHoldInvoice(id, orderData)
      logger.debug('Update hold invoice API response:', response)

      if (response.success) {
        logger.info('Hold invoice updated successfully:', response)
        await fetchHoldInvoices()
        return { success: true, data: response.data }
      }

      const errorMessage = response.message || 'Failed to update hold invoice'
      logger.error('Update hold invoice failed:', {
        message: errorMessage,
        response
      })
      throw new Error(errorMessage)

    } catch (error) {
      logger.error('Update hold invoice error:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      })

      state.error.value = error.message
      throw error
    } finally {
      state.loading.value.updating = false
      logger.endGroup()
    }
  }

  const deleteHoldInvoice = async (id) => {
    logger.startGroup('POS Store: Delete Hold Invoice')
    state.loading.value.holdInvoices = true
    state.error.value = null
    
    try {
      const response = await posApi.holdInvoice.delete(id)
      if (response.success) {
        state.holdInvoices.value = state.holdInvoices.value.filter(invoice => invoice.id !== id)
        return { success: true }
      } else {
        throw new Error(response.message || 'Failed to delete hold invoice')
      }
    } catch (error) {
      logger.error('Failed to delete hold invoice', error)
      state.error.value = error.message
      throw error
    } finally {
      state.loading.value.holdInvoices = false
      logger.endGroup()
    }
  }

  return {
    fetchHoldInvoices,
    holdOrder,
    updateHoldInvoice,
    deleteHoldInvoice
  }
}
