# Terraform Infrastructure for Unified Job Queue

This Terraform configuration sets up the AWS infrastructure for the unified job queue system, including:

- **SQS FIFO Queue** for job processing
- **EventBridge Scheduler IAM Role** for delayed job execution
- **EventBridge Cron Rules** for polling SQS and DB jobs
- **Lambda IAM Policies** for SQS, Lambda invoke, and Scheduler access

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Unified Job Queue System                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐         ┌──────────────┐                    │
│  │ SQS FIFO     │────────▶│ EventBridge  │                    │
│  │ Queue        │         │ Cron (1 min) │                    │
│  │ jobs-main    │         └──────┬───────┘                    │
│  └──────────────┘                │                             │
│                                   │                             │
│  ┌──────────────┐                ▼                             │
│  │ PostgreSQL   │         ┌──────────────┐                    │
│  │ jobs table   │────────▶│ Lambda       │                    │
│  └──────────────┘         │ /poll-sqs    │                    │
│                           │ /run-db-jobs │                    │
│  ┌──────────────┐         └──────────────┘                    │
│  │ EventBridge  │                                              │
│  │ Scheduler    │         ┌──────────────┐                    │
│  │ (delayed)    │────────▶│ Message      │                    │
│  └──────────────┘         │ Processor    │                    │
│                           └──────────────┘                    │
└─────────────────────────────────────────────────────────────────┘
```

## Prerequisites

1. **Terraform** >= 1.0
2. **AWS CLI** configured with appropriate credentials
3. **Existing Lambda function** for job processing
4. **Lambda execution role** (you need the role name)

## Setup Instructions

### 1. Configure Variables

Copy the example tfvars file and fill in your values:

```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars
```

Edit `terraform.tfvars` with your actual values:

```hcl
environment                = "dev"
aws_region                 = "ap-northeast-2"
lambda_function_name       = "your-lambda-function-name"
lambda_function_arn        = "arn:aws:lambda:ap-northeast-2:123456789012:function:your-function"
lambda_execution_role_name = "your-lambda-execution-role-name"
```

### 2. Initialize Terraform

```bash
terraform init
```

### 3. Plan Infrastructure Changes

```bash
terraform plan
```

Review the planned changes carefully.

### 4. Apply Infrastructure

```bash
terraform apply
```

Type `yes` when prompted.

### 5. Note the Outputs

After successful apply, Terraform will output:

```
Outputs:

sqs_queue_url = "https://sqs.ap-northeast-2.amazonaws.com/123456789012/jobs-main.fifo"
sqs_queue_arn = "arn:aws:sqs:ap-northeast-2:123456789012:jobs-main.fifo"
eventbridge_scheduler_role_arn = "arn:aws:iam::123456789012:role/eventbridge-scheduler-job-executor-dev"
```

## Environment Variables

Add these environment variables to your Lambda function:

```bash
AWS_SQS_QUEUE_URL=<sqs_queue_url from terraform output>
AWS_SQS_REGION=ap-northeast-2
AWS_LAMBDA_REGION=ap-northeast-2
AWS_SCHEDULER_REGION=ap-northeast-2
AWS_SCHEDULER_ROLE_ARN=<eventbridge_scheduler_role_arn from terraform output>
AWS_SCHEDULER_TARGET_URL=<your lambda function URL or API Gateway endpoint>
INTERNAL_JWT_TOKEN=<your internal JWT token for authentication>
```

## Resources Created

### SQS

- **Queue Name**: `jobs-main.fifo`
- **Type**: FIFO Queue
- **Deduplication Scope**: Per Message Group
- **Visibility Timeout**: 5 minutes
- **Message Retention**: 14 days

### EventBridge

#### IAM Role
- **Role Name**: `eventbridge-scheduler-job-executor-{environment}`
- **Purpose**: Allow EventBridge Scheduler to invoke Lambda functions

#### Cron Rules

1. **poll-sqs-cron**
   - **Schedule**: Every 1 minute
   - **Target**: Lambda `/internal/v1/poll-sqs`
   - **Purpose**: Poll SQS queue and process messages

2. **run-db-jobs-cron**
   - **Schedule**: Every 5 minutes
   - **Target**: Lambda `/internal/v1/run-db-jobs`
   - **Purpose**: Run due DB jobs with retry logic

### Lambda IAM Policies

1. **lambda-sqs-access**
   - Actions: SendMessage, ReceiveMessage, DeleteMessage, GetQueueAttributes
   - Resource: jobs-main.fifo queue

2. **lambda-scheduler-access**
   - Actions: CreateSchedule, DeleteSchedule, GetSchedule, UpdateSchedule
   - Resource: EventBridge Schedules
   - Includes: iam:PassRole for EventBridge Scheduler role

3. **lambda-invoke-policy**
   - Actions: InvokeFunction, InvokeAsync
   - Resource: All Lambda functions in the region

## Verification

### 1. Check SQS Queue

```bash
aws sqs get-queue-attributes \
  --queue-url <sqs_queue_url> \
  --attribute-names All
```

### 2. Check EventBridge Rules

```bash
aws events list-rules --name-prefix "poll-sqs-cron"
aws events list-rules --name-prefix "run-db-jobs-cron"
```

### 3. Check Lambda Permissions

```bash
aws lambda get-policy \
  --function-name <lambda_function_name>
```

### 4. Test SQS Polling

Manually invoke the Lambda function:

```bash
aws lambda invoke \
  --function-name <lambda_function_name> \
  --payload '{"resource":"/internal/v1/poll-sqs","path":"/internal/v1/poll-sqs","httpMethod":"POST","body":"{\"limit\":10}"}' \
  response.json
```

## Cleanup

To destroy all created resources:

```bash
terraform destroy
```

**Warning**: This will delete the SQS queue and all messages in it!

## Troubleshooting

### Issue: Lambda can't send messages to SQS

**Solution**: Verify Lambda execution role has the `lambda-sqs-access` policy attached:

```bash
aws iam list-role-policies --role-name <lambda_execution_role_name>
```

### Issue: EventBridge rules not triggering

**Solution**: Check CloudWatch Logs for the Lambda function to see if invocations are happening.

### Issue: EventBridge Scheduler can't create schedules

**Solution**: Verify Lambda has `scheduler:CreateSchedule` and `iam:PassRole` permissions.

## Cost Estimation

Assuming:
- 1M jobs/month
- Average processing time: 1 second per job
- Lambda: 1024MB memory

**Monthly Costs (ap-northeast-2)**:
- SQS: ~$0.40 (1M requests)
- EventBridge: ~$1.00 (43,800 rule invocations/month)
- Lambda: ~$20-30 (1M invocations)
- **Total**: ~$21-32/month

## Next Steps

1. Deploy your NestJS application with the updated code
2. Test job creation with different modes (db, sqs, both)
3. Monitor CloudWatch Logs for errors
4. Set up CloudWatch Alarms for failed jobs
5. Configure Dead Letter Queue (optional, commented out in sqs.tf)

## Support

For issues or questions, refer to:
- [AWS SQS Documentation](https://docs.aws.amazon.com/sqs/)
- [AWS EventBridge Documentation](https://docs.aws.amazon.com/eventbridge/)
- [Terraform AWS Provider Documentation](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
