# Terraform Variables for Job Queue Infrastructure

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  default     = "dev"
}

variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "ap-northeast-2"
}

# variable "lambda_function_name" {
#   description = "Name of the Lambda function for job processing"
#   type        = string
# }

# variable "lambda_function_arn" {
#   description = "ARN of the Lambda function for job processing"
#   type        = string
# }

# variable "lambda_execution_role_name" {
#   description = "Name of the Lambda execution IAM role (to attach policies)"
#   type        = string
# }
