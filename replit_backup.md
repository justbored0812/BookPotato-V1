# BookPotato - Digital Library Platform

## Overview

BookPotato is a community-driven digital library platform designed to facilitate book sharing, buying, and selling within residential societies, schools, and offices. It offers a comprehensive solution for managing book rentals with integrated payment processing, a marketplace for buying and selling books, and a gamification system based on "Brocks" credits. The platform aims to foster a vibrant reading community and streamline book exchange processes.

**Key Capabilities:**
- Multi-hub book sharing (Societies, Schools, Offices)
- Rental system with late fee management
- Buy/sell marketplace
- Razorpay payment integration
- Brocks gamification currency and ranking system (Explorer to Emperor)
- Real-time WebSocket chat
- SendGrid email notifications
- Google OAuth and local authentication
- Barcode scanning & bulk book photo upload

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

BookPotato utilizes a modern full-stack architecture with a React-based frontend and a Node.js Express backend, both written in TypeScript.

**Frontend:**
- **Framework:** React 18 (TypeScript)
- **Routing:** Wouter
- **State Management:** TanStack Query v5 for server state
- **UI Components:** Radix UI primitives with shadcn/ui for customization
- **Styling:** Tailwind CSS + custom HSL color variables
- **Forms:** React Hook Form with Zod validation
- **Build Tool:** Vite
- **Icons:** Lucide React + React Icons

**Backend:**
- **Runtime:** Node.js 20.x
- **Framework:** Express.js (TypeScript + ES modules)
- **API Style:** RESTful with JSON payloads
- **Authentication:** `express-session` (PostgreSQL-backed) and Passport.js (Local + Google OAuth strategies)
- **Real-time Communication:** `ws` library for WebSockets
- **Payment Integration:** Razorpay SDK
- **Email Service:** SendGrid SDK
- **ORM:** Drizzle with Neon PostgreSQL driver

**Database:**
- **Type:** PostgreSQL 15 (Neon serverless)
- **ORM:** Drizzle ORM for type-safe queries and schema management.
- **Schema:** Includes tables for users, books, rentals, purchases, hubs, messages, notifications, and credit transactions, designed to support all platform features and relationships.

**Key Features & Implementations:**

-   **Authentication:** Supports local email/password login and Google OAuth. Sessions are managed using `express-session` stored in PostgreSQL, with a 7-day expiry.
-   **Book Borrowing:** Calculates rental fees, platform commission, and security deposits. Payments can be made via Brocks credits or Razorpay (supporting Card/UPI/NetBanking). Awards Brocks to both borrower and lender.
-   **Late Fee System:** Calculates late fees based on `book.dailyFee` and days overdue. Late fees that exceed the security deposit require additional payment via Razorpay before return confirmation. Refunds security deposits proportionally.
-   **Brocks Credit System:** A gamification currency awarded for various activities (signup, book uploads, borrowing, lending). Brocks can be used to pay for rentals, converted to discounts on purchases, or exchanged for commission-free days. Includes a multi-tiered ranking system (Explorer to Emperor) based on total Brocks earned.
-   **Notification & Email System:** A dual system for in-app notifications and email alerts using SendGrid. Notifications are triggered by various events (rentals, messages, payments, hub activities, system updates) and delivered asynchronously.
-   **Buy/Sell Marketplace:** Allows users to list books for sale with a specified selling price. Purchases can be made using Razorpay or Brocks. Manages book availability and notifies buyer/seller.
-   **Real-Time Chat System:** Implemented using WebSockets for direct user-to-user messaging and hub-specific group chats. Messages are stored in the database, and unread counts are tracked. In-app notifications are sent for direct messages when the recipient is offline.
-   **Hub Management:** Supports creation and joining of hubs (Society, School, Office) with unique codes. Hubs must be approved by administrators. Books uploaded by users are tagged with their active hub memberships, controlling visibility. Users can join/leave hubs, affecting book visibility.

## External Dependencies

-   **Neon Database:** Serverless PostgreSQL database hosting.
-   **Razorpay:** Payment gateway for processing INR transactions (rentals, purchases, late fees).
-   **SendGrid:** Email API for sending transactional and notification emails.
-   **Google OAuth:** Authentication provider for user login.