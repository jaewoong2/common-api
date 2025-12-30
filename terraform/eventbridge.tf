# EventBridge Scheduler IAM Role
# This role is used by EventBridge Scheduler to invoke Lambda functions

resource "aws_iam_role" "eventbridge_scheduler_role" {
  name               = "eventbridge-scheduler-job-executor-${var.environment}"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "scheduler.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })

  tags = {
    Name        = "eventbridge-scheduler-role"
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# Policy for EventBridge Scheduler to invoke Lambda
resource "aws_iam_role_policy" "eventbridge_scheduler_lambda_invoke" {
  name = "lambda-invoke-policy"
  role = aws_iam_role.eventbridge_scheduler_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "lambda:InvokeFunction"
        ]
        Resource = var.lambda_function_arn
      }
    ]
  })
}

# EventBridge Cron Rule: Poll SQS every 1 minute
resource "aws_cloudwatch_event_rule" "poll_sqs_cron" {
  name                = "poll-sqs-cron-${var.environment}"
  description         = "Poll SQS queue every 1 minute"
  schedule_expression = "rate(1 minute)"

  tags = {
    Name        = "poll-sqs-cron"
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# EventBridge Target: Lambda for SQS polling
resource "aws_cloudwatch_event_target" "poll_sqs_lambda" {
  rule      = aws_cloudwatch_event_rule.poll_sqs_cron.name
  target_id = "poll-sqs-lambda-target"
  arn       = var.lambda_function_arn

  input = jsonencode({
    resource               = "/internal/v1/poll-sqs"
    path                   = "/internal/v1/poll-sqs"
    httpMethod             = "POST"
    headers                = {}
    body                   = jsonencode({ limit = 10 })
    isBase64Encoded        = false
    requestContext         = {
      path         = "/internal/v1/poll-sqs"
      resourcePath = "/internal/v1/poll-sqs"
      httpMethod   = "POST"
    }
  })
}

# Lambda permission for EventBridge to invoke (SQS polling)
resource "aws_lambda_permission" "allow_eventbridge_poll_sqs" {
  statement_id  = "AllowExecutionFromEventBridgePollSqs"
  action        = "lambda:InvokeFunction"
  function_name = var.lambda_function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.poll_sqs_cron.arn
}

# EventBridge Cron Rule: Run DB jobs every 5 minutes
resource "aws_cloudwatch_event_rule" "run_db_jobs_cron" {
  name                = "run-db-jobs-cron-${var.environment}"
  description         = "Run due DB jobs every 5 minutes"
  schedule_expression = "rate(5 minutes)"

  tags = {
    Name        = "run-db-jobs-cron"
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# EventBridge Target: Lambda for DB job processing
resource "aws_cloudwatch_event_target" "run_db_jobs_lambda" {
  rule      = aws_cloudwatch_event_rule.run_db_jobs_cron.name
  target_id = "run-db-jobs-lambda-target"
  arn       = var.lambda_function_arn

  input = jsonencode({
    resource               = "/internal/v1/run-db-jobs"
    path                   = "/internal/v1/run-db-jobs"
    httpMethod             = "POST"
    headers                = {}
    body                   = jsonencode({ limit = 100 })
    isBase64Encoded        = false
    requestContext         = {
      path         = "/internal/v1/run-db-jobs"
      resourcePath = "/internal/v1/run-db-jobs"
      httpMethod   = "POST"
    }
  })
}

# Lambda permission for EventBridge to invoke (DB jobs)
resource "aws_lambda_permission" "allow_eventbridge_run_db_jobs" {
  statement_id  = "AllowExecutionFromEventBridgeRunDbJobs"
  action        = "lambda:InvokeFunction"
  function_name = var.lambda_function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.run_db_jobs_cron.arn
}

# Output EventBridge Scheduler Role ARN
output "eventbridge_scheduler_role_arn" {
  description = "ARN of EventBridge Scheduler IAM role"
  value       = aws_iam_role.eventbridge_scheduler_role.arn
}
