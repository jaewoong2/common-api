# AGENTS.md

This file provides guidance to Codex Code (Codex.ai/code) when working with code in this repository.

## ⚠️ AI Assistant Critical Rules

### Before Writing ANY Code

```
┌─────────────────────────────────────────────────────────────────────────┐
│  🔍 STOP! CHECK THESE FIRST BEFORE IMPLEMENTING ANYTHING               │
├─────────────────────────────────────────────────────────────────────────┤
│  1. Check docs/FUNCTION_REGISTRY.md - Does this function exist?        │
│  2. Check docs/MODULE_MAP.md - Is there a module handling this?        │
│  3. Check src/common/ - Is there a shared utility for this?            │
│  4. Search codebase: "function name" or "similar keyword"              │
│  5. If exists → REUSE. If not → IMPLEMENT & DOCUMENT.                  │
└─────────────────────────────────────────────────────────────────────────┘
```

### Implementation Checklist

Before implementing new code, AI MUST:

- [ ] Search for existing implementations using keywords
- [ ] Check `docs/FUNCTION_REGISTRY.md` for similar functions
- [ ] Check `docs/MODULE_MAP.md` for responsible modules
- [ ] Check `src/common/` for reusable utilities
- [ ] If implementing new code → Update relevant docs/\*.md files

### After Implementation Checklist

After implementing new code, AI MUST:

- [ ] Update `docs/FUNCTION_REGISTRY.md` with new functions
- [ ] Update `docs/MODULE_MAP.md` if new module created
- [ ] Update `docs/API_ENDPOINTS.md` if new endpoint created
- [ ] Update `docs/DTO_SCHEMA.md` if new DTO created
- [ ] Add JSDoc comments to all public methods

---

## Development Commands

### Running the Application

```bash
# Local development with hot reload
npm run start:dev

# Debug mode
npm run start:debug

# Production mode
npm run start:prod

# Docker development
docker-compose up --build
```

### Testing

```bash
# Unit tests
npm run test

# Watch mode
npm run test:watch

# Coverage report
npm run test:cov

# E2E tests
npm run test:e2e

# Specific test file
npm run test -- --testPathPattern=user.service.spec.ts
```

### Database Operations

```bash
# Generate migration from entity changes
npm run migration:generate -- src/migrations/MigrationName

# Run pending migrations
npm run migration:run

# Revert last migration
npm run migration:revert

# Show migration status
npm run migration:show

# Sync schema (development only - NEVER in production)
npm run schema:sync
```

### Code Quality

```bash
# Lint
npm run lint

# Lint with auto-fix
npm run lint:fix

# Format with Prettier
npm run format

# Type check
npm run typecheck
```

---

## Project Structure (NestJS Convention)

```
src/
├── common/                    # 🔴 CHECK HERE FIRST for reusable code
│   ├── decorators/           # Custom decorators
│   ├── dto/                  # Shared DTOs (PageOptionsDto, etc.)
│   ├── entities/             # Base entities (BaseEntity, etc.)
│   ├── enums/                # Shared enums
│   ├── exceptions/           # Custom exceptions
│   ├── filters/              # Exception filters
│   ├── guards/               # Auth guards
│   ├── interceptors/         # Response interceptors
│   ├── interfaces/           # Shared interfaces
│   ├── pipes/                # Validation pipes
│   └── utils/                # Utility functions
├── config/                   # Configuration modules
├── modules/                  # Feature modules
│   └── [feature]/
│       ├── dto/
│       ├── entities/
│       ├── repositories/
│       ├── [feature].controller.ts
│       ├── [feature].service.ts
│       ├── [feature].module.ts
│       └── [feature].controller.spec.ts
├── app.module.ts
└── main.ts

docs/                         # 🔴 MUST UPDATE when adding features
├── FUNCTION_REGISTRY.md      # All functions with descriptions
├── MODULE_MAP.md             # Module responsibilities
├── API_ENDPOINTS.md          # All API endpoints
├── DTO_SCHEMA.md             # DTO definitions
└── DATABASE_SCHEMA.md        # Table structures
```

---

## Documentation Requirements

### docs/FUNCTION_REGISTRY.md Format

AI MUST update this file when creating new functions:

