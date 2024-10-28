# CorePOS Customer API Documentation

## Table of Contents
- [Introduction](#introduction)
- [Authentication](#authentication)
- [Common Response Patterns](#common-response-patterns)
- [Customer Endpoints](#customer-endpoints)
  - [List Customers](#list-customers)
  - [Create Customer](#create-customer)
  - [Get Customer Details](#get-customer-details)
  - [Update Customer](#update-customer)
  - [Delete Customers](#delete-customers)
  - [Customer Configuration](#customer-configuration)
  - [Customer Statistics](#customer-statistics)
  - [Customer Services](#customer-services)
  - [Customer Packages](#customer-packages)
  - [Customer Estimates](#customer-estimates)
  - [Customer PBX Services](#customer-pbx-services)
  - [Customer Payments](#customer-payments)

## Introduction

The CorePOS Customer API provides a comprehensive set of endpoints for managing customer data, configurations, services, and related operations in the Point of Sale system. This API follows RESTful principles and supports operations for both authenticated users and customer self-service scenarios.

### API Version
Current Version: v1

### Base URL
```
/api/v1/customer
```

## Authentication

All API requests require authentication using a Bearer token in the Authorization header:

```http
Authorization: Bearer <your_token>
```

Additionally, requests must include a company identifier in the header:

```http
company: <company_id>
```

## Common Response Patterns

### Success Response Structure
```json
{
  "success": true,
  "data": {
    // Response specific data
  }
}
```

### Error Response Structure
```json
{
  "success": false,
  "message": "Error description"
}
```

### Pagination Structure
```json
{
  "data": [...],
  "meta": {
    "current_page": 1,
    "per_page": 10,
    "total": 100,
    "total_pages": 10
  }
}
```

## Customer Endpoints

### List Customers
Retrieves a paginated list of customers with optional filters.

```http
GET /api/v1/customers
```

#### Query Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| limit | integer | No | Results per page (default: 10) |
| search | string | No | Search term for customer name/email |
| status_customer | string | No | Filter by customer status (A/I/F) |
| orderByField | string | No | Field to sort by |
| orderBy | string | No | Sort direction (asc/desc) |

#### Response
```json
{
  "customers": {
    "data": [
      {
        "id": 1,
        "name": "John Doe",
        "email": "john@example.com",
        "status_customer": "A",
        "contact_name": "John",
        "phone": "1234567890",
        "created_at": "2024-01-01T00:00:00Z"
      }
    ],
    "meta": {
      "current_page": 1,
      "per_page": 10,
      "total": 100
    }
  },
  "customerTotalCount": 100
}
```

### Create Customer

Creates a new customer record with optional configuration.

```http
POST /api/v1/customers
```

#### Request Body
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "contact_name": "John",
  "phone": "1234567890",
  "authentication": 1,
  "send_after_created_email": 1,
  "billing_address": {
    "address_street_1": "123 Main St",
    "city": "Example City",
    "state_id": 1,
    "country_id": 1,
    "zip": "12345"
  }
}
```

#### Response
```json
{
  "customer": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "contact_name": "John",
    "phone": "1234567890",
    "created_at": "2024-01-01T00:00:00Z"
  },
  "success": true
}
```

### Get Customer Details

Retrieves detailed information about a specific customer.

```http
GET /api/v1/customers/{id}
```

#### Response
```json
{
  "customer": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "contact_name": "John",
    "phone": "1234567890",
    "billingAddress": {
      "address_street_1": "123 Main St",
      "city": "Example City",
      "state": {
        "name": "State Name"
      },
      "country": {
        "name": "Country Name"
      }
    },
    "packages": [],
    "servicescount": 0
  },
  "currency": {
    "name": "USD",
    "symbol": "$"
  }
}
```

### Customer Statistics

Retrieves comprehensive statistics for a customer including sales, invoices, and financial data.

```http
GET /api/v1/customers/{id}/stats
```

#### Response
```json
{
  "customer": {
    "id": 1,
    "name": "John Doe",
    // ... customer details
  },
  "chartData": {
    "accountBalance": 1000.00,
    "invoiceTotals": [],
    "invoiceDue": 500.00,
    "invoiceOverdue": 200.00,
    "salesTotal": 5000.00,
    "totalReceipts": 4500.00,
    "totalExpenses": 1000.00,
    "balanceTotal": 3500.00
  }
}
```

### Customer Services

Retrieves a list of services associated with a customer.

```http
GET /api/v1/customer/services
```

#### Query Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| limit | integer | No | Results per page (default: 10) |
| service_number | string | No | Filter by service number |
| status | string | No | Filter by service status |
| from_date | date | No | Start date filter |
| to_date | date | No | End date filter |

#### Response
```json
{
  "packages": {
    "data": [
      {
        "id": 1,
        "code": "SVC-001",
        "status": "active",
        "customer_id": 1,
        "package": {
          "name": "Package Name"
        }
      }
    ],
    "meta": {
      "current_page": 1,
      "per_page": 10
    }
  },
  "success": true
}
```

### Customer PBX Services

Retrieves PBX services associated with a customer.

```http
GET /api/v1/customer/pbx-services
```

#### Query Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| limit | integer | No | Results per page (default: 10) |
| status | string | No | Filter by service status |
| service_number | string | No | Filter by service number |

#### Response
```json
{
  "pbxServices": {
    "data": [
      {
        "id": 1,
        "pbx_services_number": "PBX001",
        "status": "active",
        "pbxPackage": {
          "name": "Package Name"
        }
      }
    ],
    "meta": {
      "current_page": 1,
      "per_page": 10
    }
  },
  "success": true
}
```

### Customer Configuration

Manages customer-specific configurations.

```http
POST /api/v1/customer/config
```

#### Request Body
```json
{
  "customer_id": 1,
  "config_key": "value"
}
```

#### Response
```json
{
  "config": {
    "id": 1,
    "customer_id": 1,
    "config_key": "value"
  },
  "success": true
}
```

## Error Codes and Handling

| HTTP Code | Description |
|-----------|-------------|
| 400 | Bad Request - Invalid parameters |
| 401 | Unauthorized - Authentication required |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource doesn't exist |
| 422 | Unprocessable Entity - Validation failed |
| 500 | Internal Server Error |

### Example Error Response
```json
{
  "message": "The given data was invalid.",
  "errors": {
    "email": [
      "The email field is required."
    ]
  }
}
```

## Rate Limiting

The API implements rate limiting based on the authenticated user or IP address. Current limits are:
- 60 requests per minute for authenticated users
- 30 requests per minute for unauthenticated requests

## Implementation Notes

1. All date/time values are returned in ISO 8601 format
2. Monetary values are returned as strings to preserve precision
3. Boolean values should be sent as 0/1 in requests
4. File uploads should use multipart/form-data encoding
5. Bulk operations are available for certain endpoints

## Best Practices

1. Always include appropriate error handling
2. Use pagination for large data sets
3. Cache responses when appropriate
4. Include proper content-type headers
5. Validate input before sending requests

## Deprecation Notices

- The `/v1/customer/old-config` endpoint is deprecated and will be removed in v2
- Customer username validation will be replaced with email validation in v2

For additional support or questions, please contact the API team or refer to the full documentation repository.
