# Architecture Decision Records (ADR)

> ⚠️ **AI SHOULD UPDATE THIS FILE** when making significant architectural decisions.

## How to Use This Document

Record important architectural decisions with context, rationale, and consequences.

---

## ADR Template

```markdown
## ADR-XXX: Title

**Date**: YYYY-MM-DD  
**Status**: Proposed | Accepted | Deprecated | Superseded  
**Author**: Name/AI

### Context
What is the issue that we're seeing that is motivating this decision?

### Decision
What is the change that we're proposing and/or doing?

### Consequences
What becomes easier or more difficult because of this change?
```

---

## Decisions

### ADR-001: Repository Pattern with DTO Returns

**Date**: 2024-XX-XX  
**Status**: Accepted  
**Author**: Team

#### Context
We needed to establish a clear boundary between the database layer and the application layer. Direct entity exposure led to:
- Lazy loading issues in controllers
- Accidental exposure of sensitive fields
- Tight coupling between layers

#### Decision
Repositories MUST return DTOs, never raw TypeORM entities. Entities are internal implementation details of the repository layer.

#### Consequences
- ✅ Clear API contracts
- ✅ Type-safe responses
- ✅ No lazy loading issues
- ✅ Better security
- ❌ Additional mapping code required
- ❌ Slight performance overhead

---

### ADR-002: BaseEntity for Timestamp Columns

**Date**: 2024-XX-XX  
**Status**: Accepted  
**Author**: Team

#### Context
Most tables need `created_at` and `updated_at` columns. Inconsistent implementation led to bugs and missing audit trails.

#### Decision
- Create `BaseEntity` abstract class with timestamp columns
- All new tables MUST include timestamp columns
- Entities extend `BaseEntity` only if DB table has timestamps
- MUST check DB schema before creating entity

#### Consequences
- ✅ Consistent timestamp handling
- ✅ Automatic audit trail
- ✅ Less boilerplate
- ❌ Must verify DB schema before entity creation
- ❌ Legacy tables may not have timestamps

---

### ADR-003: Documentation-First Development

**Date**: 2024-XX-XX  
**Status**: Accepted  
**Author**: Team

#### Context
Code duplication and lost context were common problems. Developers (including AI) would reimplement existing functionality.

#### Decision
Maintain living documentation in `docs/` folder:
- `FUNCTION_REGISTRY.md` - All functions
- `MODULE_MAP.md` - Module responsibilities
- `API_ENDPOINTS.md` - All endpoints
- `DTO_SCHEMA.md` - DTO definitions
- `DATABASE_SCHEMA.md` - Table structures

AI and developers MUST check these before implementing and update after.

#### Consequences
- ✅ Reduced duplication
- ✅ Better discoverability
- ✅ AI can make informed decisions
- ❌ Documentation maintenance overhead
- ❌ Risk of docs becoming stale

---

### ADR-004: Global Exception Filter

**Date**: 2024-XX-XX  
**Status**: Accepted  
**Author**: Team

#### Context
Inconsistent error responses across endpoints made frontend integration difficult.

#### Decision
Implement global exception filter that standardizes all error responses:
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message"
  },
  "timestamp": "ISO-8601"
}
```

#### Consequences
- ✅ Consistent error format
- ✅ Easier frontend handling
- ✅ Centralized error logging
- ❌ Must map all exceptions to codes

---

### ADR-005: Path Aliases

**Date**: 2024-XX-XX  
**Status**: Accepted  
**Author**: Team

#### Context
Deep relative imports (`../../../common/`) were error-prone and hard to maintain.

#### Decision
Configure TypeScript path aliases:
```typescript
@common/*   → src/common/*
@modules/*  → src/modules/*
@config/*   → src/config/*
```

#### Consequences
- ✅ Cleaner imports
- ✅ Easier refactoring
- ✅ Better readability
- ❌ Requires Jest configuration
- ❌ IDE setup needed

---

## Pending Decisions

### ADR-XXX: [Proposed Title]

**Date**: YYYY-MM-DD  
**Status**: Proposed  
**Author**: Name

#### Context
_Description of the problem_

#### Options Considered
1. Option A - description
2. Option B - description

#### Decision
_Pending discussion_

---

## Superseded Decisions

_None yet_
