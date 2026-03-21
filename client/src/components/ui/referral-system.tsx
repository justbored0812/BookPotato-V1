import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Gift, 
  Users, 
  Copy, 
  CheckCircle,
  IndianRupee,
  Star,
  Share2
} from "lucide-react";

interface ReferralReward {
  id: number;
  description: string;
  rewardType: "commission_free" | "bonus_earning" | "badge";
  value: string;
  requiredReferrals: number;
  requiredBooksPerReferral: number;
  claimed: boolean;
}

interface ReferralStats {
  totalReferrals: number;
  activeReferrals: number;
  totalEarnings: number;
  referralCode: string;
}

export default function ReferralSystem() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);

  // Fetch referral stats
  const { data: referralStats } = useQuery<ReferralStats>({
    queryKey: ["/api/referrals/stats"],
  });

  // Fetch available rewards
  const { data: rewards = [] } = useQuery<ReferralReward[]>({
    queryKey: ["/api/referrals/rewards"],
  });

  // Fetch referred users
  const { data: referredUsers = [] } = useQuery({
    queryKey: ["/api/referrals/users"],
  });

  // Claim reward mutation
  const claimRewardMutation = useMutation({
    mutationFn: async (rewardId: number) => {
      const response = await apiRequest("POST", `/api/referrals/rewards/${rewardId}/claim`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Reward Claimed!",
        description: "Your referral reward has been applied to your account",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/referrals/rewards"] });
      queryClient.invalidateQueries({ queryKey: ["/api/referrals/stats"] });
    },
    onError: () => {
      toast({
        title: "Failed to claim reward",
        description: "Please try again later",
        variant: "destructive",
      });
    },
  });

  const copyReferralCode = () => {
    if (referralStats?.referralCode) {
      navigator.clipboard.writeText(referralStats.referralCode);
      setCopied(true);
      toast({
        title: "Referral code copied!",
        description: "Share it with friends to earn rewards",
      });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const shareReferralCode = () => {
    if (navigator.share && referralStats?.referralCode) {
      navigator.share({
        title: "Join BookShare with my referral code",
        text: `Join BookShare, the community book sharing platform! Use my referral code: ${referralStats.referralCode}`,
        url: `${window.location.origin}?ref=${referralStats.referralCode}`
      });
    } else {
      copyReferralCode();
    }
  };

  const canClaimReward = (reward: ReferralReward) => {
    if (!referralStats || reward.claimed) return false;
    
    const qualifyingReferrals = referredUsers.filter((user: any) => 
      user.booksShared >= reward.requiredBooksPerReferral
    ).length;
    
    return qualifyingReferrals >= reward.requiredReferrals;
  };

  return (
    <div className="space-y-6">
      {/* Referral Stats Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Gift className="w-5 h-5 text-green-600" />
            <span>Referral Program</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {referralStats?.totalReferrals || 0}
              </div>
              <div className="text-sm text-gray-600">Total Referrals</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {referralStats?.activeReferrals || 0}
              </div>
              <div className="text-sm text-gray-600">Active Users</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600 flex items-center justify-center">
                <IndianRupee className="w-5 h-5" />
                {referralStats?.totalEarnings || 0}
              </div>
              <div className="text-sm text-gray-600">Referral Earnings</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {rewards.filter(r => r.claimed).length}
              </div>
              <div className="text-sm text-gray-600">Rewards Claimed</div>
            </div>
          </div>

          {/* Referral Code */}
          <div className="space-y-3">
            <h3 className="font-medium">Your Referral Code</h3>
            <div className="flex space-x-2">
              <Input 
                value={referralStats?.referralCode || "Loading..."} 
                readOnly 
                className="font-mono"
              />
              <Button 
                variant="outline" 
                onClick={copyReferralCode}
                className="flex items-center space-x-2"
              >
                {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? "Copied!" : "Copy"}</span>
              </Button>
              <Button onClick={shareReferralCode}>
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Available Rewards */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Star className="w-5 h-5 text-yellow-600" />
            <span>Available Rewards</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {rewards.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No rewards available at the moment
              </div>
            ) : (
              rewards.map((reward) => (
                <Card key={reward.id} className={`border-2 ${
                  reward.claimed 
                    ? 'border-green-200 bg-green-50' 
                    : canClaimReward(reward)
                    ? 'border-blue-200 bg-blue-50'
                    : 'border-gray-200'
                }`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <h4 className="font-medium">{reward.description}</h4>
                          {reward.claimed && (
                            <Badge variant="secondary" className="bg-green-100 text-green-800">
                              Claimed
                            </Badge>
                          )}
                          {!reward.claimed && canClaimReward(reward) && (
                            <Badge variant="default">Ready to Claim!</Badge>
                          )}
                        </div>
                        <div className="text-sm text-gray-600">
                          <p>
                            Refer <strong>{reward.requiredReferrals}</strong> users who each share{" "}
                            <strong>{reward.requiredBooksPerReferral}</strong> books
                          </p>
                          <p className="mt-1">
                            Reward: <strong>{reward.value}</strong>
                          </p>
                        </div>
                        
                        {/* Progress */}
                        {!reward.claimed && (
                          <div className="text-xs text-gray-500">
                            Progress: {Math.min(
                              referredUsers.filter((user: any) => 
                                user.booksShared >= reward.requiredBooksPerReferral
                              ).length,
                              reward.requiredReferrals
                            )} / {reward.requiredReferrals} qualified referrals
                          </div>
                        )}
                      </div>
                      
                      {!reward.claimed && canClaimReward(reward) && (
                        <Button
                          onClick={() => claimRewardMutation.mutate(reward.id)}
                          disabled={claimRewardMutation.isPending}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          Claim Reward
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Referred Users */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="w-5 h-5 text-blue-600" />
            <span>Your Referrals ({referredUsers.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {referredUsers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No referrals yet</p>
              <p className="text-sm mt-2">Share your referral code to start earning rewards!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {referredUsers.map((user: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">{user.name}</p>
                    <p className="text-sm text-gray-600">
                      Joined {new Date(user.joinedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">
                      {user.booksShared} books shared
                    </p>
                    <Badge variant={user.isActive ? "default" : "secondary"}>
                      {user.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* How it Works */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-blue-800">How Referral Rewards Work</CardTitle>
        </CardHeader>
        <CardContent className="text-blue-800 text-sm space-y-2">
          <p>• Share your unique referral code with friends</p>
          <p>• When they join and become active users (share books), you earn rewards</p>
          <p>• Rewards include commission-free periods, bonus earnings, and special badges</p>
          <p>• The more active your referrals are, the better your rewards!</p>
        </CardContent>
      </Card>
    </div>
  );
}