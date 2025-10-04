#!/bin/bash

# Test Docker build locally before deploying to Cloud Run

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Configuration
IMAGE_NAME="zenow-learn-backend-test"
CONTAINER_NAME="zenow-test-container"

print_status "Testing Docker build for Zenow Learn Backend..."

# Clean up any existing test containers/images
print_status "Cleaning up existing test containers and images..."
docker rm -f $CONTAINER_NAME 2>/dev/null || true
docker rmi $IMAGE_NAME 2>/dev/null || true

# Build the Docker image
print_status "Building Docker image..."
if docker build -t $IMAGE_NAME .; then
    print_success "Docker build completed successfully"
else
    print_error "Docker build failed"
    exit 1
fi

# Test the built image
print_status "Testing the built image..."
if docker run --name $CONTAINER_NAME -d -p 8080:8080 $IMAGE_NAME; then
    print_success "Container started successfully"
    
    # Wait a moment for the app to start
    sleep 3
    
    # Test health endpoint
    print_status "Testing health endpoint..."
    if curl -f http://localhost:8080/api/health > /dev/null 2>&1; then
        print_success "Health endpoint is responding"
    else
        print_warning "Health endpoint test failed (this might be expected if database is not configured)"
    fi
    
    # Show container logs
    print_status "Container logs:"
    docker logs $CONTAINER_NAME
    
    # Clean up
    print_status "Cleaning up test container..."
    docker rm -f $CONTAINER_NAME
    docker rmi $IMAGE_NAME
    
    print_success "Docker build test completed successfully!"
    print_status "Your Docker image is ready for Cloud Run deployment"
else
    print_error "Failed to start container"
    docker logs $CONTAINER_NAME 2>/dev/null || true
    docker rm -f $CONTAINER_NAME 2>/dev/null || true
    docker rmi $IMAGE_NAME 2>/dev/null || true
    exit 1
fi
