variable "project_name" {
  description = "Project name used for tagging and resource names"
  type        = string
  default     = "common-api"
}

variable "environment" {
  description = "Deployment environment (dev, staging, prod)"
  type        = string
  default     = "dev"
}

variable "aws_region" {
  description = "AWS region for all resources"
  type        = string
  default     = "ap-northeast-2"
}

variable "aws_profile" {
  description = "AWS CLI profile to use"
  type        = string
  default     = "default"
}

variable "vpc_id" {
  description = "VPC ID for ECS tasks and ALB"
  type        = string
}

variable "alb_subnet_ids" {
  description = "Subnet IDs for the ALB (public subnets recommended)"
  type        = list(string)
}

variable "service_subnet_ids" {
  description = "Subnet IDs for ECS tasks (private subnets recommended)"
  type        = list(string)
}

variable "container_port" {
  description = "Application container port"
  type        = number
  default     = 8000
}

variable "desired_count" {
  description = "Number of desired ECS tasks"
  type        = number
  default     = 2
}

variable "task_cpu" {
  description = "CPU units for the task definition (e.g., 256, 512, 1024)"
  type        = number
  default     = 512
}

variable "task_memory" {
  description = "Memory (MiB) for the task definition (e.g., 512, 1024, 2048)"
  type        = number
  default     = 1024
}

variable "assign_public_ip" {
  description = "Assign public IP to ECS tasks (use true only for public subnets)"
  type        = bool
  default     = false
}

variable "ecr_repository_name" {
  description = "Name of the ECR repository for the service"
  type        = string
  default     = "common-api"
}

variable "image_tag" {
  description = "Tag of the container image to deploy"
  type        = string
  default     = "latest"
}

variable "container_name" {
  description = "Container name inside the task definition"
  type        = string
  default     = "common-api"
}

variable "container_environment" {
  description = "Environment variables for the container"
  type        = map(string)
  default     = {}
}

variable "ingress_cidr_blocks" {
  description = "CIDR blocks allowed to reach the ALB listener"
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

variable "health_check_path" {
  description = "Path for ALB target group health check"
  type        = string
  default     = "/health"
}

variable "alb_listener_port" {
  description = "ALB listener port"
  type        = number
  default     = 80
}

variable "enable_execute_command" {
  description = "Enable ECS Exec for debugging"
  type        = bool
  default     = false
}