```markdown
# Function Registry

## Common Utilities (src/common/utils/)

| Function           | File         | Description          | Parameters                     | Return   | Example                     |
| ------------------ | ------------ | -------------------- | ------------------------------ | -------- | --------------------------- |
| `formatDate`       | date.util.ts | ISO date formatting  | `date: Date`                   | `string` | `formatDate(new Date())`    |
| `calculatePercent` | math.util.ts | Calculate percentage | `value: number, total: number` | `number` | `calculatePercent(50, 200)` |

## User Module (src/modules/user/)

| Function      | File               | Description        | Parameters      | Return                     | Example                        |
| ------------- | ------------------ | ------------------ | --------------- | -------------------------- | ------------------------------ |
| `findByEmail` | user.repository.ts | Find user by email | `email: string` | `Promise<UserDto \| null>` | `findByEmail('test@test.com')` |
```

### docs/MODULE_MAP.md Format

```markdown
# Module Map

| Module       | Path             | Responsibility            | Dependencies | Exports                        |
| ------------ | ---------------- | ------------------------- | ------------ | ------------------------------ |
| UserModule   | src/modules/user | User CRUD, authentication | AuthModule   | UserService                    |
| AuthModule   | src/modules/auth | JWT, guards               | UserModule   | JwtStrategy, AuthGuard         |
| CommonModule | src/common       | Shared utilities          | -            | All decorators, pipes, filters |
```

### docs/API_ENDPOINTS.md Format

```markdown
# API Endpoints

## User Module

| Method | Endpoint   | Controller     | Handler | Auth  | Description     |
| ------ | ---------- | -------------- | ------- | ----- | --------------- |
| GET    | /users     | UserController | findAll | JWT   | List all users  |
| GET    | /users/:id | UserController | findOne | JWT   | Get user by ID  |
| POST   | /users     | UserController | create  | Admin | Create new user |
| PATCH  | /users/:id | UserController | update  | Owner | Update user     |
| DELETE | /users/:id | UserController | remove  | Admin | Delete user     |
```

### docs/DTO_SCHEMA.md Format

```markdown
# DTO Schema Registry

## User DTOs

| DTO             | File                 | Usage            | Fields                                          |
| --------------- | -------------------- | ---------------- | ----------------------------------------------- |
| CreateUserDto   | create-user.dto.ts   | POST /users      | `name: string, email: string, password: string` |
| UpdateUserDto   | update-user.dto.ts   | PATCH /users/:id | `name?: string, email?: string`                 |
| UserResponseDto | user-response.dto.ts | Response         | `id, name, email, createdAt`                    |

## Pagination DTOs (Common)

| DTO            | File                | Usage              | Fields                                               |
| -------------- | ------------------- | ------------------ | ---------------------------------------------------- |
| PageOptionsDto | page-options.dto.ts | Query params       | `page: number, take: number, order: Order`           |
| PageMetaDto    | page-meta.dto.ts    | Response meta      | `page, take, itemCount, pageCount, hasPrev, hasNext` |
| PageDto<T>     | page.dto.ts         | Paginated response | `data: T[], meta: PageMetaDto`                       |
```

---

## NestJS Best Practices

### Module Organization

```typescript
// ✅ CORRECT - Feature module with clear boundaries
@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity]),
    forwardRef(() => AuthModule), // Handle circular deps
  ],
  controllers: [UserController],
  providers: [UserService, UserRepository],
  exports: [UserService], // Only export what's needed
})
export class UserModule {}
```

### Service Pattern

```typescript
// ✅ CORRECT - Service with proper error handling
@Injectable()
export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly eventEmitter: EventEmitter2 // For events
  ) {}

  async findOne(id: number): Promise<UserResponseDto> {
    const user = await this.userRepository.findById(id);

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user;
  }

  async create(dto: CreateUserDto): Promise<UserResponseDto> {
    // Check for existing
    const existing = await this.userRepository.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException("Email already exists");
    }

    const user = await this.userRepository.create(dto);

    // Emit event for side effects
    this.eventEmitter.emit("user.created", new UserCreatedEvent(user));

    return user;
  }
}
```

### Controller Pattern

