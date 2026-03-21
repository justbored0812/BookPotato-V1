# BookShare: Complete Technical Specifications
## System Architecture & Development Documentation

---

## 🏗️ **System Architecture Overview**

### **Application Type**
- **Platform**: Progressive Web Application (PWA)
- **Architecture**: Full-stack monorepo with shared TypeScript schemas
- **Deployment**: Replit cloud platform with autoscale deployment
- **Domain**: Community-driven digital library platform

### **Technology Stack**

#### **Frontend Technology**
```typescript
Framework: React 18 with TypeScript
Routing: Wouter (lightweight client-side routing)
State Management: TanStack Query (React Query v5) for server state
UI Components: Radix UI primitives + shadcn/ui component library
Styling: Tailwind CSS with custom CSS variables for theming
Form Handling: React Hook Form with Zod validation
Build Tool: Vite for development and production builds
```

#### **Backend Technology** 
```typescript
Runtime: Node.js 20 with Express.js server
Language: TypeScript with ES modules
API Design: RESTful API with JSON responses
Session Management: express-session with HTTP-only cookies
Authentication: Session-based with passport.js strategies
File Structure: Monorepo with shared types and schemas
```

#### **Database & ORM**
```sql
Database: PostgreSQL 16 (Neon serverless)
ORM: Drizzle ORM with schema-first approach
Migrations: Drizzle Kit for database schema management
Connection: Neon serverless with WebSocket support
Query Builder: Type-safe SQL with automatic TypeScript generation
```

---

## 📊 **Database Schema Design**

### **Core Entity Relationships**

```sql
-- Users Table
users {
  id: SERIAL PRIMARY KEY
  name: VARCHAR(255) NOT NULL
  email: VARCHAR(255) UNIQUE NOT NULL
  password: TEXT (hashed with bcrypt)
  userNumber: INTEGER UNIQUE (auto-generated)
  isAdmin: BOOLEAN DEFAULT false
  profilePicture: TEXT (URL)
  createdAt: TIMESTAMP DEFAULT NOW()
}

-- Societies Table  
societies {
  id: SERIAL PRIMARY KEY
  name: VARCHAR(255) NOT NULL
  code: VARCHAR(20) UNIQUE NOT NULL
  address: TEXT NOT NULL
  latitude: DECIMAL(10,8)
  longitude: DECIMAL(11,8)
  isApproved: BOOLEAN DEFAULT false
  memberCount: INTEGER DEFAULT 0
  createdAt: TIMESTAMP DEFAULT NOW()
}

-- Books Table
books {
  id: SERIAL PRIMARY KEY
  title: VARCHAR(500) NOT NULL
  author: VARCHAR(500) NOT NULL
  isbn: VARCHAR(20)
  genre: VARCHAR(100)
  description: TEXT
  condition: ENUM('Excellent', 'Good', 'Fair', 'Poor')
  dailyFee: DECIMAL(10,2) NOT NULL
  imageUrl: TEXT
  coverImageUrl: TEXT
  isAvailable: BOOLEAN DEFAULT true
  ownerId: INTEGER REFERENCES users(id)
  societyId: INTEGER REFERENCES societies(id)
  createdAt: TIMESTAMP DEFAULT NOW()
}

-- Rentals Table
rentals {
  id: SERIAL PRIMARY KEY
  bookId: INTEGER REFERENCES books(id)
  borrowerId: INTEGER REFERENCES users(id)
  lenderId: INTEGER REFERENCES users(id)
  startDate: DATE NOT NULL
  endDate: DATE NOT NULL
  totalAmount: DECIMAL(10,2) NOT NULL
  securityDeposit: DECIMAL(10,2) NOT NULL
  status: ENUM('active', 'returned', 'overdue', 'requested')
  createdAt: TIMESTAMP DEFAULT NOW()
}
```

### **Advanced Schema Components**

