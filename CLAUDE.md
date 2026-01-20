# NestJS Development Rules


##### ! Important #####
You Must To Do.
1. Before Implement, Ask user Question Many times (not edit)
2. Before Implement, Planinng Make a plan Must To do, Update Todos
3. Before Implement, Search Web, MCP For Latest Documents and refrences for todos. 
4. After Implement, Re-Factoring
5. After Implement, think it is a reasonable code.


##### ! Important #####

## 🎯 Core Principles
**MUST: Always seek better solutions** - If better approach exists, implement it using best practices.
**MUST: Write reusable, maintainable code** - Avoid "duct tape" solutions. Design for easy refactoring.
**MUST: Check existing implementations** - Search for existing code/patterns before creating new ones.

## 🔒 Type Safety Rules (CRITICAL)

### NEVER Use `any` Type
**FORBIDDEN**: Using `any` defeats type safety and causes runtime errors.

❌ **WRONG**:
```typescript
function process(data: any): any {  // ❌ FORBIDDEN
  return data;
}

class UserDto {
  static fromEntity(entity: any): UserDto {  // ❌ FORBIDDEN
    return new UserDto();
  }
}
```

✅ **CORRECT - Use Specific Types**:
```typescript
// Option 1: Specific entity type
class UserDto {
  static fromEntity(entity: UserEntity): UserDto {
    return new UserDto(entity.name, entity.email);
  }
}

// Option 2: Interface for duck typing
interface HasSymbolAndPrice {
  symbol: string;
  price: Decimal;
}

class PriceSnapshot {
  static fromEntity(entity: HasSymbolAndPrice): PriceSnapshot {
    return new PriceSnapshot(entity.symbol, entity.price);
  }
}

// Option 3: Generic constraints
function process<T extends BaseEntity>(data: T): ProcessedData<T> {
  return { processed: data };
}
```

### Type Hints Requirements
- **MUST**: Every function parameter/return MUST have type annotation
- **MUST**: Use `Type | null` or `Type | undefined` explicitly, never implicit
- **MUST**: Use `Array<T>` or `T[]` consistently (prefer `T[]`)
- **MUST**: Define interfaces for duck typing instead of `any`
- **MUST**: Enable strict TypeScript mode in `tsconfig.json`

### TypeScript Configuration
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictPropertyInitialization": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

## 🐦 TypeScript & NestJS Fundamentals

### Code Quality
- **MUST**: ESLint + Prettier, type annotations on ALL functions (no exceptions)
- **MUST**: async/await for all I/O operations
- **MUST**: Functions <50 lines, focused, single responsibility
- **MUST**: DTOs with class-validator for request/response validation
- **MUST**: Proper HTTP status codes (200, 201, 400, 404, 500)
- **MUST**: Descriptive names (no `x`, `tmp`, `data` without context)
- **MUST**: Use readonly for immutable properties
- **MUST**: Prefer const over let, never use var

### Performance
- **MUST**: Query optimization (select specific columns, indexes)
- **MUST**: Connection pooling (configured)
- **SHOULD**: Caching with `@nestjs/cache-manager`
- **SHOULD**: Pagination for list endpoints
- **SHOULD**: Monitor response times with interceptors

## 🗄️ TypeORM Type Safety

### CRITICAL: Use Proper Column Decorators
```typescript
// ✅ CORRECT
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Decimal } from 'decimal.js';

@Entity({ name: 'prices', schema: 'binance' })
export class PriceEntity {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ type: 'varchar', length: 20, nullable: false })
  @Index()
  symbol: string;

  @Column({ type: 'decimal', precision: 20, scale: 8, nullable: false, transformer: {
    to: (value: Decimal) => value.toString(),
    from: (value: string) => new Decimal(value)
  }})
  price: Decimal;

  @Column({ type: 'decimal', precision: 20, scale: 8, nullable: true, transformer: {
    to: (value: Decimal | null) => value?.toString() ?? null,
    from: (value: string | null) => value ? new Decimal(value) : null
  }})
  volume: Decimal | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}

// ❌ WRONG - No type annotations
@Entity()
export class PriceEntity {
  @PrimaryGeneratedColumn()
  id;  // ❌ No type
  
  @Column()
  symbol;  // ❌ No type
}
```

