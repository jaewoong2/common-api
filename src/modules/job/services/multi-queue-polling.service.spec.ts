import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import {
  SQSClient,
  DeleteMessageCommand,
  SendMessageCommand,
} from "@aws-sdk/client-sqs";
import { MultiQueuePollingService } from "./multi-queue-polling.service";
import { JobService } from "../job.service";
import { ExecutionType } from "../../../common/enums";
import { AWS_SQS_CLIENT } from "../../../infra/aws/aws-clients.module";

// Mock class-validator - include decorators used in SourceMessageDto
jest.mock("class-validator", () => ({
  validateOrReject: jest.fn().mockResolvedValue(undefined),
  IsOptional: () => () => {},
  IsString: () => () => {},
  IsObject: () => () => {},
  IsEnum: () => () => {},
  IsNumber: () => () => {},
}));

/**
 * Note: Type assertions (`as any`) are used for test mocks only.
 * The actual service code (multi-queue-polling.service.ts) is fully type-safe
 * using class-validator and DTOs without any `any` types or type assertions.
 */

describe("MultiQueuePollingService", () => {
  let service: MultiQueuePollingService;
  let sqsClient: jest.Mocked<SQSClient>;
  let jobService: jest.Mocked<JobService>;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    // Mock SQS Client - provide default return value for type inference
    const mockSqsClient = {
      send: jest.fn().mockResolvedValue({}),
    } as any;

    // Mock Job Service
    const mockJobService = {
      createUnifiedJob: jest.fn().mockResolvedValue({} as any),
    } as any;

    // Mock Config Service
    const mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === "aws.sqs.queueUrl") {
          return "https://sqs.ap-northeast-2.amazonaws.com/123456789012/jobs-main.fifo";
        }
        if (key === "aws.sqs.sourceQueues") {
          return {
            crypto: {
              queueUrl:
                "https://sqs.ap-northeast-2.amazonaws.com/123456789012/crypto.fifo",
              maxMessages: 4,
              visibilityTimeout: 120,
              enabled: true,
            },
            ox: {
              queueUrl:
                "https://sqs.ap-northeast-2.amazonaws.com/123456789012/ox.fifo",
              maxMessages: 9,
              visibilityTimeout: 120,
              enabled: true,
            },
          };
        }
        return null;
      }),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MultiQueuePollingService,
        {
          provide: AWS_SQS_CLIENT,
          useValue: mockSqsClient,
        },
        {
          provide: JobService,
          useValue: mockJobService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<MultiQueuePollingService>(MultiQueuePollingService);
    sqsClient = module.get(AWS_SQS_CLIENT);
    jobService = module.get(JobService);
    configService = module.get(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("pollQueue", () => {
    it("should successfully poll and forward messages", async () => {
      // Arrange
      const mockMessages = [
        {
          MessageId: "msg-1",
          ReceiptHandle: "receipt-1",
          Body: JSON.stringify({
            body: { key: "value1" },
            path: "/test/path1",
            method: "POST",
          }),
        },
        {
          MessageId: "msg-2",
          ReceiptHandle: "receipt-2",
          Body: JSON.stringify({
            body: { key: "value2" },
            path: "/test/path2",
            method: "GET",
          }),
        },
      ];

      (sqsClient.send as any)
        .mockResolvedValueOnce({ Messages: mockMessages }) // ReceiveMessageCommand
        .mockResolvedValueOnce({}) // SendMessageCommand (msg-1)
        .mockResolvedValueOnce({}) // DeleteMessageCommand (msg-1)
        .mockResolvedValueOnce({}) // SendMessageCommand (msg-2)
        .mockResolvedValueOnce({}); // DeleteMessageCommand (msg-2)

      // Act
      const result = await service.pollQueue("crypto", 4);

      // Assert
      expect(result).toBe(2);
      expect(sqsClient.send).toHaveBeenCalledTimes(5); // 1 receive + 2*(1 send + 1 delete)

      // Verify ReceiveMessageCommand
      expect(sqsClient.send).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          input: expect.objectContaining({
            QueueUrl:
              "https://sqs.ap-northeast-2.amazonaws.com/123456789012/crypto.fifo",
            MaxNumberOfMessages: 4,
            VisibilityTimeout: 120,
          }),
        })
      );

      // Verify SendMessageCommand calls
      const sendCalls = (sqsClient.send as jest.Mock).mock.calls.filter(
        (call) => call[0] instanceof SendMessageCommand
      );
      expect(sendCalls).toHaveLength(2);

      // Verify DeleteMessageCommand calls
      const deleteCalls = (sqsClient.send as jest.Mock).mock.calls.filter(
        (call) => call[0] instanceof DeleteMessageCommand
      );
      expect(deleteCalls).toHaveLength(2);
    });

    it("should return 0 when queue is empty", async () => {
      // Arrange
      (sqsClient.send as any).mockResolvedValueOnce({ Messages: [] });

      // Act
      const result = await service.pollQueue("crypto");

      // Assert
      expect(result).toBe(0);
      expect(sqsClient.send).toHaveBeenCalledTimes(1); // Only ReceiveMessageCommand
    });

    it("should save to DB when forwarding fails", async () => {
      // Arrange
      const mockMessage = {
        MessageId: "msg-1",
        ReceiptHandle: "receipt-1",
        Body: JSON.stringify({
          body: { key: "value" },
          path: "/test/path",
        }),
      };

      (sqsClient.send as any)
        .mockResolvedValueOnce({ Messages: [mockMessage] }) // ReceiveMessageCommand
        .mockRejectedValueOnce(new Error("SQS SendMessage failed")); // SendMessageCommand fails

      jobService.createUnifiedJob.mockResolvedValueOnce({} as any);

      // Act
      const result = await service.pollQueue("crypto");

      // Assert
      expect(result).toBe(0); // No messages successfully forwarded
      expect(jobService.createUnifiedJob).toHaveBeenCalledTimes(1);
      expect(jobService.createUnifiedJob).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: "db", // DB-only mode for failed messages
        })
      );
    });

    it("should handle malformed JSON in message body", async () => {
      // Arrange
      const mockMessage = {
        MessageId: "msg-1",
        ReceiptHandle: "receipt-1",
        Body: "not valid json{",
      };

      (sqsClient.send as any)
        .mockResolvedValueOnce({ Messages: [mockMessage] }) // ReceiveMessageCommand
        .mockResolvedValueOnce({}) // SendMessageCommand
        .mockResolvedValueOnce({}); // DeleteMessageCommand

      // Act
      const result = await service.pollQueue("crypto");

      // Assert
      // Message with malformed JSON should still be processed with fallback
      expect(result).toBe(1); // Successfully forwarded with minimal DTO
      expect(sqsClient.send).toHaveBeenCalledTimes(3); // receive + send + delete
    });

    it("should transform message correctly", async () => {
      // Arrange
      const mockMessage = {
        MessageId: "msg-1",
        ReceiptHandle: "receipt-1",
        Body: JSON.stringify({
          body: { orderNo: 123 },
          path: "/orders/callback",
          method: "POST",
          executionType: ExecutionType.REST_API,
          baseUrl: "https://api.example.com",
          appId: "app-123",
          messageGroupId: "order-callbacks",
        }),
      };

      (sqsClient.send as any)
        .mockResolvedValueOnce({ Messages: [mockMessage] })
        .mockResolvedValueOnce({}) // SendMessageCommand
        .mockResolvedValueOnce({}); // DeleteMessageCommand

      // Act
      await service.pollQueue("crypto");

      // Assert
      const sendCall = (sqsClient.send as jest.Mock).mock.calls.find(
        (call) => call[0] instanceof SendMessageCommand
      );

      expect(sendCall).toBeDefined();
      const sentMessage = JSON.parse(sendCall[0].input.MessageBody);

      // Verify transformation
      expect(sentMessage).toMatchObject({
        lambdaProxyMessage: {
          body: JSON.stringify({ orderNo: 123 }),
          path: "/orders/callback",
          httpMethod: "POST",
          resource: "/{proxy+}",
        },
        execution: {
          type: ExecutionType.REST_API,
          baseUrl: "https://api.example.com",
        },
        metadata: {
          appId: "app-123",
          messageGroupId: "order-callbacks",
        },
      });
    });

    it("should accept Lambda proxy formatted source payload without double encoding", async () => {
      const lambdaProxyPayload = {
        body: "{}",
        resource: "/{proxy+}",
        path: "/news/summary",
        httpMethod: "GET",
        isBase64Encoded: false,
        pathParameters: { proxy: "/news/summary" },
        queryStringParameters: {},
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer token",
        },
        requestContext: {
          path: "/news/summary",
          resourcePath: "/{proxy+}",
          httpMethod: "GET",
        },
      };

      const mockMessage = {
        MessageId: "msg-1",
        ReceiptHandle: "receipt-1",
        Body: JSON.stringify(lambdaProxyPayload),
      };

      (sqsClient.send as any)
        .mockResolvedValueOnce({ Messages: [mockMessage] })
        .mockResolvedValueOnce({}) // SendMessageCommand
        .mockResolvedValueOnce({}); // DeleteMessageCommand

      // Act
      await service.pollQueue("crypto");

      // Assert
      const sendCall = (sqsClient.send as jest.Mock).mock.calls.find(
        (call) => call[0] instanceof SendMessageCommand
      );

      expect(sendCall).toBeDefined();
      const sentMessage = JSON.parse(sendCall[0].input.MessageBody);

      expect(sentMessage.lambdaProxyMessage).toMatchObject({
        body: "{}",
        path: "/news/summary",
        httpMethod: "GET",
        resource: "/{proxy+}",
        headers: lambdaProxyPayload.headers,
        requestContext: lambdaProxyPayload.requestContext,
      });
      expect(sentMessage.metadata.messageGroupId).toBe("crypto");
    });

    it("should preserve MessageGroupId and DeduplicationId", async () => {
      // Arrange
      const mockMessage = {
        MessageId: "msg-1",
        ReceiptHandle: "receipt-1",
        Body: JSON.stringify({
          body: { data: "test" },
          messageGroupId: "custom-group",
          idempotencyKey: "custom-key-123",
        }),
      };

      (sqsClient.send as any)
        .mockResolvedValueOnce({ Messages: [mockMessage] })
        .mockResolvedValueOnce({}) // SendMessageCommand
        .mockResolvedValueOnce({}); // DeleteMessageCommand

      // Act
      await service.pollQueue("crypto");

      // Assert
      const sendCall = (sqsClient.send as jest.Mock).mock.calls.find(
        (call) => call[0] instanceof SendMessageCommand
      );

      expect(sendCall[0].input.MessageGroupId).toBe("custom-group");
      expect(sendCall[0].input.MessageDeduplicationId).toBe("custom-key-123");
    });

    it("should use queue name as default MessageGroupId", async () => {
      // Arrange
      const mockMessage = {
        MessageId: "msg-1",
        ReceiptHandle: "receipt-1",
        Body: JSON.stringify({
          body: { data: "test" },
          // No messageGroupId provided
        }),
      };

      (sqsClient.send as any)
        .mockResolvedValueOnce({ Messages: [mockMessage] })
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({});

      // Act
      await service.pollQueue("crypto");

      // Assert
      const sendCall = (sqsClient.send as jest.Mock).mock.calls.find(
        (call) => call[0] instanceof SendMessageCommand
      );

      expect(sendCall[0].input.MessageGroupId).toBe("crypto");
    });

    it("should return 0 when queue is disabled", async () => {
      // Arrange
      configService.get.mockImplementation((key: string) => {
        if (key === "aws.sqs.sourceQueues") {
          return {
            crypto: {
              queueUrl: "https://sqs.example.com/crypto.fifo",
              maxMessages: 4,
              visibilityTimeout: 120,
              enabled: false, // Disabled
            },
          };
        }
        return null;
      });

      // Act
      const result = await service.pollQueue("crypto");

      // Assert
      expect(result).toBe(0);
      expect(sqsClient.send).not.toHaveBeenCalled();
    });

    it("should throw error for unknown queue", async () => {
      // Act & Assert
      await expect(service.pollQueue("unknown-queue")).rejects.toThrow(
        'Queue "unknown-queue" not found in configuration'
      );
    });

    it("should validate message with class-validator", async () => {
      // Arrange
      const mockMessage = {
        MessageId: "msg-1",
        ReceiptHandle: "receipt-1",
        Body: JSON.stringify({
          body: { test: "data" },
          path: "/test",
          method: "POST",
          executionType: ExecutionType.REST_API,
        }),
      };

      (sqsClient.send as any)
        .mockResolvedValueOnce({ Messages: [mockMessage] })
        .mockResolvedValueOnce({}) // SendMessageCommand
        .mockResolvedValueOnce({}); // DeleteMessageCommand

      // Act
      await service.pollQueue("crypto");

      // Assert
      const { validateOrReject } = require("class-validator");
      expect(validateOrReject).toHaveBeenCalled();
    });

    it("should use fallback DTO when validation fails", async () => {
      // Arrange
      const { validateOrReject } = require("class-validator");
      validateOrReject.mockRejectedValueOnce(new Error("Validation failed"));

      const mockMessage = {
        MessageId: "msg-1",
        ReceiptHandle: "receipt-1",
        Body: JSON.stringify({
          invalid: "data",
        }),
      };

      (sqsClient.send as any)
        .mockResolvedValueOnce({ Messages: [mockMessage] })
        .mockResolvedValueOnce({}) // SendMessageCommand
        .mockResolvedValueOnce({}); // DeleteMessageCommand

      // Act
      const result = await service.pollQueue("crypto");

      // Assert
      expect(result).toBe(1); // Should still forward with fallback DTO
      expect(sqsClient.send).toHaveBeenCalledTimes(3);

      // Verify SendMessageCommand was called with fallback data
      const sendCall = (sqsClient.send as jest.Mock).mock.calls.find(
        (call) => call[0] instanceof SendMessageCommand
      );
      expect(sendCall).toBeDefined();
      const sentMessage = JSON.parse(sendCall[0].input.MessageBody);
      expect(sentMessage.metadata.messageGroupId).toBe("crypto"); // Fallback to queue name

      // Reset mock for other tests
      validateOrReject.mockResolvedValue(undefined);
    });
  });
});
