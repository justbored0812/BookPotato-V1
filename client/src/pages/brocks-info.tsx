import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Coins, BookOpen, Users, Target, Gift, Zap, CreditCard, Check } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/lib/utils";

export default function BrocksInfoPage() {
  const [, navigate] = useLocation();
  const [selectedPackage, setSelectedPackage] = useState<string>("");

  // Fetch user credits
  const { data: userCredits } = useQuery({
    queryKey: ["/api/user/credits"],
  });

  // Fetch platform settings for reward amounts
  const { data: platformSettings } = useQuery({
    queryKey: ["/api/admin/platform-settings"],
  });

  // Fetch brocks packages for buy section
  const { data: brocksPackages } = useQuery({
    queryKey: ["/api/brocks-packages"],
  });

  // Fetch conversion rates
  const { data: conversionRates } = useQuery({
    queryKey: ["/api/admin/brocks-conversion-rates"],
  });

  const rewardActions = [
    {
      action: "Upload a Book",
      credits: platformSettings?.bookUploadReward || 2,
      description: "Add a book to your society's library",
      icon: <BookOpen className="h-5 w-5 text-blue-600" />
    },
    {
      action: "Successful Referral",
      credits: platformSettings?.referralReward || 10,
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 text-white p-6">
        <div className="flex items-center space-x-4 mb-4">
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-white opacity-90 hover:opacity-100"
            onClick={() => navigate("/")}
            data-testid="brocks-info-back-button"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </div>
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-white bg-opacity-20 rounded-xl flex items-center justify-center">
            <Coins className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Brocks Information</h1>
            <p className="text-sm opacity-90">
              Everything you need to know about Brocks credits
            </p>
          </div>
        </div>
        
        {/* Current Balance */}
        <div className="mt-6 bg-white bg-opacity-20 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm opacity-90">Your Current Balance:</span>
            <div className="flex items-center space-x-2">
              <Coins className="h-4 w-4" />
              <span className="text-lg font-bold">{(userCredits as any)?.balance || 0} Brocks</span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <Tabs defaultValue="what" className="w-full">
          <TabsList className="grid w-full grid-cols-3" data-testid="brocks-info-tabs">
            <TabsTrigger value="what" data-testid="tab-what">What Are Brocks</TabsTrigger>
            <TabsTrigger value="earn" data-testid="tab-earn">How To Earn</TabsTrigger>
            <TabsTrigger value="buy" data-testid="tab-buy">Buy Brocks</TabsTrigger>
          </TabsList>

          {/* What Are Brocks */}
          <TabsContent value="what" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Coins className="w-5 h-5 text-amber-500" />
                  <span>What Are Brocks?</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  Brocks are virtual credits that serve as the backbone of our community reward system. 
                  Think of them as your contribution currency - the more you engage with the platform, 
                  the more Brocks you earn!
                </p>
                
                <div className="space-y-3">
                  <h4 className="font-semibold text-lg">Key Features:</h4>
                  <ul className="space-y-2 list-disc list-inside text-muted-foreground">
                    <li><strong>Reward Points:</strong> Brocks are digital credits stored in your account</li>
                    <li><strong>Activity Rewards:</strong> Earn them by participating in the book sharing community</li>
                    <li><strong>Flexible Usage:</strong> Convert to real benefits like commission-free days or cash</li>
                    <li><strong>Community Building:</strong> Encourages active participation and helping others</li>
                  </ul>
                </div>

                <Separator />

                <div className="space-y-3">
                  <h4 className="font-semibold text-lg">What Can You Do With Brocks?</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {conversionOptions.map((option, index) => (
                      <div key={index} className="p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                        <div className="flex items-center space-x-3 mb-3">
                          {option.icon}
                          <h4 className="font-semibold text-gray-900">{option.type}</h4>
                        </div>
                        <p className="text-sm text-gray-600 mb-3">{option.description}</p>
                        <div className="text-sm text-gray-500">
                          {option.rate} Brocks = 1 {option.type === "Cash Conversion" ? "rupee" : "day"}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* How To Earn */}
          <TabsContent value="earn" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Target className="w-5 h-5 text-green-500" />
                  <span>How To Earn Brocks</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  Earning Brocks is simple! Just be an active member of the book sharing community. 
                  Here are all the ways you can earn credits:
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {rewardActions.map((action, index) => (
                    <div key={index} className="p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="flex items-center space-x-3 mb-3">
                        {action.icon}
                        <div>
                          <h4 className="font-semibold text-gray-900">{action.action}</h4>
                          <Badge variant="secondary" className="text-xs">
                            +{action.credits} Brocks
                          </Badge>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600">{action.description}</p>
                    </div>
                  ))}
                </div>

                <Separator />

                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-blue-800 mb-2">💡 Pro Tips for Earning More:</h4>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>• Upload quality books that others want to read</li>
                    <li>• Share your referral code with friends and family</li>
                    <li>• Stay active by both borrowing and lending books</li>
                    <li>• Join multiple societies to expand your network</li>
                    <li>• Keep your books in good condition for better ratings</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Buy Brocks */}
          <TabsContent value="buy" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Coins className="h-6 w-6 text-amber-600" />
                  Purchase Brocks Credits
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  Get Brocks credits for commission-free rentals and instant discounts.
                </p>
                <Button 
                  onClick={() => navigate("/buy-brocks")} 
                  size="lg" 
                  className="w-full"
                  data-testid="go-to-buy-brocks"
                >
                  <CreditCard className="mr-2 h-5 w-5" />
                  Go to Buy Brocks Page
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}