```sql
-- Society Memberships (Many-to-Many)
societyMemberships {
  id: SERIAL PRIMARY KEY
  userId: INTEGER REFERENCES users(id)
  societyId: INTEGER REFERENCES societies(id)
  joinedAt: TIMESTAMP DEFAULT NOW()
}

-- Brocks Credits System
userCredits {
  id: SERIAL PRIMARY KEY
  userId: INTEGER REFERENCES users(id)
  balance: INTEGER DEFAULT 100
  totalEarned: INTEGER DEFAULT 100
  lastUpdated: TIMESTAMP DEFAULT NOW()
}

-- Rewards Tracking
rewards {
  id: SERIAL PRIMARY KEY
  userId: INTEGER REFERENCES users(id)
  type: VARCHAR(50) NOT NULL
  credits: INTEGER NOT NULL
  description: TEXT
  createdAt: TIMESTAMP DEFAULT NOW()
}

-- Platform Settings (Admin Configurable)
platformSettings {
  id: SERIAL PRIMARY KEY
  commissionRate: INTEGER DEFAULT 5
  securityDepositRate: INTEGER DEFAULT 100
  brocksUploadReward: INTEGER DEFAULT 1
  brocksReferralReward: INTEGER DEFAULT 5
  brocksBorrowReward: INTEGER DEFAULT 5
  brocksLendReward: INTEGER DEFAULT 5
  creditsToCommissionFreeDays: INTEGER DEFAULT 20
  creditsToRupees: INTEGER DEFAULT 20
}
```

---

## 🔧 **API Endpoint Specifications**

### **Authentication Endpoints**
```typescript
POST /api/auth/login
  Body: { email: string, password: string }
  Response: { user: User, message: string }

POST /api/auth/register  
  Body: { name: string, email: string, password: string, referralCode?: string }
  Response: { user: User, message: string }

POST /api/auth/logout
  Response: { message: string }

GET /api/auth/me
  Response: { user: User } | 401 Unauthorized
```

### **Society Management**
```typescript
GET /api/societies
  Response: Society[]

GET /api/societies/my
  Auth: Required
  Response: UserSociety[]

POST /api/societies
  Auth: Required
  Body: CreateSocietyRequest
  Response: { society: Society, message: string }

GET /api/societies/:id/stats
  Response: { memberCount: number, bookCount: number, activeRentals: number }
```

### **Book Management**
```typescript
GET /api/books/browse
  Query: { societyId?: number, search?: string, genre?: string }
  Response: BookWithOwner[]

GET /api/books/my
  Auth: Required
  Response: Book[]

POST /api/books
  Auth: Required
  Body: CreateBookRequest
  Response: { book: Book, message: string }

PUT /api/books/:id
  Auth: Required (Owner only)
  Body: UpdateBookRequest
  Response: { book: Book, message: string }
```

### **Rental System**
```typescript
POST /api/rentals
  Auth: Required
  Body: { bookId: number, duration: number }
  Response: { rental: Rental, paymentUrl: string }

GET /api/rentals/active
  Auth: Required
  Response: RentalWithDetails[]

GET /api/rentals/borrowed
  Auth: Required
  Response: RentalWithDetails[]

GET /api/rentals/lent
  Auth: Required
  Response: RentalWithDetails[]

PATCH /api/rentals/:id/return
  Auth: Required
  Response: { message: string }
```

### **Brocks & Rewards System**
```typescript
GET /api/user/credits
  Auth: Required
  Response: { balance: number, totalEarned: number }

GET /api/user/recent-rewards
  Auth: Required
  Response: Reward[]

GET /api/brocks/leaderboard
  Response: LeaderboardEntry[]

POST /api/brocks/convert
  Auth: Required
  Body: { credits: number, type: 'commission-free' | 'rupees' }
  Response: { message: string, newBalance: number }
```

---

## 🎨 **Frontend Architecture**

### **Component Structure**
```
src/
├── components/
│   ├── ui/                    # shadcn/ui base components
│   ├── layout/                # App layout components
│   ├── modals/                # Modal dialogs
│   ├── brocks/                # Brocks-specific components
│   └── map/                   # Location picker components
├── pages/                     # Route-based page components
├── hooks/                     # Custom React hooks
├── lib/                       # Utility functions and configurations
└── App.tsx                    # Main application router
```

### **State Management Pattern**
```typescript
// TanStack Query for Server State
const { data: books, isLoading } = useQuery({
  queryKey: ["/api/books/browse"],
  queryFn: () => fetch("/api/books/browse").then(res => res.json())
});

// Local State for UI Components
const [showModal, setShowModal] = useState(false);

// Form State with React Hook Form + Zod
const form = useForm({
  resolver: zodResolver(createBookSchema),
  defaultValues: { title: "", author: "", dailyFee: 0 }
});
```

