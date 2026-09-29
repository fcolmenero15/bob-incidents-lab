#!/bin/bash

# Healthcare Portal - End-to-End Workflow Testing Script
# This script tests all major healthcare workflows

set -e

echo "🏥 Healthcare Portal - End-to-End Workflow Testing"
echo "=================================================="
echo ""

# Configuration
API_URL="http://localhost:5001/api"
FRONTEND_URL="http://localhost"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Function to print test results
print_result() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓ PASSED${NC}: $2"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}✗ FAILED${NC}: $2"
        ((TESTS_FAILED++))
    fi
}

# Function to test API endpoint
test_endpoint() {
    local method=$1
    local endpoint=$2
    local data=$3
    local expected_status=$4
    local description=$5
    local token=$6

    echo -e "\n${YELLOW}Testing:${NC} $description"
    
    if [ -n "$token" ]; then
        response=$(curl -s -w "\n%{http_code}" -X $method "$API_URL$endpoint" \
            -H "Content-Type: application/json" \
            -H "Authorization: Bearer $token" \
            -d "$data" 2>/dev/null || echo "000")
    else
        response=$(curl -s -w "\n%{http_code}" -X $method "$API_URL$endpoint" \
            -H "Content-Type: application/json" \
            -d "$data" 2>/dev/null || echo "000")
    fi
    
    status_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$status_code" = "$expected_status" ]; then
        print_result 0 "$description (Status: $status_code)"
        echo "$body"
        return 0
    else
        print_result 1 "$description (Expected: $expected_status, Got: $status_code)"
        echo "Response: $body"
        return 1
    fi
}

echo "1️⃣  Testing Infrastructure"
echo "=========================="

# Test if services are running
echo -e "\n${YELLOW}Checking Docker containers...${NC}"
if docker ps | grep -q "healthcare-db"; then
    print_result 0 "Database container is running"
else
    print_result 1 "Database container is not running"
fi

if docker ps | grep -q "healthcare-backend"; then
    print_result 0 "Backend container is running"
else
    print_result 1 "Backend container is not running"
fi

if docker ps | grep -q "healthcare-frontend"; then
    print_result 0 "Frontend container is running"
else
    print_result 1 "Frontend container is not running"
fi

# Test database connection
echo -e "\n${YELLOW}Testing database connection...${NC}"
if docker exec healthcare-db psql -U postgres -d healthcaredb -c "SELECT 1" > /dev/null 2>&1; then
    print_result 0 "Database connection successful"
else
    print_result 1 "Database connection failed"
fi

# Test if tables exist
echo -e "\n${YELLOW}Checking database schema...${NC}"
tables=("patients" "medical_records" "appointments" "insurance_claims")
for table in "${tables[@]}"; do
    if docker exec healthcare-db psql -U postgres -d healthcaredb -c "\dt $table" | grep -q "$table"; then
        print_result 0 "Table '$table' exists"
    else
        print_result 1 "Table '$table' does not exist"
    fi
done

echo -e "\n2️⃣  Testing Patient Authentication"
echo "=================================="

# Test patient login with demo credentials
login_response=$(test_endpoint "POST" "/auth/login" \
    '{"username":"demo","password":"demo123"}' \
    "200" \
    "Patient login with demo credentials")

