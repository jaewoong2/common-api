# Module Map

> ⚠️ **AI MUST UPDATE THIS FILE** when creating new modules or changing module dependencies.

## How to Use This Document

1. **Before implementing**: Check if a module already handles your feature
2. **After implementing**: Add new modules and update dependencies
3. **Check dependencies**: Avoid circular dependencies

---

## Module Overview

```
AppModule
├── ConfigModule (global)
├── DatabaseModule (global)
├── CommonModule (global)
├── AuthModule
├── UserModule
└── [Feature Modules...]
```

---

## Core Modules

| Module | Path | Responsibility | Dependencies | Exports | Global |
|--------|------|----------------|--------------|---------|--------|
| AppModule | src/app.module.ts | Root module | All modules | - | - |
| ConfigModule | src/config/ | Environment config | - | ConfigService | ✅ |
| DatabaseModule | src/database/ | TypeORM setup | ConfigModule | TypeOrmModule | ✅ |
| CommonModule | src/common/ | Shared utilities | - | Utils, Decorators, Pipes, Guards | ✅ |

---

## Feature Modules

| Module | Path | Responsibility | Dependencies | Exports |
|--------|------|----------------|--------------|---------|
| _Add modules here_ | | | | |

---

## Module Dependency Rules

### ✅ Allowed Dependencies

```
Controller → Service → Repository → Entity
     ↓
   DTOs (shared across layers)
```

### ❌ Forbidden Dependencies

- Repository → Service (reverse dependency)
- Entity → Service (entities are pure data)
- Controller → Repository (bypass service layer)
- Circular imports between feature modules

### Handling Circular Dependencies

```typescript
// Use forwardRef() when modules need each other
@Module({
  imports: [forwardRef(() => OtherModule)],
})
export class MyModule {}
```

---

## Module Template

When creating a new module, ensure it follows this structure:

```
src/modules/[feature-name]/
├── dto/
│   ├── create-[feature].dto.ts
│   ├── update-[feature].dto.ts
│   └── [feature]-response.dto.ts
├── entities/
│   └── [feature].entity.ts
├── repositories/
│   └── [feature].repository.ts
├── [feature].controller.ts
├── [feature].service.ts
├── [feature].module.ts
└── [feature].service.spec.ts
```

---

## Quick Reference: Finding the Right Module

| If you need to... | Check this module |
|-------------------|-------------------|
| User authentication | AuthModule |
| User CRUD operations | UserModule |
| Database configuration | DatabaseModule |
| Environment variables | ConfigModule |
| Shared utilities | CommonModule |

---

## Changelog

| Date | Module | Change | Author |
|------|--------|--------|--------|
| _YYYY-MM-DD_ | _ModuleName_ | _Description of change_ | _Name/AI_ |
