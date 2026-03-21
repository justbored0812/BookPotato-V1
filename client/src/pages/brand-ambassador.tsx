import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ArrowLeft, Gift, Award, Trophy, Star, Share2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

const rewardTiers = [
  {
    users: 5,
    brocks: 500,
    options: [
      { name: "500 Brocks", icon: "💎" }
    ]
  },
  {
    users: 10,
    brocks: 1000,
    options: [
      { name: "Doms Aqua Sketch Pen Set", icon: "🎨" },
      { name: "Doms Champion Kit", icon: "📦" },
      { name: "McDonald's Voucher", icon: "🍔" },
      { name: "1000 Brocks", icon: "💎" }
    ]
  },
  {
    users: 20,
    brocks: 2500,
    options: [
      { name: "Doms Art Zania KIT", icon: "🎨" },
      { name: "Nivia Football", icon: "⚽" },
      { name: "Insulated Hot/Cold Travel Lunch Bag", icon: "🎒" },
      { name: "2500 Brocks", icon: "💎" }
    ]
  },
  {
    users: 30,
    brocks: 4000,
    options: [
      { name: "DOMS Art Gear KIT", icon: "🎨" },
      { name: "Boat Rockerz / Sony MDR ZX 110 A Head Phones", icon: "🎧" },
      { name: "SkyBag Riddle Blue Orange School Bag", icon: "🎒" },
      { name: "4000 Brocks", icon: "💎" }
    ]
  },
  {
    users: 50,
    brocks: 10000,
    options: [
      { name: "BOAT Airdopes", icon: "🎧" },
      { name: "Zebronics Gaming Keyboard and Mouse (RGB backlit)", icon: "⌨️" },
      { name: "DSC Bat", icon: "🏏" },
      { name: "Nyka Voucher worth Rs 2000", icon: "💄" },
      { name: "10000 Brocks", icon: "💎" }
    ]
  },
  {
    users: 75,
    brocks: 20000,
    options: [
      { name: "Alexa Echo Pop", icon: "🔊" },
      { name: "Philips Air Fryer", icon: "🍟" },
      { name: "Smart Ring BOAT", icon: "💍" },
      { name: "20000 Brocks", icon: "💎" }
    ]
  }
];

