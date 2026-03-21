import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { Bell, User, Shield, Globe, HelpCircle, Trophy, Gift } from "lucide-react";
import BadgeSystem from "@/components/ui/badge-system";
import ReferralSystem from "@/components/ui/referral-system";

export default function Settings() {
  const { toast } = useToast();
  
  // Fetch user stats for badge system
  const { data: userStats } = useQuery({
    queryKey: ["/api/user/stats"],
  });

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-gray-600">Manage your account and preferences</p>
        </div>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="privacy">Privacy</TabsTrigger>
            <TabsTrigger value="badges">Badges</TabsTrigger>
            <TabsTrigger value="referrals">Referrals</TabsTrigger>
            <TabsTrigger value="help">Help</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-6">
            {/* Profile Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <User className="w-5 h-5" />
                  <span>Profile Information</span>
                </CardTitle>
                <CardDescription>
                  Update your personal information and preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="first-name">First Name</Label>
                    <Input id="first-name" placeholder="Enter your first name" />
                  </div>
                  <div>
                    <Label htmlFor="last-name">Last Name</Label>
                    <Input id="last-name" placeholder="Enter your last name" />
                  </div>
                </div>

                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" placeholder="Enter your email" />
                </div>

                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input id="phone" type="tel" placeholder="Enter your phone number" />
                </div>

                <div>
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea 
                    id="bio" 
                    placeholder="Tell others about yourself..." 
                    className="min-h-[100px]"
                  />
                </div>

                <Button onClick={() => toast({ title: "Profile updated", description: "Your profile has been saved successfully" })}>
                  Save Changes
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Bell className="w-5 h-5" />
                  <span>Notification Preferences</span>
                </CardTitle>
                <CardDescription>
                  Choose how you want to be notified about important events
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Book Requests</h4>
                      <p className="text-sm text-gray-600">Get notified when someone wants to borrow your books</p>
                    </div>
                    <Switch defaultChecked />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Return Reminders</h4>
                      <p className="text-sm text-gray-600">Reminders about upcoming book return dates</p>
                    </div>
                    <Switch defaultChecked />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">New Books in Society</h4>
                      <p className="text-sm text-gray-600">When new books are added to your societies</p>
                    </div>
                    <Switch />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Messages</h4>
                      <p className="text-sm text-gray-600">Direct messages from other users</p>
                    </div>
                    <Switch defaultChecked />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Marketing Updates</h4>
                      <p className="text-sm text-gray-600">Updates about new features and promotions</p>
                    </div>
                    <Switch />
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <h4 className="font-medium">Notification Methods</h4>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <input type="checkbox" id="email-notifications" defaultChecked />
                      <Label htmlFor="email-notifications">Email notifications</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input type="checkbox" id="push-notifications" />
                      <Label htmlFor="push-notifications">Push notifications</Label>
                    </div>
                  </div>
                </div>

                <Button onClick={() => toast({ title: "Notification settings updated", description: "Your preferences have been saved" })}>
                  Save Preferences
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="privacy" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Shield className="w-5 h-5" />
                  <span>Privacy & Security</span>
                </CardTitle>
                <CardDescription>
                  Control who can see your information and how it's used
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Profile Visibility</h4>
                      <p className="text-sm text-gray-600">Make your profile visible to other society members</p>
                    </div>
                    <Switch defaultChecked />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Show Book Collection</h4>
                      <p className="text-sm text-gray-600">Let others see your book collection</p>
                    </div>
                    <Switch defaultChecked />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Show Reading History</h4>
                      <p className="text-sm text-gray-600">Display books you've read to other users</p>
                    </div>
                    <Switch />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Allow Direct Messages</h4>
                      <p className="text-sm text-gray-600">Let other users send you direct messages</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <h4 className="font-medium">Data & Privacy</h4>
                  <div className="space-y-2">
                    <Button variant="outline" className="w-full justify-start">
                      Download My Data
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      Delete Account
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="badges" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Trophy className="w-5 h-5 text-yellow-600" />
                  <span>Achievement Badges</span>
                </CardTitle>
                <CardDescription>
                  Track your progress and unlock badges by being an active community member
                </CardDescription>
              </CardHeader>
              <CardContent>
                {userStats ? (
                  <BadgeSystem 
                    userStats={{
                      booksLent: userStats.lentBooks || 0,
                      booksRented: userStats.borrowedBooks || 0,
                      totalEarnings: userStats.totalEarnings || 0,
                      societiesJoined: 1, // Default to 1 for now
                      ratingsReceived: 0, // Would need rating system
                      averageRating: 0 // Would need rating system
                    }}
                  />
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    Loading your achievements...
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="referrals" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Gift className="w-5 h-5 text-green-600" />
                  <span>Referral Program</span>
                </CardTitle>
                <CardDescription>
                  Invite friends and earn rewards when they become active community members
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ReferralSystem />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="help" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <HelpCircle className="w-5 h-5" />
                  <span>Help & Support</span>
                </CardTitle>
                <CardDescription>
                  Get help with BookShare features and contact support
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <h4 className="font-medium">Frequently Asked Questions</h4>
                    <div className="space-y-2 text-sm text-gray-600">
                      <p><strong>How do I lend a book?</strong> Go to My Books, click Add Book, and scan the barcode or enter details manually.</p>
                      <p><strong>How do late fees work?</strong> Late fees are charged at 50% of the daily rental rate for each day overdue.</p>
                      <p><strong>Can I extend my rental?</strong> Yes, you can request an extension which the book owner can approve.</p>
                      <p><strong>How do I join a society?</strong> Go to Societies page and join existing ones or request to create new ones.</p>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <h4 className="font-medium">Contact Support</h4>
                    <p className="text-sm text-gray-600">
                      Need help? Contact our support team at support@bookshare.com or use the form below.
                    </p>
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="support-subject">Subject</Label>
                        <Input id="support-subject" placeholder="What do you need help with?" />
                      </div>
                      <div>
                        <Label htmlFor="support-message">Message</Label>
                        <Textarea 
                          id="support-message" 
                          placeholder="Describe your issue or question..." 
                          className="min-h-[100px]"
                        />
                      </div>
                      <Button onClick={() => toast({ title: "Support request sent", description: "We'll get back to you within 24 hours" })}>
                        Send Message
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}