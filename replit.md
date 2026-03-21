# BookPotato - Comprehensive Technical Documentation

## Overview
BookPotato is a community-driven digital library platform designed for book sharing within residential societies, schools, and offices. It aims to foster a culture of reading and resource-sharing by providing a robust platform for managing book rentals, sales, and community interactions.

Key capabilities include:
- Multi-hub book sharing (Societies, Schools, Offices)
- Rental system with late fee management
- Buy/sell marketplace
- Razorpay payment integration
- Brocks gamification currency
- Real-time WebSocket chat
- SendGrid email notifications
- Google OAuth and local authentication
- Barcode scanning & bulk photo upload
- Ranking system (Explorer to Emperor)

## User Preferences
Communication style: Simple, everyday language

## System Architecture

### Frontend Stack
- **Framework**: React 18 (TypeScript)
- **Routing**: Wouter
- **State Management**: TanStack Query v5
- **UI Components**: Radix UI + shadcn/ui
- **Styling**: Tailwind CSS + HSL variables
- **Forms**: React Hook Form + Zod
- **Build Tool**: Vite
- **Icons**: Lucide React + React Icons

### Backend Stack
- **Runtime**: Node.js 20.x + Express.js (TypeScript + ES modules)
- **API**: RESTful with JSON
- **Sessions**: express-session (PostgreSQL)
- **Authentication**: Passport.js (Local + Google OAuth)
- **WebSocket**: `ws` library
- **Payments**: Razorpay SDK
- **Email**: SendGrid SDK
- **ORM**: Drizzle ORM + Neon PostgreSQL

### Key Features and Implementations

#### Authentication System
- **Google OAuth Flow**: Supports user authentication via Google, dynamically setting callback URLs for production and development environments. New users are created with a default welcome bonus in Brocks.
- **Local Authentication Flow**: Standard email/password login with Zod validation and `bcrypt` for password comparison.
- **Session Management**: Sessions are stored in a PostgreSQL table, ensuring persistence and secure user authentication across requests.

#### Book Borrowing Flow
- **Cost Calculation**: Rental fees, platform fees, lender amounts, and security deposits are calculated based on daily book fees and rental duration.
- **Payment Options**:
    - **Brocks**: Users can pay for rentals using Brocks, a platform-specific currency. Insufficient balance checks are performed.
    - **Razorpay**: Integration for real-money payments, involving order creation, payment completion via modal, and signature verification.
- **Rental Creation**: Upon successful payment, a rental record is created, Brocks are awarded to both borrower and lender, and book availability is updated. Notifications are sent via in-app alerts and email.

#### Late Fee System
- **Calculation**: Late fees are calculated based on days overdue, with a daily late fee set at 100% of the book's daily rental rate. Platform commission is applied to late fees.
- **Security Deposit**: The security deposit is first used to cover late fees. Any remaining late fees result in an "excess charge" that the borrower must pay.
- **Return Flow**: Users request returns, triggering late fee calculations. If excess charges exist, the user is prompted to pay via Razorpay. Once settled or if no excess, the rental status is updated, and notifications are sent.

#### Brocks Credit System
- **Award Events**: Brocks are awarded for various user activities like signup, book uploads, borrowing, lending, and referrals.
- **Conversion**: Brocks can be converted into discounts on real-money payments (1 Brocks = ₹1/20) or commission-free days for lenders.
- **Ranking System**: Users are assigned ranks (Explorer to Emperor) based on their total earned Brocks, with progress tracking towards the next rank.

#### Notification & Email System
- **Architecture**: Events trigger a `createNotificationWithEmail` function, which synchronously creates an in-app notification and asynchronously sends an email via SendGrid.
- **Email Implementation**: Utilizes SendGrid API for sending templated emails for various events, ensuring non-blocking email delivery.
- **Notification Types**: Covers rental events, payments, direct messages, hub messages, and system alerts.

#### Buy/Sell Marketplace
- **Book Listing**: Users can list books for sale with a specified selling price, alongside rental fees. Books are tagged with the user's associated hubs.
- **Purchase (Razorpay)**: Users can buy books via Razorpay, with a similar payment flow to rentals, involving order creation and payment verification.
- **Purchase (Brocks)**: Books can also be purchased using Brocks, with Brocks deducted from the buyer and awarded to the seller.

#### Real-Time Chat System
- **WebSocket Server**: Implemented using the `ws` library for real-time communication. User authentication is tied to WebSocket connections.
- **Direct Messages**: Users can send direct messages in conversations. Messages are stored in the database, and real-time updates are pushed via WebSocket to online recipients. Offline recipients receive notifications.
- **Hub Messages**: Supports real-time chat within specific hubs, with messages broadcast to all online hub members.
- **Unread Tracking**: Conversations display unread message counts, and messages can be marked as read, triggering real-time updates to the sender.

#### Hub Management
- **Hub Types**: Supports Society, School, and Office hubs.
- **Hub Creation**: Users can create hubs, which require admin approval. The creator is automatically made an admin.
- **Hub Join**: Users can join hubs using a unique code. Joining a hub automatically tags the user's existing books with that hub, making them visible to other members.
- **Book Visibility**: Books are tagged with the hubs their owner is a member of, allowing browsing within specific hubs. Leaving a hub removes book visibility from that hub.

## External Dependencies

- **PostgreSQL Database**: Used for storing all application data, including users, books, rentals, sessions, chat messages, and notifications.
- **Neon PostgreSQL**: Managed PostgreSQL service.
- **Razorpay**: Payment gateway for INR transactions for rentals, purchases, and late fee payments.
- **SendGrid**: Email service for sending transactional emails and notifications.
- **Google OAuth**: Third-party authentication provider for user sign-up and login.
- **ws**: WebSocket library for real-time chat functionality.