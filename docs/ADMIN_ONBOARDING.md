# Shop Owner Onboarding & Registration Flow

## Complete Admin Website Flow Guide

### 1. Shop Owner Registration Journey

#### Step 1: Register Page
**URL:** `https://shop.overline.in/auth/register`

```
┌─────────────────────────────────────────────────┐
│          REGISTER YOUR SHOP BUSINESS             │
├─────────────────────────────────────────────────┤
│                                                 │
│ Owner Information                               │
│ ┌─────────────────────────────────────────────┐│
│ │ Full Name: [___________________________]    ││
│ │ Email:     [owner@clinic.com___________]    ││
│ │ Password:  [____________________] ✓ Strong  ││
│ │ Phone:     [+91 98765 43210_____]           ││
│ └─────────────────────────────────────────────┘│
│                                                 │
│ Shop Information                                │
│ ┌─────────────────────────────────────────────┐│
│ │ Shop Name: [Johns Dental Clinic_______]     ││
│ │ Shop Type: [Clinic ▼]                       ││
│ │ Address:   [123 Main Street_________]       ││
│ │ City:      [Mumbai_________________]        ││
│ │ State:     [Maharashtra____________]        ││
│ │ ZIP Code:  [400001_________________]        ││
│ │                                             ││
│ │ Location (Optional):                        ││
│ │ Latitude:  [19.0760_________________]       ││
│ │ Longitude: [72.8777_________________]       ││
│ └─────────────────────────────────────────────┘│
│                                                 │
│         [Register Shop]  [Already Registered?] │
└─────────────────────────────────────────────────┘
```

**Fields:**
- **Owner Name**: Full name of shop owner
- **Email**: Business email (will be used for login)
- **Password**: Strong password (min 8 chars, uppercase, number, special char)
- **Phone**: Shop contact number (for verification)
- **Shop Name**: Registered shop name
- **Shop Type**: CLINIC, SALON, BARBER, SPA, OTHER
- **Complete Address**: Street, building details
- **City**: Shop location
- **State**: Region/State
- **ZIP Code**: Postal code
- **Latitude/Longitude**: GPS coordinates (auto-filled from address if available)

---

#### Step 2: Google Verification Check
**Duration:** 2-3 seconds (automatic)

```
┌─────────────────────────────────────────────────┐
│          VERIFYING YOUR SHOP...                  │
├─────────────────────────────────────────────────┤
│                                                 │
│  🔍 Searching Google Places...                  │
│  ↳ Checking: "Johns Dental Clinic"              │
│     Location: "123 Main Street, Mumbai"         │
│                                                 │
│  ⏳ This takes 2-3 seconds                       │
│                                                 │
└─────────────────────────────────────────────────┘
```

**What Happens:**
1. System searches Google Places API with shop name + address
2. Matches against existing registered businesses
3. Auto-fetches: latitude, longitude, rating, reviews

**Outcomes:**

**✓ Found on Google:**
```
┌─────────────────────────────────────────────────┐
│          ✓ GOOGLE VERIFIED!                     │
├─────────────────────────────────────────────────┤
│                                                 │
│  Your shop is verified on Google Places!       │
│                                                 │
│  📍 Johns Dental Clinic                        │
│  📍 Address: 123 Main Street, Mumbai, 400001  │
│  📍 Rating: 4.5/5 ⭐ (24 reviews)             │
│  📍 Verified: Yes                              │
│                                                 │
│  Your shop will display:                        │
│  • Google Verified Badge ✓                     │
│  • Customer Ratings                             │
│  • Accurate Location on Map                     │
│                                                 │
│         [Continue]                              │
└─────────────────────────────────────────────────┘
```

**✗ Not Found on Google:**
```
┌─────────────────────────────────────────────────┐
│     NOT YET ON GOOGLE (No Worries!)             │
├─────────────────────────────────────────────────┤
│                                                 │
│  Your shop wasn't found on Google Places.      │
│                                                 │
│  📍 Johns Dental Clinic                        │
│  📍 This is OK! You can still register.        │
│                                                 │
│  To get Google Verified in future:             │
│  • Complete your Google Business Profile       │
│  • It usually takes 2-4 weeks                  │
│  • We'll auto-verify when found                │
│                                                 │
│      [Continue Registration]                   │
└─────────────────────────────────────────────────┘
```

---

#### Step 3: Account Created - Welcome
**Duration:** Instant

