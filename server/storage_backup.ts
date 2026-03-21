import { 
  users, societies, books, bookRentals, societyMembers, notifications, societyRequests, referralRewards, rentalExtensions, extensionRequests,
  userCredits, creditTransactions, referrals, userBadges, commissionFreePeriods, rewardSettings, brocksPackages,
  type User, type InsertUser, type Society, type InsertSociety, 
  type Book, type InsertBook, type BookRental, type InsertBookRental,
  type SocietyMember, type InsertSocietyMember, type Notification, type InsertNotification,
  type BookWithOwner, type RentalWithDetails, type SocietyWithStats, type RentalExtension, type InsertRentalExtension,
  type ExtensionRequest, type InsertExtensionRequest, type UserCredits, type InsertUserCredits,
  type CreditTransaction, type InsertCreditTransaction, type Referral, type InsertReferral,
  type UserBadge, type InsertUserBadge, type CommissionFreePeriod, type InsertCommissionFreePeriod,
  type RewardSetting, type InsertRewardSetting, type BrocksPackage, type InsertBrocksPackage
} from "@shared/schema";
import { db } from "./db";
import { eq, and, or, not, ne, inArray, ilike, desc, count, sum, sql } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  generateUniqueUserNumber(): Promise<number>;
  updateUser(id: number, updates: Partial<User>): Promise<User | undefined>;
  
  // Societies
  getSociety(id: number): Promise<Society | undefined>;
  getSocietyByCode(code: string): Promise<Society | undefined>;
  getSocietiesByUser(userId: number): Promise<SocietyWithStats[]>;
  getAvailableSocieties(userId: number): Promise<SocietyWithStats[]>;
  createSociety(society: InsertSociety): Promise<Society>;
  joinSociety(societyId: number, userId: number): Promise<SocietyMember>;
  leaveSociety(societyId: number, userId: number): Promise<boolean>;
  isMemberOfSociety(societyId: number, userId: number): Promise<boolean>;
  
  // Books
  getBook(id: number): Promise<BookWithOwner | undefined>;
  getBooksBySociety(societyId: number): Promise<BookWithOwner[]>;
  getBooksByOwner(ownerId: number): Promise<Book[]>;
  searchBooks(societyId: number, query?: string, genre?: string): Promise<BookWithOwner[]>;
  createBook(book: InsertBook): Promise<Book>;
  updateBook(id: number, updates: Partial<Book>): Promise<Book | undefined>;
  
  // Rentals
  getRental(id: number): Promise<RentalWithDetails | undefined>;
  getRentalsByBorrower(borrowerId: number): Promise<RentalWithDetails[]>;
  getRentalsByLender(lenderId: number): Promise<RentalWithDetails[]>;
  getActiveRentals(userId: number): Promise<RentalWithDetails[]>;
  createRental(rental: InsertBookRental): Promise<BookRental>;
  updateRental(id: number, updates: Partial<BookRental>): Promise<BookRental | undefined>;
  
  // Notifications
  getNotificationsByUser(userId: number): Promise<Notification[]>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationAsRead(id: number): Promise<boolean>;
  
  // Statistics
  getSocietyStats(societyId: number): Promise<{ memberCount: number; bookCount: number; activeRentals: number }>;
  getUserStats(userId: number): Promise<{ borrowedBooks: number; lentBooks: number; totalEarnings: number }>;
  
  // Admin statistics
  getTotalUsers(): Promise<number>;
  getTotalBooks(): Promise<number>;
  getTotalSocieties(): Promise<number>;
  getActiveRentalsCount(): Promise<number>;
  getSocietyRequests(): Promise<any[]>;
  reviewSocietyRequest(requestId: number, approved: boolean, reason?: string): Promise<void>;
  createReferralReward(data: any): Promise<any>;
  getSocietiesByLocation(city: string): Promise<any[]>;
  createSocietyRequest(data: any): Promise<any>;
  
  // Messaging
  getConversations(userId: number): Promise<any[]>;
  getMessages(userId1: number, userId2: number): Promise<any[]>;
  createMessage(message: any): Promise<any>;
  markMessagesAsRead(userId: number, otherUserId: number): Promise<void>;
  
  // Advanced search
  searchBooksAdvanced(filters: any): Promise<BookWithOwner[]>;
  
  // Extension Requests
  createExtensionRequest(request: InsertExtensionRequest): Promise<ExtensionRequest>;
  getExtensionRequestsByOwner(ownerId: number): Promise<ExtensionRequest[]>;
  getExtensionRequest(requestId: number): Promise<ExtensionRequest | undefined>;
  approveExtensionRequest(requestId: number): Promise<ExtensionRequest>;
  denyExtensionRequest(requestId: number, reason: string): Promise<ExtensionRequest>;
  
  // Rental Extensions
  createRentalExtension(extension: InsertRentalExtension): Promise<RentalExtension>;
  getRentalExtensions(rentalId: number): Promise<RentalExtension[]>;
  updateRentalExtensionPayment(extensionId: number, paymentId: string, status: string): Promise<void>;
  
  // Credits system
  getUserCredits(userId: number): Promise<UserCredits | undefined>;
  createUserCredits(credits: InsertUserCredits): Promise<UserCredits>;
  updateUserCredits(userId: number, balance: number): Promise<void>;
  addCreditTransaction(transaction: InsertCreditTransaction): Promise<CreditTransaction>;
  getCreditTransactions(userId: number): Promise<CreditTransaction[]>;
  
  // Referral system
  createReferral(referral: InsertReferral): Promise<Referral>;
  getReferralsByUser(userId: number): Promise<Referral[]>;
  completeReferral(referralId: number): Promise<Referral>;
  getReferralCount(userId: number): Promise<number>;
  
  // Badges system
  awardBadge(badge: InsertUserBadge): Promise<UserBadge>;
  getUserBadges(userId: number): Promise<UserBadge[]>;
  
  // Commission-free periods
  createCommissionFreePeriod(period: InsertCommissionFreePeriod): Promise<CommissionFreePeriod>;
  getActiveCommissionFreePeriods(userId: number): Promise<CommissionFreePeriod[]>;
  updateCommissionFreePeriod(periodId: number, daysRemaining: number): Promise<void>;
  
  // Reward settings
  getRewardSetting(key: string): Promise<RewardSetting | undefined>;
  updateRewardSetting(key: string, value: string): Promise<void>;
  getAllRewardSettings(): Promise<RewardSetting[]>;
  
  // User credits
  getUserCredits(userId: number): Promise<{ balance: number; totalEarned: number } | null>;
  getUserRecentRewards(userId: number): Promise<any[]>;
  awardCredits(userId: number, credits: number, reason: string): Promise<void>;
  deductCredits(userId: number, credits: number, reason: string): Promise<boolean>;
  getBrocksLeaderboard(limit?: number): Promise<Array<{rank: number, userId: number, name: string, credits: number, totalEarned: number}>>;
  
  // Referral methods
  getUserByReferralCode(referralCode: string): Promise<User | undefined>;
  
  // Brocks Packages Management
  getAllBrocksPackages(): Promise<BrocksPackage[]>;
  createBrocksPackage(packageData: InsertBrocksPackage): Promise<BrocksPackage | null>;
  updateBrocksPackage(id: number, packageData: Partial<InsertBrocksPackage>): Promise<BrocksPackage | null>;
  deleteBrocksPackage(id: number): Promise<boolean>;
  setPackagePopular(id: number, popular: boolean): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.email, email));
      return user || undefined;
    } catch (error) {
      console.error("Error in getUserByEmail:", error);
      return undefined;
    }
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    // Generate unique user number
    const userNumber = await this.generateUniqueUserNumber();
    
    const [user] = await db
      .insert(users)
      .values({
        ...insertUser,
        userNumber,
        isAdmin: insertUser.email === 'abhay.maheshwari0812@gmail.com'
      })
      .returning();
    return user;
  }

  async generateUniqueUserNumber(): Promise<number> {
    // Get the highest user number and add 1
    const [result] = await db
      .select({ maxNumber: sql<number>`COALESCE(MAX(${users.userNumber}), 0)` })
      .from(users);
    
    return (result?.maxNumber || 0) + 1;
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async getSociety(id: number): Promise<Society | undefined> {
    const [society] = await db.select().from(societies).where(eq(societies.id, id));
    return society || undefined;
  }

  async getSocietyByCode(code: string): Promise<Society | undefined> {
    const [society] = await db.select().from(societies).where(eq(societies.code, code));
    return society || undefined;
  }

  async getSocietiesByUser(userId: number): Promise<SocietyWithStats[]> {
    const userSocieties = await db
      .select({
        id: societies.id,
        name: societies.name,
        code: societies.code,
        description: societies.description,
        city: societies.city,
        apartmentCount: societies.apartmentCount,
        location: societies.location,
        createdBy: societies.createdBy,
        status: societies.status,
        createdAt: societies.createdAt,
      })
      .from(societies)
      .innerJoin(societyMembers, eq(societies.id, societyMembers.societyId))
      .where(and(eq(societyMembers.userId, userId), eq(societyMembers.isActive, true)));
    
    // Calculate dynamic stats for each society
    const societiesWithStats = await Promise.all(
      userSocieties.map(async (society) => {
        const [memberCount] = await db
          .select({ count: sql<number>`count(*)` })
          .from(societyMembers)
          .where(and(eq(societyMembers.societyId, society.id), eq(societyMembers.isActive, true)));

        const [bookCount] = await db
          .select({ count: sql<number>`count(*)` })
          .from(books)
          .where(eq(books.societyId, society.id));

        return {
          ...society,
          memberCount: memberCount?.count || 0,
          bookCount: bookCount?.count || 0,
          isJoined: true
        };
      })
    );
    
    return societiesWithStats;
  }

  async getAvailableSocieties(userId: number): Promise<SocietyWithStats[]> {
    // Get all societies
    const allSocieties = await db.select().from(societies);
    
    // Get societies user is actively part of
    const joinedSocieties = await db
      .select({ societyId: societyMembers.societyId })
      .from(societyMembers)
      .where(and(eq(societyMembers.userId, userId), eq(societyMembers.isActive, true)));
    
    const joinedIds = joinedSocieties.map(s => s.societyId);
    
    // Filter out joined societies
    const available = allSocieties.filter(society => !joinedIds.includes(society.id));
    
    return available.map(society => ({
      ...society,
      memberCount: society.memberCount,
      bookCount: society.bookCount,
      isJoined: false
    }));
  }

  async createSociety(societyData: any): Promise<Society> {
    const [society] = await db
      .insert(societies)
      .values(societyData)
      .returning();
    return society;
  }

  async joinSociety(societyId: number, userId: number): Promise<SocietyMember> {
    const [member] = await db
      .insert(societyMembers)
      .values({ societyId, userId })
      .returning();
    return member;
  }

  async leaveSociety(societyId: number, userId: number): Promise<boolean> {
    console.log("🔄 Leaving society:", { societyId, userId });
    
    const result = await db
      .update(societyMembers)
      .set({ isActive: false })
      .where(and(
        eq(societyMembers.societyId, societyId),
        eq(societyMembers.userId, userId)
      ));
    
    console.log("✅ Leave result:", result);
    return true;
  }

  async isMemberOfSociety(societyId: number, userId: number): Promise<boolean> {
    const [member] = await db
      .select()
      .from(societyMembers)
      .where(and(
        eq(societyMembers.societyId, societyId), 
        eq(societyMembers.userId, userId),
        eq(societyMembers.isActive, true)
      ));
    return !!member;
  }

  async getBook(id: number): Promise<BookWithOwner | undefined> {
    const [result] = await db
      .select({
        id: books.id,
        title: books.title,
        author: books.author,
        isbn: books.isbn,
        genre: books.genre,
        condition: books.condition,
        dailyFee: books.dailyFee,
        description: books.description,
        imageUrl: books.imageUrl,
        coverImageUrl: books.coverImageUrl,
        isAvailable: books.isAvailable,
        ownerId: books.ownerId,
        societyId: books.societyId,
        createdAt: books.createdAt,
        owner: {
          id: users.id,
          name: users.name
        }
      })
      .from(books)
      .innerJoin(users, eq(books.ownerId, users.id))
      .where(eq(books.id, id));
    
    return result || undefined;
  }

  async getBooksBySociety(societyId: number): Promise<BookWithOwner[]> {
    const results = await db
      .select({
        id: books.id,
        title: books.title,
        author: books.author,
        isbn: books.isbn,
        genre: books.genre,
        imageUrl: books.imageUrl,
        coverImageUrl: books.coverImageUrl,
        condition: books.condition,
        dailyFee: books.dailyFee,
        description: books.description,
        isAvailable: books.isAvailable,
        ownerId: books.ownerId,
        societyId: books.societyId,
        createdAt: books.createdAt,
        owner: {
          id: users.id,
          name: users.name
        }
      })
      .from(books)
      .innerJoin(users, eq(books.ownerId, users.id))
      .where(eq(books.societyId, societyId));
    
    return results;
  }

  async getBooksByOwner(ownerId: number): Promise<Book[]> {
    return await db.select().from(books).where(eq(books.ownerId, ownerId));
  }

  async searchBooks(societyId: number, query?: string, genre?: string): Promise<BookWithOwner[]> {
    let whereConditions = [eq(books.societyId, societyId)];
    
    if (query) {
      whereConditions.push(
        or(
          ilike(books.title, `%${query}%`),
          ilike(books.author, `%${query}%`)
        )!
      );
    }
    
    if (genre) {
      whereConditions.push(eq(books.genre, genre));
    }
    
    const results = await db
      .select({
        id: books.id,
        title: books.title,
        author: books.author,
        isbn: books.isbn,
        genre: books.genre,
        imageUrl: books.imageUrl,
        coverImageUrl: books.coverImageUrl,
        condition: books.condition,
        dailyFee: books.dailyFee,
        description: books.description,
        isAvailable: books.isAvailable,
        ownerId: books.ownerId,
        societyId: books.societyId,
        createdAt: books.createdAt,
        owner: {
          id: users.id,
          name: users.name
        }
      })
      .from(books)
      .innerJoin(users, eq(books.ownerId, users.id))
      .where(and(...whereConditions));
    
    return results;
  }

  async createBook(insertBook: InsertBook): Promise<Book> {
    const [book] = await db
      .insert(books)
      .values(insertBook)
      .returning();
    return book;
  }

  async updateBook(id: number, updates: Partial<Book>): Promise<Book | undefined> {
    const [book] = await db
      .update(books)
      .set(updates)
      .where(eq(books.id, id))
      .returning();
    return book || undefined;
  }

  async deleteBook(id: number): Promise<boolean> {
    try {
      await db.delete(books).where(eq(books.id, id));
      console.log(`📚 Book ${id} deleted successfully`);
      return true;
    } catch (error) {
      console.error("Error deleting book:", error);
      return false;
    }
  }

  async getRental(id: number): Promise<RentalWithDetails | undefined> {
    try {
      const result = await db
        .select({
          rentalId: bookRentals.id,
          bookId: bookRentals.bookId,
          borrowerId: bookRentals.borrowerId,
          lenderId: bookRentals.lenderId,
          societyId: bookRentals.societyId,
          startDate: bookRentals.startDate,
          endDate: bookRentals.endDate,
          actualReturnDate: bookRentals.actualReturnDate,
          status: bookRentals.status,
          paymentStatus: bookRentals.paymentStatus,
          totalAmount: bookRentals.totalAmount,
          lenderAmount: bookRentals.lenderAmount,
          platformFee: bookRentals.platformFee,
          securityDeposit: bookRentals.securityDeposit,
          rentalCreatedAt: bookRentals.createdAt,
          // Book info
          bookTitle: books.title,
          bookAuthor: books.author,
          bookIsbn: books.isbn,
          bookGenre: books.genre,
          bookImageUrl: books.imageUrl,
          bookCondition: books.condition,
          bookDailyFee: books.dailyFee,
          bookDescription: books.description,
          bookIsAvailable: books.isAvailable,
          bookOwnerId: books.ownerId,
          bookSocietyId: books.societyId,
          bookCreatedAt: books.createdAt,
          // Borrower info
          borrowerName: sql<string>`borrower.name`.as('borrowerName'),
          // Lender info
          lenderName: sql<string>`lender.name`.as('lenderName')
        })
        .from(bookRentals)
        .innerJoin(books, eq(bookRentals.bookId, books.id))
        .innerJoin(sql`${users} as borrower`, sql`${bookRentals.borrowerId} = borrower.id`)
        .innerJoin(sql`${users} as lender`, sql`${bookRentals.lenderId} = lender.id`)
        .where(eq(bookRentals.id, id))
        .limit(1);

      if (result.length === 0) return undefined;

      const row = result[0];
      return {
        id: row.rentalId,
        bookId: row.bookId,
        borrowerId: row.borrowerId,
        lenderId: row.lenderId,
        societyId: row.societyId,
        startDate: row.startDate,
        endDate: row.endDate,
        actualReturnDate: row.actualReturnDate,
        status: row.status,
        paymentStatus: row.paymentStatus,
        totalAmount: row.totalAmount,
        lenderAmount: row.lenderAmount,
        platformFee: row.platformFee,
        securityDeposit: row.securityDeposit,
        paymentId: null,
        createdAt: row.rentalCreatedAt,
        book: {
          id: row.bookId,
          title: row.bookTitle,
          author: row.bookAuthor,
          isbn: row.bookIsbn,
          genre: row.bookGenre,
          imageUrl: row.bookImageUrl,
          condition: row.bookCondition,
          dailyFee: row.bookDailyFee,
          description: row.bookDescription,
          isAvailable: row.bookIsAvailable,
          ownerId: row.bookOwnerId,
          societyId: row.bookSocietyId,
          createdAt: row.bookCreatedAt
        },
        borrower: { id: row.borrowerId, name: row.borrowerName },
        lender: { id: row.lenderId, name: row.lenderName }
      } as RentalWithDetails;
    } catch (error) {
      console.error('Error fetching rental:', error);
      return undefined;
    }
  }

  async getRentalsByBorrower(borrowerId: number): Promise<RentalWithDetails[]> {
    try {
      console.log('🔍 DatabaseStorage: Fetching borrowed books for user:', borrowerId);
      
      // First, let's check if there are any rentals at all
      const allRentals = await db.select().from(bookRentals);
      console.log('📊 Total rentals in database:', allRentals.length);
      
      const userRentals = allRentals.filter(r => r.borrowerId === borrowerId);
      console.log('📊 User rentals found:', userRentals.length);
      
      if (userRentals.length === 0) {
        console.log('❌ No rentals found for user', borrowerId);
        return [];
      }
      
      const results = await db
        .select({
          // Rental details with explicit column names
          rentalId: bookRentals.id,
          bookId: bookRentals.bookId,
          borrowerId: bookRentals.borrowerId,
          lenderId: bookRentals.lenderId,
          startDate: bookRentals.startDate,
          endDate: bookRentals.endDate,
          actualReturnDate: bookRentals.actualReturnDate,
          status: bookRentals.status,
          paymentStatus: bookRentals.paymentStatus,
          totalAmount: bookRentals.totalAmount,
          lenderAmount: bookRentals.lenderAmount,
          platformFee: bookRentals.platformFee,
          securityDeposit: bookRentals.securityDeposit,
          rentalCreatedAt: bookRentals.createdAt,
          // Book details
          bookTitle: books.title,
          bookAuthor: books.author,
          bookGenre: books.genre,
          bookCondition: books.condition,
          bookDailyFee: books.dailyFee,
          bookDescription: books.description,
          bookIsAvailable: books.isAvailable,
          bookOwnerId: books.ownerId,
          bookSocietyId: books.societyId,
          bookImageUrl: books.imageUrl,
          bookIsbn: books.isbn,
          bookCreatedAt: books.createdAt,
          // Lender details
          lenderName: users.name
        })
        .from(bookRentals)
        .innerJoin(books, eq(bookRentals.bookId, books.id))
        .innerJoin(users, eq(bookRentals.lenderId, users.id))
        .where(and(
          eq(bookRentals.borrowerId, borrowerId),
          ne(bookRentals.status, 'returned')
        ))
        .orderBy(desc(bookRentals.createdAt));
      
      console.log('📚 DatabaseStorage: Found borrowed books after join:', results.length);
      if (results.length > 0) {
        console.log('📖 DatabaseStorage: Sample book:', results[0].bookTitle);
      }
      
      // Transform the flat result into the expected structure
      return results.map(row => ({
        id: row.rentalId,
        bookId: row.bookId,
        borrowerId: row.borrowerId,
        lenderId: row.lenderId,
        societyId: row.bookSocietyId,
        startDate: row.startDate,
        endDate: row.endDate,
        actualReturnDate: row.actualReturnDate,
        status: row.status,
        paymentStatus: row.paymentStatus,
        totalAmount: row.totalAmount,
        lenderAmount: row.lenderAmount,
        platformFee: row.platformFee,
        securityDeposit: row.securityDeposit,
        paymentId: null,
        createdAt: row.rentalCreatedAt,
        book: {
          id: row.bookId,
          title: row.bookTitle,
          author: row.bookAuthor,
          isbn: row.bookIsbn,
          genre: row.bookGenre,
          imageUrl: row.bookImageUrl,
          condition: row.bookCondition,
          dailyFee: row.bookDailyFee,
          description: row.bookDescription,
          isAvailable: row.bookIsAvailable,
          ownerId: row.bookOwnerId,
          societyId: row.bookSocietyId,
          createdAt: row.bookCreatedAt
        },
        borrower: { id: borrowerId, name: 'You' },
        lender: { id: row.lenderId, name: row.lenderName }
      })) as RentalWithDetails[];
    } catch (error) {
      console.error('❌ DatabaseStorage: Error fetching borrowed books:', error);
      throw error;
    }
  }

  async getRentalsByLender(lenderId: number): Promise<RentalWithDetails[]> {
    try {
      console.log('🔍 Fetching lent books for user:', lenderId);
      
      const results = await db
        .select({
          // Rental details with explicit column names
          rentalId: bookRentals.id,
          bookId: bookRentals.bookId,
          borrowerId: bookRentals.borrowerId,
          lenderId: bookRentals.lenderId,
          startDate: bookRentals.startDate,
          endDate: bookRentals.endDate,
          actualReturnDate: bookRentals.actualReturnDate,
          status: bookRentals.status,
          paymentStatus: bookRentals.paymentStatus,
          totalAmount: bookRentals.totalAmount,
          lenderAmount: bookRentals.lenderAmount,
          platformFee: bookRentals.platformFee,
          securityDeposit: bookRentals.securityDeposit,
          rentalCreatedAt: bookRentals.createdAt,
          // Book details
          bookTitle: books.title,
          bookAuthor: books.author,
          bookGenre: books.genre,
          bookCondition: books.condition,
          bookDailyFee: books.dailyFee,
          bookDescription: books.description,
          bookIsAvailable: books.isAvailable,
          bookOwnerId: books.ownerId,
          bookSocietyId: books.societyId,
          bookImageUrl: books.imageUrl,
          bookIsbn: books.isbn,
          bookCreatedAt: books.createdAt,
          // Borrower details
          borrowerName: users.name
        })
        .from(bookRentals)
        .innerJoin(books, eq(bookRentals.bookId, books.id))
        .innerJoin(users, eq(bookRentals.borrowerId, users.id))
        .where(and(
          eq(bookRentals.lenderId, lenderId),
          ne(bookRentals.status, 'returned')
        ))
        .orderBy(desc(bookRentals.createdAt));
      
      console.log('📚 Found lent books:', results.length);
      if (results.length > 0) {
        console.log('📖 Sample book:', results[0].bookTitle);
      }
      
      // Transform the flat result into the expected structure
      return results.map(row => ({
        id: row.rentalId,
        bookId: row.bookId,
        borrowerId: row.borrowerId,
        lenderId: row.lenderId,
        societyId: row.bookSocietyId,
        startDate: row.startDate,
        endDate: row.endDate,
        actualReturnDate: row.actualReturnDate,
        status: row.status,
        paymentStatus: row.paymentStatus,
        totalAmount: row.totalAmount,
        lenderAmount: row.lenderAmount,
        platformFee: row.platformFee,
        securityDeposit: row.securityDeposit,
        paymentId: null,
        createdAt: row.rentalCreatedAt,
        book: {
          id: row.bookId,
          title: row.bookTitle,
          author: row.bookAuthor,
          isbn: row.bookIsbn,
          genre: row.bookGenre,
          imageUrl: row.bookImageUrl,
          condition: row.bookCondition,
          dailyFee: row.bookDailyFee,
          description: row.bookDescription,
          isAvailable: row.bookIsAvailable,
          ownerId: row.bookOwnerId,
          societyId: row.bookSocietyId,
          createdAt: row.bookCreatedAt
        },
        borrower: { id: row.borrowerId, name: row.borrowerName },
        lender: { id: lenderId, name: 'You' }
      })) as RentalWithDetails[];
    } catch (error) {
      console.error('❌ Error fetching lent books:', error);
      return [];
    }
  }

  async getActiveRentals(userId: number): Promise<RentalWithDetails[]> {
    // For now, return empty array as rental queries need complex joins
    // This will be implemented when rental functionality is fully needed
    return [];
  }

  async createRental(insertRental: InsertBookRental): Promise<BookRental> {
    const [rental] = await db
      .insert(bookRentals)
      .values(insertRental)
      .returning();
    return rental;
  }

  async updateRental(id: number, updates: Partial<BookRental>): Promise<BookRental | undefined> {
    const [rental] = await db
      .update(bookRentals)
      .set(updates)
      .where(eq(bookRentals.id, id))
      .returning();
    return rental || undefined;
  }

  async getNotificationsByUser(userId: number): Promise<Notification[]> {
    return await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));
  }

  async createNotification(insertNotification: InsertNotification): Promise<Notification> {
    const [notification] = await db
      .insert(notifications)
      .values(insertNotification)
      .returning();
    return notification;
  }

  async markNotificationAsRead(id: number): Promise<boolean> {
    const [notification] = await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.id, id))
      .returning();
    return !!notification;
  }

  async getSocietyStats(societyId: number): Promise<{ memberCount: number; bookCount: number; activeRentals: number }> {
    const [memberCount] = await db
      .select({ count: count() })
      .from(societyMembers)
      .where(eq(societyMembers.societyId, societyId));
    
    const [bookCount] = await db
      .select({ count: count() })
      .from(books)
      .where(eq(books.societyId, societyId));
    
    const [activeRentals] = await db
      .select({ count: count() })
      .from(bookRentals)
      .innerJoin(books, eq(bookRentals.bookId, books.id))
      .where(
        and(
          eq(books.societyId, societyId),
          eq(bookRentals.status, 'active')
        )
      );
    
    return {
      memberCount: memberCount.count,
      bookCount: bookCount.count,
      activeRentals: activeRentals.count
    };
  }

  async getUserStats(userId: number): Promise<{ borrowedBooks: number; lentBooks: number; totalEarnings: number }> {
    // Count only active borrowed books
    const [borrowedBooks] = await db
      .select({ count: count() })
      .from(bookRentals)
      .where(and(
        eq(bookRentals.borrowerId, userId),
        or(
          eq(bookRentals.status, 'active'),
          eq(bookRentals.status, 'pending'),
          eq(bookRentals.status, 'overdue'),
          eq(bookRentals.status, 'return_requested')
        )
      ));
    
    // Count only active lent books
    const [lentBooks] = await db
      .select({ count: count() })
      .from(bookRentals)
      .where(and(
        eq(bookRentals.lenderId, userId),
        or(
          eq(bookRentals.status, 'active'),
          eq(bookRentals.status, 'pending'),
          eq(bookRentals.status, 'overdue'),
          eq(bookRentals.status, 'return_requested')
        )
      ));
    
    // Calculate total earnings from completed rentals
    const earningsResult = await db
      .select({ 
        totalEarnings: sql<string>`COALESCE(SUM(CAST(${bookRentals.lenderAmount} AS DECIMAL)), 0)` 
      })
      .from(bookRentals)
      .where(and(
        eq(bookRentals.lenderId, userId),
        eq(bookRentals.status, 'returned')
      ));

    // Calculate total earnings from extensions
    const extensionEarningsResult = await db
      .select({ 
        extensionEarnings: sql<string>`COALESCE(SUM(CAST(${rentalExtensions.lenderEarnings} AS DECIMAL)), 0)` 
      })
      .from(rentalExtensions)
      .where(and(
        eq(rentalExtensions.lenderId, userId),
        eq(rentalExtensions.paymentStatus, 'completed')
      ));
    
    const totalEarnings = parseFloat(earningsResult[0]?.totalEarnings || '0') + 
                         parseFloat(extensionEarningsResult[0]?.extensionEarnings || '0');
    
    return {
      borrowedBooks: borrowedBooks.count,
      lentBooks: lentBooks.count,
      totalEarnings
    };
  }

  async getTotalUsers(): Promise<number> {
    try {
      const result = await db.select({ count: sql<number>`count(*)` }).from(users);
      return result[0]?.count || 0;
    } catch (error) {
      console.error('Error fetching total users:', error);
      return 0;
    }
  }

  async getTotalBooks(): Promise<number> {
    try {
      const result = await db.select({ count: sql<number>`count(*)` }).from(books);
      return result[0]?.count || 0;
    } catch (error) {
      console.error('Error fetching total books:', error);
      return 0;
    }
  }

  async getTotalSocieties(): Promise<number> {
    try {
      const result = await db.select({ count: sql<number>`count(*)` }).from(societies);
      return result[0]?.count || 0;
    } catch (error) {
      console.error('Error fetching total societies:', error);
      return 0;
    }
  }

  async getActiveRentalsCount(): Promise<number> {
    try {
      const result = await db
        .select({ count: sql<number>`count(*)` })
        .from(bookRentals)
        .where(eq(bookRentals.status, 'active'));
      return result[0]?.count || 0;
    } catch (error) {
      console.error('Error fetching active rentals count:', error);
      return 0;
    }
  }

  async getSocietyRequests(): Promise<any[]> {
    try {
      // Only return pending requests for admin panel
      const requests = await db.select()
        .from(societyRequests)
        .where(eq(societyRequests.status, 'pending'))
        .orderBy(desc(societyRequests.createdAt));
      return requests;
    } catch (error) {
      console.error('Error fetching society requests:', error);
      return [];
    }
  }

  async reviewSocietyRequest(requestId: number, approved: boolean, reason?: string): Promise<void> {
    try {
      console.log('Database Storage: Reviewing society request', { requestId, approved, reason });
      
      // Update the request status
      const updateResult = await db
        .update(societyRequests)
        .set({ 
          status: approved ? 'approved' : 'rejected',
          reviewReason: reason,
          reviewedAt: new Date()
        })
        .where(eq(societyRequests.id, requestId))
        .returning();

      console.log('Database Storage: Updated request status:', updateResult);

      if (approved) {
        const [request] = await db.select().from(societyRequests).where(eq(societyRequests.id, requestId));
        console.log('Database Storage: Found request for society creation:', request);
        
        if (request) {
          // Generate a unique society code
          const generateCode = (name: string) => {
            return name.replace(/[^a-zA-Z0-9]/g, '').substring(0, 6).toUpperCase() + Math.floor(Math.random() * 1000);
          };

          const societyData = {
            name: request.name,
            description: request.description,
            city: request.city,
            apartmentCount: request.apartmentCount,
            location: request.location,
            code: generateCode(request.name),
            status: 'active' as const,
            createdBy: request.requestedBy
          };
          
          console.log('Database Storage: Creating society with data:', societyData);
          const society = await this.createSociety(societyData);
          console.log('Database Storage: Created society:', society);
          
          // Auto-join the creator to the society
          await this.joinSociety(society.id, request.requestedBy);
          console.log('Database Storage: Auto-joined creator to society');
        }
      }
    } catch (error) {
      console.error('Error reviewing society request:', error);
      throw error;
    }
  }

  async createReferralReward(data: any): Promise<any> {
    try {
      const [reward] = await db
        .insert(referralRewards)
        .values({
          ...data,
          createdAt: new Date()
        })
        .returning();
      return reward;
    } catch (error) {
      console.error('Error creating referral reward:', error);
      throw error;
    }
  }

  async getSocietiesByLocation(city: string): Promise<any[]> {
    try {
      const societiesData = await db.select().from(societies).where(eq(societies.city, city));
      return societiesData;
    } catch (error) {
      console.error('Error fetching societies by location:', error);
      return [];
    }
  }

  async createSocietyRequest(data: any): Promise<any> {
    try {
      const [request] = await db
        .insert(societyRequests)
        .values({
          ...data,
          status: 'pending',
          createdAt: new Date()
        })
        .returning();
      return request;
    } catch (error) {
      console.error('Error creating society request:', error);
      throw error;
    }
  }

  async getConversations(userId: number): Promise<any[]> {
    try {
      // This would require a more complex query to get conversations with last message and unread counts
      // For now, return empty array - would need proper implementation
      return [];
    } catch (error) {
      console.error('Error fetching conversations:', error);
      return [];
    }
  }

  async getMessages(userId1: number, userId2: number): Promise<any[]> {
    try {
      // This would require messages table and proper implementation
      // For now, return empty array
      return [];
    } catch (error) {
      console.error('Error fetching messages:', error);
      return [];
    }
  }

  async createMessage(messageData: any): Promise<any> {
    try {
      // This would require messages table implementation
      // For now, return mock response
      return { id: Date.now(), ...messageData, createdAt: new Date() };
    } catch (error) {
      console.error('Error creating message:', error);
      throw error;
    }
  }

  async markMessagesAsRead(userId: number, otherUserId: number): Promise<void> {
    try {
      // This would require messages table implementation
      // For now, do nothing
    } catch (error) {
      console.error('Error marking messages as read:', error);
      throw error;
    }
  }

  async searchBooksAdvanced(filters: any): Promise<BookWithOwner[]> {
    try {
      let query = db
        .select({
          id: books.id,
          title: books.title,
          author: books.author,
          genre: books.genre,
          isbn: books.isbn,
          description: books.description,
          imageUrl: books.imageUrl,
          coverImageUrl: books.coverImageUrl,
          dailyFee: books.dailyFee,
          isAvailable: books.isAvailable,
          condition: books.condition,
          ownerId: books.ownerId,
          societyId: books.societyId,
          createdAt: books.createdAt,
          owner: {
            id: users.id,
            name: users.name,
          },
        })
        .from(books)
        .innerJoin(users, eq(books.ownerId, users.id));

      // Apply society filter
      if (filters.societyIds?.length > 0) {
        query = query.where(
          inArray(books.societyId, filters.societyIds)
        );
      }

      const results = await query;

      // Apply additional filters in memory (for complex filtering)
      let filteredBooks = results;

      // Search filter
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase();
        filteredBooks = filteredBooks.filter(book =>
          book.title.toLowerCase().includes(searchTerm) ||
          book.author.toLowerCase().includes(searchTerm) ||
          book.genre?.toLowerCase().includes(searchTerm) ||
          book.description?.toLowerCase().includes(searchTerm)
        );
      }

      // Genre filter
      if (filters.genres?.length > 0) {
        filteredBooks = filteredBooks.filter(book =>
          book.genre && filters.genres.includes(book.genre)
        );
      }

      // Price filter
      if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
        filteredBooks = filteredBooks.filter(book => {
          const price = parseFloat(book.dailyFee);
          return price >= (filters.minPrice || 0) && price <= (filters.maxPrice || 1000);
        });
      }

      // Condition filter
      if (filters.conditions?.length > 0) {
        filteredBooks = filteredBooks.filter(book =>
          book.condition && filters.conditions.includes(book.condition)
        );
      }

      // Availability filter
      if (filters.availability === 'available') {
        filteredBooks = filteredBooks.filter(book => book.isAvailable);
      } else if (filters.availability === 'rented') {
        filteredBooks = filteredBooks.filter(book => !book.isAvailable);
      }

      // Sort results
      switch (filters.sortBy) {
        case 'oldest':
          filteredBooks.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
          break;
        case 'price_low':
          filteredBooks.sort((a, b) => parseFloat(a.dailyFee) - parseFloat(b.dailyFee));
          break;
        case 'price_high':
          filteredBooks.sort((a, b) => parseFloat(b.dailyFee) - parseFloat(a.dailyFee));
          break;
        case 'newest':
        default:
          filteredBooks.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          break;
      }

      return filteredBooks as BookWithOwner[];
    } catch (error) {
      console.error('Error in advanced search:', error);
      return [];
    }
  }

  // Rental Extension methods
  // Extension Request methods
  async createExtensionRequest(requestData: InsertExtensionRequest): Promise<ExtensionRequest> {
    try {
      const [request] = await db
        .insert(extensionRequests)
        .values(requestData)
        .returning();
      return request;
    } catch (error) {
      console.error('Error creating extension request:', error);
      throw error;
    }
  }

  async getExtensionRequestsByOwner(ownerId: number): Promise<ExtensionRequest[]> {
    try {
      const requests = await db
        .select()
        .from(extensionRequests)
        .where(and(eq(extensionRequests.ownerId, ownerId), eq(extensionRequests.status, 'pending')))
        .orderBy(desc(extensionRequests.createdAt));
      return requests;
    } catch (error) {
      console.error('Error getting extension requests by owner:', error);
      return [];
    }
  }

  async getExtensionRequest(requestId: number): Promise<ExtensionRequest | undefined> {
    try {
      const [request] = await db
        .select()
        .from(extensionRequests)
        .where(eq(extensionRequests.id, requestId));
      return request;
    } catch (error) {
      console.error('Error getting extension request:', error);
      return undefined;
    }
  }

  async approveExtensionRequest(requestId: number): Promise<ExtensionRequest> {
    try {
      const [request] = await db
        .update(extensionRequests)
        .set({ 
          status: 'approved',
          approvedAt: new Date()
        })
        .where(eq(extensionRequests.id, requestId))
        .returning();
      return request;
    } catch (error) {
      console.error('Error approving extension request:', error);
      throw error;
    }
  }

  async denyExtensionRequest(requestId: number, reason: string): Promise<ExtensionRequest> {
    try {
      const [request] = await db
        .update(extensionRequests)
        .set({ 
          status: 'denied',
          reason: reason
        })
        .where(eq(extensionRequests.id, requestId))
        .returning();
      return request;
    } catch (error) {
      console.error('Error denying extension request:', error);
      throw error;
    }
  }

  async updateExtensionRequest(requestId: number, updates: Partial<ExtensionRequest>): Promise<void> {
    try {
      await db
        .update(extensionRequests)
        .set(updates)
        .where(eq(extensionRequests.id, requestId));
    } catch (error) {
      console.error('Error updating extension request:', error);
      throw error;
    }
  }

  async createRentalExtension(extensionData: InsertRentalExtension): Promise<RentalExtension> {
    try {
      const [extension] = await db
        .insert(rentalExtensions)
        .values(extensionData)
        .returning();
      return extension;
    } catch (error) {
      console.error('Error creating rental extension:', error);
      throw error;
    }
  }

  async getRentalExtensions(rentalId: number): Promise<RentalExtension[]> {
    try {
      const extensions = await db
        .select()
        .from(rentalExtensions)
        .where(eq(rentalExtensions.rentalId, rentalId))
        .orderBy(desc(rentalExtensions.createdAt));
      return extensions;
    } catch (error) {
      console.error('Error getting rental extensions:', error);
      return [];
    }
  }

  async updateRentalExtensionPayment(requestId: number, paymentId: string, status: string): Promise<void> {
    try {
      // Update the extension request with payment information
      await db
        .update(extensionRequests)
        .set({ 
          paymentId: paymentId,
        })
        .where(eq(extensionRequests.id, requestId));
      
      console.log(`Updated extension request ${requestId} with payment ${paymentId}`);
    } catch (error) {
      console.error('Error updating extension request payment:', error);
      throw error;
    }
  }

  // Credits system methods
  async getUserCredits(userId: number): Promise<UserCredits | undefined> {
    try {
      const [credits] = await db.select().from(userCredits).where(eq(userCredits.userId, userId));
      return credits;
    } catch (error) {
      console.error('Error fetching user credits:', error);
      throw error;
    }
  }

  async createUserCredits(credits: InsertUserCredits): Promise<UserCredits> {
    try {
      const [newCredits] = await db
        .insert(userCredits)
        .values(credits)
        .returning();
      return newCredits;
    } catch (error) {
      console.error('Error creating user credits:', error);
      throw error;
    }
  }

  async updateUserCredits(userId: number, balance: number): Promise<void> {
    try {
      await db
        .update(userCredits)
        .set({ 
          balance,
          updatedAt: new Date()
        })
        .where(eq(userCredits.userId, userId));
    } catch (error) {
      console.error('Error updating user credits:', error);
      throw error;
    }
  }

  async addCreditTransaction(transaction: InsertCreditTransaction): Promise<CreditTransaction> {
    try {
      const [newTransaction] = await db
        .insert(creditTransactions)
        .values(transaction)
        .returning();
      return newTransaction;
    } catch (error) {
      console.error('Error adding credit transaction:', error);
      throw error;
    }
  }

  async getCreditTransactions(userId: number): Promise<CreditTransaction[]> {
    try {
      return await db
        .select()
        .from(creditTransactions)
        .where(eq(creditTransactions.userId, userId))
        .orderBy(desc(creditTransactions.createdAt));
    } catch (error) {
      console.error('Error fetching credit transactions:', error);
      throw error;
    }
  }

  // Referral system methods
  async createReferral(referral: InsertReferral): Promise<Referral> {
    try {
      const [newReferral] = await db
        .insert(referrals)
        .values(referral)
        .returning();
      return newReferral;
    } catch (error) {
      console.error('Error creating referral:', error);
      throw error;
    }
  }

  async getReferralsByUser(userId: number): Promise<Referral[]> {
    try {
      return await db
        .select()
        .from(referrals)
        .where(eq(referrals.referrerId, userId))
        .orderBy(desc(referrals.createdAt));
    } catch (error) {
      console.error('Error fetching referrals:', error);
      throw error;
    }
  }

  async completeReferral(referralId: number): Promise<Referral> {
    try {
      const [updatedReferral] = await db
        .update(referrals)
        .set({ 
          status: 'completed',
          completedAt: new Date()
        })
        .where(eq(referrals.id, referralId))
        .returning();
      return updatedReferral;
    } catch (error) {
      console.error('Error completing referral:', error);
      throw error;
    }
  }

  async getReferralCount(userId: number): Promise<number> {
    try {
      const result = await db
        .select({ count: count() })
        .from(referrals)
        .where(and(
          eq(referrals.referrerId, userId),
          eq(referrals.status, 'completed')
        ));
      return result[0]?.count || 0;
    } catch (error) {
      console.error('Error fetching referral count:', error);
      throw error;
    }
  }

  // Badges system methods
  async awardBadge(badge: InsertUserBadge): Promise<UserBadge> {
    try {
      const [newBadge] = await db
        .insert(userBadges)
        .values(badge)
        .returning();
      return newBadge;
    } catch (error) {
      console.error('Error awarding badge:', error);
      throw error;
    }
  }

  async getUserBadges(userId: number): Promise<UserBadge[]> {
    try {
      return await db
        .select()
        .from(userBadges)
        .where(eq(userBadges.userId, userId))
        .orderBy(desc(userBadges.earnedAt));
    } catch (error) {
      console.error('Error fetching user badges:', error);
      throw error;
    }
  }

  // Commission-free periods methods
  async createCommissionFreePeriod(period: InsertCommissionFreePeriod): Promise<CommissionFreePeriod> {
    try {
      const [newPeriod] = await db
        .insert(commissionFreePeriods)
        .values(period)
        .returning();
      return newPeriod;
    } catch (error) {
      console.error('Error creating commission-free period:', error);
      throw error;
    }
  }

  async getActiveCommissionFreePeriods(userId: number): Promise<CommissionFreePeriod[]> {
    try {
      return await db
        .select()
        .from(commissionFreePeriods)
        .where(and(
          eq(commissionFreePeriods.userId, userId),
          eq(commissionFreePeriods.isActive, true)
        ))
        .orderBy(desc(commissionFreePeriods.endDate));
    } catch (error) {
      console.error('Error fetching active commission-free periods:', error);
      throw error;
    }
  }

  async updateCommissionFreePeriod(periodId: number, daysRemaining: number): Promise<void> {
    try {
      await db
        .update(commissionFreePeriods)
        .set({ daysRemaining })
        .where(eq(commissionFreePeriods.id, periodId));
    } catch (error) {
      console.error('Error updating commission-free period:', error);
      throw error;
    }
  }

  // Reward settings methods
  async getRewardSetting(key: string): Promise<RewardSetting | undefined> {
    try {
      const [setting] = await db
        .select()
        .from(rewardSettings)
        .where(eq(rewardSettings.settingKey, key));
      return setting;
    } catch (error) {
      console.error('Error fetching reward setting:', error);
      throw error;
    }
  }

  async updateRewardSetting(key: string, value: string): Promise<void> {
    try {
      // First try to update existing setting
      const existing = await db
        .select()
        .from(rewardSettings)
        .where(eq(rewardSettings.settingKey, key));
      
      if (existing.length > 0) {
        await db
          .update(rewardSettings)
          .set({ 
            settingValue: value,
            updatedAt: new Date()
          })
          .where(eq(rewardSettings.settingKey, key));
      } else {
        // Insert new setting if it doesn't exist
        await db
          .insert(rewardSettings)
          .values({
            settingKey: key,
            settingValue: value,
            createdAt: new Date(),
            updatedAt: new Date()
          });
      }
    } catch (error) {
      console.error('Error updating reward setting:', error);
      throw error;
    }
  }

  async getAllRewardSettings(): Promise<RewardSetting[]> {
    try {
      return await db
        .select()
        .from(rewardSettings)
        .orderBy(rewardSettings.settingKey);
    } catch (error) {
      console.error('Error fetching all reward settings:', error);
      throw error;
    }
  }

  async getUserCredits(userId: number): Promise<{ balance: number; totalEarned: number } | null> {
    try {
      const [result] = await db
        .select()
        .from(userCredits)
        .where(eq(userCredits.userId, userId));
      
      if (!result) {
        // Return default credits for new users
        return { balance: 0, totalEarned: 0 };
      }
      
      // Parse balance and totalEarned correctly
      const balance = result.balance ? parseInt(result.balance.toString()) : 0;
      const totalEarned = result.totalEarned ? parseInt(result.totalEarned.toString()) : 0;
      
      console.log(`📊 getUserCredits for user ${userId}: balance=${balance}, totalEarned=${totalEarned}`);
      
      return { balance, totalEarned };
    } catch (error) {
      console.error('Error fetching user credits:', error);
      return { balance: 0, totalEarned: 0 };
    }
  }

  async getUserRecentRewards(userId: number): Promise<any[]> {
    try {
      // For now, return empty array as we need to implement the rewards tracking
      // This would eventually query a rewards history table
      return [];
    } catch (error) {
      console.error('Error fetching user recent rewards:', error);
      return [];
    }
  }

  async awardCredits(userId: number, credits: number, reason: string): Promise<void> {
    try {
      // Get current credits or create new record
      const [existingCredits] = await db
        .select()
        .from(userCredits)
        .where(eq(userCredits.userId, userId));

      if (existingCredits) {
        // Update existing record with correct column names
        const currentBalance = existingCredits.balance ? parseFloat(existingCredits.balance.toString()) : 0;
        const totalEarned = existingCredits.totalEarned ? parseFloat(existingCredits.totalEarned.toString()) : 0;
        
        await db
          .update(userCredits)
          .set({
            balance: (currentBalance + credits).toString(),
            totalEarned: (totalEarned + credits).toString(),
            updatedAt: new Date()
          })
          .where(eq(userCredits.userId, userId));
      } else {
        // Create new record
        await db
          .insert(userCredits)
          .values({
            userId,
            balance: credits.toString(),
            totalEarned: credits.toString(),
            createdAt: new Date(),
            updatedAt: new Date()
          });
      }

      console.log(`🎁 Awarded ${credits} Brocks credits to user ${userId} for: ${reason}`);
    } catch (error) {
      console.error('Error awarding credits:', error);
      throw error;
    }
  }

  async deductCredits(userId: number, credits: number, reason: string): Promise<boolean> {
    try {
      const [existingCredits] = await db
        .select()
        .from(userCredits)
        .where(eq(userCredits.userId, userId));

      if (!existingCredits) {
        console.log(`❌ No credits record found for user ${userId}`);
        return false; // User has no credits
      }

      // Use the correct column name 'balance' instead of 'currentBalance'
      const currentBalance = existingCredits.balance ? parseInt(existingCredits.balance.toString()) : 0;
      
      console.log(`💰 Current balance: ${currentBalance}, trying to deduct: ${credits}`);
      
      if (currentBalance < credits) {
        console.log(`❌ Insufficient credits for user ${userId}: has ${currentBalance}, needs ${credits}`);
        return false; // Insufficient credits
      }

      // Update using the correct column name
      await db
        .update(userCredits)
        .set({
          balance: currentBalance - credits,
          totalSpent: sql`${userCredits.totalSpent} + ${credits}`,
          updatedAt: new Date()
        })
        .where(eq(userCredits.userId, userId));

      console.log(`💸 Successfully deducted ${credits} Brocks credits from user ${userId} for: ${reason}`);
      return true;
    } catch (error) {
      console.error('Error deducting credits:', error);
      return false;
    }
  }

  async getBrocksLeaderboard(limit: number = 50): Promise<Array<{rank: number, userId: number, name: string, credits: number, totalEarned: number}>> {
    try {
      const leaderboardData = await db
        .select({
          userId: userCredits.userId,
          name: users.name,
          credits: userCredits.balance,
          totalEarned: userCredits.totalEarned,
        })
        .from(userCredits)
        .innerJoin(users, eq(userCredits.userId, users.id))
        .orderBy(desc(userCredits.balance))
        .limit(limit);

      // Add ranking
      const leaderboard = leaderboardData.map((entry, index) => ({
        rank: index + 1,
        userId: entry.userId,
        name: entry.name || 'Unknown User',
        credits: parseInt(entry.credits?.toString() || '0'),
        totalEarned: parseInt(entry.totalEarned?.toString() || '0'),
      }));

      console.log(`🏆 Brocks leaderboard fetched: ${leaderboard.length} users`);
      return leaderboard;
    } catch (error) {
      console.error('Error fetching Brocks leaderboard:', error);
      return [];
    }
  }

  async getUserByReferralCode(referralCode: string): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.referralCode, referralCode));
      return user || undefined;
    } catch (error) {
      console.error('Error finding user by referral code:', error);
      return undefined;
    }
  }

  // Brocks Packages Management
  async getAllBrocksPackages(): Promise<BrocksPackage[]> {
    try {
      const packages = await db.select().from(brocksPackages)
        .where(eq(brocksPackages.isActive, true))
        .orderBy(brocksPackages.id);
      console.log(`📦 Fetched ${packages.length} active Brocks packages`);
      return packages;
    } catch (error) {
      console.error('Error fetching Brocks packages:', error);
      return [];
    }
  }

  async createBrocksPackage(packageData: InsertBrocksPackage): Promise<BrocksPackage | null> {
    try {
      const [newPackage] = await db
        .insert(brocksPackages)
        .values({
          ...packageData,
          price: packageData.price.toString(),
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();
      console.log(`📦 Created new Brocks package: ${newPackage.name}`);
      return newPackage;
    } catch (error) {
      console.error('Error creating Brocks package:', error);
      return null;
    }
  }

  async updateBrocksPackage(id: number, packageData: Partial<InsertBrocksPackage>): Promise<BrocksPackage | null> {
    try {
      const updateData: any = {
        ...packageData,
        updatedAt: new Date(),
      };
      
      // Convert price to string if provided
      if (packageData.price !== undefined) {
        updateData.price = packageData.price.toString();
      }

      const [updatedPackage] = await db
        .update(brocksPackages)
        .set(updateData)
        .where(eq(brocksPackages.id, id))
        .returning();
      
      if (updatedPackage) {
        console.log(`📦 Updated Brocks package: ${updatedPackage.name}`);
        return updatedPackage;
      }
      return null;
    } catch (error) {
      console.error('Error updating Brocks package:', error);
      return null;
    }
  }

  async deleteBrocksPackage(id: number): Promise<boolean> {
    try {
      // Soft delete by setting isActive to false
      const [deletedPackage] = await db
        .update(brocksPackages)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(brocksPackages.id, id))
        .returning();
      
      if (deletedPackage) {
        console.log(`📦 Deleted Brocks package: ${deletedPackage.name}`);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error deleting Brocks package:', error);
      return false;
    }
  }

  async setPackagePopular(id: number, popular: boolean): Promise<boolean> {
    try {
      // First, if setting to popular, remove popular flag from other packages
      if (popular) {
        await db
          .update(brocksPackages)
          .set({ popular: false, updatedAt: new Date() })
          .where(eq(brocksPackages.popular, true));
      }

      const [updatedPackage] = await db
        .update(brocksPackages)
        .set({ popular, updatedAt: new Date() })
        .where(eq(brocksPackages.id, id))
        .returning();
      
      if (updatedPackage) {
        console.log(`📦 Set package ${updatedPackage.name} popular status to: ${popular}`);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error setting package popular status:', error);
      return false;
    }
  }
}

export class MemStorage implements IStorage {
  private users: Map<number, User> = new Map();
  private societies: Map<number, Society> = new Map();
  private books: Map<number, Book> = new Map();
  private bookRentals: Map<number, BookRental> = new Map();
  private societyMembers: Map<number, SocietyMember> = new Map();
  private notifications: Map<number, Notification> = new Map();
  
  private currentUserId = 1;
  private currentSocietyId = 1;
  private currentBookId = 1;
  private currentRentalId = 1;
  private currentMemberId = 1;
  private currentNotificationId = 1;

  async applyBrocksToPayment(userId: number, offerType: 'rupees' | 'commission-free', brocksUsed: number, originalAmount: number): Promise<{ newAmount: number; brocksSpent: number }> {
    try {
      // Get current user credits
      const userCredits = await this.getUserCredits(userId);
      if (!userCredits || userCredits.balance < brocksUsed) {
        throw new Error('Insufficient Brocks credits');
      }

      let newAmount = originalAmount;
      let brocksSpent = 0;

      if (offerType === 'rupees') {
        // Get conversion rate
        const conversionRateSetting = await this.getRewardSetting('credits_to_rupees_rate');
        const conversionRate = parseInt(conversionRateSetting?.settingValue || '20');
        
        // Calculate rupees discount
        const rupeesDiscount = Math.floor(brocksUsed / conversionRate);
        newAmount = Math.max(0, originalAmount - rupeesDiscount);
        brocksSpent = rupeesDiscount * conversionRate; // Only spend exact amount needed
        
        // Spend the credits using deductCredits
        const success = await this.deductCredits(userId, brocksSpent, `Converted ${brocksSpent} Brocks to ₹${rupeesDiscount} discount`);
        if (!success) {
          throw new Error('Failed to deduct Brocks credits');
        }
      } else if (offerType === 'commission-free') {
        // For commission-free, we don't reduce payment amount but give future benefits
        const conversionRateSetting = await this.getRewardSetting('credits_to_commission_free_rate');
        const conversionRate = parseInt(conversionRateSetting?.settingValue || '20');
        
        const commissionFreeDays = Math.floor(brocksUsed / conversionRate);
        brocksSpent = commissionFreeDays * conversionRate;
        
        // Spend the credits using deductCredits
        const success = await this.deductCredits(userId, brocksSpent, `Converted ${brocksSpent} Brocks to ${commissionFreeDays} commission-free days`);
        if (!success) {
          throw new Error('Failed to deduct Brocks credits');
        }
        
        // TODO: Implement commission-free days tracking in user profile
        newAmount = originalAmount; // Payment amount doesn't change for commission-free
      }

      return { newAmount, brocksSpent };
    } catch (error) {
      console.error('Error applying Brocks to payment:', error);
      throw error;
    }
  }
}

export class MemStorage implements IStorage {
  private users: Map<number, User> = new Map();
  private societies: Map<number, Society> = new Map();
  private books: Map<number, Book> = new Map();
  private bookRentals: Map<number, BookRental> = new Map();
  private societyMembers: Map<number, SocietyMember> = new Map();
  private notifications: Map<number, Notification> = new Map();
  
  private currentUserId = 1;
  private currentSocietyId = 1;
  private currentBookId = 1;
  private currentRentalId = 1;
  private currentMemberId = 1;
  private currentNotificationId = 1;

  constructor() {
    this.seedData();
  }

  private seedData() {
    // Seed your user
    const testUser: User = {
      id: 1,
      name: "Jia Maheshwari",
      email: "jia.a.maheshwari@gmail.com",
      phone: "+1234567890",
      password: "bossbaby@12",
      address: null,
      userNumber: null,
      referredBy: null,
      isAdmin: false,
      referralCode: "REF1",
      totalReferrals: 0,
      referralEarnings: "0",
      totalEarnings: "0",
      rank: "Bronze",
      commissionFreeUntil: null,
      booksUploaded: 0,
      profilePicture: null,
      resetToken: null,
      resetTokenExpiry: null,
      createdAt: new Date(),
    };
    this.users.set(1, testUser);

    // Add your admin account
    const adminUser: User = {
      id: 2,
      name: "Abhinic",
      email: "abhinic@gmail.com",
      phone: "+1234567891",
      password: "admin123",
      address: null,
      userNumber: null,
      referredBy: null,
      isAdmin: true,
      referralCode: "ADMIN1",
      totalReferrals: 0,
      referralEarnings: "0",
      totalEarnings: "0",
      rank: "Bronze",
      commissionFreeUntil: null,
      booksUploaded: 0,
      profilePicture: null,
      resetToken: null,
      resetTokenExpiry: null,
      createdAt: new Date(),
    };
    this.users.set(2, adminUser);
    this.currentUserId = 3;

    // Seed a test society
    const testSociety: Society = {
      id: 1,
      name: "Greenwood Apartments",
      description: "A community of book lovers",
      code: "GWA2024",
      city: "Mumbai",
      apartmentCount: 120,
      location: "Bandra West",
      status: "active",
      createdBy: 1,
      memberCount: 1,
      bookCount: 0,
      createdAt: new Date(),
    };
    this.societies.set(1, testSociety);
    this.currentSocietyId = 2;

    // Add test user as member of test society
    const testMember: SocietyMember = {
      id: 1,
      societyId: 1,
      userId: 1,
      isActive: true,
      joinedAt: new Date(),
    };
    this.societyMembers.set(1, testMember);

    // Add admin user as member of test society
    const adminMember: SocietyMember = {
      id: 2,
      societyId: 1,
      userId: 2,
      isActive: true,
      joinedAt: new Date(),
    };
    this.societyMembers.set(2, adminMember);
    this.currentMemberId = 3;
  }

  // Users
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = {
      ...insertUser,
      id,
      address: insertUser.address || null,
      userNumber: null,
      referredBy: insertUser.referredBy || null,
      isAdmin: false,
      referralCode: insertUser.referralCode || null,
      totalReferrals: 0,
      referralEarnings: "0",
      totalEarnings: "0",
      rank: "Bronze",
      commissionFreeUntil: null,
      booksUploaded: 0,
      profilePicture: null,
      resetToken: null,
      resetTokenExpiry: null,
      createdAt: new Date(),
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) {
      return undefined;
    }
    
    const updatedUser = { ...user, ...updates };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  // Societies
  async getSociety(id: number): Promise<Society | undefined> {
    return this.societies.get(id);
  }

  async getSocietyByCode(code: string): Promise<Society | undefined> {
    return Array.from(this.societies.values()).find(society => society.code === code);
  }

  async getSocietiesByUser(userId: number): Promise<SocietyWithStats[]> {
    const userMemberships = Array.from(this.societyMembers.values())
      .filter(member => member.userId === userId && member.isActive);
    
    return Promise.all(userMemberships.map(async (membership) => {
      const society = this.societies.get(membership.societyId);
      if (!society) throw new Error("Society not found");
      return { ...society, isJoined: true };
    }));
  }

  async getAvailableSocieties(userId: number): Promise<SocietyWithStats[]> {
    const userSocietyIds = Array.from(this.societyMembers.values())
      .filter(member => member.userId === userId && member.isActive)
      .map(member => member.societyId);

    return Array.from(this.societies.values())
      .filter(society => !userSocietyIds.includes(society.id))
      .map(society => ({ ...society, isJoined: false }));
  }

  async createSociety(insertSociety: InsertSociety): Promise<Society> {
    const id = this.currentSocietyId++;
    const code = `${insertSociety.name.substring(0, 3).toUpperCase()}${Date.now().toString().slice(-4)}`;
    const society: Society = {
      id,
      name: insertSociety.name,
      description: insertSociety.description || null,
      code,
      city: insertSociety.city,
      apartmentCount: insertSociety.apartmentCount,
      location: insertSociety.location || null,
      status: "active",
      createdBy: 1, // Default to first user for MemStorage
      memberCount: 1,
      bookCount: 0,
      createdAt: new Date(),
    };
    this.societies.set(id, society);

    // Add creator as member
    await this.joinSociety(id, 1); // Default to first user for MemStorage
    
    return society;
  }

  async joinSociety(societyId: number, userId: number): Promise<SocietyMember> {
    const id = this.currentMemberId++;
    const member: SocietyMember = {
      id,
      societyId,
      userId,
      isActive: true,
      joinedAt: new Date(),
    };
    this.societyMembers.set(id, member);

    // Update society member count
    const society = this.societies.get(societyId);
    if (society) {
      society.memberCount += 1;
      this.societies.set(societyId, society);
    }

    return member;
  }

  async isMemberOfSociety(societyId: number, userId: number): Promise<boolean> {
    return Array.from(this.societyMembers.values())
      .some(member => member.societyId === societyId && member.userId === userId && member.isActive);
  }

  // Books
  async getBook(id: number): Promise<BookWithOwner | undefined> {
    const book = this.books.get(id);
    if (!book) return undefined;

    const owner = this.users.get(book.ownerId);
    if (!owner) return undefined;

    return {
      ...book,
      owner: { id: owner.id, name: owner.name }
    };
  }

  async getBooksBySociety(societyId: number): Promise<BookWithOwner[]> {
    const societyBooks = Array.from(this.books.values())
      .filter(book => book.societyId === societyId);

    const booksWithOwners: BookWithOwner[] = [];
    for (const book of societyBooks) {
      const owner = this.users.get(book.ownerId);
      if (owner) {
        booksWithOwners.push({
          ...book,
          owner: { id: owner.id, name: owner.name }
        });
      }
    }

    return booksWithOwners;
  }

  async getBooksByOwner(ownerId: number): Promise<Book[]> {
    return Array.from(this.books.values())
      .filter(book => book.ownerId === ownerId);
  }

  async searchBooks(societyId: number, query?: string, genre?: string): Promise<BookWithOwner[]> {
    let books = Array.from(this.books.values())
      .filter(book => book.societyId === societyId);

    if (query) {
      const lowerQuery = query.toLowerCase();
      books = books.filter(book => 
        book.title.toLowerCase().includes(lowerQuery) ||
        book.author.toLowerCase().includes(lowerQuery)
      );
    }

    if (genre && genre !== 'All') {
      books = books.filter(book => book.genre === genre);
    }

    const booksWithOwners: BookWithOwner[] = [];
    for (const book of books) {
      const owner = this.users.get(book.ownerId);
      if (owner) {
        booksWithOwners.push({
          ...book,
          owner: { id: owner.id, name: owner.name }
        });
      }
    }

    return booksWithOwners;
  }

  async createBook(insertBook: InsertBook): Promise<Book> {
    const id = this.currentBookId++;
    const book: Book = {
      id,
      title: insertBook.title,
      author: insertBook.author,
      isbn: insertBook.isbn || null,
      genre: insertBook.genre,
      description: insertBook.description || null,
      imageUrl: insertBook.imageUrl || null,
      coverImageUrl: insertBook.coverImageUrl || null,
      condition: insertBook.condition,
      dailyFee: insertBook.dailyFee,
      ownerId: insertBook.ownerId,
      societyId: insertBook.societyId,
      isAvailable: true,
      createdAt: new Date(),
    };
    this.books.set(id, book);

    // Update society book count
    const society = this.societies.get(insertBook.societyId);
    if (society) {
      society.bookCount += 1;
      this.societies.set(insertBook.societyId, society);
    }

    return book;
  }

  async updateBook(id: number, updates: Partial<Book>): Promise<Book | undefined> {
    const book = this.books.get(id);
    if (!book) return undefined;

    const updatedBook = { ...book, ...updates };
    this.books.set(id, updatedBook);
    return updatedBook;
  }

  // Rentals
  async getRental(id: number): Promise<RentalWithDetails | undefined> {
    const rental = this.bookRentals.get(id);
    if (!rental) return undefined;

    const book = this.books.get(rental.bookId);
    const borrower = this.users.get(rental.borrowerId);
    const lender = this.users.get(rental.lenderId);

    if (!book || !borrower || !lender) return undefined;

    return {
      ...rental,
      book,
      borrower: { id: borrower.id, name: borrower.name },
      lender: { id: lender.id, name: lender.name }
    };
  }

  async getRentalsByBorrower(borrowerId: number): Promise<RentalWithDetails[]> {
    const borrowerRentals = Array.from(this.bookRentals.values())
      .filter(rental => rental.borrowerId === borrowerId);

    const rentalsWithDetails: RentalWithDetails[] = [];
    for (const rental of borrowerRentals) {
      const book = this.books.get(rental.bookId);
      const borrower = this.users.get(rental.borrowerId);
      const lender = this.users.get(rental.lenderId);

      if (book && borrower && lender) {
        rentalsWithDetails.push({
          ...rental,
          book,
          borrower: { id: borrower.id, name: borrower.name },
          lender: { id: lender.id, name: lender.name }
        });
      }
    }

    return rentalsWithDetails;
  }

  async getRentalsByLender(lenderId: number): Promise<RentalWithDetails[]> {
    const lenderRentals = Array.from(this.bookRentals.values())
      .filter(rental => rental.lenderId === lenderId);

    const rentalsWithDetails: RentalWithDetails[] = [];
    for (const rental of lenderRentals) {
      const book = this.books.get(rental.bookId);
      const borrower = this.users.get(rental.borrowerId);
      const lender = this.users.get(rental.lenderId);

      if (book && borrower && lender) {
        rentalsWithDetails.push({
          ...rental,
          book,
          borrower: { id: borrower.id, name: borrower.name },
          lender: { id: lender.id, name: lender.name }
        });
      }
    }

    return rentalsWithDetails;
  }

  async getActiveRentals(userId: number): Promise<RentalWithDetails[]> {
    const activeRentals = Array.from(this.bookRentals.values())
      .filter(rental => 
        (rental.borrowerId === userId || rental.lenderId === userId) && 
        rental.status === 'active'
      );

    const rentalsWithDetails: RentalWithDetails[] = [];
    for (const rental of activeRentals) {
      const book = this.books.get(rental.bookId);
      const borrower = this.users.get(rental.borrowerId);
      const lender = this.users.get(rental.lenderId);

      if (book && borrower && lender) {
        rentalsWithDetails.push({
          ...rental,
          book,
          borrower: { id: borrower.id, name: borrower.name },
          lender: { id: lender.id, name: lender.name }
        });
      }
    }

    return rentalsWithDetails;
  }

  async createRental(insertRental: InsertBookRental): Promise<BookRental> {
    const id = this.currentRentalId++;
    const rental: BookRental = {
      id,
      bookId: insertRental.bookId,
      borrowerId: insertRental.borrowerId,
      lenderId: insertRental.lenderId,
      societyId: insertRental.societyId,
      startDate: new Date(),
      endDate: insertRental.endDate,
      actualReturnDate: null,
      totalAmount: insertRental.totalAmount,
      platformFee: insertRental.platformFee,
      lenderAmount: insertRental.lenderAmount,
      securityDeposit: insertRental.securityDeposit,
      status: insertRental.status,
      paymentStatus: insertRental.paymentStatus,
      paymentId: null,
      createdAt: new Date(),
    };
    this.bookRentals.set(id, rental);

    // Mark book as unavailable
    const book = this.books.get(insertRental.bookId);
    if (book) {
      book.isAvailable = false;
      this.books.set(insertRental.bookId, book);
    }

    return rental;
  }

  async updateRental(id: number, updates: Partial<BookRental>): Promise<BookRental | undefined> {
    const rental = this.bookRentals.get(id);
    if (!rental) return undefined;

    const updatedRental = { ...rental, ...updates };
    this.bookRentals.set(id, updatedRental);

    // If returned, mark book as available
    if (updates.status === 'returned') {
      const book = this.books.get(rental.bookId);
      if (book) {
        book.isAvailable = true;
        this.books.set(rental.bookId, book);
      }
    }

    return updatedRental;
  }

  // Notifications
  async getNotificationsByUser(userId: number): Promise<Notification[]> {
    return Array.from(this.notifications.values())
      .filter(notification => notification.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async createNotification(insertNotification: InsertNotification): Promise<Notification> {
    const id = this.currentNotificationId++;
    const notification: Notification = {
      ...insertNotification,
      id,
      isRead: false,
      createdAt: new Date(),
    };
    this.notifications.set(id, notification);
    return notification;
  }

  async markNotificationAsRead(id: number): Promise<boolean> {
    const notification = this.notifications.get(id);
    if (!notification) return false;

    notification.isRead = true;
    this.notifications.set(id, notification);
    return true;
  }

  // Statistics
  async getSocietyStats(societyId: number): Promise<{ memberCount: number; bookCount: number; activeRentals: number }> {
    const society = this.societies.get(societyId);
    const activeRentals = Array.from(this.bookRentals.values())
      .filter(rental => rental.societyId === societyId && rental.status === 'active').length;

    return {
      memberCount: society?.memberCount || 0,
      bookCount: society?.bookCount || 0,
      activeRentals
    };
  }

  async getUserStats(userId: number): Promise<{ borrowedBooks: number; lentBooks: number; totalEarnings: number }> {
    const borrowedBooks = Array.from(this.bookRentals.values())
      .filter(rental => rental.borrowerId === userId && rental.status === 'active').length;

    const lentBooks = Array.from(this.bookRentals.values())
      .filter(rental => rental.lenderId === userId && rental.status === 'active').length;

    const totalEarnings = Array.from(this.bookRentals.values())
      .filter(rental => rental.lenderId === userId && rental.status === 'returned')
      .reduce((sum, rental) => sum + parseFloat(rental.lenderAmount), 0);

    return { borrowedBooks, lentBooks, totalEarnings };
  }

  // Extension Request methods (not implemented in memory storage)
  async createExtensionRequest(requestData: InsertExtensionRequest): Promise<ExtensionRequest> {
    throw new Error('Extension requests not supported in memory storage');
  }

  async getExtensionRequestsByOwner(ownerId: number): Promise<ExtensionRequest[]> {
    return [];
  }

  async getExtensionRequest(requestId: number): Promise<ExtensionRequest | undefined> {
    return undefined;
  }

  async approveExtensionRequest(requestId: number): Promise<ExtensionRequest> {
    throw new Error('Extension requests not supported in memory storage');
  }

  async denyExtensionRequest(requestId: number, reason: string): Promise<ExtensionRequest> {
    throw new Error('Extension requests not supported in memory storage');
  }

  // Extension methods (not implemented in memory storage)
  async createRentalExtension(extensionData: InsertRentalExtension): Promise<RentalExtension> {
    throw new Error('Extensions not supported in memory storage');
  }

  async getRentalExtensions(rentalId: number): Promise<RentalExtension[]> {
    return [];
  }

  async updateRentalExtensionPayment(extensionId: number, paymentId: string, status: string): Promise<void> {
    // No-op for memory storage
  }

  // Rewards and badge methods (not implemented in memory storage)
  async createUserBadge(badge: InsertUserBadge): Promise<UserBadge> {
    throw new Error('User badges not supported in memory storage');
  }

  async getUserBadges(userId: number): Promise<UserBadge[]> {
    return [];
  }

  async createUserReferral(referral: InsertUserReferral): Promise<UserReferral> {
    throw new Error('User referrals not supported in memory storage');
  }

  async getUserReferrals(userId: number): Promise<UserReferral[]> {
    return [];
  }

  async createCommissionFreePeriod(period: InsertCommissionFreePeriod): Promise<CommissionFreePeriod> {
    throw new Error('Commission-free periods not supported in memory storage');
  }

  async getActiveCommissionFreePeriods(userId: number): Promise<CommissionFreePeriod[]> {
    return [];
  }

  async updateCommissionFreePeriod(periodId: number, daysRemaining: number): Promise<void> {
    // No-op for memory storage
  }

  async getRewardSetting(key: string): Promise<RewardSetting | undefined> {
    return undefined;
  }

  async updateRewardSetting(key: string, value: string): Promise<void> {
    // No-op for memory storage
  }

  async getAllRewardSettings(): Promise<RewardSetting[]> {
    return [];
  }

  async getUserCredits(userId: number): Promise<{ balance: number; totalEarned: number } | null> {
    return { balance: 0, totalEarned: 0 };
  }

  async getUserRecentRewards(userId: number): Promise<any[]> {
    return [];
  }

  async awardCredits(userId: number, credits: number, reason: string): Promise<void> {
    // No-op for memory storage
    console.log(`🎁 Would award ${credits} Brocks credits to user ${userId} for: ${reason}`);
  }

  async deductCredits(userId: number, credits: number, reason: string): Promise<boolean> {
    // No-op for memory storage
    console.log(`💸 Would deduct ${credits} Brocks credits from user ${userId} for: ${reason}`);
    return true;
  }

  async getBrocksLeaderboard(limit: number = 50): Promise<Array<{rank: number, userId: number, name: string, credits: number, totalEarned: number}>> {
    // Return empty leaderboard for memory storage
    return [];
  }

  async getUserByReferralCode(referralCode: string): Promise<User | undefined> {
    for (const user of this.users.values()) {
      if (user.referralCode === referralCode) {
        return user;
      }
    }
    return undefined;
  }

  // Brocks Packages Management (not supported in memory storage)
  async getAllBrocksPackages(): Promise<BrocksPackage[]> {
    return [];
  }

  async createBrocksPackage(packageData: InsertBrocksPackage): Promise<BrocksPackage | null> {
    return null;
  }

  async updateBrocksPackage(id: number, packageData: Partial<InsertBrocksPackage>): Promise<BrocksPackage | null> {
    return null;
  }

  async deleteBrocksPackage(id: number): Promise<boolean> {
    return false;
  }

  async setPackagePopular(id: number, popular: boolean): Promise<boolean> {
    return false;
  }
}

export const storage = new DatabaseStorage();
console.log('🗄️ Using DatabaseStorage for data operations');
// Expose db for direct queries when needed
(storage as any).db = db;
