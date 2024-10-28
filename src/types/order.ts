// src/types/order.ts
export interface Order {
  id: number
  order_number: string
  customer_id?: number
  user_id: number
  status: OrderStatus
  total: number
  created_at: string
  updated_at: string
}

export type OrderStatus = 'pending' | 'completed' | 'cancelled'

// Basic type for dashboard statistics
export interface OrderStats {
  total_orders: number
  total_sales: number
  average_order_value: number
  period: string
}