```
┌─────────────────────────────────────────────────┐
│          ✓ ACCOUNT CREATED!                     │
├─────────────────────────────────────────────────┤
│                                                 │
│  Welcome to Overline Admin                      │
│                                                 │
│  Your Shop Registration:                        │
│  ┌───────────────────────────────────────────┐ │
│  │ Shop: Johns Dental Clinic                 │ │
│  │ Owner: John Doe                           │ │
│  │ Email: owner@clinic.com                   │ │
│  │ Phone: +91 98765 43210                    │ │
│  │ Status: Active ✓                          │ │
│  │ Verification: Google Verified ✓           │ │
│  │ Signup Date: Mar 1, 2026, 10:30 AM       │ │
│  └───────────────────────────────────────────┘ │
│                                                 │
│  Next Steps:                                    │
│  1. 📅 Set Working Hours                       │
│  2. 👥 Add Staff Members                       │
│  3. 💇 Add Services & Pricing                  │
│  4. 🎨 Upload Shop Photos                      │
│  5. 🗺️  Verify Shop Location                   │
│                                                 │
│     [Go to Dashboard]  [View Quick Tutorial]   │
└─────────────────────────────────────────────────┘
```

---

### 2. Admin Dashboard - Shop Setup Wizard

**URL:** `https://shop.overline.in/dashboard`

```
┌─────────────────────────────────────────────────────────────┐
│  Overline Admin Dashboard - Johns Dental Clinic             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  📌 SETUP WIZARD (5 Steps)                                  │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  [✓] 1. Create Shop     [✓] 2. Basic Info  [→] 3. Hours    │
│  [  ] 4. Services       [  ] 5. Staff                       │
│                                                             │
│  CURRENT STEP: Working Hours                                │
│  ┌─────────────────────────────────────────────────────────┐│
│  │  Set Your Business Hours                               ││
│  │                                                        ││
│  │  Monday      [09:00] - [18:00]  Enabled  ☑            ││
│  │  Tuesday     [09:00] - [18:00]  Enabled  ☑            ││
│  │  Wednesday   [09:00] - [18:00]  Enabled  ☑            ││
│  │  Thursday    [09:00] - [18:00]  Enabled  ☑            ││
│  │  Friday      [09:00] - [18:00]  Enabled  ☑            ││
│  │  Saturday    [10:00] - [15:00]  Enabled  ☑            ││
│  │  Sunday      [        ] Closed    ☐                    ││
│  │                                                        ││
│  │  ⏰ Add Break Time (Optional):                         ││
│  │     [+ Add Break]                                       ││
│  │                                                        ││
│  │                   [Skip] [Next: Add Services]          ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  💡 Tip: Customers will see these hours on booking page    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

### 3. Shop Details & Verification Tab

**URL:** `https://shop.overline.in/shop/settings`

```
┌─────────────────────────────────────────────────────────────┐
│  Shop Settings - Johns Dental Clinic                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  🏪 BASIC INFORMATION                                       │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Shop Name:     Johns Dental Clinic                     ││
│  │ Shop Type:     Clinic                                  ││
│  │ Founded:       Jan 15, 2020                            ││
│  │ Address:       123 Main Street                         ││
│  │ City:          Mumbai                                  ││
│  │ State:         Maharashtra                             ││
│  │ Postal Code:   400001                                  ││
│  │ Country:       India                                   ││
│  │ Phone:         +91 98765 43210                         ││
│  │ Email:         contact@johnsdentalclinic.com           ││
│  │ Website:       www.johnsdentalclinic.com              ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  ✓ VERIFICATION STATUS                                     │
│  ┌─────────────────────────────────────────────────────────┐│
│  │                                                        ││
│  │  [✓ Google Verified]  [✓ Customer Verified]           ││
│  │   FULLY VERIFIED ✓                                      ││
│  │                                                        ││
│  │  🏆 Google Places Rating: 4.5/5 ⭐                    ││
│  │      24 Reviews | Last updated: Mar 1, 2026           ││
│  │                                                        ││
│  │  📍 Verified Location:                                 ││
│  │      19.0760°N, 72.8777°E (Auto-updated from Google) ││
│  │                                                        ││
│  │  ✓ Verified Date: March 1, 2026 10:30 AM             ││
│  │                                                        ││
│  │  Admin Notes:                                          ││
│  │  [................................... Edit]             ││
│  │                                                        ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  🖼️ SHOP MEDIA                                             │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Logo: [Upload Logo Image]                             ││
│  │ Cover Photo: [Upload Cover Photo]                     ││
│  │ Shop Photos: [Upload Up to 10 Photos]                 ││
│  │   • photo1.jpg                                         ││
│  │   • photo2.jpg                                         ││
│  │   • photo3.jpg                                         ││
│  │   [+ Add More]                                          ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  🗺️ LOCATION & MAP                                         │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ [            MAP PREVIEW              ]               ││
│  │ [          (Google Map)                ]               ││
│  │ [                 📍                    ]               ││
│  │ [  Latitude: 19.0760                   ]               ││
│  │ [  Longitude: 72.8777                  ]               ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│                       [Save Changes]                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

### 4. Services Management

**URL:** `https://shop.overline.in/services`

