# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:22-alpine AS production

WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S watchdog -u 1001

# Copy package files and install production dependencies only
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy built application from builder
COPY --from=builder /app/build ./build

# Create data directory and set permissions
RUN mkdir -p /app/data && chown -R watchdog:nodejs /app

# Switch to non-root user
USER watchdog

# Expose port
EXPOSE 4012

# Environment defaults
ENV NODE_ENV=production
ENV PORT=4012

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:4012/ || exit 1

# Start the application
CMD ["node", "build/index.js"]