**Type Mapping**: 
- `number` → `@PrimaryGeneratedColumn()` or `@Column({ type: 'int' })`
- `string` → `@Column({ type: 'varchar' })`
- `boolean` → `@Column({ type: 'boolean' })`
- `Date` → `@Column({ type: 'timestamptz' })` or `@CreateDateColumn()`
- `Decimal` → `@Column({ type: 'decimal' })` with transformer
- Nullable → `Type | null` + `nullable: true`

## 📋 Entity Inheritance Rules

### CRITICAL: Check Database Schema First
**BEFORE creating/modifying ANY entity:**
```bash
psql -d your_database -c "\d binance.table_name"
```

### Rule: Choose Correct Base Class
**Has `created_at`/`updated_at`:**
```typescript
import { CreateDateColumn, UpdateDateColumn } from 'typeorm';

export abstract class BaseEntity {
  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}

@Entity({ name: 'users', schema: 'binance' })
export class UserEntity extends BaseEntity {  // ✅ Includes timestamps
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  email: string;
}
```

**NO timestamps:**
```typescript
@Entity({ name: 'lookup_table', schema: 'binance' })
export class LookupEntity {  // ✅ No base class, no timestamps
  // NOTE: No created_at/updated_at in DB
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  code: string;
}
```

**Error**: Using `BaseEntity` without timestamps → `QueryFailedError: column "created_at" does not exist`

### New Table Creation
**MUST** include timestamps:
```sql
CREATE TABLE binance.your_table (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

## 🏗️ Repository Layer Pattern

### CRITICAL: Repositories Return DTOs, NEVER Entities

**Flow**: `Controller→Service→Repository→DB` all use `DTOs`

### MUST: Use Repository Pattern with Dependency Injection
```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class PriceRepository {
  constructor(
    @InjectRepository(PriceEntity)
    private readonly repository: Repository<PriceEntity>,
  ) {}

  async findById(id: number): Promise<PriceDto | null> {
    const entity = await this.repository.findOne({ where: { id } });
    return entity ? this.toDto(entity) : null;
  }

  async findAll(limit: number = 100): Promise<PriceDto[]> {
    const entities = await this.repository.find({ take: limit });
    return entities.map(entity => this.toDto(entity));
  }

  async create(createDto: CreatePriceDto): Promise<PriceDto> {
    const entity = this.repository.create(createDto);
    const saved = await this.repository.save(entity);
    return this.toDto(saved);
  }

  async update(id: number, updateDto: UpdatePriceDto): Promise<PriceDto | null> {
    await this.repository.update(id, updateDto);
    return this.findById(id);
  }

  async delete(id: number): Promise<boolean> {
    const result = await this.repository.delete(id);
    return result.affected > 0;
  }

  private toDto(entity: PriceEntity): PriceDto {
    return PriceDto.fromEntity(entity);
  }
}
```

### MUST: Return DTOs from Custom Methods
```typescript
async findBySymbol(symbol: string): Promise<PriceDto | null> {
  const entity = await this.repository.findOne({ 
    where: { symbol },
  });
  return entity ? this.toDto(entity) : null;
}
```

### DTO Conversion Patterns

**Pattern 1: Simple fromEntity method**
```typescript
export class PriceDto {
  id: number;
  symbol: string;
  price: Decimal;
  createdAt: Date;

  static fromEntity(entity: PriceEntity): PriceDto {
    const dto = new PriceDto();
    dto.id = entity.id;
    dto.symbol = entity.symbol;
    dto.price = entity.price;
    dto.createdAt = entity.createdAt;
    return dto;
  }
}
```

**Pattern 2: Custom transformations**
```typescript
export class PriceDto {
  id: number;
  symbol: string;
  price: Decimal;
  priceUsd: Decimal;
  createdAt: string;  // ISO string

  static fromEntity(entity: PriceEntity, usdRate: Decimal = new Decimal(1)): PriceDto {
    const dto = new PriceDto();
    dto.id = entity.id;
    dto.symbol = entity.symbol;
    dto.price = entity.price;
    dto.priceUsd = entity.price.mul(usdRate);  // Calculate
    dto.createdAt = entity.createdAt.toISOString();  // Transform
    return dto;
  }
}
```

**Pattern 3: Snapshot (NO any TYPE)**
```typescript
interface PriceEntityProtocol {
  symbol: string;
  price: Decimal;
  volume: Decimal;
}

