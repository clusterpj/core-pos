# CorePOS API Documentation

## Table of Contents
- [Introduction](#introduction)
- [Authentication](#authentication)
- [Base URL](#base-url)
- [Common Headers](#common-headers)
- [Response Format](#response-format)
- [Endpoints](#endpoints)
  - [Cash Register Operations](#cash-register-operations)
  - [Cash History Management](#cash-history-management)
  - [Store Management](#store-management)
  - [Table Management](#table-management)
  - [Hold Invoice Operations](#hold-invoice-operations)
  - [POS Item Categories](#pos-item-categories)
  - [POS Payment Methods](#pos-payment-methods)
  - [Dashboard](#dashboard)

## Introduction

The CorePOS API provides a comprehensive set of endpoints for managing a Point of Sale system. It handles cash registers, transactions, store management, table management, and various POS-specific operations.

## Authentication

All API requests require authentication using a valid authentication token. The token should be included in the Authorization header.

```http
Authorization: Bearer {your-auth-token}
```

## Base URL

```
https://api.example.com/v1/core-pos
```

## Common Headers

```http
Content-Type: application/json
Accept: application/json
Authorization: Bearer {your-auth-token}
```

## Response Format

All responses follow a standard format:

```json
{
    "success": boolean,
    "data": object|array,
    "message": string
}
```

### Common Status Codes

- `200` - Success
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Server Error

## Endpoints

### Cash Register Operations

#### Generate Cash Register Report

```http
GET /cash-register/report/{id}/{hash}
```

Generates a detailed report for a specific cash register.

**Parameters:**
- `id` (path) - Cash register ID
- `hash` (path) - Company unique hash
- `cash_history_id` (query, optional) - Specific cash history ID

**Response:**
- Returns a PDF stream containing the cash register report

#### Success Response Example:
```json
{
    "company": "Company Object",
    "logo": "base64_encoded_string",
    "cash_register": "Cash Register Object",
    "cash_history": "Cash History Object",
    "currency": "Currency Object",
    "detail_sales": "Sales Details Array"
}
```

### Cash History Management

#### List Cash Histories

```http
GET /cash-history
```

Retrieves cash history records for a specific cash register.

**Query Parameters:**
- `cash_register_id` (required) - ID of the cash register

**Success Response:**
```json
{
    "success": true,
    "data": [
        {
            "id": "integer",
            "user_name": "string",
            "open_date": "datetime",
            "close_date": "datetime",
            "initial_amount": "decimal",
            "final_amount": "decimal"
        }
    ]
}
```

#### Create Cash History

```http
POST /cash-history
```

Creates a new cash history record.

**Request Body:**
```json
{
    "open": boolean,
    "ref": "string",
    "cash_received": "decimal",
    "initial_amount": "decimal",
    "open_note": "string",
    "open_date": "datetime",
    "final_amount": "decimal",
    "close_note": "string",
    "close_date": "datetime",
    "cash_register_id": "integer",
    "users": [
        {
            "id": "integer"
        }
    ]
}
```

### Store Management

#### List Stores

This end point used /pos/ insetad of /core-pos/ so it is /pos/store
```http
GET /pos/store
```

Retrieves a list of stores.

**Query Parameters:**
- `limit` (optional) - Number of records per page (default: 10)
- `name` (optional) - Filter by store name
- `orderByField` (optional) - Field to order by
- `orderBy` (optional) - Sort direction (asc/desc)

**Success Response:**
```json
{
    "success": true,
    "stores": {
        "data": [
            {
                "id": "integer",
                "name": "string",
                "description": "string",
                "company_name": "string",
                "created_at": "datetime"
            }
        ],
        "pagination": {
            "total": "integer",
            "per_page": "integer",
            "current_page": "integer",
            "last_page": "integer"
        }
    }
}
```

#### Create Store

```http
POST /pos/store
```

Creates a new store.

**Request Body:**
```json
{
    "name": "string",
    "description": "string",
    "items": [
        {
            "item_id": "integer"
        }
    ],
    "item_groups": [
        {
            "id": "integer"
        }
    ]
}
```

### Table Management

#### List Tables

```http
GET /table
```

Retrieves a list of tables.

**Query Parameters:**
- `limit` (optional) - Records per page (default: 10)
- `name` (optional) - Filter by table name
- `orderByField` (optional) - Field to order by
- `orderBy` (optional) - Sort direction (asc/desc)

**Success Response:**
```json
{
    "tables": {
        "data": [
            {
                "id": "integer",
                "name": "string",
                "user_id": "integer",
                "cash_register": "object",
                "user": "object"
            }
        ],
        "pagination": {
            "total": "integer",
            "per_page": "integer",
            "current_page": "integer",
            "last_page": "integer"
        }
    }
}
```

### Hold Invoice Operations

#### List Hold Invoices

```http
GET /hold-invoice
```

Retrieves a list of held invoices.

**Success Response:**
```json
{
    "success": true,
    "hold_invoices": {
        "data": [
            {
                "id": "integer",
                "description": "string",
                "total": "decimal",
                "sub_total": "decimal",
                "tax": "decimal",
                "holdItems": "array",
                "holdTaxes": "array",
                "holdContact": "object",
                "holdTables": "array"
            }
        ]
    }
}
```

#### Create Hold Invoice

```http
POST /hold-invoice
```

Creates a new hold invoice.

**Request Body:**
```json
{
    "description": "string",
    "total": "decimal",
    "sub_total": "decimal",
    "tax": "decimal",
    "discount_type": "string",
    "discount": "decimal",
    "discount_val": "decimal",
    "tip_type": "string",
    "tip": "decimal",
    "tip_val": "decimal",
    "notes": "string",
    "store_id": "integer",
    "items": "array",
    "taxes": "array",
    "tables_selected": "array",
    "contact": "object"
}
```

### Error Responses

All endpoints may return the following error responses:

```json
{
    "success": false,
    "message": "Error message description"
}
```

Common error scenarios:
- Invalid authentication token
- Missing required parameters
- Invalid parameter values
- Resource not found
- Server error

## Rate Limiting

API requests are limited to 1000 requests per minute per IP address. The following headers are included in responses:

```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1477324800
```

## Pagination

Endpoints that return lists support pagination with the following parameters:

- `limit` - Number of records per page (default: 10)
- `page` - Page number (default: 1)

Pagination metadata is included in the response:

```json
{
    "data": [],
    "meta": {
        "current_page": 1,
        "from": 1,
        "last_page": 10,
        "path": "http://api.example.com/endpoint",
        "per_page": 10,
        "to": 10,
        "total": 100
    }
}
```

## Best Practices

1. Always include proper authentication headers
2. Use pagination for large data sets
3. Handle rate limiting appropriately
4. Implement proper error handling
5. Cache responses when appropriate

## Versioning

This API is currently on version 1 (v1). The version is included in the URL path:
```
/v1/corepos/...
```

Breaking changes will be introduced in new API versions.