```
┌─────────────────────────────────────────────────────────────┐
│  Services - Johns Dental Clinic                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Your Services                          [Add New Service]  │
│  ┌─────────────────────────────────────────────────────────┐│
│  │                                                        ││
│  │  Service Name          Duration    Price    Status    ││
│  │  ──────────────────────────────────────────────────   ││
│  │  ✓ General Checkup     30 min      ₹500     Active   ││
│  │  ✓ Root Canal          60 min      ₹3000    Active   ││
│  │  ✓ Teeth Cleaning      45 min      ₹800     Active   ││
│  │  ✓ Whitening          90 min      ₹5000    Active   ││
│  │  ✓ Implant Setup       120 min     ₹8000    Active   ││
│  │                                           [Edit][Del] ││
│  │  [+ Add More Services]                                ││
│  │                                                        ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  💡 Customers will see these services on booking page     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

### 5. Staff Management

**URL:** `https://shop.overline.in/staff`

```
┌─────────────────────────────────────────────────────────────┐
│  Staff Members - Johns Dental Clinic                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Team Members                              [Add Staff]     │
│  ┌─────────────────────────────────────────────────────────┐│
│  │                                                        ││
│  │  Name              Email            Phone     Status   ││
│  │  ──────────────────────────────────────────────────   ││
│  │  ✓ Dr. Sarah        sarah@clinic.com  9876123456      ││
│  │    Dental Specialist | Services: 5 | Bookings: 42    ││
│  │                                           [Edit][Del] ││
│  │                                                        ││
│  │  ✓ Dr. Ahmed        ahmed@clinic.com  9876123457      ││
│  │    Orthodontist | Services: 3 | Bookings: 38        ││
│  │                                           [Edit][Del] ││
│  │                                                        ││
│  │  ✓ Nurse Maria      maria@clinic.com  9876123458      ││
│  │    Assistant | Services: 4 | Bookings: 65           ││
│  │                                           [Edit][Del] ││
│  │  [+ Add Staff Member]                                 ││
│  │                                                        ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  📊 Staff Stats:                                            │
│  • Total Staff: 3                                           │
│  • Total Bookings: 145                                      │
│  • Avg Rating: 4.6/5                                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

### 6. Bookings & Queue Management

**URL:** `https://shop.overline.in/appointments`

```
┌─────────────────────────────────────────────────────────────┐
│  Today's Appointments - Johns Dental Clinic               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  📅 March 1, 2026     [← Previous] [→ Next]               │
│  ┌─────────────────────────────────────────────────────────┐│
│  │  Time    Customer      Service        Staff    Status   ││
│  │  ────────────────────────────────────────────────────  ││
│  │  10:00   Raj Patel     General Chkup  Dr.Sarah Confirmed││
│  │  10:30   [⚠ High Risk]                                 ││
│  │          Emma Wilson   Root Canal     Dr.Ahmed Pending  ││
│  │          Trust Score: 45% (Frequent no-shows)          ││
│  │                                                        ││
│  │  11:00   Priya Singh   Whitening      Maria   Arrived  ││
│  │  11:45   John Doe      Checkup        Dr.Sarah In Progress
│  │  12:30   [WALK-IN]                                     ││
│  │          Alex Kumar    Cleaning       Maria   Completed ││
│  │                                                        ││
│  │  [Lunch Break 1:00 PM - 2:00 PM]                       ││
│  │                                                        ││
│  │  2:00    Sana Desai    Implant Setup  Dr.Ahmed Confirmed││
│  │  3:30    Vikram Nair   Cleaning       Maria   Confirmed││
│  │                                                        ││
│  │  Queue Stats:                                          ││
│  │  • Currently Waiting: 2 people                         ││
│  │  • Avg Wait Time: 15 minutes                           ││
│  │  • Next Available: 12:30 PM (Walk-in slot)           ││
│  │                                                        ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  ⚠️ FRAUD DETECTION ALERTS:                                 │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ HIGH RISK CUSTOMER                                    ││
│  │ Emma Wilson - Trust Score: 45/100                      ││
│  │ • No-shows: 3                                          ││
│  │ • Cancellations: 5                                     ││
│  │ • Total Bookings: 12                                   ││
│  │ Recommendation: Require prepayment                      ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

### 7. Analytics & Reports

**URL:** `https://shop.overline.in/analytics`

