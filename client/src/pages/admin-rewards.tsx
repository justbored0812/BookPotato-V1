import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Gift, 
  Award, 
  CreditCard, 
  Users, 
  BookOpen, 
  Settings,
  Save,
  Calendar,
  Star
} from "lucide-react";

interface RewardSetting {
  id: number;
  settingKey: string;
  settingValue: string;
  description: string;
  updatedAt: string;
}

export default function AdminRewardsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [settingsForm, setSettingsForm] = useState<Record<string, string>>({});

  const { data: rewardSettings, isLoading } = useQuery<RewardSetting[]>({
    queryKey: ["/api/admin/rewards/settings"],
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (settings: Array<{ key: string; value: string }>) => {
      const response = await apiRequest("POST", "/api/admin/rewards/settings", { settings });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Settings Updated",
        description: "Brocks reward settings have been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/rewards/settings"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update settings",
        variant: "destructive",
      });
    },
  });

  const handleSettingChange = (key: string, value: string) => {
    setSettingsForm(prev => ({ ...prev, [key]: value }));
  };

  const handleSaveSettings = () => {
    if (!rewardSettings) return;

    const updatedSettings = Object.entries(settingsForm).map(([key, value]) => ({
      key,
      value
    }));

    updateSettingsMutation.mutate(updatedSettings);
  };

  const getSettingValue = (key: string) => {
    return settingsForm[key] ?? rewardSettings?.find(s => s.settingKey === key)?.settingValue ?? '';
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map(i => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-6 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <Gift className="w-8 h-8 text-purple-600" />
        <h1 className="text-3xl font-bold text-gray-900">Brocks Rewards Management</h1>
      </div>

      <Tabs defaultValue="credits" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="credits" className="flex items-center space-x-2">
            <CreditCard className="w-4 h-4" />
            <span>Credits</span>
          </TabsTrigger>
          <TabsTrigger value="referrals" className="flex items-center space-x-2">
            <Users className="w-4 h-4" />
            <span>Referrals</span>
          </TabsTrigger>
          <TabsTrigger value="uploads" className="flex items-center space-x-2">
            <BookOpen className="w-4 h-4" />
            <span>Upload Rewards</span>
          </TabsTrigger>
          <TabsTrigger value="badges" className="flex items-center space-x-2">
            <Award className="w-4 h-4" />
            <span>Badges</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="credits" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <CreditCard className="w-5 h-5 text-purple-600" />
                <span>Brocks Credit Settings</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="opening_credits">Opening Credits (Brocks)</Label>
                  <Input
                    id="opening_credits"
                    type="number"
                    min="0"
                    placeholder="100"
                    value={getSettingValue('opening_credits')}
                    onChange={(e) => handleSettingChange('opening_credits', e.target.value)}
                  />
                  <p className="text-sm text-gray-500">
                    Number of Brocks credited to new users when they create an account
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="credit_value_rupees">Credit Value (₹ per Brock)</Label>
                  <Input
                    id="credit_value_rupees"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="1.00"
                    value={getSettingValue('credit_value_rupees')}
                    onChange={(e) => handleSettingChange('credit_value_rupees', e.target.value)}
                  />
                  <p className="text-sm text-gray-500">
                    How much each Brock is worth in Indian Rupees
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="referrals" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="w-5 h-5 text-blue-600" />
                <span>Referral Badge Thresholds</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="silver_referrals" className="flex items-center space-x-2">
                    <Badge className="bg-gray-400 text-white text-xs px-2 py-1">SILVER</Badge>
                    <span>Referrals Required</span>
                  </Label>
                  <Input
                    id="silver_referrals"
                    type="number"
                    min="1"
                    placeholder="5"
                    value={getSettingValue('silver_referrals')}
                    onChange={(e) => handleSettingChange('silver_referrals', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gold_referrals" className="flex items-center space-x-2">
                    <Badge className="bg-yellow-500 text-white text-xs px-2 py-1">GOLD</Badge>
                    <span>Referrals Required</span>
                  </Label>
                  <Input
                    id="gold_referrals"
                    type="number"
                    min="1"
                    placeholder="10"
                    value={getSettingValue('gold_referrals')}
                    onChange={(e) => handleSettingChange('gold_referrals', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="platinum_referrals" className="flex items-center space-x-2">
                    <Badge className="bg-purple-600 text-white text-xs px-2 py-1">PLATINUM</Badge>
                    <span>Referrals Required</span>
                  </Label>
                  <Input
                    id="platinum_referrals"
                    type="number"
                    min="1"
                    placeholder="15"
                    value={getSettingValue('platinum_referrals')}
                    onChange={(e) => handleSettingChange('platinum_referrals', e.target.value)}
                  />
                </div>
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">How Referral System Works</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Users get a unique referral code when they sign up</li>
                  <li>• When new users sign up using the code, both get credited</li>
                  <li>• Badges are awarded automatically when thresholds are reached</li>
                  <li>• Higher badges unlock better rewards and status</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="uploads" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BookOpen className="w-5 h-5 text-green-600" />
                <span>Book Upload Reward Settings</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="upload_10_reward" className="flex items-center space-x-2">
                    <span>10 Books Upload</span>
                    <Badge className="bg-green-500 text-white text-xs px-2 py-1">REWARD</Badge>
                  </Label>
                  <Input
                    id="upload_10_reward"
                    type="number"
                    min="0"
                    placeholder="10"
                    value={getSettingValue('upload_10_reward')}
                    onChange={(e) => handleSettingChange('upload_10_reward', e.target.value)}
                  />
                  <p className="text-sm text-gray-500">Commission-free days</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="upload_20_reward" className="flex items-center space-x-2">
                    <span>20 Books Upload</span>
                    <Badge className="bg-green-600 text-white text-xs px-2 py-1">REWARD</Badge>
                  </Label>
                  <Input
                    id="upload_20_reward"
                    type="number"
                    min="0"
                    placeholder="20"
                    value={getSettingValue('upload_20_reward')}
                    onChange={(e) => handleSettingChange('upload_20_reward', e.target.value)}
                  />
                  <p className="text-sm text-gray-500">Commission-free days</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="upload_30_reward" className="flex items-center space-x-2">
                    <span>30 Books Upload</span>
                    <Badge className="bg-green-700 text-white text-xs px-2 py-1">REWARD</Badge>
                  </Label>
                  <Input
                    id="upload_30_reward"
                    type="number"
                    min="0"
                    placeholder="60"
                    value={getSettingValue('upload_30_reward')}
                    onChange={(e) => handleSettingChange('upload_30_reward', e.target.value)}
                  />
                  <p className="text-sm text-gray-500">Commission-free days</p>
                </div>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-medium text-green-900 mb-2">Upload Rewards System</h4>
                <ul className="text-sm text-green-800 space-y-1">
                  <li>• Rewards activate immediately when milestone is reached</li>
                  <li>• Commission-free period applies to future book rentals</li>
                  <li>• Users earn full rental income during reward period</li>
                  <li>• Encourages quality book contributions to the platform</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="badges" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Award className="w-5 h-5 text-orange-600" />
                <span>Badge System Overview</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">Referral Badges</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Badge className="bg-gray-400 text-white">SILVER</Badge>
                        <span className="text-sm">Silver Referrer</span>
                      </div>
                      <span className="text-sm font-medium">{getSettingValue('silver_referrals')} referrals</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Badge className="bg-yellow-500 text-white">GOLD</Badge>
                        <span className="text-sm">Gold Referrer</span>
                      </div>
                      <span className="text-sm font-medium">{getSettingValue('gold_referrals')} referrals</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Badge className="bg-purple-600 text-white">PLATINUM</Badge>
                        <span className="text-sm">Platinum Referrer</span>
                      </div>
                      <span className="text-sm font-medium">{getSettingValue('platinum_referrals')} referrals</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">Upload Badges</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Star className="w-4 h-4 text-green-600" />
                        <span className="text-sm">Book Contributor</span>
                      </div>
                      <span className="text-sm font-medium">10 books</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-green-100 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Star className="w-4 h-4 text-green-700" />
                        <span className="text-sm">Library Builder</span>
                      </div>
                      <span className="text-sm font-medium">20 books</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-green-200 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Star className="w-4 h-4 text-green-800" />
                        <span className="text-sm">Master Curator</span>
                      </div>
                      <span className="text-sm font-medium">30 books</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Save Button */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-medium text-gray-900">Save Settings</h3>
              <p className="text-sm text-gray-500">Apply all changes to the reward system</p>
            </div>
            <Button
              onClick={handleSaveSettings}
              disabled={updateSettingsMutation.isPending || Object.keys(settingsForm).length === 0}
              className="flex items-center space-x-2"
            >
              <Save className="w-4 h-4" />
              <span>{updateSettingsMutation.isPending ? "Saving..." : "Save All Settings"}</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}