# Database Schema

> ⚠️ **AI MUST UPDATE THIS FILE** when creating or modifying database tables/entities.

## How to Use This Document

1. **Before creating entity**: Check if table exists and verify columns
2. **After migration**: Update this document with schema changes
3. **Critical**: Check for `created_at`/`updated_at` before entity inheritance

---

## Database Configuration

- **Type**: PostgreSQL
- **Schema**: `crypto` (default)
- **Naming**: snake_case for tables and columns

---

## Schema Overview

```
crypto schema
├── users
├── roles
├── [other tables...]
└── migrations
```

---

## Tables

### users

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | BIGSERIAL | NO | auto | Primary key |
| name | VARCHAR(100) | NO | - | User's name |
| email | VARCHAR(255) | NO | - | Unique email |
| password | VARCHAR(255) | NO | - | Hashed password |
| status | VARCHAR(20) | NO | 'active' | User status |
| created_at | TIMESTAMPTZ | NO | NOW() | Creation time |
| updated_at | TIMESTAMPTZ | NO | NOW() | Last update time |

**Indexes:**
- `users_pkey` - PRIMARY KEY (id)
- `users_email_key` - UNIQUE (email)
- `idx_users_status_created` - INDEX (status, created_at)

**Entity extends**: `BaseEntity` ✅ (has timestamps)

---

### _table_name_template_

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | BIGSERIAL | NO | auto | Primary key |
| _column_name_ | _TYPE_ | _YES/NO_ | _default_ | _description_ |
| created_at | TIMESTAMPTZ | NO | NOW() | Creation time |
| updated_at | TIMESTAMPTZ | NO | NOW() | Last update time |

**Indexes:**
- _index_name_ - _type_ (_columns_)

**Entity extends**: `BaseEntity` ✅ or `None` ❌

**Relations:**
- _relation_type_ with _table_name_ via _column_

---

## Entity Inheritance Quick Reference

| Table | Has created_at/updated_at | Entity Extends |
|-------|---------------------------|----------------|
| users | ✅ Yes | BaseEntity |
| _add tables_ | | |

---

## Common Column Types

| PostgreSQL | TypeORM Column | TypeScript |
|------------|----------------|------------|
| BIGSERIAL | `'bigint'` with auto | `number` |
| INTEGER | `'int'` | `number` |
| VARCHAR(n) | `'varchar'` | `string` |
| TEXT | `'text'` | `string` |
| BOOLEAN | `'boolean'` | `boolean` |
| TIMESTAMPTZ | `'timestamptz'` | `Date` |
| DATE | `'date'` | `Date` \| `string` |
| DECIMAL(p,s) | `'decimal'` | `string` (recommended) |
| JSONB | `'jsonb'` | `Record<string, any>` |
| ENUM | `'enum'` | `enum` |

---

## Migration History

| Migration | Date | Description |
|-----------|------|-------------|
| _MigrationName1234567890_ | _YYYY-MM-DD_ | _Description_ |

---

## Verification Commands

```bash
# List all tables in schema
psql -d database -c "\dt crypto.*"

# Describe specific table
psql -d database -c "\d crypto.table_name"

# List all indexes
psql -d database -c "\di crypto.*"

# Check constraints
psql -d database -c "SELECT * FROM information_schema.table_constraints WHERE table_schema = 'crypto'"
```

---

## Adding New Table Checklist

- [ ] Create migration with proper schema (`crypto.table_name`)
- [ ] Include `created_at` and `updated_at` columns
- [ ] Add appropriate indexes
- [ ] Run migration
- [ ] Update this document
- [ ] Create entity (check inheritance!)
- [ ] Update `docs/FUNCTION_REGISTRY.md`
- [ ] Update `docs/MODULE_MAP.md`

---

## Table Template for New Tables

```sql
-- Migration: CreateTableName
CREATE TABLE crypto.table_name (
    id BIGSERIAL PRIMARY KEY,
    -- your columns
    name VARCHAR(100) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    metadata JSONB,
    
    -- foreign keys
    user_id BIGINT REFERENCES crypto.users(id),
    
    -- timestamps (ALWAYS include these)
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_table_name_status ON crypto.table_name(status);
CREATE INDEX idx_table_name_user_id ON crypto.table_name(user_id);
CREATE INDEX idx_table_name_created_at ON crypto.table_name(created_at DESC);
```

---

## Changelog

| Date | Table | Change | Migration |
|------|-------|--------|-----------|
| _YYYY-MM-DD_ | _table_name_ | _Added/Modified column_ | _MigrationName_ |
