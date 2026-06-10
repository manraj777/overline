# 📚 Documentation Index

This folder contains comprehensive documentation for the **Overline** appointment booking and queue management system.

---

## 📖 Documentation Files

### 🌟 [APP_ECOSYSTEM_GUIDE.md](APP_ECOSYSTEM_GUIDE.md) - Features & Usage
**Best for:** End-users, Shop Owners, and Product Managers  
**Read time:** 15 minutes  
**Contains:**
- Overview of all 4 apps (User Mobile, Admin Mobile, User Web, Admin Web)
- Target audience and platform specifics
- Key benefits and value propositions
- Step-by-step usage workflows

👉 **Read this to understand what the product does and how to use it**

---

### 🚀 [QUICK_REFERENCE.md](QUICK_REFERENCE.md) - START HERE!
**Best for:** Quick lookup, code examples, testing scenarios  
**Read time:** 10 minutes  
**Contains:**
- Key files and changes summary
- Environment setup instructions
- Database query examples
- API endpoints reference
- Fraud detection overview
- Testing checklists
- Deployment guide

👉 **Start here if you want to quickly understand the system**

---

### 📋 [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md) - Complete Changes
**Best for:** Understanding what was implemented  
**Read time:** 15 minutes  
**Contains:**
- List of all features implemented
- Changed/created files
- Database schema updates
- Verification workflow diagrams
- Configuration requirements
- Data location mapping
- Testing checklist

👉 **Read this to understand all the changes made**

---

### 🗄️ [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md) - Database Deep Dive
**Best for:** Understanding data structure  
**Read time:** 20 minutes  
**Contains:**
- Complete table definitions
- Field descriptions and types
- All indexes and relationships
- Data flow examples
- SQL query examples
- Performance optimization tips
- Configuration details

👉 **Use this when you need to understand the database**

---

### 👨‍💼 [ADMIN_ONBOARDING.md](ADMIN_ONBOARDING.md) - Admin Dashboard Guide
**Best for:** Admin users and frontend developers  
**Read time:** 25 minutes  
**Contains:**
- Step-by-step shop owner registration
- Admin dashboard walkthrough
- Visual mockups of each page
- Setup wizard guide
- Common admin tasks
- Customer verification process
- Support resources

👉 **Use this to understand admin workflow**

---

### 🔒 [FRAUD_DETECTION.md](FRAUD_DETECTION.md) - Security System
**Best for:** Security and fraud prevention understanding  
**Read time:** 20 minutes  
**Contains:**
- Fraud detection algorithms
- Risk scoring methodology
- Login/booking/shop verification checks
- Integration points
- Trust score calculations
- Admin dashboard features
- Testing scenarios
- Future enhancements

👉 **Use this to understand security features**

---

### 💳 [PAYMENTS.md](PAYMENTS.md) - Payment Integration
**Best for:** Payment processing understanding  
**Read time:** 15 minutes  
**Contains:**
- Stripe integration
- Razorpay integration
- Payment flow
- Webhook handling
- Error scenarios

👉 **Use this for payment-related features**

---

## 🎯 Reading Paths

### I'm a New Developer
```
1. APP_ECOSYSTEM_GUIDE.md    ← What we are building
2. QUICK_REFERENCE.md        ← Overview in 10 min
3. IMPLEMENTATION_SUMMARY.md ← What changed
4. DATABASE_SCHEMA.md        ← How data is stored
5. ADMIN_ONBOARDING.md       ← User workflows
```

### I'm an Admin/Shop Owner
```
1. ADMIN_ONBOARDING.md       ← Your complete guide
2. QUICK_REFERENCE.md        ← For reference
```

### I'm a Backend Engineer
```
1. IMPLEMENTATION_SUMMARY.md ← Changes made
2. DATABASE_SCHEMA.md        ← Table structure
3. QUICK_REFERENCE.md        ← API endpoints
4. FRAUD_DETECTION.md        ← Security system
```

### I'm a Frontend Engineer
```
1. ADMIN_ONBOARDING.md       ← UI flows
2. IMPLEMENTATION_SUMMARY.md ← API changes
3. QUICK_REFERENCE.md        ← Endpoints & examples
```

### I'm Deploying to Production
```
1. QUICK_REFERENCE.md        ← Deployment checklist
2. IMPLEMENTATION_SUMMARY.md ← Configuration required
3. DATABASE_SCHEMA.md        ← Database setup
4. FRAUD_DETECTION.md        ← Security review
```

---

## 🔑 Key Concepts

### Verification Status
Shops can have these verification levels:
- **PENDING** - Awaiting verification
- **GOOGLE_VERIFIED** - Found on Google Places
- **CUSTOMER_VERIFIED** - Verified by customers
- **FULLY_VERIFIED** - Both Google and Customer verified → Featured

### Trust Score
Users have a reliability score (0-100) based on:
- Completed bookings (+)
- No-shows (-)
- Cancellations (-)

