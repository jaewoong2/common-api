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

### ADR-006: Unified Job Queue System (SQS + EventBridge Scheduler)

**Date**: 2024-12-30
**Status**: Accepted
**Author**: Claude AI

#### Context
The original DB-based job queue system had limitations:
- **Performance**: Constant DB polling created unnecessary load
- **Scalability**: Single database table as bottleneck for high-volume jobs
- **Flexibility**: Only supported HTTP callback jobs
- **Cold Starts**: DB connections slow down Lambda cold starts

Needed a hybrid system that supports:
- Multiple execution types (Lambda invoke, Lambda URL, REST API, scheduled jobs)
- Fast job processing without DB overhead
- Retry logic with exponential backoff
- Delayed job execution via EventBridge Scheduler

#### Decision
Implement hybrid architecture with:

1. **SQS FIFO Queue (`jobs-main.fifo`)** for active job processing
   - MessageGroupId routing by execution type
   - No DB connection required during execution
   - Visibility timeout for automatic retry

2. **PostgreSQL `jobs` table** for failed/retrying jobs and audit trail
   - Stores failed SQS jobs for manual intervention
   - Periodic polling (5 min) for retry logic
   - Maintains audit history

3. **EventBridge Scheduler** for delayed job execution
   - One-time schedules for delayed jobs
   - Invokes Lambda with targetJob message
   - Auto-cleanup after execution

4. **Stateless Message Processor Service**
   - NO database dependencies
   - Routes by execution type: lambda-invoke, lambda-url, rest-api, schedule
   - Fast Lambda cold starts

5. **3 Job Creation Modes**:
   - `db`: Save to database only
   - `sqs`: Send to SQS only
   - `both`: Save to DB + send to SQS (transactional safety)

6. **Unified Message Format (LambdaProxyMessage)**
   - AWS Lambda proxy event structure
   - Type-specific execution config
   - Metadata for tracking (jobId, appId, retryCount)

#### Architecture Flow
```
Job Creation API (POST /v1/jobs/create)
    ├─ mode=db   → PostgreSQL only
    ├─ mode=sqs  → SQS only
    └─ mode=both → DB + SQS (transactional)

SQS FIFO Queue
    └─→ EventBridge Cron (1 min) → POST /internal/v1/poll-sqs
        └─→ Message Processor (stateless) → Execute by type
            ├─ Success → Delete from SQS
            └─ Failure → Save to DB with retry

PostgreSQL
    └─→ EventBridge Cron (5 min) → POST /internal/v1/run-db-jobs
        └─→ Message Processor (stateless) → Execute with exponential backoff
            ├─ Success → SUCCEEDED
            └─ Failure → RETRYING (or FAILED if max retries)

EventBridge Scheduler
    └─→ POST /internal/v1/process-scheduled-message
        └─→ Message Processor → Execute targetJob
```

#### 4 Execution Types
1. **lambda-invoke**: AWS Lambda SDK invoke (Event type, async)
2. **lambda-url**: Lambda Function URL with SigV4 authentication
3. **rest-api**: REST API calls via axios
4. **schedule**: EventBridge Schedule wrapper (contains targetJob)

#### Consequences
**Positive:**
- ✅ **Fast Processing**: SQS-based execution without DB overhead
- ✅ **Scalability**: Decoupled SQS + DB architecture
- ✅ **Flexibility**: 4 execution types support various use cases
- ✅ **Fast Cold Starts**: Stateless processor with no DB connections
- ✅ **Reliability**: Hybrid system (SQS failure → DB fallback)
- ✅ **Delayed Execution**: EventBridge Scheduler for one-time future jobs
- ✅ **Backward Compatibility**: Legacy endpoints and columns preserved
- ✅ **Audit Trail**: All jobs eventually saved to DB

**Negative:**
- ❌ **Complexity**: More infrastructure (SQS, EventBridge, IAM policies)
- ❌ **Cost**: SQS FIFO + EventBridge charges (~$21-32/month for 1M jobs)
- ❌ **Operational Overhead**: Monitoring SQS, EventBridge, Lambda metrics
- ❌ **Migration Effort**: Existing jobs need migration or backward compatibility layer

#### Implementation Details
- **SQS Queue**: jobs-main.fifo (14 days retention, 5 min visibility timeout)
- **EventBridge Cron**: Poll SQS (1 min), Run DB jobs (5 min)
- **EventBridge IAM Role**: Lambda invoke permissions
- **Lambda IAM Policies**: SQS (send/receive/delete), Scheduler (create/delete), Lambda invoke
- **Exponential Backoff**: `min(2^retryCount * 60s, 24h)`
- **Database Schema**: New columns (execution_type, lambda_proxy_message, execution_config, message_group_id, idempotency_key, schedule_arn)
- **Legacy Support**: Old columns (type, payload) kept as nullable

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
