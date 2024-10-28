# CorePOS Users API Documentation

## Table of Contents
- [Overview](#overview)
- [Authentication](#authentication)
- [Base URL](#base-url)
- [Endpoints](#endpoints)
  - [List Users](#list-users)
  - [Create User](#create-user)
  - [Get User Details](#get-user-details)
  - [Update User Permissions](#update-user-permissions)
  - [Get User Estimates](#get-user-estimates)
  - [Update User](#update-user)
  - [Delete Users](#delete-users)
  - [Get Admin User](#get-admin-user)

## Overview

The Users API provides endpoints for managing users within the CorePOS system. It supports operations such as creating, reading, updating, and deleting users, as well as managing user permissions and associated data.

## Authentication

All API requests require authentication using a valid authentication token. Include the token in the Authorization header:

```
Authorization: Bearer <your_token>
```

## Base URL

```
https://api.corepos.com/v1
```

## Endpoints

### List Users

Retrieves a paginated list of users with optional filtering.

```
GET /users
```

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| limit | integer | No | Number of records per page (default: 10) |
| roles | array | No | Array of role IDs to filter by |
| list | boolean | No | If true, returns simplified user list |
| display_name | string | No | Filter by display name |
| email | string | No | Filter by email |
| phone | string | No | Filter by phone number |
| orderByField | string | No | Field to order results by |
| orderBy | string | No | Sort direction ('asc' or 'desc') |

#### Response

```json
{
    "users": {
        "data": [
            {
                "id": 1,
                "name": "John Doe",
                "email": "john@example.com",
                "role": "manager",
                "role2": "supervisor"
            }
        ],
        "meta": {
            "current_page": 1,
            "total": 50,
            "per_page": 10
        }
    },
    "roles": [
        {
            "id": 1,
            "name": "manager"
        }
    ]
}
```

### Create User

Creates a new user in the system.

```
POST /users
```

#### Request Body

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| email | string | Yes | User's email address |
| name | string | Yes | User's full name |
| role | object | Yes | User's role information |
| pbx_notification | boolean | No | Enable PBX notifications |
| departament_groups | array | No | Array of department group IDs |
| email_estimates | boolean | No | Enable estimate notifications |
| email_invoices | boolean | No | Enable invoice notifications |
| email_payments | boolean | No | Enable payment notifications |
| email_services | boolean | No | Enable service notifications |
| email_pbx_services | boolean | No | Enable PBX service notifications |
| email_tickets | boolean | No | Enable ticket notifications |
| email_expenses | boolean | No | Enable expense notifications |

#### Response

```json
{
    "user": {
        "id": 1,
        "name": "John Doe",
        "email": "john@example.com",
        "role": "super admin",
        "role2": "manager"
    },
    "success": true
}
```

### Get User Details

Retrieves detailed information about a specific user.

```
GET /users/{id}
```

#### Response

```json
{
    "data": {
        "id": 1,
        "name": "John Doe",
        "email": "john@example.com",
        "itemGroups": [
            {
                "id": 1,
                "name": "Sales"
            }
        ],
        "permissions": [
            {
                "module": "invoices",
                "access": true,
                "create": true,
                "read": true,
                "update": true,
                "delete": true
            }
        ]
    },
    "success": true
}
```

### Update User Permissions

Updates the permissions for a specific user.

```
PUT /users/{id}/permissions
```

#### Request Body

```json
{
    "permissions": [
        {
            "module": {
                "value": "invoices"
            },
            "access": true,
            "create": true,
            "read": true,
            "update": true,
            "delete": false
        }
    ]
}
```

#### Response

```json
{
    "user": {
        "id": 1,
        "name": "John Doe"
    },
    "success": true
}
```

### Get User Estimates

Retrieves estimates assigned to a specific user.

```
GET /users/{id}/estimates
```

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| perPage | integer | No | Records per page (default: 10) |
| status | string | No | Filter by estimate status |
| orderByField | string | No | Field to order results by |
| orderBy | string | No | Sort direction |

#### Response

```json
{
    "estimates": {
        "data": [
            {
                "id": 1,
                "user": {
                    "id": 1,
                    "currency_id": "USD"
                },
                "status": "draft"
            }
        ],
        "meta": {
            "current_page": 1,
            "total": 25,
            "per_page": 10
        }
    },
    "success": true
}
```

### Update User

Updates an existing user's information.

```
PUT /users/{id}
```

#### Request Body

Same parameters as Create User endpoint.

#### Response

```json
{
    "user": {
        "id": 1,
        "name": "John Doe",
        "email": "john@example.com",
        "role": "super admin",
        "role2": "manager"
    },
    "success": true
}
```

### Delete Users

Deletes one or more users from the system.

```
DELETE /users
```

#### Request Body

```json
{
    "users": [1, 2, 3]
}
```

#### Response

```json
{
    "success": true
}
```

### Get Admin User

Retrieves the super admin user information.

```
GET /users/admin
```

#### Response

```json
{
    "user": {
        "id": 1,
        "name": "Admin User",
        "role": "super admin"
    }
}
```

## Error Responses

The API uses standard HTTP response codes to indicate the success or failure of requests.

### Common Error Codes

| Code | Description |
|------|-------------|
| 400 | Bad Request - Invalid parameters |
| 401 | Unauthorized - Authentication required |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource doesn't exist |
| 422 | Unprocessable Entity - Validation failed |
| 500 | Internal Server Error |

### Error Response Format

```json
{
    "error": {
        "message": "Error description",
        "code": "ERROR_CODE"
    }
}
```

## Rate Limiting

The API implements rate limiting to prevent abuse. Current limits are:
- 1000 requests per minute per IP address
- 10,000 requests per hour per user

## Best Practices

1. Always include appropriate authentication headers
2. Use pagination for large result sets
3. Implement proper error handling
4. Cache responses when appropriate
5. Use HTTPS for all requests

## Versioning

This documentation is for API version 1 (v1). The API uses URL versioning:
```
/v1/users
```

Future versions will be announced and documented separately.