### Fraud Detection
Multi-layer protection:
- Login anomaly detection
- Booking velocity checks
- Device fingerprinting
- IP reputation tracking

---

## 📊 System Architecture

```
┌─────────────────────────────────────────────┐
│          User Web (Customer)                │
│     https://overline.in                    │
└────────────┬────────────────────────────────┘
             │ API calls
┌────────────v────────────────────────────────┐
│     Backend API (NestJS)                    │
│   :3001/api/v1/*                            │
│                                             │
│  1. Auth (Login, Registration)              │
│  2. Shops (Search, Details, Verify)         │
│  3. Bookings (Create, Manage)               │
│  4. Queue (Real-time updates)               │
│  5. Fraud Detection (Multi-layer)           │
└────────────┬────────────────────────────────┘
             │
     ┌───────┴────────┐
     │                │
┌────v──────┐  ┌─────v──────────┐
│ PostgreSQL│  │ Redis (Cache)  │
│ Database  │  │ & Fraud Data   │
└───────────┘  └────────────────┘

┌─────────────────────────────────────────────┐
│     Admin Web (Shop Owner)                  │
│   https://shop.overline.in                 │
└─────────────────────────────────────────────┘
```

---

## 🚀 Quick Start Commands

```bash
# Install dependencies
npm install

# Set up database
npx prisma migrate dev

# Install Google Places API key
# Add to .env: GOOGLE_PLACES_API_KEY=xxx

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

---

## 📞 When to Use Each Document

| Question | Document |
|----------|----------|
| "How do I register a shop?" | ADMIN_ONBOARDING.md |
| "What fields are in the shops table?" | DATABASE_SCHEMA.md |
| "What changed in the code?" | IMPLEMENTATION_SUMMARY.md |
| "How do I deploy this?" | QUICK_REFERENCE.md |
| "How does fraud detection work?" | FRAUD_DETECTION.md |
| "What APIs are available?" | QUICK_REFERENCE.md |
| "How is trust score calculated?" | FRAUD_DETECTION.md |
| "What's the verification flow?" | IMPLEMENTATION_SUMMARY.md or ADMIN_ONBOARDING.md |

---

## 📝 Document Conventions

### Code Blocks
```typescript
// TypeScript code examples
const user = await prisma.user.findUnique({ ... });
```

### Database Tables
Shown in markdown tables with:
- Field name
- Data type
- Description

### SQL Queries
```sql
-- SQL examples for common operations
SELECT * FROM shops WHERE verification_status = 'FULLY_VERIFIED';
```

### Diagrams
ASCII diagrams and mermaid graphs for visual understanding

### Warnings
⚠️ Important notes are marked with warnings  
✅ Completed items are marked with checkmarks  
❌ Critical issues are marked with red X

---

## 🔄 Document Updates

**Last Updated:** March 1, 2026  
**Version:** 1.0.0  

The documentation is kept in sync with the codebase:
- Changes to code → Document updated
- New features → Documentation created
- Bug fixes → Documentation corrected

---

## 💡 Tips for Using Documentation

1. **Use browser find (Ctrl+F / Cmd+F)** to search within documents
2. **Start with QUICK_REFERENCE.md** for quick answers
3. **Read IMPLEMENTATION_SUMMARY.md** to understand architecture
4. **Check DATABASE_SCHEMA.md** for SQL queries
5. **Visit ADMIN_ONBOARDING.md** for UI flows
6. **Review FRAUD_DETECTION.md** for security details

---

## 🆘 Troubleshooting

**Can't find something?**
1. Check QUICK_REFERENCE.md first
2. Use Ctrl+F to search all documents
3. Check the relevant section in each document
4. Review updated code comments

**Have a question not covered?**
1. Check if there's an existing document
2. Each document has a "Common Issues" section
3. Refer to actual code implementation
4. Contact support team

---

## 📚 Related Resources

- **GitHub Repository:** Check `.git/commits` for history
- **Database Views:** PostgreSQL schema files
- **API Documentation:** Swagger/OpenAPI at `/api/docs`
- **Code Comments:** Check source files for implementation details

---

## ✅ Checklist for New Team Members

- [ ] Read QUICK_REFERENCE.md
- [ ] Understand DATABASE_SCHEMA.md
- [ ] Review ADMIN_ONBOARDING.md
- [ ] Study FRAUD_DETECTION.md
- [ ] Set up local environment (see QUICK_REFERENCE.md)
- [ ] Run tests (see QUICK_REFERENCE.md)
- [ ] Deploy to test environment

---

## 🎓 Learning Outcomes

After reading all documentation, you should understand:

✅ How users register and manage shops  
✅ How verification works (Google + Customer)  
✅ How bookings are created and managed  
✅ How fraud is detected and prevented  
✅ How to query the database  
✅ How to deploy to production  
✅ What APIs are available  
✅ How trust scores work  
✅ How the admin interface works  

---

**Happy Learning! 🚀**

For questions, refer to the specific document or check the code comments.

