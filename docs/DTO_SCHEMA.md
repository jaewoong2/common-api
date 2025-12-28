# DTO Schema Registry

> ⚠️ **AI MUST UPDATE THIS FILE** when creating or modifying DTOs.

## How to Use This Document

1. **Before implementing**: Check if a similar DTO exists
2. **After implementing**: Document all fields and validations
3. **Reuse**: Common DTOs should be in `src/common/dto/`

---

## Common DTOs (src/common/dto/)

### Pagination DTOs

| DTO | File | Usage | Fields |
|-----|------|-------|--------|
| PageOptionsDto | pagination/page-options.dto.ts | Query params | `page: number, take: number, order: 'ASC' \| 'DESC'` |
| PageMetaDto | pagination/page-meta.dto.ts | Response metadata | `page, take, itemCount, pageCount, hasPreviousPage, hasNextPage` |
| PageDto\<T\> | pagination/page.dto.ts | Paginated response | `items: T[], meta: PageMetaDto` |

### Base Response DTOs

| DTO | File | Usage | Fields |
|-----|------|-------|--------|
| BaseResponseDto | response/base-response.dto.ts | Standard response | `success: boolean, data: T, timestamp: string` |
| ErrorResponseDto | response/error-response.dto.ts | Error response | `success: false, error: { code, message, details }` |

---

## Feature Module DTOs

### Auth Module (src/modules/auth/dto/)

| DTO | File | Usage | Fields | Validations |
|-----|------|-------|--------|-------------|
| _Add DTOs here_ | | | | |

### User Module (src/modules/user/dto/)

| DTO | File | Usage | Fields | Validations |
|-----|------|-------|--------|-------------|
| _Add DTOs here_ | | | | |

---

## DTO Naming Conventions

| Type | Pattern | Example |
|------|---------|---------|
| Create | `Create[Entity]Dto` | `CreateUserDto` |
| Update | `Update[Entity]Dto` | `UpdateUserDto` |
| Response | `[Entity]ResponseDto` | `UserResponseDto` |
| Query/Filter | `[Entity]QueryDto` | `UserQueryDto` |
| List Response | `[Entity]ListResponseDto` | `UserListResponseDto` |
| Internal | `[Entity]InternalDto` | `UserInternalDto` |

---

## Validation Decorators Reference

### String Validations

```typescript
@IsString()              // Must be string
@IsNotEmpty()            // Cannot be empty
@MinLength(n)            // Minimum length
@MaxLength(n)            // Maximum length
@Matches(/regex/)        // Must match pattern
@IsEmail()               // Valid email format
@IsUrl()                 // Valid URL format
@IsUUID()                // Valid UUID
```

### Number Validations

```typescript
@IsNumber()              // Must be number
@IsInt()                 // Must be integer
@Min(n)                  // Minimum value
@Max(n)                  // Maximum value
@IsPositive()            // Must be positive
```

### Other Validations

```typescript
@IsBoolean()             // Must be boolean
@IsDate()                // Must be date
@IsEnum(Enum)            // Must be enum value
@IsArray()               // Must be array
@IsOptional()            // Field is optional
@ValidateNested()        // Validate nested objects
@Type(() => Class)       // Transform to class
```

---

## DTO Template

When creating new DTOs, use this structure:

### Create DTO

```typescript
// create-[entity].dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEmail } from 'class-validator';

export class Create[Entity]Dto {
  @ApiProperty({ 
    description: 'Field description',
    example: 'example value' 
  })
  @IsString()
  @IsNotEmpty()
  fieldName: string;
}
```

### Update DTO

```typescript
// update-[entity].dto.ts
import { PartialType, OmitType } from '@nestjs/mapped-types';
import { Create[Entity]Dto } from './create-[entity].dto';

export class Update[Entity]Dto extends PartialType(
  OmitType(Create[Entity]Dto, ['immutableField'] as const)
) {}
```

### Response DTO

```typescript
// [entity]-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { [Entity]Entity } from '../entities/[entity].entity';

export class [Entity]ResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  fieldName: string;

  @ApiProperty()
  createdAt: string;

  static fromEntity(entity: [Entity]Entity): [Entity]ResponseDto {
    const dto = new [Entity]ResponseDto();
    dto.id = Number(entity.id);
    dto.fieldName = entity.fieldName;
    dto.createdAt = entity.createdAt.toISOString();
    return dto;
  }
}
```

---

## Documentation Template

When adding new DTOs to this file:

```markdown
### [Module] Module (src/modules/[module]/dto/)

| DTO | File | Usage | Fields | Validations |
|-----|------|-------|--------|-------------|
| CreateXxxDto | create-xxx.dto.ts | POST /xxx | `field1: string, field2: number` | `@IsString(), @Min(0)` |
| UpdateXxxDto | update-xxx.dto.ts | PATCH /xxx/:id | `field1?: string` | Partial of Create |
| XxxResponseDto | xxx-response.dto.ts | Response | `id, field1, createdAt` | N/A |
```

---

## Changelog

| Date | DTO | Change | Author |
|------|-----|--------|--------|
| _YYYY-MM-DD_ | _DtoName_ | _Added/Modified/Removed_ | _Name/AI_ |
