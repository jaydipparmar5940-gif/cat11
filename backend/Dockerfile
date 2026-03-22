# Production Dockerfile for CAT11 Backend & Workers
FROM node:18-alpine

# Install build dependencies for native modules (if any)
RUN apk add --no-cache python3 make g++

WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Expose API port
EXPOSE 5000

# Default command (can be overridden in docker-compose)
CMD ["npm", "start"]
