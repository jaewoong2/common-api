# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Running the Application

```bash
# Local development with hot reload
npm run start:dev

# Production mode
npm run start:prod

# Docker development
docker-compose up --build

# AWS Lambda deployment (if using serverless)
npm run deploy
```

### Testing

```bash
# Run all tests (Jest)
npm run test

# Run specific test file
npm run test -- --testPathPattern=web-search.repository.spec.ts

# Run tests with coverage
npm run test:cov

# Run e2e tests
npm run test:e2e
```

### Database Operations

```bash
# The application uses PostgreSQL with TypeORM
# Connection configured via environment variables in .env

# Generate migration from entity changes
npm run migration:generate -- src/migrations/MigrationName

# Run migrations
npm run migration:run

# Revert last migration
npm run migration:revert

# Schema: crypto (as defined in entities)
```

### Key Configuration

- Environment variables loaded from `.env` via `@nestjs/config`
- Database connection pooling with retry logic via TypeORM
- CORS configured for development and production origins
- Logging configured via NestJS Logger (AWS Lambda compatible)

## Backend Performance

- MUST: Use async/await for I/O operations
- MUST: Implement database query optimization with QueryBuilder
- SHOULD: Use caching with `@nestjs/cache-manager` for expensive operations
- SHOULD: Implement pagination for large datasets
- SHOULD: Monitor API response times with interceptors

## TypeScript/NestJS Rules - General Principles

- MUST: Enable strict mode in tsconfig.json
- MUST: Use type annotations for all function parameters and return values
- MUST: Use async/await for I/O operations
- SHOULD: Use descriptive variable and function names
- SHOULD: Keep functions small and focused
- SHOULD: Use readonly where applicable

## NestJS Specific

- MUST: Use DTOs (Data Transfer Objects) with class-validator for request validation
- MUST: Use dependency injection via constructor
- MUST: Define proper HTTP status codes with `@HttpCode()` decorator
- MUST: Use proper exception handling with built-in exceptions (NotFoundException, BadRequestException, etc.)
- SHOULD: Group related endpoints in separate module files
- SHOULD: Use `@ApiResponse()` decorators for Swagger documentation

## Database & Entities

- MUST: Use TypeORM with async repository pattern
- MUST: Define separate DTOs for create/update/response operations
- MUST: Use proper database migrations with TypeORM CLI
- SHOULD: Use database transactions with QueryRunner for data consistency
- SHOULD: Implement proper database indexing with `@Index()` decorator

### ⚠️ CRITICAL: Entity Inheritance Rules

**BEFORE creating or modifying ANY TypeORM entity, CHECK if the database table has `created_at` and `updated_at` columns!**

#### Rule 1: Check Database Schema First

```bash
# ALWAYS verify table schema before writing entity code
psql -d your_database -c "\d crypto.table_name"
```

#### Rule 2: Choose Correct Base Class

**If table HAS `created_at` and `updated_at` columns:**

```typescript
import { BaseEntity } from "./base.entity";
import { Entity, Column } from "typeorm";

@Entity({ name: "your_table", schema: "crypto" })
export class YourEntity extends BaseEntity {
  // ✅ CORRECT - includes timestamps
  @Column()
  name: string;
  // ... your fields
}
```

**If table DOES NOT HAVE `created_at` and `updated_at` columns:**

```typescript
import { Entity, Column, PrimaryGeneratedColumn } from "typeorm";

@Entity({ name: "your_table", schema: "crypto" })
export class YourEntity {
  // ✅ CORRECT - no timestamps
  /**
   * NOTE: This entity does NOT extend BaseEntity because the database table
   * does not have created_at/updated_at columns.
   */
  @PrimaryGeneratedColumn("increment", { type: "bigint" })
  id: number;

  @Column()
  name: string;
  // ... your fields
}
```

#### Rule 3: Base Entity Definition

```typescript
// src/common/entities/base.entity.ts
import {
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";

export abstract class BaseEntity {
  @PrimaryGeneratedColumn("increment", { type: "bigint" })
  id: number;

  @CreateDateColumn({
    name: "created_at",
    type: "timestamptz",
    default: () => "NOW()",
  })
  createdAt: Date;

  @UpdateDateColumn({
    name: "updated_at",
    type: "timestamptz",
    default: () => "NOW()",
  })
  updatedAt: Date;
}
```

