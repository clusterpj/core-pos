import { posApi } from '../../../../../services/api/pos-api'
import { logger } from '../../../../../utils/logger'
import { formatApiDate, toCents } from './formatters'
import { validateInvoiceData, validateInvoiceForConversion } from './validators'

export const convertHeldOrderToInvoice = async (invoice) => {
  console.log('Starting conversion process for invoice:', {
    id: invoice?.id,
    description: invoice?.description,
    total: invoice?.total,
    items: invoice?.hold_items?.length
  })
  
  try {
    validateInvoiceForConversion(invoice)
    
    // 1. Get company settings
    console.log('Fetching company settings')
    const settings = await posApi.getCompanySettings()
    console.log('Company settings received:', settings)

    // Validate required settings
    if (!settings.invoice_auto_generate) {
      throw new Error('Invoice auto-generate setting is required but missing')
    }

    // Use default issuance period if not set
    const issuancePeriod = settings.invoice_issuance_period || '7'

    // 2. Get next invoice number if auto-generate is enabled
    let invoiceNumber
    if (settings.invoice_auto_generate === 'YES') {
      console.log('Getting next invoice number')
      const nextNumberResponse = await posApi.invoice.getNextNumber()
      console.log('Next number response:', nextNumberResponse)

      if (!nextNumberResponse?.invoice_number) {
        throw new Error('Failed to get next invoice number')
      }
      // Add hyphen between prefix and number
      invoiceNumber = `${nextNumberResponse.prefix}-${nextNumberResponse.nextNumber}`
    } else {
      throw new Error('Manual invoice number entry is not supported')
    }

    // Calculate dates
    const currentDate = new Date()
    const dueDate = new Date(currentDate)
    dueDate.setDate(dueDate.getDate() + parseInt(issuancePeriod))

    // Parse table data from notes
    let tableData = {}
    try {
      if (invoice.notes) {
        tableData = JSON.parse(invoice.notes)
      }
    } catch (err) {
      console.error('Failed to parse table data from notes:', err)
    }

    // Format items according to API requirements
    console.log('Formatting items data')
    const formattedItems = invoice.hold_items.map(item => {
      const itemPrice = toCents(item.price)
      const itemQuantity = parseInt(item.quantity)
      const itemTotal = itemPrice * itemQuantity

      return {
        item_id: item.item_id,
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
        tax: toCents(item.tax || 0),
        retention_amount: 0,
        retention_concept: null,
        retention_percentage: null,
        retentions_id: null
      }
    })

    // 3. Prepare invoice data according to API requirements
    console.log('Preparing invoice data')
    const invoiceData = {
      // Required boolean flags
      avalara_bool: false,
      banType: true,
      package_bool: false,
      print_pdf: false,
      save_as_draft: false,
      send_email: false,
      not_charge_automatically: false,
      is_hold_invoice: true,
      is_invoice_pos: 1,
      is_pdf_pos: settings.pdf_format_pos === '1',

      // IDs and references
      invoice_number: invoiceNumber,
      invoice_template_id: 1,
      invoice_pbx_modify: 0,
      hold_invoice_id: invoice.id,
      store_id: invoice.store_id,
      cash_register_id: invoice.cash_register_id,
      user_id: invoice.user_id,

      // Dates
      invoice_date: formatApiDate(currentDate),
      due_date: formatApiDate(dueDate),

      // Amounts
      sub_total: toCents(invoice.sub_total),
      total: toCents(invoice.total),
      due_amount: toCents(invoice.total),
      tax: toCents(invoice.tax || 0),
      
      // Discount
      discount: invoice.discount || "0",
      discount_type: invoice.discount_type || "fixed",
      discount_val: toCents(invoice.discount_val || 0),
      discount_per_item: settings.discount_per_item || "NO",

      // Tip
      tip: invoice.tip || "0",
      tip_type: invoice.tip_type || "fixed",
      tip_val: toCents(invoice.tip_val || 0),

      // Arrays
      items: formattedItems,
      taxes: invoice.taxes || [],
      packages: [],
      tables_selected: tableData.tables || [],

      // Optional fields
      notes: '',
      description: invoice.description || `Order #${invoice.id}`
    }

    // Validate invoice data before sending
    validateInvoiceData(invoiceData)

    console.log('Creating invoice with data:', invoiceData)

    // 4. Create the invoice
    const invoiceResponse = await posApi.invoice.create(invoiceData)
    console.log('Invoice creation response:', invoiceResponse)
    
    if (!invoiceResponse?.invoice?.id) {
      throw new Error('Failed to create invoice: Invalid response')
    }

    // 5. Get created invoice details
    console.log('Fetching created invoice details')
    const createdInvoice = await posApi.invoice.getById(invoiceResponse.invoice.id)
    if (!createdInvoice) {
      throw new Error('Failed to fetch created invoice details')
    }
    console.log('Created invoice details:', createdInvoice)

    logger.info('Order converted to invoice successfully:', createdInvoice.id)
    return {
      success: true,
      invoice: createdInvoice
    }
  } catch (error) {
    console.error('Failed to convert order to invoice:', error)
    logger.error('Failed to convert order to invoice:', error)
    window.toastr?.['error'](error.message || 'Failed to convert order to invoice')
    return {
      success: false,
      error: error.message
    }
  }
}
