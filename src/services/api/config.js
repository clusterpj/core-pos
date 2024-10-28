const environment = import.meta.env.MODE
const isProd = environment === 'production'

export const apiConfig = {
  baseURL: isProd ? 'https://yukikaze/api' : 'http://localhost/api',
  version: 'v1',
  timeout: 30000,
  endpoints: {
    auth: {
      login: 'auth/login',
      logout: 'auth/logout',
      me: 'me'
    },
    dashboard: {
      todaySales: 'dashboard/today-sales',
      ordersCount: 'dashboard/orders-count',
      activeCustomers: 'dashboard/active-customers',
      productsCount: 'dashboard/products-count',
      salesChart: 'dashboard/sales-chart',
      topProducts: 'dashboard/top-products'
    },
    users: 'users',
    customers: 'customers',
    pos: {
      items: 'items',
      categories: 'core-pos/get-item-categories',
      cashRegisters: 'core-pos/cash-register/getCashRegistersUser',
      cashHistory: 'core-pos/cash-history',
      holdInvoices: 'core-pos/hold-invoices',
      tables: 'core-pos/table-cash-register',
      store: 'store',
      employees: 'users',
      cashiers: 'core-pos/cash-register/getCashRegistersUser'
    }
  }
}

/**
 * Formats an endpoint path to include the API version
 * @param {string} endpoint - The endpoint path
 * @returns {string} The formatted endpoint URL
 */
export function getEndpointUrl(endpoint) {
  return `/${apiConfig.version}/${endpoint.replace(/^\/+|\/+$/g, '')}`
}

/**
 * Gets the endpoint path from the configuration
 * @param {string} endpointPath - Dot notation path to the endpoint (e.g., 'pos.items')
 * @returns {string} The endpoint path
 */
export function getApiEndpoint(endpointPath) {
  const parts = endpointPath.split('.')
  let config = {...apiConfig.endpoints}
  
  let current = config
  for (const part of parts) {
    if (!current[part]) {
      return endpointPath
    }
    current = current[part]
  }
  
  return current
}

export default apiConfig