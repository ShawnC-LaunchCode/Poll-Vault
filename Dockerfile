# Multi-stage Docker build for Poll Vault
#
# ==============================================================================
# 💡 FIX START: Declare ARG at the top of the file. Railway will pass secrets/vars
# with matching names (like VITE_...) as build arguments automatically.
ARG VITE_GOOGLE_CLIENT_ID
# ==============================================================================

# Stage 1: Build stage with all dependencies
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files (NOTE: Assuming your package.json is now clean/valid JSON)
COPY package*.json ./

# Install ALL dependencies (including devDependencies needed for build)
RUN npm ci --legacy-peer-deps

# Copy source code
COPY . .

# ==============================================================================
# 💡 FIX APPLIED 1: Set the ENV variable explicitly using the ARG value. 
# This ensures it's available to the shell environment for the build command.
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID
#
# 💡 REMOVED DIAGNOSTIC: The failing check has been removed.
# ==============================================================================

# Build the application
# We rely on the ENV VITE_GOOGLE_CLIENT_ID set immediately above.
RUN npm run build

# Stage 2: Production stage with only runtime dependencies
FROM node:20-alpine AS production

WORKDIR /app

# Create a non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# Copy package files
COPY package*.json ./

# Install only production dependencies
# NOTE: This step assumes the fixed package.json is now available and valid JSON
RUN npm ci --omit=dev --legacy-peer-deps && npm cache clean --force

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Copy any other runtime files needed
COPY --from=builder /app/shared ./shared

# Create uploads directory for file handling and set ownership
RUN mkdir -p uploads && \
    chown -R nextjs:nodejs /app

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:5000/api/health', (res) => { \
        if (res.statusCode === 200) process.exit(0); else process.exit(1); \
    }).on('error', () => process.exit(1))"

# Start the application
CMD ["npm", "start"]
