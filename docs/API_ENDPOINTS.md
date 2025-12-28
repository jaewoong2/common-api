# API Endpoints

> ⚠️ **AI MUST UPDATE THIS FILE** when creating or modifying API endpoints.

## How to Use This Document

1. **Before implementing**: Check if an endpoint already exists
2. **After implementing**: Add new endpoints to the appropriate section
3. **Include**: Method, path, auth requirements, request/response DTOs

---

## Base URL

- **Development**: `http://localhost:3000`
- **Production**: `https://api.yourdomain.com`

---

## Authentication

| Type | Header | Description |
|------|--------|-------------|
| JWT Bearer | `Authorization: Bearer <token>` | Required for protected endpoints |
| API Key | `X-API-Key: <key>` | For service-to-service calls |

---

## Response Format

### Success Response

```json
{
  "success": true,
  "data": { ... },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Error Response

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "details": { ... }
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Paginated Response

```json
{
  "success": true,
  "data": {
    "items": [ ... ],
    "meta": {
      "page": 1,
      "take": 10,
      "itemCount": 100,
      "pageCount": 10,
      "hasPreviousPage": false,
      "hasNextPage": true
    }
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

---

## Endpoints by Module

### Auth Module (`/auth`)

| Method | Endpoint | Handler | Auth | Request DTO | Response DTO | Description |
|--------|----------|---------|------|-------------|--------------|-------------|
| POST | /auth/login | login | Public | LoginDto | TokenResponseDto | User login |
| POST | /auth/register | register | Public | RegisterDto | UserResponseDto | User registration |
| POST | /auth/refresh | refresh | JWT | RefreshTokenDto | TokenResponseDto | Refresh access token |
| POST | /auth/logout | logout | JWT | - | - | Logout user |

### User Module (`/users`)

| Method | Endpoint | Handler | Auth | Request DTO | Response DTO | Description |
|--------|----------|---------|------|-------------|--------------|-------------|
| _Add endpoints here_ | | | | | | |

---

## Common Query Parameters

### Pagination

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | number | 1 | Page number (1-indexed) |
| `take` | number | 10 | Items per page (max: 100) |
| `order` | 'ASC' \| 'DESC' | 'DESC' | Sort order |

### Filtering

| Parameter | Type | Description |
|-----------|------|-------------|
| `search` | string | Search keyword |
| `status` | string | Filter by status |
| `startDate` | ISO date | Filter from date |
| `endDate` | ISO date | Filter to date |

---

## HTTP Status Codes

| Code | Meaning | When to Use |
|------|---------|-------------|
| 200 | OK | Successful GET, PATCH |
| 201 | Created | Successful POST |
| 204 | No Content | Successful DELETE |
| 400 | Bad Request | Validation error |
| 401 | Unauthorized | Missing/invalid auth |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Duplicate resource |
| 422 | Unprocessable | Business logic error |
| 500 | Server Error | Unexpected error |

---

## Endpoint Template

When adding new endpoints, use this format:

```markdown
### [Module] Module (`/[base-path]`)

| Method | Endpoint | Handler | Auth | Request DTO | Response DTO | Description |
|--------|----------|---------|------|-------------|--------------|-------------|
| GET | /path | handlerName | JWT/Public/Admin | - | ResponseDto | Description |
| GET | /path/:id | handlerName | JWT | - | ResponseDto | Description |
| POST | /path | handlerName | JWT | CreateDto | ResponseDto | Description |
| PATCH | /path/:id | handlerName | JWT | UpdateDto | ResponseDto | Description |
| DELETE | /path/:id | handlerName | Admin | - | - | Description |
```

---

## Changelog

| Date | Endpoint | Change | Author |
|------|----------|--------|--------|
| _YYYY-MM-DD_ | `METHOD /path` | _Added/Modified/Removed_ | _Name/AI_ |
