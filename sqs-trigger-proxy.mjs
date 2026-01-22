import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";

const lambda = new LambdaClient(
  {},
); /** Region will be picked up from AWS_REGION env var */

/* ── Supported Execution Types ─────────────────────────────────────────────
   현재 지원되는 execution.type 목록
--------------------------------------------------------------------- */
const SUPPORTED_EXECUTION_TYPES = ["lambda-invoke"];

/**
 * SQS 메시지에서 Job Message를 파싱합니다.
 * @param {string} body - SQS record body (JSON string)
 * @returns {object} Parsed job message
 */
function parseJobMessage(body) {
  const jobMessage = JSON.parse(body);

  if (!jobMessage.lambdaProxyMessage) {
    throw new Error("Missing required field: lambdaProxyMessage");
  }

  if (!jobMessage.execution) {
    throw new Error("Missing required field: execution");
  }

  if (!jobMessage.execution.type) {
    throw new Error("Missing required field: execution.type");
  }

  if (!jobMessage.execution.functionName) {
    throw new Error("Missing required field: execution.functionName");
  }

  return jobMessage;
}

/**
 * 구조화된 로그를 출력합니다.
 * @param {string} level - 로그 레벨 (INFO, WARN, ERROR, SUCCESS)
 * @param {string} message - 로그 메시지
 * @param {object} context - 추가 컨텍스트 정보
 */
function log(level, message, context = {}) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...context,
  };

  if (level === "ERROR") {
    console.error(JSON.stringify(logEntry));
  } else if (level === "WARN") {
    console.warn(JSON.stringify(logEntry));
  } else {
    console.log(JSON.stringify(logEntry));
  }
}

/* ── Lambda 핸들러 (SQS Trigger) ───────────────────────────────── */
export const handler = async (event) => {
  const batchItemFailures = [];

  log("INFO", "Processing SQS batch", {
    recordCount: event.Records.length,
  });

  // 병렬 처리 (순서를 보장하려면 for...of 문을 사용하세요)
  await Promise.all(
    event.Records.map(async (record) => {
      const messageId = record.messageId;
      let metadata = {};

      try {
        // 1. Job Message 파싱
        const jobMessage = parseJobMessage(record.body);
        metadata = jobMessage.metadata || {};

        const { execution, lambdaProxyMessage } = jobMessage;
        const { type: executionType, functionName } = execution;

        log("INFO", "Processing job message", {
          messageId,
          jobId: metadata.jobId,
          appId: metadata.appId,
          executionType,
          functionName,
          path: lambdaProxyMessage.path,
          httpMethod: lambdaProxyMessage.httpMethod,
        });

        // 2. Execution Type 검증
        if (!SUPPORTED_EXECUTION_TYPES.includes(executionType)) {
          log("WARN", "Unsupported execution type - message will be consumed", {
            messageId,
            jobId: metadata.jobId,
            executionType,
            supportedTypes: SUPPORTED_EXECUTION_TYPES,
          });
          // 지원하지 않는 타입은 메시지 삭제 (consume)
          return;
        }

        // 3. Lambda Invoke (API Gateway Proxy 형식)
        // lambdaProxyMessage는 API Gateway Proxy Event 형식을 그대로 유지
        // Target Lambda는 이를 API Gateway에서 받은 것처럼 처리 가능
        const payload = JSON.stringify(lambdaProxyMessage);

        await lambda.send(
          new InvokeCommand({
            FunctionName: functionName,
            InvocationType: "Event", // 비동기 호출 (Fire & Forget)
            Payload: new TextEncoder().encode(payload),
          }),
        );

        log("SUCCESS", "Lambda invoked successfully", {
          messageId,
          jobId: metadata.jobId,
          functionName,
          path: lambdaProxyMessage.path,
        });
      } catch (error) {
        log("ERROR", "Failed to process message", {
          messageId,
          jobId: metadata.jobId,
          error: error.message,
          stack: error.stack,
        });

        // 4. 실패 시 SQS에 알려서 해당 메시지만 Retry (Partial Batch Failure)
        batchItemFailures.push({ itemIdentifier: messageId });
      }
    }),
  );

  log("INFO", "Batch processing completed", {
    totalRecords: event.Records.length,
    failedCount: batchItemFailures.length,
    successCount: event.Records.length - batchItemFailures.length,
  });

  // SQS Trigger는 이 포맷을 반환하면 부분 실패 처리를 지원합니다.
  return { batchItemFailures };
};
