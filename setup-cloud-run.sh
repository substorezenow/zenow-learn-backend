#!/bin/bash

# Zenow Learn Backend - Google Cloud Run Setup Script
# This script sets up the complete environment for Cloud Run deployment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ID=""
REGION="us-central1"
SERVICE_NAME="zenow-learn-backend"

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    # Check if gcloud is installed
    if ! command -v gcloud &> /dev/null; then
        print_error "gcloud CLI is not installed. Please install it first:"
        echo "https://cloud.google.com/sdk/docs/install"
        exit 1
    fi
    
    # Check if docker is installed
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install it first:"
        echo "https://docs.docker.com/get-docker/"
        exit 1
    fi
    
    # Check if user is authenticated
    if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
        print_error "You are not authenticated with gcloud. Please run:"
        echo "gcloud auth login"
        exit 1
    fi
    
    print_success "All prerequisites met"
}

# Function to get project ID
get_project_id() {
    if [ -z "$PROJECT_ID" ]; then
        print_status "Getting current project..."
        PROJECT_ID=$(gcloud config get-value project)
        if [ -z "$PROJECT_ID" ]; then
            print_error "No project ID set. Please run:"
            echo "gcloud config set project YOUR_PROJECT_ID"
            exit 1
        fi
    fi
    print_success "Using project: $PROJECT_ID"
}

# Function to enable required APIs
enable_apis() {
    print_status "Enabling required Google Cloud APIs..."
    
    gcloud services enable cloudbuild.googleapis.com
    gcloud services enable run.googleapis.com
    gcloud services enable containerregistry.googleapis.com
    gcloud services enable logging.googleapis.com
    gcloud services enable monitoring.googleapis.com
    
    print_success "APIs enabled successfully"
}

# Function to create environment file
create_env_file() {
    if [ ! -f ".env" ]; then
        print_status "Creating .env file from template..."
        cp env.example .env
        print_warning "Please edit .env file with your actual values before deploying"
        print_status "Required variables to set:"
        echo "  - COCKROACH_URL (your database connection string)"
        echo "  - JWT_SECRET (generate with: node -e \"console.log(require('crypto').randomBytes(64).toString('hex'))\")"
        echo "  - CORS_ORIGIN (your frontend domain)"
    else
        print_status ".env file already exists"
    fi
}

# Function to generate secrets
generate_secrets() {
    print_status "Generating secure secrets..."
    
    # Generate JWT secret
    JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))" 2>/dev/null || echo "your-jwt-secret-$(date +%s)")
    
    # Generate session encryption key
    SESSION_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))" 2>/dev/null || echo "your-session-key-$(date +%s)")
    
    # Generate CSRF secret
    CSRF_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))" 2>/dev/null || echo "your-csrf-secret-$(date +%s)")
    
    print_success "Generated secrets:"
    echo "JWT_SECRET: $JWT_SECRET"
    echo "SESSION_ENCRYPTION_KEY: $SESSION_KEY"
    echo "CSRF_SECRET: $CSRF_SECRET"
    
    # Update .env file if it exists
    if [ -f ".env" ]; then
        sed -i.bak "s/your-super-secret-jwt-key-change-this-in-production/$JWT_SECRET/g" .env
        sed -i.bak "s/your-32-byte-session-encryption-key/$SESSION_KEY/g" .env
        sed -i.bak "s/your-csrf-secret-key/$CSRF_SECRET/g" .env
        rm .env.bak
        print_success "Updated .env file with generated secrets"
    fi
}

# Function to test Docker build
test_docker_build() {
    print_status "Testing Docker build..."
    
    if docker build -t $SERVICE_NAME:test . > /dev/null 2>&1; then
        print_success "Docker build test passed"
        docker rmi $SERVICE_NAME:test > /dev/null 2>&1
    else
        print_error "Docker build test failed. Please check your Dockerfile and dependencies."
        exit 1
    fi
}

# Function to create deployment checklist
create_checklist() {
    print_status "Creating deployment checklist..."
    
    cat > DEPLOYMENT_CHECKLIST.md << EOF
# Deployment Checklist

## Pre-deployment
- [ ] Set up CockroachDB instance
- [ ] Configure .env file with correct values
- [ ] Test Docker build locally
- [ ] Verify all environment variables

## Required Environment Variables
- [ ] COCKROACH_URL - Database connection string
- [ ] JWT_SECRET - Generated secure secret
- [ ] CORS_ORIGIN - Frontend domain(s)
- [ ] NODE_ENV=production

## Post-deployment
- [ ] Run database migrations
- [ ] Create admin user
- [ ] Test health endpoint
- [ ] Test API endpoints
- [ ] Configure monitoring alerts

## Testing Commands
\`\`\`bash
# Test health endpoint
curl https://your-service-url/api/health

# Test categories endpoint
curl https://your-service-url/api/categories

# Test authentication
curl -X POST https://your-service-url/api/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{"username":"admin","password":"password"}'
\`\`\`
EOF

    print_success "Created DEPLOYMENT_CHECKLIST.md"
}

# Function to display next steps
show_next_steps() {
    print_success "Setup completed successfully!"
    echo
    print_status "Next steps:"
    echo "1. Edit .env file with your database connection and other settings"
    echo "2. Run: ./deploy.sh --project-id $PROJECT_ID"
    echo "3. Set environment variables in Cloud Run"
    echo "4. Run database migrations"
    echo "5. Create admin user"
    echo "6. Test your deployment"
    echo
    print_status "Useful commands:"
    echo "  View logs: gcloud logging read 'resource.type=cloud_run_revision AND resource.labels.service_name=$SERVICE_NAME'"
    echo "  Update service: gcloud run services update $SERVICE_NAME --region $REGION"
    echo "  Delete service: gcloud run services delete $SERVICE_NAME --region $REGION"
}

# Main setup function
main() {
    print_status "Starting Zenow Learn Backend Cloud Run setup..."
    echo
    
    check_prerequisites
    get_project_id
    enable_apis
    create_env_file
    generate_secrets
    test_docker_build
    create_checklist
    show_next_steps
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --project-id)
            PROJECT_ID="$2"
            shift 2
            ;;
        --region)
            REGION="$2"
            shift 2
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo "Options:"
            echo "  --project-id PROJECT_ID    Google Cloud Project ID"
            echo "  --region REGION           Google Cloud region (default: us-central1)"
            echo "  --help                    Show this help message"
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Run main function
main
