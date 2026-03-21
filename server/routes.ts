import type { Express } from "express";
import { createServer, type Server } from "http";
import { readFileSync } from "fs";
import { join } from "path";
import { storage } from "./storage";
import { WebSocketServer, WebSocket } from "ws";
import { insertUserSchema, insertSocietySchema, insertBookSchema, insertBookRentalSchema, users, rentalExtensions, societyRequests, societyMembers, societies } from "@shared/schema";
import { userGenrePreferences, wishlists, bookReviews, books, feedbackTable, bookPurchases, bookHubs } from "@shared/schema";
import { z } from "zod";
import { db, pool } from "./db";
import { sql, eq, and, inArray, not, desc } from "drizzle-orm";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import OpenAI from "openai";
import Razorpay from "razorpay";

// Email notification helper function
async function sendEmailNotification(userId: number, title: string, message: string) {
  try {
    // Check if SendGrid is configured
    if (!process.env.SENDGRID_API_KEY) {
      console.log(`📧 SendGrid API key not configured - skipping email notification`);
      return;
    }

    // Get user details
    const user = await storage.getUser(userId);
    if (!user || !user.email) {
      console.log(`📧 Skipping email notification - no email for user ${userId}`);
      return;
    }

    // Dynamic import of SendGrid
    const sgMailModule = await import('@sendgrid/mail');
    const sgMail = sgMailModule.default;
    sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

    const domain = process.env.REPLIT_DEV_DOMAIN || '59203db4-a967-4b1c-b1d8-9d66f27d10d9-00-3bzw6spzdofx2.picard.replit.dev';
    const frontendUrl = domain.startsWith('http') ? domain : `https://${domain}`;

    const msg = {
      to: user.email,
      from: process.env.SENDGRID_FROM_EMAIL || 'notifications@bookpotato.com',
      subject: `BookPotato - ${title}`,
      text: `Hi ${user.name},

${message}

You can view all your notifications by logging into BookPotato:
${frontendUrl}/notifications

Best regards,
The BookPotato Team`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #3b82f6;">${title}</h2>
          <p>Hi ${user.name},</p>
          <div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
            ${message.replace(/\n/g, '<br>')}
          </div>
          <p>
            <a href="${frontendUrl}/notifications" 
               style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 16px 0;">
               View All Notifications
            </a>
          </p>
          <p style="color: #6b7280; font-size: 14px;">
            Best regards,<br>
            The BookPotato Team
          </p>
        </div>
      `,
    };

    await sgMail.send(msg);
    console.log(`📧 Email notification sent to ${user.email}: ${title}`);
  } catch (error: any) {
    // Log error but don't fail the notification creation
    console.error(`📧 Failed to send email notification to user ${userId}:`, error.message);
  }
}

// Wrapper function to create notification and send email
async function createNotificationWithEmail(data: { userId: number; title: string; message: string; type: string; data?: string }) {
  // Create in-app notification
  const notification = await storage.createNotification(data);
  
  // Send email notification in the background (don't await to avoid blocking)
  sendEmailNotification(data.userId, data.title, data.message).catch(err => {
    console.error('Background email send error:', err);
  });
  
  return notification;
}

// Session interface
declare module "express-session" {
  interface SessionData {
    userId?: number;
  }
}

// Extend Express Request to include session  
declare global {
  namespace Express {
    interface Request {
      session: import("express-session").Session & Partial<import("express-session").SessionData>;
    }
  }
}

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// Google OAuth configuration - dynamically detect domain
const getCallbackURL = () => {
  // Priority: 1. Production domain, 2. REPLIT_DOMAINS, 3. Fallback dev domain
  const productionDomain = process.env.PRODUCTION_DOMAIN; // Set this to bookpotato.in in production
  const replitDomains = process.env.REPLIT_DOMAINS;
  const devDomain = '59203db4-a967-4b1c-b1d8-9d66f27d10d9-00-3bzw6spzdofx2.picard.replit.dev';
  
  let domain = devDomain;
  
  if (productionDomain) {
    domain = productionDomain;
  } else if (replitDomains) {
    // REPLIT_DOMAINS can contain multiple domains, use the first one
    domain = replitDomains.split(',')[0].trim();
  }
  
  // Ensure HTTPS protocol
  const baseUrl = domain.startsWith('http') ? domain : `https://${domain}`;
  return `${baseUrl}/api/auth/google/callback`;
};

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Initialize Razorpay client
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || '',
  key_secret: process.env.RAZORPAY_KEY_SECRET || '',
});

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID || "",
  clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
  callbackURL: getCallbackURL()
}, async (accessToken, refreshToken, profile, done) => {
  try {
    // Check if user exists
    let user = await storage.getUserByEmail(profile.emails?.[0]?.value || '');
    
    if (!user) {
      // Create new user
      const userData = {
        name: profile.displayName || 'Unknown User',
        email: profile.emails?.[0]?.value || '',
        phone: '0000000000', // Default phone for OAuth users
        password: 'oauth-user', // OAuth users don't need password
        flatWing: 'Not provided',
        buildingName: 'Not provided',
        detailedAddress: 'Not provided',
        city: 'Not provided'
      };
      user = await storage.createUser(userData);
    }
    
    return done(null, user);
  } catch (error) {
    return done(error, false);
  }
}));

passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: number, done) => {
  try {
    const user = await storage.getUser(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

const borrowBookSchema = z.object({
  bookId: z.number(),
  duration: z.number().min(1),
  paymentMethod: z.string(),
  appliedBrocks: z.object({
    offerType: z.enum(['rupees', 'commission-free']),
    brocksUsed: z.number(),
    discountAmount: z.number(),
  }).nullable().optional(),
  paymentId: z.string().optional(),
  orderId: z.string().optional(),
});

const buyBookSchema = z.object({
  bookId: z.number(),
  paymentMethod: z.string(),
  paymentId: z.string().optional(),
  orderId: z.string().optional(),
});

const joinSocietySchema = z.object({
  societyId: z.number().optional(),
  code: z.string().optional(),
}).refine(data => data.societyId || data.code, {
  message: "Either societyId or code must be provided"
});

// Helper function to get platform settings
async function getPlatformSettings() {
  try {
    const result = await pool.query(`
      SELECT commission_rate, security_deposit, min_apartments, max_rental_days 
      FROM platform_settings 
      ORDER BY id DESC 
      LIMIT 1
    `);
    
    if (result.rows.length > 0) {
      return {
        commissionRate: parseFloat(result.rows[0].commission_rate),
        securityDeposit: parseFloat(result.rows[0].security_deposit),
        minApartments: parseInt(result.rows[0].min_apartments),
        maxRentalDays: parseInt(result.rows[0].max_rental_days)
      };
    }
  } catch (error) {
    console.error('Error fetching platform settings:', error);
  }
  
  // Return default values if query fails
  return {
    commissionRate: 5,
    securityDeposit: 100,
    minApartments: 90,
    maxRentalDays: 30
  };
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize passport
  app.use(passport.initialize());
  app.use(passport.session());

  // Google OAuth routes
  app.get("/api/auth/google", (req, res, next) => {
    console.log("Initiating Google OAuth with Client ID:", process.env.GOOGLE_CLIENT_ID?.substring(0, 20) + "...");
    console.log("Callback URL should be:", getCallbackURL());
    passport.authenticate("google", {
      scope: ["profile", "email"]
    })(req, res, next);
  });

  app.get("/api/auth/google/callback", 
    passport.authenticate("google", { failureRedirect: "/auth?error=oauth_failed" }),
    async (req, res) => {
      // OAuth success - manually handle session and redirect
      console.log("Google OAuth success:", req.user);
      req.session.userId = (req.user as any)?.id;
      req.session.save((err) => {
        if (err) {
          console.error("Session save error:", err);
          return res.redirect("/auth?error=session");
        }
        console.log("Session saved successfully, redirecting to home");
        res.redirect("/");
      });
    }
  );

  // Authentication routes
  // Forgot password route
  app.post("/api/auth/forgot-password", async (req, res) => {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    try {
      const user = await storage.getUserByEmail(email);
      
      if (!user) {
        // Don't reveal if user exists or not for security
        return res.json({ message: "If an account exists with this email, you will receive reset instructions." });
      }

      // Generate a reset token (simple approach - in production, use crypto.randomBytes)
      const resetToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      const resetExpiry = new Date(Date.now() + 3600000); // 1 hour from now

      // Store reset token in user record
      await storage.updateUser(user.id, {
        resetToken,
        resetTokenExpiry: resetExpiry,
      });

      // Send email using SendGrid
      if (!process.env.SENDGRID_API_KEY) {
        console.error("SENDGRID_API_KEY environment variable is not set");
        throw new Error("Email service not configured");
      }

      const sgMailModule = await import('@sendgrid/mail');
      const sgMail = sgMailModule.default;
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);

      const fromEmail = process.env.SENDGRID_FROM_EMAIL || 'noreply@bookshare.com';
      
      // Construct proper frontend URL for Replit environment
      const frontendUrl = process.env.REPLIT_DEV_DOMAIN 
                           ? `https://${process.env.REPLIT_DEV_DOMAIN}` 
                           : 'http://localhost:5000';
      
      const msg = {
        to: email,
        from: fromEmail,
        subject: 'Password Reset - BookPotato',
        text: `Hi ${user.name},

You requested a password reset for your BookPotato account.

Click the link below to reset your password:
${frontendUrl}/reset-password?token=${resetToken}

This link will expire in 1 hour.

If you didn't request this reset, you can safely ignore this email.

Best regards,
The BookPotato Team`,
        html: `
          <h2>Password Reset Request</h2>
          <p>Hi ${user.name},</p>
          <p>You requested a password reset for your BookPotato account.</p>
          <p>Click the link below to reset your password:</p>
          <a href="${frontendUrl}/reset-password?token=${resetToken}" 
             style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 16px 0;">
             Reset Password
          </a>
          <p>This link will expire in 1 hour.</p>
          <p>If you didn't request this reset, you can safely ignore this email.</p>
          <p>Best regards,<br>The BookPotato Team</p>
        `,
      };

      try {
        console.log(`📧 Attempting to send password reset email to ${email}`);
        console.log(`📧 Using SendGrid API key: ${process.env.SENDGRID_API_KEY?.substring(0, 10)}...`);
        console.log(`📧 Frontend URL: ${frontendUrl}`);
        console.log(`📧 Reset link: ${frontendUrl}/reset-password?token=${resetToken}`);
        console.log(`📧 Message details:`, { 
          to: msg.to, 
          from: msg.from, 
          subject: msg.subject 
        });
        
        const result = await sgMail.send(msg);
        console.log(`📧 Password reset email sent successfully to ${email}`);
        console.log(`📧 SendGrid response:`, result[0]?.statusCode, result[0]?.headers);
      } catch (sgError: any) {
        console.error("📧 SendGrid error occurred:");
        console.error("📧 Error details:", sgError);
        console.error("📧 Error response:", sgError.response?.body);
        console.error("📧 Full error object:", JSON.stringify(sgError, null, 2));
        
        // Return proper error message for debugging
        if (sgError.code === 403 && sgError.response?.body?.errors?.[0]?.message?.includes('verified Sender Identity')) {
          return res.status(500).json({ 
            message: "Email service configuration error. Please contact support.",
            details: "The sender email address needs to be verified in SendGrid." 
          });
        }
        
        return res.status(500).json({ 
          message: "Failed to send reset email. Please try again or contact support.",
          details: sgError.message 
        });
      }

      res.json({ message: "If an account exists with this email, you will receive reset instructions." });
    } catch (error) {
      console.error("Forgot password error:", error);
      res.status(500).json({ message: "Failed to process request" });
    }
  });

  // Reset password with token
  app.post("/api/auth/reset-password", async (req, res) => {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ message: "Token and password are required" });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters long" });
    }

    try {
      // Find user with valid reset token
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.resetToken, token));

      if (!user) {
        return res.status(400).json({ message: "Invalid or expired reset token" });
      }

      // Check if token is expired
      if (!user.resetTokenExpiry || new Date(user.resetTokenExpiry) < new Date()) {
        return res.status(400).json({ message: "Reset token has expired" });
      }

      // Update user password and clear reset token (simple password storage to match existing auth)
      await db
        .update(users)
        .set({
          password: password,
          resetToken: null,
          resetTokenExpiry: null,
        })
        .where(eq(users.id, user.id));

      res.json({ message: "Password reset successfully" });
    } catch (error) {
      console.error("Reset password error:", error);
      res.status(500).json({ message: "Failed to reset password" });
    }
  });

  app.post("/api/auth/register", async (req, res) => {
    try {
      // Separate referral code from user data for processing
      const { referralCode, ...restUserData } = req.body;
      const userData = insertUserSchema.parse(restUserData);
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        return res.status(400).json({ message: "User already exists with this email" });
      }

      const user = await storage.createUser(userData);
      req.session.userId = user.id;
      
      // Award starting credits to new user
      const startingCreditsSetting = await storage.getRewardSetting('starting_credits');
      const startingCredits = parseInt(startingCreditsSetting?.settingValue || '100');
      
      if (startingCredits > 0) {
        await storage.awardCredits(user.id, startingCredits, "Welcome bonus for new user");
        console.log(`🎉 Awarded ${startingCredits} starting credits to new user ${user.name}`);
      }
      
      // Handle referral if provided
      if (referralCode && referralCode.trim()) {
        // Convert referral code to user number and find referrer
        const referrerUserNumber = parseInt(referralCode.trim());
        if (!isNaN(referrerUserNumber)) {
          const [referrer] = await db.select().from(users).where(eq(users.userNumber, referrerUserNumber));
          if (referrer) {
            // Award credits to referrer
            const creditsPerReferralSetting = await storage.getRewardSetting('credits_per_referral');
            const creditsPerReferral = parseInt(creditsPerReferralSetting?.settingValue || '10');
            
            if (creditsPerReferral > 0) {
              await storage.awardCredits(referrer.id, creditsPerReferral, `Referral: ${user.name} joined`);
            }
            
            // Update referrer's total referrals
            await storage.updateUser(referrer.id, {
              totalReferrals: (referrer.totalReferrals || 0) + 1
            });
            
            // Set referred by for new user
            await storage.updateUser(user.id, {
              referredBy: referrer.id
            });
            
            console.log(`🎉 Referral success: ${referrer.name} referred ${user.name}, awarded ${creditsPerReferral} credits`);
          } else {
            console.log(`⚠️ Invalid referral code: User number ${referrerUserNumber} not found`);
          }
        } else {
          console.log(`⚠️ Invalid referral code format: ${referralCode}`);
        }
      }
      
      res.json({ 
        user: { id: user.id, name: user.name, email: user.email, phone: user.phone }
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(400).json({ message: "Invalid registration data" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = loginSchema.parse(req.body);
      
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      // Simple password comparison (in production, use proper hashing)
      if (user.password !== password) {
        console.log(`Password mismatch for ${email}. Stored: ${user.password}, Provided: ${password}`);
        return res.status(401).json({ message: "Invalid email or password" });
      }

      req.session.userId = user.id;
      
      // Initialize starting credits for existing users if they don't have any credits record
      try {
        const existingCredits = await storage.getUserCredits(user.id);
        if (!existingCredits) {
          // User has no credits record at all, award starting credits
          await storage.awardCredits(user.id, 100, "Starting credits bonus");
          console.log(`🎁 Awarded 100 starting credits to user ${user.id} (first time)`);
        }
      } catch (error) {
        console.error("Error initializing starting credits:", error);
      }
      
      req.session.save((err) => {
        if (err) {
          console.error("Session save error:", err);
          return res.status(500).json({ message: "Session error" });
        }
        res.json({ 
          user: { 
            id: user.id, 
            name: user.name, 
            email: user.email, 
            phone: user.phone,
            isAdmin: user.isAdmin 
          }
        });
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(400).json({ message: "Invalid login data" });
    }
  });

  // Debug endpoint to check database connection and user data
  app.get("/api/debug/user-check", async (req, res) => {
    try {
      const email = req.query.email as string || 'abhinic@gmail.com';
      
      // Check if user exists
      const user = await storage.getUserByEmail(email);
      
      // Get total user count
      const totalUsers = await db.select().from(users);
      
      res.json({
        environment: process.env.NODE_ENV || 'unknown',
        databaseUrl: process.env.DATABASE_URL ? 'SET' : 'NOT_SET',
        userExists: !!user,
        userData: user ? {
          id: user.id,
          name: user.name,
          email: user.email,
          passwordLength: user.password?.length || 0
        } : null,
        totalUsersInDB: totalUsers.length,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.json({
        error: error.message,
        environment: process.env.NODE_ENV || 'unknown',
        databaseUrl: process.env.DATABASE_URL ? 'SET' : 'NOT_SET',
        timestamp: new Date().toISOString()
      });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Could not log out" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/auth/me", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const user = await storage.getUser(req.session.userId);
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    console.log(`🔍 User ${user.id} data:`, {
      userNumber: user.userNumber,
      name: user.name,
      email: user.email
    });

    res.json({ 
      user: { 
        id: user.id, 
        name: user.name, 
        email: user.email, 
        phone: user.phone, 
        flatWing: user.flatWing,
        buildingName: user.buildingName,
        detailedAddress: user.detailedAddress,
        city: user.city,
        profilePicture: user.profilePicture,
        userNumber: user.userNumber,
        totalReferrals: user.totalReferrals,
        isAdmin: user.isAdmin || false
      }
    });
  });

  // Profile update route
  app.patch("/api/auth/profile", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const { flatWing, buildingName, detailedAddress, city } = req.body;
      
      // Validate input data
      if (!flatWing || !buildingName || !detailedAddress || !city) {
        return res.status(400).json({ 
          message: "All address fields are required: flatWing, buildingName, detailedAddress, city" 
        });
      }

      // Update user profile
      const updatedUser = await storage.updateUser(req.session.userId, {
        flatWing,
        buildingName,
        detailedAddress,
        city,
      });

      res.json({ message: "Profile updated successfully", user: updatedUser });
    } catch (error) {
      console.error("Profile update error:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // Middleware to check authentication
  const requireAuth = async (req: any, res: any, next: any) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Authentication required" });
    }
    next();
  };

  // User profile endpoints
  app.put("/api/user/profile", requireAuth, async (req, res) => {
    try {
      const { name, email, phone, flatWing, buildingName, detailedAddress, city, referralCode } = req.body;
      const userId = req.session.userId!;
      
      console.log('Updating profile for user:', userId, 'with data:', { name, email, phone, flatWing, buildingName, detailedAddress, city, referralCode });
      
      // Get current user to check if already referred
      const currentUser = await storage.getUser(userId);
      if (!currentUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Update the user in the database
      await storage.updateUser(userId, {
        name,
        email,
        phone,
        flatWing,
        buildingName,
        detailedAddress,
        city
      });
      
      // Handle referral code if provided and user hasn't been referred yet
      if (referralCode && referralCode.trim() && !currentUser.referredBy) {
        // Validate that phone number is provided
        if (!phone || phone.trim() === '') {
          return res.status(400).json({ message: "Mobile number is required when using a referral code" });
        }
        
        // Convert referral code to user number and find referrer
        const referrerUserNumber = parseInt(referralCode.trim());
        if (!isNaN(referrerUserNumber)) {
          const [referrer] = await db.select().from(users).where(eq(users.userNumber, referrerUserNumber));
          if (referrer && referrer.id !== userId) {
            // Award credits to referrer
            const creditsPerReferralSetting = await storage.getRewardSetting('credits_per_referral');
            const creditsPerReferral = parseInt(creditsPerReferralSetting?.settingValue || '10');
            
            if (creditsPerReferral > 0) {
              await storage.awardCredits(referrer.id, creditsPerReferral, `Referral: ${currentUser.name} joined`);
            }
            
            // Update referrer's total referrals
            await storage.updateUser(referrer.id, {
              totalReferrals: (referrer.totalReferrals || 0) + 1
            });
            
            // Set referred by for current user
            await storage.updateUser(userId, {
              referredBy: referrer.id
            });
            
            console.log(`🎉 Referral success: ${referrer.name} referred ${currentUser.name}, awarded ${creditsPerReferral} credits`);
          } else if (referrer && referrer.id === userId) {
            return res.status(400).json({ message: "You cannot refer yourself" });
          } else {
            return res.status(400).json({ message: "Invalid referral code" });
          }
        } else {
          return res.status(400).json({ message: "Invalid referral code format" });
        }
      }
      
      res.json({ message: "Profile updated successfully" });
    } catch (error) {
      console.error("Update profile error:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  app.put("/api/user/password", requireAuth, async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      const userId = req.session.userId!;
      
      console.log('Password change request:', { userId, currentPassword, newPassword });
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      console.log('Current user password:', user.password);

      // Verify current password
      if (user.password !== currentPassword) {
        console.log('Password mismatch');
        return res.status(400).json({ message: "Current password is incorrect" });
      }

      // Update password in database using SQL
      await db.execute(sql`
        UPDATE users 
        SET password = ${newPassword}
        WHERE id = ${userId}
      `);

      console.log('Password updated successfully');
      res.json({ message: "Password updated successfully" });
    } catch (error) {
      console.error("Update password error:", error);
      res.status(500).json({ message: "Failed to update password" });
    }
  });

  app.post("/api/user/profile-picture", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      
      // Get current user
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Generate a placeholder avatar URL
      const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&size=200&background=random`;
      
      // Update user in memory storage using proper method
      const updatedUser = await (storage as any).updateUser(userId, { profilePicture: avatarUrl });
      
      if (!updatedUser) {
        return res.status(500).json({ message: "Failed to update profile picture" });
      }

      console.log('Profile picture updated for user:', userId);
      res.json({ 
        message: "Profile picture updated successfully",
        profilePicture: avatarUrl
      });
    } catch (error) {
      console.error("Upload profile picture error:", error);
      res.status(500).json({ message: "Failed to upload profile picture" });
    }
  });

  // Society routes
  app.get("/api/societies/my", requireAuth, async (req, res) => {
    try {
      const hubType = req.query.hubType as string | undefined;
      const societies = await storage.getSocietiesByUser(req.session.userId!, hubType);
      res.json(societies);
    } catch (error) {
      console.error("Get my societies error:", error);
      res.status(500).json({ message: "Failed to fetch societies" });
    }
  });

  app.get("/api/societies/available", requireAuth, async (req, res) => {
    try {
      const hubType = req.query.hubType as string | undefined;
      const societies = await storage.getAvailableSocieties(req.session.userId!, hubType);
      
      res.json(societies);
    } catch (error) {
      console.error("Get available societies error:", error);
      res.status(500).json({ message: "Failed to fetch available societies" });
    }
  });

  app.post("/api/societies", requireAuth, async (req, res) => {
    try {
      console.log('Raw request body:', req.body);
      
      // First validate the basic data
      const validatedData = insertSocietySchema.parse(req.body);
      console.log('Validated data:', validatedData);

      // Check for duplicate hub names in the same city (both existing and pending)
      const existingHub = await db.select()
        .from(societies)
        .where(and(
          eq(societies.name, validatedData.name),
          eq(societies.city, validatedData.city)
        ))
        .limit(1);

      if (existingHub.length > 0) {
        return res.status(400).json({
          message: `A hub named "${validatedData.name}" already exists in ${validatedData.city}. Please use a different name or join the existing hub.`,
          existingHub: existingHub[0]
        });
      }

      // Also check for pending requests with the same name
      const pendingRequest = await db.select()
        .from(societyRequests)
        .where(and(
          eq(societyRequests.name, validatedData.name),
          eq(societyRequests.city, validatedData.city),
          eq(societyRequests.status, 'pending')
        ))
        .limit(1);

      if (pendingRequest.length > 0) {
        return res.status(400).json({
          message: `A hub creation request for "${validatedData.name}" in ${validatedData.city} is already pending admin approval. Please wait for it to be reviewed.`
        });
      }

      // Get minimum apartment requirement from admin settings
      const platformSettings = await getPlatformSettings();
      const minApartments = platformSettings.minApartments;
      
      // Check if apartment count meets minimum requirement
      if (validatedData.apartmentCount < minApartments) {
        // Find existing societies in the same city for potential merging
        const existingSocieties = await storage.getSocietiesByLocation(validatedData.city);
        
        return res.status(400).json({
          message: `Minimum ${minApartments} apartments required. Consider merging with existing societies in your area.`,
          minApartments,
          suggestedSocieties: existingSocieties.map(s => ({
            id: s.id,
            name: s.name,
            location: s.location,
            apartmentCount: s.apartmentCount,
            memberCount: s.memberCount
          })),
          requiresMerge: true
        });
      }

      // Create society request for admin approval
      const requestData = {
        ...validatedData,
        requestedBy: req.session.userId!,
        status: 'pending'
      };
      
      const request = await storage.createSocietyRequest(requestData);
      
      // Get hub type label for messages
      const hubTypeLabel = validatedData.hubType === 'society' ? 'Society' : 
                          validatedData.hubType === 'school' ? 'School' : 'Office';
      const hubTypeLower = hubTypeLabel.toLowerCase();
      
      // Create notification for all admin users
      try {
        const user = await storage.getUser(req.session.userId!);
        
        // Get all admin users
        const adminUsers = await db.select({ id: users.id })
          .from(users)
          .where(eq(users.isAdmin, true));
        
        // Create notification for each admin
        for (const admin of adminUsers) {
          await createNotificationWithEmail({
            userId: admin.id,
            title: `New ${hubTypeLabel} Request`,
            message: `${user?.name || 'User'} has requested to create "${validatedData.name}" ${hubTypeLower} with ${validatedData.apartmentCount} members in ${validatedData.city}. Please review and approve.`,
            type: "society_request",
            data: JSON.stringify({
              requestId: request.id,
              societyName: validatedData.name,
              hubType: validatedData.hubType,
              requestedBy: req.session.userId!,
              apartmentCount: validatedData.apartmentCount,
              city: validatedData.city
            })
          });
        }
      } catch (notificationError) {
        console.error("Failed to create admin notifications:", notificationError);
        // Don't fail the request if notification creation fails
      }
      
      res.json({
        message: `${hubTypeLabel} creation request submitted for admin approval`,
        hubType: validatedData.hubType,
        requestId: request.id,
        status: "pending"
      });
    } catch (error) {
      console.error("Create society error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Please fill all required fields", errors: error.errors });
      }
      res.status(400).json({ message: "Failed to create society request" });
    }
  });

  app.post("/api/societies/bulk", requireAuth, async (req, res) => {
    try {
      // Check if user is admin
      const user = await storage.getUser(req.session.userId!);
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const { hubs: hubsList, city, hubType } = req.body;
      
      if (!Array.isArray(hubsList) || hubsList.length === 0) {
        return res.status(400).json({ message: "Please provide a list of hub names" });
      }
      
      if (!city) {
        return res.status(400).json({ message: "City is required for bulk upload" });
      }
      
      const finalHubType = hubType || 'society';
      
      // Parse hub names and create objects
      const hubObjects = hubsList.map(hub => ({
        name: typeof hub === 'string' ? hub.trim() : hub.name?.trim() || '',
        city: city.trim(),
        apartmentCount: typeof hub === 'object' && hub.apartmentCount ? hub.apartmentCount : 500,
        hubType: finalHubType,
        location: typeof hub === 'object' && hub.location ? hub.location.trim() : undefined,
        latitude: typeof hub === 'object' && hub.latitude ? hub.latitude.trim() : undefined,
        longitude: typeof hub === 'object' && hub.longitude ? hub.longitude.trim() : undefined
      })).filter(s => s.name.length > 0);
      
      // Create bulk hubs (auto-approved for admin uploads)
      const result = await storage.createBulkSocietyRequests(hubObjects, req.session.userId!);
      
      res.json({
        message: `Created ${result.created} hub(s)`,
        created: result.created,
        duplicates: result.duplicates,
        skipped: result.duplicates.length
      });
    } catch (error) {
      console.error("Bulk create hubs error:", error);
      res.status(500).json({ message: "Failed to create bulk hub requests" });
    }
  });

  // Merge with existing society endpoint
  app.post("/api/societies/merge", requireAuth, async (req, res) => {
    try {
      const { targetSocietyId, newSocietyName, newSocietyDescription } = req.body;
      
      if (!targetSocietyId || !newSocietyName) {
        return res.status(400).json({ message: "Target society ID and new society name are required" });
      }

      // Check if target society exists
      const targetSociety = await storage.getSociety(targetSocietyId);
      if (!targetSociety) {
        return res.status(404).json({ message: "Target society not found" });
      }

      // Create merge request
      const mergeRequestData = {
        name: `${newSocietyName} (merge with ${targetSociety.name})`,
        description: newSocietyDescription || `Merge request to join ${targetSociety.name}`,
        city: targetSociety.city,
        apartmentCount: 1, // Placeholder, will be handled during admin review
        location: targetSociety.location,
        requestedBy: req.session.userId!,
        status: 'pending_merge',
        targetSocietyId: targetSocietyId
      };
      
      const request = await storage.createSocietyRequest(mergeRequestData);
      
      res.json({
        message: "Merge request submitted for admin approval",
        requestId: request.id,
        status: "pending_merge",
        targetSociety: {
          name: targetSociety.name,
          location: targetSociety.location
        }
      });
    } catch (error) {
      console.error("Merge society request error:", error);
      res.status(400).json({ message: "Failed to create merge request" });
    }
  });

  app.post("/api/societies/join", requireAuth, async (req, res) => {
    try {
      const { societyId, code } = joinSocietySchema.parse(req.body);
      
      let targetSocietyId = societyId;
      
      if (code && !societyId) {
        const society = await storage.getSocietyByCode(code);
        if (!society) {
          return res.status(404).json({ message: "Society not found with this code" });
        }
        targetSocietyId = society.id;
      }

      if (!targetSocietyId) {
        return res.status(400).json({ message: "Society ID or code required" });
      }

      // Check if already a member
      const isMember = await storage.isMemberOfSociety(targetSocietyId, req.session.userId!);
      if (isMember) {
        return res.status(400).json({ message: "Already a member of this society" });
      }

      const member = await storage.joinSociety(targetSocietyId, req.session.userId!);
      
      // Automatically add all user's books to this new hub
      const userBooks = await storage.getBooksByOwner(req.session.userId!);
      for (const book of userBooks) {
        // Check if book is already tagged to this hub
        const existingTag = await db.select()
          .from(bookHubs)
          .where(and(
            eq(bookHubs.bookId, book.id),
            eq(bookHubs.societyId, targetSocietyId)
          ))
          .limit(1);
        
        if (existingTag.length === 0) {
          await storage.createBookHub({
            bookId: book.id,
            societyId: targetSocietyId
          });
        }
      }
      
      res.json(member);
    } catch (error) {
      console.error("Join society error:", error);
      res.status(400).json({ message: "Failed to join society" });
    }
  });

  app.post("/api/societies/:id/join", requireAuth, async (req, res) => {
    console.log("🚀 JOIN ROUTE HIT - societyId:", req.params.id, "userId:", req.session.userId);
    
    try {
      const societyId = parseInt(req.params.id);
      
      if (!societyId || isNaN(societyId)) {
        console.log("❌ Invalid society ID");
        return res.status(400).json({ message: "Valid society ID required" });
      }

      // Check if society exists
      const society = await storage.getSociety(societyId);
      if (!society) {
        console.log("❌ Society not found");
        return res.status(404).json({ message: "Society not found" });
      }

      // Check if already a member
      const isMember = await storage.isMemberOfSociety(societyId, req.session.userId!);
      if (isMember) {
        console.log("❌ Already a member");
        return res.status(400).json({ message: "Already a member of this society" });
      }

      const member = await storage.joinSociety(societyId, req.session.userId!);
      console.log("✅ Successfully joined society:", member);
      
      // Automatically add all user's books to this new hub
      const userBooks = await storage.getBooksByOwner(req.session.userId!);
      for (const book of userBooks) {
        // Check if book is already tagged to this hub
        const existingTag = await db.select()
          .from(bookHubs)
          .where(and(
            eq(bookHubs.bookId, book.id),
            eq(bookHubs.societyId, societyId)
          ))
          .limit(1);
        
        if (existingTag.length === 0) {
          await storage.createBookHub({
            bookId: book.id,
            societyId: societyId
          });
        }
      }
      
      return res.json({ 
        success: true, 
        member: member,
        message: "Successfully joined society"
      });
    } catch (error: any) {
      console.error("❌ Join society error:", error);
      return res.status(500).json({ 
        success: false,
        message: "Failed to join society: " + error.message 
      });
    }
  });

  // Leave society
  app.post("/api/societies/:id/leave", requireAuth, async (req, res) => {
    try {
      const societyId = parseInt(req.params.id);
      
      if (!societyId || isNaN(societyId)) {
        return res.status(400).json({ message: "Valid society ID required" });
      }

      // Check if user is a member
      const isMember = await storage.isMemberOfSociety(societyId, req.session.userId!);
      if (!isMember) {
        return res.status(400).json({ message: "Not a member of this society" });
      }

      // Remove membership by setting isActive to false
      await storage.leaveSociety(societyId, req.session.userId!);
      
      // Automatically remove all user's books from this hub
      const userBooks = await storage.getBooksByOwner(req.session.userId!);
      for (const book of userBooks) {
        await db.delete(bookHubs)
          .where(and(
            eq(bookHubs.bookId, book.id),
            eq(bookHubs.societyId, societyId)
          ));
      }
      
      res.json({ success: true, message: "Successfully left society" });
    } catch (error: any) {
      console.error("Leave society error:", error);
      res.status(500).json({ message: "Failed to leave society" });
    }
  });

  app.get("/api/societies/:id/stats", requireAuth, async (req, res) => {
    try {
      const societyId = parseInt(req.params.id);
      const stats = await storage.getSocietyStats(societyId);
      res.json(stats);
    } catch (error) {
      console.error("Get society stats error:", error);
      res.status(500).json({ message: "Failed to fetch society stats" });
    }
  });

  // Admin: Update society/hub details
  app.put("/api/societies/:id", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const societyId = parseInt(req.params.id);
      const updates = req.body;

      const updatedSociety = await storage.updateSociety(societyId, updates);
      
      if (!updatedSociety) {
        return res.status(404).json({ message: "Society not found" });
      }

      res.json({ success: true, society: updatedSociety });
    } catch (error) {
      console.error("Update society error:", error);
      res.status(500).json({ message: "Failed to update society" });
    }
  });

  // Admin: Delete society/hub
  app.delete("/api/societies/:id", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const societyId = parseInt(req.params.id);
      const success = await storage.deleteSociety(societyId);
      
      if (!success) {
        return res.status(500).json({ message: "Failed to delete society" });
      }

      res.json({ success: true, message: "Society deleted successfully" });
    } catch (error) {
      console.error("Delete society error:", error);
      res.status(500).json({ message: "Failed to delete society" });
    }
  });



  // Get all books from user's societies (sorted by newest first)
  app.get("/api/books/all", requireAuth, async (req, res) => {
    try {
      // Get all books from user's hubs using book_hubs junction table
      const allBooks = await storage.getBooksByUserSocieties(req.session.userId!);
      console.log("📚 API /books/all - Total books found:", allBooks.length);
      
      // Filter out user's own books
      const otherBooks = allBooks.filter(book => book.ownerId !== req.session.userId!);
      
      // Sort books by creation date (newest first) for home page recent books
      otherBooks.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      console.log("📚 Books after filtering owner:", otherBooks.length);
      console.log("📚 Sample book:", otherBooks[0]);
      console.log("📚 Sending response:", JSON.stringify(otherBooks).substring(0, 200) + "...");
      
      res.status(200).json(otherBooks);
    } catch (error) {
      console.error("❌ Get all books error:", error);
      res.status(500).json({ message: "Failed to fetch books" });
    }
  });

  app.get("/api/books/browse", requireAuth, async (req, res) => {
    try {
      const { 
        search, 
        genres, 
        minPrice, 
        maxPrice, 
        conditions, 
        societies, 
        availability, 
        sortBy, 
        location 
      } = req.query;

      // Get all books from user's societies, excluding user's own books
      const userSocieties = await storage.getSocietiesByUser(req.session.userId!);
      let allBooks: any[] = [];
      
      // Use a Map to prevent duplicate books
      const bookMap = new Map<number, any>();
      
      for (const society of userSocieties) {
        const societyBooks = await storage.getBooksBySociety(society.id);
        // Filter out user's own books and add hub type info
        const otherBooks = societyBooks
          .filter(book => book.ownerId !== req.session.userId!);
        
        for (const book of otherBooks) {
          // Only add the book if we haven't seen it before
          if (!bookMap.has(book.id)) {
            bookMap.set(book.id, {
              ...book,
              hubType: society.hubType || 'society'
            });
          }
        }
      }
      
      // Convert Map back to array
      allBooks = Array.from(bookMap.values());
      
      console.log(`📚 Browse: After deduplication - ${allBooks.length} unique books`);
      console.log(`📚 Browse: Book IDs - ${allBooks.map(b => b.id).slice(0, 20).join(', ')}`);

      // Filter out sold books (books that have been purchased)
      const purchasedBookIds = await storage.getAllPurchasedBookIds();
      allBooks = allBooks.filter(book => !purchasedBookIds.includes(book.id));
      
      console.log(`📚 Browse: After filtering sold books - ${allBooks.length} books`);

      // Apply search filter
      if (search && typeof search === 'string') {
        const searchTerm = search.toLowerCase();
        console.log(`🔍 Browse: Searching for "${searchTerm}"`);
        const beforeSearch = allBooks.length;
        allBooks = allBooks.filter(book => 
          book.title.toLowerCase().includes(searchTerm) ||
          book.author.toLowerCase().includes(searchTerm) ||
          book.genre.toLowerCase().includes(searchTerm) ||
          (book.description && book.description.toLowerCase().includes(searchTerm))
        );
        console.log(`🔍 Browse: Search filtered from ${beforeSearch} to ${allBooks.length} books`);
        if (allBooks.length > 0) {
          console.log(`🔍 Browse: First result: "${allBooks[0].title}"`);
        }
      }

      // Apply genre filter
      if (genres && typeof genres === 'string') {
        const genreList = genres.split(',');
        allBooks = allBooks.filter(book => genreList.includes(book.genre));
      }

      // Apply price range filter
      if (minPrice && maxPrice) {
        const min = parseFloat(minPrice as string);
        const max = parseFloat(maxPrice as string);
        allBooks = allBooks.filter(book => {
          const price = parseFloat(book.dailyFee);
          return price >= min && price <= max;
        });
      }

      // Apply condition filter
      if (conditions && typeof conditions === 'string') {
        const conditionList = conditions.split(',');
        allBooks = allBooks.filter(book => conditionList.includes(book.condition));
      }

      // Apply society filter - STRICT filtering by selected societies
      if (societies && typeof societies === 'string') {
        const societyList = societies.split(',').map(s => parseInt(s));
        allBooks = allBooks.filter(book => societyList.includes(book.societyId));
      }

      // Apply availability filter
      if (availability && availability !== 'all') {
        if (availability === 'available') {
          allBooks = allBooks.filter(book => book.isAvailable);
        } else if (availability === 'rented') {
          allBooks = allBooks.filter(book => !book.isAvailable);
        }
      }

      // Apply sorting
      if (sortBy) {
        switch (sortBy) {
          case 'newest':
            allBooks.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            break;
          case 'oldest':
            allBooks.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
            break;
          case 'price_low':
            allBooks.sort((a, b) => parseFloat(a.dailyFee) - parseFloat(b.dailyFee));
            break;
          case 'price_high':
            allBooks.sort((a, b) => parseFloat(b.dailyFee) - parseFloat(a.dailyFee));
            break;
          default:
            allBooks.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        }
      }

      res.json(allBooks);
    } catch (error) {
      console.error("Browse books error:", error);
      res.status(500).json([]);
    }
  });

  app.get("/api/books/society/:societyId", requireAuth, async (req, res) => {
    try {
      const societyId = parseInt(req.params.societyId);
      const { search, genre } = req.query;
      
      let books;
      if (societyId === 0) {
        // Get ALL books from user's societies for "All" option
        const userSocieties = await storage.getSocietiesByUser(req.session.userId!);
        books = [];
        for (const society of userSocieties) {
          const societyBooks = await storage.getBooksBySociety(society.id);
          books.push(...societyBooks);
        }
      } else {
        // Get books for specific society
        books = await storage.getBooksBySociety(societyId);
      }

      res.json(books);
    } catch (error) {
      console.error("Get society books error:", error);
      res.status(500).json({ message: "Failed to fetch books" });
    }
  });

  app.get("/api/books/my", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      
      // Get books owned by the user
      const ownedBooks = await storage.getBooksByOwner(userId);
      
      // Get IDs of books that have been sold
      const soldBookIds = await db
        .select({ bookId: bookPurchases.bookId })
        .from(bookPurchases)
        .where(eq(bookPurchases.sellerId, userId));
      const soldIds = new Set(soldBookIds.map(p => p.bookId));
      
      // Filter out sold books from owned books
      const unsoldOwnedBooks = ownedBooks.filter(book => !soldIds.has(book.id));
      
      // Get books purchased by the user
      const purchases = await storage.getPurchasesByBuyer(userId);
      const purchasedBooks = purchases.map(purchase => ({
        id: purchase.bookId,
        title: purchase.book.title,
        author: purchase.book.author,
        imageUrl: purchase.book.imageUrl,
        genre: purchase.book.genre || '',
        condition: purchase.book.condition || 'Good',
        dailyFee: '0',
        ownerId: userId,
        societyId: purchase.societyId,
        isAvailable: true,
        description: purchase.book.description || null,
        isbn: purchase.book.isbn || null,
        coverImageUrl: null,
        sellingPrice: null,
        createdAt: purchase.createdAt,
        updatedAt: purchase.createdAt,
        isPurchased: true
      }));
      
      // Combine unsold owned books and purchased books
      const allBooks = [...unsoldOwnedBooks, ...purchasedBooks];
      
      res.json(allBooks);
    } catch (error) {
      console.error("Get my books error:", error);
      res.status(500).json({ message: "Failed to fetch your books" });
    }
  });

  app.get("/api/books/bought", requireAuth, async (req, res) => {
    try {
      const purchases = await storage.getPurchasesByBuyer(req.session.userId!);
      res.json(purchases);
    } catch (error) {
      console.error("Get bought books error:", error);
      res.status(500).json({ message: "Failed to fetch purchased books" });
    }
  });

  app.get("/api/books/sold", requireAuth, async (req, res) => {
    try {
      const purchases = await storage.getPurchasesBySeller(req.session.userId!);
      res.json(purchases);
    } catch (error) {
      console.error("Get sold books error:", error);
      res.status(500).json({ message: "Failed to fetch sold books" });
    }
  });

  app.post("/api/books", requireAuth, async (req, res) => {
    try {
      const bookData = insertBookSchema.parse({
        ...req.body,
        ownerId: req.session.userId!
      });
      
      // Get all hubs the user is a member of
      const userHubs = await storage.getSocietiesByUser(req.session.userId!);
      
      if (!userHubs || userHubs.length === 0) {
        return res.status(400).json({ message: "You must be a member of at least one hub to add books" });
      }

      const book = await storage.createBook(bookData);
      
      // Automatically tag book to all user's current hubs
      for (const hub of userHubs) {
        await storage.createBookHub({
          bookId: book.id,
          societyId: hub.id
        });
      }
      
      // Award Brocks credits for book upload
      const creditsPerUploadSetting = await storage.getRewardSetting('credits_per_book_upload');
      const creditsPerUpload = parseInt(creditsPerUploadSetting?.settingValue || '2');
      
      if (creditsPerUpload > 0) {
        await storage.awardCredits(req.session.userId!, creditsPerUpload, "Book upload");
      }
      
      res.json(book);
    } catch (error) {
      console.error("Create book error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Please fill all required fields", errors: error.errors });
      }
      res.status(400).json({ message: "Failed to create book" });
    }
  });

  app.patch("/api/books/:id", requireAuth, async (req, res) => {
    try {
      const bookId = parseInt(req.params.id);
      const book = await storage.getBook(bookId);
      
      if (!book) {
        return res.status(404).json({ message: "Book not found" });
      }

      if (book.ownerId !== req.session.userId!) {
        return res.status(403).json({ message: "You can only edit your own books" });
      }

      const updatedBook = await storage.updateBook(bookId, req.body);
      res.json(updatedBook);
    } catch (error) {
      console.error("Update book error:", error);
      res.status(400).json({ message: "Failed to update book" });
    }
  });

  app.delete("/api/books/:id", requireAuth, async (req, res) => {
    try {
      const bookId = parseInt(req.params.id);
      const book = await storage.getBook(bookId);
      
      if (!book) {
        return res.status(404).json({ message: "Book not found" });
      }

      if (book.ownerId !== req.session.userId!) {
        return res.status(403).json({ message: "You can only delete your own books" });
      }

      // Check if book is currently borrowed
      if (!book.isAvailable) {
        return res.status(400).json({ message: "Cannot delete a book that is currently borrowed" });
      }

      await storage.deleteBook(bookId);
      res.json({ message: "Book deleted successfully" });
    } catch (error) {
      console.error("Delete book error:", error);
      res.status(400).json({ message: "Failed to delete book" });
    }
  });

  // Rental routes
  app.get("/api/rentals/borrowed", requireAuth, async (req, res) => {
    try {
      console.log("🔍 API: Fetching borrowed books for user:", req.session.userId!);
      console.log("📊 DEBUG: Session data:", { 
        userId: req.session.userId
      });
      
      const rentals = await storage.getRentalsByBorrower(req.session.userId!);
      console.log("📚 API: Borrowed books result:", rentals.length, "books");
      if (rentals.length > 0) {
        console.log("📖 First book:", rentals[0].book?.title);
      }
      
      // Force no cache for debugging
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      
      res.json(rentals);
    } catch (error) {
      console.error("❌ API: Get borrowed books error:", error);
      res.status(500).json({ message: "Failed to fetch borrowed books" });
    }
  });

  app.get("/api/rentals/lent", requireAuth, async (req, res) => {
    try {
      console.log("🔍 API: Fetching lent books for user:", req.session.userId!);
      const rentals = await storage.getRentalsByLender(req.session.userId!);
      console.log("📚 API: Lent books result:", rentals.length, "books");
      if (rentals.length > 0) {
        console.log("📖 First book:", rentals[0].book?.title);
      }
      
      // Force no cache for debugging
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache'); 
      res.setHeader('Expires', '0');
      
      res.json(rentals);
    } catch (error) {
      console.error("❌ API: Get lent books error:", error);
      res.status(500).json({ message: "Failed to fetch lent books" });
    }
  });

  app.get("/api/rentals/active", requireAuth, async (req, res) => {
    try {
      const rentals = await storage.getActiveRentals(req.session.userId!);
      res.json(rentals);
    } catch (error) {
      console.error("Get active rentals error:", error);
      res.status(500).json({ message: "Failed to fetch active rentals" });
    }
  });

  // Extension request
  app.post("/api/rentals/:id/request-extension", requireAuth, async (req, res) => {
    try {
      const rentalId = parseInt(req.params.id);
      const { extensionDays, reason } = req.body;
      
      const rental = await storage.getRental(rentalId);
      
      if (!rental || rental.borrowerId !== req.session.userId!) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      if (!extensionDays || extensionDays < 1 || extensionDays > 30) {
        return res.status(400).json({ message: "Extension days must be between 1 and 30" });
      }

      if (!reason || reason.length < 10) {
        return res.status(400).json({ message: "Reason must be at least 10 characters" });
      }

      const currentEndDate = new Date(rental.endDate);
      const proposedEndDate = new Date(currentEndDate);
      proposedEndDate.setDate(currentEndDate.getDate() + extensionDays);

      // Create notification for book owner
      await createNotificationWithEmail({
        userId: rental.lenderId,
        title: "Extension Request",
        message: `${rental.borrower.name} requests to extend "${rental.book.title}" for ${extensionDays} day(s). Current return date: ${currentEndDate.toLocaleDateString()}, Proposed: ${proposedEndDate.toLocaleDateString()}. Reason: ${reason}`,
        type: "extension_request",
        data: JSON.stringify({ 
          rentalId: rentalId,
          extensionDays: extensionDays,
          reason: reason,
          proposedEndDate: proposedEndDate.toISOString()
        })
      });

      res.json({ message: "Extension request sent to book owner" });
    } catch (error) {
      console.error("Request extension error:", error);
      res.status(500).json({ message: "Failed to request extension" });
    }
  });

  // Book return request (by borrower)
  app.post("/api/rentals/:id/request-return", requireAuth, async (req, res) => {
    try {
      const rentalId = parseInt(req.params.id);
      const rental = await storage.getRental(rentalId);
      
      if (!rental || rental.borrowerId !== req.session.userId!) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      // Check if return request already sent
      if (rental.status === 'return_requested') {
        return res.status(400).json({ message: "Return request already sent" });
      }

      const { notes, lateFeeAmount } = req.body;

      // Get borrower and lender details including phone numbers
      const borrower = await storage.getUser(rental.borrowerId);
      const lender = await storage.getUser(rental.lenderId);

      if (!borrower || !lender) {
        return res.status(400).json({ message: "User details not found" });
      }

      // Check if book is overdue and calculate late fee
      const endDate = new Date(rental.endDate);
      const currentDate = new Date();
      const isOverdue = currentDate > endDate;
      let calculatedLateFee = 0;
      let platformFeeOnLateFee = 0;
      let totalDeduction = 0;
      let excessAmount = 0;

      if (isOverdue) {
        const daysLate = Math.ceil((currentDate.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24));
        const dailyLateFee = Number(rental.book?.dailyFee) || 10; // 100% of daily fee (same as normal rate)
        calculatedLateFee = daysLate * dailyLateFee;
        
        // Get platform settings and calculate platform commission on late fee
        const settings = await getPlatformSettings();
        const commissionRate = settings.commissionRate / 100;
        platformFeeOnLateFee = calculatedLateFee * commissionRate;
        totalDeduction = calculatedLateFee + platformFeeOnLateFee;
        
        // Check if total deduction exceeds security deposit
        const securityDepositAmount = parseFloat(rental.securityDeposit);
        excessAmount = Math.max(0, totalDeduction - securityDepositAmount);
      }

      // Update rental status to indicate return request
      await storage.updateRental(rentalId, {
        status: 'return_requested'
      });

      // Create comprehensive notification for lender with coordination details
      const notificationMessage = isOverdue && calculatedLateFee > 0
        ? `${borrower.name} wants to return "${rental.book.title}". The book is overdue and will incur a late fee of ₹${calculatedLateFee.toFixed(2)}. Please coordinate a meeting spot for the book return. Once you receive the book, confirm the return to complete the transaction.${notes ? ` Borrower's message: ${notes}` : ''}`
        : `${borrower.name} wants to return "${rental.book.title}". Please coordinate a meeting spot for the book return. Once you receive the book, confirm the return to complete the transaction.${notes ? ` Borrower's message: ${notes}` : ''}`;

      await createNotificationWithEmail({
        userId: rental.lenderId,
        title: "Book Return Request",
        message: notificationMessage,
        type: "return_request",
        data: JSON.stringify({
          rentalId: rentalId,
          borrowerName: borrower.name,
          borrowerPhone: borrower.phone,
          lenderPhone: lender.phone,
          bookTitle: rental.book.title,
          notes: notes || null,
          lateFee: calculatedLateFee > 0 ? calculatedLateFee : null,
          isOverdue: isOverdue
        })
      });

      // If there's a late fee, also notify the borrower
      if (isOverdue && calculatedLateFee > 0) {
        let borrowerLateFeeMessage = `Your return request for "${rental.book.title}" has been sent. Late fee: ₹${calculatedLateFee.toFixed(2)}, Platform commission: ₹${platformFeeOnLateFee.toFixed(2)}, Total charges: ₹${totalDeduction.toFixed(2)}.`;
        
        if (excessAmount > 0) {
          borrowerLateFeeMessage += ` Since the total charges exceed your security deposit (₹${parseFloat(rental.securityDeposit).toFixed(2)}), you will need to pay an additional ₹${excessAmount.toFixed(2)} when returning the book.`;
        } else {
          borrowerLateFeeMessage += ` This will be deducted from your security deposit when the owner confirms the return.`;
        }
        
        await createNotificationWithEmail({
          userId: rental.borrowerId,
          title: excessAmount > 0 ? "Late Fee - Payment Required" : "Late Fee Notice",
          message: borrowerLateFeeMessage,
          type: "late_fee_notice",
          data: JSON.stringify({
            rentalId: rentalId,
            lateFee: calculatedLateFee,
            platformFeeOnLateFee: platformFeeOnLateFee,
            totalDeduction: totalDeduction,
            excessAmount: excessAmount,
            securityDeposit: parseFloat(rental.securityDeposit),
            bookTitle: rental.book.title
          })
        });
      }

      res.json({ 
        message: "Return request sent successfully",
        lateFee: calculatedLateFee > 0 ? calculatedLateFee : null,
        platformFeeOnLateFee: platformFeeOnLateFee > 0 ? platformFeeOnLateFee : null,
        totalDeduction: totalDeduction > 0 ? totalDeduction : null,
        excessAmount: excessAmount > 0 ? excessAmount : null,
        requiresPayment: excessAmount > 0
      });
    } catch (error) {
      console.error("Request return error:", error);
      res.status(500).json({ message: "Failed to request return" });
    }
  });

  // Confirm book return (by lender)
  app.post("/api/rentals/:id/confirm-return", requireAuth, async (req, res) => {
    try {
      const rentalId = parseInt(req.params.id);
      const rental = await storage.getRental(rentalId);
      
      if (!rental || rental.lenderId !== req.session.userId!) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const { notes } = req.body;

      // Check if overdue and calculate late fees
      const endDate = new Date(rental.endDate);
      const currentDate = new Date();
      const isOverdue = currentDate > endDate;
      let lateFee = 0;
      let platformFeeOnLateFee = 0;
      let totalDeduction = 0;

      // Get platform settings for commission rate
      const settings = await getPlatformSettings();
      const commissionRate = settings.commissionRate / 100; // Convert to decimal

      if (isOverdue) {
        const daysLate = Math.ceil((currentDate.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24));
        const dailyLateFee = Number(rental.book?.dailyFee) || 10; // 100% of daily fee (same as normal rate)
        lateFee = daysLate * dailyLateFee;
        
        // Calculate platform commission on late fees
        platformFeeOnLateFee = lateFee * commissionRate;
        totalDeduction = lateFee + platformFeeOnLateFee;
      }

      // Calculate payments (fake payment processing)
      const securityDepositAmount = parseFloat(rental.securityDeposit);
      const lenderEarnings = parseFloat(rental.lenderAmount);
      
      // Calculate refund and excess based on total deduction (late fee + platform fee)
      const totalRefund = Math.max(0, securityDepositAmount - totalDeduction);
      const excessAmount = Math.max(0, totalDeduction - securityDepositAmount);
      
      // Update rental status and mark book as available
      await storage.updateRental(rentalId, {
        status: 'returned',
        actualReturnDate: new Date(),
        paymentStatus: 'completed'
      });

      // Mark book as available
      await storage.updateBook(rental.bookId, { isAvailable: true });

      // Notify borrower about return confirmation and payment details
      let borrowerMessage = `Return of "${rental.book.title}" confirmed! Security deposit: ₹${securityDepositAmount.toFixed(2)}`;
      
      if (lateFee > 0) {
        if (excessAmount > 0) {
          borrowerMessage += `, Late fee: ₹${lateFee.toFixed(2)}, Platform fee on late charge: ₹${platformFeeOnLateFee.toFixed(2)}. You need to pay additional ₹${excessAmount.toFixed(2)} (charges exceeded security deposit). Please contact the lender to complete payment.`;
        } else {
          borrowerMessage += `, Late fee: ₹${lateFee.toFixed(2)}, Platform fee: ₹${platformFeeOnLateFee.toFixed(2)}, Refund: ₹${totalRefund.toFixed(2)} has been processed.`;
        }
      } else {
        borrowerMessage += `, Refund: ₹${totalRefund.toFixed(2)} has been processed.`;
      }
      
      await createNotificationWithEmail({
        userId: rental.borrowerId,
        title: excessAmount > 0 ? "Book Return - Additional Payment Required" : "Book Return Confirmed - Payment Processed",
        message: borrowerMessage,
        type: "return_confirmed",
        data: JSON.stringify({
          rentalId: rentalId,
          securityDeposit: securityDepositAmount,
          lateFee: lateFee,
          platformFeeOnLateFee: platformFeeOnLateFee,
          totalDeduction: totalDeduction,
          refundAmount: totalRefund,
          excessAmount: excessAmount,
          bookTitle: rental.book.title
        })
      });

      // Notify borrower about lender payment (fake payment notification)
      await createNotificationWithEmail({
        userId: rental.lenderId,
        title: "Rental Payment Received",
        message: `Payment of ₹${lenderEarnings.toFixed(2)} for "${rental.book.title}" rental has been processed to your account.`,
        type: "payment_received",
        data: JSON.stringify({
          rentalId: rentalId,
          amount: lenderEarnings,
          bookTitle: rental.book.title
        })
      });

      res.json({ 
        message: excessAmount > 0 
          ? "Book return confirmed. Additional payment required for excess charges."
          : "Book return confirmed and payments processed successfully",
        securityDeposit: securityDepositAmount,
        lateFee: lateFee,
        platformFeeOnLateFee: platformFeeOnLateFee,
        totalDeduction: totalDeduction,
        refundAmount: totalRefund,
        excessAmount: excessAmount,
        lenderEarnings: lenderEarnings
      });
    } catch (error) {
      console.error("Confirm return error:", error);
      res.status(500).json({ message: "Failed to confirm return" });
    }
  });

  // Pay late fees
  app.post("/api/rentals/:id/pay-late-fees", requireAuth, async (req, res) => {
    try {
      const rentalId = parseInt(req.params.id);
      const rental = await storage.getRental(rentalId);
      
      if (!rental || rental.borrowerId !== req.session.userId!) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const { lateFeeAmount } = req.body;

      // Update rental with late fee payment
      await storage.updateRental(rentalId, {
        status: 'active' // Update status instead of non-existent fields
      });

      // Create notification for lender
      await createNotificationWithEmail({
        userId: rental.lenderId,
        title: "Late Fee Paid",
        message: `${rental.borrower.name} has paid ₹${lateFeeAmount.toFixed(2)} in late fees for "${rental.book.title}"`,
        type: "late_fee_paid"
      });

      res.json({ message: "Late fees paid successfully" });
    } catch (error) {
      console.error("Pay late fees error:", error);
      res.status(500).json({ message: "Failed to process late fee payment" });
    }
  });

  // Pay excess charges (when charges exceed security deposit after return)
  app.post("/api/rentals/:id/pay-excess-charges", requireAuth, async (req, res) => {
    try {
      const rentalId = parseInt(req.params.id);
      const rental = await storage.getRental(rentalId);
      
      if (!rental || rental.borrowerId !== req.session.userId!) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const { excessAmount, paymentId, orderId } = req.body;

      if (!paymentId || !orderId) {
        return res.status(400).json({ message: "Payment details required" });
      }

      console.log(`✅ Excess charge payment received for rental ${rentalId}: ₹${excessAmount}, Payment ID: ${paymentId}`);

      // Create notification for lender
      await createNotificationWithEmail({
        userId: rental.lenderId,
        title: "Excess Charges Paid",
        message: `${rental.borrower.name} has paid ₹${excessAmount.toFixed(2)} in excess charges for "${rental.book.title}". The book return transaction is now complete.`,
        type: "excess_charge_paid",
        data: JSON.stringify({
          rentalId: rentalId,
          excessAmount: excessAmount,
          paymentId: paymentId,
          orderId: orderId
        })
      });

      // Create notification for borrower confirming payment
      await createNotificationWithEmail({
        userId: rental.borrowerId,
        title: "Payment Confirmed",
        message: `Your payment of ₹${excessAmount.toFixed(2)} for excess charges on "${rental.book.title}" has been successfully processed. The transaction is now complete.`,
        type: "payment_confirmed"
      });

      res.json({ 
        message: "Excess charges paid successfully",
        paymentId,
        orderId
      });
    } catch (error) {
      console.error("Pay excess charges error:", error);
      res.status(500).json({ message: "Failed to process excess charge payment" });
    }
  });

  // Notification endpoints
  app.post("/api/notifications/:id/respond-extension", requireAuth, async (req, res) => {
    try {
      const notificationId = parseInt(req.params.id);
      const { approved } = req.body;
      
      // Get the notification and parse extension data
      const notifications = await storage.getNotificationsByUser(req.session.userId!);
      const notification = notifications.find(n => n.id === notificationId);
      
      if (!notification || notification.type !== "extension_request") {
        return res.status(404).json({ message: "Extension request not found" });
      }
      
      const extensionData = JSON.parse(notification.data || "{}");
      const rental = await storage.getRental(extensionData.rentalId);
      
      if (!rental || rental.lenderId !== req.session.userId!) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      if (approved) {
        // Approve extension - update rental end date
        const newEndDate = new Date(extensionData.proposedEndDate);
        await storage.updateRental(extensionData.rentalId, {
          endDate: newEndDate
        });
        
        // Create notification for borrower
        await createNotificationWithEmail({
          userId: rental.borrowerId,
          title: "Extension Approved",
          message: `Your extension request for "${rental.book.title}" has been approved. New return date: ${newEndDate.toLocaleDateString()}`,
          type: "extension_approved",
          data: JSON.stringify({
            rentalId: extensionData.rentalId,
            newEndDate: newEndDate.toISOString()
          })
        });
      } else {
        // Decline extension
        await createNotificationWithEmail({
          userId: rental.borrowerId,
          title: "Extension Declined",
          message: `Your extension request for "${rental.book.title}" has been declined. Please return the book by the original due date: ${new Date(rental.endDate).toLocaleDateString()}`,
          type: "extension_declined",
          data: JSON.stringify({
            rentalId: extensionData.rentalId
          })
        });
      }
      
      // Mark the original notification as read
      await storage.markNotificationAsRead(notificationId);
      
      res.json({ message: approved ? "Extension approved" : "Extension declined" });
    } catch (error) {
      console.error("Respond to extension error:", error);
      res.status(500).json({ message: "Failed to respond to extension request" });
    }
  });

  app.post("/api/notifications/:id/mark-read", requireAuth, async (req, res) => {
    try {
      const notificationId = parseInt(req.params.id);
      const success = await storage.markNotificationAsRead(notificationId);
      
      if (!success) {
        return res.status(404).json({ message: "Notification not found" });
      }
      
      res.json({ message: "Notification marked as read" });
    } catch (error) {
      console.error("Mark notification read error:", error);
      res.status(500).json({ message: "Failed to mark notification as read" });
    }
  });

  // Society request approval via notifications
  app.post("/api/notifications/:id/respond-society", requireAuth, async (req, res) => {
    try {
      const notificationId = parseInt(req.params.id);
      const { approved, reason } = req.body;
      
      // Check if user is admin
      const user = await storage.getUser(req.session.userId!);
      if (!user?.isAdmin && user?.email !== 'abhinic@gmail.com') {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const notifications = await storage.getNotificationsByUser(req.session.userId!);
      const notification = notifications.find(n => n.id === notificationId);
      
      if (!notification || notification.type !== "society_request") {
        return res.status(404).json({ message: "Society request not found" });
      }
      
      const requestData = JSON.parse(notification.data || "{}");
      const requestId = requestData.requestId;
      
      console.log('Processing society request from notification:', { requestId, approved, reason, requestData });
      
      // Update the society request status using the existing admin endpoint logic
      await storage.reviewSocietyRequest(requestId, approved, reason);
      
      // Mark the notification as read
      await storage.markNotificationAsRead(notificationId);
      
      // Create notification for the requester
      const requesterUserId = requestData.requestedBy;
      await createNotificationWithEmail({
        userId: requesterUserId,
        title: approved ? "Society Request Approved" : "Society Request Rejected",
        message: approved 
          ? `Your request to create "${requestData.societyName}" society has been approved!`
          : `Your request to create "${requestData.societyName}" society has been rejected. ${reason ? `Reason: ${reason}` : ''}`,
        type: approved ? "society_approved" : "society_rejected",
        data: JSON.stringify({
          requestId,
          societyName: requestData.societyName,
          reason: reason || null
        })
      });
      
      res.json({ message: approved ? "Society request approved" : "Society request rejected" });
    } catch (error) {
      console.error("Respond to society request error:", error);
      res.status(500).json({ message: "Failed to respond to society request" });
    }
  });

  // Admin Brocks settings endpoint
  app.post("/api/admin/brocks-settings", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { 
        // New comprehensive reward settings
        credits_per_book_upload,
        credits_per_referral,
        credits_per_borrow,
        credits_per_lend,
        credits_for_commission_free_days,
        commission_free_days_per_conversion,
        credits_for_rupees_conversion,
        rupees_per_credit_conversion,
        
        // Legacy settings
        opening_credits, 
        silver_referrals, 
        gold_referrals, 
        platinum_referrals,
        upload_10_reward,
        upload_20_reward,
        upload_30_reward,
        credit_value_rupees
      } = req.body;

      // Update reward settings in the database
      const settingsToUpdate = [
        // New comprehensive settings
        { key: 'credits_per_book_upload', value: credits_per_book_upload.toString() },
        { key: 'credits_per_referral', value: credits_per_referral.toString() },
        { key: 'credits_per_borrow', value: credits_per_borrow.toString() },
        { key: 'credits_per_lend', value: credits_per_lend.toString() },
        { key: 'credits_for_commission_free_days', value: credits_for_commission_free_days.toString() },
        { key: 'commission_free_days_per_conversion', value: commission_free_days_per_conversion.toString() },
        { key: 'credits_for_rupees_conversion', value: credits_for_rupees_conversion.toString() },
        { key: 'rupees_per_credit_conversion', value: rupees_per_credit_conversion.toString() },
        
        // Legacy settings
        { key: 'opening_credits', value: opening_credits.toString() },
        { key: 'silver_referrals', value: silver_referrals.toString() },
        { key: 'gold_referrals', value: gold_referrals.toString() },
        { key: 'platinum_referrals', value: platinum_referrals.toString() },
        { key: 'upload_10_reward', value: upload_10_reward.toString() },
        { key: 'upload_20_reward', value: upload_20_reward.toString() },
        { key: 'upload_30_reward', value: upload_30_reward.toString() },
        { key: 'credit_value_rupees', value: credit_value_rupees.toString() }
      ];

      for (const setting of settingsToUpdate) {
        await storage.updateRewardSetting(setting.key, setting.value);
      }

      res.json({ message: "Brocks settings updated successfully" });
    } catch (error) {
      console.error("Update Brocks settings error:", error);
      res.status(500).json({ message: "Failed to update Brocks settings" });
    }
  });

  // Get user Brocks credits
  app.get("/api/user/credits", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      let credits = await storage.getUserCredits(userId);
      
      // If user has no credits, award starting credits
      if (!credits || (credits.balance === 0 && credits.totalEarned === 0)) {
        const startingCreditsSetting = await storage.getRewardSetting('starting_credits');
        const startingCredits = parseInt(startingCreditsSetting?.settingValue || '100');
        
        if (startingCredits > 0) {
          await storage.awardCredits(userId, startingCredits, "Welcome bonus for existing user");
          console.log(`🎉 Awarded ${startingCredits} starting credits to user ${userId}`);
          
          // Get updated credits
          credits = await storage.getUserCredits(userId);
        }
      }
      
      res.json(credits || { balance: 0, totalEarned: 0 });
    } catch (error) {
      console.error("Get user credits error:", error);
      res.status(500).json({ message: "Failed to fetch user credits" });
    }
  });

  // Initialize starting credits for user
  app.post("/api/user/initialize-credits", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      
      // Check if user already has credits
      const existingCredits = await storage.getUserCredits(userId);
      if (existingCredits) {
        return res.json({ message: "User already has credits", credits: existingCredits });
      }
      
      // Award starting credits (100 by default)
      await storage.awardCredits(userId, 100, "Starting credits bonus");
      
      const newCredits = await storage.getUserCredits(userId);
      res.json({ message: "Starting credits awarded", credits: newCredits });
    } catch (error) {
      console.error("Initialize credits error:", error);
      res.status(500).json({ message: "Failed to initialize credits" });
    }
  });

  // Get user badges
  app.get("/api/user/badges", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const badges = await storage.getUserBadges(userId);
      res.json(badges || []);
    } catch (error) {
      console.error("Get user badges error:", error);
      res.status(500).json({ message: "Failed to fetch user badges" });
    }
  });

  // Get referral stats for brand ambassador program
  app.get("/api/user/referral-stats", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      
      // Get all users referred by this user
      const referredUsers = await db.select().from(users).where(eq(users.referredBy, userId));
      
      // Count qualified referrals (users who have uploaded at least 5 books)
      const qualifiedReferrals = referredUsers.filter(user => (user.booksUploaded || 0) >= 5).length;
      
      res.json({
        totalReferrals: referredUsers.length,
        qualifiedReferrals: qualifiedReferrals,
        referrals: referredUsers.map(u => ({
          id: u.id,
          name: u.name,
          email: u.email,
          booksUploaded: u.booksUploaded || 0,
          qualified: (u.booksUploaded || 0) >= 5
        }))
      });
    } catch (error) {
      console.error("Get referral stats error:", error);
      res.status(500).json({ message: "Failed to fetch referral stats" });
    }
  });

  // Validate referral code and get user info
  app.get("/api/user/validate-referral-code/:code", async (req, res) => {
    try {
      const { code } = req.params;
      
      if (!code || code.trim() === '') {
        return res.status(400).json({ message: "Referral code is required" });
      }
      
      // Try to find user by referral code (which is userNumber)
      const referralCode = code.trim();
      const userNumber = parseInt(referralCode);
      
      if (isNaN(userNumber)) {
        return res.status(404).json({ message: "Invalid referral code" });
      }
      
      const [user] = await db.select().from(users).where(eq(users.userNumber, userNumber));
      
      if (!user) {
        return res.status(404).json({ message: "User not found with this referral code" });
      }
      
      res.json({
        valid: true,
        userName: user.name,
        userId: user.id
      });
    } catch (error) {
      console.error("Validate referral code error:", error);
      res.status(500).json({ message: "Failed to validate referral code" });
    }
  });

  // Get Brocks conversion rates for offers
  app.get("/api/admin/brocks-conversion-rates", requireAuth, async (req, res) => {
    try {
      // Use the new admin panel settings for accurate conversion
      const rupeesPerCreditSetting = await storage.getRewardSetting('rupees_per_credit_conversion');
      const creditsToCommissionFreeRate = await storage.getRewardSetting('credits_to_commission_free_rate');

      // Convert rupees per credit to credits per rupee for consistency
      const rupeesPerCredit = parseFloat(rupeesPerCreditSetting?.settingValue || '0.1'); // 0.1 means 10 Brocks = 1 Rupee
      const creditsToRupeesRate = (1 / rupeesPerCredit).toString(); // Convert to Brocks per Rupee

      res.json({
        creditsToRupeesRate: creditsToRupeesRate,
        creditsToCommissionFreeRate: creditsToCommissionFreeRate?.settingValue || '20'
      });
    } catch (error) {
      console.error("Get Brocks conversion rates error:", error);
      res.status(500).json({ message: "Failed to fetch conversion rates" });
    }
  });

  // Feedback submission
  app.post("/api/feedback", requireAuth, async (req, res) => {
    try {
      const { category, feedback } = req.body;
      const userId = req.session.userId!;
      
      if (!category || !feedback?.trim()) {
        return res.status(400).json({ message: "Category and feedback are required" });
      }
      
      // Get user details for email notification
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Save feedback to database
      const feedbackEntry = await db.insert(feedbackTable).values({
        userId,
        category,
        feedback: feedback.trim(),
      }).returning();
      
      console.log(`📝 Feedback saved from user ${userId}:`, {
        id: feedbackEntry[0].id,
        category,
        feedback: feedback.trim(),
      });

      // Send email notification to admin
      try {
        if (process.env.SENDGRID_API_KEY) {
          const sgMailModule = await import('@sendgrid/mail');
          const sgMail = sgMailModule.default;
          sgMail.setApiKey(process.env.SENDGRID_API_KEY);

          const adminEmail = 'justbored0812@gmail.com';
          const fromEmail = process.env.SENDGRID_FROM_EMAIL || 'borrowbooks.info@gmail.com';
          
          const msg = {
            to: adminEmail,
            from: fromEmail,
            subject: `New Feedback: ${category} - BookPotato`,
            text: `
New feedback received on BookPotato:

From: ${user.name} (${user.email})
Category: ${category}
Feedback ID: ${feedbackEntry[0].id}

Message:
${feedback.trim()}

Submitted on: ${new Date().toLocaleString()}
            `,
            html: `
              <h2>New Feedback Received</h2>
              <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 16px 0;">
                <p><strong>From:</strong> ${user.name} (${user.email})</p>
                <p><strong>Category:</strong> ${category}</p>
                <p><strong>Feedback ID:</strong> ${feedbackEntry[0].id}</p>
                <p><strong>Submitted on:</strong> ${new Date().toLocaleString()}</p>
              </div>
              <h3>Message:</h3>
              <div style="background-color: #ffffff; padding: 16px; border-left: 4px solid #3b82f6; margin: 16px 0;">
                ${feedback.trim().replace(/\n/g, '<br>')}
              </div>
              <p style="color: #6b7280; font-size: 14px;">
                View all feedback in the admin panel: <a href="${process.env.FRONTEND_URL || 'http://localhost:5000'}/admin">Admin Panel</a>
              </p>
            `,
          };

          await sgMail.send(msg);
          console.log(`📧 Feedback notification email sent to ${adminEmail} for feedback ID ${feedbackEntry[0].id}`);
        }
      } catch (emailError) {
        console.error("Failed to send feedback notification email:", emailError);
        // Don't fail the request if email fails
      }
      
      res.json({ message: "Feedback submitted successfully", id: feedbackEntry[0].id });
    } catch (error) {
      console.error("Submit feedback error:", error);
      res.status(500).json({ message: "Failed to submit feedback" });
    }
  });

  // Get all feedback for admin panel
  app.get("/api/admin/feedback", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      
      // Check if user is admin
      const user = await storage.getUser(userId);
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      // Fetch all feedback with user details
      const feedback = await db
        .select({
          id: feedbackTable.id,
          category: feedbackTable.category,
          feedback: feedbackTable.feedback,
          createdAt: feedbackTable.createdAt,
          userName: users.name,
          userEmail: users.email,
        })
        .from(feedbackTable)
        .leftJoin(users, eq(feedbackTable.userId, users.id))
        .orderBy(desc(feedbackTable.createdAt));

      res.json(feedback);
    } catch (error) {
      console.error("Get feedback error:", error);
      res.status(500).json({ message: "Failed to fetch feedback" });
    }
  });

  // Create Razorpay order
  app.post("/api/payments/create-order", requireAuth, async (req, res) => {
    try {
      const { amount, bookTitle, lenderName } = req.body;

      if (!amount || amount <= 0) {
        return res.status(400).json({ message: "Invalid amount" });
      }

      const options = {
        amount: amount, // Amount is already in paise from frontend
        currency: "INR",
        receipt: `receipt_${Date.now()}`,
        notes: {
          bookTitle: bookTitle || "Book Rental",
          lenderName: lenderName || "Unknown",
        }
      };

      const order = await razorpay.orders.create(options);
      
      res.json({
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
      });
    } catch (error) {
      console.error("Razorpay order creation error:", error);
      res.status(500).json({ message: "Failed to create payment order" });
    }
  });

  // Apply Brocks to payment calculation
  app.post("/api/payments/apply-brocks", requireAuth, async (req, res) => {
    try {
      const { offerType, brocksUsed, originalAmount } = req.body;
      const userId = req.session.userId!;

      const result = await storage.applyBrocksToPayment(userId, offerType, brocksUsed, originalAmount);
      
      res.json({
        originalAmount,
        newAmount: result.newAmount,
        brocksSpent: result.brocksSpent,
        discount: originalAmount - result.newAmount
      });
    } catch (error) {
      console.error("Apply Brocks to payment error:", error);
      res.status(500).json({ message: (error as Error).message || "Failed to apply Brocks to payment" });
    }
  });

  // Manual award credits (temporary endpoint for fixing existing users)
  app.post("/api/user/manual-award-credits", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const { credits, reason } = req.body;
      
      if (!credits || credits <= 0) {
        return res.status(400).json({ message: "Invalid credits amount" });
      }
      
      // Award credits directly
      await storage.awardCredits(userId, credits, reason || "Manual credit award");
      
      const updatedCredits = await storage.getUserCredits(userId);
      res.json({ message: "Credits awarded successfully", credits: updatedCredits });
    } catch (error) {
      console.error("Manual award credits error:", error);
      res.status(500).json({ message: "Failed to award credits" });
    }
  });

  // Get user recent rewards
  app.get("/api/user/recent-rewards", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const rewards = await storage.getUserRecentRewards(userId);
      res.json(rewards || []);
    } catch (error) {
      console.error("Get user recent rewards error:", error);
      res.status(500).json({ message: "Failed to fetch user recent rewards" });
    }
  });

  // Convert Brocks credits to commission-free days
  app.post("/api/user/convert-credits-to-commission-free", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      
      // Get conversion rates from settings
      const creditsRequiredSetting = await storage.getRewardSetting('credits_for_commission_free_days');
      const daysPerConversionSetting = await storage.getRewardSetting('commission_free_days_per_conversion');
      
      const creditsRequired = parseInt(creditsRequiredSetting?.settingValue || '20');
      const daysPerConversion = parseInt(daysPerConversionSetting?.settingValue || '7');
      
      // Check if user has enough credits
      const userCredits = await storage.getUserCredits(userId);
      if (!userCredits || userCredits.balance < creditsRequired) {
        return res.status(400).json({ message: "Insufficient credits for conversion" });
      }
      
      // Deduct credits
      const success = await storage.deductCredits(userId, creditsRequired, "Converted to commission-free days");
      if (!success) {
        return res.status(400).json({ message: "Failed to deduct credits" });
      }
      
      // Add commission-free period
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + daysPerConversion);
      
      await storage.createCommissionFreePeriod({
        userId,
        startDate: new Date(),
        endDate,
        daysRemaining: daysPerConversion,
        isActive: true,
        reason: `Converted ${creditsRequired} Brocks credits`
      });
      
      res.json({ 
        message: "Successfully converted credits to commission-free days",
        creditsDeducted: creditsRequired,
        daysAdded: daysPerConversion
      });
    } catch (error) {
      console.error("Convert credits to commission-free error:", error);
      res.status(500).json({ message: "Failed to convert credits" });
    }
  });

  // Convert Brocks credits to rupees
  app.post("/api/user/convert-credits-to-rupees", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      
      // Get conversion rates from settings
      const creditsRequiredSetting = await storage.getRewardSetting('credits_for_rupees_conversion');
      const rupeesPerCreditSetting = await storage.getRewardSetting('rupees_per_credit_conversion');
      
      const creditsRequired = parseInt(creditsRequiredSetting?.settingValue || '20');
      const rupeesPerCredit = parseFloat(rupeesPerCreditSetting?.settingValue || '1');
      
      // Check if user has enough credits
      const userCredits = await storage.getUserCredits(userId);
      if (!userCredits || userCredits.balance < creditsRequired) {
        return res.status(400).json({ message: "Insufficient credits for conversion" });
      }
      
      // Deduct credits
      const success = await storage.deductCredits(userId, creditsRequired, "Converted to rupees");
      if (!success) {
        return res.status(400).json({ message: "Failed to deduct credits" });
      }
      
      const rupeesEarned = creditsRequired * rupeesPerCredit;
      
      // Update user earnings (add to total earnings)
      const user = await storage.getUser(userId);
      if (user) {
        const currentEarnings = parseFloat(user.totalEarnings || '0');
        await storage.updateUser(userId, {
          totalEarnings: (currentEarnings + rupeesEarned).toString()
        });
      }
      
      res.json({ 
        message: "Successfully converted credits to rupees",
        creditsDeducted: creditsRequired,
        rupeesEarned: rupeesEarned
      });
    } catch (error) {
      console.error("Convert credits to rupees error:", error);
      res.status(500).json({ message: "Failed to convert credits" });
    }
  });

  // Get user earnings details
  app.get("/api/user/earnings", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      
      // Get all rentals where user was lender (earnings)
      const lentRentals = await storage.getRentalsByLender(userId);
      console.log(`💰 Earnings API - User ${userId} - Lent rentals:`, lentRentals.length);
      
      // Get all rentals where user was borrower (spendings)
      const borrowedRentals = await storage.getRentalsByBorrower(userId);
      console.log(`💰 Earnings API - User ${userId} - Borrowed rentals:`, borrowedRentals.length);
      
      // Get all credit transactions for Brocks earnings/spending
      const creditTransactions = await storage.getCreditTransactions(userId);
      console.log(`💰 Earnings API - User ${userId} - Credit transactions:`, creditTransactions.length);
      
      // Get all book purchases where user was buyer
      const bookPurchases = await storage.getPurchasesByBuyer(userId);
      console.log(`💰 Earnings API - User ${userId} - Book purchases:`, bookPurchases.length);
      
      // Get all book sales where user was seller
      const bookSales = await storage.getPurchasesBySeller(userId);
      console.log(`💰 Earnings API - User ${userId} - Book sales:`, bookSales.length);
      
      // Calculate money earnings from regular rentals
      const moneyEarned = lentRentals
        .reduce((sum, rental) => sum + parseFloat(rental.lenderAmount || '0'), 0);
      
      // Calculate money earnings from book sales (seller gets sale price minus platform fee)
      const salesMoneyEarned = bookSales
        .reduce((sum, sale) => {
          const salePrice = parseFloat(sale.salePrice || sale.purchasePrice || '0');
          const platformFee = parseFloat(sale.platformFee || '0');
          return sum + (salePrice - platformFee);
        }, 0);
      
      // Calculate money spending from regular rentals
      const moneySpent = borrowedRentals
        .filter(rental => !rental.paymentMethod || rental.paymentMethod === 'money')
        .reduce((sum, rental) => sum + parseFloat(rental.totalAmount || '0'), 0);
      
      // Calculate money spending from book purchases
      const purchaseMoneySpent = bookPurchases
        .filter(purchase => !purchase.paymentMethod || purchase.paymentMethod === 'money' || purchase.paymentMethod === 'card' || purchase.paymentMethod === 'upi')
        .reduce((sum, purchase) => sum + (parseFloat(purchase.salePrice || purchase.purchasePrice || '0') + parseFloat(purchase.platformFee || '0')), 0);
      
      // Calculate brocks spending from rental payments
      const brocksSpentRupees = borrowedRentals
        .filter(rental => rental.paymentMethod === 'brocks')
        .reduce((sum, rental) => sum + parseFloat(rental.totalAmount || '0'), 0);
      
      // Calculate brocks spending from book purchases
      const purchaseBrocksSpentRupees = bookPurchases
        .filter(purchase => purchase.paymentMethod === 'brocks')
        .reduce((sum, purchase) => sum + (parseFloat(purchase.salePrice || purchase.purchasePrice || '0') + parseFloat(purchase.platformFee || '0')), 0);
      
      // Convert brocks rupee amounts back to actual brocks using conversion rate
      const rupeesPerCreditSetting = await storage.getRewardSetting('rupees_per_credit_conversion');
      const rupeesPerCredit = parseFloat(rupeesPerCreditSetting?.settingValue || '0.1'); // 0.1 means 10 Brocks = 1 Rupee
      const creditsToRupeesRate = 1 / rupeesPerCredit; // Convert to Brocks per Rupee
      const brocksSpentFromRentals = Math.round(brocksSpentRupees * creditsToRupeesRate);
      const brocksSpentFromPurchases = Math.round(purchaseBrocksSpentRupees * creditsToRupeesRate);
      
      // Calculate brocks earnings and spending from credit transactions
      const brocksEarned = creditTransactions
        .filter(tx => tx.amount > 0)
        .reduce((sum, tx) => sum + tx.amount, 0);
      
      const brocksSpentFromTransactions = Math.abs(creditTransactions
        .filter(tx => tx.amount < 0)
        .reduce((sum, tx) => sum + tx.amount, 0));
      
      const totalBrocksSpent = brocksSpentFromRentals + brocksSpentFromPurchases + brocksSpentFromTransactions;

      // Add extension earnings for lent books (money only)
      const extensionEarnings = await db
        .select({ 
          total: sql<string>`COALESCE(SUM(CAST(${rentalExtensions.lenderEarnings} AS DECIMAL)), 0)` 
        })
        .from(rentalExtensions)
        .where(and(
          eq(rentalExtensions.lenderId, userId),
          eq(rentalExtensions.paymentStatus, 'completed')
        ));

      // Add extension spending for borrowed books (money only)
      const extensionSpending = await db
        .select({ 
          total: sql<string>`COALESCE(SUM(CAST(${rentalExtensions.extensionFee} AS DECIMAL)), 0)` 
        })
        .from(rentalExtensions)
        .where(and(
          eq(rentalExtensions.userId, userId),
          eq(rentalExtensions.paymentStatus, 'completed')
        ));

      const finalMoneyEarned = moneyEarned + parseFloat(extensionEarnings[0]?.total || '0') + salesMoneyEarned;
      const finalMoneySpent = moneySpent + parseFloat(extensionSpending[0]?.total || '0') + purchaseMoneySpent;
      
      // Legacy values for backwards compatibility
      const totalEarned = finalMoneyEarned;
      const totalSpent = finalMoneySpent + brocksSpentRupees + purchaseBrocksSpentRupees;
      
      console.log(`💰 Earnings API - Money: earned ${finalMoneyEarned}, spent ${finalMoneySpent}. Brocks: earned ${brocksEarned}, spent ${totalBrocksSpent}`);
      
      // Separate money earning transactions (rentals + extensions + book sales)
      const moneyEarningTransactions = [
        // Earnings from rental payments
        ...lentRentals
          .map(rental => ({
            id: rental.id,
            amount: parseFloat(rental.lenderAmount || '0'),
            type: 'rental_earning',
            description: `Earned from "${rental.book.title}" rental`,
            createdAt: rental.startDate,
            source: 'rental',
            bookTitle: rental.book.title,
            borrowerName: rental.borrower.name
          })),
        // Earnings from book sales
        ...bookSales
          .map(sale => ({
            id: sale.id,
            amount: parseFloat(sale.salePrice || sale.purchasePrice || '0') - parseFloat(sale.platformFee || '0'),
            type: 'book_sale',
            description: `Sold "${sale.book.title}"`,
            createdAt: sale.createdAt,
            source: 'sale',
            bookTitle: sale.book.title,
            buyerName: sale.buyer.name
          }))
      ];

      // Separate money spending transactions (rentals + extensions + book purchases)
      const moneySpendingTransactions = [
        // Spending from rental payments with money
        ...borrowedRentals
          .filter(rental => !rental.paymentMethod || rental.paymentMethod === 'money')
          .map(rental => ({
            id: rental.id,
            amount: parseFloat(rental.totalAmount || '0'),
            type: 'rental_payment',
            description: `Paid for "${rental.book.title}" rental`,
            createdAt: rental.startDate,
            source: 'rental',
            bookTitle: rental.book.title,
            lenderName: rental.lender.name
          })),
        // Spending from book purchases with money
        ...bookPurchases
          .filter(purchase => !purchase.paymentMethod || purchase.paymentMethod === 'money' || purchase.paymentMethod === 'card' || purchase.paymentMethod === 'upi')
          .map(purchase => ({
            id: purchase.id,
            amount: parseFloat(purchase.salePrice || purchase.purchasePrice || '0') + parseFloat(purchase.platformFee || '0'),
            type: 'book_purchase',
            description: `Purchased "${purchase.book.title}"`,
            createdAt: purchase.createdAt,
            source: 'purchase',
            bookTitle: purchase.book.title,
            sellerName: purchase.seller.name
          }))
      ];
      
      // Separate brocks earning transactions by type
      const brocksEarningTransactions = creditTransactions
        .filter(tx => tx.amount > 0)
        .map(tx => ({
          id: tx.id,
          amount: tx.amount,
          type: tx.type,
          description: tx.description,
          createdAt: tx.createdAt
        }));
      
      // Separate brocks spending transactions (rentals + purchases + other spending)
      const brocksSpendingTransactions = [
        // Spending from credit transactions
        ...creditTransactions
          .filter(tx => tx.amount < 0)
          .map(tx => ({
            id: tx.id,
            amount: Math.abs(tx.amount),
            type: tx.type,
            description: tx.description,
            createdAt: tx.createdAt,
            source: 'transaction'
          })),
        // Spending from rental payments with brocks
        ...borrowedRentals
          .filter(rental => rental.paymentMethod === 'brocks')
          .map(rental => ({
            id: rental.id,
            amount: Math.round(parseFloat(rental.totalAmount || '0') * creditsToRupeesRate),
            type: 'rental_payment',
            description: `Paid for "${rental.book.title}" rental`,
            createdAt: rental.startDate,
            source: 'rental',
            bookTitle: rental.book.title,
            lenderName: rental.lender.name
          })),
        // Spending from book purchases with brocks
        ...bookPurchases
          .filter(purchase => purchase.paymentMethod === 'brocks')
          .map(purchase => ({
            id: purchase.id,
            amount: Math.round((parseFloat(purchase.salePrice || purchase.purchasePrice || '0') + parseFloat(purchase.platformFee || '0')) * creditsToRupeesRate),
            type: 'book_purchase',
            description: `Purchased "${purchase.book.title}"`,
            createdAt: purchase.createdAt,
            source: 'purchase',
            bookTitle: purchase.book.title,
            sellerName: purchase.seller.name
          }))
      ];
      
      res.json({
        // Legacy fields for backwards compatibility
        totalEarned,
        totalSpent,
        moneySpent: finalMoneySpent,
        brocksSpent: totalBrocksSpent,
        
        // New separated data
        money: {
          earned: finalMoneyEarned,
          spent: finalMoneySpent,
          netWorth: finalMoneyEarned - finalMoneySpent,
          earningTransactions: moneyEarningTransactions,
          spendingTransactions: moneySpendingTransactions
        },
        brocks: {
          earned: brocksEarned,
          spent: totalBrocksSpent,
          netWorth: brocksEarned - totalBrocksSpent,
          earningTransactions: brocksEarningTransactions,
          spendingTransactions: brocksSpendingTransactions
        },
        
        lentRentals: lentRentals.map(rental => ({
          id: rental.id,
          bookTitle: rental.book.title,
          borrowerName: rental.borrower.name,
          amount: parseFloat(rental.lenderAmount || '0'),
          status: rental.status,
          startDate: rental.startDate,
          endDate: rental.endDate,
          actualReturnDate: rental.actualReturnDate
        })),
        borrowedRentals: borrowedRentals.map(rental => ({
          id: rental.id,
          bookTitle: rental.book.title,
          lenderName: rental.lender.name,
          amount: parseFloat(rental.totalAmount || '0'),
          paymentMethod: rental.paymentMethod || 'money',
          brocksAmount: rental.paymentMethod === 'brocks' 
            ? Math.round(parseFloat(rental.totalAmount || '0') * creditsToRupeesRate)
            : 0,
          status: rental.status,
          startDate: rental.startDate,
          endDate: rental.endDate,
          actualReturnDate: rental.actualReturnDate
        }))
      });
    } catch (error) {
      console.error("Get earnings error:", error);
      res.status(500).json({ message: "Failed to fetch earnings data" });
    }
  });

  // Send reminder to borrower
  app.post("/api/rentals/:id/send-reminder", requireAuth, async (req, res) => {
    try {
      const rentalId = parseInt(req.params.id);
      const rental = await storage.getRental(rentalId);
      
      if (!rental || rental.lenderId !== req.session.userId!) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      // Calculate days until due
      const daysUntilDue = Math.ceil((new Date(rental.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
      
      let reminderMessage;
      if (daysUntilDue > 0) {
        reminderMessage = `Reminder: "${rental.book.title}" is due in ${daysUntilDue} day${daysUntilDue > 1 ? 's' : ''}. Please prepare to return it soon.`;
      } else if (daysUntilDue === 0) {
        reminderMessage = `Reminder: "${rental.book.title}" is due today. Please return it as soon as possible.`;
      } else {
        reminderMessage = `Urgent: "${rental.book.title}" was due ${Math.abs(daysUntilDue)} day${Math.abs(daysUntilDue) > 1 ? 's' : ''} ago. Please return it immediately.`;
      }

      // Create notification for borrower
      await createNotificationWithEmail({
        userId: rental.borrowerId,
        title: "Return Reminder",
        message: reminderMessage,
        type: "reminder",
        data: JSON.stringify({
          rentalId: rentalId,
          bookTitle: rental.book.title,
          dueDate: rental.endDate,
          daysUntilDue: daysUntilDue
        })
      });

      res.json({ message: "Reminder sent successfully" });
    } catch (error) {
      console.error("Send reminder error:", error);
      res.status(500).json({ message: "Failed to send reminder" });
    }
  });



  // Admin routes
  app.get("/api/admin/stats", requireAuth, async (req, res) => {
    try {
      // Check if user is admin
      const user = await storage.getUser(req.session.userId!);
      if (!user?.isAdmin && user?.email !== 'abhinic@gmail.com') {
        return res.status(403).json({ message: "Admin access required" });
      }

      // Get platform statistics
      const totalUsers = await storage.getTotalUsers();
      const totalBooks = await storage.getTotalBooks();  
      const totalSocieties = await storage.getTotalSocieties();
      const activeRentals = await storage.getActiveRentalsCount();

      res.json({
        totalUsers,
        totalBooks,
        totalSocieties,
        activeRentals
      });
    } catch (error) {
      console.error("Admin stats error:", error);
      res.status(500).json({ message: "Failed to fetch admin statistics" });
    }
  });

  app.get("/api/admin/hubs", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user?.isAdmin && user?.email !== 'abhinic@gmail.com') {
        return res.status(403).json({ message: "Admin access required" });
      }

      // Get all active/approved societies/hubs (excluding pending and rejected)
      const allHubs = await db.select().from(societies).where(not(eq(societies.status, 'pending'))).orderBy(desc(societies.createdAt));
      res.json(allHubs);
    } catch (error) {
      console.error("Admin hubs error:", error);
      res.status(500).json({ message: "Failed to fetch hubs" });
    }
  });

  app.post("/api/admin/geocode-hubs", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user?.isAdmin && user?.email !== 'abhinic@gmail.com') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { geocodeWithDelay } = await import('./utils/geocoding.js');
      
      const allHubs = await db.select().from(societies).where(not(eq(societies.status, 'pending')));
      
      let updated = 0;
      let errors: string[] = [];
      
      for (const hub of allHubs) {
        if (!hub.latitude || !hub.longitude) {
          if (hub.location) {
            const coords = await geocodeWithDelay(hub.location, 1000);
            if (coords) {
              await db.update(societies)
                .set({ 
                  latitude: coords.latitude, 
                  longitude: coords.longitude 
                })
                .where(eq(societies.id, hub.id));
              console.log(`✅ Geocoded "${hub.name}": ${coords.latitude}, ${coords.longitude}`);
              updated++;
            } else {
              console.log(`❌ Could not geocode "${hub.name}": ${hub.location}`);
              errors.push(hub.name);
            }
          }
        }
      }
      
      res.json({ 
        message: `Successfully geocoded ${updated} hubs`,
        updated,
        total: allHubs.length,
        errors 
      });
    } catch (error) {
      console.error("Geocoding error:", error);
      res.status(500).json({ message: "Failed to geocode hubs" });
    }
  });

  app.get("/api/admin/society-requests", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user?.isAdmin && user?.email !== 'abhinic@gmail.com') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const requests = await storage.getSocietyRequests();
      res.json(requests);
    } catch (error) {
      console.error("Society requests error:", error);
      res.status(500).json({ message: "Failed to fetch society requests" });
    }
  });

  app.post("/api/admin/society-requests/review", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user?.isAdmin && user?.email !== 'abhinic@gmail.com') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { requestId, approved, reason } = req.body;
      console.log('Admin Panel: Reviewing society request', { requestId, approved, reason, userEmail: user?.email, isAdmin: user?.isAdmin });
      
      // Get the request details before processing
      const allRequests = await db.select().from(societyRequests).where(eq(societyRequests.id, requestId));
      const request = allRequests[0];
      
      if (!request) {
        return res.status(404).json({ message: "Request not found" });
      }
      
      // Process the review (this handles society creation, joining, and status update)
      await storage.reviewSocietyRequest(requestId, approved, reason);
      
      // Send notifications
      if (approved) {
        // For approved requests, get the created society
        const createdSocieties = await db.select().from(societies)
          .where(and(
            eq(societies.name, request.name),
            eq(societies.city, request.city),
            eq(societies.createdBy, request.requestedBy)
          ))
          .orderBy(desc(societies.createdAt))
          .limit(1);
        
        const society = createdSocieties[0];
        
        if (society) {
          await createNotificationWithEmail({
            userId: request.requestedBy,
            title: "Society Request Approved",
            message: `Your society "${request.name}" has been approved and created successfully!`,
            type: "society_approved",
            data: JSON.stringify({
              societyId: society.id,
              societyName: society.name,
              societyCode: society.code
            })
          });
        }
      } else {
        // Send rejection notification
        await createNotificationWithEmail({
          userId: request.requestedBy,
          title: "Society Request Declined",
          message: `Your society request for "${request.name}" has been declined. ${reason ? `Reason: ${reason}` : ''}`,
          type: "society_declined",
          data: JSON.stringify({
            requestId: requestId,
            reason: reason || null
          })
        });
      }
      
      res.json({ message: "Society request reviewed successfully" });
    } catch (error) {
      console.error("Review society request error:", error);
      res.status(500).json({ message: "Failed to review society request" });
    }
  });

  app.post("/api/admin/referral-rewards", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user?.isAdmin && user?.email !== 'abhinic@gmail.com') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const reward = await storage.createReferralReward(req.body);
      res.json(reward);
    } catch (error) {
      console.error("Create referral reward error:", error);
      res.status(500).json({ message: "Failed to create referral reward" });
    }
  });

  app.post("/api/rentals/borrow", requireAuth, async (req, res) => {
    try {
      const { bookId, duration, paymentMethod, appliedBrocks, paymentId, orderId } = borrowBookSchema.parse(req.body);
      
      if (paymentId && orderId) {
        console.log(`💳 Razorpay payment received for borrow - Payment ID: ${paymentId}, Order ID: ${orderId}`);
      }
      
      const book = await storage.getBook(bookId);
      if (!book) {
        return res.status(404).json({ message: "Book not found" });
      }

      if (!book.isAvailable) {
        return res.status(400).json({ message: "Book is not available for borrowing" });
      }

      if (book.ownerId === req.session.userId!) {
        return res.status(400).json({ message: "You cannot borrow your own book" });
      }

      // Get current platform settings
      const settings = await getPlatformSettings();
      
      // Calculate costs using dynamic settings
      const dailyFee = parseFloat(book.dailyFee);
      const rentalFee = dailyFee * duration; // Amount lender should receive
      const platformFeeRate = settings.commissionRate / 100; // Convert percentage to decimal
      let platformFee = rentalFee * platformFeeRate; // Platform commission on top
      let lenderAmount = rentalFee; // Lender gets full rental amount
      const securityDeposit = settings.securityDeposit;
      let totalAmount = rentalFee + platformFee + securityDeposit; // Borrower pays rental + commission + deposit

      // Handle Brocks payment method
      if (paymentMethod === 'brocks') {
        // Get Brocks conversion rates from admin settings - use new format
        const rupeesPerCreditSetting = await storage.getRewardSetting('rupees_per_credit_conversion');
        const rupeesPerCredit = parseFloat(rupeesPerCreditSetting?.settingValue || '0.1'); // 0.1 means 10 Brocks = 1 Rupee
        const creditsToRupeesRate = 1 / rupeesPerCredit; // Convert to Brocks per Rupee (should be 10)
        
        // Check if user has sufficient Brocks balance
        const userCredits = await storage.getUserCredits(req.session.userId!);
        const brocksRequired = Math.round(totalAmount * creditsToRupeesRate); // Convert rupees to Brocks using admin rate
        
        if (!userCredits || userCredits.balance < brocksRequired) {
          return res.status(400).json({ message: "Insufficient Brocks balance for this transaction" });
        }
        
        // Deduct Brocks from borrower
        const deductionSuccess = await storage.deductCredits(req.session.userId!, brocksRequired, `Book rental payment - ${book.title}`);
        
        if (!deductionSuccess) {
          return res.status(400).json({ message: "Failed to process Brocks payment" });
        }
        
        // Award Brocks to lender (minus platform commission) - convert lender amount to Brocks
        const lenderBrocksAmount = Math.round(lenderAmount * creditsToRupeesRate);
        await storage.awardCredits(book.ownerId, lenderBrocksAmount, `Book rental earnings - ${book.title}`);
        
        console.log(`💎 Brocks payment processed: ${brocksRequired} Brocks deducted from borrower, ${lenderBrocksAmount} Brocks awarded to lender (rate: ${creditsToRupeesRate} Brocks per Rupee)`);
      }

      // Apply Brocks discount if provided and deduct credits (for non-Brocks payments)
      if (appliedBrocks && appliedBrocks.brocksUsed > 0 && paymentMethod !== 'brocks') {
        // First, deduct the Brocks credits from user's balance
        const deductionSuccess = await storage.deductCredits(req.session.userId!, appliedBrocks.brocksUsed, `Used for rental discount - ${book.title}`);
        
        if (!deductionSuccess) {
          return res.status(400).json({ message: "Insufficient Brocks credits for the applied discount" });
        }
        
        if (appliedBrocks.offerType === 'rupees') {
          totalAmount = Math.max(0, totalAmount - appliedBrocks.discountAmount);
          console.log(`💰 Applied ${appliedBrocks.brocksUsed} Brocks for ₹${appliedBrocks.discountAmount} discount. New total: ₹${totalAmount}`);
        } else if (appliedBrocks.offerType === 'commission-free') {
          // For commission-free, we eliminate the platform fee
          totalAmount = rentalFee + securityDeposit; // Remove platform fee from total
          lenderAmount = rentalFee; // Lender still gets full rental amount
          platformFee = 0; // No platform fee
          console.log(`🎁 Applied ${appliedBrocks.brocksUsed} Brocks for commission-free benefits. Platform fee waived: ₹${platformFeeRate * rentalFee}`);
        }
      }

      const endDate = new Date();
      endDate.setDate(endDate.getDate() + duration);

      const rentalData = {
        bookId,
        borrowerId: req.session.userId!,
        lenderId: book.ownerId,
        societyId: book.societyId,
        endDate,
        totalAmount: totalAmount.toString(),
        platformFee: platformFee.toString(),
        lenderAmount: lenderAmount.toString(),
        securityDeposit: securityDeposit.toString(),
        status: 'active',
        paymentStatus: 'completed', // Simulated payment success
        paymentMethod: paymentMethod, // Store whether payment was made with 'money' or 'brocks'
      };

      const rental = await storage.createRental(rentalData);
      
      // Mark book as unavailable
      await storage.updateBook(bookId, { isAvailable: false });
      
      // Award Brocks credits for borrow and lend transactions
      const creditsPerBorrowSetting = await storage.getRewardSetting('credits_per_borrow');
      const creditsPerLendSetting = await storage.getRewardSetting('credits_per_lend');
      
      const creditsPerBorrow = parseInt(creditsPerBorrowSetting?.settingValue || '5');
      const creditsPerLend = parseInt(creditsPerLendSetting?.settingValue || '5');
      
      // Award credits to borrower
      if (creditsPerBorrow > 0) {
        try {
          await storage.awardCredits(req.session.userId!, creditsPerBorrow, "Borrowed a book");
          console.log(`✅ Successfully awarded ${creditsPerBorrow} credits to borrower ${req.session.userId!}`);
        } catch (error) {
          console.error(`❌ Failed to award credits to borrower:`, error);
        }
      }
      
      // Award credits to lender
      if (creditsPerLend > 0) {
        try {
          await storage.awardCredits(book.ownerId, creditsPerLend, "Lent a book");
          console.log(`✅ Successfully awarded ${creditsPerLend} credits to lender ${book.ownerId}`);
        } catch (error) {
          console.error(`❌ Failed to award credits to lender:`, error);
        }
      }
      
      // Get borrower and owner details for collection instructions
      const borrower = await storage.getUser(req.session.userId!);
      const owner = await storage.getUser(book.ownerId);
      
      if (!borrower || !owner) {
        return res.status(500).json({ message: "User details not found" });
      }

      // Create notification for lender with borrower collection details
      await createNotificationWithEmail({
        userId: book.ownerId,
        title: "Book Borrowed - Collection Pending",
        message: `Your book "${book.title}" has been borrowed by ${borrower.name}. They will collect it from ${owner.flatWing}, ${owner.buildingName}. Contact: ${borrower.phone || 'No phone provided'}`,
        type: "rental"
      });

      // Create notification for borrower with owner's address and phone
      await createNotificationWithEmail({
        userId: req.session.userId!,
        title: "Book Borrowed Successfully",
        message: `You have borrowed "${book.title}" from ${owner.name}. Collect from: ${owner.flatWing}, ${owner.buildingName}, ${owner.detailedAddress || ''}. Contact: ${owner.phone || 'No phone provided'}`,
        type: "rental"
      });

      // Return rental data with owner collection details
      res.json({
        rental,
        collectionInfo: {
          ownerName: owner.name,
          flatWing: owner.flatWing,
          buildingName: owner.buildingName,
          detailedAddress: owner.detailedAddress,
          phone: owner.phone
        }
      });
    } catch (error) {
      console.error("Borrow book error:", error);
      res.status(400).json({ message: "Failed to borrow book" });
    }
  });

  app.post("/api/purchases/buy", requireAuth, async (req, res) => {
    try {
      const { bookId, paymentMethod, paymentId, orderId } = buyBookSchema.parse(req.body);
      
      if (paymentId && orderId) {
        console.log(`💳 Razorpay payment received for purchase - Payment ID: ${paymentId}, Order ID: ${orderId}`);
      }
      
      const book = await storage.getBook(bookId);
      if (!book) {
        return res.status(404).json({ message: "Book not found" });
      }

      if (!book.sellingPrice) {
        return res.status(400).json({ message: "This book is not for sale" });
      }

      if (!book.isAvailable) {
        return res.status(400).json({ message: "Book is not available for purchase" });
      }

      if (book.ownerId === req.session.userId!) {
        return res.status(400).json({ message: "You cannot buy your own book" });
      }

      // Get current platform settings
      const settings = await getPlatformSettings();
      
      // Calculate costs
      const salePrice = parseFloat(book.sellingPrice);
      const platformFeeRate = settings.commissionRate / 100;
      const platformFee = salePrice * platformFeeRate;
      const sellerAmount = salePrice - platformFee;

      const purchaseData = {
        bookId,
        buyerId: req.session.userId!,
        sellerId: book.ownerId,
        societyId: book.societyId,
        salePrice: salePrice.toString(),
        platformFee: platformFee.toString(),
        sellerAmount: sellerAmount.toString(),
        paymentStatus: 'completed',
        paymentMethod: paymentMethod,
      };

      const purchase = await storage.createBookPurchase(purchaseData);
      
      // Mark book as unavailable
      await storage.updateBook(bookId, { isAvailable: false });
      
      // Get buyer and seller details
      const buyer = await storage.getUser(req.session.userId!);
      const seller = await storage.getUser(book.ownerId);
      
      if (!buyer || !seller) {
        return res.status(500).json({ message: "User details not found" });
      }

      // Create notification for seller
      await createNotificationWithEmail({
        userId: book.ownerId,
        title: "Book Sold",
        message: `Your book "${book.title}" has been sold to ${buyer.name}. Sale amount: ₹${sellerAmount.toFixed(2)}`,
        type: "purchase"
      });

      // Create notification for buyer
      await createNotificationWithEmail({
        userId: req.session.userId!,
        title: "Purchase Confirmed",
        message: `You have successfully purchased "${book.title}" for ₹${salePrice.toFixed(2)}. Contact seller ${seller.name} at ${seller.phone} to collect the book.`,
        type: "purchase"
      });

      res.json({
        purchase,
        sellerInfo: {
          sellerName: seller.name,
          flatWing: seller.flatWing,
          buildingName: seller.buildingName,
          detailedAddress: seller.detailedAddress,
          phone: seller.phone
        }
      });
    } catch (error) {
      console.error("Buy book error:", error);
      res.status(400).json({ message: "Failed to purchase book" });
    }
  });

  app.get("/api/purchases/bought", requireAuth, async (req, res) => {
    try {
      const purchases = await storage.getPurchasesByBuyer(req.session.userId!);
      res.json(purchases);
    } catch (error) {
      console.error("Get bought books error:", error);
      res.status(500).json({ message: "Failed to fetch purchased books" });
    }
  });

  app.get("/api/purchases/sold", requireAuth, async (req, res) => {
    try {
      const purchases = await storage.getPurchasesBySeller(req.session.userId!);
      res.json(purchases);
    } catch (error) {
      console.error("Get sold books error:", error);
      res.status(500).json({ message: "Failed to fetch sold books" });
    }
  });

  app.patch("/api/rentals/:id/return", requireAuth, async (req, res) => {
    try {
      const rentalId = parseInt(req.params.id);
      const rental = await storage.getRental(rentalId);
      
      if (!rental) {
        return res.status(404).json({ message: "Rental not found" });
      }

      if (rental.borrowerId !== req.session.userId! && rental.lenderId !== req.session.userId!) {
        return res.status(403).json({ message: "You can only return rentals you're involved in" });
      }

      const updatedRental = await storage.updateRental(rentalId, {
        status: 'returned',
        actualReturnDate: new Date(),
      });

      // Create notification for the other party
      const notificationUserId = rental.borrowerId === req.session.userId! 
        ? rental.lenderId 
        : rental.borrowerId;
      
      await createNotificationWithEmail({
        userId: notificationUserId,
        title: "Book Returned",
        message: `The book "${rental.book.title}" has been returned`,
        type: "return"
      });

      res.json(updatedRental);
    } catch (error) {
      console.error("Return book error:", error);
      res.status(400).json({ message: "Failed to return book" });
    }
  });

  // Notification routes
  app.get("/api/notifications", requireAuth, async (req, res) => {
    try {
      const notifications = await storage.getNotificationsByUser(req.session.userId!);
      res.json(notifications);
    } catch (error) {
      console.error("Get notifications error:", error);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  app.patch("/api/notifications/:id/read", requireAuth, async (req, res) => {
    try {
      const notificationId = parseInt(req.params.id);
      const success = await storage.markNotificationAsRead(notificationId);
      
      if (!success) {
        return res.status(404).json({ message: "Notification not found" });
      }

      res.json({ message: "Notification marked as read" });
    } catch (error) {
      console.error("Mark notification read error:", error);
      res.status(400).json({ message: "Failed to mark notification as read" });
    }
  });

  // User stats
  app.get("/api/user/stats", requireAuth, async (req, res) => {
    try {
      const stats = await storage.getUserStats(req.session.userId!);
      res.json(stats);
    } catch (error) {
      console.error("Get user stats error:", error);
      res.status(500).json({ message: "Failed to fetch user stats" });
    }
  });

  // Brocks purchase endpoint
  app.post("/api/brocks/purchase", requireAuth, async (req, res) => {
    try {
      const { packageId, paymentMethod } = req.body;
      
      // Get package from database
      const selectedPackage = await storage.getBrocksPackageById(parseInt(packageId));
      if (!selectedPackage) {
        return res.status(400).json({ message: "Invalid package selected" });
      }
      
      const totalBrocks = selectedPackage.brocks + (selectedPackage.bonus || 0);
      
      // Simulate payment processing (in real app, integrate with payment gateway)
      console.log(`💳 Processing payment: ₹${selectedPackage.price} for ${totalBrocks} Brocks via ${paymentMethod}`);
      
      // Award Brocks credits to user
      await storage.awardCredits(
        req.session.userId!, 
        totalBrocks, 
        `Purchased ${selectedPackage.name} - ${selectedPackage.brocks} + ${selectedPackage.bonus || 0} bonus Brocks`
      );
      
      console.log(`🎁 Awarded ${totalBrocks} Brocks to user ${req.session.userId!} via purchase`);
      
      res.json({
        success: true,
        brocksAwarded: totalBrocks,
        packageName: selectedPackage.name,
        transactionId: `txn_${Date.now()}`,
        message: "Payment processed successfully"
      });
    } catch (error) {
      console.error("Brocks purchase error:", error);
      res.status(500).json({ message: "Failed to process purchase" });
    }
  });

  // Brocks leaderboard endpoint
  app.get("/api/brocks/leaderboard", requireAuth, async (req, res) => {
    try {
      const leaderboard = await storage.getBrocksLeaderboard();
      res.json(leaderboard);
    } catch (error) {
      console.error("Brocks leaderboard error:", error);
      res.status(500).json({ message: "Failed to fetch leaderboard" });
    }
  });

  // Messaging endpoints
  app.get("/api/messages/conversations", requireAuth, async (req, res) => {
    try {
      const conversations = await storage.getConversations(req.session.userId!);
      res.json(conversations);
    } catch (error) {
      console.error("Get conversations error:", error);
      res.status(500).json({ message: "Failed to fetch conversations" });
    }
  });

  app.get("/api/messages/:userId", requireAuth, async (req, res) => {
    try {
      const otherUserId = parseInt(req.params.userId);
      const messages = await storage.getMessages(req.session.userId!, otherUserId);
      res.json(messages);
    } catch (error) {
      console.error("Get messages error:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  app.post("/api/messages", requireAuth, async (req, res) => {
    try {
      const { recipientId, content } = req.body;
      const message = await storage.createMessage({
        senderId: req.session.userId!,
        recipientId,
        content,
        read: false
      });
      res.json(message);
    } catch (error) {
      console.error("Send message error:", error);
      res.status(500).json({ message: "Failed to send message" });
    }
  });

  app.post("/api/messages/mark-read/:userId", requireAuth, async (req, res) => {
    try {
      const otherUserId = parseInt(req.params.userId);
      await storage.markMessagesAsRead(req.session.userId!, otherUserId);
      res.json({ message: "Messages marked as read" });
    } catch (error) {
      console.error("Mark messages read error:", error);
      res.status(500).json({ message: "Failed to mark messages as read" });
    }
  });

  // Admin settings routes
  // Public platform settings endpoint (no auth required)
  app.get("/api/platform/settings", async (req, res) => {
    try {
      const settings = await getPlatformSettings();
      res.json(settings);
    } catch (error) {
      console.error("Get platform settings error:", error);
      res.status(500).json({ message: "Failed to fetch settings" });
    }
  });

  app.get("/api/admin/settings", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const settings = await getPlatformSettings();
      res.json(settings);
    } catch (error) {
      console.error("Get admin settings error:", error);
      res.status(500).json({ message: "Failed to fetch settings" });
    }
  });

  app.post("/api/admin/settings", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { commissionRate, securityDeposit, minApartments, maxRentalDays, extensionFeePerDay } = req.body;

      console.log('Updating platform settings:', { commissionRate, securityDeposit, minApartments, maxRentalDays, extensionFeePerDay });

      const updateResult = await pool.query(`
        UPDATE platform_settings 
        SET commission_rate = $1, security_deposit = $2, min_apartments = $3, max_rental_days = $4, extension_fee_per_day = $5, updated_at = CURRENT_TIMESTAMP
        WHERE id = 1
        RETURNING *
      `, [commissionRate, securityDeposit, minApartments, maxRentalDays, extensionFeePerDay || 10]);

      console.log('Update result:', updateResult.rows[0]);

      // Clear any cached platform settings to force refresh across the platform
      console.log('✅ Platform settings updated successfully. All platform components will use new values.');

      res.json({ message: "Settings saved successfully" });
    } catch (error) {
      console.error("Update admin settings error:", error);
      res.status(500).json({ message: "Failed to save settings" });
    }
  });



  // Society requests management
  app.get("/api/admin/society-requests", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const requests = await storage.getSocietyRequests();
      res.json(requests);
    } catch (error) {
      console.error("Get society requests error:", error);
      res.status(500).json({ message: "Failed to fetch society requests" });
    }
  });

  // Extension payment processing
  app.post("/api/rentals/extensions/calculate", requireAuth, async (req, res) => {
    try {
      const { rentalId, extensionDays } = req.body;
      
      const rental = await storage.getRental(rentalId);
      if (!rental) {
        return res.status(404).json({ message: "Rental not found" });
      }

      // Only the borrower can request extension
      if (rental.borrowerId !== req.session.userId) {
        return res.status(403).json({ message: "Not authorized" });
      }

      const settings = await getPlatformSettings();
      // Use the book's actual daily fee for extension calculation
      const extensionFeePerDay = parseFloat(rental.book.dailyFee);
      const commissionRate = parseFloat(settings.commissionRate) / 100;

      const extensionRentalFee = extensionFeePerDay * extensionDays;
      const platformCommission = extensionRentalFee * commissionRate;
      const lenderEarnings = extensionRentalFee; // Lender gets full extension amount
      const totalExtensionFee = extensionRentalFee + platformCommission; // Borrower pays rental + commission

      console.log('Extension calculation:', {
        bookTitle: rental.book.title,
        bookDailyFee: rental.book.dailyFee,
        extensionDays,
        extensionFeePerDay,
        extensionRentalFee,
        platformCommission,
        lenderEarnings,
        totalExtensionFee
      });

      res.json({
        extensionDays,
        extensionFeePerDay,
        totalExtensionFee,
        platformCommission,
        lenderEarnings,
        commissionRate: settings.commissionRate
      });
    } catch (error) {
      console.error("Extension calculation error:", error);
      res.status(500).json({ message: "Failed to calculate extension cost" });
    }
  });

  app.post("/api/rentals/extensions/create-payment", requireAuth, async (req, res) => {
    try {
      const { rentalId, extensionDays, totalAmount } = req.body;
      
      const rental = await storage.getRental(rentalId);
      if (!rental) {
        return res.status(404).json({ message: "Rental not found" });
      }

      if (rental.borrowerId !== req.session.userId) {
        return res.status(403).json({ message: "Not authorized" });
      }

      // Create dummy payment intent (simulating Stripe/Razorpay)
      const paymentId = `ext_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      res.json({
        paymentId,
        clientSecret: `${paymentId}_secret`,
        amount: totalAmount
      });
    } catch (error) {
      console.error("Extension payment creation error:", error);
      res.status(500).json({ message: "Failed to create payment intent" });
    }
  });

  // Create extension request (replaces direct payment processing)
  app.post("/api/rentals/extensions/request", requireAuth, async (req, res) => {
    try {
      const { rentalId, extensionDays } = req.body;
      const userId = req.session.userId!;
      
      console.log('Extension request:', { rentalId, extensionDays, userId });

      if (!rentalId || !extensionDays) {
        return res.status(400).json({ 
          message: "Missing required fields: rentalId, extensionDays" 
        });
      }

      // Get rental details
      const rental = await storage.getRental(rentalId);
      if (!rental) {
        return res.status(404).json({ message: "Rental not found" });
      }

      // Verify user is the borrower
      if (rental.borrowerId !== userId) {
        return res.status(403).json({ message: "Unauthorized - you are not the borrower" });
      }

      // Get platform settings
      const settings = await getPlatformSettings();
      const commissionRate = parseFloat(settings.commissionRate) / 100;

      // Calculate extension costs using the book's actual daily fee
      const extensionFeePerDay = parseFloat(rental.book.dailyFee);
      const extensionRentalFee = extensionFeePerDay * extensionDays;
      const platformCommission = extensionRentalFee * commissionRate;
      const lenderEarnings = extensionRentalFee; // Lender gets full extension amount
      const totalExtensionFee = extensionRentalFee + platformCommission; // Borrower pays rental + commission

      // Calculate new due date
      let currentDueDate = rental.dueDate ? new Date(rental.dueDate) : new Date(rental.endDate);
      if (!currentDueDate || isNaN(currentDueDate.getTime())) {
        currentDueDate = rental.endDate ? new Date(rental.endDate) : new Date();
      }
      
      const newDueDate = new Date(currentDueDate);
      newDueDate.setDate(currentDueDate.getDate() + extensionDays);

      // Create extension request
      const extensionRequest = await storage.createExtensionRequest({
        rentalId,
        requesterId: userId,
        ownerId: rental.lenderId,
        extensionDays,
        extensionFee: totalExtensionFee.toString(),
        platformCommission: platformCommission.toString(),
        lenderEarnings: lenderEarnings.toString(),
        status: 'pending',
        newDueDate
      });

      // Create notification for the book owner
      await createNotificationWithEmail({
        userId: rental.lenderId,
        title: "Extension Request Received",
        message: `${rental.borrower.name} wants to extend "${rental.book.title}" for ${extensionDays} days. You'll earn ₹${lenderEarnings.toFixed(2)}.`,
        type: "extension_request",
        data: JSON.stringify({ requestId: extensionRequest.id })
      });

      res.json({
        success: true,
        message: "Extension request sent to book owner",
        requestId: extensionRequest.id,
        extensionFee: totalExtensionFee,
        lenderEarnings
      });

    } catch (error: any) {
      console.error('Extension request error:', error);
      res.status(500).json({ 
        message: "Failed to create extension request",
        error: error.message 
      });
    }
  });

  // Get extension requests for owner
  app.get("/api/rentals/extensions/requests", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const requests = await storage.getExtensionRequestsByOwner(userId);
      
      // Enrich requests with rental and book details
      const enrichedRequests = await Promise.all(
        requests.map(async (request) => {
          const rental = await storage.getRental(request.rentalId);
          return {
            ...request,
            rental: rental ? {
              id: rental.id,
              book: rental.book,
              borrower: rental.borrower
            } : null
          };
        })
      );
      
      res.json(enrichedRequests);
    } catch (error: any) {
      console.error('Error fetching extension requests:', error);
      res.status(500).json({ message: "Failed to fetch extension requests" });
    }
  });

  // Approve extension request
  app.post("/api/rentals/extensions/requests/:requestId/approve", requireAuth, async (req, res) => {
    try {
      const requestId = parseInt(req.params.requestId);
      const userId = req.session.userId!;
      
      const request = await storage.getExtensionRequest(requestId);
      if (!request) {
        return res.status(404).json({ message: "Extension request not found" });
      }

      if (request.ownerId !== userId) {
        return res.status(403).json({ message: "Unauthorized - you are not the book owner" });
      }

      if (request.status !== 'pending') {
        return res.status(400).json({ message: "Request already processed" });
      }

      // Approve the request
      await storage.approveExtensionRequest(requestId);

      // Get rental details for notifications
      const rental = await storage.getRental(request.rentalId);
      if (rental) {
        // Create notification for borrower about approval with payment details
        await createNotificationWithEmail({
          userId: request.requesterId,
          title: "Extension Request Approved",
          message: `Your extension request for "${rental.book.title}" has been approved! Click "Pay Now" to complete the extension.`,
          type: "extension_approved",
          data: JSON.stringify({ 
            requestId, 
            rentalId: request.rentalId,
            bookTitle: rental.book.title,
            extensionDays: request.extensionDays,
            totalAmount: parseFloat(request.extensionFee.toString()),
            platformCommission: parseFloat(request.platformCommission.toString()),
            lenderEarnings: parseFloat(request.lenderEarnings.toString()),
            newDueDate: request.newDueDate?.toISOString(),
            paymentRequired: true
          })
        });
      }

      res.json({
        success: true,
        message: "Extension request approved",
        requestId
      });

    } catch (error: any) {
      console.error('Error approving extension request:', error);
      res.status(500).json({ message: "Failed to approve extension request" });
    }
  });

  // Deny extension request
  app.post("/api/rentals/extensions/requests/:requestId/deny", requireAuth, async (req, res) => {
    try {
      const requestId = parseInt(req.params.requestId);
      const { reason } = req.body;
      const userId = req.session.userId!;
      
      const request = await storage.getExtensionRequest(requestId);
      if (!request) {
        return res.status(404).json({ message: "Extension request not found" });
      }

      if (request.ownerId !== userId) {
        return res.status(403).json({ message: "Unauthorized - you are not the book owner" });
      }

      if (request.status !== 'pending') {
        return res.status(400).json({ message: "Request already processed" });
      }

      // Deny the request
      await storage.denyExtensionRequest(requestId, reason || "No reason provided");

      // Get rental details for notifications
      const rental = await storage.getRental(request.rentalId);
      if (rental) {
        // Create notification for borrower about denial
        await createNotificationWithEmail({
          userId: request.requesterId,
          title: "Extension Request Denied",
          message: `Your extension request for "${rental.book.title}" has been denied. Reason: ${reason || "No reason provided"}`,
          type: "extension_denied",
          data: JSON.stringify({ requestId, rentalId: request.rentalId })
        });
      }

      res.json({
        success: true,
        message: "Extension request denied",
        requestId
      });

    } catch (error: any) {
      console.error('Error denying extension request:', error);
      res.status(500).json({ message: "Failed to deny extension request" });
    }
  });

  // Process payment for approved extension request
  app.post("/api/rentals/extensions/requests/:requestId/pay", requireAuth, async (req, res) => {
    try {
      const requestId = parseInt(req.params.requestId);
      const userId = req.session.userId!;
      
      const request = await storage.getExtensionRequest(requestId);
      if (!request) {
        return res.status(404).json({ message: "Extension request not found" });
      }

      if (request.requesterId !== userId) {
        return res.status(403).json({ message: "Unauthorized - you are not the requester" });
      }

      if (request.status !== 'approved') {
        return res.status(400).json({ message: "Request is not approved for payment" });
      }

      if (request.paymentId) {
        return res.status(400).json({ message: "Payment already processed for this request" });
      }

      // Get rental details
      const rental = await storage.getRental(request.rentalId);
      if (!rental) {
        return res.status(404).json({ message: "Rental not found" });
      }

      // Create dummy payment ID (simulating payment processing)
      const paymentId = `ext_payment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Calculate new due date
      const currentEndDate = new Date(rental.endDate);
      const newEndDate = new Date(currentEndDate);
      newEndDate.setDate(currentEndDate.getDate() + request.extensionDays);

      // Update the rental with new end date
      await storage.updateRental(request.rentalId, {
        endDate: newEndDate
      });

      // Update extension request with payment info
      await storage.updateRentalExtensionPayment(requestId, paymentId, 'completed');

      // Create extension record for tracking
      await storage.createRentalExtension({
        rentalId: request.rentalId,
        requestId: request.id,
        userId: request.requesterId, // borrower
        lenderId: request.ownerId, // book owner
        extensionDays: request.extensionDays,
        extensionFee: request.extensionFee,
        platformCommission: request.platformCommission,
        lenderEarnings: request.lenderEarnings,
        paymentId,
        paymentStatus: 'completed',
        newDueDate: newEndDate
      });

      // Create success notification for borrower
      await createNotificationWithEmail({
        userId: request.requesterId,
        title: "Extension Payment Successful",
        message: `Payment successful! Your book "${rental.book.title}" has been extended for ${request.extensionDays} days. New due date: ${newEndDate.toLocaleDateString()}`,
        type: "extension_completed",
        data: JSON.stringify({ 
          rentalId: request.rentalId,
          extensionDays: request.extensionDays,
          newDueDate: newEndDate.toISOString(),
          paymentId,
          paymentRequired: false  // Payment completed
        })
      });

      // Create earnings notification for book owner
      await createNotificationWithEmail({
        userId: request.ownerId,
        title: "Extension Payment Received",
        message: `You've earned ₹${parseFloat(request.lenderEarnings.toString()).toFixed(2)} from the extension of "${rental.book.title}"`,
        type: "earnings_notification",
        data: JSON.stringify({ 
          rentalId: request.rentalId,
          earnings: parseFloat(request.lenderEarnings.toString()),
          paymentId
        })
      });

      res.json({
        success: true,
        message: "Extension payment processed successfully",
        newDueDate: newEndDate.toISOString(),
        paymentId,
        extensionDays: request.extensionDays
      });

    } catch (error: any) {
      console.error('Error processing extension payment:', error);
      res.status(500).json({ message: "Failed to process extension payment" });
    }
  });

  // Process payment for approved extension request
  app.post("/api/rentals/extensions/requests/:requestId/process-payment", requireAuth, async (req, res) => {
    try {
      const requestId = parseInt(req.params.requestId);
      const { paymentId } = req.body;
      const userId = req.session.userId!;
      
      const request = await storage.getExtensionRequest(requestId);
      if (!request) {
        return res.status(404).json({ message: "Extension request not found" });
      }

      if (request.requesterId !== userId) {
        return res.status(403).json({ message: "Unauthorized - you are not the requester" });
      }

      if (request.status !== 'approved') {
        return res.status(400).json({ message: "Request not approved" });
      }

      // Get rental details
      const rental = await storage.getRental(request.rentalId);
      if (!rental) {
        return res.status(404).json({ message: "Rental not found" });
      }

      // Create rental extension record
      const extension = await storage.createRentalExtension({
        rentalId: request.rentalId,
        requestId: requestId,
        userId: request.requesterId,
        lenderId: request.ownerId,
        extensionDays: request.extensionDays,
        extensionFee: request.extensionFee,
        platformCommission: request.platformCommission,
        lenderEarnings: request.lenderEarnings,
        paymentStatus: 'completed',
        paymentId,
        newDueDate: request.newDueDate!
      });
      
      // Update the extension request to mark as paid
      await storage.updateExtensionRequest(requestId, { 
        paymentId: paymentId 
      });

      // Update rental due date
      await storage.updateRental(request.rentalId, {
        endDate: request.newDueDate!
      });

      // Update lender's earnings
      await db.update(users)
        .set({
          totalEarnings: sql`${users.totalEarnings} + ${parseFloat(request.lenderEarnings)}`
        })
        .where(eq(users.id, request.ownerId));

      // Create notification for the lender about payment
      await createNotificationWithEmail({
        userId: request.ownerId,
        title: "Extension Payment Received",
        message: `You earned ₹${parseFloat(request.lenderEarnings).toFixed(2)} from a ${request.extensionDays}-day extension for "${rental.book.title}".`,
        type: "extension_payment"
      });

      res.json({
        success: true,
        message: "Extension payment processed successfully",
        newDueDate: request.newDueDate,
        extensionFee: parseFloat(request.extensionFee),
        lenderEarnings: parseFloat(request.lenderEarnings)
      });

    } catch (error: any) {
      console.error('Extension payment processing error:', error);
      res.status(500).json({ 
        message: "Failed to process extension payment",
        error: error.message 
      });
    }
  });

  // Credits and Rewards System Routes
  
  // Get user credits and statistics
  app.get("/api/user/credits", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      
      let userCredits = await storage.getUserCredits(userId);
      if (!userCredits) {
        // Create initial credits account with starting balance  
        const startingCredits = await storage.getRewardSetting('starting_credits');
        const initialBalance = parseInt(startingCredits?.settingValue || '100');
        
        userCredits = await storage.createUserCredits({
          userId,
          balance: initialBalance,
          totalEarned: initialBalance,
          totalSpent: 0
        });
        
        // Add welcome bonus transaction
        await storage.addCreditTransaction({
          userId,
          amount: initialBalance,
          type: 'welcome_bonus',
          description: 'Welcome bonus - Initial Brocks credit',
          relatedId: null
        });
      }
      
      const transactions = await storage.getCreditTransactions(userId);
      const badges = await storage.getUserBadges(userId);
      const referralCount = await storage.getReferralCount(userId);
      const commissionFreePeriods = await storage.getActiveCommissionFreePeriods(userId);
      
      res.json({
        credits: userCredits,
        transactions,
        badges,
        referralCount,
        commissionFreePeriods
      });
    } catch (error) {
      console.error("Get user credits error:", error);
      res.status(500).json({ message: "Failed to fetch user credits" });
    }
  });

  // Get reward settings for admin
  app.get("/api/admin/rewards/settings", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const settings = await storage.getAllRewardSettings();
      res.json(settings);
    } catch (error) {
      console.error("Get reward settings error:", error);
      res.status(500).json({ message: "Failed to fetch reward settings" });
    }
  });

  // Update reward settings
  app.post("/api/admin/rewards/settings", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { settings } = req.body;
      
      for (const setting of settings) {
        await storage.updateRewardSetting(setting.key, setting.value);
      }
      
      res.json({ message: "Reward settings updated successfully" });
    } catch (error) {
      console.error("Update reward settings error:", error);
      res.status(500).json({ message: "Failed to update reward settings" });
    }
  });

  // Get user referrals and badge progress
  app.get("/api/user/referrals", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      
      const referrals = await storage.getReferralsByUser(userId);
      const referralCount = await storage.getReferralCount(userId);
      const badges = await storage.getUserBadges(userId);
      
      // Get badge thresholds
      const silverThreshold = await storage.getRewardSetting('silver_referrals');
      const goldThreshold = await storage.getRewardSetting('gold_referrals');
      const platinumThreshold = await storage.getRewardSetting('platinum_referrals');
      
      const badgeProgress = {
        silver: {
          threshold: parseInt(silverThreshold?.settingValue || '5'),
          current: referralCount,
          earned: badges.some(b => b.badgeType === 'silver' && b.category === 'referral')
        },
        gold: {
          threshold: parseInt(goldThreshold?.settingValue || '10'),
          current: referralCount,
          earned: badges.some(b => b.badgeType === 'gold' && b.category === 'referral')
        },
        platinum: {
          threshold: parseInt(platinumThreshold?.settingValue || '15'),
          current: referralCount,
          earned: badges.some(b => b.badgeType === 'platinum' && b.category === 'referral')
        }
      };
      
      res.json({
        referrals,
        referralCount,
        badgeProgress,
        badges: badges.filter(b => b.category === 'referral')
      });
    } catch (error) {
      console.error("Get user referrals error:", error);
      res.status(500).json({ message: "Failed to fetch referrals" });
    }
  });

  // Get upload rewards progress
  app.get("/api/user/upload-rewards", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      
      const user = await storage.getUser(userId);
      const booksUploaded = user?.booksUploaded || 0;
      const badges = await storage.getUserBadges(userId);
      const commissionFreePeriods = await storage.getActiveCommissionFreePeriods(userId);
      
      // Get upload reward thresholds
      const upload10Reward = await storage.getRewardSetting('upload_10_reward');
      const upload20Reward = await storage.getRewardSetting('upload_20_reward');
      const upload30Reward = await storage.getRewardSetting('upload_30_reward');
      
      const uploadProgress = {
        books10: {
          threshold: 10,
          current: booksUploaded,
          reward: parseInt(upload10Reward?.settingValue || '10'),
          earned: booksUploaded >= 10
        },
        books20: {
          threshold: 20,
          current: booksUploaded,
          reward: parseInt(upload20Reward?.settingValue || '20'),
          earned: booksUploaded >= 20
        },
        books30: {
          threshold: 30,
          current: booksUploaded,
          reward: parseInt(upload30Reward?.settingValue || '60'),
          earned: booksUploaded >= 30
        }
      };
      
      res.json({
        booksUploaded,
        uploadProgress,
        badges: badges.filter(b => b.category === 'upload'),
        commissionFreePeriods
      });
    } catch (error) {
      console.error("Get upload rewards error:", error);
      res.status(500).json({ message: "Failed to fetch upload rewards" });
    }
  });



  // Brocks Packages API
  app.get("/api/brocks-packages", requireAuth, async (req, res) => {
    try {
      const packages = await storage.getAllBrocksPackages();
      res.json(packages);
    } catch (error) {
      console.error("Get Brocks packages error:", error);
      res.status(500).json({ message: "Failed to fetch packages" });
    }
  });

  app.get("/api/admin/brocks-packages", requireAuth, async (req, res) => {
    const user = await storage.getUser(req.session.userId!);
    if (!user?.isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }
    try {
      const packages = await storage.getAllBrocksPackages();
      res.json(packages);
    } catch (error) {
      console.error("Get admin Brocks packages error:", error);
      res.status(500).json({ message: "Failed to fetch packages" });
    }
  });

  app.post("/api/admin/brocks-packages", requireAuth, async (req, res) => {
    const user = await storage.getUser(req.session.userId!);
    if (!user?.isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }
    try {
      const { name, brocks, price, bonus, popular } = req.body;
      
      if (!name || !brocks || !price) {
        return res.status(400).json({ message: "Name, brocks and price are required" });
      }

      const packageData = {
        name,
        brocks: parseInt(brocks),
        price: parseFloat(price).toString(),
        bonus: parseInt(bonus) || 0,
        popular: popular || false,
        isActive: true
      };

      const newPackage = await storage.createBrocksPackage(packageData);
      if (!newPackage) {
        return res.status(500).json({ message: "Failed to create package" });
      }

      res.status(201).json(newPackage);
    } catch (error) {
      console.error("Create Brocks package error:", error);
      res.status(500).json({ message: "Failed to create package" });
    }
  });

  app.put("/api/admin/brocks-packages/:id", requireAuth, async (req, res) => {
    const user = await storage.getUser(req.session.userId!);
    if (!user?.isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }
    try {
      const packageId = parseInt(req.params.id);
      const { name, brocks, price, bonus, popular } = req.body;

      const packageData = {
        name,
        brocks: parseInt(brocks),
        price: parseFloat(price).toString(),
        bonus: parseInt(bonus) || 0,
        popular: popular || false
      };

      const updatedPackage = await storage.updateBrocksPackage(packageId, packageData);
      if (!updatedPackage) {
        return res.status(404).json({ message: "Package not found" });
      }

      res.json(updatedPackage);
    } catch (error) {
      console.error("Update Brocks package error:", error);
      res.status(500).json({ message: "Failed to update package" });
    }
  });

  app.delete("/api/admin/brocks-packages/:id", requireAuth, async (req, res) => {
    const user = await storage.getUser(req.session.userId!);
    if (!user?.isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }
    try {
      const packageId = parseInt(req.params.id);
      const success = await storage.deleteBrocksPackage(packageId);
      
      if (!success) {
        return res.status(404).json({ message: "Package not found" });
      }

      res.json({ message: "Package deleted successfully" });
    } catch (error) {
      console.error("Delete Brocks package error:", error);
      res.status(500).json({ message: "Failed to delete package" });
    }
  });

  // Page Content Management Routes
  app.get("/api/admin/page-content", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const content = await storage.getAllPageContent();
      res.json(content);
    } catch (error: any) {
      console.error("Error fetching page content:", error);
      res.status(500).json({ message: "Failed to fetch page content" });
    }
  });

  app.get("/api/page-content/:pageKey", async (req, res) => {
    try {
      const { pageKey } = req.params;
      const content = await storage.getPageContent(pageKey);
      res.json(content || {});
    } catch (error: any) {
      console.error("Error fetching page content:", error);
      res.status(500).json({ message: "Failed to fetch page content" });
    }
  });

  app.put("/api/admin/page-content/:pageKey", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const { pageKey } = req.params;
      const content = await storage.updatePageContent(pageKey, req.body);
      console.log(`📝 Updated page content for: ${pageKey}`);
      res.json(content);
    } catch (error: any) {
      console.error("Error updating page content:", error);
      res.status(500).json({ message: "Failed to update page content" });
    }
  });



  // Social Features Routes

  // Genre Preferences
  app.post("/api/user/genre-preferences", requireAuth, async (req, res) => {
    try {
      const { preferences } = req.body;
      const userId = req.session.userId!;
      
      // Clear existing preferences
      await db.delete(userGenrePreferences)
        .where(eq(userGenrePreferences.userId, userId));
      
      // Insert new preferences
      if (preferences && preferences.length > 0) {
        const preferencesToInsert = preferences.map((pref: any) => ({
          userId,
          genre: pref.genre,
          preferenceLevel: pref.preferenceLevel,
          preferenceScore: pref.preferenceLevel || 3, // Use preferenceLevel as score, default to 3
          createdAt: new Date()
        }));
        
        await db.insert(userGenrePreferences).values(preferencesToInsert);
        console.log(`📚 Saved ${preferences.length} genre preferences for user ${userId}`);
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Save genre preferences error:", error);
      res.status(500).json({ message: "Failed to save preferences" });
    }
  });

  app.get("/api/user/genre-preferences", requireAuth, async (req, res) => {
    try {
      const preferences = await db.select()
        .from(userGenrePreferences)
        .where(eq(userGenrePreferences.userId, req.session.userId!));
      
      res.json(preferences);
    } catch (error) {
      console.error("Get genre preferences error:", error);
      res.status(500).json({ message: "Failed to fetch preferences" });
    }
  });

  // Get recommended books based on user preferences
  app.get("/api/books/recommended", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      console.log(`📚 Finding recommended books for user ${userId}`);
      
      // Get user's genre preferences
      const preferences = await db.select()
        .from(userGenrePreferences)
        .where(eq(userGenrePreferences.userId, userId));
      
      console.log(`📚 User has ${preferences.length} genre preferences`);
      
      // Get user's societies to find books from
      const userSocieties = await db.select()
        .from(societyMembers)
        .where(eq(societyMembers.userId, userId));
      
      const societyIds = userSocieties.map(sm => sm.societyId);
      console.log(`📚 User is member of ${societyIds.length} societies: [${societyIds.join(', ')}]`);
      
      if (societyIds.length === 0) {
        console.log(`📚 User has no societies, returning empty recommendations`);
        return res.json([]);
      }
      
      let recommendedBooks;
      
      if (preferences.length > 0) {
        // Get books from user's societies that match their preferred genres (preference level >= 1)
        const preferredGenres = preferences
          .filter(p => p.preferenceLevel >= 1) // Include all genres with any positive preference
          .map(p => p.genre);
        
        console.log(`📚 Preferred genres: [${preferredGenres.join(', ')}]`);
        
        recommendedBooks = await db.select({
          id: books.id,
          title: books.title,
          author: books.author,
          isbn: books.isbn,
          genre: books.genre,
          imageUrl: books.imageUrl,
          coverImageUrl: books.coverImageUrl,
          condition: books.condition,
          dailyFee: books.dailyFee,
          isAvailable: books.isAvailable,
          description: books.description,
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
          eq(societyMembers.societyId, books.societyId),
          eq(societyMembers.isActive, true)
        ))
        .where(and(
          inArray(books.societyId, societyIds),
          inArray(books.genre, preferredGenres),
          eq(books.isAvailable, true),
          not(eq(books.ownerId, userId)) // Don't recommend user's own books
        ))
        .orderBy(sql`RANDOM()`)
        .limit(10);
      } else {
        // No preferences, show random available books from societies
        console.log(`📚 No preferences found, showing random books from societies`);
        
        recommendedBooks = await db.select({
          id: books.id,
          title: books.title,
          author: books.author,
          isbn: books.isbn,
          genre: books.genre,
          imageUrl: books.imageUrl,
          coverImageUrl: books.coverImageUrl,
          condition: books.condition,
          dailyFee: books.dailyFee,
          isAvailable: books.isAvailable,
          description: books.description,
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
          eq(societyMembers.societyId, books.societyId),
          eq(societyMembers.isActive, true)
        ))
        .where(and(
          inArray(books.societyId, societyIds),
          eq(books.isAvailable, true),
          not(eq(books.ownerId, userId)) // Don't recommend user's own books
        ))
        .orderBy(sql`RANDOM()`)
        .limit(10);
      }
      
      console.log(`📚 Found ${recommendedBooks.length} recommended books for user ${userId} based on preferences`);
      console.log(`📚 Sample books: ${recommendedBooks.slice(0, 3).map(b => `${b.title} (${b.genre})`).join(', ')}`);
      
      res.json(recommendedBooks);
    } catch (error) {
      console.error("Get recommended books error:", error);
      res.status(500).json({ message: "Failed to fetch recommendations" });
    }
  });

  // Wishlist
  app.post("/api/wishlist", requireAuth, async (req, res) => {
    try {
      const { bookId, priority, notes } = req.body;
      
      // Check if already wishlisted
      const existing = await db.select()
        .from(wishlists)
        .where(and(
          eq(wishlists.userId, req.session.userId!),
          eq(wishlists.bookId, bookId)
        ))
        .limit(1);
      
      if (existing.length > 0) {
        return res.status(400).json({ message: "Book already in wishlist" });
      }
      
      const wishlistItem = await db.insert(wishlists).values({
        userId: req.session.userId!,
        bookId,
        priority: priority || 1,
        notes
      }).returning();
      
      res.json(wishlistItem[0]);
    } catch (error) {
      console.error("Add to wishlist error:", error);
      res.status(500).json({ message: "Failed to add to wishlist" });
    }
  });

  app.delete("/api/wishlist/:bookId", requireAuth, async (req, res) => {
    try {
      const bookId = parseInt(req.params.bookId);
      
      await db.delete(wishlists)
        .where(and(
          eq(wishlists.userId, req.session.userId!),
          eq(wishlists.bookId, bookId)
        ));
      
      res.json({ success: true });
    } catch (error) {
      console.error("Remove from wishlist error:", error);
      res.status(500).json({ message: "Failed to remove from wishlist" });
    }
  });

  app.get("/api/wishlist/check/:bookId", requireAuth, async (req, res) => {
    try {
      const bookId = parseInt(req.params.bookId);
      
      const wishlistItem = await db.select()
        .from(wishlists)
        .where(and(
          eq(wishlists.userId, req.session.userId!),
          eq(wishlists.bookId, bookId)
        ))
        .limit(1);
      
      res.json({ isWishlisted: wishlistItem.length > 0 });
    } catch (error) {
      console.error("Check wishlist error:", error);
      res.status(500).json({ isWishlisted: false });
    }
  });

  app.get("/api/wishlist", requireAuth, async (req, res) => {
    try {
      const wishlistItems = await db.select({
        id: wishlists.id,
        priority: wishlists.priority,
        notes: wishlists.notes,
        addedAt: wishlists.addedAt,
        book: {
          id: books.id,
          title: books.title,
          author: books.author,
          genre: books.genre,
          dailyFee: books.dailyFee,
          isAvailable: books.isAvailable,

        }
      })
      .from(wishlists)
      .innerJoin(books, eq(wishlists.bookId, books.id))
      .where(eq(wishlists.userId, req.session.userId!))
      .orderBy(wishlists.priority, wishlists.addedAt);
      
      console.log(`📚 Retrieved ${wishlistItems.length} wishlist items for user ${req.session.userId}`);
      res.json(wishlistItems);
    } catch (error) {
      console.error("Get wishlist error:", error);
      res.status(500).json({ message: "Failed to fetch wishlist" });
    }
  });

  // Book Reviews
  app.post("/api/books/:bookId/reviews", requireAuth, async (req, res) => {
    try {
      const bookId = parseInt(req.params.bookId);
      const { rating, reviewText, isPublic } = req.body;
      
      // Check if user already reviewed this book
      const existing = await db.select()
        .from(bookReviews)
        .where(and(
          eq(bookReviews.userId, req.session.userId!),
          eq(bookReviews.bookId, bookId)
        ))
        .limit(1);
      
      let review;
      if (existing.length > 0) {
        // Update existing review
        review = await db.update(bookReviews)
          .set({
            rating,
            reviewText,
            isPublic: isPublic !== false,
            updatedAt: new Date()
          })
          .where(eq(bookReviews.id, existing[0].id))
          .returning();
      } else {
        // Create new review
        review = await db.insert(bookReviews).values({
          userId: req.session.userId!,
          bookId,
          rating,
          reviewText,
          isPublic: isPublic !== false
        }).returning();
      }
      
      res.json(review[0]);
    } catch (error) {
      console.error("Add review error:", error);
      res.status(500).json({ message: "Failed to add review" });
    }
  });

  app.get("/api/books/:bookId/reviews", async (req, res) => {
    try {
      const bookId = parseInt(req.params.bookId);
      
      const reviews = await db.select({
        id: bookReviews.id,
        rating: bookReviews.rating,
        reviewText: bookReviews.reviewText,
        helpfulVotes: bookReviews.helpfulVotes,
        createdAt: bookReviews.createdAt,
        user: {
          id: users.id,
          name: users.name
        }
      })
      .from(bookReviews)
      .innerJoin(users, eq(bookReviews.userId, users.id))
      .where(and(
        eq(bookReviews.bookId, bookId),
        eq(bookReviews.isPublic, true)
      ))
      .orderBy(bookReviews.createdAt);
      
      res.json(reviews);
    } catch (error) {
      console.error("Get reviews error:", error);
      res.status(500).json({ message: "Failed to fetch reviews" });
    }
  });



  const httpServer = createServer(app);
  
  // WebSocket server for real-time chat
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  wss.on('connection', (ws: any, req) => {
    console.log('💬 New WebSocket connection');
    
    ws.on('message', async (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());
        
        if (message.type === 'join_society') {
          ws.societyId = message.societyId;
          ws.userId = message.userId;
          console.log(`💬 User ${message.userId} joined society ${message.societyId} chat`);
        }
        
        if (message.type === 'typing') {
          // Broadcast typing indicator to other users in the society
          wss.clients.forEach((client: any) => {
            if (client !== ws && client.readyState === WebSocket.OPEN && client.societyId === ws.societyId) {
              client.send(JSON.stringify({
                type: 'user_typing',
                userId: ws.userId,
                isTyping: message.isTyping
              }));
            }
          });
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });
    
    ws.on('close', () => {
      console.log('💬 WebSocket connection closed');
    });
  });

  // Society Chat Routes
  app.get("/api/societies/:societyId/messages", requireAuth, async (req, res) => {
    try {
      const societyId = parseInt(req.params.societyId);
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      
      // Check if user is member of society
      const isMember = await storage.isMemberOfSociety(societyId, req.session.userId!);
      if (!isMember) {
        return res.status(403).json({ message: "Not a member of this society" });
      }
      
      // Direct database query for society messages
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
      res.json(messages.rows || []);
    } catch (error) {
      console.error("Error fetching society messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  app.post("/api/societies/:societyId/messages", requireAuth, async (req, res) => {
    try {
      const societyId = parseInt(req.params.societyId);
      const { content, messageType = 'text' } = req.body;
      const senderId = req.session.userId!;
      
      // Check if user is member of society with direct query
      const memberCheck = await db.execute(sql`
        SELECT 1 FROM society_members 
        WHERE society_id = ${societyId} AND user_id = ${senderId}
        LIMIT 1
      `);
      
      if (!memberCheck.rows || memberCheck.rows.length === 0) {
        return res.status(403).json({ message: "Not a member of this society" });
      }
      
      // Create message with direct database query
      const result = await db.execute(sql`
        INSERT INTO society_chats (society_id, sender_id, content, message_type, created_at)
        VALUES (${societyId}, ${senderId}, ${content}, ${messageType}, NOW())
        RETURNING *
      `);
      const message = result.rows?.[0] || null;
      
      // Broadcast message to all connected clients in the society
      wss.clients.forEach((client: any) => {
        if (client.readyState === WebSocket.OPEN && client.societyId === societyId) {
          client.send(JSON.stringify({
            type: 'new_message',
            message: {
              ...message,
              sender_name: req.user?.name,
              sender_picture: req.user?.profilePicture
            }
          }));
        }
      });
      
      res.json(message);
    } catch (error) {
      console.error("Error sending message:", error);
      res.status(500).json({ message: "Failed to send message" });
    }
  });

  app.put("/api/societies/:societyId/chat/read-status", requireAuth, async (req, res) => {
    try {
      const societyId = parseInt(req.params.societyId);
      const { messageId } = req.body;
      const userId = req.session.userId!;
      
      await storage.updateChatReadStatus(societyId, userId, messageId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating read status:", error);
      res.status(500).json({ message: "Failed to update read status" });
    }
  });

  app.get("/api/societies/:societyId/chat/unread-count", requireAuth, async (req, res) => {
    try {
      const societyId = parseInt(req.params.societyId);
      const userId = req.session.userId!;
      
      const count = await storage.getUnreadMessageCount(societyId, userId);
      res.json({ count });
    } catch (error) {
      console.error("Error getting unread count:", error);
      res.status(500).json({ message: "Failed to get unread count" });
    }
  });

  // Direct Messages Routes
  app.get("/api/direct-messages/contacts", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      // Direct database query for unique society member contacts - fixed syntax
      const contacts = await db.execute(sql`
        SELECT 
          u.id as contact_id,
          u.name as contact_name,
          u.profile_picture as contact_picture,
          '' as last_message,
          NOW() as last_message_at,
          0 as last_sender_id,
          0 as unread_count
        FROM society_members sm1
        JOIN society_members sm2 ON sm1.society_id = sm2.society_id
        JOIN users u ON sm2.user_id = u.id
        WHERE sm1.user_id = ${userId} AND u.id != ${userId}
        GROUP BY u.id, u.name, u.profile_picture
        ORDER BY u.name ASC
      `);
      res.json(contacts.rows || []);
    } catch (error) {
      console.error("Error fetching contacts:", error);
      res.status(500).json({ message: "Failed to fetch contacts" });
    }
  });

  app.get("/api/direct-messages/:contactId", requireAuth, async (req, res) => {
    try {
      const contactId = parseInt(req.params.contactId);
      const userId = req.session.userId!;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      
      // Direct database query for messages
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
        LIMIT ${limit} OFFSET ${offset}
      `);
      
      // Mark messages as read with direct query
      await db.execute(sql`
        UPDATE direct_messages 
        SET is_read = TRUE 
        WHERE receiver_id = ${userId} AND sender_id = ${contactId} AND is_read = FALSE
      `);
      
      res.json(messages.rows || []);
    } catch (error) {
      console.error("Error fetching direct messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  app.post("/api/direct-messages", requireAuth, async (req, res) => {
    try {
      const { receiverId, content, messageType = 'text' } = req.body;
      const senderId = req.session.userId!;
      
      // Direct database query to create message
      const result = await db.execute(sql`
        INSERT INTO direct_messages (sender_id, receiver_id, content, message_type, is_read, created_at)
        VALUES (${senderId}, ${receiverId}, ${content}, ${messageType}, FALSE, NOW())
        RETURNING *
      `);
      const message = result.rows?.[0] || null;
      
      // Broadcast message to WebSocket clients
      wss.clients.forEach((client: any) => {
        if (client.readyState === WebSocket.OPEN && 
            (client.userId === receiverId || client.userId === senderId)) {
          client.send(JSON.stringify({
            type: 'new_direct_message',
            message,
            senderId,
            receiverId: receiverId
          }));
        }
      });
      
      res.json(message);
    } catch (error) {
      console.error("Error sending direct message:", error);
      res.status(500).json({ message: "Failed to send message" });
    }
  });

  // Enhanced Society Chat Routes
  app.get("/api/societies/:societyId/chat-rooms", requireAuth, async (req, res) => {
    try {
      const societyId = parseInt(req.params.societyId);
      
      // Check if user is member of society
      const isMember = await storage.isMemberOfSociety(societyId, req.session.userId!);
      if (!isMember) {
        return res.status(403).json({ message: "Not a member of this society" });
      }
      
      const rooms = await storage.getSocietyChatRooms(societyId);
      res.json(rooms);
    } catch (error) {
      console.error("Error fetching chat rooms:", error);
      res.status(500).json({ message: "Failed to fetch chat rooms" });
    }
  });

  app.post("/api/societies/:societyId/chat-rooms", requireAuth, async (req, res) => {
    try {
      const societyId = parseInt(req.params.societyId);
      const { name, description, roomType = 'general' } = req.body;
      const createdBy = req.session.userId!;
      
      // Check if user is member of society
      const isMember = await storage.isMemberOfSociety(societyId, createdBy);
      if (!isMember) {
        return res.status(403).json({ message: "Not a member of this society" });
      }
      
      const room = await storage.createChatRoom(societyId, name, description, roomType, createdBy);
      res.json(room);
    } catch (error) {
      console.error("Error creating chat room:", error);
      res.status(500).json({ message: "Failed to create chat room" });
    }
  });

  app.get("/api/societies/:societyId/members", requireAuth, async (req, res) => {
    try {
      const societyId = parseInt(req.params.societyId);
      
      // Check if user is member of society
      const isMember = await storage.isMemberOfSociety(societyId, req.session.userId!);
      if (!isMember) {
        return res.status(403).json({ message: "Not a member of this society" });
      }
      
      // Direct database query with proper deduplication - fixed DISTINCT ON
      const members = await db.execute(sql`
        SELECT 
          u.id,
          u.name,
          u.email,
          u.profile_picture,
          MIN(sm.joined_at) as joined_at,
          CASE WHEN u.id = s.created_by THEN true ELSE false END as is_admin
        FROM society_members sm
        JOIN users u ON sm.user_id = u.id
        JOIN societies s ON sm.society_id = s.id
        WHERE sm.society_id = ${societyId}
        GROUP BY u.id, u.name, u.email, u.profile_picture, s.created_by
        ORDER BY is_admin DESC, u.name ASC
      `);
      res.json(members.rows || []);
    } catch (error) {
      console.error("Error fetching society members:", error);
      res.status(500).json({ message: "Failed to fetch members" });
    }
  });

  // Bulk Book Upload Routes
  
  // Analyze bookshelf image using OpenAI Vision
  app.post("/api/books/analyze-bookshelf", requireAuth, async (req, res) => {
    try {
      const { image } = req.body;
      
      if (!image) {
        console.log("❌ No image provided in request");
        return res.status(400).json({ message: "Image is required" });
      }

      console.log("📸 Starting OpenAI image analysis...");
      console.log("📊 Image data length:", image.length);
      console.log("🔑 OpenAI API Key present:", !!process.env.OPENAI_API_KEY);
      
      if (!process.env.OPENAI_API_KEY) {
        console.error("❌ OPENAI_API_KEY is not set");
        return res.status(500).json({ message: "OpenAI API key not configured" });
      }

      // Validate image format
      if (!image.startsWith('/9j/') && !image.startsWith('iVBORw0KGgo')) {
        console.log("❌ Invalid image format detected");
        return res.status(400).json({ message: "Invalid image format. Please provide a valid JPEG or PNG image." });
      }
      
      console.log("🚀 Making OpenAI API request...");
      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Analyze this bookshelf image and identify all the books you can see. For each book, extract:
                - Title (exact title from the spine/cover)
                - Author (if visible)
                - Genre (best guess based on title/author)
                - Brief description (if you know the book)

                Return the results as a JSON object with a "books" array. Each book should have: title, author, genre, description.
                Only include books where you can clearly read the title. Be precise with titles and authors.
                
                Response format: { "books": [{"title": "Book Title", "author": "Author Name", "genre": "Genre", "description": "Brief description"}] }`
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${image}`
                }
              }
            ],
          },
        ],
        response_format: { type: "json_object" },
        max_tokens: 1500,
      });

      console.log("✅ OpenAI API response received");
      const result = JSON.parse(response.choices[0].message.content || '{"books": []}');
      console.log(`📚 Detected ${result.books?.length || 0} books from bookshelf image`);
      
      // Log detected books for debugging
      if (result.books && result.books.length > 0) {
        console.log("📖 Detected books:", result.books.map((book: any) => book.title).join(', '));
      }
      
      res.json(result);
    } catch (error: any) {
      console.error("🚨 Bookshelf analysis error:", error);
      console.error("🔍 Error details:", {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        code: error.code,
        stack: error.stack?.split('\n').slice(0, 3).join('\n')
      });
      
      if (error.response?.status === 401) {
        return res.status(500).json({ message: "OpenAI API authentication failed. Please check API key configuration." });
      }
      
      if (error.response?.status === 429) {
        return res.status(500).json({ message: "OpenAI API rate limit exceeded. Please try again in a few minutes." });
      }
      
      if (error.code === 'ECONNRESET' || error.code === 'ENOTFOUND') {
        return res.status(500).json({ message: "Network connectivity issue. Please check your internet connection and try again." });
      }
      
      if (error.message?.includes('timeout')) {
        return res.status(500).json({ message: "Request timeout. The image analysis is taking too long. Please try with a smaller image." });
      }
      
      // Try alternative AI providers for image analysis
      console.log('🔄 OpenAI failed, trying alternative providers...');
      try {
        const { imageAnalysisService } = await import('./imageAnalysis');
        const fallbackResult = await imageAnalysisService.analyzeBookshelfImage(req.body.image);
        console.log(`✅ Fallback analysis successful using ${fallbackResult.provider}`);
        res.json(fallbackResult);
        return;
      } catch (fallbackError: any) {
        console.error('❌ All AI providers failed:', fallbackError);
        res.status(200).json({ 
          message: "AI analysis temporarily unavailable. You can manually add books using the 'Add Book' button or barcode scanner.",
          books: [],
          fallbackMode: true,
          error: error.message
        });
      }
    }
  });

  // Find ISBN for a book title and author
  app.post("/api/books/find-isbn", requireAuth, async (req, res) => {
    try {
      const { title, author, region = "IN" } = req.body;
      
      if (!title) {
        return res.status(400).json({ message: "Title is required" });
      }

      // Google Books API search
      const searchQuery = `intitle:${encodeURIComponent(title)}${author ? `+inauthor:${encodeURIComponent(author)}` : ''}`;
      const googleBooksUrl = `https://www.googleapis.com/books/v1/volumes?q=${searchQuery}&country=${region}&langRestrict=en&maxResults=1`;
      
      const response = await fetch(googleBooksUrl);
      if (!response.ok) {
        return res.status(404).json({ message: "Book not found" });
      }

      const data = await response.json();
      
      if (data.items && data.items.length > 0) {
        const book = data.items[0].volumeInfo;
        const isbn13 = book.industryIdentifiers?.find((id: any) => id.type === "ISBN_13")?.identifier;
        const isbn10 = book.industryIdentifiers?.find((id: any) => id.type === "ISBN_10")?.identifier;
        
        res.json({
          isbn: isbn13 || isbn10 || "",
          title: book.title,
          author: book.authors?.[0] || author,
          genre: book.categories?.[0] || "Fiction",
          description: book.description || "",
          imageUrl: book.imageLinks?.thumbnail?.replace('http:', 'https:') || ""
        });
      } else {
        res.status(404).json({ message: "Book not found" });
      }
    } catch (error) {
      console.error("ISBN lookup error:", error);
      res.status(500).json({ message: "Failed to find ISBN" });
    }
  });

  // Bulk add books
  app.post("/api/books/bulk-add", requireAuth, async (req, res) => {
    try {
      const { books } = req.body;
      const userId = req.session.userId!;
      
      if (!books || !Array.isArray(books) || books.length === 0) {
        return res.status(400).json({ message: "Books array is required" });
      }

      let addedCount = 0;
      const errors: string[] = [];

      for (const bookData of books) {
        try {
          // Validate required fields
          if (!bookData.title || !bookData.author) {
            errors.push(`Book "${bookData.title || 'Unknown'}" missing required fields`);
            continue;
          }

          // Get all hubs the user is a member of
          const userHubs = await storage.getSocietiesByUser(userId);
          
          if (!userHubs || userHubs.length === 0) {
            errors.push(`Book "${bookData.title}": You must be a member of at least one hub to add books`);
            continue;
          }

          // Create book
          const book = await storage.createBook({
            title: bookData.title,
            author: bookData.author,
            isbn: bookData.isbn || "",
            genre: bookData.genre || "Fiction",
            description: bookData.description || "",
            imageUrl: bookData.imageUrl || "",
            condition: bookData.condition || "Good",
            dailyFee: bookData.dailyFee || 25,
            sellingPrice: bookData.sellingPrice || null,
            ownerId: userId,
            isAvailable: true
          });

          if (book) {
            // Tag book to all user's hubs
            for (const hub of userHubs) {
              await storage.createBookHub({
                bookId: book.id,
                societyId: hub.id
              });
            }
            
            addedCount++;
            console.log(`📚 Added book: "${bookData.title}" by ${bookData.author} and tagged to ${userHubs.length} hubs`);
          }
        } catch (error) {
          console.error(`Error adding book "${bookData.title}":`, error);
          errors.push(`Failed to add "${bookData.title}": ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Award Brocks credits for book uploads
      if (addedCount > 0) {
        const creditsPerUpload = await storage.getRewardSetting('credits_per_upload');
        const creditsAmount = parseInt(creditsPerUpload?.settingValue || '2') * addedCount;
        
        try {
          await storage.awardCredits(userId, creditsAmount, `Uploaded ${addedCount} books via bulk upload`);
          console.log(`✅ Awarded ${creditsAmount} credits for bulk upload of ${addedCount} books`);
        } catch (error) {
          console.error(`❌ Failed to award credits for bulk upload:`, error);
        }

        // Update user's books uploaded count
        try {
          const user = await storage.getUser(userId);
          if (user) {
            await storage.updateUser(userId, {
              booksUploaded: (user.booksUploaded || 0) + addedCount
            });
          }
        } catch (error) {
          console.error("Error updating user books count:", error);
        }
      }

      res.json({
        addedCount,
        errors,
        message: `Successfully added ${addedCount} books${errors.length > 0 ? ` with ${errors.length} errors` : ''}`
      });
    } catch (error) {
      console.error("Bulk add books error:", error);
      res.status(500).json({ message: "Failed to add books" });
    }
  });

  // Availability Alert Routes
  
  // Create availability alert
  app.post("/api/books/:bookId/availability-alert", requireAuth, async (req, res) => {
    try {
      const bookId = parseInt(req.params.bookId);
      const userId = req.session.userId!;

      // Check if book exists and is not available
      const book = await storage.getBook(bookId);
      if (!book) {
        return res.status(404).json({ message: "Book not found" });
      }

      if (book.isAvailable) {
        return res.status(400).json({ message: "Book is currently available" });
      }

      // Create availability alert
      await storage.createAvailabilityAlert(userId, bookId);

      res.json({ message: "Availability alert created successfully" });
    } catch (error) {
      console.error("Error creating availability alert:", error);
      res.status(500).json({ message: "Failed to create availability alert" });
    }
  });

  // Remove availability alert
  app.delete("/api/books/:bookId/availability-alert", requireAuth, async (req, res) => {
    try {
      const bookId = parseInt(req.params.bookId);
      const userId = req.session.userId!;

      await storage.removeAvailabilityAlert(userId, bookId);

      res.json({ message: "Availability alert removed successfully" });
    } catch (error) {
      console.error("Error removing availability alert:", error);
      res.status(500).json({ message: "Failed to remove availability alert" });
    }
  });

  // Check if user has availability alert for a book
  app.get("/api/books/:bookId/availability-alert", requireAuth, async (req, res) => {
    try {
      const bookId = parseInt(req.params.bookId);
      const userId = req.session.userId!;

      const hasAlert = await storage.checkAvailabilityAlert(userId, bookId);

      res.json({ hasAlert });
    } catch (error) {
      console.error("Error checking availability alert:", error);
      res.status(500).json({ message: "Failed to check availability alert" });
    }
  });

  // Get user's availability alerts
  app.get("/api/availability-alerts", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const alerts = await storage.getUserAvailabilityAlerts(userId);

      res.json(alerts);
    } catch (error) {
      console.error("Error fetching user availability alerts:", error);
      res.status(500).json({ message: "Failed to fetch availability alerts" });
    }
  });

  // Geocode existing hubs
  app.post("/api/admin/geocode-hubs", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { geocodeWithDelay } = await import('./utils/geocoding');

      const allSocieties = await db.select().from(societies);
      
      const societiesNeedingGeocode = allSocieties.filter(society => 
        society.location && 
        society.location.trim() !== '' && 
        (!society.latitude || !society.longitude)
      );

      if (societiesNeedingGeocode.length === 0) {
        return res.json({ 
          message: "No hubs need geocoding", 
          updated: 0,
          total: allSocieties.length 
        });
      }

      let updatedCount = 0;
      const errors: string[] = [];

      for (const society of societiesNeedingGeocode) {
        try {
          const coords = await geocodeWithDelay(society.location!, 1000);
          
          if (coords) {
            await db.update(societies)
              .set({ 
                latitude: coords.latitude, 
                longitude: coords.longitude 
              })
              .where(eq(societies.id, society.id));
            
            updatedCount++;
            console.log(`✅ Geocoded "${society.name}": ${coords.latitude}, ${coords.longitude}`);
          } else {
            errors.push(`Failed to geocode: ${society.name} (${society.location})`);
            console.log(`❌ Could not geocode "${society.name}": ${society.location}`);
          }
        } catch (error) {
          errors.push(`Error geocoding ${society.name}: ${error}`);
          console.error(`Error geocoding ${society.name}:`, error);
        }
      }

      res.json({ 
        message: `Successfully geocoded ${updatedCount} out of ${societiesNeedingGeocode.length} hubs`,
        updated: updatedCount,
        total: societiesNeedingGeocode.length,
        errors: errors.length > 0 ? errors : undefined
      });
    } catch (error) {
      console.error("Geocoding error:", error);
      res.status(500).json({ message: "Failed to geocode hubs" });
    }
  });

  return httpServer;
}