export class PriceSnapshot {
  readonly symbol: string;
  readonly price: Decimal;
  readonly volume: Decimal;

  constructor(symbol: string, price: Decimal, volume: Decimal) {
    this.symbol = symbol;
    this.price = price;
    this.volume = volume;
  }

  static fromEntity(entity: PriceEntityProtocol): PriceSnapshot {
    return new PriceSnapshot(entity.symbol, entity.price, entity.volume);
  }
}

export class PriceResponseDto {
  symbol: string;
  price: Decimal;
  volume: Decimal;
  totalValue: Decimal;

  static fromSnapshot(snapshot: PriceSnapshot): PriceResponseDto {
    const dto = new PriceResponseDto();
    dto.symbol = snapshot.symbol;
    dto.price = snapshot.price;
    dto.volume = snapshot.volume;
    dto.totalValue = snapshot.price.mul(snapshot.volume);
    return dto;
  }
}

// In repository:
private toDto(entity: PriceEntity): PriceResponseDto {
  const snapshot = PriceSnapshot.fromEntity(entity);
  return PriceResponseDto.fromSnapshot(snapshot);
}
```

### Anti-Patterns
❌ `async getUser(id: number): Promise<UserEntity>` // WRONG - returns entity
✅ `async getUser(id: number): Promise<UserDto | null>` // CORRECT - returns DTO

## 📊 DTO Design

**Request DTOs with Validation:**
```typescript
import { IsString, IsNumber, IsOptional, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePriceDto {
  @IsString()
  symbol: string;

  @IsNumber()
  @Type(() => Number)
  @Min(0)
  price: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  volume?: number;
}
```

**Response DTOs:**
```typescript
import { Exclude, Expose } from 'class-transformer';

export class UserDto {
  @Expose()
  id: number;

  @Expose()
  email: string;

  @Exclude()
  password: string;  // Never expose

  @Expose()
  createdAt: Date;

  static fromEntity(entity: UserEntity): UserDto {
    const dto = new UserDto();
    dto.id = entity.id;
    dto.email = entity.email;
    dto.password = entity.password;
    dto.createdAt = entity.createdAt;
    return dto;
  }
}
```

**Snapshot + Response Pattern:**
```typescript
export class PriceSnapshot {
  readonly symbol: string;
  readonly price: Decimal;

  static fromEntity(entity: PriceEntity): PriceSnapshot {
    return new PriceSnapshot();
  }
}

export class PriceResponseDto {
  symbol: string;
  price: Decimal;
  totalValue: Decimal;  // Calculated field

  static fromSnapshot(snapshot: PriceSnapshot, multiplier: Decimal): PriceResponseDto {
    const dto = new PriceResponseDto();
    dto.symbol = snapshot.symbol;
    dto.price = snapshot.price;
    dto.totalValue = snapshot.price.mul(multiplier);
    return dto;
  }
}
```

## 🎨 Pattern Selection

| Use Case | Pattern | Example |
|----------|---------|---------|
| Simple CRUD | Repository + fromEntity | UserRepository |
| Transformations | Custom fromEntity | Date formatting, currency conversion |
| Calculated fields | Snapshot + Response | Total value calculation |
| Type safety | Interface + Snapshot | Multi-entity aggregation |

## ✅ Benefits
1. **Type Safety**: Catch errors at compile time
2. **API Contract**: DTOs define contracts
3. **Prevents Leakage**: TypeORM entities contained
4. **Testing**: Mock with DTOs/interfaces
5. **Migration Safety**: Entity changes don't break API
6. **Security**: No sensitive field exposure

## 🗃️ Database Best Practices
- **MUST**: TypeORM with separate DTOs (Create/Update/Response), migrations, indexes on queried columns
- **MUST**: Use QueryBuilder for complex queries with explicit column selection
- **MUST**: Enable `synchronize: false` in production
- **SHOULD**: Transactions for multi-step operations
- **SHOULD**: Connection pooling configured
- **SHOULD**: Use `select()` with specific columns

### Query Optimization Example:
```typescript
// ✅ CORRECT - Select specific columns
async findBySymbol(symbol: string): Promise<PriceDto | null> {
  const entity = await this.repository
    .createQueryBuilder('price')
    .select(['price.id', 'price.symbol', 'price.price'])
    .where('price.symbol = :symbol', { symbol })
    .getOne();
  
  return entity ? this.toDto(entity) : null;
}

// ❌ WRONG - Loads all columns and relations
async findBySymbol(symbol: string): Promise<PriceDto | null> {
  const entity = await this.repository.findOne({ where: { symbol } });
  return entity ? this.toDto(entity) : null;
}
```

## 🚀 NestJS Architecture

### Module Structure
```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [TypeOrmModule.forFeature([PriceEntity])],
  controllers: [PriceController],
  providers: [PriceService, PriceRepository],
  exports: [PriceService],  // Export if used in other modules
})
export class PriceModule {}
```

### Service Layer
```typescript
import { Injectable } from '@nestjs/common';

