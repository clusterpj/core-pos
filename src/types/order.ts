import { Product } from './product'
import { User } from './user'

export enum InvoiceStatus {
  PENDING = 'PENDING',
  GENERATED = 'GENERATED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED'
}

export interface Order {
  id?: number
  user_id?: number
  total: number
  subtotal: number
  tax: number
  discount?: number
  products: Product[]
  status: string
  type: string
  notes?: string
  created_at?: Date
  updated_at?: Date
  
  // New invoice-related fields
  invoice_number?: string
  invoice_status?: InvoiceStatus
  invoice_generated_at?: Date
}

export interface InvoiceGenerationRequest {
  orderId: number
  userId: number
}

export interface InvoiceResponse {
  order: Order
  invoice_number: string
  status: InvoiceStatus
}
