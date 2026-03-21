import { 
  users, societies, books, bookHubs, bookRentals, bookPurchases, societyMembers, notifications, societyRequests, referralRewards, rentalExtensions, extensionRequests,
  userCredits, creditTransactions, referrals, userBadges, commissionFreePeriods, rewardSettings, brocksPackages,
  availabilityAlerts,
  type User, type InsertUser, type Society, type InsertSociety, 
  type Book, type InsertBook, type BookHub, type InsertBookHub, type BookRental, type InsertBookRental, type BookPurchase, type InsertBookPurchase,
  type SocietyMember, type InsertSocietyMember, type Notification, type InsertNotification,
  type BookWithOwner, type RentalWithDetails, type SocietyWithStats, type RentalExtension, type InsertRentalExtension,
  type ExtensionRequest, type InsertExtensionRequest, type UserCredits, type InsertUserCredits,
  type CreditTransaction, type InsertCreditTransaction, type Referral, type InsertReferral,
  type UserBadge, type InsertUserBadge, type CommissionFreePeriod, type InsertCommissionFreePeriod,
  type RewardSetting, type InsertRewardSetting, type BrocksPackage, type InsertBrocksPackage,
  pageContent, type PageContent, type InsertPageContent
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
  
  // Societies/Hubs
  getSociety(id: number): Promise<Society | undefined>;
  getSocietyByCode(code: string): Promise<Society | undefined>;
  getSocietiesByUser(userId: number, hubType?: string): Promise<SocietyWithStats[]>;
  getAvailableSocieties(userId: number, hubType?: string): Promise<SocietyWithStats[]>;
  createSociety(society: InsertSociety): Promise<Society>;
  updateSociety(id: number, updates: Partial<Society>): Promise<Society | undefined>;
  deleteSociety(id: number): Promise<boolean>;
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
  
  // Book Hubs
  createBookHub(bookHub: InsertBookHub): Promise<BookHub>;
  getBookHubsByBook(bookId: number): Promise<BookHub[]>;
  deleteBookHubsByBook(bookId: number): Promise<void>;
  getBooksByUserSocieties(userId: number): Promise<BookWithOwner[]>;
  
  // Rentals
  getRental(id: number): Promise<RentalWithDetails | undefined>;
  getRentalsByBorrower(borrowerId: number): Promise<RentalWithDetails[]>;
  getRentalsByLender(lenderId: number): Promise<RentalWithDetails[]>;
  getActiveRentals(userId: number): Promise<RentalWithDetails[]>;
  createRental(rental: InsertBookRental): Promise<BookRental>;
  updateRental(id: number, updates: Partial<BookRental>): Promise<BookRental | undefined>;
  
  // Book Purchases
  createBookPurchase(purchase: any): Promise<any>;
  getPurchasesByBuyer(buyerId: number): Promise<any[]>;
  getPurchasesBySeller(sellerId: number): Promise<any[]>;
  getAllPurchasedBookIds(): Promise<number[]>;
  
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
  createBulkSocietyRequests(hubs: Array<{ name: string; city: string; apartmentCount?: number; hubType?: string; location?: string; latitude?: string; longitude?: string }>, userId: number): Promise<{ created: number; duplicates: string[] }>;
  
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
  
  // Page Content Management
  getPageContent(pageKey: string): Promise<PageContent | undefined>;
  updatePageContent(pageKey: string, data: Partial<InsertPageContent>): Promise<PageContent>;
  getAllPageContent(): Promise<PageContent[]>;
  
  // Brocks application
  applyBrocksToPayment(userId: number, offerType: 'rupees' | 'commission-free', brocksUsed: number, originalAmount: number): Promise<{ newAmount: number; brocksSpent: number }>;
  
  // Society Chat
  getSocietyMessages(societyId: number, limit?: number, offset?: number): Promise<any[]>;
  createSocietyMessage(societyId: number, senderId: number, content: string, messageType?: string): Promise<any>;
  updateChatReadStatus(societyId: number, userId: number, messageId?: number): Promise<void>;
  getChatReadStatus(societyId: number, userId: number): Promise<any>;
  getUnreadMessageCount(societyId: number, userId: number): Promise<number>;
  getSocietyMembers(societyId: number): Promise<any[]>;
  getDirectMessageContacts(userId: number): Promise<any[]>;
  getSocietyChatRooms(societyId: number): Promise<any[]>;
  createChatRoom(societyId: number, name: string, createdBy: number): Promise<any>;
  getDirectMessages(userId: number, contactId: number): Promise<any[]>;
  createDirectMessage(senderId: number, receiverId: number, content: string, messageType?: string): Promise<any>;
  markDirectMessageAsRead(messageId: number): Promise<void>;
  markDirectMessagesAsRead(userId1: number, userId2: number): Promise<void>;
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

  async getSocietiesByUser(userId: number, hubType?: string): Promise<SocietyWithStats[]> {
    const whereConditions = [
      eq(societyMembers.userId, userId),
      eq(societyMembers.isActive, true)
    ];
    
    if (hubType) {
      whereConditions.push(eq(societies.hubType, hubType));
    }
    
    const userSocieties = await db
      .select({
        id: societies.id,
        name: societies.name,
        code: societies.code,
        description: societies.description,
        hubType: societies.hubType,
        city: societies.city,
        apartmentCount: societies.apartmentCount,
        location: societies.location,
        createdBy: societies.createdBy,
        status: societies.status,
        createdAt: societies.createdAt,
      })
      .from(societies)
      .innerJoin(societyMembers, eq(societies.id, societyMembers.societyId))
      .where(and(...whereConditions));
    
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

  async getAvailableSocieties(userId: number, hubType?: string): Promise<SocietyWithStats[]> {
    // Get all societies (optionally filtered by hubType)
    let query = db.select().from(societies);
    const allSocieties = hubType 
      ? await query.where(eq(societies.hubType, hubType))
      : await query;
    
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

  async updateSociety(id: number, updates: Partial<Society>): Promise<Society | undefined> {
    const [society] = await db
      .update(societies)
      .set(updates)
      .where(eq(societies.id, id))
      .returning();
    return society;
  }

  async deleteSociety(id: number): Promise<boolean> {
    try {
      // Delete all related data first
      await db.delete(societyMembers).where(eq(societyMembers.societyId, id));
      await db.delete(bookHubs).where(eq(bookHubs.societyId, id));
      
      // Delete the society itself
      const result = await db.delete(societies).where(eq(societies.id, id));
      return true;
    } catch (error) {
      console.error('Error deleting society:', error);
      return false;
    }
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
        sellingPrice: books.sellingPrice,
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
        sellingPrice: books.sellingPrice,
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
      .innerJoin(bookHubs, eq(books.id, bookHubs.bookId))
      .innerJoin(users, eq(books.ownerId, users.id))
      .innerJoin(societyMembers, and(
        eq(societyMembers.userId, books.ownerId),
        eq(societyMembers.societyId, bookHubs.societyId),
        eq(societyMembers.isActive, true)
      ))
      .where(eq(bookHubs.societyId, societyId));
    
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
        sellingPrice: books.sellingPrice,
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
      .innerJoin(societyMembers, and(
        eq(societyMembers.userId, books.ownerId),
        eq(societyMembers.societyId, societyId),
        eq(societyMembers.isActive, true)
      ))
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

  async createBookHub(bookHub: InsertBookHub): Promise<BookHub> {
    const [hub] = await db
      .insert(bookHubs)
      .values(bookHub)
      .returning();
    return hub;
  }

  async getBookHubsByBook(bookId: number): Promise<BookHub[]> {
    return await db
      .select()
      .from(bookHubs)
      .where(eq(bookHubs.bookId, bookId));
  }

  async deleteBookHubsByBook(bookId: number): Promise<void> {
    await db.delete(bookHubs).where(eq(bookHubs.bookId, bookId));
  }

  async getBooksByUserSocieties(userId: number): Promise<BookWithOwner[]> {
    const userSocieties = await db
      .select({ societyId: societyMembers.societyId })
      .from(societyMembers)
      .where(and(
        eq(societyMembers.userId, userId),
        eq(societyMembers.isActive, true)
      ));

    if (userSocieties.length === 0) {
      return [];
    }

    const societyIds = userSocieties.map(s => s.societyId);

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
        sellingPrice: books.sellingPrice,
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
      .innerJoin(bookHubs, eq(books.id, bookHubs.bookId))
      .innerJoin(users, eq(books.ownerId, users.id))
      .innerJoin(societyMembers, and(
        eq(societyMembers.userId, books.ownerId),
        eq(societyMembers.societyId, bookHubs.societyId),
        eq(societyMembers.isActive, true)
      ))
      .where(inArray(bookHubs.societyId, societyIds));

    return results;
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

  async createBookPurchase(purchase: InsertBookPurchase): Promise<BookPurchase> {
    const [newPurchase] = await db
      .insert(bookPurchases)
      .values(purchase)
      .returning();
    return newPurchase;
  }

  async getPurchasesByBuyer(buyerId: number): Promise<any[]> {
    const purchases = await db
      .select({
        id: bookPurchases.id,
        bookId: bookPurchases.bookId,
        buyerId: bookPurchases.buyerId,
        sellerId: bookPurchases.sellerId,
        societyId: bookPurchases.societyId,
        salePrice: bookPurchases.salePrice,
        platformFee: bookPurchases.platformFee,
        sellerAmount: bookPurchases.sellerAmount,
        paymentStatus: bookPurchases.paymentStatus,
        paymentMethod: bookPurchases.paymentMethod,
        paymentId: bookPurchases.paymentId,
        createdAt: bookPurchases.createdAt,
        bookTitle: books.title,
        bookAuthor: books.author,
        bookIsbn: books.isbn,
        bookGenre: books.genre,
        bookDescription: books.description,
        bookImageUrl: books.imageUrl,
        bookCondition: books.condition,
        sellerName: users.name,
      })
      .from(bookPurchases)
      .innerJoin(books, eq(bookPurchases.bookId, books.id))
      .innerJoin(users, eq(bookPurchases.sellerId, users.id))
      .where(eq(bookPurchases.buyerId, buyerId))
      .orderBy(desc(bookPurchases.createdAt));
    
    return purchases.map(p => ({
      id: p.id,
      bookId: p.bookId,
      buyerId: p.buyerId,
      sellerId: p.sellerId,
      societyId: p.societyId,
      purchasePrice: p.salePrice,
      platformFee: p.platformFee,
      sellerAmount: p.sellerAmount,
      paymentStatus: p.paymentStatus,
      paymentMethod: p.paymentMethod,
      paymentId: p.paymentId,
      createdAt: p.createdAt,
      book: {
        title: p.bookTitle,
        author: p.bookAuthor,
        isbn: p.bookIsbn,
        genre: p.bookGenre,
        description: p.bookDescription,
        imageUrl: p.bookImageUrl,
        condition: p.bookCondition,
      },
      seller: {
        name: p.sellerName,
      },
    }));
  }

  async getPurchasesBySeller(sellerId: number): Promise<any[]> {
    const purchases = await db
      .select({
        id: bookPurchases.id,
        bookId: bookPurchases.bookId,
        buyerId: bookPurchases.buyerId,
        sellerId: bookPurchases.sellerId,
        societyId: bookPurchases.societyId,
        salePrice: bookPurchases.salePrice,
        platformFee: bookPurchases.platformFee,
        sellerAmount: bookPurchases.sellerAmount,
        paymentStatus: bookPurchases.paymentStatus,
        paymentMethod: bookPurchases.paymentMethod,
        paymentId: bookPurchases.paymentId,
        createdAt: bookPurchases.createdAt,
        bookTitle: books.title,
        bookAuthor: books.author,
        bookImageUrl: books.imageUrl,
        buyerName: users.name,
      })
      .from(bookPurchases)
      .innerJoin(books, eq(bookPurchases.bookId, books.id))
      .innerJoin(users, eq(bookPurchases.buyerId, users.id))
      .where(eq(bookPurchases.sellerId, sellerId))
      .orderBy(desc(bookPurchases.createdAt));
    
    return purchases.map(p => ({
      id: p.id,
      bookId: p.bookId,
      buyerId: p.buyerId,
      sellerId: p.sellerId,
      societyId: p.societyId,
      purchasePrice: p.salePrice,
      salePrice: p.salePrice,
      platformFee: p.platformFee,
      sellerAmount: p.sellerAmount,
      paymentStatus: p.paymentStatus,
      paymentMethod: p.paymentMethod,
      paymentId: p.paymentId,
      createdAt: p.createdAt,
      book: {
        title: p.bookTitle,
        author: p.bookAuthor,
        imageUrl: p.bookImageUrl,
      },
      buyer: {
        name: p.buyerName,
      },
    }));
  }

  async getAllPurchasedBookIds(): Promise<number[]> {
    const purchases = await db
      .select({ bookId: bookPurchases.bookId })
      .from(bookPurchases);
    return purchases.map(p => p.bookId);
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

    // Calculate total earnings from book sales
    const salesEarningsResult = await db
      .select({ 
        salesEarnings: sql<string>`COALESCE(SUM(CAST(${bookPurchases.sellerAmount} AS DECIMAL)), 0)` 
      })
      .from(bookPurchases)
      .where(and(
        eq(bookPurchases.sellerId, userId),
        eq(bookPurchases.paymentStatus, 'completed')
      ));
    
    const totalEarnings = parseFloat(earningsResult[0]?.totalEarnings || '0') + 
                         parseFloat(extensionEarningsResult[0]?.extensionEarnings || '0') +
                         parseFloat(salesEarningsResult[0]?.salesEarnings || '0');
    
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
      
      // First, check if the request has already been processed
      const [existingRequest] = await db
        .select()
        .from(societyRequests)
        .where(eq(societyRequests.id, requestId));
      
      if (!existingRequest) {
        throw new Error('Society request not found');
      }
      
      if (existingRequest.status !== 'pending') {
        console.log(`Database Storage: Request ${requestId} already processed with status: ${existingRequest.status}`);
        return; // Request already approved or rejected, skip processing
      }
      
      // Update the request status (only if still pending)
      const updateResult = await db
        .update(societyRequests)
        .set({ 
          status: approved ? 'approved' : 'rejected',
          reviewReason: reason,
          reviewedAt: new Date()
        })
        .where(and(
          eq(societyRequests.id, requestId),
          eq(societyRequests.status, 'pending')
        ))
        .returning();

      console.log('Database Storage: Updated request status:', updateResult);

      if (approved && updateResult.length > 0) {
        const request = updateResult[0];
        console.log('Database Storage: Found request for society creation:', request);
        
        if (request) {
          // Generate a unique society code
          const generateCode = (name: string) => {
            return name.replace(/[^a-zA-Z0-9]/g, '').substring(0, 6).toUpperCase() + Math.floor(Math.random() * 1000);
          };

          const societyData = {
            name: request.name,
            description: request.description,
            hubType: request.hubType || 'society',
            city: request.city,
            apartmentCount: request.apartmentCount,
            location: request.location,
            latitude: request.latitude,
            longitude: request.longitude,
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
          
          // Automatically tag all creator's books to this new hub
          const creatorBooks = await this.getBooksByOwner(request.requestedBy);
          for (const book of creatorBooks) {
            await this.createBookHub({
              bookId: book.id,
              societyId: society.id
            });
          }
          console.log(`Database Storage: Tagged ${creatorBooks.length} books to new society`);
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

  async createBulkSocietyRequests(
    hubsList: Array<{ name: string; city: string; apartmentCount?: number; hubType?: string; location?: string; latitude?: string; longitude?: string }>, 
    userId: number
  ): Promise<{ created: number; duplicates: string[] }> {
    try {
      const created: string[] = [];
      const duplicates: string[] = [];
      
      for (const hub of hubsList) {
        const { name, city, apartmentCount, hubType, location, latitude, longitude } = hub;
        const finalHubType = hubType || 'society';
        
        // Check if hub already exists
        const existingHub = await db.select().from(societies)
          .where(and(
            eq(societies.name, name),
            eq(societies.city, city),
            eq(societies.hubType, finalHubType)
          ))
          .limit(1);
        
        if (existingHub.length > 0) {
          duplicates.push(name);
          continue;
        }
        
        // Check if there's already a pending request
        const existingRequest = await db.select().from(societyRequests)
          .where(and(
            eq(societyRequests.name, name),
            eq(societyRequests.city, city),
            eq(societyRequests.hubType, finalHubType),
            eq(societyRequests.status, 'pending')
          ))
          .limit(1);
        
        if (existingRequest.length > 0) {
          duplicates.push(name);
          continue;
        }
        
        // Generate a unique code
        const code = `${name.substring(0, 3).toUpperCase()}${Math.floor(Math.random() * 900) + 100}`;
        
        // Directly create the hub as approved (admin bulk uploads are auto-approved)
        // Note: Admin does NOT auto-join these hubs
        await db.insert(societies).values({
          name: name,
          description: '',
          city: city,
          apartmentCount: apartmentCount || 500,
          location: location || '',
          latitude: latitude || null,
          longitude: longitude || null,
          hubType: finalHubType,
          code: code,
          status: 'approved',
          createdBy: userId,
          createdAt: new Date()
        });
        
        created.push(name);
      }
      
      return { created: created.length, duplicates };
    } catch (error) {
      console.error('Error creating bulk hub requests:', error);
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
          sellingPrice: books.sellingPrice,
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
        .innerJoin(users, eq(books.ownerId, users.id))
        .innerJoin(societyMembers, and(
          eq(societyMembers.userId, books.ownerId),
          eq(societyMembers.societyId, books.societyId),
          eq(societyMembers.isActive, true)
        ));

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
            settingValue: value
          })
          .where(eq(rewardSettings.settingKey, key));
      } else {
        // Insert new setting if it doesn't exist
        await db
          .insert(rewardSettings)
          .values({
            settingKey: key,
            settingValue: value
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

  // Availability Alert Methods
  async createAvailabilityAlert(userId: number, bookId: number): Promise<void> {
    try {
      // Check if alert already exists
      const existing = await db
        .select()
        .from(availabilityAlerts)
        .where(and(
          eq(availabilityAlerts.userId, userId),
          eq(availabilityAlerts.bookId, bookId),
          eq(availabilityAlerts.isActive, true)
        ));

      if (existing.length === 0) {
        await db.insert(availabilityAlerts).values({
          userId,
          bookId,
          isActive: true
        });
      }
    } catch (error) {
      console.error('Error creating availability alert:', error);
      throw error;
    }
  }

  async removeAvailabilityAlert(userId: number, bookId: number): Promise<void> {
    try {
      await db
        .update(availabilityAlerts)
        .set({ isActive: false })
        .where(and(
          eq(availabilityAlerts.userId, userId),
          eq(availabilityAlerts.bookId, bookId)
        ));
    } catch (error) {
      console.error('Error removing availability alert:', error);
      throw error;
    }
  }

  async getUserAvailabilityAlerts(userId: number): Promise<any[]> {
    try {
      const alerts = await db
        .select({
          id: availabilityAlerts.id,
          bookId: availabilityAlerts.bookId,
          createdAt: availabilityAlerts.createdAt,
          book: {
            id: books.id,
            title: books.title,
            author: books.author,
            isAvailable: books.isAvailable
          }
        })
        .from(availabilityAlerts)
        .leftJoin(books, eq(availabilityAlerts.bookId, books.id))
        .where(and(
          eq(availabilityAlerts.userId, userId),
          eq(availabilityAlerts.isActive, true)
        ));

      return alerts;
    } catch (error) {
      console.error('Error fetching user availability alerts:', error);
      throw error;
    }
  }

  async checkAvailabilityAlert(userId: number, bookId: number): Promise<boolean> {
    try {
      const alert = await db
        .select()
        .from(availabilityAlerts)
        .where(and(
          eq(availabilityAlerts.userId, userId),
          eq(availabilityAlerts.bookId, bookId),
          eq(availabilityAlerts.isActive, true)
        ));

      return alert.length > 0;
    } catch (error) {
      console.error('Error checking availability alert:', error);
      return false;
    }
  }

  async getActiveAlertsForBook(bookId: number): Promise<any[]> {
    try {
      const alerts = await db
        .select({
          id: availabilityAlerts.id,
          userId: availabilityAlerts.userId,
          user: {
            id: users.id,
            name: users.name,
            email: users.email
          }
        })
        .from(availabilityAlerts)
        .leftJoin(users, eq(availabilityAlerts.userId, users.id))
        .where(and(
          eq(availabilityAlerts.bookId, bookId),
          eq(availabilityAlerts.isActive, true)
        ));

      return alerts;
    } catch (error) {
      console.error('Error fetching active alerts for book:', error);
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

      // Create credit transaction record for earning
      await this.addCreditTransaction({
        userId,
        amount: credits, // positive for earning
        type: 'earning',
        description: reason
      });

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

      // Create credit transaction record for spending
      await this.addCreditTransaction({
        userId,
        amount: -credits, // negative for spending
        type: 'spending',
        description: reason
      });

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

  async getBrocksPackageById(id: number): Promise<BrocksPackage | null> {
    try {
      const [packageData] = await db.select().from(brocksPackages)
        .where(and(eq(brocksPackages.id, id), eq(brocksPackages.isActive, true)))
        .limit(1);
      return packageData || null;
    } catch (error) {
      console.error('Error fetching Brocks package by ID:', error);
      return null;
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

  // Page Content Management methods
  async getPageContent(pageKey: string): Promise<PageContent | undefined> {
    const [content] = await db.select().from(pageContent).where(eq(pageContent.pageKey, pageKey));
    return content || undefined;
  }

  async updatePageContent(pageKey: string, data: Partial<InsertPageContent>): Promise<PageContent> {
    const [content] = await db
      .insert(pageContent)
      .values({ pageKey, ...data })
      .onConflictDoUpdate({
        target: pageContent.pageKey,
        set: { ...data },
      })
      .returning();
    return content;
  }

  async getAllPageContent(): Promise<PageContent[]> {
    return await db.select().from(pageContent);
  }

  // Chat Status methods
  async updateChatReadStatus(societyId: number, userId: number, messageId?: number): Promise<void> {
    try {
      await db.execute(sql`
        INSERT INTO chat_read_status (society_id, user_id, last_read_message_id, last_read_at)
        VALUES (${societyId}, ${userId}, ${messageId || null}, NOW())
        ON CONFLICT (society_id, user_id) 
        DO UPDATE SET 
          last_read_message_id = EXCLUDED.last_read_message_id,
          last_read_at = EXCLUDED.last_read_at
      `);
    } catch (error) {
      console.error('Error updating chat read status:', error);
    }
  }

  async getUnreadMessageCount(societyId: number, userId: number): Promise<number> {
    try {
      const readStatus = await this.getChatReadStatus(societyId, userId);
      const lastReadMessageId = readStatus?.last_read_message_id || 0;
      
      const result = await db.execute(sql`
        SELECT COUNT(*) as count FROM society_chats 
        WHERE society_id = ${societyId} AND id > ${lastReadMessageId}
      `);
      return parseInt(result.rows?.[0]?.count || '0');
    } catch (error) {
      console.error('Error getting unread message count:', error);
      return 0;
    }
  }

  // Chat Room methods  
  async getSocietyChatRooms(societyId: number): Promise<any[]> {
    try {
      const rooms = await db.execute(sql`
        SELECT 
          cr.*,
          u.name as creator_name,
          COUNT(sc.id) as message_count
        FROM chat_rooms cr
        LEFT JOIN users u ON cr.created_by = u.id
        LEFT JOIN society_chats sc ON cr.id = sc.room_id
        WHERE cr.society_id = ${societyId}
        GROUP BY cr.id, u.name
        ORDER BY cr.created_at ASC
      `);
      return rooms.rows || [];
    } catch (error) {
      console.error('Error fetching society chat rooms:', error);
      return [];
    }
  }

  async createChatRoom(societyId: number, name: string, createdBy: number): Promise<any> {
    try {
      const result = await db.execute(sql`
        INSERT INTO chat_rooms (society_id, name, created_by, created_at)
        VALUES (${societyId}, ${name}, ${createdBy}, NOW())
        RETURNING *
      `);
      return result.rows?.[0] || null;
    } catch (error) {
      console.error('Error creating chat room:', error);
      throw error;
    }
  }

  // Brocks Application method
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
  // Page Content Management
  async getPageContent(pageKey: string): Promise<PageContent | undefined> {
    const [content] = await db.select().from(pageContent).where(eq(pageContent.pageKey, pageKey));
    return content || undefined;
  }

  async updatePageContent(pageKey: string, data: Partial<InsertPageContent>): Promise<PageContent> {
    const [content] = await db
      .insert(pageContent)
      .values({ pageKey, ...data })
      .onConflictDoUpdate({
        target: pageContent.pageKey,
        set: { ...data },
      })
      .returning();
    return content;
  }

  async getAllPageContent(): Promise<PageContent[]> {
    return await db.select().from(pageContent);
  }

  // Society Chat Methods
  async getSocietyMessages(societyId: number, limit: number = 50, offset: number = 0): Promise<any[]> {
    try {
      const messages = await db.execute(sql`
        SELECT 
          sc.id,
          sc.society_id,
          sc.sender_id,
          sc.content,
          sc.message_type,
          sc.is_edited,
          sc.edited_at,
          sc.created_at,
          u.name as sender_name,
          u.profile_picture as sender_picture
        FROM society_chats sc
        JOIN users u ON sc.sender_id = u.id
        WHERE sc.society_id = ${societyId}
        ORDER BY sc.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `);
      return messages.rows || [];
    } catch (error) {
      console.error('Error fetching society messages:', error);
      return [];
    }
  }

  async createSocietyMessage(societyId: number, senderId: number, content: string, messageType: string = 'text'): Promise<any> {
    try {
      const result = await db.execute(sql`
        INSERT INTO society_chats (society_id, sender_id, content, message_type, created_at)
        VALUES (${societyId}, ${senderId}, ${content}, ${messageType}, NOW())
        RETURNING *
      `);
      return result.rows?.[0] || null;
    } catch (error) {
      console.error('Error creating society message:', error);
      throw error;
    }
  }

  async updateChatReadStatus(societyId: number, userId: number, messageId?: number): Promise<void> {
    try {
      await db.execute(sql`
        INSERT INTO chat_read_status (society_id, user_id, last_read_message_id, last_read_at)
        VALUES (${societyId}, ${userId}, ${messageId || null}, NOW())
        ON CONFLICT (society_id, user_id) 
        DO UPDATE SET 
          last_read_message_id = EXCLUDED.last_read_message_id,
          last_read_at = EXCLUDED.last_read_at
      `);
    } catch (error) {
      console.error('Error updating chat read status:', error);
    }
  }

  async getChatReadStatus(societyId: number, userId: number): Promise<any> {
    try {
      const result = await db.execute(sql`
        SELECT * FROM chat_read_status 
        WHERE society_id = ${societyId} AND user_id = ${userId}
      `);
      return result.rows?.[0] || null;
    } catch (error) {
      console.error('Error getting chat read status:', error);
      return null;
    }
  }

  async getUnreadMessageCount(societyId: number, userId: number): Promise<number> {
    try {
      const readStatus = await this.getChatReadStatus(societyId, userId);
      const lastReadMessageId = readStatus?.last_read_message_id || 0;
      
      const result = await db.execute(sql`
        SELECT COUNT(*) as count FROM society_chats 
        WHERE society_id = ${societyId} AND id > ${lastReadMessageId}
      `);
      return parseInt(result.rows?.[0]?.count || '0');
    } catch (error) {
      console.error('Error getting unread message count:', error);
      return 0;
    }
  }

  // Direct Messages Methods

  async createDirectMessage(senderId: number, receiverId: number, content: string, messageType: string = 'text'): Promise<any> {
    try {
      const result = await db.execute(sql`
        INSERT INTO direct_messages (sender_id, receiver_id, content, message_type, created_at)
        VALUES (${senderId}, ${receiverId}, ${content}, ${messageType}, NOW())
        RETURNING *
      `);
      return result.rows?.[0] || null;
    } catch (error) {
      console.error('Error creating direct message:', error);
      throw error;
    }
  }

  async markDirectMessagesAsRead(userId1: number, userId2: number): Promise<void> {
    try {
      await db.execute(sql`
        UPDATE direct_messages 
        SET is_read = TRUE 
        WHERE receiver_id = ${userId1} AND sender_id = ${userId2} AND is_read = FALSE
      `);
    } catch (error) {
      console.error('Error marking direct messages as read:', error);
    }
  }

  async getDirectMessageContacts(userId: number): Promise<any[]> {
    try {
      const contacts = await db.execute(sql`
        SELECT DISTINCT
          CASE 
            WHEN dm.sender_id = ${userId} THEN dm.receiver_id
            ELSE dm.sender_id
          END as contact_id,
          u.name as contact_name,
          u.profile_picture as contact_picture,
          latest.content as last_message,
          latest.created_at as last_message_at,
          latest.sender_id as last_sender_id,
          COALESCE(unread.unread_count, 0) as unread_count
        FROM direct_messages dm
        JOIN users u ON (
          CASE 
            WHEN dm.sender_id = ${userId} THEN dm.receiver_id
            ELSE dm.sender_id
          END = u.id
        )
        JOIN LATERAL (
          SELECT content, created_at, sender_id
          FROM direct_messages dm2
          WHERE (dm2.sender_id = ${userId} AND dm2.receiver_id = u.id)
             OR (dm2.sender_id = u.id AND dm2.receiver_id = ${userId})
          ORDER BY created_at DESC
          LIMIT 1
        ) latest ON true
        LEFT JOIN LATERAL (
          SELECT COUNT(*) as unread_count
          FROM direct_messages dm3
          WHERE dm3.sender_id = u.id 
            AND dm3.receiver_id = ${userId} 
            AND dm3.is_read = FALSE
        ) unread ON true
        WHERE dm.sender_id = ${userId} OR dm.receiver_id = ${userId}
        ORDER BY latest.created_at DESC
      `);
      return contacts.rows || [];
    } catch (error) {
      console.error('Error fetching direct message contacts:', error);
      return [];
    }
  }

  // Chat Rooms Methods
  async getSocietyChatRooms(societyId: number): Promise<any[]> {
    try {
      const rooms = await db.execute(sql`
        SELECT 
          cr.*,
          u.name as creator_name,
          COUNT(sc.id) as message_count
        FROM chat_rooms cr
        LEFT JOIN users u ON cr.created_by = u.id
        LEFT JOIN society_chats sc ON cr.id = sc.room_id
        WHERE cr.society_id = ${societyId}
        GROUP BY cr.id, u.name
        ORDER BY cr.created_at ASC
      `);
      return rooms.rows || [];
    } catch (error) {
      console.error('Error fetching society chat rooms:', error);
      return [];
    }
  }

  async createChatRoom(societyId: number, name: string, description: string, roomType: string, createdBy: number): Promise<any> {
    try {
      const result = await db.execute(sql`
        INSERT INTO chat_rooms (society_id, name, description, room_type, created_by, created_at)
        VALUES (${societyId}, ${name}, ${description}, ${roomType}, ${createdBy}, NOW())
        RETURNING *
      `);
      return result.rows?.[0] || null;
    } catch (error) {
      console.error('Error creating chat room:', error);
      throw error;
    }
  }

  async getSocietyMembers(societyId: number): Promise<any[]> {
    try {
      const members = await db.execute(sql`
        SELECT 
          u.id,
          u.name,
          u.email,
          u.profile_picture,
          sm.joined_at,
          CASE WHEN u.id = s.created_by THEN true ELSE false END as is_admin
        FROM society_members sm
        JOIN users u ON sm.user_id = u.id
        JOIN societies s ON sm.society_id = s.id
        WHERE sm.society_id = ${societyId}
        ORDER BY is_admin DESC, u.name ASC
      `);
      return members.rows || [];
    } catch (error) {
      console.error('Error fetching society members:', error);
      return [];
    }
  }

  async getDirectMessages(userId: number, contactId: number): Promise<any[]> {
    try {
      const messages = await db.execute(sql`
        SELECT 
          dm.id,
          dm.sender_id,
          dm.receiver_id,
          dm.content,
          dm.message_type,
          dm.is_read,
          dm.created_at,
          u.name as sender_name,
          u.profile_picture as sender_picture
        FROM direct_messages dm
        JOIN users u ON dm.sender_id = u.id
        WHERE (dm.sender_id = ${userId} AND dm.receiver_id = ${contactId})
           OR (dm.sender_id = ${contactId} AND dm.receiver_id = ${userId})
        ORDER BY dm.created_at ASC
      `);
      return messages.rows || [];
    } catch (error) {
      console.error('Error fetching direct messages:', error);
      return [];
    }
  }



  async markDirectMessageAsRead(messageId: number): Promise<void> {
    try {
      await db.execute(sql`
        UPDATE direct_messages 
        SET is_read = TRUE 
        WHERE id = ${messageId}
      `);
    } catch (error) {
      console.error('Error marking direct message as read:', error);
      throw error;
    }
  }

  async markDirectMessagesAsRead(userId1: number, userId2: number): Promise<void> {
    try {
      await db.execute(sql`
        UPDATE direct_messages 
        SET is_read = TRUE 
        WHERE receiver_id = ${userId1} AND sender_id = ${userId2} AND is_read = FALSE
      `);
    } catch (error) {
      console.error('Error marking direct messages as read:', error);
    }
  }
}

export const storage = new DatabaseStorage();
console.log("🗄️ Using DatabaseStorage for data operations");
// Expose db for direct queries when needed
(storage as any).db = db;
