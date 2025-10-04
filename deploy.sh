#!/bin/bash

# Zenow Learn Backend - Google Cloud Run Deployment Script
# This script helps deploy the application to Google Cloud Run

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
IMAGE_NAME="gcr.io/$PROJECT_ID/$SERVICE_NAME"

# Function to print colored output
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

# Function to check if gcloud is installed and authenticated
check_gcloud() {
    if ! command -v gcloud &> /dev/null; then
        print_error "gcloud CLI is not installed. Please install it first."
        exit 1
    fi

    if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
        print_error "You are not authenticated with gcloud. Please run 'gcloud auth login' first."
        exit 1
    fi
}

# Function to set project ID
set_project() {
    if [ -z "$PROJECT_ID" ]; then
        print_status "Getting current project..."
        PROJECT_ID=$(gcloud config get-value project)
        if [ -z "$PROJECT_ID" ]; then
            print_error "No project ID set. Please run 'gcloud config set project YOUR_PROJECT_ID' first."
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
    print_success "APIs enabled successfully"
}

# Function to build and push Docker image
build_and_push() {
    print_status "Building Docker image..."
    docker build -t $IMAGE_NAME:latest .
    
    print_status "Pushing image to Google Container Registry..."
    docker push $IMAGE_NAME:latest
    
    print_success "Image built and pushed successfully"
}

# Function to deploy to Cloud Run
deploy_to_cloud_run() {
    print_status "Deploying to Google Cloud Run..."
    
    gcloud run deploy $SERVICE_NAME \
        --image $IMAGE_NAME:latest \
        --region $REGION \
        --platform managed \
        --allow-unauthenticated \
        --port 8080 \
        --memory 1Gi \
        --cpu 1 \
        --min-instances 0 \
        --max-instances 10 \
        --concurrency 100 \
        --timeout 300 \
        --set-env-vars NODE_ENV=production \
        --set-env-vars PORT=8080
    
    print_success "Deployment completed successfully"
}

# Function to get service URL
get_service_url() {
    print_status "Getting service URL..."
    SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --region $REGION --format="value(status.url)")
    print_success "Service URL: $SERVICE_URL"
    print_status "Health check: $SERVICE_URL/api/health"
}

# Function to run database migrations
run_migrations() {
    print_warning "Database migrations should be run manually after deployment."
    print_status "To run migrations, execute:"
    echo "gcloud run jobs create migrate-db \\"
    echo "  --image $IMAGE_NAME:latest \\"
    echo "  --region $REGION \\"
    echo "  --set-env-vars NODE_ENV=production \\"
    echo "  --command npm \\"
    echo "  --args run,migrate"
}

# Function to create admin user
create_admin_user() {
    print_warning "Admin user creation should be done manually after deployment."
    print_status "To create admin user, execute:"
    echo "gcloud run jobs create create-admin \\"
    echo "  --image $IMAGE_NAME:latest \\"
    echo "  --region $REGION \\"
    echo "  --set-env-vars NODE_ENV=production \\"
    echo "  --command npm \\"
    echo "  --args run,create-admin"
}

# Main deployment function
main() {
    print_status "Starting Zenow Learn Backend deployment to Google Cloud Run..."
    
    check_gcloud
    set_project
    enable_apis
    build_and_push
    deploy_to_cloud_run
    get_service_url
    run_migrations
    create_admin_user
    
    print_success "Deployment process completed!"
    print_status "Next steps:"
    echo "1. Set up your environment variables in Cloud Run"
    echo "2. Run database migrations"
    echo "3. Create an admin user"
    echo "4. Test your API endpoints"
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
        --service-name)
            SERVICE_NAME="$2"
            shift 2
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo "Options:"
            echo "  --project-id PROJECT_ID    Google Cloud Project ID"
            echo "  --region REGION           Google Cloud region (default: us-central1)"
            echo "  --service-name NAME       Cloud Run service name (default: zenow-learn-backend)"
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
