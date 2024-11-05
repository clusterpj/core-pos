export const state = () => ({
  items: [],
  discountType: 'fixed',
  discountValue: 0,
  taxRate: 0.08, // 8% tax rate
  loading: false,
  error: null,
  notes: '',
  selectedTables: [],
  holdInvoiceId: null,
  holdOrderDescription: null
})

export const mutations = {
  setNotes(state, notes) {
    state.notes = notes
  },

  setSelectedTables(state, tables) {
    state.selectedTables = tables
  },

  setHoldInvoiceId(state, id) {
    state.holdInvoiceId = id
    if (!id) {
      state.holdOrderDescription = null
    }
  },

  setHoldOrderDescription(state, description) {
    state.holdOrderDescription = description
  },

  setDiscount(state, { type, value }) {
    state.discountType = type
    state.discountValue = value
  },

  clearCart(state) {
    state.items = []
    state.discountType = 'fixed'
    state.discountValue = 0
    state.notes = ''
    state.selectedTables = []
    state.holdInvoiceId = null
    state.holdOrderDescription = null
  }
}
