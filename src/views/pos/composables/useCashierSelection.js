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
      
      if (!companyStore.isConfigured) {
        showSelectionDialog.value = true
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
