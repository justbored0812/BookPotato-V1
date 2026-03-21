import { useQuery } from "@tanstack/react-query";
import { Copy, Users, Gift, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

export default function Referrals() {
  const { toast } = useToast();

  const { data: user } = useQuery({
    queryKey: ["/api/auth/me"],
  });

  const { data: referralStats } = useQuery({
    queryKey: ["/api/referrals/stats"],
  });

  const { data: referredUsers } = useQuery({
    queryKey: ["/api/referrals/list"],
  });

  const copyReferralCode = () => {
    if (user?.referralCode) {
      navigator.clipboard.writeText(user.referralCode);
      toast({
        title: "Referral Code Copied!",
        description: "Share this code with friends to earn rewards",
      });
    }
  };

  const shareReferralLink = () => {
    const referralLink = `${window.location.origin}/register?ref=${user?.referralCode}`;
    navigator.clipboard.writeText(referralLink);
    toast({
      title: "Referral Link Copied!",
      description: "Share this link with friends to invite them",
    });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Referral Program</h1>
        <p className="text-gray-600">
          Invite friends and earn rewards for every successful referral
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Referrals</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{user?.totalReferrals || 0}</div>
            <p className="text-xs text-muted-foreground">
              Friends you've invited
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rewards Earned</CardTitle>
            <Gift className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{referralStats?.totalEarnings || 0}</div>
            <p className="text-xs text-muted-foreground">
              From referral bonuses
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rank</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">#{referralStats?.rank || '-'}</div>
            <p className="text-xs text-muted-foreground">
              Among all users
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Your Referral Code</CardTitle>
            <CardDescription>
              Share this code with friends to get them started
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input 
                value={user?.referralCode || 'Loading...'} 
                readOnly 
                className="font-mono"
              />
              <Button onClick={copyReferralCode} variant="outline">
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            
            <Button onClick={shareReferralLink} className="w-full">
              Share Referral Link
            </Button>

            <div className="text-sm text-gray-600 space-y-2">
              <p><strong>How it works:</strong></p>
              <ul className="list-disc list-inside space-y-1">
                <li>Share your referral code with friends</li>
                <li>They sign up using your code</li>
                <li>You both get ₹50 credit when they join a society</li>
                <li>Earn additional rewards for active referrals</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Your Referrals</CardTitle>
            <CardDescription>
              Friends who joined using your code
            </CardDescription>
          </CardHeader>
          <CardContent>
            {referredUsers && referredUsers.length > 0 ? (
              <div className="space-y-3">
                {referredUsers.map((referral: any) => (
                  <div key={referral.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{referral.name}</p>
                      <p className="text-sm text-gray-600">
                        Joined {new Date(referral.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-green-600">+₹50</p>
                      <p className="text-xs text-gray-500">Bonus earned</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No referrals yet</p>
                <p className="text-sm">Start sharing your code to see referrals here</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}