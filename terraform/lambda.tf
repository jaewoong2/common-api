# Lambda IAM Policies for Unified Job System
# Add these policies to your existing Lambda execution role

# SQS Policy: Send, Receive, Delete messages
resource "aws_iam_role_policy" "lambda_sqs_policy" {
  name = "lambda-sqs-access-${var.environment}"
  role = var.lambda_execution_role_name # You need to pass this as a variable

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "sqs:SendMessage",
          "sqs:ReceiveMessage",
          "sqs:DeleteMessage",
          "sqs:GetQueueAttributes",
          "sqs:GetQueueUrl"
        ]
        Resource = aws_sqs_queue.jobs_main_fifo.arn
      }
    ]
  })
}

# EventBridge Scheduler Policy: Create, Delete, Get schedules
resource "aws_iam_role_policy" "lambda_scheduler_policy" {
  name = "lambda-scheduler-access-${var.environment}"
  role = var.lambda_execution_role_name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "scheduler:CreateSchedule",
          "scheduler:DeleteSchedule",
          "scheduler:GetSchedule",
          "scheduler:UpdateSchedule"
        ]
        Resource = "arn:aws:scheduler:${var.aws_region}:*:schedule/*"
      },
      {
        Effect = "Allow"
        Action = [
          "iam:PassRole"
        ]
        Resource = aws_iam_role.eventbridge_scheduler_role.arn
      }
    ]
  })
}

# Lambda Invoke Policy (for lambda-invoke execution type)
resource "aws_iam_role_policy" "lambda_invoke_policy" {
  name = "lambda-invoke-policy-${var.environment}"
  role = var.lambda_execution_role_name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "lambda:InvokeFunction",
          "lambda:InvokeAsync"
        ]
        Resource = "arn:aws:lambda:${var.aws_region}:*:function:*"
      }
    ]
  })
}

# Environment Variables for Lambda Function
# Add these to your Lambda function configuration:
# - AWS_SQS_QUEUE_URL: ${aws_sqs_queue.jobs_main_fifo.url}
# - AWS_SQS_REGION: ${var.aws_region}
# - AWS_LAMBDA_REGION: ${var.aws_region}
# - AWS_SCHEDULER_REGION: ${var.aws_region}
# - AWS_SCHEDULER_ROLE_ARN: ${aws_iam_role.eventbridge_scheduler_role.arn}
# - INTERNAL_JWT_TOKEN: (set via secrets manager or parameter store)