### **Routing Configuration**
```typescript
// Authenticated Routes
<Switch>
  <Route path="/" component={Home} />
  <Route path="/browse" component={Browse} />
  <Route path="/my-books" component={MyBooks} />
  <Route path="/societies" component={Societies} />
  <Route path="/how-it-works" component={HowItWorks} />
  <Route path="/admin" component={AdminPanel} />
</Switch>

// Public Routes (unauthenticated)
<Switch>
  <Route path="/auth" component={Auth} />
  <Route component={Welcome} />
</Switch>
```

---

## 🔐 **Security & Authentication**

### **Session-Based Authentication**
```typescript
// Session Configuration
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Authentication Middleware
function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Authentication required" });
  }
  next();
}
```

### **Data Validation**
```typescript
// Zod Schema Validation
const createBookSchema = z.object({
  title: z.string().min(1).max(500),
  author: z.string().min(1).max(500),
  isbn: z.string().optional(),
  genre: z.string().min(1).max(100),
  dailyFee: z.number().min(0).max(1000),
  condition: z.enum(['Excellent', 'Good', 'Fair', 'Poor'])
});

// API Request Validation
app.post('/api/books', requireAuth, async (req, res) => {
  const result = createBookSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ errors: result.error.issues });
  }
  // Process valid data...
});
```

---

## 💳 **Payment Integration**

### **Razorpay Integration (India)**
```typescript
// Order Creation
const order = await razorpay.orders.create({
  amount: totalAmount * 100, // Convert to paise
  currency: 'INR',
  receipt: `rental_${rentalId}`,
  notes: {
    bookId: bookId,
    borrowerId: userId,
    societyId: societyId
  }
});

// Payment Verification
const isValidSignature = crypto
  .createHmac('sha256', process.env.RAZORPAY_SECRET)
  .update(`${orderId}|${paymentId}`)
  .digest('hex') === signature;
```

### **Stripe Integration (International)**
```typescript
// Payment Intent Creation
const paymentIntent = await stripe.paymentIntents.create({
  amount: Math.round(totalAmount * 100), // Convert to cents
  currency: 'usd',
  metadata: {
    bookId: bookId.toString(),
    borrowerId: userId.toString(),
    rentalDuration: duration.toString()
  }
});
```

---

## 📱 **Progressive Web App Features**

### **PWA Configuration**
```json
// manifest.json
{
  "name": "BookShare - Community Library",
  "short_name": "BookShare",
  "description": "Share books with your neighbors",
  "start_url": "/",
  "display": "standalone",
  "theme_color": "#3B82F6",
  "background_color": "#FFFFFF",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512.png", 
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

### **Service Worker Features**
- Offline book browsing with cached data
- Push notifications for due dates and extension requests
- Background sync for book returns when online
- Cached static assets for faster loading

---

## 📊 **Analytics & Monitoring**

### **Application Metrics**
```typescript
// User Engagement Tracking
- Daily/Monthly Active Users
- Book rental conversion rates
- Society growth and retention metrics
- Brocks credit usage patterns
- Feature adoption rates

// Business Intelligence
- Revenue per society/user
- Most popular book genres
- Peak rental periods
- Geographic expansion opportunities
- Payment success rates
```

### **Performance Monitoring**
```typescript
// Database Query Optimization
- Query execution time tracking
- Connection pool monitoring
- Index usage analysis
- Slow query identification

// API Performance
- Response time monitoring
- Error rate tracking
- Rate limiting implementation
- Caching effectiveness metrics
```

---

## 🔄 **DevOps & Deployment**

### **Development Workflow**
```bash
# Development Environment
npm run dev          # Start development server
npm run db:push      # Push schema changes to database
npm run db:studio    # Open database management GUI
npm run build        # Build for production
npm run test         # Run test suite
```

### **Production Deployment**
```yaml
# Replit Deployment Configuration
run = "npm run dev"
entrypoint = "server/index.ts"

[env]
NODE_ENV = "production"
DATABASE_URL = "${DATABASE_URL}"
SESSION_SECRET = "${SESSION_SECRET}"
RAZORPAY_KEY_ID = "${RAZORPAY_KEY_ID}"
RAZORPAY_SECRET = "${RAZORPAY_SECRET}"
```

### **Environment Variables**
```bash
# Required Environment Variables
DATABASE_URL=postgresql://username:password@host:port/database
SESSION_SECRET=your-session-secret-key
RAZORPAY_KEY_ID=your-razorpay-key-id
RAZORPAY_SECRET=your-razorpay-secret-key
VITE_STRIPE_PUBLIC_KEY=your-stripe-public-key
STRIPE_SECRET_KEY=your-stripe-secret-key
```

---

## 🚀 **Scalability Considerations**

### **Database Optimization**
```sql
-- Indexing Strategy
CREATE INDEX idx_books_society_available ON books(societyId, isAvailable);
CREATE INDEX idx_rentals_borrower_status ON rentals(borrowerId, status);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_society_memberships_user ON societyMemberships(userId);