#### Rule 4: Common Mistake Example

❌ **WRONG - This will cause "column does not exist" errors:**

```typescript
// Table in DB: crypto.tickers_reference (NO created_at/updated_at)
import { BaseEntity } from "./base.entity";

@Entity({ name: "tickers_reference", schema: "crypto" })
export class TickerReference extends BaseEntity {
  // ❌ WRONG!
  // BaseEntity adds created_at/updated_at automatically
  // But DB table doesn't have these columns
  // Result: QueryFailedError: column "created_at" does not exist
}
```

✅ **CORRECT:**

```typescript
@Entity({ name: "tickers_reference", schema: "crypto" })
export class TickerReference {
  // ✅ CORRECT
  /** No timestamps in DB table, so don't extend BaseEntity */
  @PrimaryGeneratedColumn()
  id: number;
}
```

#### Rule 5: When Creating New Tables

When YOU create a new table (via migration), ALWAYS include timestamps:

```typescript
// Migration file
export class CreateYourTable1234567890 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE crypto.your_table (
        id BIGSERIAL PRIMARY KEY,
        -- your columns here
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
  }
}
```

Then use `BaseEntity` in TypeScript:

```typescript
@Entity({ name: "your_table", schema: "crypto" })
export class YourEntity extends BaseEntity {
  // ✅ Table has timestamps
}
```

#### Rule 6: Verification Checklist

Before committing any new entity:

- [ ] Checked actual database table schema
- [ ] Verified if `created_at` and `updated_at` exist in DB
- [ ] Extended `BaseEntity` if timestamps exist, plain class if not
- [ ] Added JSDoc explaining inheritance choice
- [ ] Tested with actual database connection

#### Why This Matters

**Error you'll get if wrong:**

```
QueryFailedError: column your_table.created_at does not exist
```

**This breaks:**

- All queries involving the entity
- Repository operations
- Service layer calls
- API endpoints

## Repository Layer Pattern

**CRITICAL**: Repositories MUST return DTOs, NEVER raw TypeORM entities to controllers.

### Architecture Layers

```
┌─────────────────────────────────────────────────────────────┐
│                  Controller Layer (Routes)                  │
│  - Receives DTOs from services                             │
│  - Returns standardized response with DTO data             │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│                   Service Layer                             │
│  - Receives DTOs from repositories                         │
│  - Implements business logic                               │
│  - Returns DTOs to controllers                             │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│                Repository Layer (THIS IS KEY)               │
│  - Queries TypeORM entities from database                  │
│  - MUST convert entities to DTOs                           │
│  - NEVER return raw TypeORM entities                       │
│  - Returns type-safe DTOs                                  │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│                   Database Layer                            │
│  - TypeORM entities (internal only)                        │
│  - Never exposed outside repository                        │
└─────────────────────────────────────────────────────────────┘
```

### Repository Implementation Rules

#### MUST: Use Custom Repository Pattern

```typescript
// src/modules/your-module/repositories/your.repository.ts
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { YourEntity } from "../entities/your.entity";
import { YourResponseDto } from "../dto/your-response.dto";

@Injectable()
export class YourRepository {
  constructor(
    @InjectRepository(YourEntity)
    private readonly repository: Repository<YourEntity>
  ) {}

  async findById(id: number): Promise<YourResponseDto | null> {
    const entity = await this.repository.findOne({ where: { id } });
    return this.toDto(entity);
  }

  async findAll(): Promise<YourResponseDto[]> {
    const entities = await this.repository.find();
    return entities.map((entity) => this.toDto(entity));
  }

  // All methods return DTOs, NOT entities
  private toDto(entity: YourEntity | null): YourResponseDto | null {
    if (!entity) return null;
    return new YourResponseDto(entity);
  }
}
```

#### MUST: Return DTOs from Custom Methods

```typescript
async findByCustomField(fieldValue: string): Promise<YourResponseDto | null> {
  const entity = await this.repository.findOne({
    where: { customField: fieldValue },
  });
  return this.toDto(entity);
}
```

#### MUST: Use DTO Conversion Methods

**Option 1: Constructor-based Conversion (Simple Cases)**

```typescript
// src/modules/your-module/dto/your-response.dto.ts
export class YourResponseDto {
  id: number;
  name: string;
  createdAt: string;

  constructor(entity: YourEntity) {
    this.id = entity.id;
    this.name = entity.name;
    this.createdAt = entity.createdAt.toISOString();
  }
}
```

