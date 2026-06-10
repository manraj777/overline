# 📱 Overline App Ecosystem Guide

Welcome to the **Overline App Ecosystem Guide**! This document provides a comprehensive overview of all 4 applications within the Overline platform, detailing their primary benefits, target audiences, and step-by-step usage workflows.

---

## 1. 📲 Overline User App (`mobile-user`)
**Target Audience**: Customers & End-Users  
**Platform**: iOS & Android (React Native)

### 🌟 Key Benefits
*   **Zero Waiting Time**: Customers can track the live queue status of any shop before leaving their house.
*   **Seamless Booking**: Book appointments with specific staff members and pay securely in advance.
*   **Real-time Notifications**: Get push notifications when it's almost time for the appointment.
*   **Trust & Verification**: Easily identify "Fully Verified" and highly-rated shops to ensure quality service.

### 📖 How to Use (Core Workflow)
1.  **Onboarding & Profile**:
    *   Download and open the app.
    *   Sign up via Email or Phone and verify your OTP.
    *   Complete your profile by tapping the "Detect Current GPS Location" button so the app can find shops near your city.
2.  **Discovering Shops**:
    *   Use the **Home Screen** to browse "Popular Shops", "Nearby Open Shops", or filter by categories (Salon, Spa, Clinic, etc.).
    *   Use the **Map View** to visually locate shops around you.
3.  **Booking an Appointment**:
    *   Tap on a shop to view its details, services, team members, and live queue.
    *   Select the desired services (e.g., Haircut, Massage).
    *   Choose a date and an available time slot.
    *   (Optional) Pick a specific specialist from the "Team" tab.
    *   Proceed to checkout and review the booking.
4.  **Managing Bookings**:
    *   Go to the **My Bookings** tab to see Upcoming, Completed, and Cancelled appointments.
    *   Once at the shop, show the booking to the admin.

---

## 2. 🏪 Overline Business/Admin App (`mobile-admin`)
**Target Audience**: Shop Owners, Salon Managers, & Clinic Admins  
**Platform**: iOS & Android (React Native)

### 🌟 Key Benefits
*   **Run Your Business from Your Pocket**: Manage walk-ins, online bookings, and staff schedules directly from your phone.
*   **Dynamic Queue Management**: Accept or decline bookings instantly to keep your shop floor organized and prevent overcrowding.
*   **Staff Empowerment**: Assign bookings to specific staff members and track their daily performance.
*   **Instant Verification**: Easily register your shop and link it to your Google Business Profile for instant "Verified" status.

### 📖 How to Use (Core Workflow)
1.  **Partner Registration**:
    *   Open the Admin App and tap "Register Partner".
    *   Enter Owner Details, Shop Information, and exact GPS Coordinates. (Use the *Auto-fill from Google Map Link* feature to save time).
2.  **Managing the Daily Queue (`My Day`)**:
    *   The **My Day** screen shows the active queue.
    *   When a customer books online, it appears under "Pending Approvals". Swipe or tap to **Accept** or **Decline**.
    *   Tap a booking to **Start** the service when the customer arrives, and **Complete** it when finished.
3.  **Managing Services**:
    *   Navigate to the **Services** tab.
    *   Use the "AI-Suggested Services" chips at the top to quickly add standard services (e.g., Men's Haircut, Facial) with one tap.
    *   Toggle services On/Off if a particular machine or product is temporarily unavailable.
4.  **Staff Management**:
    *   Go to **Settings > Staff Management**.
    *   Add new staff members, set their roles, and manage their specific working hours or days off.

---

## 3. 🌐 Overline Web Portal (`user-web`)
**Target Audience**: Desktop Customers & Search Engine Discoverers  
**Platform**: Web Browser (Next.js)

### 🌟 Key Benefits
*   **SEO Discoverability**: Allows your platform and all registered shops to be indexed by Google. Customers searching for "Salons near me" on Google will land directly on your web portal.
*   **No App Required**: Customers who don't want to download a mobile app can still browse shops, view live queues, and make bookings directly from their mobile or desktop browser.
*   **Fast & Accessible**: Built with Next.js for lightning-fast page loads and high accessibility scores.

### 📖 How to Use (Core Workflow)
1.  Navigate to `https://overline.in` on any browser.
2.  Search for shops by typing a city or service into the hero search bar.
3.  Browse shop profiles (which share the same beautiful UI as the mobile app).
4.  Log in via the web popup to finalize a booking or join a virtual queue.

---

## 4. 💻 Overline Admin Dashboard (`admin-web`)
**Target Audience**: Super Admins & Shop Owners (Desktop)  
**Platform**: Web Browser (Next.js)

### 🌟 Key Benefits
*   **Deep Analytics**: View detailed charts, revenue reports, and staff performance metrics on a large screen.
*   **Bulk Operations**: Much easier to upload bulk service lists, manage large staff rosters, and export financial data to CSV/Excel.
*   **Platform Governance (Super Admins)**: Super Admins can log in to verify new shop registrations, monitor platform-wide fraud alerts, and handle customer support tickets.

### 📖 How to Use (Core Workflow)
1.  Navigate to `https://shop.overline.in` on a desktop browser.
2.  Log in using your Owner or Super Admin credentials.
3.  Use the **Sidebar Navigation** to jump between Dashboard (Analytics), Bookings (Calendar View), Customers (CRM), and Settings.
4.  Use the **Calendar View** to get a weekly/monthly overview of all staff schedules and drag-and-drop appointments.

---

> **Unified Architecture**: Because all 4 apps share the same centralized NestJS Backend and PostgreSQL database, any action taken on one app (e.g., Admin accepts a booking on their phone) is **instantly** reflected across all other apps (e.g., User sees "Accepted" on their phone and Web Portal) in real-time.
