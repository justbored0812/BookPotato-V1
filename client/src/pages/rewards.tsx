import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Link } from "wouter";
import { 
  Coins, 
  Star, 
  Gift, 
  BookOpen, 
  Users, 
  ArrowRight, 
  Trophy,
  Target,
  Zap,
  Crown,
  Award,
  TrendingUp
} from "lucide-react";

interface RewardAction {
  action: string;
  credits: number;
  description: string;
  icon: React.ReactNode;
}

interface ConversionOption {
  type: string;
  rate: number;
  description: string;
  icon: React.ReactNode;
}

export default function RewardsPage() {
  // Fetch user credits and badges
  const { data: userCredits } = useQuery({
    queryKey: ["/api/user/credits"],
  });

  const { data: userBadges = [] } = useQuery({
    queryKey: ["/api/user/badges"],
  });

  const { data: recentRewards = [] } = useQuery({
    queryKey: ["/api/user/recent-rewards"],
  });

  const { data: platformSettings } = useQuery({
    queryKey: ["/api/platform/settings"],
  });

  const { data: conversionRates } = useQuery({
    queryKey: ["/api/admin/brocks-conversion-rates"],
  });

  // Reward earning actions
  const rewardActions: RewardAction[] = [
    {
      action: "Upload a Book",
      credits: platformSettings?.bookUploadReward || 1,
      description: "Add a book to your society's library",
      icon: <BookOpen className="h-5 w-5 text-blue-600" />
    },
    {
      action: "Successful Referral",
      credits: platformSettings?.referralReward || 5,
      description: "Invite someone who joins and stays active",
      icon: <Users className="h-5 w-5 text-green-600" />
    },
    {
      action: "Borrow a Book",
      credits: platformSettings?.borrowReward || 5,
      description: "Complete a book borrowing transaction",
      icon: <Target className="h-5 w-5 text-purple-600" />
    },
    {
      action: "Lend a Book",
      credits: platformSettings?.lendReward || 5,
      description: "Someone borrows your book",
      icon: <Gift className="h-5 w-5 text-orange-600" />
    }
  ];

  // Conversion options
  const conversionOptions: ConversionOption[] = [
    {
      type: "Commission-Free Days",
      rate: parseInt(conversionRates?.creditsToCommissionFreeDaysRate || "20"),
      description: "Skip platform commission on your book lending",
      icon: <Zap className="h-5 w-5 text-yellow-600" />
    },
    {
      type: "Cash Conversion",
      rate: parseInt(conversionRates?.creditsToRupeesRate || "20"),
      description: "Convert credits to real money",
      icon: <Coins className="h-5 w-5 text-green-600" />
    }
  ];

  // Badge system
  const allBadges = [
    { type: "Bronze Referrer", requirement: "1+ referrals", icon: <Award className="h-5 w-5 text-amber-600" /> },
    { type: "Silver Referrer", requirement: "5+ referrals", icon: <Award className="h-5 w-5 text-gray-400" /> },
    { type: "Gold Referrer", requirement: "10+ referrals", icon: <Award className="h-5 w-5 text-yellow-500" /> },
    { type: "Platinum Referrer", requirement: "15+ referrals", icon: <Crown className="h-5 w-5 text-purple-600" /> }
  ];

  const userBadgeTypes = (userBadges as any[]).map(badge => badge.badgeType);

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Rewards Center</h1>
          <p className="text-gray-600">Earn Brocks credits and unlock exclusive benefits</p>
        </div>
        <Link href="/buy-brocks">
          <Button className="flex items-center space-x-2">
            <Coins className="h-4 w-4" />
            <span>Buy Brocks</span>
          </Button>
        </Link>
      </div>

      {/* Current Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Brocks Balance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Coins className="h-6 w-6 text-amber-600" />
              <span>Your Brocks Credits</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <div className="text-4xl font-bold text-amber-600 mb-2">
                {userCredits?.balance || 0}
              </div>
              <p className="text-sm text-gray-600 mb-4">
                Total Earned: {userCredits?.totalEarned || 0} credits
              </p>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Next reward at:</span>
                  <span className="font-semibold">{Math.ceil((userCredits?.balance || 0) / 20) * 20} credits</span>
                </div>
                <Progress 
                  value={((userCredits?.balance || 0) % 20) * 5} 
                  className="h-2"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Badges */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Trophy className="h-6 w-6 text-purple-600" />
              <span>Your Achievements</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {userBadges && (userBadges as any[]).length > 0 ? (
                (userBadges as any[]).map((badge: any, index: number) => (
                  <div key={index} className="flex items-center space-x-3">
                    <Award className="h-5 w-5 text-amber-600" />
                    <div>
                      <Badge variant="secondary" className="font-medium">
                        {badge.badgeType}
                      </Badge>
                      <p className="text-xs text-gray-500 mt-1">
                        Earned on {new Date(badge.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-4">
                  <Star className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">No badges earned yet</p>
                  <p className="text-xs text-gray-500">Start referring friends to earn your first badge!</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* How to Earn Brocks */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="h-6 w-6 text-green-600" />
            <span>How to Earn Brocks Credits</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {rewardActions.map((action, index) => (
              <div key={index} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                {action.icon}
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900">{action.action}</h4>
                  <p className="text-sm text-gray-600">{action.description}</p>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-amber-600">+{action.credits}</div>
                  <div className="text-xs text-gray-500">credits</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* What You Can Do With Brocks */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Gift className="h-6 w-6 text-purple-600" />
            <span>Redeem Your Credits</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {conversionOptions.map((option, index) => (
              <div key={index} className="p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex items-center space-x-3 mb-3">
                  {option.icon}
                  <h4 className="font-semibold text-gray-900">{option.type}</h4>
                </div>
                <p className="text-sm text-gray-600 mb-3">{option.description}</p>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">
                    {option.rate} credits = 1 {option.type === "Cash Conversion" ? "rupee" : "day"}
                  </span>
                  <ArrowRight className="h-4 w-4 text-gray-400" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Badge System */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Crown className="h-6 w-6 text-purple-600" />
            <span>Achievement Badges</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {allBadges.map((badge, index) => {
              const isEarned = userBadgeTypes.includes(badge.type);
              return (
                <div 
                  key={index} 
                  className={`p-4 border rounded-lg text-center ${
                    isEarned ? 'bg-amber-50 border-amber-200' : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className={`mx-auto mb-2 ${isEarned ? 'text-amber-600' : 'text-gray-400'}`}>
                    {badge.icon}
                  </div>
                  <h4 className={`font-semibold text-sm mb-1 ${
                    isEarned ? 'text-amber-800' : 'text-gray-600'
                  }`}>
                    {badge.type}
                  </h4>
                  <p className="text-xs text-gray-500">{badge.requirement}</p>
                  {isEarned && (
                    <Badge variant="secondary" className="mt-2 text-xs">
                      Earned!
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Recent Rewards */}
      {recentRewards && (recentRewards as any[]).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Star className="h-6 w-6 text-yellow-600" />
              <span>Recent Rewards</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(recentRewards as any[]).slice(0, 5).map((reward: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Coins className="h-4 w-4 text-amber-600" />
                    <div>
                      <p className="font-medium text-sm">{reward.action}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(reward.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary">
                    +{reward.credits} credits
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}