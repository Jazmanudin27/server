# Multi-stage Dockerfile for Web-Termius

# Stage 1: Build Frontend Client
FROM node:20-alpine AS build-client
WORKDIR /app
COPY client/package*.json ./client/
RUN cd client && npm ci
COPY client/ ./client/
RUN cd client && npm run build

# Stage 2: Production Server
FROM node:20-alpine AS runner
WORKDIR /app

# Copy server package and install production dependencies
COPY server/package*.json ./server/
RUN cd server && npm ci --only=production

# Copy server code
COPY server/ ./server/

# Copy built frontend assets
COPY --from=build-client /app/client/dist ./client/dist

EXPOSE 3001

ENV PORT=3001
ENV NODE_ENV=production

WORKDIR /app/server
CMD ["node", "index.js"]
