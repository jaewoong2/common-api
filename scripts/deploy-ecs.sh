#!/bin/bash
set -euo pipefail

# TODO: 빌드 → 컨테이너 이미지 태깅 → 레지스트리 푸시 → ECS 서비스 업데이트 순으로 구현하세요.
echo "deploy-ecs: build container image and update ECS service"