```typescript
// ✅ CORRECT - Controller with proper decorators
@ApiTags("users")
@Controller("users")
@UseGuards(JwtAuthGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  @ApiOperation({ summary: "Get all users" })
  @ApiResponse({ status: 200, type: PageDto<UserResponseDto> })
  async findAll(
    @Query() pageOptionsDto: PageOptionsDto
  ): Promise<PageDto<UserResponseDto>> {
    return this.userService.findAll(pageOptionsDto);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get user by ID" })
  @ApiResponse({ status: 200, type: UserResponseDto })
  @ApiResponse({ status: 404, description: "User not found" })
  async findOne(
    @Param("id", ParseIntPipe) id: number
  ): Promise<UserResponseDto> {
    return this.userService.findOne(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles(Role.ADMIN)
  @UseGuards(RolesGuard)
  async create(@Body() dto: CreateUserDto): Promise<UserResponseDto> {
    return this.userService.create(dto);
  }

  @Patch(":id")
  @UseGuards(OwnerGuard)
  async update(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateUserDto
  ): Promise<UserResponseDto> {
    return this.userService.update(id, dto);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(Role.ADMIN)
  @UseGuards(RolesGuard)
  async remove(@Param("id", ParseIntPipe) id: number): Promise<void> {
    await this.userService.remove(id);
  }
}
```

### Repository Pattern

```typescript
// ✅ CORRECT - Repository returning DTOs
@Injectable()
export class UserRepository {
  constructor(
    @InjectRepository(UserEntity)
    private readonly repo: Repository<UserEntity>
  ) {}

  async findById(id: number): Promise<UserResponseDto | null> {
    const entity = await this.repo.findOne({ where: { id } });
    return entity ? UserResponseDto.fromEntity(entity) : null;
  }

  async findAll(options: PageOptionsDto): Promise<PageDto<UserResponseDto>> {
    const queryBuilder = this.repo.createQueryBuilder("user");

    queryBuilder
      .orderBy("user.createdAt", options.order)
      .skip(options.skip)
      .take(options.take);

    const itemCount = await queryBuilder.getCount();
    const entities = await queryBuilder.getMany();

    const dtos = entities.map((e) => UserResponseDto.fromEntity(e));
    const pageMetaDto = new PageMetaDto({ itemCount, pageOptionsDto: options });

    return new PageDto(dtos, pageMetaDto);
  }

  async create(dto: CreateUserDto): Promise<UserResponseDto> {
    const entity = this.repo.create(dto);
    const saved = await this.repo.save(entity);
    return UserResponseDto.fromEntity(saved);
  }

  async update(id: number, dto: UpdateUserDto): Promise<UserResponseDto> {
    await this.repo.update(id, dto);
    return this.findById(id);
  }

  async remove(id: number): Promise<void> {
    await this.repo.delete(id);
  }
}
```

---

## Common Patterns (MUST REUSE)

### Pagination (src/common/dto/pagination/)

```typescript
// ✅ Already implemented - DO NOT recreate
import { PageOptionsDto, PageMetaDto, PageDto } from '@common/dto/pagination';

// Usage in repository
async findAll(options: PageOptionsDto): Promise<PageDto<YourDto>> {
  // ... query with skip/take
  return new PageDto(dtos, new PageMetaDto({ itemCount, pageOptionsDto }));
}

// Usage in controller
@Get()
async findAll(@Query() options: PageOptionsDto): Promise<PageDto<YourDto>> {
  return this.service.findAll(options);
}
```

### Response Wrapper (src/common/interceptors/)

```typescript
// ✅ Already implemented - Applied globally
// All responses automatically wrapped with:
{
  "success": true,
  "data": { ... },
  "timestamp": "2024-01-01T00:00:00.000Z"
}

// Error responses:
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "User not found"
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Custom Decorators (src/common/decorators/)

```typescript
// ✅ Already implemented - USE THESE
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { Roles } from '@common/decorators/roles.decorator';
import { Public } from '@common/decorators/public.decorator';
import { ApiPaginatedResponse } from '@common/decorators/api-paginated-response.decorator';

// Usage
@Get('me')
async getMe(@CurrentUser() user: UserPayload) { }

@Post()
@Roles(Role.ADMIN)
async create() { }

