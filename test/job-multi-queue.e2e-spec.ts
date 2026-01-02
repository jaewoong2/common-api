import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { SQSClient, SendMessageCommand, ReceiveMessageCommand, PurgeQueueCommand } from '@aws-sdk/client-sqs';
import { AppModule } from '../src/app.module';

/**
 * Multi-Queue Job System E2E Tests
 *
 * IMPORTANT: These tests require actual AWS SQS queues to be available.
 * Set the following environment variables before running:
 *
 * - AWS_SQS_CRYPTO_ENABLED=true
 * - AWS_SQS_CRYPTO_QUEUE_URL=https://sqs.ap-northeast-2.amazonaws.com/123/crypto.fifo
 * - AWS_SQS_OX_ENABLED=true
 * - AWS_SQS_OX_QUEUE_URL=https://sqs.ap-northeast-2.amazonaws.com/123/ox.fifo
 * - AWS_SQS_QUEUE_URL=https://sqs.ap-northeast-2.amazonaws.com/123/jobs-main.fifo
 * - INTERNAL_JWT_TOKEN=your-test-token
 *
 * To run these tests:
 * npm run test:e2e -- job-multi-queue.e2e-spec.ts
 */
describe('Job Multi-Queue System (e2e)', () => {
  let app: INestApplication;
  let sqsClient: SQSClient;
  let internalToken: string;

  const cryptoQueueUrl = process.env.AWS_SQS_CRYPTO_QUEUE_URL || '';
  const oxQueueUrl = process.env.AWS_SQS_OX_QUEUE_URL || '';
  const mainQueueUrl = process.env.AWS_SQS_QUEUE_URL || '';

  beforeAll(async () => {
    // Skip tests if queues not configured
    if (!cryptoQueueUrl || !oxQueueUrl || !mainQueueUrl) {
      console.warn('⚠️  Skipping e2e tests: SQS queues not configured');
      return;
    }

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    sqsClient = new SQSClient({ region: 'ap-northeast-2' });
    internalToken = process.env.INTERNAL_JWT_TOKEN || 'test-token';

    // Clean up queues before tests
    await purgeQueue(cryptoQueueUrl);
    await purgeQueue(oxQueueUrl);
    await purgeQueue(mainQueueUrl);
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  /**
   * Helper: Purge SQS queue (delete all messages)
   */
  async function purgeQueue(queueUrl: string): Promise<void> {
    try {
      await sqsClient.send(new PurgeQueueCommand({ QueueUrl: queueUrl }));
      // Wait for purge to complete
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch (error) {
      console.warn(`Failed to purge queue ${queueUrl}:`, error);
    }
  }

  /**
   * Helper: Send test message to source queue
   */
  async function sendTestMessage(queueUrl: string, message: any): Promise<string> {
    const command = new SendMessageCommand({
      QueueUrl: queueUrl,
      MessageBody: JSON.stringify(message),
      MessageGroupId: message.messageGroupId || 'test-group',
      MessageDeduplicationId: `test-${Date.now()}-${Math.random()}`,
    });

    const response = await sqsClient.send(command);
    return response.MessageId!;
  }

  /**
   * Helper: Receive messages from queue
   */
  async function receiveMessages(queueUrl: string, maxMessages: number = 10): Promise<any[]> {
    const command = new ReceiveMessageCommand({
      QueueUrl: queueUrl,
      MaxNumberOfMessages: maxMessages,
      WaitTimeSeconds: 5, // Long polling
    });

    const response = await sqsClient.send(command);
    return response.Messages || [];
  }

  describe('POST /internal/v1/poll-source-queue', () => {
    it('should poll crypto.fifo and forward to jobs-main.fifo', async () => {
      // Skip if not configured
      if (!cryptoQueueUrl) {
        return;
      }

      // 1. Send test message to crypto.fifo
      const testMessage = {
        body: { orderId: 'order-123', amount: 1000 },
        path: '/orders/callback',
        method: 'POST',
        executionType: 'rest-api',
        baseUrl: 'https://api.example.com',
        messageGroupId: 'crypto-orders',
      };

      const messageId = await sendTestMessage(cryptoQueueUrl, testMessage);
      console.log(`📤 Sent message to crypto.fifo: ${messageId}`);

      // 2. Call polling endpoint
      const response = await request(app.getHttpServer())
        .post('/internal/v1/poll-source-queue')
        .set('Authorization', `Bearer ${internalToken}`)
        .send({ queueName: 'crypto', limit: 4 })
        .expect(200);

      console.log('📥 Polling response:', response.body);

      // 3. Verify response
      expect(response.body).toMatchObject({
        queueName: 'crypto',
        processed: 1,
      });

      // 4. Wait for message to be forwarded
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // 5. Verify message in jobs-main.fifo
      const mainMessages = await receiveMessages(mainQueueUrl, 1);
      expect(mainMessages.length).toBeGreaterThan(0);

      const forwardedMessage = JSON.parse(mainMessages[0].Body);
      expect(forwardedMessage).toMatchObject({
        lambdaProxyMessage: {
          body: JSON.stringify(testMessage.body),
          path: '/orders/callback',
          httpMethod: 'POST',
        },
        execution: {
          type: 'rest-api',
          baseUrl: 'https://api.example.com',
        },
        metadata: {
          messageGroupId: 'crypto-orders',
        },
      });

      console.log('✅ Message successfully forwarded to jobs-main.fifo');
    });

    it('should poll ox.fifo and forward to jobs-main.fifo', async () => {
      // Skip if not configured
      if (!oxQueueUrl) {
        return;
      }

      // 1. Send test message to ox.fifo
      const testMessage = {
        body: { userId: 'user-456', action: 'update' },
        path: '/users/webhook',
        method: 'PUT',
        executionType: 'rest-api',
        baseUrl: 'https://webhook.example.com',
        messageGroupId: 'ox-webhooks',
      };

      const messageId = await sendTestMessage(oxQueueUrl, testMessage);
      console.log(`📤 Sent message to ox.fifo: ${messageId}`);

      // 2. Call polling endpoint
      const response = await request(app.getHttpServer())
        .post('/internal/v1/poll-source-queue')
        .set('Authorization', `Bearer ${internalToken}`)
        .send({ queueName: 'ox', limit: 9 })
        .expect(200);

      console.log('📥 Polling response:', response.body);

      // 3. Verify response
      expect(response.body).toMatchObject({
        queueName: 'ox',
        processed: 1,
      });

      // 4. Wait and verify
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const mainMessages = await receiveMessages(mainQueueUrl, 1);
      expect(mainMessages.length).toBeGreaterThan(0);

      const forwardedMessage = JSON.parse(mainMessages[0].Body);
      expect(forwardedMessage.metadata.messageGroupId).toBe('ox-webhooks');

      console.log('✅ Message successfully forwarded to jobs-main.fifo');
    });

    it('should handle multiple messages in single poll', async () => {
      // Skip if not configured
      if (!cryptoQueueUrl) {
        return;
      }

      // 1. Send 3 test messages
      const messages = [
        { body: { id: 1 }, messageGroupId: 'test-batch' },
        { body: { id: 2 }, messageGroupId: 'test-batch' },
        { body: { id: 3 }, messageGroupId: 'test-batch' },
      ];

      for (const msg of messages) {
        await sendTestMessage(cryptoQueueUrl, msg);
      }

      console.log('📤 Sent 3 messages to crypto.fifo');

      // 2. Poll queue
      const response = await request(app.getHttpServer())
        .post('/internal/v1/poll-source-queue')
        .set('Authorization', `Bearer ${internalToken}`)
        .send({ queueName: 'crypto', limit: 4 })
        .expect(200);

      console.log('📥 Polling response:', response.body);

      // 3. Verify all messages processed
      expect(response.body.processed).toBe(3);

      console.log('✅ All 3 messages successfully processed');
    });

    it('should return 0 when queue is empty', async () => {
      // 1. Poll empty queue
      const response = await request(app.getHttpServer())
        .post('/internal/v1/poll-source-queue')
        .set('Authorization', `Bearer ${internalToken}`)
        .send({ queueName: 'crypto', limit: 4 })
        .expect(200);

      // 2. Verify no messages processed
      expect(response.body).toMatchObject({
        queueName: 'crypto',
        processed: 0,
      });

      console.log('✅ Correctly handled empty queue');
    });

    it('should preserve FIFO ordering', async () => {
      // Skip if not configured
      if (!cryptoQueueUrl) {
        return;
      }

      // 1. Send ordered messages
      const messageGroupId = `test-order-${Date.now()}`;
      const orderedMessages = [
        { body: { order: 1 }, messageGroupId },
        { body: { order: 2 }, messageGroupId },
        { body: { order: 3 }, messageGroupId },
      ];

      for (const msg of orderedMessages) {
        await sendTestMessage(cryptoQueueUrl, msg);
        await new Promise((resolve) => setTimeout(resolve, 100)); // Small delay
      }

      console.log('📤 Sent ordered messages to crypto.fifo');

      // 2. Poll all messages
      await request(app.getHttpServer())
        .post('/internal/v1/poll-source-queue')
        .set('Authorization', `Bearer ${internalToken}`)
        .send({ queueName: 'crypto', limit: 4 })
        .expect(200);

      // 3. Wait and receive from main queue
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const mainMessages = await receiveMessages(mainQueueUrl, 3);
      expect(mainMessages.length).toBe(3);

      // 4. Verify order
      const orders = mainMessages.map((msg) => {
        const parsed = JSON.parse(msg.Body);
        return JSON.parse(parsed.lambdaProxyMessage.body).order;
      });

      expect(orders).toEqual([1, 2, 3]);

      console.log('✅ FIFO ordering preserved:', orders);
    });
  });
});
