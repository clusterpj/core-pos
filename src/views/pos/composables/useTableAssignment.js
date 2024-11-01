import { ref, computed } from 'vue'
import { useCompanyStore } from '@/stores/company'
import { posOperations } from '@/services/api/pos-operations'
import { logger } from '@/utils/logger'

export function useTableAssignment() {
  const companyStore = useCompanyStore()
  const tables = ref([])
  const selectedTables = ref([])
  const loading = ref(false)

  const loadTables = async () => {
    if (!companyStore.selectedCashier) return
    
    loading.value = true
    try {
      const response = await posOperations.getTables(companyStore.selectedCashier)
      if (response?.data) {
        tables.value = response.data
      }
      logger.info('Tables loaded:', tables.value)
    } catch (error) {
      logger.error('Failed to load tables:', error)
      throw error
    } finally {
      loading.value = false
    }
  }

  const addTable = (tableId, quantity = 1) => {
    const existingIndex = selectedTables.value.findIndex(t => t.table_id === tableId)
    if (existingIndex >= 0) {
      // Update quantity if table already selected
      selectedTables.value[existingIndex].quantity = quantity
    } else {
      // Add new table selection
      selectedTables.value.push({
        table_id: tableId,
        quantity: quantity
      })
    }
    logger.info('Table added/updated:', { tableId, quantity })
  }

  const removeTable = (tableId) => {
    selectedTables.value = selectedTables.value.filter(t => t.table_id !== tableId)
    logger.info('Table removed:', tableId)
  }

  const updateTableQuantity = (tableId, quantity) => {
    const table = selectedTables.value.find(t => t.table_id === tableId)
    if (table) {
      table.quantity = quantity
      logger.info('Table quantity updated:', { tableId, quantity })
    }
  }

  const clearTableSelection = () => {
    selectedTables.value = []
    logger.info('Table selection cleared')
  }

  const getSelectedTablesForApi = () => {
    return selectedTables.value.map(table => ({
      table_id: table.table_id,
      quantity: table.quantity
    }))
  }

  // Computed property to get table details including names
  const selectedTablesWithDetails = computed(() => {
    return selectedTables.value.map(selected => {
      const tableInfo = tables.value.find(t => t.id === selected.table_id)
      return {
        ...selected,
        name: tableInfo?.name || `Table ${selected.table_id}`
      }
    })
  })

  return {
    tables,
    selectedTables: selectedTablesWithDetails,
    loading,
    loadTables,
    addTable,
    removeTable,
    updateTableQuantity,
    clearTableSelection,
    getSelectedTablesForApi
  }
}
