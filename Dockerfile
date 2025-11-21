# =========================================================
# Stage 1: Builder
# =========================================================
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files only first to leverage caching
COPY package*.json ./

# Disable Husky during build
ENV HUSKY_SKIP_INSTALL=1

# Install dependencies (dev dependencies included for build)
RUN npm ci --silent

# Copy source code
COPY . .

# Build TypeScript to /dist
RUN npm run build

# =========================================================
# Stage 2: Production
# =========================================================
FROM node:18-alpine AS production

WORKDIR /app

# Copy only package.json & package-lock.json for production install
COPY package*.json ./

# Disable Husky in production
ENV HUSKY_SKIP_INSTALL=1

# Install only production dependencies
RUN npm ci --omit=dev --silent --ignore-scripts && npm cache clean --force

# Copy built files from builder
COPY --from=builder /app/dist ./dist

# Use non-root user for security
USER node

# Expose default port (Cloud Run uses PORT env variable)
EXPOSE 8080

# Set default command
CMD ["node", "dist/index.js"]
