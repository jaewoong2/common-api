# ECS Fargate (Spot) Stack

This folder provisions an ECR repository, ECS cluster (FARGATE + FARGATE_SPOT), Application Load Balancer, IAM roles, and a service running the NestJS container.

## Prerequisites

- Terraform >= 1.0
- AWS CLI configured with a profile that can create ECS/ECR/IAM/ELB resources
- Existing VPC and subnets (public for ALB, private for ECS tasks)

## How to Use

1. Copy and edit variables:
   ```bash
   cd terraform/ecs
   cp terraform.tfvars.example terraform.tfvars
   # edit terraform.tfvars with your VPC, subnets, and image tag
   ```
2. Initialize and apply:
   ```bash
   terraform init
   terraform plan
   terraform apply
   ```
3. Set `image_tag` to the tag you pushed via `scripts/deploy-ecs.sh` (defaults to `latest`).

## What It Creates

- ECR repository with scan-on-push
- ECS cluster with `FARGATE` + `FARGATE_SPOT` capacity providers (Spot weight 2, On-Demand weight 1)
- Task execution/task roles
- Application Load Balancer, listener, and target group with health checks
- Security groups for ALB and service
- CloudWatch log group `/ecs/<project>-<env>`
- ECS service wired to the ALB and using awsvpc networking

## Notes

- `service_subnet_ids` should typically be private subnets with NAT; set `assign_public_ip=true` only for public subnets.
- ALB listens on `alb_listener_port` (default 80) and forwards to `container_port` (default 8000).
- Update `container_environment` to pass required environment variables to the task.
