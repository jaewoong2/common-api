# Troubleshooting Guide

> Common issues and their solutions. AI should check here before debugging.

---

## Database Issues

### Error: `column "created_at" does not exist`

**Cause**: Entity extends `BaseEntity` but DB table doesn't have timestamp columns.

**Solution**:
```typescript
// ❌ WRONG - table doesn't have created_at/updated_at
@Entity()
export class MyEntity extends BaseEntity { }

// ✅ CORRECT - don't extend BaseEntity
@Entity()
export class MyEntity {
  @PrimaryGeneratedColumn()
  id: number;
}
```

**Prevention**: Always check DB schema before creating entity:
```bash
psql -d database -c "\d crypto.table_name"
```

---

### Error: `relation "table_name" does not exist`

**Cause**: Migration not run or wrong schema name.

**Solution**:
```bash
# Run migrations
npm run migration:run

# Check if table exists
psql -d database -c "\dt crypto.*"
```

---

### Error: `duplicate key value violates unique constraint`

**Cause**: Trying to insert duplicate value in unique column.

**Solution**:
```typescript
// Check before insert
const existing = await this.repo.findOne({ where: { email } });
if (existing) {
  throw new ConflictException('Email already exists');
}
```

---

## TypeORM Issues

### Error: `EntityMetadataNotFoundError`

**Cause**: Entity not registered in module.

**Solution**:
```typescript
@Module({
  imports: [
    TypeOrmModule.forFeature([YourEntity]), // ← Add entity here
  ],
})
```

---

### Error: `Cannot query across one-to-many for property`

**Cause**: Missing `@JoinColumn()` or wrong relation setup.

**Solution**:
```typescript
// ✅ CORRECT relation setup
@ManyToOne(() => User, (user) => user.posts)
@JoinColumn({ name: 'user_id' })
user: User;
```

---

### Issue: Lazy loading returns undefined

**Cause**: Accessing relation outside active connection.

**Solution**: Use eager loading or QueryBuilder:
```typescript
// Option 1: Eager loading
const user = await this.repo.findOne({
  where: { id },
  relations: ['posts'],
});

// Option 2: QueryBuilder
const user = await this.repo
  .createQueryBuilder('user')
  .leftJoinAndSelect('user.posts', 'post')
  .where('user.id = :id', { id })
  .getOne();
```

---

## NestJS Issues

### Error: `Nest can't resolve dependencies`

**Cause**: Missing provider or circular dependency.

**Solution**:
```typescript
// 1. Check if provider is in module
@Module({
  providers: [YourService], // ← Must be listed
})

// 2. Check for circular dependency - use forwardRef
@Module({
  imports: [forwardRef(() => OtherModule)],
})

// 3. Check if @Injectable() decorator exists
@Injectable()
export class YourService { }
```

---

### Error: `Cannot read property of undefined` in test

**Cause**: Mock not properly set up.

**Solution**:
```typescript
// ✅ CORRECT mock setup
const module = await Test.createTestingModule({
  providers: [
    YourService,
    {
      provide: YourRepository,
      useValue: {
        findById: jest.fn(), // Mock all used methods
        create: jest.fn(),
      },
    },
  ],
}).compile();
```

---

### Error: `ValidationPipe: Cannot validate empty object`

**Cause**: Empty body or missing Content-Type header.

**Solution**:
```typescript
// Ensure request has Content-Type header
// Content-Type: application/json

// For optional body, use:
@Body() dto?: CreateDto
```

---

## Validation Issues

### Error: `property should not exist`

**Cause**: Extra properties in request body with `whitelist: true`.

**Solution**:
```typescript
// Option 1: Allow extra properties
app.useGlobalPipes(new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: false, // Don't throw error
}));

// Option 2: Add missing field to DTO
export class CreateDto {
  @IsString()
  missingField: string; // Add this
}
```

---

### Error: Class-validator decorators not working

**Cause**: Missing `@Type()` for nested objects.

**Solution**:
```typescript
import { Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';

export class ParentDto {
  @ValidateNested()
  @Type(() => ChildDto) // ← Required for nested validation
  child: ChildDto;
}
```

---

## Performance Issues

### Slow database queries

**Diagnosis**:
```typescript
// Enable query logging in TypeORM config
logging: true,

// Or use QueryBuilder with explain
const result = await queryBuilder.explain();
```

**Solutions**:
1. Add missing indexes
2. Use pagination
3. Select only needed columns
4. Avoid N+1 queries with joins

---

### Memory leaks

**Diagnosis**:
```bash
# Check memory usage
node --inspect dist/main.js
```

**Common causes**:
1. Event listeners not removed
2. Circular references in objects
3. Large arrays stored in memory
4. Unclosed database connections

---

## Common Mistakes Checklist

Before asking for help, verify:

- [ ] Migration has been run
- [ ] Entity is registered in module
- [ ] `@Injectable()` decorator exists
- [ ] All dependencies are provided
- [ ] DB schema matches entity definition
- [ ] Mocks cover all used methods
- [ ] Request has correct Content-Type header

---

## Getting Help

1. Check this troubleshooting guide
2. Check `docs/ARCHITECTURE_DECISIONS.md` for context
3. Search codebase for similar implementations
4. Check NestJS documentation: https://docs.nestjs.com
5. Check TypeORM documentation: https://typeorm.io
