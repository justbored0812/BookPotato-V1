# BookPotato - Comprehensive Technical Documentation

## Table of Contents
1. [Overview](#overview)
2. [System Architecture](#system-architecture)
3. [Authentication System](#authentication-system)
4. [Book Borrowing Flow](#book-borrowing-flow)
5. [Late Fee System](#late-fee-system)
6. [Brocks Credit System](#brocks-credit-system)
7. [Notification & Email System](#notification--email-system)
8. [Buy/Sell Marketplace](#buysell-marketplace)
9. [Real-Time Chat System](#real-time-chat-system)
10. [Hub Management](#hub-management)
11. [Database Schema](#database-schema)
12. [API Endpoints](#api-endpoints)

---

## Overview

BookPotato (formerly BorrowBooks and BookShare) is a community-driven digital library platform facilitating book sharing within residential societies, schools, and offices.

**Production URL**: https://bookpotato.in

### Core Capabilities
- Multi-hub book sharing (Societies, Schools, Offices)
- Rental system with late fee management
- Buy/sell marketplace
- Razorpay payment integration (₹)
- Brocks gamification currency
- Real-time WebSocket chat
- SendGrid email notifications
- Google OAuth + local authentication
- Barcode scanning & bulk photo upload
- Ranking system (Explorer to Emperor)

### User Preferences
Communication style: Simple, everyday language

---

## System Architecture

### Frontend Stack
```
React 18 (TypeScript)
├── Routing: Wouter
├── State: TanStack Query v5
├── UI: Radix UI + shadcn/ui
├── Styling: Tailwind CSS + HSL variables
├── Forms: React Hook Form + Zod
├── Build: Vite
└── Icons: Lucide React + React Icons
```

### Backend Stack
```
Node.js 20.x + Express.js (TypeScript + ES modules)
├── API: RESTful with JSON
├── Sessions: express-session (PostgreSQL)
├── Auth: Passport.js (Local + Google OAuth)
├── WebSocket: ws library
├── Payments: Razorpay SDK
├── Email: SendGrid SDK
└── ORM: Drizzle + Neon PostgreSQL
```

### File Structure
```
workspace/
├── client/src/
│   ├── pages/          # Route components
│   ├── components/     # Reusable components
│   ├── lib/            # Utilities
│   └── hooks/          # Custom hooks
├── server/
│   ├── index.ts        # Entry point
│   ├── routes.ts       # All API routes
│   └── storage.ts      # Database operations
└── shared/
    └── schema.ts       # Drizzle schema + Zod
```

---

## Authentication System

### Google OAuth Flow

```
1. User clicks "Sign in with Google"
   ↓
2. Frontend → GET /api/auth/google
   ↓
3. Backend detects domain:
   Priority: PRODUCTION_DOMAIN → REPLIT_DOMAINS → fallback
   ↓
   Callback URL:
   - Production: https://bookpotato.in/api/auth/google/callback
   - Dev: https://{dev-domain}/api/auth/google/callback
   ↓
4. Redirect to Google OAuth consent screen
   ↓
5. User approves → Google redirects with auth code
   ↓
6. Backend → GET /api/auth/google/callback
   ↓
7. Passport receives profile:
   {
     emails: [{ value: "user@example.com" }],
     displayName: "John Doe"
   }
   ↓
8. Check if user exists:
   user = await storage.getUserByEmail(email)
   ↓
9a. IF user exists:
    Load from database
   ↓
9b. ELSE create new user:
    INSERT INTO users (
      name, email, phone, password,
      flatWing, buildingName, detailedAddress, city
    ) VALUES (
      'John Doe', 'user@example.com',
      '0000000000', 'oauth-user',
      'Not provided', 'Not provided',
      'Not provided', 'Not provided'
    )
    ↓
    Award welcome bonus:
    INSERT INTO user_credits (userId, balance, totalEarned)
    VALUES (newUserId, 100, 100)
   ↓
10. Create session:
    req.session.userId = user.id
    ↓
11. Save to PostgreSQL session table:
    INSERT INTO session (sid, sess, expire)
    VALUES (
      'session-id',
      '{"userId": 123}',
      NOW() + INTERVAL '7 days'
    )
   ↓
12. Set-Cookie: connect.sid=...
    (HttpOnly, Secure in production, SameSite=lax)
   ↓
13. Redirect to frontend: /
    ↓
14. User authenticated
```

### Local Authentication Flow

```
1. User submits: { email, password }
   ↓
2. Frontend → POST /api/auth/login
   ↓
3. Zod validation:
   email: z.string().email()
   password: z.string().min(1)
   ↓
4. Passport LocalStrategy:
   user = await storage.getUserByEmail(email)
   ↓
5a. IF user not found:
    return error "User not found"
   ↓
5b. Compare password:
    isValid = await bcrypt.compare(password, user.password)
    ↓
    IF invalid:
      return error "Incorrect password"
   ↓
6. Create session: req.session.userId = user.id
   ↓
7. Response: { user: { id, name, email, ... } }
```

### Session Management

**PostgreSQL Storage**:
```sql
CREATE TABLE session (
  sid VARCHAR PRIMARY KEY,
  sess JSON NOT NULL,
  expire TIMESTAMP NOT NULL
);

-- Session data:
{
  "cookie": {
    "originalMaxAge": 604800000,  -- 7 days
    "httpOnly": true,
    "secure": false,  -- true in production
    "sameSite": "lax"
  },
  "userId": 123
}
```

**Request Flow**:
```
Every HTTP request
  ↓
express-session middleware:
  Read cookie: connect.sid
  ↓
  Query: SELECT sess FROM session 
         WHERE sid = ? AND expire > NOW()
  ↓
  IF found: req.session = { userId: 123 }
  ELSE: req.session = {}
  ↓
Protected route check:
  IF req.session?.userId:
    Proceed with user context
  ELSE:
    return 401 Unauthorized
```

---

## Book Borrowing Flow

### Cost Calculation

**Inputs**:
- `book.dailyFee`: ₹10
- `duration`: 7 days
- Platform settings

**Formula**:
```javascript
const rentalFee = book.dailyFee × duration;
const platformFee = rentalFee × (commissionRate / 100);
const lenderAmount = rentalFee - platformFee;
const securityDeposit = book.dailyFee × (securityDepositRate / 100);
const totalAmount = rentalFee + platformFee + securityDeposit;

// Example with ₹10/day, 7 days:
// rentalFee = 10 × 7 = ₹70
// platformFee = 70 × 0.10 = ₹7
// lenderAmount = 70 - 7 = ₹63
// securityDeposit = 10 × 1.0 = ₹10
// totalAmount = 70 + 7 + 10 = ₹87
```

**Display**:
```
Rental Fee (₹10 × 7 days)       ₹70
Platform Commission (10%)        ₹7
Security Deposit                ₹10
─────────────────────────────────────
Total Amount                    ₹87
```

### Payment Option A: Brocks

```
1. Calculate Brocks cost:
   conversionRate = 20  // 20 Brocks = ₹1
   brocksCost = ₹87 × 20 = 1740 Brocks
   ↓
2. User confirms
   ↓
3. Frontend → POST /api/rentals/borrow
   Body: {
     bookId: 123,
     duration: 7,
     paymentMethod: 'brocks'
   }
   ↓
4. Backend validates:
   userCredits = await storage.getUserCredits(userId)
   IF userCredits.balance < 1740:
     return error "Insufficient Brocks"
   ↓
   book = await storage.getBook(bookId)
   IF !book.available:
     return error "Book not available"
   ↓
5. Deduct Brocks:
   UPDATE user_credits
   SET balance = balance - 1740
   WHERE userId = userId
   ↓
   INSERT INTO credit_transactions (
     userId, amount, type, reason
   ) VALUES (
     userId, 1740, 'spent',
     'Paid 1740 Brocks for renting "Book Title"'
   )
   ↓
6. Create rental:
   INSERT INTO rentals (
     bookId, borrowerId, lenderId, societyId,
     startDate, endDate,
     totalAmount, platformFee, lenderAmount, securityDeposit,
     status, paymentStatus, paymentMethod
   ) VALUES (
     123, userId, book.userId, book.societyId,
     NOW(), NOW() + INTERVAL '7 days',
     87.00, 7.00, 63.00, 10.00,
     'active', 'completed', 'brocks'
   )
   ↓
7. Award Brocks:
   Borrower: +5 Brocks ("Borrowed a book")
   Lender: +5 Brocks ("Lent a book")
   ↓
8. Update book: available = false
   ↓
9. Send notifications (in-app + email):
   Borrower: "Rental confirmed for {book}"
   Lender: "{borrower} borrowed your book"
   ↓
10. Response: { rental, collectionInfo }
```

### Payment Option B: Razorpay

```
1. Frontend → POST /api/payments/create-order
   Body: { amount: 87, type: 'rental', bookId: 123 }
   ↓
2. Backend creates Razorpay order:
   order = await razorpay.orders.create({
     amount: 8700,  // paise
     currency: 'INR',
     receipt: 'rental_123_timestamp'
   })
   ↓
3. Response: { orderId: "order_xyz" }
   ↓
4. Frontend opens Razorpay modal
   User completes payment
   ↓
5. Razorpay callback:
   { paymentId, orderId, signature }
   ↓
6. Frontend → POST /api/rentals/borrow
   Body: {
     bookId: 123,
     duration: 7,
     paymentMethod: 'card',
     paymentId: 'pay_xyz',
     orderId: 'order_xyz'
   }
   ↓
7. Backend verifies signature:
   expectedSignature = crypto
     .createHmac('sha256', SECRET)
     .update(orderId + '|' + paymentId)
     .digest('hex')
   ↓
   IF signature !== expectedSignature:
     return error
   ↓
8. [Same as Brocks flow from step 6]
```

**Code Location**: 
- Frontend: `client/src/components/modals/borrow-book-modal.tsx`
- Backend: `server/routes.ts` - POST /api/rentals/borrow

---

## Late Fee System

### Calculation Formula

```javascript
// Calculate days late
const endDate = new Date(rental.endDate);
const currentDate = new Date();
const daysLate = Math.max(0, Math.ceil(
  (currentDate - endDate) / (1000 * 60 * 60 * 24)
));

// Late fee (100% of daily rental rate)
IF (daysLate > 0) {
  const dailyLateFee = book.dailyFee * 1.0;
  const totalLateFee = daysLate * dailyLateFee;
  
  // Platform commission on late fees
  const platformCommission = totalLateFee * 0.10;
  const lenderLateFeeAmount = totalLateFee - platformCommission;
  
  // Compare with security deposit
  IF (totalLateFee <= securityDeposit) {
    amountToRefund = securityDeposit - totalLateFee;
    excessCharge = 0;
  } ELSE {
    amountToRefund = 0;
    excessCharge = totalLateFee - securityDeposit;
  }
} ELSE {
  totalLateFee = 0;
  amountToRefund = securityDeposit;  // Full refund
}
```

### Example Scenarios

**Scenario 1: On-time return**
```
dailyFee: ₹10, deposit: ₹10, daysLate: 0
→ totalLateFee = 0
→ amountToRefund = ₹10 (full deposit)
→ excessCharge = 0
```

**Scenario 2: 2 days late**
```
dailyFee: ₹10, deposit: ₹10, daysLate: 2
→ totalLateFee = 2 × ₹10 = ₹20
→ deposit only ₹10
→ amountToRefund = 0
→ excessCharge = ₹10 (must pay)
```

**Scenario 3: 1 day late**
```
dailyFee: ₹10, deposit: ₹10, daysLate: 1
→ totalLateFee = 1 × ₹10 = ₹10
→ amountToRefund = ₹10 - ₹10 = ₹0
→ excessCharge = 0
```

### Return Flow with Late Fees

```
1. User clicks "Request Return"
   ↓
2. Frontend → POST /api/rentals/{id}/request-return
   ↓
3. Backend calculates late fees
   ↓
4a. IF excessCharge > 0:
    Response: {
      requiresPayment: true,
      excessCharge: 10,
      lateFeeDetails: { daysLate: 2, totalLateFee: 20 }
    }
    ↓
    Frontend shows ExcessChargePaymentModal:
    "Your book is 2 days overdue"
    "Late fee: ₹20 (₹10/day × 2)"
    "Your deposit: ₹10"
    "Amount to pay: ₹10"
    ↓
    User pays via Razorpay
    ↓
    Frontend → POST /api/rentals/{id}/pay-excess-charges
    Body: { amount: 10, paymentId, orderId }
    ↓
    Backend records:
    UPDATE rentals
    SET lateFeeAmount = 20,
        lateFeeStatus = 'paid',
        lateFeePaymentId = paymentId
    ↓
    Notification: "Late fee payment successful"
   ↓
4b. ELSE (no excess):
    UPDATE rentals
    SET status = 'return_requested',
        lateFeeAmount = totalLateFee,
        refundAmount = amountToRefund
    ↓
    Notifications sent to borrower & lender
   ↓
5. Lender confirms return:
   Frontend → POST /api/rentals/{id}/confirm-return
   ↓
   UPDATE rentals SET status = 'completed'
   UPDATE books SET available = true
   ↓
   IF refundAmount > 0:
     Notification: "Deposit of ₹{amount} refunded"
   ↓
   Completion notifications sent
```

---

## Brocks Credit System

### Award Events

| Event | Amount | Recipient | Reason |
|-------|--------|-----------|--------|
| User Signup | 100 | New user | Welcome bonus |
| Book Upload | 2 | Uploader | Uploaded book |
| Borrow | 5 | Borrower | Borrowed a book |
| Lend | 5 | Lender | Lent a book |
| Referral | 50 | Referrer | Referred user |
| Referred Signup | 25 | New user | Via referral |

### Award Implementation

```javascript
async function awardCredits(userId, amount, reason) {
  // Get/create credits record
  let userCredits = await storage.getUserCredits(userId);
  IF (!userCredits) {
    userCredits = await storage.createUserCredits({
      userId, balance: 0, totalEarned: 0
    });
  }
  
  // Update balances
  const newBalance = userCredits.balance + amount;
  const newTotalEarned = userCredits.totalEarned + amount;
  
  await storage.updateUserCredits(userId, newBalance);
  
  // Log transaction
  await storage.addCreditTransaction({
    userId, amount, type: 'earned', reason
  });
  
  // Check for rank up
  const newRank = calculateRank(newTotalEarned);
  IF (newRank !== userCredits.currentRank) {
    await createNotificationWithEmail({
      userId,
      title: `Rank Up! You're now ${newRank.name}`,
      message: `You've achieved ${newRank.name} rank!`,
      type: 'system'
    });
  }
  
  return { newBalance, newTotalEarned };
}
```

### Conversion: Brocks to Rupees

```
User applies 200 Brocks to ₹87 payment:
  ↓
conversionRate = 20  // 20 Brocks = ₹1
  ↓
rupeesDiscount = Math.floor(200 / 20) = ₹10
brocksToDeduct = 10 × 20 = 200 Brocks
newPaymentAmount = ₹87 - ₹10 = ₹77
  ↓
Display: "Brocks discount: -₹10, New total: ₹77"
  ↓
After payment success:
  ↓
  UPDATE user_credits
  SET balance = balance - 200
  ↓
  INSERT INTO credit_transactions
  VALUES (userId, 200, 'spent',
    'Converted 200 Brocks to ₹10 discount')
```

### Conversion: Brocks to Commission-Free Days

```
User converts 100 Brocks:
  ↓
conversionRate = 20  // 20 Brocks = 1 day
  ↓
commissionFreeDays = Math.floor(100 / 20) = 5 days
brocksToDeduct = 5 × 20 = 100
  ↓
Deduct credits (same as rupees conversion)
  ↓
UPDATE users
SET commissionFreeDays = commissionFreeDays + 5,
    commissionFreeDaysExpiry = NOW() + INTERVAL '30 days'
  ↓
On next rental:
  IF (user.commissionFreeDays > 0 AND expiry > NOW()):
    platformFee = 0  // No commission
    user.commissionFreeDays -= 1
  ELSE:
    platformFee = rentalFee × 0.10
```

### Ranking System

```javascript
const RANKS = [
  { min: 0,    max: 49,   name: 'Explorer',   badge: '🌟' },
  { min: 50,   max: 199,  name: 'Adventurer', badge: '⭐' },
  { min: 200,  max: 499,  name: 'Enthusiast', badge: '✨' },
  { min: 500,  max: 999,  name: 'Master',     badge: '💎' },
  { min: 1000, max: 1999, name: 'Legend',     badge: '👑' },
  { min: 2000, max: 99999, name: 'Emperor',   badge: '🏆' }
];

function calculateRank(totalEarned) {
  return RANKS.find(r => 
    totalEarned >= r.min && totalEarned <= r.max
  );
}

function calculateProgress(totalEarned) {
  const currentRank = calculateRank(totalEarned);
  const nextRank = RANKS[RANKS.indexOf(currentRank) + 1];
  
  IF (!nextRank) return { percentage: 100, creditsToNext: 0 };
  
  const progress = totalEarned - currentRank.min;
  const range = nextRank.min - currentRank.min;
  const percentage = (progress / range) * 100;
  const creditsToNext = nextRank.min - totalEarned;
  
  return { percentage, creditsToNext };
}

// Example: User with 350 Brocks
// rank = Enthusiast (200-499)
// progress = (350-200)/(500-200) = 50%
// creditsToNext = 500-350 = 150
```

---

## Notification & Email System

### Architecture

```
Event trigger (rental created, message received, etc.)
  ↓
createNotificationWithEmail({
  userId, title, message, type, data
})
  ↓
┌───────────────────────────────────┐
│ STEP 1: In-App (Synchronous)     │
└───────────────────────────────────┘
  ↓
const notification = await storage.createNotification(data);
  ↓
INSERT INTO notifications (
  userId, title, message, type, data, isRead
) VALUES (
  123, 'Rental Confirmed', 'You borrowed "Book"',
  'rental', '{"rentalId":456}', false
)
RETURNING *
  ↓
Store notification: { id: 789, userId: 123, ... }
  ↓
┌───────────────────────────────────┐
│ STEP 2: Email (Asynchronous)     │
└───────────────────────────────────┘
  ↓
sendEmailNotification(userId, title, message)
  .catch(err => console.error(err));
  // Non-blocking, runs in background
  ↓
Return notification immediately
```

### SendGrid Email Implementation

```javascript
async function sendEmailNotification(userId, title, message) {
  try {
    // Check SendGrid configured
    IF (!process.env.SENDGRID_API_KEY) {
      console.log('SendGrid not configured');
      return;
    }
    
    // Get user
    const user = await storage.getUser(userId);
    IF (!user?.email) return;
    
    // Import SendGrid
    const sgMail = await import('@sendgrid/mail');
    sgMail.default.setApiKey(process.env.SENDGRID_API_KEY);
    
    // Detect URL
    let frontendUrl;
    IF (process.env.PRODUCTION_DOMAIN) {
      frontendUrl = `https://${process.env.PRODUCTION_DOMAIN}`;
    } ELSE IF (process.env.REPLIT_DOMAINS) {
      frontendUrl = `https://${process.env.REPLIT_DOMAINS.split(',')[0]}`;
    }
    
    // Send email
    await sgMail.default.send({
      to: user.email,
      from: process.env.SENDGRID_FROM_EMAIL || 'bookpotato.info@gmail.com',
      subject: `BookPotato - ${title}`,
      text: `Hi ${user.name},\n\n${message}`,
      html: `
        <h2>${title}</h2>
        <p>Hi ${user.name},</p>
        <div style="background:#f3f4f6;padding:16px;">
          ${message.replace(/\n/g, '<br>')}
        </div>
        <a href="${frontendUrl}/notifications">
          View All Notifications
        </a>
      `
    });
    
    console.log(`Email sent to ${user.email}`);
  } catch (error) {
    console.error('Email failed:', error.message);
    // Don't throw - email failure shouldn't break app
  }
}
```

### Notification Types

| Type | Trigger | Borrower | Lender | Email? |
|------|---------|----------|--------|--------|
| rental | Created | ✓ | ✓ | ✓ |
| rental | Return requested | ✓ | ✓ | ✓ |
| rental | Return confirmed | ✓ | ✓ | ✓ |
| payment | Success | ✓ | - | ✓ |
| payment | Refund | ✓ | - | ✓ |
| payment | Late fee | ✓ | - | ✓ |
| message | Direct | - | ✓ | ✓ |
| message | Hub | Hub | - | ❌ |
| hub | Joined | ✓ | - | ✓ |
| system | Rank up | ✓ | - | ✓ |

---

## Buy/Sell Marketplace

### Book Listing

```
User uploads book with selling price:
  ↓
Frontend form: {
  title, author, isbn,
  dailyFee: 10,       // For rentals
  sellingPrice: 150,  // For purchase
  condition: 'good'
}
  ↓
Frontend → POST /api/books/upload
  ↓
Backend:
  INSERT INTO books (
    userId, title, author, isbn,
    dailyFee, sellingPrice, condition,
    available, sold
  ) VALUES (
    userId, title, author, isbn,
    10.00, 150.00, 'good',
    true, false
  )
  ↓
Tag with user's hubs:
  SELECT hubId FROM hub_members WHERE userId = userId
  FOR EACH hub:
    INSERT INTO book_hub_tags (bookId, hubId)
  ↓
Award 2 Brocks
```

### Purchase (Razorpay)

```
User clicks "Buy Now" (price ₹150)
  ↓
Frontend → POST /api/payments/create-order
  Body: { amount: 150, type: 'purchase', bookId: 123 }
  ↓
Backend: order = await razorpay.orders.create(...)
  ↓
User pays on Razorpay modal
  ↓
Frontend → POST /api/books/123/buy
  Body: { paymentMethod: 'razorpay', paymentId, orderId }
  ↓
Backend verifies signature
  ↓
INSERT INTO book_purchases (
  bookId, buyerId, sellerId,
  purchasePrice, paymentStatus, paymentMethod
) VALUES (
  123, userId, book.userId,
  150.00, 'completed', 'razorpay'
)
  ↓
UPDATE books
SET available = false, sold = true, soldAt = NOW()
  ↓
Notifications:
  Buyer: "Purchase successful for ₹150"
  Seller: "{buyer} purchased your book"
  ↓
Response: { purchase, sellerContact: { name, phone, ... } }
```

### Purchase (Brocks)

```
sellingPrice = ₹150
brocksCost = 150 × 20 = 3000 Brocks
  ↓
Verify user has 3000 Brocks
  ↓
Deduct from buyer:
  UPDATE user_credits SET balance = balance - 3000
  ↓
Award to seller:
  UPDATE user_credits SET balance = balance + 3000
  ↓
[Same as Razorpay: Create purchase, update book, notify]
```

---

## Real-Time Chat System

### WebSocket Server Setup

```javascript
// server/index.ts
import { WebSocketServer } from 'ws';

const server = app.listen(5000);
const wss = new WebSocketServer({ server });

// Active connections map
const activeConnections = new Map();

wss.on('connection', (ws, req) => {
  let userId = null;
  
  ws.on('message', async (data) => {
    const msg = JSON.parse(data);
    
    // Authentication
    IF (msg.type === 'auth') {
      const session = await getSession(req);
      IF (session?.userId) {
        userId = session.userId;
        activeConnections.set(userId, ws);
        ws.send(JSON.stringify({
          type: 'auth_success', userId
        }));
      }
    }
  });
  
  ws.on('close', () => {
    IF (userId) activeConnections.delete(userId);
  });
});
```

### Send Direct Message

```
User A sends message to User B:
  ↓
Frontend → POST /api/chats/messages
  Body: {
    conversationId: 456,
    message: "When can I pick up the book?",
    type: 'direct'
  }
  ↓
Backend validates:
  conversation = await storage.getConversation(456)
  IF user not participant: return error
  ↓
INSERT INTO messages (
  senderId, conversationId,
  message, type, isRead
) VALUES (
  userId, 456,
  'When can I pick up...', 'direct', false
)
  ↓
UPDATE conversations
SET lastMessage = 'When can I...',
    lastMessageAt = NOW()
  ↓
Broadcast via WebSocket:
  recipientId = (other user in conversation)
  recipientWs = activeConnections.get(recipientId)
  ↓
  IF recipientWs && recipientWs.readyState === OPEN:
    recipientWs.send(JSON.stringify({
      type: 'new_message',
      message: { id, senderId, message, createdAt }
    }))
  ↓
IF recipient offline:
  Create notification with email
```

### Send Hub Message

```
User sends in hub chat:
  ↓
Frontend → POST /api/chats/messages
  Body: {
    hubId: 7,
    message: "Anyone has 'Sapiens' book?",
    type: 'hub'
  }
  ↓
Validate: await storage.isHubMember(userId, 7)
  ↓
INSERT INTO messages (
  senderId, hubId, message, type
) VALUES (
  userId, 7, 'Anyone has...', 'hub'
)
  ↓
Broadcast to all hub members:
  members = await storage.getHubMembers(7)
  FOR EACH member (except sender):
    memberWs = activeConnections.get(member.userId)
    IF memberWs && OPEN:
      memberWs.send(JSON.stringify({
        type: 'hub_message',
        message: { id, senderId, message, createdAt }
      }))
```

### Unread Tracking

**Fetch with counts**:
```sql
SELECT 
  c.id, c.user1Id, c.user2Id,
  c.lastMessage, c.lastMessageAt,
  COUNT(m.id) FILTER (
    WHERE m.isRead = false AND m.senderId != ?
  ) as unreadCount
FROM conversations c
LEFT JOIN messages m ON m.conversationId = c.id
WHERE c.user1Id = ? OR c.user2Id = ?
GROUP BY c.id
ORDER BY c.lastMessageAt DESC
```

**Mark as read**:
```
User opens conversation 456:
  ↓
Frontend → POST /api/chats/conversations/456/mark-read
  ↓
UPDATE messages
SET isRead = true, readAt = NOW()
WHERE conversationId = 456
  AND senderId != userId
  AND isRead = false
  ↓
Notify sender via WebSocket:
  ws.send({ type: 'messages_read', conversationId: 456 })
```

---

## Hub Management

### Hub Types

1. **Society** - Residential communities
2. **School** - Educational institutions  
3. **Office** - Workplace communities

### Hub Creation

```
User creates hub:
  ↓
Frontend form: {
  name: "AVM Bandra East",
  type: "society",
  location: "Bandra East, Mumbai"
}
  ↓
Frontend → POST /api/hubs/create
  ↓
Generate unique code:
  code = random 6 chars (e.g., "AVM123")
  WHILE exists: code = regenerate
  ↓
INSERT INTO hubs (
  name, code, type, location,
  createdBy, isApproved
) VALUES (
  'AVM Bandra East', 'AVM123', 'society',
  'Bandra East...', userId, false
)
  ↓
Auto-join creator as admin:
  INSERT INTO hub_members (hubId, userId, role)
  VALUES (newHubId, userId, 'admin')
  ↓
  UPDATE hubs SET memberCount = 1
  ↓
Notify admins for approval
```

### Hub Join (by code)

```
User enters: "AVM123"
  ↓
Frontend → POST /api/hubs/join-by-code
  Body: { code: "AVM123" }
  ↓
hub = await storage.getHubByCode("AVM123")
  ↓
Validate:
  IF !hub: error "Not found"
  IF !hub.isApproved: error "Pending approval"
  IF alreadyMember: error "Already member"
  ↓
INSERT INTO hub_members (hubId, userId, role)
VALUES (hub.id, userId, 'member')
  ↓
UPDATE hubs SET memberCount = memberCount + 1
  ↓
Tag user's books:
  userBooks = await storage.getUserBooks(userId)
  FOR EACH book:
    INSERT INTO book_hub_tags (bookId, hubId)
    VALUES (book.id, hub.id)
  ↓
Notification: "Joined {hubName}, {count} books visible"
```

### Book Visibility

**Upload**:
```
Book created → id = 789
  ↓
Get user's hubs:
  SELECT hubId FROM hub_members WHERE userId = userId
  → [7, 12, 23]
  ↓
Tag with all:
  FOR EACH hubId:
    INSERT INTO book_hub_tags (bookId, hubId)
  ↓
Book visible in all 3 hubs
```

**Browse**:
```
Frontend → GET /api/books/browse?hubId=7
  ↓
SELECT DISTINCT b.*, u.name as ownerName
FROM books b
JOIN book_hub_tags bht ON b.id = bht.bookId
JOIN users u ON b.userId = u.id
WHERE bht.hubId = 7
  AND b.available = true
  AND b.sold = false
```

**Leave**:
```
Frontend → POST /api/hubs/7/leave
  ↓
DELETE FROM hub_members WHERE hubId = 7 AND userId = userId
  ↓
UPDATE hubs SET memberCount = memberCount - 1
  ↓
DELETE FROM book_hub_tags
WHERE hubId = 7 AND bookId IN (
  SELECT id FROM books WHERE userId = userId
)
  ↓
Books hidden from Hub 7, still visible in other hubs
```

---

## Database Schema

### Core Tables

```sql
-- Users
users (
  id, name, email, password, phone,
  flatWing, buildingName, detailedAddress, city,
  isAdmin, commissionFreeDays, createdAt
)

-- Credits
user_credits (
  id, userId FK, balance, totalEarned, updatedAt
)

credit_transactions (
  id, userId FK, amount, type, reason, createdAt
)

-- Hubs
hubs (
  id, name, code UNIQUE, type,
  location, description, createdBy FK,
  isApproved, memberCount, createdAt
)

hub_members (
  id, hubId FK, userId FK, role, joinedAt
)

-- Books
books (
  id, userId FK, title, author, isbn,
  dailyFee, sellingPrice, condition,
  available, sold, soldAt, createdAt
)

book_hub_tags (
  bookId FK, hubId FK
)

-- Rentals
rentals (
  id, bookId FK, borrowerId FK, lenderId FK, hubId FK,
  startDate, endDate, actualReturnDate,
  totalAmount, platformFee, lenderAmount, securityDeposit,
  lateFeeAmount, refundAmount,
  status, paymentStatus, paymentMethod, paymentId,
  createdAt
)

-- Purchases
book_purchases (
  id, bookId FK, buyerId FK, sellerId FK,
  purchasePrice, paymentStatus, paymentMethod,
  paymentId, purchasedAt
)

-- Chat
conversations (
  id, user1Id FK, user2Id FK,
  lastMessage, lastMessageAt, createdAt
)

messages (
  id, senderId FK, conversationId FK, hubId FK,
  message, type, isRead, readAt, createdAt
)

-- Notifications
notifications (
  id, userId FK, title, message, type,
  data JSON, isRead, createdAt
)
```

---

## API Endpoints

### Auth
```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/auth/me
GET    /api/auth/google
GET    /api/auth/google/callback
POST   /api/auth/forgot-password
POST   /api/auth/reset-password
```

### Books
```
GET    /api/books/browse?hubId={id}
GET    /api/books/my-books?tab={uploaded|borrowed|lent|bought|sold}
GET    /api/books/:id
POST   /api/books/upload
POST   /api/books/bulk-upload
PUT    /api/books/:id
DELETE /api/books/:id
POST   /api/books/:id/buy
GET    /api/books/:id/reviews
POST   /api/books/:id/review
```

### Rentals
```
POST   /api/rentals/borrow
GET    /api/rentals/borrowed
GET    /api/rentals/lent
POST   /api/rentals/:id/request-return
POST   /api/rentals/:id/confirm-return
POST   /api/rentals/:id/pay-excess-charges
```

### Hubs
```
GET    /api/hubs/my
GET    /api/hubs/search?q={query}&type={type}
POST   /api/hubs/create
POST   /api/hubs/join-by-code
POST   /api/hubs/:id/join
POST   /api/hubs/:id/leave
GET    /api/hubs/:id/members
```

### Chat
```
GET    /api/chats/conversations
POST   /api/chats/conversations
GET    /api/chats/conversations/:id
POST   /api/chats/messages
POST   /api/chats/conversations/:id/mark-read
GET    /api/chats/hub/:hubId/messages
```

### Credits
```
GET    /api/user/credits
GET    /api/user/credit-transactions
POST   /api/brocks/purchase
POST   /api/brocks/apply
GET    /api/leaderboard
```

### Payments
```
POST   /api/payments/create-order
POST   /api/payments/verify
```

### Notifications
```
GET    /api/notifications
POST   /api/notifications/:id/read
POST   /api/notifications/read-all
```

---

## Environment Variables

### Required Secrets
```
DATABASE_URL=postgresql://...
SENDGRID_API_KEY=SG.xxxxx
SENDGRID_FROM_EMAIL=bookpotato.info@gmail.com
RAZORPAY_KEY_ID=rzp_xxxxx
RAZORPAY_KEY_SECRET=xxxxx
VITE_RAZORPAY_KEY_ID=rzp_xxxxx
PRODUCTION_DOMAIN=bookpotato.in
GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxx
```

### Auto-Configured
```
REPLIT_DOMAINS=dev-domain.replit.dev
NODE_ENV=development
```

---

## Recent Updates (October 2025)

### Email System
- Fixed recursive bug in `createNotificationWithEmail`
- Line 86: `storage.createNotification()` instead of self-call
- All notification types send emails
- Sender: bookpotato.info@gmail.com

### OAuth
- Dynamic callback URL detection
- Production domain support (bookpotato.in)
- Priority: PRODUCTION_DOMAIN → REPLIT_DOMAINS

### Late Fees
- 100% daily rate (not 50%)
- Platform commission on late fees
- Immediate payment modal for excess

### Bug Fixes
- Notifications don't block transactions
- Payment → rental creation works
- Credits awarded correctly

---

**Last Updated**: October 19, 2025  
**Version**: 2.0  
**Production**: https://bookpotato.in
