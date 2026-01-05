import { sanitizeSensitiveData } from './sanitizer.util';

describe('sanitizeSensitiveData', () => {
  describe('Primitive Values', () => {
    it('should return null as-is', () => {
      expect(sanitizeSensitiveData(null)).toBeNull();
    });

    it('should return undefined as-is', () => {
      expect(sanitizeSensitiveData(undefined)).toBeUndefined();
    });

    it('should return numbers as-is', () => {
      expect(sanitizeSensitiveData(123)).toBe(123);
      expect(sanitizeSensitiveData(0)).toBe(0);
      expect(sanitizeSensitiveData(-456)).toBe(-456);
    });

    it('should return booleans as-is', () => {
      expect(sanitizeSensitiveData(true)).toBe(true);
      expect(sanitizeSensitiveData(false)).toBe(false);
    });

    it('should return non-sensitive strings as-is', () => {
      expect(sanitizeSensitiveData('hello')).toBe('hello');
    });
  });

  describe('Sensitive Field Masking', () => {
    it('should mask password fields', () => {
      const data = { username: 'john', password: 'secret123' };
      const result = sanitizeSensitiveData(data) as Record<string, unknown>;

      expect(result.username).toBe('john');
      expect(result.password).toBe('***');
    });

    it('should mask token fields (case-insensitive)', () => {
      const data = {
        accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
        refresh_token: 'abc123def456',
        API_TOKEN: 'xyz789',
      };
      const result = sanitizeSensitiveData(data) as Record<string, unknown>;

      expect(result.accessToken).toBe('***');
      expect(result.refresh_token).toBe('***');
      expect(result.API_TOKEN).toBe('***');
    });

    it('should mask api_key and apiKey fields', () => {
      const data = {
        api_key: 'sk_test_1234567890',
        apiKey: 'pk_live_abcdefghij',
        'api-key': 'secret_key_xyz',
      };
      const result = sanitizeSensitiveData(data) as Record<string, unknown>;

      expect(result.api_key).toBe('***');
      expect(result.apiKey).toBe('***');
      expect(result['api-key']).toBe('***');
    });

    it('should mask secret fields', () => {
      const data = {
        client_secret: 'very_secret_value',
        SECRET_KEY: '12345',
      };
      const result = sanitizeSensitiveData(data) as Record<string, unknown>;

      expect(result.client_secret).toBe('***');
      expect(result.SECRET_KEY).toBe('***');
    });

    it('should mask authorization and bearer fields', () => {
      const data = {
        authorization: 'Bearer eyJhbGci...',
        bearer: 'token_value',
      };
      const result = sanitizeSensitiveData(data) as Record<string, unknown>;

      expect(result.authorization).toBe('***');
      expect(result.bearer).toBe('***');
    });

    it('should mask cookie and session fields', () => {
      const data = {
        cookie: 'session_id=abc123; token=xyz789',
        sessionId: 'sess_12345',
      };
      const result = sanitizeSensitiveData(data) as Record<string, unknown>;

      expect(result.cookie).toBe('***');
      expect(result.sessionId).toBe('***');
    });

    it('should mask credit card and cvv fields', () => {
      const data = {
        credit_card: '4111111111111111',
        creditCard: '5555555555554444',
        cvv: '123',
        ssn: '123-45-6789',
      };
      const result = sanitizeSensitiveData(data) as Record<string, unknown>;

      expect(result.credit_card).toBe('***');
      expect(result.creditCard).toBe('***');
      expect(result.cvv).toBe('***');
      expect(result.ssn).toBe('***');
    });

    it('should show partial masking for long strings', () => {
      const data = { password: 'verylongpassword123' };
      const result = sanitizeSensitiveData(data) as Record<string, unknown>;

      expect(result.password).toBe('ve***23');
    });

    it('should fully mask short strings (4 chars or less)', () => {
      const data = { password: 'abc' };
      const result = sanitizeSensitiveData(data) as Record<string, unknown>;

      expect(result.password).toBe('***');
    });

    it('should mask non-string sensitive values with ***', () => {
      const data = {
        password: 12345,
        token: true,
        secret: { nested: 'value' },
      };
      const result = sanitizeSensitiveData(data) as Record<string, unknown>;

      expect(result.password).toBe('***');
      expect(result.token).toBe('***');
      expect(result.secret).toBe('***');
    });
  });

  describe('Nested Objects', () => {
    it('should sanitize nested objects', () => {
      const data = {
        user: {
          name: 'John',
          credentials: {
            password: 'secret123',
            api_key: 'sk_test_123',
          },
        },
      };
      const result = sanitizeSensitiveData(data) as Record<string, unknown>;

      expect((result.user as Record<string, unknown>).name).toBe('John');
      const credentials = (result.user as Record<string, unknown>)
        .credentials as Record<string, unknown>;
      expect(credentials.password).toBe('***');
      expect(credentials.api_key).toBe('***');
    });

    it('should preserve non-sensitive nested values', () => {
      const data = {
        user: {
          id: 1,
          email: 'test@example.com',
          profile: {
            age: 25,
            city: 'Seoul',
          },
        },
      };
      const result = sanitizeSensitiveData(data) as Record<string, unknown>;

      expect((result.user as Record<string, unknown>).id).toBe(1);
      expect((result.user as Record<string, unknown>).email).toBe(
        'test@example.com',
      );
      const profile = (result.user as Record<string, unknown>)
        .profile as Record<string, unknown>;
      expect(profile.age).toBe(25);
      expect(profile.city).toBe('Seoul');
    });
  });

  describe('Arrays', () => {
    it('should sanitize arrays of objects', () => {
      const data = [
        { username: 'user1', password: 'pass1' },
        { username: 'user2', password: 'pass2' },
      ];
      const result = sanitizeSensitiveData(data) as Record<string, unknown>[];

      expect(result[0].username).toBe('user1');
      expect(result[0].password).toBe('***');
      expect(result[1].username).toBe('user2');
      expect(result[1].password).toBe('***');
    });

    it('should sanitize arrays of primitives', () => {
      const data = [1, 'hello', true, null];
      const result = sanitizeSensitiveData(data);

      expect(result).toEqual([1, 'hello', true, null]);
    });

    it('should handle nested arrays', () => {
      const data = {
        users: [
          { name: 'John', tokens: ['token1', 'token2'] },
          { name: 'Jane', tokens: ['token3'] },
        ],
      };
      const result = sanitizeSensitiveData(data) as Record<string, unknown>;
      const users = result.users as Record<string, unknown>[];

      expect(users[0].name).toBe('John');
      expect(users[0].tokens).toEqual(['token1', 'token2']);
    });
  });

  describe('Max Depth Protection', () => {
    it('should stop recursion at max depth', () => {
      const deep = {
        level1: {
          level2: {
            level3: {
              level4: {
                level5: {
                  value: 'too deep',
                },
              },
            },
          },
        },
      };

      const result = sanitizeSensitiveData(deep, 3) as Record<string, unknown>;
      const level1 = result.level1 as Record<string, unknown>;
      const level2 = level1.level2 as Record<string, unknown>;
      const level3 = level2.level3;

      expect(level3).toBe('[Max Depth Reached]');
    });
  });

  describe('Circular Reference Protection', () => {
    it('should handle circular references', () => {
      const circular: Record<string, unknown> = { name: 'test' };
      circular.self = circular;

      const result = sanitizeSensitiveData(circular) as Record<
        string,
        unknown
      >;

      expect(result.name).toBe('test');
      expect(result.self).toBe('[Circular Reference]');
    });

    it('should handle nested circular references', () => {
      const obj1: Record<string, unknown> = { name: 'obj1' };
      const obj2: Record<string, unknown> = { name: 'obj2', ref: obj1 };
      obj1.ref = obj2;

      const result = sanitizeSensitiveData(obj1) as Record<string, unknown>;

      expect(result.name).toBe('obj1');
      expect((result.ref as Record<string, unknown>).name).toBe('obj2');
      expect((result.ref as Record<string, unknown>).ref).toBe(
        '[Circular Reference]',
      );
    });
  });

  describe('Mixed Data Structures', () => {
    it('should handle complex mixed structures', () => {
      const data = {
        id: 1,
        name: 'John Doe',
        email: 'john@example.com',
        password: 'secret123',
        roles: ['admin', 'user'],
        settings: {
          theme: 'dark',
          api_key: 'sk_live_123456',
          notifications: {
            email: true,
            sms: false,
          },
        },
        tokens: [
          { type: 'access', token: 'eyJhbGci...', expiresIn: 3600 },
          { type: 'refresh', token: 'abc123', expiresIn: 86400 },
        ],
      };

      const result = sanitizeSensitiveData(data) as Record<string, unknown>;

      // Non-sensitive fields preserved
      expect(result.id).toBe(1);
      expect(result.name).toBe('John Doe');
      expect(result.email).toBe('john@example.com');
      expect(result.roles).toEqual(['admin', 'user']);

      // Sensitive fields masked
      expect(result.password).toBe('***');
      expect(
        (result.settings as Record<string, unknown>).api_key,
      ).toBe('***');

      // Nested structures preserved
      const settings = result.settings as Record<string, unknown>;
      expect(settings.theme).toBe('dark');
      const notifications = settings.notifications as Record<string, unknown>;
      expect(notifications.email).toBe(true);
      expect(notifications.sms).toBe(false);

      // Arrays with sensitive data
      const tokens = result.tokens as Record<string, unknown>[];
      expect(tokens[0].type).toBe('access');
      expect(tokens[0].token).toBe('***');
      expect(tokens[0].expiresIn).toBe(3600);
    });
  });
});
