# CorePOS System Documentation

## System Overview

CorePOS is a Vue 3-based Point of Sale system built with Vuetify 3, utilizing the Composition API and Pinia for state management. The system handles various aspects of point-of-sale operations including order management, payment processing, and invoice generation.

## Core Architecture

### 1. State Management

#### POS Store (`src/stores/pos-store.js`)
- **Primary Purpose**: Central store for POS operations and state management
- **Key Components**:
  - Product catalog management
  - Category management
  - Order type handling
  - Hold invoice management
- **Business Logic**:
  - Handles product filtering and pagination
  - Manages order type selection
  - Controls table assignments
  - Maintains hold invoice state

### 2. API Operations

#### Order Operations (`src/services/api/pos-operations/order.js`)
- **Purpose**: Handles all order-related API operations
- **Key Functions**:
  - `getOrders()`: Retrieves list of orders
  - `getOrderById()`: Fetches specific order details
  - `updateOrderStatus()`: Updates order status
- **Business Logic**:
  - Implements order lifecycle management
  - Handles order status transitions
  - Includes error handling and logging

#### Invoice Operations (`src/services/api/pos-operations/invoice.js`)
- **Purpose**: Manages invoice creation and management
- **Key Functions**:
  - `getHoldInvoices()`: Retrieves held orders
  - `updateHoldInvoice()`: Updates existing hold invoices
  - `createInvoice()`: Generates new invoices
  - `getInvoice()`: Retrieves invoice details
- **Business Logic**:
  - Validates hold orders
  - Handles invoice state transitions
  - Manages invoice data integrity

#### Payment Operations (`src/services/api/pos-operations/payment.js`)
- **Purpose**: Handles payment processing and methods
- **Key Functions**:
  - `getPaymentMethods()`: Retrieves available payment methods
  - `createPayment()`: Processes new payments
- **Business Logic**:
  - Implements idempotency for payment operations
  - Handles payment method validation
  - Manages payment processing workflow

### 3. Held Orders System

#### Held Orders Composable (`src/views/pos/components/held-orders/composables/useHeldOrders.js`)
- **Purpose**: Manages the held orders functionality
- **Key Features**:
  - Order filtering and search
  - Order type management
  - Order conversion and loading
  - Delete operations
- **Core Functions**:
  ```javascript
  // Convert held order to active invoice
  convertToInvoice(invoice)
  
  // Load held order into cart
  loadOrder(invoice)
  
  // Delete held order
  deleteOrder(invoiceId)
  
  // Fetch all held orders
  fetchHoldInvoices()
  ```
- **Order Types**:
  - Dine In
  - To Go
  - Delivery
  - Pickup
- **State Management**:
  - Loading states for operations
  - Order filtering and search
  - Type-based filtering

## User Interface Components

### POS View (`src/views/pos/PosView.vue`)
- **Purpose**: Main POS interface component
- **Key Features**:
  - Split view layout (cart and products)
  - Responsive design for mobile/desktop
  - Real-time error handling
  - Loading state management
- **Components**:
  - PosCart: Shopping cart management
  - PosProducts: Product catalog display
  - PosFooter: Action buttons and totals
  - ReferenceDialog: Order reference input

### Held Orders Components
- **HeldOrdersModal**: Main modal for managing held orders
- **HeldOrdersTable**: Displays list of held orders with actions
- **HeldOrdersFilters**: Filtering and search interface
- **DeleteConfirmationDialog**: Confirmation for order deletion

## Data Flow

1. **Order Creation Flow**:
   ```
   User Selection → Cart Management → Order Type Selection → 
   Reference Number → Hold/Submit Order → Invoice Generation → Payment Processing
   ```

2. **Hold Order Flow**:
   ```
   Cart Items → Reference Number → Hold Invoice Creation → 
   Store in Hold Invoices → Retrieve/Update Later
   ```

3. **Payment Flow**:
   ```
   Invoice Creation → Payment Method Selection → 
   Payment Processing → Receipt Generation
   ```

4. **Held Order Management Flow**:
   ```
   View Held Orders → Filter/Search → 
   Load/Convert/Delete Order → Process Selected Action
   ```

## Business Rules

1. **System Configuration**:
   - Requires customer selection
   - Requires store selection
   - Requires cash register selection

2. **Order Processing**:
   - Orders can be held with reference numbers
   - Orders require valid payment methods
   - Orders must have associated store and cashier

3. **Payment Handling**:
   - Implements idempotency for payment safety
   - Supports multiple payment methods
   - Validates payment amounts against invoice totals

4. **Held Orders Rules**:
   - Orders can be filtered by type
   - Orders maintain their state (discounts, tips, notes)
   - Converting order removes it from held orders
   - Loading order preserves original hold invoice ID

## Security Considerations

1. **Payment Processing**:
   - Uses idempotency keys for safe transaction processing
   - Implements proper error handling
   - Logs all payment operations

2. **Data Validation**:
   - Validates hold orders before processing
   - Implements input sanitization
   - Handles API errors gracefully

## Error Handling

The system implements comprehensive error handling:
- API operation errors are logged and handled
- UI displays user-friendly error messages
- Failed operations are properly rolled back
- All operations are logged for debugging

## Performance Considerations

1. **Data Loading**:
   - Implements pagination for product listing
   - Lazy loads components when possible
   - Caches frequently used data

2. **State Management**:
   - Uses Pinia for efficient state management
   - Implements proper cleanup on component unmount
   - Manages memory usage through proper state reset

## Future Considerations

1. **Potential Improvements**:
   - Enhanced offline capabilities
   - Better error recovery mechanisms
   - Expanded payment method support
   - Improved performance optimizations

2. **Technical Debt**:
   - Consider implementing stronger typing
   - Enhance test coverage
   - Improve documentation coverage
   - Consider implementing service workers for offline support

## Development Guidelines

1. **Code Structure**:
   - Follow Vue 3 Composition API patterns
   - Use Pinia for state management
   - Implement proper error handling
   - Maintain consistent logging

2. **Testing Requirements**:
   - Unit tests for business logic
   - Component tests for UI elements
   - Integration tests for API operations
   - E2E tests for critical flows

3. **Held Orders Development**:
   - Maintain order type consistency
   - Implement proper state restoration
   - Handle conversion edge cases
   - Ensure proper cleanup after operations