-- Query Optimization
- Use connection pooling for concurrent requests
- Implement read replicas for analytics queries
- Partition large tables by date or society
- Cache frequently accessed data with Redis
```

### **Application Scaling**
```typescript
// Horizontal Scaling Strategies
- Stateless server design for load balancing
- CDN integration for static asset delivery
- Background job processing with queues
- Microservice architecture for high-load features
- Database sharding by geographic regions
```

---

## 🧪 **Testing Strategy**

### **Testing Framework**
```typescript
// Unit Testing with Jest
describe('Book Rental Logic', () => {
  test('calculates rental amount correctly', () => {
    const rental = calculateRentalAmount(10, 5, 0.05);
    expect(rental.total).toBe(52.50);
    expect(rental.commission).toBe(2.50);
  });
});

// Integration Testing with Supertest
describe('API Endpoints', () => {
  test('POST /api/books creates book successfully', async () => {
    const response = await request(app)
      .post('/api/books')
      .send(validBookData)
      .expect(201);
    
    expect(response.body.book.title).toBe(validBookData.title);
  });
});
```

### **Quality Assurance**
- TypeScript for compile-time type checking
- ESLint and Prettier for code quality
- Automated testing in CI/CD pipeline
- Manual testing on multiple devices
- User acceptance testing with beta communities

---

## 📈 **Performance Specifications**

### **Performance Targets**
```
Page Load Time: < 2 seconds (3G connection)
API Response Time: < 500ms (95th percentile)
Database Query Time: < 100ms (average)
Mobile App Size: < 5MB (PWA cache)
Uptime SLA: 99.9% availability
```

### **Optimization Techniques**
- Code splitting with React.lazy()
- Image optimization and lazy loading
- API response caching with Cache-Control headers
- Database query optimization with proper indexing
- Bundle size optimization with tree shaking

---

## 🔮 **Future Technical Roadmap**

### **Phase 1 Enhancements (Next 6 Months)**
- Push notification system for mobile devices
- Advanced search with elasticsearch integration
- Real-time chat system for book discussions
- Automated book recommendation engine
- Enhanced analytics dashboard for societies

### **Phase 2 Innovations (6-12 Months)**
- AI-powered book condition assessment
- Blockchain-based book ownership verification
- Voice search and accessibility features
- Augmented reality book preview
- IoT integration for smart bookshelf tracking

### **Phase 3 Expansion (12+ Months)**
- Multi-language support for regional markets
- Machine learning for fraud detection
- Advanced booking and waitlist system
- Integration with educational platforms
- Corporate book sharing solutions

---

## 🛠️ **Development Guidelines**

### **Code Style & Standards**
```typescript
// TypeScript Configuration
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true
  }
}

// Naming Conventions
- Components: PascalCase (BookCard.tsx)
- Functions: camelCase (calculateRental)
- Constants: SCREAMING_SNAKE_CASE (MAX_RENTAL_DAYS)
- Database tables: camelCase (userCredits)
```

### **Best Practices**
- Use TypeScript for all new code
- Implement proper error boundaries
- Follow React Hook rules and patterns
- Use semantic HTML for accessibility
- Implement proper loading and error states
- Write comprehensive API documentation

---

## 📞 **Technical Support & Documentation**

### **Documentation Resources**
- API Documentation: Swagger/OpenAPI specification
- Component Storybook: UI component documentation
- Database Schema: ERD diagrams and relationships
- Deployment Guide: Step-by-step setup instructions
- Troubleshooting Guide: Common issues and solutions

### **Development Team Contacts**
- Technical Lead: System architecture and scaling decisions
- Frontend Developer: React components and user experience
- Backend Developer: API development and database optimization
- DevOps Engineer: Deployment and infrastructure management
- QA Engineer: Testing strategy and quality assurance

---

*This technical specification serves as the definitive guide for BookShare platform development, maintenance, and scaling decisions.*