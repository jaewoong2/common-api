# Build stage: compile NestJS to dist
FROM node:20-alpine AS builder
WORKDIR /app

# Build deps for native modules
RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm ci

COPY . .
ENV NODE_OPTIONS="--max-old-space-size=2496"
RUN npm run build

# Lambda deps/runtime (Amazon Linux base to match Lambda environment)
FROM public.ecr.aws/lambda/nodejs:20 AS lambda
WORKDIR /var/task
# NODE_ENV will be set via Lambda environment variables

# AL2023 uses dnf (yum not present)
RUN dnf install -y gcc make python3 tar gzip && dnf clean all
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
# Optional: include .env for Lambda runtime (ensure it exists in build context)
COPY --from=builder /app/.env ./.env

# Lambda handler entrypoint
CMD ["dist/lambda.handler"]

# ECS/Fargate runtime image (Alpine)
FROM node:20-alpine AS ecs
WORKDIR /usr/src/app
# NODE_ENV will be set via ECS task definition environment variables

# Build deps for native modules
RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
# Optional: include .env for ECS runtime (ensure it exists in build context)
COPY --from=builder /app/.env ./.env

EXPOSE 8000

# Fastify/Nest entrypoint for ECS
CMD ["node", "dist/main.js"]
