#!/bin/bash

# PTO Planner - Setup Script
# This script helps you set up the PTO Planner application with Supabase

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
print_header() {
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}\n"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Main setup
print_header "PTO Planner Setup Wizard 🏖️"

# Check Node.js
print_info "Checking prerequisites..."
if ! command_exists node; then
    print_error "Node.js is not installed. Please install Node.js 18+ from https://nodejs.org/"
    exit 1
fi
print_success "Node.js $(node -v) detected"

# Check npm
if ! command_exists npm; then
    print_error "npm is not installed. Please install npm."
    exit 1
fi
print_success "npm $(npm -v) detected"

# Install dependencies
print_header "Installing Dependencies"
print_info "Running npm install..."
npm install
print_success "Dependencies installed"

# Check for .env.local
print_header "Environment Configuration"
if [ -f ".env.local" ]; then
    print_warning ".env.local already exists"
    read -p "Do you want to reconfigure it? (y/N): " reconfigure
    if [[ $reconfigure =~ ^[Yy]$ ]]; then
        rm .env.local
    else
        print_info "Keeping existing .env.local"
    fi
fi

if [ ! -f ".env.local" ]; then
    print_info "Let's set up your Supabase credentials"
    echo ""
    echo "You can find these in your Supabase Dashboard:"
    echo "https://app.supabase.com/project/_/settings/api"
    echo ""
    
    read -p "Enter your Supabase Project URL: " supabase_url
    read -p "Enter your Supabase Anon Key: " supabase_anon_key
    
    cat > .env.local << EOF
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=$supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=$supabase_anon_key
EOF
    
    print_success ".env.local created"
fi

# Check Supabase CLI
print_header "Supabase CLI"
if ! command_exists supabase; then
    print_warning "Supabase CLI is not installed"
    read -p "Do you want to install it globally? (y/N): " install_cli
    if [[ $install_cli =~ ^[Yy]$ ]]; then
        print_info "Installing Supabase CLI..."
        npm install -g supabase
        print_success "Supabase CLI installed"
    else
        print_info "Skipping Supabase CLI installation"
        print_info "You can install it later with: npm install -g supabase"
    fi
else
    print_success "Supabase CLI detected"
fi

# Ask about database setup
print_header "Database Setup"
echo "How do you want to set up your database?"
echo "1) Local development with Docker (Supabase Local)"
echo "2) Cloud Supabase project"
echo "3) I'll do it manually later"
read -p "Choose an option (1-3): " db_choice

case $db_choice in
    1)
        print_info "Setting up local Supabase..."
        if ! command_exists docker; then
            print_error "Docker is not installed. Please install Docker Desktop."
            print_info "Get it from: https://www.docker.com/products/docker-desktop/"
            exit 1
        fi
        
        if ! command_exists supabase; then
            print_error "Supabase CLI is required for local development"
            print_info "Install it with: npm install -g supabase"
            exit 1
        fi
        
        print_info "Starting local Supabase (this may take a few minutes)..."
        supabase start
        
        print_success "Local Supabase is running!"
        print_info "Studio URL: http://localhost:54323"
        print_info "API URL: http://localhost:54321"
        ;;
    2)
        print_info "Cloud setup selected"
        if command_exists supabase; then
            read -p "Do you want to link to your Supabase project now? (y/N): " link_project
            if [[ $link_project =~ ^[Yy]$ ]]; then
                print_info "Logging in to Supabase..."
                supabase login
                
                read -p "Enter your project reference (from dashboard URL): " project_ref
                supabase link --project-ref "$project_ref"
                
                print_info "Pushing database migrations..."
                supabase db push
                
                print_success "Database migrations applied!"
            else
                print_info "You can link later with: supabase link --project-ref YOUR_REF"
                print_info "Then push migrations with: supabase db push"
            fi
        else
            print_warning "Supabase CLI not available"
            print_info "Apply migrations manually via Supabase Dashboard → SQL Editor"
            print_info "Run the SQL files in: supabase/migrations/"
        fi
        ;;
    3)
        print_info "Manual setup selected"
        print_info "To set up your database later:"
        echo "  1. Go to your Supabase Dashboard → SQL Editor"
        echo "  2. Run the migrations in order from: supabase/migrations/"
        echo "  3. Optionally run: supabase/seed.sql for test data"
        ;;
esac

# Final message
print_header "Setup Complete! 🎉"
print_success "PTO Planner is ready to use!"
echo ""
print_info "Next steps:"
echo "  1. Start the development server: npm run dev"
echo "  2. Open http://localhost:3000 in your browser"
echo "  3. Check out docs/guides/setup.md for more details"
echo ""
print_info "Helpful commands:"
echo "  npm run dev                    - Start dev server"
echo "  npm run supabase:start        - Start local Supabase"
echo "  npm run supabase:status       - Check Supabase status"
echo ""
print_success "Happy PTO planning! 🏖️"