**Option 2: Static Factory Method (Complex Cases)**

```typescript
export class YourResponseDto {
  id: number;
  name: string;
  calculatedField: number;

  static fromEntity(entity: YourEntity): YourResponseDto {
    const dto = new YourResponseDto();
    dto.id = entity.id;
    dto.name = entity.name;
    dto.calculatedField = entity.fieldA + entity.fieldB;
    return dto;
  }
}
```

**Option 3: class-transformer (Declarative)**

```typescript
import { Expose, Transform, plainToInstance } from "class-transformer";

export class YourResponseDto {
  @Expose()
  id: number;

  @Expose()
  name: string;

  @Expose()
  @Transform(({ obj }) => obj.fieldA + obj.fieldB)
  calculatedField: number;

  static fromEntity(entity: YourEntity): YourResponseDto {
    return plainToInstance(YourResponseDto, entity, {
      excludeExtraneousValues: true,
    });
  }
}
```

### DTO Design Patterns

#### Pattern 1: Direct Entity Mapping

```typescript
// src/modules/simple/dto/simple-response.dto.ts
export class SimpleResponseDto {
  id: number;
  name: string;
  createdAt: Date;

  constructor(entity: SimpleEntity) {
    Object.assign(this, {
      id: entity.id,
      name: entity.name,
      createdAt: entity.createdAt,
    });
  }
}
```

#### Pattern 2: Separate Create/Update/Response DTOs

```typescript
// create-user.dto.ts
import { IsEmail, IsString, MinLength } from "class-validator";

export class CreateUserDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsEmail()
  email: string;
}

// update-user.dto.ts
import { PartialType } from "@nestjs/mapped-types";

export class UpdateUserDto extends PartialType(CreateUserDto) {}

// user-response.dto.ts
export class UserResponseDto {
  id: number;
  name: string;
  email: string;
  createdAt: string;

  constructor(entity: UserEntity) {
    this.id = entity.id;
    this.name = entity.name;
    this.email = entity.email;
    this.createdAt = entity.createdAt.toISOString();
  }
}
```

### Common Patterns by Use Case

| Use Case              | Pattern                    | Example                                          |
| --------------------- | -------------------------- | ------------------------------------------------ |
| Simple CRUD           | Constructor DTO            | UserRepository, CooldownRepository               |
| Field transformations | Static factory method      | PriceRepository (date.toISOString())             |
| Calculated fields     | Transform decorator        | RewardsRepository (available_stock calculation)  |
| Validation            | class-validator decorators | CreateUserDto, UpdateUserDto                     |
| Partial updates       | PartialType                | UpdateUserDto extends PartialType<CreateUserDto> |

### Anti-Patterns (NEVER DO THIS)

❌ **Returning TypeORM entities directly to controller**

```typescript
// repository
async getUser(id: number): Promise<UserEntity> {  // ❌ WRONG
  return this.repository.findOne({ where: { id } });
}

// controller
@Get(':id')
async getUser(@Param('id') id: number): Promise<UserEntity> {  // ❌ WRONG
  return this.userService.getUser(id);
}
```

✅ **Always return DTOs**

```typescript
// repository
async getUser(id: number): Promise<UserResponseDto | null> {  // ✅ CORRECT
  const entity = await this.repository.findOne({ where: { id } });
  return this.toDto(entity);
}

// controller
@Get(':id')
async getUser(@Param('id') id: number): Promise<UserResponseDto> {  // ✅ CORRECT
  return this.userService.getUser(id);
}
```

❌ **Using entities in service layer for mutation**

```typescript
// service.ts
const userEntity = await this.userRepo.findOneEntity(id); // ❌ If exposed
userEntity.email = "new@email.com"; // ❌ Direct entity manipulation
await this.userRepo.save(userEntity); // ❌ Bypasses DTO pattern
```

✅ **Using DTOs in service layer**

```typescript
// service.ts
const userDto = await this.userRepo.findById(id); // ✅ Returns DTO
const updatedDto = await this.userRepo.update(id, { email: "new@email.com" }); // ✅ Returns DTO
```

### Exception: Internal-Only Methods

Only use raw entities for internal repository methods (prefix with `_` or clearly document):