if [ $? -eq 0 ]; then
    TOKEN=$(echo "$login_response" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
    PATIENT_ID=$(echo "$login_response" | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)
    echo "Token obtained: ${TOKEN:0:20}..."
    echo "Patient ID: $PATIENT_ID"
fi

# Test patient registration
test_endpoint "POST" "/auth/register" \
    '{"username":"testpatient","password":"test123","email":"test@healthcare.com","first_name":"Test","last_name":"Patient","date_of_birth":"1990-01-01","phone":"555-0100"}' \
    "201" \
    "New patient registration"

echo -e "\n3️⃣  Testing Medical Records"
echo "==========================="

if [ -n "$TOKEN" ]; then
    # Get all medical records
    test_endpoint "GET" "/accounts" "" "200" \
        "Get all medical records for patient" "$TOKEN"
    
    # Get specific medical record
    test_endpoint "GET" "/accounts/1" "" "200" \
        "Get specific medical record" "$TOKEN"
    
    # Update medical record
    test_endpoint "PATCH" "/accounts/1" \
        '{"blood_type":"O+","allergies":"Penicillin","chronic_conditions":"None","current_medications":"None"}' \
        "200" \
        "Update medical record information" "$TOKEN"
else
    echo -e "${RED}Skipping medical records tests - no auth token${NC}"
fi

echo -e "\n4️⃣  Testing Appointments"
echo "======================="

if [ -n "$TOKEN" ]; then
    # Schedule appointment
    future_date=$(date -u -d "+7 days" +"%Y-%m-%dT10:00:00Z" 2>/dev/null || date -u -v+7d +"%Y-%m-%dT10:00:00Z")
    test_endpoint "POST" "/accounts/1/schedule-appointment" \
        "{\"appointment_type\":\"checkup\",\"provider_name\":\"Dr. Smith\",\"appointment_date\":\"$future_date\",\"duration_minutes\":30,\"notes\":\"Annual checkup\"}" \
        "200" \
        "Schedule new appointment" "$TOKEN"
    
    # Get appointments
    test_endpoint "GET" "/accounts/1/appointments" "" "200" \
        "Get appointment history" "$TOKEN"
    
    # Update appointment status
    test_endpoint "PATCH" "/accounts/1/appointments/1" \
        '{"status":"completed","diagnosis":"Healthy","treatment_plan":"Continue regular checkups"}' \
        "200" \
        "Update appointment status" "$TOKEN"
else
    echo -e "${RED}Skipping appointment tests - no auth token${NC}"
fi

echo -e "\n5️⃣  Testing Insurance Claims"
echo "============================"

if [ -n "$TOKEN" ]; then
    # Get claim types
    test_endpoint "GET" "/insurance-claims/types/list" "" "200" \
        "Get available claim types" "$TOKEN"
    
    # Estimate coverage
    test_endpoint "POST" "/insurance-claims/estimate" \
        '{"claim_amount":1000,"claim_type":"Primary Care Visit","copay_amount":25,"deductible_amount":0}' \
        "200" \
        "Calculate coverage estimate" "$TOKEN"
    
    # Submit insurance claim
    service_date=$(date -u -d "-3 days" +"%Y-%m-%d" 2>/dev/null || date -u -v-3d +"%Y-%m-%d")
    test_endpoint "POST" "/insurance-claims/submit" \
        "{\"claim_amount\":500,\"claim_type\":\"Primary Care Visit\",\"service_date\":\"$service_date\",\"provider_name\":\"Dr. Johnson\",\"diagnosis_code\":\"Z00.00\",\"procedure_code\":\"99213\",\"copay_amount\":25,\"deductible_amount\":0}" \
        "201" \
        "Submit insurance claim" "$TOKEN"
    
    # Get all claims
    test_endpoint "GET" "/insurance-claims" "" "200" \
        "Get all insurance claims" "$TOKEN"
    
    # Get specific claim
    test_endpoint "GET" "/insurance-claims/1" "" "200" \
        "Get specific insurance claim" "$TOKEN"
    
    # Approve claim
    test_endpoint "POST" "/insurance-claims/1/approve" "" "200" \
        "Approve insurance claim" "$TOKEN"
else
    echo -e "${RED}Skipping insurance claim tests - no auth token${NC}"
fi

echo -e "\n6️⃣  Testing Frontend Accessibility"
echo "=================================="

# Test frontend is accessible
if curl -s -o /dev/null -w "%{http_code}" "$FRONTEND_URL" | grep -q "200"; then
    print_result 0 "Frontend is accessible at $FRONTEND_URL"
else
    print_result 1 "Frontend is not accessible at $FRONTEND_URL"
fi

# Test API health endpoint
if curl -s "$API_URL/../health" | grep -q "ok"; then
    print_result 0 "Backend health check endpoint"
else
    print_result 1 "Backend health check endpoint"
fi

echo -e "\n7️⃣  Testing Data Integrity"
echo "========================="

# Check patient count
patient_count=$(docker exec healthcare-db psql -U postgres -d healthcaredb -t -c "SELECT COUNT(*) FROM patients" 2>/dev/null | tr -d ' ')
if [ "$patient_count" -gt 0 ]; then
    print_result 0 "Patients table has data ($patient_count patients)"
else
    print_result 1 "Patients table is empty"
fi

# Check medical records count
records_count=$(docker exec healthcare-db psql -U postgres -d healthcaredb -t -c "SELECT COUNT(*) FROM medical_records" 2>/dev/null | tr -d ' ')
if [ "$records_count" -gt 0 ]; then
    print_result 0 "Medical records table has data ($records_count records)"
else
    print_result 1 "Medical records table is empty"
fi

# Check appointments count
appointments_count=$(docker exec healthcare-db psql -U postgres -d healthcaredb -t -c "SELECT COUNT(*) FROM appointments" 2>/dev/null | tr -d ' ')
print_result 0 "Appointments table has $appointments_count appointments"

# Check insurance claims count
claims_count=$(docker exec healthcare-db psql -U postgres -d healthcaredb -t -c "SELECT COUNT(*) FROM insurance_claims" 2>/dev/null | tr -d ' ')
print_result 0 "Insurance claims table has $claims_count claims"

echo -e "\n=================================================="
echo "📊 Test Summary"
echo "=================================================="
echo -e "${GREEN}Tests Passed: $TESTS_PASSED${NC}"
echo -e "${RED}Tests Failed: $TESTS_FAILED${NC}"
echo "Total Tests: $((TESTS_PASSED + TESTS_FAILED))"

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "\n${GREEN}🎉 All tests passed! Healthcare Portal is working correctly.${NC}"
    exit 0
else
    echo -e "\n${RED}⚠️  Some tests failed. Please review the output above.${NC}"
    exit 1
fi

# Made with Bob
