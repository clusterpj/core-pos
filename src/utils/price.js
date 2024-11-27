/**
 * Utility functions for consistent price handling
 * All prices are managed in cents internally
 */
export const PriceUtils = {
  /**
   * Convert cents to dollars for display
   * @param {number} cents - Price in cents
   * @returns {string} Formatted price in dollars
   */
  toDollars(cents) {
    if (cents == null) return '0.00'
    const dollars = Number(cents) / 100
    return dollars.toFixed(2)
  },

  /**
   * Convert dollars to cents
   * @param {number|string} dollars - Price in dollars
   * @returns {number} Price in cents
   */
  toCents(dollars) {
    if (dollars == null) return 0
    return Math.round(Number(dollars) * 100)
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
  }
}
