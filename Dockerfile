# ===========================
# Stage 1 — Build the app
# ===========================
FROM node:18-alpine AS builder

WORKDIR /app

# Disable Husky during builds
ENV HUSKY=0

# Install dependencies
COPY package*.json ./
RUN npm ci --silent --ignore-scripts

# Copy source and build
COPY . .
RUN npm run build

# Ensure build exists
RUN test -f dist/index.js

# ===========================
# Stage 2 — Production runtime
# ===========================
FROM node:18-alpine AS production

WORKDIR /app

# Disable Husky during runtime
ENV HUSKY=0

# Copy package files and install only production deps
COPY package*.json ./
RUN npm ci --omit=dev --silent --ignore-scripts && npm cache clean --force

# Copy built output only
COPY --from=builder /app/dist ./dist

# Run as non-root user
USER node

# Cloud Run listens on this port
EXPOSE 8080

# Optional health check (safe + minimal)
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/api/health', r => process.exit(r.statusCode===200?0:1))"

# Start the server
CMD ["node", "dist/index.js"]
