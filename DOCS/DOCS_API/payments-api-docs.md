# Crater POS Payment API Documentation

## Table of Contents
1. [Introduction](#introduction)
2. [Authentication](#authentication)
3. [Common Patterns](#common-patterns)
4. [Endpoints](#endpoints)
   - [Payments](#payments)
   - [Payment Methods](#payment-methods)
   - [Payment Accounts](#payment-accounts)
   - [Failed Payments](#failed-payments)
5. [Error Handling](#error-handling)
6. [Data Models](#data-models)

## Introduction

This documentation covers the Payment API endpoints for the Crater POS system. The API provides functionality for managing payments, payment methods, payment accounts, and related operations in a point-of-sale environment.

### Base URL
```
https://api.crater.com/v1
```

### API Versioning
Current version: V1
All endpoints are prefixed with `/v1`

## Authentication

The API uses Sanctum authentication. All requests must include a valid authentication token in the Authorization header.

```http
Authorization: Bearer <your-token>
```

Additionally, company context is required via the company header:
```http
company: <company-id>
```

## Common Patterns

### Response Format
All responses follow a standard JSON format:

```json
{
  "success": true,
  "data": {
    // Response data
  }
}
```

### Error Format
```json
{
  "success": false,
  "error": {
    "message": "Error description",
    "code": "ERROR_CODE"
  }
}
```

### Pagination
Paginated responses include:
```json
{
  "data": [...],
  "meta": {
    "current_page": 1,
    "per_page": 10,
    "total": 100
  }
}
```

## Endpoints

### Payments

#### List Payments
```http
GET /api/v1/payments
```

Lists all payments with optional filtering and pagination.

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| limit | integer | No | Results per page (default: 10) |
| search | string | No | Search term for filtering |
| payment_number | string | No | Filter by payment number |
| invoice_number | string | No | Filter by invoice number |
| payment_method_id | integer | No | Filter by payment method |
| customer_id | integer | No | Filter by customer |
| from_date | date | No | Start date for filtering (YYYY-MM-DD) |
| to_date | date | No | End date for filtering (YYYY-MM-DD) |
| orderByField | string | No | Field to order by |
| orderBy | string | No | Order direction (asc/desc) |

**Response:**
```json
{
  "payments": [
    {
      "id": 1,
      "payment_number": "PAY-001",
      "amount": 10000,
      "payment_date": "2024-10-28",
      "user_id": 1,
      "invoice_id": 1,
      "payment_method_id": 1,
      "transaction_status": "Approved",
      "company_id": 1
    }
  ],
  "paymentTotalCount": 100
}
```

#### Create Payment
```http
POST /api/v1/payments
```

Creates a new payment record.

**Request Body:**
```json
{
  "amount": 10000,
  "payment_date": "2024-10-28",
  "user_id": 1,
  "invoice_id": 1,
  "payment_method_id": 1,
  "notes": "Payment for Invoice #INV-001",
  "authorize": {
    "name": "John Doe",
    "card_number": "4111111111111111",
    "cvv": "123",
    "date": "12/24",
    "address_street_1": "123 Main St",
    "city": "Springfield",
    "state_id": 1,
    "country_id": 1,
    "zip": "12345"
  }
}
```

**Response:**
```json
{
  "payment": {
    "id": 1,
    "payment_number": "PAY-001",
    "amount": 10000,
    "payment_date": "2024-10-28",
    "transaction_status": "Approved"
  },
  "success": true
}
```

#### Get Payment Details
```http
GET /api/v1/payments/{id}
```

Retrieves detailed information about a specific payment.

**Response:**
```json
{
  "nextPaymentNumber": "PAY-002",
  "payment_prefix": "PAY",
  "payment": {
    "id": 1,
    "payment_number": "PAY-001",
    "amount": 10000,
    "payment_date": "2024-10-28",
    "user": {
      "id": 1,
      "name": "John Doe"
    },
    "invoice": {
      "id": 1,
      "invoice_number": "INV-001"
    },
    "paymentMethod": {
      "id": 1,
      "name": "Credit Card"
    }
  }
}
```

### Payment Methods

#### List Payment Methods
```http
GET /api/v1/payment-methods
```

Lists available payment methods.

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| limit | integer | No | Results per page (default: 10) |
| method_id | integer | No | Filter by method ID |
| search | string | No | Search term |
| orderByField | string | No | Field to order by |
| orderBy | string | No | Order direction |

**Response:**
```json
{
  "paymentMethods": [
    {
      "id": 1,
      "name": "Credit Card",
      "description": "Payment via credit card",
      "status": "active",
      "for_customer_use": true,
      "add_payment_gateway": true
    }
  ]
}
```

### Payment Accounts

#### List Payment Accounts
```http
GET /api/v1/payment-accounts
```

Lists payment accounts for a customer.

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| limit | integer | No | Results per page (default: 10) |
| user_id | integer | Yes | Customer ID |
| search | string | No | Search term |
| payment_account_type | string | No | Account type (CC/ACH) |

**Response:**
```json
{
  "payment_accounts": [
    {
      "id": 1,
      "payment_account_type": "CC",
      "card_number": "************1111",
      "expiration_date": "12/24",
      "status": "A",
      "country_name": "United States",
      "state_name": "California"
    }
  ],
  "paymentAccountTotalCount": 10
}
```

## Error Handling

### Common Error Codes
| Code | Description |
|------|-------------|
| 401 | Unauthorized - Invalid or missing authentication |
| 403 | Forbidden - Insufficient permissions |
| 404 | Resource not found |
| 422 | Validation error |
| 500 | Server error |

### Validation Error Response
```json
{
  "success": false,
  "error": {
    "message": "Validation failed",
    "errors": {
      "amount": ["Amount is required"],
      "payment_date": ["Invalid date format"]
    }
  }
}
```

## Data Models

### Payment
| Field | Type | Description |
|-------|------|-------------|
| id | integer | Unique identifier |
| payment_number | string | Unique payment reference number |
| amount | integer | Payment amount in cents |
| payment_date | date | Date of payment |
| user_id | integer | Customer ID |
| invoice_id | integer | Related invoice ID |
| payment_method_id | integer | Payment method used |
| transaction_status | string | Status of transaction |
| notes | string | Additional payment notes |
| company_id | integer | Company context |

### Payment Method
| Field | Type | Description |
|-------|------|-------------|
| id | integer | Unique identifier |
| name | string | Method name |
| description | string | Description |
| status | string | Status (A/I) |
| for_customer_use | boolean | Available for customer use |
| add_payment_gateway | boolean | Uses payment gateway |

### Payment Account
| Field | Type | Description |
|-------|------|-------------|
| id | integer | Unique identifier |
| payment_account_type | string | Account type (CC/ACH) |
| client_id | integer | Customer ID |
| status | string | Status (A/I) |
| card_number | string | Encrypted card number |
| expiration_date | string | Card expiration date |
| routing_number | string | ACH routing number |
| account_number | string | ACH account number |
| country_id | integer | Country reference |
| state_id | integer | State reference |
