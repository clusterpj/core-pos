/**
 * Comprehensive utility for price handling
 * All prices are managed in cents internally
 */
export const PriceUtils = {
  /**
   * Normalize price input to ensure consistent internal representation
   * @param {number|string} price - Price in dollars or cents
   * @returns {number} Price in cents
   */
  normalize(price) {
    if (price == null) return 0
    const value = Number(price)
    
    // If price is already in cents (> 100), return as is
    if (value > 100) return Math.round(value)
    
    // Convert dollars to cents
    return Math.round(value * 100)
  },

  /**
   * Convert cents to dollars for display
   * @param {number} cents - Price in cents
   * @returns {string} Formatted price in dollars
   */
  toDollars(cents) {
    if (cents == null) return '0.00'
    const value = Number(cents)
    
    // Handle NaN and invalid inputs
    if (isNaN(value)) return '0.00'
    
    return (value / 100).toFixed(2)
  },

  /**
   * Convert dollars to cents
   * @param {number|string} dollars - Price in dollars
   * @returns {number} Price in cents
   */
  toCents(dollars) {
    if (dollars == null) return 0
    const value = Number(dollars)
    
    // Handle NaN and invalid inputs
    if (isNaN(value)) return 0
    
    return Math.round(value * 100)
  },

  /**
   * Format price for display with currency symbol
   * @param {number} cents - Price in cents
   * @returns {string} Formatted price with $ symbol
   */
  format(cents) {
    return `$${this.toDollars(cents)}`
  },

  /**
   * Calculate total price with tax
   * @param {number} subtotal - Subtotal in cents
   * @param {number} taxRate - Tax rate as decimal
   * @returns {number} Total price in cents
   */
  calculateTotal(subtotal, taxRate) {
    const taxAmount = Math.round(subtotal * taxRate)
    return subtotal + taxAmount
  },

  /**
   * Compare two prices
   * @param {number} price1 - First price in cents
   * @param {number} price2 - Second price in cents
   * @returns {number} Difference between prices in cents
   */
  compare(price1, price2) {
    const normalizedPrice1 = this.normalize(price1)
    const normalizedPrice2 = this.normalize(price2)
    return normalizedPrice1 - normalizedPrice2
  },

  /**
   * Add multiple prices
   * @param {...number} prices - Prices to add in cents or dollars
   * @returns {number} Total price in cents
   */
  add(...prices) {
    return prices.reduce((total, price) => total + this.normalize(price), 0)
  }
}
