# Terraform Main Configuration
# Unified Job Queue Infrastructure (SQS + EventBridge)

terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Optional: Configure remote state backend
  # backend "s3" {
  #   bucket         = "your-terraform-state-bucket"
  #   key            = "job-queue/terraform.tfstate"
  #   region         = "ap-northeast-2"
  #   encrypt        = true
  #   dynamodb_table = "terraform-locks"
  # }
}

# AWS Provider Configuration
provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "common-api"
      ManagedBy   = "terraform"
      Environment = var.environment
    }
  }
}
