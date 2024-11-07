import { useCompanyStore } from '../company'
import { logger } from '../../utils/logger'
import { prepareItemsForApi, getCurrentDate, getDueDate, priceHelpers } from './helpers'
import { OrderType } from '../../types/order'

export const invoiceActions = {
  prepareInvoiceData(state, getters, { storeId, cashRegisterId, referenceNumber }) {
    logger.startGroup('Cart Store: Prepare Invoice Data')
    try {
      const companyStore = useCompanyStore()
      const currentCustomer = companyStore.currentCustomer

      if (!currentCustomer?.creator_id) {
        throw new Error('Creator ID not found in current customer')
      }

      if (!storeId || !cashRegisterId) {
        logger.warn('Missing store or cashier ID:', { storeId, cashRegisterId })
      }

      const currentDate = getCurrentDate()
      const dueDate = getDueDate()
      const orderType = state.type || OrderType.DINE_IN // Use type directly from state with default

      // Format items with proper price conversions
      const items = state.items.map(item => {
        const itemPrice = priceHelpers.toCents(item.price > 100 ? item.price / 100 : item.price)
        const itemQuantity = parseInt(item.quantity)
        const itemTotal = itemPrice * itemQuantity

        return {
          item_id: Number(item.id),
          name: item.name,
          description: item.description || '',
          price: itemPrice,
          quantity: itemQuantity,
          unit_name: item.unit_name || 'units',
          sub_total: itemTotal,
          total: itemTotal,
          discount: "0",
          discount_val: 0,
          discount_type: "fixed",
          tax: priceHelpers.toCents(item.tax || 0),
          retention_amount: 0,
          retention_concept: null,
          retention_percentage: null,
          retentions_id: null
        }
      })

      const invoice = {
        print_pdf: false,
        is_invoice_pos: 1,
        is_pdf_pos: true,
        avalara_bool: false,
        send_email: false,
        save_as_draft: false,
        not_charge_automatically: false,
        package_bool: false,
        invoice_date: currentDate,
        due_date: dueDate,
        invoice_number: referenceNumber || "-",
        user_id: Number(currentCustomer.creator_id),
        total: priceHelpers.toCents(getters.total),
        due_amount: priceHelpers.toCents(getters.total),
        sub_total: priceHelpers.toCents(getters.subtotal),
        tax: priceHelpers.toCents(getters.taxAmount),
        discount_type: state.discountType,
        discount: state.discountValue.toString(),
        discount_val: priceHelpers.toCents(getters.discountAmount),
        discount_per_item: "NO",
        items: items,
        invoice_template_id: 1,
        banType: true,
        invoice_pbx_modify: 0,
        packages: [],
        cash_register_id: Number(cashRegisterId) || 1,
        store_id: Number(storeId) || 1,
        company_id: Number(companyStore.company?.id) || 1,
        taxes: {},
        notes: state.notes,
        contact: {},
        description: state.holdOrderDescription || referenceNumber,
        retention_total: 0,
        retention: "NO",
        status: "SENT",
        paid_status: "UNPAID",
        tax_per_item: "NO",
        late_fee_amount: 0,
        late_fee_taxes: 0,
        pbx_service_price: 0,
        sent: 0,
        viewed: 0,
        is_prepared_data: true,
        type: orderType // Add type directly to invoice data
      }

      if (state.holdInvoiceId) {
        invoice.hold_invoice_id = Number(state.holdInvoiceId)
        invoice.is_hold_invoice = true
      }

      if (orderType === OrderType.DINE_IN && state.selectedTables.length > 0) {
        invoice.tables_selected = state.selectedTables
      }

      logger.info('Invoice data prepared:', invoice)
      return invoice
    } catch (error) {
      logger.error('Failed to prepare invoice data:', error)
      throw error
    } finally {
      logger.endGroup()
    }
  },

  prepareHoldInvoiceData(state, getters, { storeId, cashRegisterId, referenceNumber }) {
    const data = this.prepareInvoiceData(state, getters, { storeId, cashRegisterId, referenceNumber })
    return {
      ...data,
      is_hold_invoice: true,
      hold_invoice_id: null
    }
  }
}
