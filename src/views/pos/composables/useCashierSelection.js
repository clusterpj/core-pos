import { ref, computed } from 'vue'
import { useCompanyStore } from '../../../stores/company'
import { logger } from '../../../utils/logger'

export function useCashierSelection() {
  const companyStore = useCompanyStore()
  const showSelectionDialog = ref(false)
  const selectedCashier = ref(null)
  const cashierError = ref('')

  const isReadyToContinue = computed(() => {
    return companyStore.isConfigured && 
           !companyStore.loadingStores && 
           !companyStore.loading &&
           !companyStore.storeError
  })

  const handleCashierChange = async (cashierId) => {
    if (!cashierId) return
    
    try {
      cashierError.value = ''
      await companyStore.setSelectedCashier(cashierId)
      
      if (!companyStore.isConfigured) {
        cashierError.value = 'Selected cashier has incomplete configuration'
        return
      }
    } catch (err) {
      cashierError.value = err.message
      logger.error('Failed to set cashier:', err)
      throw err
    }
  }

  const initializeSelection = async () => {
    try {
      await companyStore.initializeStore()
      
      // Check if we have a stored cashier
      const storedCashier = localStorage.getItem('selectedCashier')
      
      // Only show dialog if no cashier is stored
      if (!storedCashier) {
        showSelectionDialog.value = true
        logger.info('Showing cashier selection dialog: No stored cashier')
        return
      }

      // Try to restore the stored cashier
      try {
        await companyStore.setSelectedCashier(Number(storedCashier))
        logger.info('Restored stored cashier:', storedCashier)
        // Don't show dialog if restoration succeeds
        showSelectionDialog.value = false
      } catch (err) {
        // Only show dialog if restoring fails
        showSelectionDialog.value = true
        logger.warn('Failed to restore stored cashier, showing dialog:', err)
      }
    } catch (err) {
      logger.error('Failed to initialize cashier selection:', err)
      throw err
    }
  }

  return {
    showSelectionDialog,
    selectedCashier,
    cashierError,
    isReadyToContinue,
    handleCashierChange,
    initializeSelection
  }
}