@Get('public-endpoint')
@Public()
async publicData() { }
```

### Exception Handling (src/common/exceptions/)

```typescript
// ✅ Use NestJS built-in exceptions
throw new BadRequestException("Invalid input");
throw new UnauthorizedException("Invalid credentials");
throw new ForbiddenException("Access denied");
throw new NotFoundException("Resource not found");
throw new ConflictException("Resource already exists");
throw new InternalServerErrorException("Something went wrong");

// ✅ Custom business exceptions (if exists in common/exceptions)
import { InsufficientBalanceException } from "@common/exceptions";
throw new InsufficientBalanceException(required, available);
```

### Validation Pipe (Global)

```typescript
// ✅ Already configured globally in main.ts
// DTOs are automatically validated
// Just add class-validator decorators to DTOs

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(50)
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: "Password must contain uppercase, lowercase, and number",
  })
  password: string;
}
```

---

## Entity Rules

### Base Entity (MUST use for tables with timestamps)

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

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt: Date;
}
```

### Entity Definition Rules

```typescript
// ✅ CORRECT - Full entity with all conventions
@Entity({ name: "users", schema: "crypto" })
@Index(["email"], { unique: true })
@Index(["status", "createdAt"])
export class UserEntity extends BaseEntity {
  @Column({ type: "varchar", length: 100 })
  name: string;

  @Column({ type: "varchar", length: 255, unique: true })
  email: string;

  @Column({ type: "varchar", length: 255, select: false }) // Hidden by default
  password: string;

  @Column({ type: "enum", enum: UserStatus, default: UserStatus.ACTIVE })
  status: UserStatus;

  @Column({ type: "decimal", precision: 18, scale: 8, default: "0" })
  balance: string; // Use string for decimal

  @Column({ type: "jsonb", nullable: true })
  metadata: Record<string, any> | null;

  // Relations
  @OneToMany(() => OrderEntity, (order) => order.user)
  orders: OrderEntity[];

  @ManyToOne(() => RoleEntity, (role) => role.users)
  @JoinColumn({ name: "role_id" })
  role: RoleEntity;
}
```

### ⚠️ CRITICAL: Check DB Schema Before Entity

```bash
# ALWAYS run this before creating/modifying entity
psql -d your_database -c "\d crypto.table_name"

# Check if created_at/updated_at exist:
# - YES → extend BaseEntity
# - NO → don't extend BaseEntity
```

---

## DTO Rules

### DTO Naming Convention

| Type          | Naming                    | Example               |
| ------------- | ------------------------- | --------------------- |
| Create        | `Create[Entity]Dto`       | `CreateUserDto`       |
| Update        | `Update[Entity]Dto`       | `UpdateUserDto`       |
| Response      | `[Entity]ResponseDto`     | `UserResponseDto`     |
| Query         | `[Entity]QueryDto`        | `UserQueryDto`        |
| List Response | `[Entity]ListResponseDto` | `UserListResponseDto` |

### DTO Structure

```typescript
// create-user.dto.ts
export class CreateUserDto {
  @ApiProperty({ example: "John Doe" })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: "john@example.com" })
  @IsEmail()
  email: string;
}

// update-user.dto.ts
export class UpdateUserDto extends PartialType(
  OmitType(CreateUserDto, ["email"] as const) // Email can't be updated
) {}

// user-response.dto.ts
export class UserResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  name: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  createdAt: string;

  static fromEntity(entity: UserEntity): UserResponseDto {
    const dto = new UserResponseDto();
    dto.id = Number(entity.id); // bigint → number
    dto.name = entity.name;
    dto.email = entity.email;
    dto.createdAt = entity.createdAt.toISOString();
    return dto;
  }
}
```

---

## Testing Rules

### Unit Test Structure

```typescript
describe("UserService", () => {
  let service: UserService;
  let repository: jest.Mocked<UserRepository>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: UserRepository,
          useValue: {
            findById: jest.fn(),
            findByEmail: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    repository = module.get(UserRepository);
  });

  describe("findOne", () => {
    it("should return user when found", async () => {
      const mockUser = { id: 1, name: "Test", email: "test@test.com" };
      repository.findById.mockResolvedValue(mockUser as UserResponseDto);

      const result = await service.findOne(1);

      expect(result).toEqual(mockUser);
      expect(repository.findById).toHaveBeenCalledWith(1);
    });

    it("should throw NotFoundException when not found", async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });
});
```