```
┌─────────────────────────────────────────────────────────────┐
│  Analytics - Johns Dental Clinic                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  📊 KEY METRICS (March 2026)                               │
│  ┌─────────────────────────────────────────────────────────┐│
│  │  Total Bookings: 145    Monthly Revenue: ₹3,45,000    ││
│  │  No-Shows: 8 (5.5%)     Cancellations: 12 (8.3%)      ││
│  │  Customer Rating: 4.6/5  Google Rating: 4.5/5         ││
│  │  Staff Utilization: 87% Queue Efficiency: 92%         ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  📈 Bookings Trend (Last 30 days)                          │
│  [  10  |  12  |  15  |  14  |  18  |  21  | 25] Bookings│
│  [------+------+------+------+------+------+------+------] │
│     1    6     11    16    21    26   Mar                  │
│                                                             │
│  👥 Customer Demographics                                   │
│  • Repeat Customers: 78% (increase from 72%)              │
│  • New Customers: 22%                                      │
│  • Avg Customer Age: 42                                    │
│  • Male: 45%  |  Female: 55%                              │
│                                                             │
│  💰 Revenue by Service                                      │
│  Root Canal: ₹1,20,000  (35%)  ████████████               │
│  Whitening: ₹85,000     (25%)  █████████                  │
│  Implants:  ₹75,000     (22%)  ████████                   │
│  Checkup:   ₹40,000     (12%)  ████                       │
│  Cleaning:  ₹25,000     (7%)   ███                        │
│                                                             │
│  ⭐ Top Performing Staff                                    │
│  1. Dr. Sarah   | 56 bookings | 4.9/5 rating | ₹1,12,000  │
│  2. Dr. Ahmed   | 49 bookings | 4.7/5 rating | ₹98,000   │
│  3. Nurse Maria | 38 bookings | 4.5/5 rating | ₹76,000   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## One-Time Walkthrough Timeline

### First Login After Registration

```
Duration: ~5 minutes (can skip any step)

┌────────────────────────────────────────────────────┐
│     Welcome to Overline Admin! 👋                  │
│                                                    │
│  Let's get your shop ready in just 5 minutes!     │
│  (You can skip any step and come back later)      │
│                                                    │
│  Step 1: Upload Shop Logo (2 min)                 │
│  Step 2: Set Working Hours (1 min)               │
│  Step 3: Add First Service (1 min)               │
│  Step 4: Invite First Staff (1 min)              │
│                                                    │
│        [Start Walkthrough] [Skip For Now]        │
└────────────────────────────────────────────────────┘
```

**At Each Step:**
- Clear instructions with animated tutorials
- Quick form fills with pre-populated data
- Progress bar showing completion
- Skip button for later
- "Looks Good!" confirmation after each step

---

## Customer Verification Process

**When do customers verify a shop:**

1. After first booking is completed
2. After attending appointment
3. Through ratings/reviews (implicit verification)

**How verification works:**
```
First Verified Booking
        ↓
Customer Completes Service
        ↓
Shop Status Updates to "CUSTOMER_VERIFIED"
        ↓
Gets "Valid Shop" Badge on User Website
        ↓
Appears in Top Rated Section
```

---

## Database Storage Locations

### Where data is stored:

**Production Database:** PostgreSQL (managed by hosting provider)
- User accounts: `users` table
- Shop information: `shops` table
- Verification status: `shops.verification_status` field
- Bookings: `bookings` table
- Staff: `staff` table
- Services: `services` table
- Working hours: `working_hours` table

**Cache (Redis):** Temporary data with expiration
- Fraud detection temp data
- Session tokens
- Rate limiting counters

**Files (Cloud Storage):** Photos & documents
- Shop logo & photos: S3/Cloud Storage
- User profile pictures
- Service images
- Verification documents (if needed)

---

## Common Admin Tasks

### Task 1: Verify a New Shop
```
1. Go to Dashboard → Pending Verification
2. Click on Shop Name
3. Review: Address, Phone, Google Verification Status
4. Manually verify if not on Google:
   - Check business registration
   - Verify phone number
   - Set "CUSTOMER_VERIFIED" status
5. Save changes
```

### Task 2: Handle High-Risk Customer
```
1. Go to Appointments
2. See ⚠️ High Risk customer (Trust score < 50%)
3. Options:
   - Require advance payment
   - Require deposit
   - Flag for manual approval
   - Contact customer (send message)
```

### Task 3: Update Shop Information
```
1. Shop Settings → Basic Information
2. Edit any field (name, address, phone, etc.)
3. Google Places verification auto-updates if location changes
4. Save changes
```

---

## Support & Help

- **Email:** support@overline.in
- **Chat:** In-app chat (bottom-right corner)
- **Knowledge Base:** https://help.overline.in
- **Video Tutorials:** https://youtube.com/@overlinein
- **Phone:** +91 XXXX-XXX-XXXX (9 AM - 6 PM IST)

