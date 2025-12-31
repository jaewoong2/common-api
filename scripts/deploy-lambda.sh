#!/bin/bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.deploy.yml}"

AWS_REGION="${AWS_REGION:-ap-northeast-2}"
AWS_PROFILE="${AWS_PROFILE:-lime_admin}"
ECR_REPOSITORY="${ECR_REPOSITORY:-849441246713.dkr.ecr.ap-northeast-2.amazonaws.com/common-api}"
LAMBDA_FUNCTION_NAME="${LAMBDA_FUNCTION_NAME:-common-api-lambda}"
IMAGE_TAG="${IMAGE_TAG:-lambda}"

if [[ -z "$ECR_REPOSITORY" || -z "$LAMBDA_FUNCTION_NAME" ]]; then
  echo "Usage: ECR_REPOSITORY=849441246713.dkr.ecr.ap-northeast-2.amazonaws.com/common-api \\"
  echo "       LAMBDA_FUNCTION_NAME=<lambda-name> [IMAGE_TAG=lambda] [AWS_REGION=ap-northeast-2] [AWS_PROFILE=default] $0"
  exit 1
fi

if ! command -v aws >/dev/null 2>&1; then
  echo "aws CLI is required" >&2
  exit 1
fi

if docker compose version >/dev/null 2>&1; then
  DOCKER_COMPOSE="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
  DOCKER_COMPOSE="docker-compose"
else
  echo "Docker Compose is required" >&2
  exit 1
fi

REGISTRY="${ECR_REPOSITORY%%/*}"
REPO_NAME="${ECR_REPOSITORY#*/}"
IMAGE_URI="${ECR_REPOSITORY}:${IMAGE_TAG}"

echo "Ensuring ECR repository exists: ${REPO_NAME}"
aws ecr describe-repositories --repository-names "$REPO_NAME" --region "$AWS_REGION" --profile "$AWS_PROFILE" >/dev/null 2>&1 || \
  aws ecr create-repository --repository-name "$REPO_NAME" --image-scanning-configuration scanOnPush=true --region "$AWS_REGION" --profile "$AWS_PROFILE" >/dev/null

echo "Logging in to ECR: ${REGISTRY}"
aws ecr get-login-password --region "$AWS_REGION" --profile "$AWS_PROFILE" | docker login --username AWS --password-stdin "$REGISTRY"

export ECR_REPOSITORY
export LAMBDA_IMAGE_TAG="$IMAGE_TAG"

echo "Building Lambda image (${IMAGE_URI})"
(cd "$PROJECT_ROOT" && $DOCKER_COMPOSE -f "$COMPOSE_FILE" build lambda)

echo "Pushing Lambda image to ECR"
(cd "$PROJECT_ROOT" && $DOCKER_COMPOSE -f "$COMPOSE_FILE" push lambda)

echo "Updating Lambda function code: ${LAMBDA_FUNCTION_NAME}"
aws lambda update-function-code \
  --function-name "$LAMBDA_FUNCTION_NAME" \
  --image-uri "$IMAGE_URI" \
  --publish \
  --region "$AWS_REGION" \
  --profile "$AWS_PROFILE" >/dev/null

aws lambda wait function-updated \
  --function-name "$LAMBDA_FUNCTION_NAME" \
  --region "$AWS_REGION" \
  --profile "$AWS_PROFILE"

echo "Lambda function updated with image ${IMAGE_URI}"