export default function BrandAmbassador() {
  const [, navigate] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const { data: currentUser } = useQuery({
    queryKey: ["/api/auth/me"],
  });

  const { data: referralStats } = useQuery({
    queryKey: ["/api/user/referral-stats"],
  });

  const userCode = (currentUser as any)?.user?.userNumber || (currentUser as any)?.userNumber || "Loading...";
  const totalReferrals = (referralStats as any)?.totalReferrals || 0;
  const qualifiedReferrals = (referralStats as any)?.qualifiedReferrals || 0;

  const currentTier = rewardTiers.find((tier, index) => {
    const nextTier = rewardTiers[index + 1];
    return qualifiedReferrals >= tier.users && (!nextTier || qualifiedReferrals < nextTier.users);
  }) || rewardTiers[0];

  const nextTier = rewardTiers.find(tier => qualifiedReferrals < tier.users);

  const shareMessage = `Join BookPotato and share books with your community! 📚\n\nUse my referral code: ${userCode}\nSign up at: https://bookpotato.in\n\nStart sharing and reading books today!`;
  const whatsappLink = `https://wa.me/?text=${encodeURIComponent(shareMessage)}`;

  const handleCopyCode = () => {
    const copyText = `Join BookPotato and share books with your community! 📚\n\nUse my referral code: ${userCode}\nSign up at: https://bookpotato.in\n\nStart sharing and reading books today!`;
    navigator.clipboard.writeText(copyText);
    toast({
      title: "Code Copied!",
      description: "Your referral code and link have been copied to clipboard",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="flex items-center justify-between p-4">
          <Button 
            variant="ghost" 
            onClick={() => navigate("/")}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back</span>
          </Button>
          <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            Brand Ambassador
          </h1>
          <div className="w-16" />
        </div>
      </div>

      <div className="p-4 space-y-6 max-w-4xl mx-auto pb-20">
        {/* Hero Section */}
        <Card className="bg-gradient-to-r from-purple-600 to-pink-600 text-white border-0">
          <CardContent className="pt-6 pb-6">
            <div className="text-center space-y-4">
              <Trophy className="w-16 h-16 mx-auto" />
              <h2 className="text-2xl font-bold">Be a Brand Ambassador</h2>
              <p className="text-purple-100 text-lg">
                Earn Sweeping Rewards in Your Hub
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Your Referral Code */}
        <Card className="border-2 border-purple-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Share2 className="w-5 h-5 text-purple-600" />
              Your Referral Code
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-gradient-to-r from-purple-100 to-pink-100 p-6 rounded-lg text-center">
              <Label className="text-sm text-gray-600 mb-2 block">Your Code</Label>
              <div className="text-4xl font-bold text-purple-600 mb-4 font-mono tracking-wider">
                {userCode}
              </div>
              <div className="flex gap-2 justify-center">
                <Button onClick={handleCopyCode} variant="outline" className="flex-1 max-w-xs">
                  Copy Code
                </Button>
                <Button 
                  onClick={() => window.open(whatsappLink, '_blank')} 
                  className="flex-1 max-w-xs bg-green-500 hover:bg-green-600 text-white"
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Share on WhatsApp
                </Button>
              </div>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-semibold mb-2">How it Works:</h4>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-start">
                  <span className="mr-2">1️⃣</span>
                  <span>Share your code with friends and family</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">2️⃣</span>
                  <span>They enter your code during signup or in their profile</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">3️⃣</span>
                  <span>They upload at least 5 books to qualify</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">4️⃣</span>
                  <span>You earn rewards based on qualified referrals!</span>
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Progress */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              Your Progress
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-green-50 p-4 rounded-lg text-center">
                <div className="text-3xl font-bold text-green-600">{qualifiedReferrals}</div>
                <div className="text-sm text-gray-600">Qualified Referrals</div>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg text-center">
                <div className="text-3xl font-bold text-blue-600">{totalReferrals}</div>
                <div className="text-sm text-gray-600">Total Referrals</div>
              </div>
            </div>

            {nextTier && (
              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-semibold">Next Reward</span>
                  <Badge variant="secondary">{nextTier.users} Users</Badge>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className="bg-gradient-to-r from-purple-500 to-pink-500 h-3 rounded-full transition-all"
                    style={{ width: `${(qualifiedReferrals / nextTier.users) * 100}%` }}
                  />
                </div>
                <p className="text-xs text-gray-600 mt-2">
                  {nextTier.users - qualifiedReferrals} more qualified users needed
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Reward Tiers */}
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-center">Exciting Rewards</h3>
          {rewardTiers.map((tier, index) => (
            <Card 
              key={index} 
              className={`${qualifiedReferrals >= tier.users ? 'border-2 border-green-500 bg-green-50' : ''}`}
            >
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Award className="w-5 h-5 text-purple-600" />
                    {tier.users} Users
                  </span>
                  {qualifiedReferrals >= tier.users && (
                    <Badge className="bg-green-500">Achieved! ✓</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {tier.options.map((option, optIndex) => (
                    <div key={optIndex} className="flex items-center gap-3 p-3 bg-white rounded-lg border">
                      <span className="text-2xl">{option.icon}</span>
                      <span className="text-sm font-medium">{option.name}</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-3 italic">
                  Choose any one reward option from above
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Important Conditions */}
        <Card className="border-2 border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-800">
              <Star className="w-5 h-5" />
              Important Conditions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-gray-700">
            <p>✓ Each referred user must upload at least 5 books to be counted towards the scheme</p>
            <p>✓ This scheme is valid for all users reaching milestones on or before <strong>28 Feb 2026</strong></p>
            <p>✓ For the tier you qualify, you can choose any one reward option</p>
            <p>✓ Rewards will be processed within 7 working days of reaching the milestone</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
