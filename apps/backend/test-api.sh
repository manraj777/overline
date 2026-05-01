#!/bin/bash

# Overline API Integration Test Suite
# Tests all new features via HTTP endpoints

echo "🧪 Overline API Integration Tests"
echo "=================================="

API_URL="https://api.overline.in"
ADMIN_TOKEN=""
USER_TOKEN=""
SHOP_ID=""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

passed=0
failed=0

test_endpoint() {
  local method=$1
  local endpoint=$2
  local data=$3
  local expected_code=$4
  local description=$5

  echo -e "\n${YELLOW}Testing:${NC} $description"
  echo "  $method $endpoint"

  if [ -z "$data" ]; then
    response=$(curl -s -w "\n%{http_code}" -X "$method" \
      -H "Authorization: Bearer $ADMIN_TOKEN" \
      -H "Content-Type: application/json" \
      "$API_URL$endpoint")
  else
    response=$(curl -s -w "\n%{http_code}" -X "$method" \
      -H "Authorization: Bearer $ADMIN_TOKEN" \
      -H "Content-Type: application/json" \
      -d "$data" \
      "$API_URL$endpoint")
  fi

  http_code=$(echo "$response" | tail -1)
  body=$(echo "$response" | head -n -1)

  if [ "$http_code" = "$expected_code" ]; then
    echo -e "  ${GREEN}✓ PASS${NC} (HTTP $http_code)"
    passed=$((passed + 1))
  else
    echo -e "  ${RED}✗ FAIL${NC} (Expected $expected_code, got $http_code)"
    echo "  Response: $body"
    failed=$((failed + 1))
  fi
}

echo -e "\n${YELLOW}Step 1: Authentication${NC}"
echo "======================="

# Get admin token (assuming login endpoint exists)
# This step assumes admin is already created and can login
echo "Assuming admin token is obtained via login..."
# ADMIN_TOKEN="<your-admin-token>"

echo -e "\n${YELLOW}Step 2: Wallet Service Tests${NC}"
echo "=============================="

test_endpoint "GET" "/wallet/balance" "" "200" "Get wallet balance"
test_endpoint "GET" "/wallet/transactions" "" "200" "Get wallet transactions"

echo -e "\n${YELLOW}Step 3: OTP Service Tests${NC}"
echo "=========================="

# Test OTP send (should validate phone format)
test_endpoint "POST" "/otp/send" \
  '{"phone":"+919876543210","purpose":"LOGIN"}' \
  "200" "Send OTP to valid phone"

# Test invalid phone
test_endpoint "POST" "/otp/send" \
  '{"phone":"invalid","purpose":"LOGIN"}' \
  "400" "Reject invalid phone format"

echo -e "\n${YELLOW}Step 4: Booking Management Tests${NC}"
echo "================================="

# Get available shops (for testing)
test_endpoint "GET" "/shops?city=Mumbai" "" "200" "Get shops in Mumbai"

# Create a booking with payment type
test_endpoint "POST" "/bookings" \
  '{
    "shopId":"shop-id",
    "serviceIds":["service-id"],
    "startTime":"2026-03-15T15:00:00Z",
    "paymentType":"PAY_LATER"
  }' \
  "201" "Create booking with PAY_LATER"

echo -e "\n${YELLOW}Step 5: Booking Additional Features Tests${NC}"
echo "=========================================="

# Cancel with reason
test_endpoint "PATCH" "/bookings/booking-id/cancel-with-reason" \
  '{
    "reason":"EMERGENCY",
    "reasonDetails":"Family emergency came up"
  }' \
  "200" "Cancel booking with reason"

# Verify service code
test_endpoint "POST" "/bookings/booking-id/verify-code" \
  '{"code":"1234"}' \
  "200" "Verify 4-digit service code"

# Complete service
test_endpoint "POST" "/bookings/booking-id/complete" "" "200" "Complete service and credit free cash"

echo -e "\n${YELLOW}Step 6: Review & Feedback Tests${NC}"
echo "================================"

# Create review (customer rates shop)
test_endpoint "POST" "/reviews" \
  '{
    "bookingId":"booking-id",
    "rating":5,
    "comment":"Great service!",
    "staffRating":5
  }' \
  "201" "Create review for completed booking"

# Create user feedback (staff rates customer)
test_endpoint "POST" "/reviews/user-feedback" \
  '{
    "bookingId":"booking-id",
    "userId":"user-id",
    "rating":5,
    "wasOnTime":true,
    "wasPolite":true,
    "wouldServeAgain":true
  }' \
  "201" "Staff gives feedback about customer"

# Get customer feedback history
test_endpoint "GET" "/reviews/user-feedback/user-id" "" "200" "Get customer feedback history"

echo -e "\n${YELLOW}Test Summary${NC}"
echo "============"
echo -e "  ${GREEN}Passed: $passed${NC}"
echo -e "  ${RED}Failed: $failed${NC}"

if [ $failed -eq 0 ]; then
  echo -e "\n${GREEN}✓ All tests passed!${NC}"
  exit 0
else
  echo -e "\n${RED}✗ Some tests failed!${NC}"
  exit 1
fi
