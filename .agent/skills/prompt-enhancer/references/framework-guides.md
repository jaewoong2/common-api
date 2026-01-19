# Framework-Specific Guides

Quick reference for enhancing prompts in popular frameworks.

### FastAPI (Python)

**Key context to gather:**
- **Project Structure**: Service vs Repository vs Controller layers
- **Router Organization**: Use of `APIRouter` and nested routing
- **Pydantic Models**: V1 vs V2 usage, schema separation (Input/Output/Base)
- **Database/ORM**: SQLAlchemy (Sync/Async), Tortoise, Prisma, or motor
- **Authentication**: OAuth2, JWT, Scopes, or third-party (FastAPI-Users)
- **Dependencies**: `Depends()` patterns, dependency overrides for testing
- **Async Patterns**: Proper use of `async def` vs `def` with background tasks
- **Environment**: Pydantic-Settings or dotenv usage

**Enhancement focus:**
```
- Routers: app/routers/ or app/api/ endpoints organization
- Schemas: lib/schemas/ or app/models/ schemas separation
- Dependency Injection: Depends() for DB session, Auth, and Services
- Middleware: CORS, Logging, and Custom error handling
- Async routes: async def endpoints with await calls
- Documentation: Pydantic Field descriptions for OpenAPI docs
```

**Common FastAPI Enhancement Patterns:**

**Example 1 - API Endpoint Addition (Trading Context):**
```
Original: "바이낸스 가격 조회하는 API 추가해줘"

Enhanced:
Add price lookup endpoint following project patterns:

1. Schema (app/schemas/trading.py):
   - PriceResponse: Pydantic model with symbol (str) and price (float)
   - Add Field() descriptions for automatic documentation

2. Service Layer (app/services/binance_service.py):
   - get_current_price(symbol: str) -> float
   - Handle Binance API errors with custom exceptions
   - Use existing async HTTP client (httpx)

3. API Router (app/routers/trading.py):
   - GET /trading/price/{symbol}
   - Inject binance_service using Depends()
   - Return PriceResponse schema
   - Follow existing status code patterns

4. Error Handling:
   - Use existing HTTPException handlers
   - Validate symbol format before calling service
```

**Example 2 - Database Integration:**
```
Original: "사용자 프로필 저장 기능 만들어줘"

Enhanced based on SQLAlchemy Project:

1. Model (app/models/user.py):
   - UserProfile SQLAlchemy model
   - Define relationships and indexes

2. Schema (app/schemas/user.py):
   - UserProfileCreate (Input)
   - UserProfileResponse (Output)

3. Repository (app/repositories/user_repo.py):
   - create_profile(db: Session, profile: UserProfileCreate)
   - Follow existing database commit/refresh patterns

4. Endpoint Integration:
   - POST /users/profile
   - Inject get_db using Depends()
   - Response status 201 Created
```

**FastAPI-Specific Considerations:**

- **Pydantic V2**: Use `Annotated` for dependencies and field validation
- **Concurrency**: Be careful with sync DB calls in `async def` (run in threadpool)
- **Dependency Injection**: Leverage overrides in `conftest.py` for testing
- **Performance**: Use `ujson` or `orjson` if high performance is required
- **Auto-Docs**: Enhance OpenAPI with `summary`, `description`, and `response_model`

### For API Frameworks (Express, FastAPI)

1. Check route organization
2. Review middleware patterns
3. Identify validation approach
4. Check authentication/authorization
5. Verify error handling strategy

## Quick Detection Commands

```bash
# FastAPI
ls main.py routers/ models/
```

When enhancing prompts, always note the framework version if it affects implementation patterns.