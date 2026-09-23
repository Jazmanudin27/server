# Multi-stage Dockerfile for Web-Termius

# Stage 1: Build Frontend Client
FROM node:20-alpine AS build-client
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# Stage 2: Production Server
FROM node:20-alpine AS runner
WORKDIR /app

# Copy server package and install production dependencies
COPY server/package*.json ./
RUN npm ci --only=production

# Copy server code
COPY server/ ./

# Copy built frontend assets to server/client/dist
COPY --from=build-client /app/client/dist ./client/dist

EXPOSE 3001

ENV PORT=3001
ENV NODE_ENV=production

CMD ["node", "index.js"]