```typescript
/**
 * @internal - Returns entities for complex joins/calculations.
 * Public API methods should use findForDate() which returns DTOs.
 */
private async findEntitiesForDate(date: Date): Promise<ActiveUniverseEntity[]> {
  return this.repository.find({ where: { tradingDay: date } });
}

/** Public API - returns DTOs */
async findForDate(date: Date): Promise<UniverseItemDto[]> {
  const entities = await this.findEntitiesForDate(date);
  return entities.map((e) => this.toDto(e));
}
```

### Benefits of This Pattern

1. **Type Safety**: DTOs with class-validator validate all data at repository boundary
2. **API Contract**: DTOs define clear contracts, entities are implementation details
3. **Prevents Leakage**: TypeORM sessions and lazy-loading issues contained in repository
4. **Easier Testing**: Mock with DTOs instead of TypeORM entities
5. **Migration Safety**: Entity changes don't break API if DTO stays stable
6. **Security**: Prevents accidental exposure of sensitive entity fields
7. **Serialization Control**: DTOs control exactly what gets serialized to JSON

## Best Practices Reminders

- 내가 지시하는 것 보다 더 좋은 방향 (베스트 프랙티스)이 있으면 더 좋게 구현 할 것
- 덕지덕지 코드 말고, 재사용 가능 하며 베스트 프랙티스가 있는 방향으로 구현 할 것
- 리팩토링이 쉬운 코드로 구현 할 것
- 이미 구현 되어 있는 코드 및 기능이 있는지 찾아 볼 것

### TypeORM Entity Definition Rules

**MUST: Use Proper Column Decorators with Types**

```typescript
// ✅ CORRECT - Explicit types with decorators
import { Entity, Column, PrimaryGeneratedColumn, Index } from "typeorm";

@Entity({ name: "my_table", schema: "crypto" })
export class MyEntity {
  @PrimaryGeneratedColumn("increment", { type: "bigint" })
  id: number;

  @Column({ type: "varchar", length: 100, nullable: false })
  name: string;

  @Column({ type: "int", default: 0 })
  count: number;

  @Column({ type: "timestamptz", nullable: true })
  createdAt: Date | null;

  @Column({ type: "decimal", precision: 18, scale: 8, nullable: false })
  price: string; // Use string for decimal to avoid precision loss

  @Column({ type: "boolean", default: false })
  isActive: boolean;
}

// ❌ WRONG - Missing explicit types
@Entity()
export class MyEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column() // ❌ No type specified
  name: string;

  @Column() // ❌ No type specified
  count: number;
}
```

**Type Mapping Guidelines**

| PostgreSQL Type    | TypeORM Column Type              | TypeScript Type             |
| ------------------ | -------------------------------- | --------------------------- |
| BIGINT / BIGSERIAL | `'bigint'`                       | `number` or `string`        |
| INTEGER            | `'int'`                          | `number`                    |
| VARCHAR(n)         | `'varchar'` with length          | `string`                    |
| TEXT               | `'text'`                         | `string`                    |
| BOOLEAN            | `'boolean'`                      | `boolean`                   |
| TIMESTAMPTZ        | `'timestamptz'`                  | `Date`                      |
| DATE               | `'date'`                         | `Date` or `string`          |
| DECIMAL / NUMERIC  | `'decimal'` with precision/scale | `string` (recommended)      |
| JSONB              | `'jsonb'`                        | `object` or typed interface |

**Nullable Columns**

```typescript
// Nullable column - use union type
@Column({ type: 'varchar', length: 255, nullable: true })
description: string | null;

// Non-nullable column
@Column({ type: 'varchar', length: 100, nullable: false })
name: string;
```

**Index Decorators**

```typescript
@Entity({ name: "trades", schema: "crypto" })
@Index(["symbol", "tradedAt"]) // Composite index
export class TradeEntity {
  @PrimaryGeneratedColumn("increment", { type: "bigint" })
  id: number;

  @Index() // Single column index
  @Column({ type: "varchar", length: 20 })
  symbol: string;

  @Column({ type: "timestamptz" })
  tradedAt: Date;
}
```

**Benefits of Explicit Types**

- Prevents TypeORM from inferring incorrect column types
- Clear documentation of database schema in code
- Better IDE autocomplete and type checking
- Easier database migrations
- Avoids runtime type coercion issues
