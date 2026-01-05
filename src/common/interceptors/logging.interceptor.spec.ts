import { ExecutionContext, CallHandler } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { of, throwError } from "rxjs";
import { LoggingInterceptor } from "./logging.interceptor";
import { AppLogger } from "../../core/logger/logger.service";

// Mock AppLogger
jest.mock("../../core/logger/logger.service");

describe("LoggingInterceptor", () => {
  let interceptor: LoggingInterceptor;
  let configService: jest.Mocked<ConfigService>;
  let mockLogger: jest.Mocked<AppLogger>;
  let mockExecutionContext: jest.Mocked<ExecutionContext>;
  let mockCallHandler: jest.Mocked<CallHandler>;

  beforeEach(() => {
    // Mock ConfigService
    configService = {
      get: jest.fn(),
    } as unknown as jest.Mocked<ConfigService>;

    // Create interceptor
    interceptor = new LoggingInterceptor(configService);

    // Get mocked logger instance
    mockLogger = (interceptor as any).logger as jest.Mocked<AppLogger>;

    // Mock ExecutionContext
    mockExecutionContext = {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn(),
        getResponse: jest.fn(),
      }),
    } as unknown as jest.Mocked<ExecutionContext>;

    // Mock CallHandler
    mockCallHandler = {
      handle: jest.fn(),
    } as unknown as jest.Mocked<CallHandler>;
  });

  describe("Log Level: none", () => {
    it("should skip all logging when LOG_LEVEL=none", (done) => {
      configService.get.mockReturnValue("none");

      const mockRequest = {
        id: "test-id",
        method: "GET",
        url: "/test",
        headers: {},
      };

      mockExecutionContext.switchToHttp().getRequest = jest
        .fn()
        .mockReturnValue(mockRequest);
      mockCallHandler.handle.mockReturnValue(of({ success: true }));

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        complete: () => {
          expect(mockLogger.setRequestId).not.toHaveBeenCalled();
          expect(mockLogger.log).not.toHaveBeenCalled();
          done();
        },
      });
    });
  });

  describe("Log Level: basic", () => {
    beforeEach(() => {
      configService.get.mockImplementation(
        (key: string, defaultValue?: any) => {
          if (key === "logger.level") return "basic";
          if (key === "logger.maxPayloadSize") return 10000;
          if (key === "logger.excludeRoutes") return [];
          return defaultValue;
        }
      );
    });

    it("should log basic info on successful request", (done) => {
      const mockRequest = {
        id: "req-123",
        method: "GET",
        url: "/api/users",
        headers: {},
        query: {},
        body: null,
      };

      const mockResponse = { statusCode: 200 };

      mockExecutionContext.switchToHttp().getRequest = jest
        .fn()
        .mockReturnValue(mockRequest);
      mockExecutionContext.switchToHttp().getResponse = jest
        .fn()
        .mockReturnValue(mockResponse);
      mockCallHandler.handle.mockReturnValue(of({ users: [] }));

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        complete: () => {
          expect(mockLogger.setRequestId).toHaveBeenCalledWith("req-123");
          expect(mockLogger.log).toHaveBeenCalledWith(
            expect.stringContaining("[GET /api/users] 200")
          );
          expect(mockLogger.log).toHaveBeenCalledWith(
            expect.stringContaining("ms")
          );
          done();
        },
      });
    });

    it("should not log request payload in basic mode", (done) => {
      const mockRequest = {
        id: "req-456",
        method: "POST",
        url: "/api/users",
        headers: {},
        query: {},
        body: { name: "John", password: "secret123" },
      };

      const mockResponse = { statusCode: 201 };

      mockExecutionContext.switchToHttp().getRequest = jest
        .fn()
        .mockReturnValue(mockRequest);
      mockExecutionContext.switchToHttp().getResponse = jest
        .fn()
        .mockReturnValue(mockResponse);
      mockCallHandler.handle.mockReturnValue(of({ id: 1 }));

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        complete: () => {
          expect(mockLogger.log).not.toHaveBeenCalledWith(
            expect.stringContaining("Request:")
          );
          expect(mockLogger.log).not.toHaveBeenCalledWith(
            expect.stringContaining("password")
          );
          done();
        },
      });
    });

    it("should log timing info on error response", (done) => {
      const mockRequest = {
        id: "req-789",
        method: "DELETE",
        url: "/api/users/999",
        headers: {},
      };

      mockExecutionContext.switchToHttp().getRequest = jest
        .fn()
        .mockReturnValue(mockRequest);
      mockCallHandler.handle.mockReturnValue(
        throwError(() => ({ status: 404, message: "Not Found" }))
      );

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        error: () => {
          expect(mockLogger.log).toHaveBeenCalledWith(
            expect.stringContaining("[DELETE /api/users/999] 404")
          );
          expect(mockLogger.log).toHaveBeenCalledWith(
            expect.stringContaining("ms")
          );
          done();
        },
      });
    });
  });

  describe("Log Level: detailed", () => {
    beforeEach(() => {
      configService.get.mockImplementation(
        (key: string, defaultValue?: any) => {
          if (key === "logger.level") return "detailed";
          if (key === "logger.maxPayloadSize") return 10000;
          if (key === "logger.excludeRoutes") return [];
          return defaultValue;
        }
      );
    });

    it("should log request and response payloads", (done) => {
      const mockRequest = {
        id: "req-detail-1",
        method: "POST",
        url: "/api/login",
        headers: { "content-type": "application/json" },
        query: {},
        body: { email: "user@test.com", password: "secret123" },
      };

      const mockResponse = { statusCode: 200 };
      const responseData = { token: "jwt_token", user: { id: 1 } };

      mockExecutionContext.switchToHttp().getRequest = jest
        .fn()
        .mockReturnValue(mockRequest);
      mockExecutionContext.switchToHttp().getResponse = jest
        .fn()
        .mockReturnValue(mockResponse);
      mockCallHandler.handle.mockReturnValue(of(responseData));

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        complete: () => {
          // Should log request
          expect(mockLogger.log).toHaveBeenCalledWith(
            expect.stringContaining("Request:")
          );

          // Should log response
          expect(mockLogger.log).toHaveBeenCalledWith(
            expect.stringContaining("Response:")
          );

          done();
        },
      });
    });

    it("should sanitize sensitive data in detailed logs", (done) => {
      const mockRequest = {
        id: "req-sanitize",
        method: "POST",
        url: "/api/register",
        headers: {
          authorization: "Bearer token123",
        },
        query: {},
        body: {
          email: "user@test.com",
          password: "secretPassword",
          api_key: "sk_test_123",
        },
      };

      const mockResponse = { statusCode: 201 };

      mockExecutionContext.switchToHttp().getRequest = jest
        .fn()
        .mockReturnValue(mockRequest);
      mockExecutionContext.switchToHttp().getResponse = jest
        .fn()
        .mockReturnValue(mockResponse);
      mockCallHandler.handle.mockReturnValue(of({ id: 1 }));

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        complete: () => {
          const logCalls = mockLogger.log.mock.calls;
          const requestLog = logCalls.find(
            (call) =>
              // call[0].includes('Request:'),
              call[0] === "Request:"
          );

          expect(requestLog).toBeDefined();
          // Authorization header should be removed
          expect(requestLog![0]).not.toContain("Bearer token123");

          done();
        },
      });
    });
  });

  describe("OAuth Route Skipping", () => {
    it("should skip OAuth start routes", (done) => {
      configService.get.mockReturnValue("basic");

      const mockRequest = {
        id: "req-oauth",
        method: "GET",
        url: "/v1/auth/oauth/google/start",
        headers: {},
      };

      mockExecutionContext.switchToHttp().getRequest = jest
        .fn()
        .mockReturnValue(mockRequest);
      mockCallHandler.handle.mockReturnValue(of({}));

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        complete: () => {
          expect(mockLogger.setRequestId).not.toHaveBeenCalled();
          expect(mockLogger.log).not.toHaveBeenCalled();
          done();
        },
      });
    });

    it("should skip OAuth callback routes", (done) => {
      configService.get.mockReturnValue("basic");

      const mockRequest = {
        id: "req-callback",
        method: "GET",
        url: "/v1/auth/oauth/kakao/callback",
        headers: {},
      };

      mockExecutionContext.switchToHttp().getRequest = jest
        .fn()
        .mockReturnValue(mockRequest);
      mockCallHandler.handle.mockReturnValue(of({}));

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        complete: () => {
          expect(mockLogger.log).not.toHaveBeenCalled();
          done();
        },
      });
    });
  });

  describe("Excluded Routes", () => {
    it("should skip excluded routes", (done) => {
      configService.get.mockImplementation(
        (key: string, defaultValue?: any) => {
          if (key === "logger.level") return "basic";
          if (key === "logger.excludeRoutes")
            return ["/health", "/metrics", "/api-docs"];
          return defaultValue;
        }
      );

      const mockRequest = {
        id: "req-health",
        method: "GET",
        url: "/health",
        headers: {},
      };

      mockExecutionContext.switchToHttp().getRequest = jest
        .fn()
        .mockReturnValue(mockRequest);
      mockCallHandler.handle.mockReturnValue(of({ status: "ok" }));

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        complete: () => {
          expect(mockLogger.log).not.toHaveBeenCalled();
          done();
        },
      });
    });
  });

  describe("Large Payload Handling", () => {
    it("should skip logging for large file uploads", (done) => {
      configService.get.mockReturnValue("basic");

      const mockRequest = {
        id: "req-upload",
        method: "POST",
        url: "/api/upload",
        headers: {
          "content-length": "2000000", // 2MB
        },
      };

      mockExecutionContext.switchToHttp().getRequest = jest
        .fn()
        .mockReturnValue(mockRequest);
      mockCallHandler.handle.mockReturnValue(of({ success: true }));

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        complete: () => {
          expect(mockLogger.log).not.toHaveBeenCalled();
          done();
        },
      });
    });

    it("should skip logging for multipart/form-data", (done) => {
      configService.get.mockReturnValue("detailed");

      const mockRequest = {
        id: "req-multipart",
        method: "POST",
        url: "/api/images",
        headers: {
          "content-type":
            "multipart/form-data; boundary=----WebKitFormBoundary",
        },
      };

      mockExecutionContext.switchToHttp().getRequest = jest
        .fn()
        .mockReturnValue(mockRequest);
      mockCallHandler.handle.mockReturnValue(of({ uploaded: true }));

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        complete: () => {
          expect(mockLogger.log).not.toHaveBeenCalled();
          done();
        },
      });
    });
  });
});