@Injectable()
export class PriceService {
  constructor(private readonly priceRepository: PriceRepository) {}

  async getPrice(id: number): Promise<PriceDto | null> {
    return this.priceRepository.findById(id);
  }

  async createPrice(createDto: CreatePriceDto): Promise<PriceDto> {
    // Business logic here
    return this.priceRepository.create(createDto);
  }
}
```

### Controller Layer
```typescript
import { Controller, Get, Post, Body, Param, HttpStatus, HttpCode } from '@nestjs/common';
import { ApiTags, ApiResponse, ApiOperation } from '@nestjs/swagger';

@ApiTags('prices')
@Controller('api/v1/prices')
export class PriceController {
  constructor(private readonly priceService: PriceService) {}

  @Get(':id')
  @ApiOperation({ summary: 'Get price by ID' })
  @ApiResponse({ status: 200, description: 'Price found', type: PriceDto })
  @ApiResponse({ status: 404, description: 'Price not found' })
  async getPrice(@Param('id') id: number): Promise<PriceDto> {
    const price = await this.priceService.getPrice(id);
    if (!price) {
      throw new NotFoundException(`Price with ID ${id} not found`);
    }
    return price;
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create new price' })
  @ApiResponse({ status: 201, description: 'Price created', type: PriceDto })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  async createPrice(@Body() createDto: CreatePriceDto): Promise<PriceDto> {
    return this.priceService.createPrice(createDto);
  }
}
```

## 🔧 Additional Best Practices

### Dependency Injection
- **MUST**: Use constructor injection
- **MUST**: Declare dependencies in module providers
- **NEVER**: Use service locator pattern

### Exception Handling
```typescript
import { HttpException, HttpStatus } from '@nestjs/common';

// Use built-in exceptions
throw new NotFoundException('Resource not found');
throw new BadRequestException('Invalid input');
throw new UnauthorizedException('Access denied');

// Custom exceptions
export class InsufficientFundsException extends HttpException {
  constructor() {
    super('Insufficient funds', HttpStatus.PAYMENT_REQUIRED);
  }
}
```

### Interceptors for Transformation
```typescript
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { classToPlain } from 'class-transformer';

@Injectable()
export class TransformInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map(data => classToPlain(data))  // Applies @Exclude decorators
    );
  }
}
```

### Global Validation Pipe
```typescript
// In main.ts
import { ValidationPipe } from '@nestjs/common';

app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,  // Strip properties not in DTO
    forbidNonWhitelisted: true,  // Throw error on extra properties
    transform: true,  // Auto-transform to DTO instances
    transformOptions: {
      enableImplicitConversion: true,
    },
  }),
);
```

### API Versioning
- **SHOULD**: Use URI versioning (`/api/v1/`)
- **SHOULD**: Use @nestjs/swagger for API documentation

### Additional Requirements
- **MUST**: CORS configuration
- **SHOULD**: Rate limiting with @nestjs/throttler
- **SHOULD**: Logging with built-in Logger or Winston
- **SHOULD**: Health checks with @nestjs/terminus
- **SHOULD**: Configuration management with @nestjs/config
