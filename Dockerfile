# Stage 1: Build
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --silent --ignore-scripts
COPY . .
RUN npm run build

# Stage 2: Production
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev --silent --ignore-scripts && npm cache clean --force
COPY --from=builder /app/dist ./dist

# Use non-root user for security
USER node

# Expose dynamic port (Cloud Run ignores Docker EXPOSE)
EXPOSE 8080

# Start app
CMD ["node", "dist/index.js"]