### Test File Location

```
src/modules/user/
├── user.service.ts
├── user.service.spec.ts      # Unit test next to source
├── user.controller.ts
└── user.controller.spec.ts   # Unit test next to source

test/
├── user.e2e-spec.ts          # E2E tests in test folder
└── jest-e2e.json
```

---

## Code Quality Rules

### TypeScript Strict Rules

```json
// tsconfig.json - MUST have these
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

### ESLint Rules (enforced)

- No `any` type (use `unknown` or proper types)
- No unused variables
- No console.log (use Logger)
- Prefer const over let
- No magic numbers (use constants)

### Naming Conventions

| Type       | Convention             | Example                                  |
| ---------- | ---------------------- | ---------------------------------------- |
| Class      | PascalCase             | `UserService`                            |
| Interface  | PascalCase with prefix | `IUserService` or `UserServiceInterface` |
| Method     | camelCase              | `findById`                               |
| Variable   | camelCase              | `userName`                               |
| Constant   | UPPER_SNAKE            | `MAX_RETRY_COUNT`                        |
| File       | kebab-case             | `user-response.dto.ts`                   |
| Folder     | kebab-case             | `user-management/`                       |
| Enum       | PascalCase             | `UserStatus`                             |
| Enum Value | UPPER_SNAKE            | `UserStatus.ACTIVE`                      |

### JSDoc Requirements

```typescript
/**
 * Find user by ID
 * @param id - User's unique identifier
 * @returns User data or null if not found
 * @throws {NotFoundException} When user doesn't exist
 * @example
 * const user = await userService.findOne(1);
 */
async findOne(id: number): Promise<UserResponseDto | null> {
  // ...
}
```

---

## Anti-Patterns (NEVER DO)

### ❌ DON'T: Return Entity from Repository

```typescript
// ❌ WRONG
async findUser(id: number): Promise<UserEntity> {
  return this.repo.findOne({ where: { id } });
}

// ✅ CORRECT
async findUser(id: number): Promise<UserResponseDto | null> {
  const entity = await this.repo.findOne({ where: { id } });
  return entity ? UserResponseDto.fromEntity(entity) : null;
}
```

### ❌ DON'T: Business Logic in Controller

```typescript
// ❌ WRONG
@Post()
async create(@Body() dto: CreateUserDto) {
  const existing = await this.userRepo.findByEmail(dto.email);
  if (existing) throw new ConflictException();
  return this.userRepo.create(dto);
}

// ✅ CORRECT
@Post()
async create(@Body() dto: CreateUserDto) {
  return this.userService.create(dto); // Logic in service
}
```

### ❌ DON'T: Duplicate Utility Functions

```typescript
// ❌ WRONG - Creating duplicate in feature module
// src/modules/order/utils/date.util.ts
export const formatDate = (date: Date) => date.toISOString();

// ✅ CORRECT - Use common utility
import { formatDate } from "@common/utils/date.util";
```

### ❌ DON'T: Skip Documentation

```typescript
// ❌ WRONG - No docs update after new function
async calculateReward(userId: number): Promise<number> { }

// ✅ CORRECT - Update docs/FUNCTION_REGISTRY.md
// | calculateReward | reward.service.ts | Calculate user reward | userId: number | Promise<number> |
```

---

## Performance Guidelines

### Database Query Optimization

```typescript
// ✅ Use QueryBuilder for complex queries
const users = await this.repo
  .createQueryBuilder("user")
  .leftJoinAndSelect("user.orders", "order")
  .where("user.status = :status", { status: "active" })
  .andWhere("order.createdAt > :date", { date: lastMonth })
  .orderBy("user.createdAt", "DESC")
  .take(10)
  .getMany();

// ✅ Use select for specific fields
const userNames = await this.repo
  .createQueryBuilder("user")
  .select(["user.id", "user.name"])
  .getMany();

