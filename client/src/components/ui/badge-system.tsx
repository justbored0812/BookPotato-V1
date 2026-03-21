import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Trophy, 
  Star, 
  BookOpen, 
  Users, 
  Target, 
  Award,
  Crown,
  Shield,
  Zap,
  Heart
} from "lucide-react";

interface UserBadge {
  id: string;
  name: string;
  description: string;
  icon: any;
  color: string;
  requirement: string;
  progress?: number;
  maxProgress?: number;
  unlocked: boolean;
}

interface BadgeSystemProps {
  userStats: {
    booksLent: number;
    booksRented: number;
    totalEarnings: number;
    societiesJoined: number;
    ratingsReceived: number;
    averageRating: number;
  };
}

export default function BadgeSystem({ userStats }: BadgeSystemProps) {
  const badges: UserBadge[] = [
    {
      id: "first_lend",
      name: "First Lender",
      description: "Lend your first book",
      icon: BookOpen,
      color: "bg-blue-500",
      requirement: "Lend 1 book",
      progress: userStats.booksLent,
      maxProgress: 1,
      unlocked: userStats.booksLent >= 1
    },
    {
      id: "generous_lender",
      name: "Generous Lender",
      description: "Lend 10 books to community members",
      icon: Heart,
      color: "bg-pink-500",
      requirement: "Lend 10 books",
      progress: Math.min(userStats.booksLent, 10),
      maxProgress: 10,
      unlocked: userStats.booksLent >= 10
    },
    {
      id: "library_master",
      name: "Library Master",
      description: "Lend 50 books - you're a community hero!",
      icon: Crown,
      color: "bg-yellow-500",
      requirement: "Lend 50 books",
      progress: Math.min(userStats.booksLent, 50),
      maxProgress: 50,
      unlocked: userStats.booksLent >= 50
    },
    {
      id: "avid_reader",
      name: "Avid Reader",
      description: "Rent 5 different books",
      icon: BookOpen,
      color: "bg-green-500",
      requirement: "Rent 5 books",
      progress: Math.min(userStats.booksRented, 5),
      maxProgress: 5,
      unlocked: userStats.booksRented >= 5
    },
    {
      id: "bookworm",
      name: "Bookworm",
      description: "Rent 25 books - keep reading!",
      icon: Target,
      color: "bg-purple-500",
      requirement: "Rent 25 books",
      progress: Math.min(userStats.booksRented, 25),
      maxProgress: 25,
      unlocked: userStats.booksRented >= 25
    },
    {
      id: "entrepreneur",
      name: "Book Entrepreneur",
      description: "Earn ₹1000 from book lending",
      icon: Trophy,
      color: "bg-orange-500",
      requirement: "Earn ₹1000",
      progress: Math.min(userStats.totalEarnings, 1000),
      maxProgress: 1000,
      unlocked: userStats.totalEarnings >= 1000
    },
    {
      id: "community_builder",
      name: "Community Builder",
      description: "Join 3 different societies",
      icon: Users,
      color: "bg-indigo-500",
      requirement: "Join 3 societies",
      progress: Math.min(userStats.societiesJoined, 3),
      maxProgress: 3,
      unlocked: userStats.societiesJoined >= 3
    },
    {
      id: "five_star",
      name: "Five Star Lender",
      description: "Maintain 5-star average rating",
      icon: Star,
      color: "bg-yellow-400",
      requirement: "5.0 average rating",
      progress: Math.min(userStats.averageRating, 5),
      maxProgress: 5,
      unlocked: userStats.averageRating >= 4.8 && userStats.ratingsReceived >= 5
    },
    {
      id: "trusted_member",
      name: "Trusted Member",
      description: "Receive 20 positive ratings",
      icon: Shield,
      color: "bg-teal-500",
      requirement: "20 ratings",
      progress: Math.min(userStats.ratingsReceived, 20),
      maxProgress: 20,
      unlocked: userStats.ratingsReceived >= 20
    },
    {
      id: "lightning_fast",
      name: "Lightning Fast",
      description: "Return books on time 10 times in a row",
      icon: Zap,
      color: "bg-cyan-500",
      requirement: "10 on-time returns",
      progress: 0, // This would need tracking
      maxProgress: 10,
      unlocked: false
    }
  ];

  const unlockedBadges = badges.filter(badge => badge.unlocked);
  const progressBadges = badges.filter(badge => !badge.unlocked && badge.progress! > 0);
  const lockedBadges = badges.filter(badge => !badge.unlocked && badge.progress === 0);

  const renderBadge = (badge: UserBadge, showProgress: boolean = false) => {
    const Icon = badge.icon;
    
    return (
      <Card key={badge.id} className={`${badge.unlocked ? 'border-green-200 bg-green-50' : 'border-gray-200'}`}>
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <div className={`w-12 h-12 rounded-full ${badge.color} flex items-center justify-center ${badge.unlocked ? '' : 'opacity-50'}`}>
              <Icon className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className={`font-medium ${badge.unlocked ? 'text-green-800' : 'text-gray-700'}`}>
                {badge.name}
              </h4>
              <p className="text-sm text-gray-600 mt-1">{badge.description}</p>
              <p className="text-xs text-gray-500 mt-1">{badge.requirement}</p>
              
              {showProgress && badge.maxProgress && (
                <div className="mt-2">
                  <div className="flex justify-between text-xs text-gray-600 mb-1">
                    <span>{badge.progress}/{badge.maxProgress}</span>
                    <span>{Math.round((badge.progress! / badge.maxProgress) * 100)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${badge.color}`}
                      style={{ width: `${(badge.progress! / badge.maxProgress) * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
            {badge.unlocked && (
              <Award className="w-5 h-5 text-green-600" />
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Achievement Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Trophy className="w-5 h-5 text-yellow-600" />
            <span>Achievement Summary</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-green-600">{unlockedBadges.length}</div>
              <div className="text-sm text-gray-600">Badges Earned</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600">{progressBadges.length}</div>
              <div className="text-sm text-gray-600">In Progress</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-600">{badges.length}</div>
              <div className="text-sm text-gray-600">Total Badges</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Unlocked Badges */}
      {unlockedBadges.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center space-x-2">
            <Award className="w-5 h-5 text-green-600" />
            <span>Earned Badges ({unlockedBadges.length})</span>
          </h3>
          <div className="grid gap-3">
            {unlockedBadges.map(badge => renderBadge(badge))}
          </div>
        </div>
      )}

      {/* In Progress Badges */}
      {progressBadges.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center space-x-2">
            <Target className="w-5 h-5 text-blue-600" />
            <span>In Progress ({progressBadges.length})</span>
          </h3>
          <div className="grid gap-3">
            {progressBadges.map(badge => renderBadge(badge, true))}
          </div>
        </div>
      )}

      {/* Locked Badges */}
      {lockedBadges.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center space-x-2">
            <Shield className="w-5 h-5 text-gray-600" />
            <span>Available Badges ({lockedBadges.length})</span>
          </h3>
          <div className="grid gap-3">
            {lockedBadges.map(badge => renderBadge(badge))}
          </div>
        </div>
      )}
    </div>
  );
}