#!/bin/bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.deploy.yml}"

AWS_REGION="${AWS_REGION:-ap-northeast-2}"
AWS_PROFILE="${AWS_PROFILE:-default}"
ECR_REPOSITORY="${ECR_REPOSITORY:-}"
ECS_CLUSTER="${ECS_CLUSTER:-}"
ECS_SERVICE="${ECS_SERVICE:-}"
IMAGE_TAG="${IMAGE_TAG:-latest}"

if [[ -z "$ECR_REPOSITORY" || -z "$ECS_CLUSTER" || -z "$ECS_SERVICE" ]]; then
  echo "Usage: ECR_REPOSITORY=<account>.dkr.ecr.<region>.amazonaws.com/repo \\"
  echo "       ECS_CLUSTER=<cluster> ECS_SERVICE=<service> [IMAGE_TAG=latest] [AWS_REGION=ap-northeast-2] [AWS_PROFILE=default] $0"
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
export ECS_IMAGE_TAG="$IMAGE_TAG"

echo "Building ECS/Fargate image (${IMAGE_URI})"
(cd "$PROJECT_ROOT" && $DOCKER_COMPOSE -f "$COMPOSE_FILE" build ecs)

echo "Pushing ECS image to ECR"
(cd "$PROJECT_ROOT" && $DOCKER_COMPOSE -f "$COMPOSE_FILE" push ecs)

echo "Forcing new ECS deployment on ${ECS_CLUSTER}/${ECS_SERVICE}"
aws ecs update-service \
  --cluster "$ECS_CLUSTER" \
  --service "$ECS_SERVICE" \
  --force-new-deployment \
  --region "$AWS_REGION" \
  --profile "$AWS_PROFILE" >/dev/null

aws ecs wait services-stable \
  --cluster "$ECS_CLUSTER" \
  --services "$ECS_SERVICE" \
  --region "$AWS_REGION" \
  --profile "$AWS_PROFILE"

echo "ECS service updated with image ${IMAGE_URI}"
