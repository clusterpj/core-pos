import { ref } from 'vue'

export const createPosState = () => {
  const loading = ref({
    categories: false,
    products: false,
    stores: false,
    cashiers: false,
    employees: false,
    itemOperation: false,
    holdInvoices: false,
    conversion: false,
    updating: false
  })
  const error = ref(null)
  const categories = ref([])
  const products = ref([])
  const selectedCategory = ref('all')
  const searchQuery = ref('')
  const currentPage = ref(1)
  const itemsPerPage = ref(20)
  const totalItems = ref(0)
  const stores = ref([])
  const cashiers = ref([])
  const employees = ref([])
  const holdInvoices = ref([])
  const activeOrderType = ref(null)
  const selectedTable = ref(null)
  const orderReference = ref('')
  const customerInfo = ref(null)
  const isTableMode = ref(false)

  return {
    loading,
    error,
    categories,
    products,
    selectedCategory,
    searchQuery,
    currentPage,
    itemsPerPage,
    totalItems,
    stores,
    cashiers,
    employees,
    holdInvoices,
    activeOrderType,
    selectedTable,
    orderReference,
    customerInfo,
    isTableMode
  }
}
