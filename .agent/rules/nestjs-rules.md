---
trigger: always_on
---

# NestJS Development Rules


##### ! Important #####
You Must To Do.
1. Before Implement, Ask user Question Many times (not edit)
2. Before Implement, Planinng Make a plan Must To do, Update Todos
3. Before Implement, Search Web, MCP For Latest Documents and refrences for todos. 

## 🎯 Core Principles
**MUST: Seek better solutions** - Implement best practices when better approaches exist.
**MUST: Write reusable code** - Design for easy refactoring, avoid "duct tape" solutions.
**MUST: Check existing patterns** - Search before creating new implementations.

## 🔒 Type Safety (CRITICAL)

### NEVER Use `any`
**FORBIDDEN**: `any` defeats type safety, causes runtime errors.

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

## 🐦 Fundamentals

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
```

**Type Mapping**: 
- `number` → `@PrimaryGeneratedColumn()` or `@Column({ type: 'int' })`
- `string` → `@Column({ type: 'varchar' })`
- `boolean` → `@Column({ type: 'boolean' })`
- `Date` → `@Column({ type: 'timestamptz' })` or `@CreateDateColumn()`
- `Decimal` → `@Column({ type: 'decimal' })` with transformer
- Nullable → `Type | null` + `nullable: true`

## 📋 Entity Inheritance

### CRITICAL: Check Database Schema First
**BEFORE creating/modifying ANY entity:**
```bash
psql -d your_database -c "\d binance.table_name"
```

### Rule: Choose Correct Base Class
**Has `created_at`/`updated_at`:**
```typescript
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
export class LookupEntity {  // ✅ No base class
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  code: string;
}
```

**Error**: Using `BaseEntity` without timestamps → `QueryFailedError: column "created_at" does not exist`

## 🏗️ Repository Pattern

### CRITICAL: Return DTOs, NEVER Entities
**Flow**: `Controller→Service→Repository→DB` uses DTOs

```typescript
@Injectable()
export class PriceRepository {
  constructor(@InjectRepository(PriceEntity) private repo: Repository<PriceEntity>) {}
  
  async findById(id: number): Promise<PriceDto | null> {
    const entity = await this.repo.findOne({ where: { id } });
    return entity ? this.toDto(entity) : null;
  }
  
  async findAll(limit: number = 100): Promise<PriceDto[]> {
    const entities = await this.repo.find({ take: limit });
    return entities.map(entity => this.toDto(entity));
  }
  
  async create(dto: CreatePriceDto): Promise<PriceDto> {
    const entity = this.repo.create(dto);
    const saved = await this.repo.save(entity);
    return this.toDto(saved);
  }
  
  async update(id: number, dto: UpdatePriceDto): Promise<PriceDto | null> {
    await this.repo.update(id, dto);
    return this.findById(id);
  }
  
  async delete(id: number): Promise<boolean> {
    const result = await this.repo.delete(id);
    return result.affected > 0;
  }
  
  private toDto(entity: PriceEntity): PriceDto {
    return PriceDto.fromEntity(entity);
  }
}
```

### Custom Query Methods
```typescript
async findBySymbol(symbol: string): Promise<PriceDto | null> {
  const entity = await this.repo.findOne({ where: { symbol } });
  return entity ? this.toDto(entity) : null;
}

async findRecent(limit: number = 10): Promise<PriceDto[]> {
  const entities = await this.repo.find({
    order: { createdAt: 'DESC' },
    take: limit
  });
  return entities.map(e => this.toDto(e));
}
```

### DTO Patterns

**Pattern 1: Simple fromEntity**
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

**Pattern 2: With Transformations**
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

**Pattern 3: Snapshot (NO any)**
```typescript
interface PriceProto {
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

  static fromEntity(entity: PriceProto): PriceSnapshot {
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
```

### Anti-Patterns
❌ `async getUser(id: number): Promise<UserEntity>` // WRONG - returns entity
✅ `async getUser(id: number): Promise<UserDto | null>` // CORRECT - returns DTO

## 📊 DTO Design

**Request**:
```typescript
export class CreatePriceDto {
  @IsString() symbol: string;
  @IsNumber() @Type(() => Number) @Min(0) price: number;
  @IsOptional() @IsNumber() volume?: number;
}
```

**Response**:
```typescript
export class UserDto {
  @Expose() id: number;
  @Expose() email: string;
  @Exclude() password: string;
  static fromEntity(e: UserEntity): UserDto {...}
}
```

## 🎨 Pattern Selection
| Use Case | Pattern | Example |
|----------|---------|---------|
| Simple CRUD | fromEntity | UserRepository |
| Transformations | Custom fromEntity | Date/currency conversion |
| Calculated fields | Snapshot+Response | Total value calc |
| Type safety | Interface+Snapshot | Multi-entity aggregation |

## ✅ Benefits
Type safety, API contracts, prevents leakage, testable, migration-safe, secure

## 🗃️ Database

- **MUST**: Separate DTOs, migrations, indexes, QueryBuilder for complex queries, `synchronize: false` in prod
- **SHOULD**: Transactions, connection pooling, select specific columns

```typescript
// ✅ Optimized
async findBySymbol(symbol: string): Promise<PriceDto | null> {
  const e = await this.repo.createQueryBuilder('p')
    .select(['p.id', 'p.symbol', 'p.price'])
    .where('p.symbol = :symbol', { symbol }).getOne();
  return e ? this.toDto(e) : null;
}
```

## 🚀 Architecture

### Module
```typescript
@Module({
  imports: [TypeOrmModule.forFeature([PriceEntity])],
  controllers: [PriceController],
  providers: [PriceService, PriceRepository],
  exports: [PriceService]
})
export class PriceModule {}
```

### Service
```typescript
@Injectable()
export class PriceService {
  constructor(private repo: PriceRepository) {}
  async getPrice(id: number): Promise<PriceDto | null> {
    return this.repo.findById(id);
  }
}
```

### Controller
```typescript
@ApiTags('prices') @Controller('api/v1/prices')
export class PriceController {
  constructor(private service: PriceService) {}
  
  @Get(':id') @ApiResponse({ status: 200, type: PriceDto })
  async getPrice(@Param('id') id: number): Promise<PriceDto> {
    const price = await this.service.getPrice(id);
    if (!price) throw new NotFoundException(`Price ${id} not found`);
    return price;
  }
  
  @Post() @HttpCode(HttpStatus.CREATED)
  async createPrice(@Body() dto: CreatePriceDto): Promise<PriceDto> {
    return this.service.createPrice(dto);
  }
}
```

## 🔧 Best Practices

### Dependency Injection
- **MUST**: Constructor injection, declare in module providers
- **NEVER**: Service locator pattern

### Exceptions
```typescript
throw new NotFoundException('Not found');
throw new BadRequestException('Invalid');
export class InsufficientFundsException extends HttpException {
  constructor() { super('Insufficient funds', HttpStatus.PAYMENT_REQUIRED); }
}
```

### Interceptors
```typescript
@Injectable()
export class TransformInterceptor implements NestInterceptor {
  intercept(ctx: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(map(data => classToPlain(data)));
  }
}
```

### Additional
- **MUST**: CORS configuration
- **SHOULD**: Rate limiting, logging, health checks, config management, API versioning (`/api/v1/`), Swagger docs