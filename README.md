# Common API Platform

Multi-tenant B2B API platform providing Identity, Wallet, Billing, and Jobs services.

## Architecture

- **Host-based Multi-tenancy**: `api.appA.com` → `app_id=A`
- **Modules**: Identity/Auth, Wallet, Billing, Jobs, Admin, Platform
- **Database**: PostgreSQL with TypeORM
- **Key Features**:
  - Idempotency-first for financial operations
  - Append-only wallet ledger
  - FIFO lot expiry for points
  - HMAC-signed callbacks
  - RBAC with app-scoped and platform-scoped roles

## Quick Start

### 1. Prerequisites

- Node.js v20+ or v22+ (LTS recommended)
- Docker & Docker Compose
- PostgreSQL 15 (via Docker)

### 2. Installation

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Update .env with your configuration
```

### 3. Start Database

```bash
# Start PostgreSQL via Docker
docker-compose up -d

# Verify database is running
docker-compose ps
```

### 4. Run Migrations

```bash
# Run all migrations
npm run migration:run

# To revert last migration
npm run migration:revert
```

### 5. Start Development Server

```bash
# Development mode with hot reload
npm run start:dev

# Production mode
npm run build
npm run start:prod
```

### 6. Access Swagger UI

Open [http://localhost:8000/api-docs](http://localhost:8000/api-docs) to view the API documentation.

## Project Structure

```
src/
├── common/              # Cross-cutting concerns
│   ├── decorators/      # Custom decorators (@AppId, @CurrentUser, etc.)
│   ├── filters/         # Exception filters
│   ├── guards/          # Auth guards (JWT, RBAC, App-ID validation)
│   ├── interceptors/    # Response wrappers, request ID
│   ├── middleware/      # Tenancy middleware
│   └── services/        # Idempotency service
├── config/              # Configuration modules
├── database/            # Database layer
│   ├── entities/        # TypeORM entities
│   └── migrations/      # Database migrations
├── modules/             # Feature modules
│   ├── auth/            # Authentication (Magic Link, OAuth)
│   ├── user/            # User profile (/v1/me)
│   ├── wallet/          # Wallet operations (credit, debit, ledger)
│   ├── billing/         # Products, orders, refunds
│   ├── jobs/            # Retry platform with callbacks
│   ├── admin/           # Admin operations
│   └── platform/        # Platform management (super admin)
└── internal/            # Internal endpoints (job runner)
```

## Key Concepts

### Multi-Tenancy

The system uses host-based tenancy resolution:
- Request arrives at `api.appA.com`
- `TenancyMiddleware` resolves `app_id` from host
- All subsequent operations scoped to that `app_id`

### Idempotency

All financial operations require `X-Idempotency-Key` header:
- Prevents duplicate transactions
- Same key + same request = same response (cached)
- Same key + different request = `IDEMPOTENCY_KEY_REUSE` error

### Wallet System

- **Ledger**: Append-only transaction log
- **Lots**: Point allocations with optional expiry
- **Balance**: Snapshot for performance
- **FIFO Consumption**: Points consumed by earliest expiry date

### Jobs Platform

- **CALLBACK_HTTP**: Retry failed app callbacks with exponential backoff
- **HMAC Signatures**: Secure callback verification
- **SELECT FOR UPDATE SKIP LOCKED**: Concurrent job processing

## API Endpoints

### Authentication
- `POST /v1/auth/magic-link/request` - Request magic link
- `POST /v1/auth/magic-link/verify` - Verify token & login
- `POST /v1/auth/refresh` - Refresh access token
- `POST /v1/auth/logout` - Logout (revoke refresh token)

### User Profile
- `GET /v1/me` - Get current user
- `PATCH /v1/me` - Update profile
- `DELETE /v1/me` - Soft delete account

### Wallet
- `POST /v1/wallet/credits` - Credit points (requires X-Idempotency-Key)
- `POST /v1/wallet/debits` - Debit points (requires X-Idempotency-Key)
- `GET /v1/wallet/balance` - Get balance
- `GET /v1/wallet/ledger` - Get ledger with cursor pagination

### Billing
- `GET /v1/products` - List products
- `POST /v1/orders` - Create order (requires X-Idempotency-Key)
- `POST /v1/orders/:id/refund` - Refund order

### Admin
- `POST /v1/admin/users/:id/suspend` - Suspend user
- `POST /v1/admin/wallet/adjust` - Adjust wallet balance
- `GET /v1/admin/jobs` - List jobs
- `POST /v1/admin/jobs/:id/retry` - Retry failed job

### Platform (Super Admin)
- `GET /v1/platform/apps` - List apps
- `POST /v1/platform/apps` - Create app
- `PATCH /v1/platform/apps/:id` - Update app

## Development

### Generate Migration

```bash
npm run migration:generate -- src/database/migrations/MigrationName
```

### Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

### Linting & Formatting

```bash
# Lint
npm run lint

# Format
npm run format
```

## Environment Variables

See [.env.example](.env.example) for all available configuration options.

## Documentation

- [Architecture](docs/architecture.md) - System design and module boundaries
- [API Specification](docs/apis.md) - Detailed API contracts
- [OpenAPI Spec](docs/openapi.yaml) - Machine-readable API spec

## License

MIT
# common-api
