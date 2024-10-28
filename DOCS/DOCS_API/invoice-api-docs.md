# CoreBill Invoice API Documentation

## Table of Contents
- [Introduction](#introduction)
- [Authentication](#authentication)
- [Common Response Formats](#common-response-formats)
- [Endpoints](#endpoints)
  - [List Invoices](#list-invoices)
  - [View Invoice](#view-invoice)
  - [Create Invoice](#create-invoice)
  - [Update Invoice](#update-invoice)
  - [Delete Invoice](#delete-invoice)
  - [Change Invoice Status](#change-invoice-status)
  - [Clone Invoice](#clone-invoice)
  - [Send Invoice](#send-invoice)
  - [Get Invoice Templates](#get-invoice-templates)
  - [View Invoice by Hash](#view-invoice-by-hash)
  - [Get Invoice Late Fees](#get-invoice-late-fees)
  - [List Archived Invoices](#list-archived-invoices)
  - [Restore Invoice](#restore-invoice)

## Introduction

The CoreBill Invoice API provides a comprehensive set of endpoints for managing invoices in both POS and billing systems. This API allows for creating, updating, viewing, and managing invoices, along with related functionalities such as templating, status management, and late fee handling.

### API Version
Current Version: V1

### Base URL
```
/api/v1
```

## Authentication

All API requests require authentication using a Bearer token.

**Headers Required:**
```
Authorization: Bearer <your_token>
company: <company_id>
```

## Common Response Formats

### Success Response
```json
{
    "success": true,
    "data": {
        // Response specific data
    }
}
```

### Error Response
```json
{
    "success": false,
    "message": "Error description"
}
```

## Endpoints

### List Invoices

Retrieves a paginated list of invoices.

```
GET /invoices
```

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| limit | integer | No | Results per page (default: 10) |
| status | string | No | Filter by invoice status |
| paid_status | string | No | Filter by payment status |
| customer_id | integer | No | Filter by customer |
| invoice_number | string | No | Filter by invoice number |
| from_date | date | No | Start date filter (Y-m-d) |
| to_date | date | No | End date filter (Y-m-d) |
| search | string | No | Search term |

#### Response
```json
{
    "invoices": {
        "data": [
            {
                "id": integer,
                "invoice_number": string,
                "status": string,
                "paid_status": string,
                "total": number,
                "due_amount": number,
                "invoice_date": date,
                "due_date": date
            }
        ],
        "meta": {
            "current_page": integer,
            "total": integer,
            "per_page": integer
        }
    },
    "invoiceTotalCount": integer
}
```

### View Invoice

Retrieve detailed information about a specific invoice.

```
GET /invoices/{id}
```

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | integer | Yes | Invoice ID |

#### Response
```json
{
    "invoice": {
        "id": integer,
        "invoice_number": string,
        "status": string,
        "paid_status": string,
        "items": array,
        "user": object,
        "total": number,
        "due_amount": number,
        "invoice_date": date,
        "due_date": date,
        "notes": string,
        "parse_invoice_date": date,
        "parse_due_date": date
    },
    "payments": array,
    "nextInvoiceNumber": string,
    "invoicePrefix": string,
    "codeservice": string
}
```

### Create Invoice

Create a new invoice.

```
POST /invoices
```

#### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| invoice_date | date | Yes | Invoice date (Y-m-d) |
| due_date | date | Yes | Due date (Y-m-d) |
| invoice_number | string | Yes | Unique invoice number |
| user_id | integer | Yes | Customer ID |
| items | array | Yes | Array of invoice items |
| status | string | No | Invoice status |
| notes | string | No | Invoice notes |
| packages | array | No | Array of packages |
| send_email | boolean | No | Whether to send email |

#### Response
```json
{
    "invoice": {
        "id": integer,
        "invoice_number": string,
        "status": string,
        // ... other invoice fields
    }
}
```

### Change Invoice Status

Update the status of an invoice.

```
POST /invoices/{invoice}/status
```

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| invoice | integer | Yes | Invoice ID |

#### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| status | string | Yes | New status (SENT, COMPLETED) |

#### Response
```json
{
    "success": true
}
```

### Clone Invoice

Create a duplicate of an existing invoice.

```
POST /invoices/{invoice}/clone
```

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| invoice | integer | Yes | Invoice ID to clone |

#### Response
```json
{
    "invoice": {
        "id": integer,
        "invoice_number": string,
        // ... cloned invoice details
    },
    "success": true
}
```

### Send Invoice

Send an invoice by email.

```
POST /invoices/{invoice}/send
```

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| invoice | integer | Yes | Invoice ID |

#### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| subject | string | Yes | Email subject |
| body | string | Yes | Email body |
| to | string | Yes | Recipient email |

#### Response
```json
{
    "success": true
}
```

### Get Invoice Late Fees

Retrieve late fees associated with an invoice.

```
GET /invoices/{id}/late-fees
```

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | integer | Yes | Invoice ID |

#### Response
```json
{
    "success": true,
    "invoice_late_fees": [
        {
            "id": integer,
            "invoice_id": integer,
            "subtotal": number,
            "tax_amount": number,
            "total": number
        }
    ]
}
```

## Status Codes

| Status Code | Description |
|-------------|-------------|
| 200 | Success |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 422 | Validation Error |
| 500 | Server Error |

## Error Handling

The API uses conventional HTTP response codes to indicate the success or failure of requests. Errors are returned in a consistent format:

```json
{
    "success": false,
    "message": "Error description",
    "errors": {
        "field_name": [
            "Error message"
        ]
    }
}
```

## Rate Limiting

The API implements rate limiting to prevent abuse. Current limits are:

- 60 requests per minute per IP address
- 1000 requests per hour per authenticated user

## Best Practices

1. Always include the company header in requests
2. Use appropriate status filters to optimize response times
3. Implement proper error handling for all responses
4. Use pagination parameters for large data sets
5. Cache invoice templates and other static data
6. Implement proper retry logic for failed requests

## Changelog

### Version 1.0
- Initial release with core invoice management functionality
- Basic CRUD operations
- Invoice status management
- Email capabilities
- Late fee tracking
