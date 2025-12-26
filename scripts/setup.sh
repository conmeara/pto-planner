#!/bin/bash

# PTO Planner - Setup Script
# This script helps you set up the PTO Planner application with Firebase

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
    print_info "Let's set up your Firebase credentials"
    echo ""
    echo "You can find these in your Firebase Console:"
    echo "https://console.firebase.google.com/project/_/settings/general/"
    echo ""
    echo "For client-side configuration (from Firebase SDK config):"

    read -p "Enter your Firebase API Key: " firebase_api_key
    read -p "Enter your Firebase Auth Domain: " firebase_auth_domain
    read -p "Enter your Firebase Project ID: " firebase_project_id
    read -p "Enter your Firebase Storage Bucket: " firebase_storage_bucket
    read -p "Enter your Firebase Messaging Sender ID: " firebase_sender_id
    read -p "Enter your Firebase App ID: " firebase_app_id

    echo ""
    echo "For server-side configuration (from Firebase Service Account):"
    echo "Generate a service account key from:"
    echo "https://console.firebase.google.com/project/_/settings/serviceaccounts/adminsdk"
    echo ""

    read -p "Enter your Firebase Client Email (from service account): " firebase_client_email
    read -p "Enter path to service account private key file (or paste key): " firebase_private_key

    cat > .env.local << EOF
# Firebase Client Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=$firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=$firebase_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=$firebase_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=$firebase_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=$firebase_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=$firebase_app_id

# Firebase Admin SDK Configuration
FIREBASE_PROJECT_ID=$firebase_project_id
FIREBASE_CLIENT_EMAIL=$firebase_client_email
FIREBASE_PRIVATE_KEY=$firebase_private_key
EOF

    print_success ".env.local created"
fi

# Check Firebase CLI
print_header "Firebase CLI"
if ! command_exists firebase; then
    print_warning "Firebase CLI is not installed"
    read -p "Do you want to install it globally? (y/N): " install_cli
    if [[ $install_cli =~ ^[Yy]$ ]]; then
        print_info "Installing Firebase CLI..."
        npm install -g firebase-tools
        print_success "Firebase CLI installed"
    else
        print_info "Skipping Firebase CLI installation"
        print_info "You can install it later with: npm install -g firebase-tools"
    fi
else
    print_success "Firebase CLI detected"
fi

# Ask about Firestore setup
print_header "Firestore Setup"
echo "How do you want to set up your Firestore?"
echo "1) Deploy Firestore security rules now"
echo "2) I'll do it manually later"
read -p "Choose an option (1-2): " db_choice

case $db_choice in
    1)
        if ! command_exists firebase; then
            print_error "Firebase CLI is required to deploy rules"
            print_info "Install it with: npm install -g firebase-tools"
        else
            print_info "Logging in to Firebase..."
            firebase login

            print_info "Deploying Firestore rules and indexes..."
            firebase deploy --only firestore:rules,firestore:indexes

            print_success "Firestore rules and indexes deployed!"
        fi
        ;;
    2)
        print_info "Manual setup selected"
        print_info "To set up Firestore later:"
        echo "  1. Go to Firebase Console → Firestore Database"
        echo "  2. Create database in production mode"
        echo "  3. Deploy rules with: firebase deploy --only firestore"
        echo "  4. Or copy contents of firestore.rules to the console"
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
echo "  firebase deploy --only firestore - Deploy Firestore rules"
echo "  firebase emulators:start       - Start local Firebase emulators"
echo ""
print_success "Happy PTO planning! 🏖️"
