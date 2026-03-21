import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Wallet, TrendingUp, TrendingDown, Calendar, Gift, Coins, Users, BookOpen, Target, Zap, Award, Crown, Trophy, Star, ArrowRight } from "lucide-react";
import { formatCurrency, formatDateRelative } from "@/lib/utils";
import { Link } from "wouter";

interface EarningsData {
  // Legacy fields for backwards compatibility
  totalEarned: number;
  totalSpent: number;
  moneySpent: number;
  brocksSpent: number;
  
  // New separated data
  money: {
    earned: number;
    spent: number;
    netWorth: number;
    earningTransactions?: Array<{
      id: number;
      amount: number;
      type: string;
      description: string;
      createdAt: string;
      source?: string;
      bookTitle?: string;
      borrowerName?: string;
      buyerName?: string;
    }>;
    spendingTransactions?: Array<{
      id: number;
      amount: number;
      type: string;
      description: string;
      createdAt: string;
      source?: string;
      bookTitle?: string;
      lenderName?: string;
      sellerName?: string;
    }>;
  };
  brocks: {
    earned: number;
    spent: number;
    netWorth: number;
    earningTransactions: Array<{
      id: number;
      amount: number;
      type: string;
      description: string;
      createdAt: string;
    }>;
    spendingTransactions: Array<{
      id: number;
      amount: number;
      type: string;
      description: string;
      createdAt: string;
      source?: string;
      bookTitle?: string;
      lenderName?: string;
    }>;
  };
  
  lentRentals: Array<{
    id: number;
    bookTitle: string;
    borrowerName: string;
    amount: number;
    status: string;
    startDate: string;
    endDate: string;
    actualReturnDate?: string;
  }>;
  borrowedRentals: Array<{
    id: number;
    bookTitle: string;
    lenderName: string;
    amount: number;
    paymentMethod: string;
    brocksAmount: number;
    status: string;
    startDate: string;
    endDate: string;
    actualReturnDate?: string;
  }>;
}

