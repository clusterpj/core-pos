// src/views/pos/composables/useCartDiscount.js
import { ref, watch } from 'vue'
import { useCartStore } from '@/stores/cart-store'

export function useCartDiscount() {
  const cartStore = useCartStore()
  const discountType = ref(cartStore.$state.discountType)
  const discountValue = ref(cartStore.$state.discountValue)

  watch(() => cartStore.$state.discountType, (newType) => {
    discountType.value = newType
  })

  watch(() => cartStore.$state.discountValue, (newValue) => {
    discountValue.value = newValue
  })

  const updateDiscount = () => {
    cartStore.setDiscount(discountType.value, Number(discountValue.value))
  }

  return {
    discountType,
    discountValue,
    updateDiscount
  }
}