// ✅ Use pagination for large datasets
// Never use find() without limit on large tables
```

### Caching Strategy

```typescript
// ✅ Use cache for expensive operations
@Injectable()
export class PriceService {
  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  async getCurrentPrice(symbol: string): Promise<number> {
    const cacheKey = `price:${symbol}`;

    let price = await this.cacheManager.get<number>(cacheKey);
    if (price) return price;

    price = await this.fetchPriceFromAPI(symbol);
    await this.cacheManager.set(cacheKey, price, 60000); // 1 min TTL

    return price;
  }
}
```

---

## Environment Configuration

### Config Module Pattern

```typescript
// src/config/database.config.ts
import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 5432,
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
}));

// Usage in module
@Module({
  imports: [
    ConfigModule.forRoot({
      load: [databaseConfig],
      validationSchema: Joi.object({
        DB_HOST: Joi.string().required(),
        DB_PORT: Joi.number().default(5432),
      }),
    }),
  ],
})
```

---

## Quick Reference

### Common Commands

| Task                | Command                                             |
| ------------------- | --------------------------------------------------- |
| New module          | `nest g module modules/feature-name`                |
| New controller      | `nest g controller modules/feature-name`            |
| New service         | `nest g service modules/feature-name`               |
| New resource (CRUD) | `nest g resource modules/feature-name`              |
| Generate migration  | `npm run migration:generate -- src/migrations/Name` |
| Run migration       | `npm run migration:run`                             |

### Import Path Aliases

```typescript
// tsconfig.json paths
import { UserService } from "@modules/user/user.service";
import { BaseEntity } from "@common/entities/base.entity";
import { PageDto } from "@common/dto/pagination";
import { DatabaseConfig } from "@config/database.config";
```

### NestJS Exception Status Codes

| Exception                    | HTTP Status |
| ---------------------------- | ----------- |
| BadRequestException          | 400         |
| UnauthorizedException        | 401         |
| ForbiddenException           | 403         |
| NotFoundException            | 404         |
| ConflictException            | 409         |
| UnprocessableEntityException | 422         |
| InternalServerErrorException | 500         |

# Role: Senior Full-stack Architect & AI Context Optimizer

## Core Principle: "Atomic & Modular Development"

Cursor의 Auto Mode(Composer)가 전체 맥락을 100% 이해할 수 있도록, 모든 코드는 최소 단위로 분절하여 작성한다.
AI의 컨텍스트 한계를 초과하기 전에 스스로 리팩토링을 제안하고 실행하는 것을 최우선 순위로 삼는다.

## 1. Code Metrics & Limits (Hard Constraints)

- **File Length:** 단일 파일은 공백 포함 최대 200라인을 넘지 않는다.
- **Function/Component Length:** 단일 함수나 컴포넌트는 40라인 이내로 작성한다.
- **Complexity:** 중첩 if문이나 루프는 최대 2단계까지만 허용한다. 그 이상은 별도 함수로 추출한다.
- **Auto-Refactor Trigger:** 파일이 180라인에 도달하면, 작성 중인 기능을 멈추고 파일을 논리적으로 분리(Extract)하는 리팩토링을 먼저 수행한 후 개발을 진행한다.

## 2. Structural Guidance (Feature-Based)

- **Folder Structure:** 'Feature-based' 구조를 따른다
- **Single Responsibility:** 하나의 파일은 오직 하나의 책임(Logic, UI, or Type)만 가진다.

## 3. Communication & Refactoring Rules

- **Proactive Refactoring:** 기능을 추가하기 전, 기존 파일이 너무 커질 것 같으면 "파일 분리가 필요합니다"라고 먼저 보고하고 구조를 먼저 잡는다.
- **Dependency Management:** 파일 간 참조가 복잡해지지 않도록 의존성 주입(DI)이나 기타 방법을 활용하여 결합도를 낮춘다.
- **Documentation:** 함수 상단에 간단한 TSDoc/JSDoc을 작성하여 AI가 내부 로직을 일일이 읽지 않아도 인터페이스를 파악할 수 있게 한다.

## 4. Encoding & Environment (Critical)

- **Encoding:** 모든 파일은 반드시 **UTF-8** 인코딩으로 저장한다. (한글 및 특수문자 깨짐 방지)
- **Type Safety:** 모든 코드에 엄격한 타입(TypeScript)을 적용하여 AI의 추론 오류를 최소화한다.
