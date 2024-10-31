// src/views/pos/composables/useTableAssignment.js
import { ref } from 'vue'
import { useCompanyStore } from '@/stores/company'
import { posOperations } from '@/services/api/pos-operations'
import { logger } from '@/utils/logger'

export function useTableAssignment() {
  const companyStore = useCompanyStore()
  const selectedTable = ref(null)
  const tables = ref([])
  const loading = ref(false)
  const assigning = ref(false)

  const loadTables = async () => {
    if (!companyStore.selectedCashier) return
    
    loading.value = true
    try {
      const response = await posOperations.getTables(companyStore.selectedCashier)
      tables.value = response || []
      logger.info('Tables loaded:', tables.value)
    } catch (error) {
      logger.error('Failed to load tables:', error)
      throw error
    } finally {
      loading.value = false
    }
  }

  const assignTable = async () => {
    if (!selectedTable.value) return
    
    assigning.value = true
    try {
      await posOperations.assignTable({
        table_id: selectedTable.value,
        cash_register_id: companyStore.selectedCashier
      })
      logger.info('Table assigned successfully:', selectedTable.value)
    } catch (error) {
      logger.error('Failed to assign table:', error)
      throw error
    } finally {
      assigning.value = false
    }
  }

  return {
    selectedTable,
    tables,
    loading,
    assigning,
    loadTables,
    assignTable
  }
}
