#!/bin/bash

# Test Script: Run Cascade Delete Test
# This script runs the SQL test to verify cascade delete behavior

echo "========================================"
echo "Testing Cascade Delete Behavior"
echo "========================================"

# Load environment variables
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

# Extract database connection details from DATABASE_URL
# Format: postgres://username:password@host:port/database
if [ -z "$DATABASE_URL" ]; then
  echo "ERROR: DATABASE_URL not set in .env"
  exit 1
fi

# Run the SQL test
echo "Running cascade delete test..."
echo ""

# Use psql to run the test
PGPASSWORD=$(echo $DATABASE_URL | sed -n 's/.*:\/\/.*:\(.*\)@.*/\1/p') \
psql $DATABASE_URL -f src/scripts/test-cascade-delete.sql

echo ""
echo "========================================"
echo "Test completed"
echo "========================================"
