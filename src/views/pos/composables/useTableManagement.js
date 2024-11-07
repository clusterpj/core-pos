import { ref, computed } from 'vue'
import { usePosOperations } from '../../../services/api/pos-operations'
import { usePosStore } from '../../../stores/pos-store'
import { useCompanyStore } from '../../../stores/company'
import { storeToRefs } from 'pinia'
import { logger } from '../../../utils/logger'
import { PaidStatus } from '../../../types/order'

export function useTableManagement() {
  const loading = ref(false)
  const error = ref(null)
  const posOperations = usePosOperations()
  const posStore = usePosStore()
  const companyStore = useCompanyStore()
  const { holdInvoices } = storeToRefs(posStore)
  const { selectedCashier, currentCashRegister } = storeToRefs(companyStore)

  /**
   * Get tables for the current cash register
   */
  const getTables = async () => {
    loading.value = true
    error.value = null

    try {
      // First check if we have a selected cashier
      const cashRegisterId = selectedCashier.value || localStorage.getItem('selectedCashier')
      
      if (!cashRegisterId) {
        throw new Error('No cashier selected')
      }

      // If the cashier isn't in the store but is in localStorage, set it
      if (!selectedCashier.value && cashRegisterId) {
        await companyStore.setSelectedCashier(Number(cashRegisterId))
      }

      const response = await posOperations.getTables(cashRegisterId)
      if (!response.success) {
        throw new Error('Failed to fetch tables')
      }

      // Map tables with their occupancy status
      const tables = response.data.map(table => ({
        ...table,
        is_occupied: isTableOccupied(table.id)
      }))

      return tables
    } catch (err) {
      error.value = err.message
      logger.error('Failed to get tables:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Check if a table is occupied by checking unpaid hold invoices
   * @param {number} tableId - Table ID to check
   * @returns {boolean} - True if table is occupied
   */
  const isTableOccupied = (tableId) => {
    if (!holdInvoices.value?.length) return false

    // Check if any unpaid hold invoice is using this table
    return holdInvoices.value.some(invoice => {
      // Check if the invoice has tables_selected and is unpaid
      if (invoice.paid_status === PaidStatus.UNPAID) {
        // First check tables_selected array
        if (invoice.tables_selected?.length > 0) {
          const tableFound = invoice.tables_selected.some(table => 
            table.table_id === tableId
          )
          if (tableFound) return true
        }
        
        // Then check hold_tables array
        if (invoice.hold_tables?.length > 0) {
          return invoice.hold_tables.some(holdTable => 
            holdTable.table_id === tableId
          )
        }
      }
      return false
    })
  }

  /**
   * Set table occupancy status in hold invoice
   * @param {number} tableId - Table ID to update
   * @param {boolean} occupied - Whether the table is occupied
   */
  const setTableOccupancy = (tableId, occupied) => {
    if (!holdInvoices.value?.length) return

    holdInvoices.value.forEach(invoice => {
      // Update tables_selected array
      if (invoice.tables_selected?.length > 0) {
        invoice.tables_selected.forEach(table => {
          if (table.table_id === tableId) {
            table.in_use = occupied ? 1 : 0
          }
        })
      }

      // Update hold_tables array
      if (invoice.hold_tables?.length > 0) {
        invoice.hold_tables.forEach(holdTable => {
          if (holdTable.table_id === tableId) {
            holdTable.in_use = occupied ? 1 : 0
          }
        })
      }
    })
  }

  /**
   * Update table status after payment by refreshing hold invoices
   * @param {Array} tables - Array of table IDs that were used in the paid order
   */
  const releaseTablesAfterPayment = async (tables) => {
    if (!tables || !tables.length) return

    loading.value = true
    error.value = null

    try {
      logger.info('Releasing tables after payment:', tables)
      
      // Update in_use status for each table
      tables.forEach(table => {
        setTableOccupancy(table.table_id || table.id, false)
      })

      // Refresh hold invoices to update table status
      await posStore.fetchHoldInvoices()

      // Verify tables were released
      const stillOccupied = tables.filter(table => 
        isTableOccupied(table.table_id || table.id)
      )
      if (stillOccupied.length > 0) {
        logger.warn('Some tables still appear occupied:', stillOccupied)
      }

      logger.info('Tables released successfully')
    } catch (err) {
      error.value = err.message
      logger.error('Failed to release tables:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    loading,
    error,
    getTables,
    isTableOccupied,
    setTableOccupancy,
    releaseTablesAfterPayment,
    selectedCashier,
    currentCashRegister
  }
}
