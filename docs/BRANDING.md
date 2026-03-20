# Overline Branding Configuration
# ===============================
# Customize these values to match your brand

# =============================================================================
# APP BRANDING
# =============================================================================

APP_NAME="Overline"
APP_TAGLINE="Book appointments effortlessly"
APP_DESCRIPTION="Multi-tenant appointment & queue management system"

# Primary Colors (Hex codes)
# These will be used throughout the app
PRIMARY_COLOR_50="#f0f9ff"
PRIMARY_COLOR_500="#0ea5e9"   # Main brand color
PRIMARY_COLOR_600="#0284c7"   # Darker shade for hover
PRIMARY_COLOR_700="#0369a1"   # Even darker

# Accent Colors
ACCENT_COLOR_500="#d946ef"

# =============================================================================
# CUSTOMIZE YOUR SHOP (for seed data)
# =============================================================================

# Your Business Details
SHOP_NAME="Your Business Name"
SHOP_TYPE="SALON"  # Options: SALON, CLINIC, BARBER, SPA, OTHER
SHOP_DESCRIPTION="Your business description here"
SHOP_ADDRESS="Your Street Address"
SHOP_CITY="Your City"
SHOP_STATE="Your State"
SHOP_POSTAL_CODE="123456"
SHOP_COUNTRY="IN"
SHOP_PHONE="+91 9876543210"
SHOP_EMAIL="contact@yourbusiness.com"

# Owner Account
OWNER_NAME="Your Name"
OWNER_EMAIL="owner@yourbusiness.com"
OWNER_PASSWORD="changeme123"

# =============================================================================
# SERVICES (customize in seed.ts)
# =============================================================================

# Example Services for a Salon:
# - Haircut (Men): 30 min, ₹400
# - Haircut (Women): 45 min, ₹800
# - Hair Color: 90 min, ₹2500
# - Beard Trim: 15 min, ₹200
# - Head Massage: 20 min, ₹300

# Example Services for a Clinic:
# - General Consultation: 15 min, ₹500
# - Follow-up Visit: 10 min, ₹300
# - Lab Tests: 30 min, ₹1000
# - Vaccination: 15 min, ₹250

# =============================================================================
# WORKING HOURS (customize in seed.ts)
# =============================================================================

# Monday-Friday: 10:00 AM - 8:00 PM
# Saturday: 9:00 AM - 9:00 PM
# Sunday: 10:00 AM - 6:00 PM
# Break: 2:00 PM - 3:00 PM (weekdays)

# =============================================================================
# TO APPLY CHANGES:
# =============================================================================

# 1. Update the colors in:
#    - apps/user-web/tailwind.config.js
#    - apps/admin-web/tailwind.config.js

# 2. Update seed data in:
#    - apps/backend/prisma/seed.ts

# 3. Update app name in:
#    - apps/user-web/.env.local
#    - apps/admin-web/.env.local

# 4. Re-run seed:
#    pnpm db:seed
