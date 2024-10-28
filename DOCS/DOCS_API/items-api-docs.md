# CorePOS API Documentation - Items Management

## Table of Contents
- [Introduction](#introduction)
- [Authentication](#authentication)
- [Common Headers](#common-headers)
- [Items API](#items-api)
  - [List Items](#list-items)
  - [Get Item Selector](#get-item-selector)
  - [Create Item](#create-item)
  - [Get Item Details](#get-item-details)
  - [Update Item](#update-item)
  - [Delete Items](#delete-items)
  - [Upload Item Picture](#upload-item-picture)
  - [Get Item Usage](#get-item-usage)
  - [Get Items by Filters](#get-items-by-filters)
- [Units API](#units-api)
  - [List Units](#list-units)
  - [Create Unit](#create-unit)
  - [Get Unit Details](#get-unit-details)
  - [Update Unit](#update-unit)
  - [Delete Unit](#delete-unit)
- [Item Groups API](#item-groups-api)
  - [List Item Groups](#list-item-groups)
  - [Create Item Group](#create-item-group)
  - [Get Item Group Details](#get-item-group-details)
  - [Update Item Group](#update-item-group)
  - [Delete Item Groups](#delete-item-groups)
  - [Upload Group Picture](#upload-group-picture)

## Introduction

The CorePOS API provides comprehensive endpoints for managing items, units, and item groups in a Point of Sale system. This documentation covers the Item Management section of the API, which allows you to perform operations related to products, their units of measurement, and grouping.

## Authentication

All API requests require authentication. The API uses token-based authentication, which should be included in the request headers.

## Common Headers

| Header    | Required | Description                     |
|-----------|----------|---------------------------------|
| company   | Yes      | Company identifier              |
| Authorization | Yes   | Bearer token for authentication |

## Items API

### List Items

Retrieves a paginated list of items with optional filtering.

**Endpoint:** `GET /api/v1/items`

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| search | string | No | Search term for filtering items |
| categories_id | array | No | Filter by category IDs |
| store_id | integer | No | Filter by store ID |
| limit | integer | No | Number of items per page (default: 10) |
| is_pos | boolean | No | Filter for POS-allowed items |

**Response:**

```json
{
    "items": {
        "data": [...],
        "current_page": 1,
        "per_page": 10,
        "total": 100
    },
    "taxTypes": [...],
    "itemTotalCount": 100
}
```

### Create Item

Creates a new item in the system.

**Endpoint:** `POST /api/v1/items`

**Request Body:**

```json
{
    "name": "Product Name",
    "description": "Product Description",
    "price": 99.99,
    "unit_id": 1,
    "item_store": [
        {"id": 1}
    ],
    "item_section": [
        {"id": 1}
    ]
}
```

**Response:**

```json
{
    "item": {
        "id": 1,
        "name": "Product Name",
        "description": "Product Description",
        "price": "99.99",
        "created_at": "2024-10-28T..."
    }
}
```

### Update Item

Updates an existing item.

**Endpoint:** `PUT /api/v1/items/{id}`

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| id | integer | Item ID |

**Request Body:**
Same as Create Item

**Response:**
```json
{
    "item": {
        "id": 1,
        "name": "Updated Product Name",
        "updated_at": "2024-10-28T..."
    }
}
```

### Delete Items

Deletes multiple items by their IDs.

**Endpoint:** `POST /api/v1/items/delete`

**Request Body:**
```json
{
    "ids": [1, 2, 3]
}
```

**Response:**
```json
{
    "success": true
}
```

## Units API

### List Units

Retrieves a paginated list of measurement units.

**Endpoint:** `GET /api/v1/units`

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| limit | integer | No | Items per page (default: 5) |
| unit_id | integer | No | Filter by unit ID |
| orderByField | string | No | Field to order by |
| orderBy | string | No | Order direction (asc/desc) |

**Response:**
```json
{
    "units": {
        "data": [...],
        "current_page": 1,
        "per_page": 5,
        "total": 50
    }
}
```

## Item Groups API

### List Item Groups

Retrieves a paginated list of item groups.

**Endpoint:** `GET /api/v1/item-groups`

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| limit | integer | No | Items per page (default: 10) |
| name | string | No | Filter by name |
| description | string | No | Filter by description |
| orderByField | string | No | Field to order by |
| orderBy | string | No | Order direction |

**Response:**
```json
{
    "itemGroups": {
        "data": [...],
        "current_page": 1,
        "per_page": 10,
        "total": 100
    },
    "itemGroupsTotalCount": 100
}
```

### Error Responses

All endpoints may return the following error responses:

**401 Unauthorized**
```json
{
    "message": "Unauthenticated"
}
```

**422 Validation Error**
```json
{
    "message": "The given data was invalid",
    "errors": {
        "field": ["Error message"]
    }
}
```

**403 Forbidden**
```json
{
    "message": "You are not authorized to perform this action"
}
```

## Pagination

Most list endpoints support pagination with the following parameters:

- `limit`: Number of items per page
- `page`: Page number

Response includes metadata:
```json
{
    "data": [...],
    "current_page": 1,
    "per_page": 10,
    "total": 100,
    "last_page": 10
}
```

## Rate Limiting

The API implements rate limiting to ensure system stability. Current limits are:
- 1000 requests per minute per IP address
- 5000 requests per hour per authenticated user

## Best Practices

1. Always include the company header in requests
2. Use appropriate error handling
3. Implement pagination for large datasets
4. Cache responses when appropriate
5. Use proper HTTP methods for operations

## Implementation Notes

- Image uploads should be in base64 format
- All timestamps are in ISO 8601 format
- Monetary values are stored as decimals with 2 decimal places
- IDs are integer values
- Boolean flags use true/false values

## Versioning

This documentation covers API version 1 (v1). The API uses URL versioning (e.g., `/api/v1/`).

The current version includes deprecation notices where applicable, and all deprecated endpoints will be maintained for at least 6 months after deprecation notice.
