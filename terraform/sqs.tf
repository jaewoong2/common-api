# SQS FIFO Queue for Job Processing
# This queue handles all job types with MessageGroupId routing

resource "aws_sqs_queue" "jobs_main_fifo" {
  name                        = "jobs-main.fifo"
  fifo_queue                  = true
  content_based_deduplication = false # Use MessageDeduplicationId instead
  deduplication_scope         = "messageGroup"
  fifo_throughput_limit       = "perMessageGroupId"

  # Message retention
  message_retention_seconds = 1209600 # 14 days

  # Visibility timeout (5 minutes)
  visibility_timeout_seconds = 300

  # Receive wait time (long polling)
  receive_wait_time_seconds = 20

  # Dead letter queue configuration (optional)
  # redrive_policy = jsonencode({
  #   deadLetterTargetArn = aws_sqs_queue.jobs_dlq.arn
  #   maxReceiveCount     = 5
  # })

  tags = {
    Name        = "jobs-main-fifo"
    Environment = var.environment
    ManagedBy   = "terraform"
    Purpose     = "unified-job-queue"
  }
}

# Dead Letter Queue (optional)
# resource "aws_sqs_queue" "jobs_dlq" {
#   name                        = "jobs-dlq.fifo"
#   fifo_queue                  = true
#   message_retention_seconds   = 1209600 # 14 days
#
#   tags = {
#     Name        = "jobs-dlq-fifo"
#     Environment = var.environment
#     ManagedBy   = "terraform"
#   }
# }

# Output queue URL and ARN
output "sqs_queue_url" {
  description = "URL of the jobs FIFO queue"
  value       = aws_sqs_queue.jobs_main_fifo.url
}

output "sqs_queue_arn" {
  description = "ARN of the jobs FIFO queue"
  value       = aws_sqs_queue.jobs_main_fifo.arn
}