export default function EarningsPage() {
  const { data: earningsData, isLoading } = useQuery<EarningsData>({
    queryKey: ["/api/user/earnings"],
  });

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="h-4 bg-gray-200 rounded mb-2"></div>
              <div className="h-6 bg-gray-200 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const RewardsTab = () => {
    // Fetch all the data needed for rewards
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
      queryKey: ["/api/platform/conversion-rates"],
    });

    // Reward actions
    const rewardActions = [
      {
        action: "Refer a Friend",
        credits: platformSettings?.referralReward || 10,
        description: "Invite friends to join the platform",
        icon: <Users className="h-5 w-5 text-blue-600" />
      },
      {
        action: "Upload a Book",
        credits: platformSettings?.uploadReward || 2,
        description: "Add a new book to the library",
        icon: <BookOpen className="h-5 w-5 text-green-600" />
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
    const conversionOptions = [
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
      <div className="space-y-6 p-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Rewards Center</h2>
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
                  {(userCredits as any)?.balance || 0}
                </div>
                <p className="text-sm text-gray-600 mb-4">
                  Total Earned: {(userCredits as any)?.totalEarned || 0} credits
                </p>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Next reward at:</span>
                    <span className="font-semibold">{Math.ceil(((userCredits as any)?.balance || 0) / 20) * 20} credits</span>
                  </div>
                  <Progress 
                    value={(((userCredits as any)?.balance || 0) % 20) * 5} 
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
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'returned':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'active':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'overdue':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'return_requested':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'returned':
        return 'Completed';
      case 'active':
        return 'Active';
      case 'overdue':
        return 'Overdue';
      case 'return_requested':
        return 'Return Requested';
      default:
        return status;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-md mx-auto bg-white min-h-screen">
        <Tabs defaultValue="earnings" className="w-full">
          <TabsList className="grid w-full grid-cols-2 m-4">
            <TabsTrigger value="earnings" className="flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              Earnings
            </TabsTrigger>
            <TabsTrigger value="rewards" className="flex items-center gap-2">
              <Gift className="h-4 w-4" />
              Rewards
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="earnings">
            <div className="p-4 space-y-6">
              {/* Header */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <Wallet className="w-8 h-8 text-blue-600" />
                    <h1 className="text-3xl font-bold text-gray-900">Earnings & Spending</h1>
                  </div>
                </div>
                <p className="text-gray-600">Track your book lending earnings and borrowing expenses</p>
              </div>

              {/* Money/Brocks Tabs */}
              <Tabs defaultValue="money" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="money" className="flex items-center gap-2">
                    <Wallet className="h-4 w-4" />
                    Money
                  </TabsTrigger>
                  <TabsTrigger value="brocks" className="flex items-center gap-2">
                    <Coins className="h-4 w-4" />
                    Brocks
                  </TabsTrigger>
                </TabsList>

                {/* Money Tab */}
                <TabsContent value="money" className="space-y-6">
                  {/* Money Summary Cards */}
                  <div className="grid grid-cols-2 gap-4">
                    <Card className="border-green-200 bg-green-50">
                      <CardContent className="pt-6 text-center">
                        <TrendingUp className="h-8 w-8 text-green-600 mx-auto mb-2" />
                        <div className="text-2xl font-bold text-green-700">
                          {formatCurrency(earningsData?.money?.earned || 0)}
                        </div>
                        <div className="text-sm text-green-600">Money Earned</div>
                      </CardContent>
                    </Card>
                    
                    <Card className="border-red-200 bg-red-50">
                      <CardContent className="pt-6 text-center">
                        <TrendingDown className="h-8 w-8 text-red-600 mx-auto mb-2" />
                        <div className="text-2xl font-bold text-red-700">
                          {formatCurrency(earningsData?.money?.spent || 0)}
                        </div>
                        <div className="text-sm text-red-600">Money Spent</div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Money Net Balance */}
                  <Card className="border-blue-200 bg-blue-50">
                    <CardContent className="pt-6 text-center">
                      <div className="text-lg font-semibold text-blue-900 mb-2">Money Net Worth</div>
                      <div className={`text-3xl font-bold ${
                        (earningsData?.money?.netWorth || 0) >= 0 
                          ? 'text-green-700' 
                          : 'text-red-700'
                      }`}>
                        {formatCurrency(earningsData?.money?.netWorth || 0)}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Money Earnings Section */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4 flex items-center">
                      <TrendingUp className="h-5 w-5 mr-2 text-green-600" />
                      Money Earnings ({earningsData?.money?.earningTransactions?.length || 0})
                    </h3>
                    <div className="space-y-4">
                      {!earningsData?.money?.earningTransactions || earningsData?.money?.earningTransactions?.length === 0 ? (
                        <Card>
                          <CardContent className="pt-6 text-center">
                            <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">No Money Earnings Yet</h3>
                            <p className="text-gray-600">Start lending your books to earn money!</p>
                          </CardContent>
                        </Card>
                      ) : (
                        earningsData?.money?.earningTransactions?.map((transaction) => (
                          <Card key={transaction.id} className="hover:shadow-md transition-shadow">
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <h4 className="font-medium text-gray-900 mb-1">
                                    {transaction.bookTitle || transaction.description}
                                  </h4>
                                  <p className="text-sm text-gray-600 mb-2">
                                    {transaction.type === 'book_sale' 
                                      ? `Sold to ${transaction.buyerName}`
                                      : `Borrowed by ${transaction.borrowerName}`
                                    }
                                  </p>
                                  <div className="flex items-center space-x-2 text-sm text-gray-500">
                                    <Calendar className="h-4 w-4" />
                                    <span>{formatDateRelative(transaction.createdAt)}</span>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-lg font-semibold text-green-600">
                                    +{formatCurrency(transaction.amount)}
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Money Spending Section */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4 flex items-center">
                      <TrendingDown className="h-5 w-5 mr-2 text-red-600" />
                      Money Spending ({earningsData?.money?.spendingTransactions?.length || 0})
                    </h3>
                    <div className="space-y-3">
                      {!earningsData?.money?.spendingTransactions || earningsData?.money?.spendingTransactions?.length === 0 ? (
                        <Card>
                          <CardContent className="pt-6 text-center">
                            <TrendingDown className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">No Money Spending Yet</h3>
                            <p className="text-gray-600">All your book rentals have been paid with Brocks!</p>
                          </CardContent>
                        </Card>
                      ) : (
                        earningsData?.money?.spendingTransactions?.map((transaction) => (
                          <Card key={transaction.id} className="hover:shadow-md transition-shadow">
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <h4 className="font-medium text-gray-900 mb-1">
                                    {transaction.bookTitle || transaction.description}
                                  </h4>
                                  <p className="text-sm text-gray-600 mb-2">
                                    {transaction.type === 'book_purchase' 
                                      ? `Purchased from ${transaction.sellerName}`
                                      : `Lent by ${transaction.lenderName}`
                                    }
                                  </p>
                                  <div className="flex items-center space-x-2 text-sm text-gray-500">
                                    <Calendar className="h-4 w-4" />
                                    <span>{formatDateRelative(transaction.createdAt)}</span>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-lg font-semibold text-red-600">
                                    -{formatCurrency(transaction.amount)}
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))
                      )}
                    </div>
                  </div>
                </TabsContent>

                {/* Brocks Tab */}
                <TabsContent value="brocks" className="space-y-6">
                  {/* Brocks Summary Cards */}
                  <div className="grid grid-cols-2 gap-4">
                    <Card className="border-amber-200 bg-amber-50">
                      <CardContent className="pt-6 text-center">
                        <TrendingUp className="h-8 w-8 text-amber-600 mx-auto mb-2" />
                        <div className="text-2xl font-bold text-amber-700">
                          {earningsData?.brocks?.earned || 0}
                        </div>
                        <div className="text-sm text-amber-600">Brocks Earned</div>
                      </CardContent>
                    </Card>
                    
                    <Card className="border-red-200 bg-red-50">
                      <CardContent className="pt-6 text-center">
                        <TrendingDown className="h-8 w-8 text-red-600 mx-auto mb-2" />
                        <div className="text-2xl font-bold text-red-700">
                          {earningsData?.brocks?.spent || 0}
                        </div>
                        <div className="text-sm text-red-600">Brocks Spent</div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Brocks Net Balance */}
                  <Card className="border-blue-200 bg-blue-50">
                    <CardContent className="pt-6 text-center">
                      <div className="text-lg font-semibold text-blue-900 mb-2">Brocks Net Worth</div>
                      <div className={`text-3xl font-bold ${
                        (earningsData?.brocks?.netWorth || 0) >= 0 
                          ? 'text-green-700' 
                          : 'text-red-700'
                      }`}>
                        {earningsData?.brocks?.netWorth || 0} Brocks
                      </div>
                    </CardContent>
                  </Card>

                  {/* Brocks Earnings Section */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4 flex items-center">
                      <TrendingUp className="h-5 w-5 mr-2 text-amber-600" />
                      Brocks Earned ({earningsData?.brocks?.earningTransactions?.length || 0})
                    </h3>
                    <div className="space-y-3">
                      {earningsData?.brocks?.earningTransactions?.length === 0 ? (
                        <Card>
                          <CardContent className="pt-6 text-center">
                            <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">No Brocks Earned Yet</h3>
                            <p className="text-gray-600">Upload books, refer friends, or complete transactions to earn Brocks!</p>
                          </CardContent>
                        </Card>
                      ) : (
                        earningsData?.brocks?.earningTransactions?.map((transaction) => (
                          <Card key={transaction.id} className="hover:shadow-md transition-shadow">
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                  <h4 className="font-medium text-gray-900 mb-1">
                                    {transaction.description}
                                  </h4>
                                  <p className="text-sm text-gray-600 mb-2">
                                    {transaction.type.replace(/_/g, ' ').toUpperCase()}
                                  </p>
                                  <div className="flex items-center space-x-2 text-sm text-gray-500">
                                    <Calendar className="h-4 w-4" />
                                    <span>
                                      {new Date(transaction.createdAt).toLocaleDateString()}
                                    </span>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-lg font-semibold text-amber-600 mb-1">
                                    +{transaction.amount} Brocks
                                  </div>
                                  <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                                    Earned
                                  </Badge>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Brocks Spending Section */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4 flex items-center">
                      <TrendingDown className="h-5 w-5 mr-2 text-red-600" />
                      Brocks Spent ({earningsData?.brocks?.spendingTransactions?.length || 0})
                    </h3>
                    <div className="space-y-3">
                      {earningsData?.brocks?.spendingTransactions?.length === 0 ? (
                        <Card>
                          <CardContent className="pt-6 text-center">
                            <TrendingDown className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">No Brocks Spent Yet</h3>
                            <p className="text-gray-600">You haven't used Brocks for any transactions yet!</p>
                          </CardContent>
                        </Card>
                      ) : (
                        earningsData?.brocks?.spendingTransactions?.map((transaction) => (
                          <Card key={transaction.id} className="hover:shadow-md transition-shadow">
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                  <h4 className="font-medium text-gray-900 mb-1">
                                    {transaction.description}
                                  </h4>
                                  <p className="text-sm text-gray-600 mb-2">
                                    {transaction.source === 'rental' && transaction.lenderName ? 
                                      `Lent by ${transaction.lenderName}` : 
                                      transaction.type.replace(/_/g, ' ').toUpperCase()}
                                  </p>
                                  <div className="flex items-center space-x-2 text-sm text-gray-500">
                                    <Calendar className="h-4 w-4" />
                                    <span>
                                      {new Date(transaction.createdAt).toLocaleDateString()}
                                    </span>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-lg font-semibold text-red-600 mb-1">
                                    -{transaction.amount} Brocks
                                  </div>
                                  <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200">
                                    {transaction.source === 'rental' ? 'Rental' : 'Spent'}
                                  </Badge>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))
                      )}
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </TabsContent>
          
          <TabsContent value="rewards">
            <RewardsTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}