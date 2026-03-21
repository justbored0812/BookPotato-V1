import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";
import { 
  ArrowLeft, 
  BookOpen, 
  Users, 
  Coins, 
  ArrowRight,
  CheckCircle,
  Clock,
  CreditCard,
  Gift,
  Crown,
  Trophy,
  Award
} from "lucide-react";

const steps = [
  {
    number: 1,
    title: "Join Your Hub",
    description: "Find and join your community hub (Society, School, or Office) or create a new one.",
    icon: Users,
    color: "bg-blue-500",
    details: [
      "Search for your hub by name or code",
      "Request to join if it exists",
      "Create a new hub (Society, School, or Office)",
      "Get verified by providing valid details"
    ]
  },
  {
    number: 2,
    title: "Add Your Books",
    description: "List your entire library in seconds with our smart bulk upload feature! Just snap photos and our AI does the rest.",
    icon: BookOpen,
    color: "bg-green-500",
    details: [
      "Use bulk upload to add multiple books at once",
      "AI automatically recognizes book details from photos",
      "Set condition and pricing for each book",
      "Earn 1 Brock credit for each book added"
    ]
  },
  {
    number: 3,
    title: "Browse & Borrow",
    description: "Discover books from your community members and borrow or buy what interests you.",
    icon: Clock,
    color: "bg-purple-500",
    details: [
      "Browse available books in your hubs",
      "Read descriptions and check conditions",
      "Choose to rent (1-30 days) or buy",
      "Pay rental fee + security deposit or purchase price"
    ]
  },
  {
    number: 4,
    title: "Earn Brocks & Money",
    description: "Get rewarded for every action on the platform with Brocks credits.",
    icon: Coins,
    color: "bg-amber-500",
    details: [
      "Earn 5 credits for borrowing books",
      "Earn 5 credits for lending books",
      "Earn 5 credits for successful referrals",
      "Convert 20 credits to commission-free days"
    ]
  }
];

const brocksFeatures = [
  {
    title: "Referral System",
    description: "Invite friends and earn 5 Brocks for each successful referral",
    icon: Gift,
    gradient: "from-pink-400 to-purple-500"
  },
  {
    title: "Leaderboard Rankings",
    description: "Compete with others and earn exclusive badges based on your Brocks",
    icon: Trophy,
    gradient: "from-amber-400 to-orange-500"
  },
  {
    title: "Commission-Free Days",
    description: "Convert credits to avoid 5% platform commission on your earnings",
    icon: CreditCard,
    gradient: "from-green-400 to-teal-500"
  },
  {
    title: "Achievement Badges",
    description: "Unlock special badges for different milestones and activities",
    icon: Award,
    gradient: "from-blue-400 to-indigo-500"
  }
];

const brocksRanks = [
  { name: "Brock Explorer", min: 0, max: 99, color: "bg-gray-500", icon: "🌱" },
  { name: "Brock Scholar", min: 100, max: 499, color: "bg-blue-500", icon: "📚" },
  { name: "Brock Master", min: 500, max: 999, color: "bg-purple-500", icon: "🎓" },
  { name: "Brock Legend", min: 1000, max: 4999, color: "bg-amber-500", icon: "👑" },
  { name: "Brock Champion", min: 5000, max: 9999, color: "bg-red-500", icon: "🏆" },
  { name: "Brock Emperor", min: 10000, max: Infinity, color: "bg-gradient-to-r from-purple-600 to-pink-600", icon: "⚡" }
];

export default function HowItWorks() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="flex items-center justify-between p-4">
          <Button 
            variant="ghost" 
            onClick={() => navigate("/")}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back</span>
          </Button>
          <h1 className="text-xl font-bold text-gray-900">How BookPotato Works</h1>
          <div className="w-16" /> {/* Spacer */}
        </div>
      </div>

      <div className="p-4 space-y-8 max-w-4xl mx-auto">
        {/* Getting Started */}
        <div className="text-center space-y-4">
          <div className="w-20 h-20 mx-auto bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
            <BookOpen className="w-10 h-10 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome to BookPotato!</h2>
            <p className="text-gray-600 text-lg">Your community-driven book sharing platform</p>
          </div>
        </div>

        {/* Video Section */}
        <Card className="overflow-hidden">
          <CardContent className="p-6">
            <div className="aspect-video w-full bg-gray-100 rounded-lg overflow-hidden">
              <iframe
                width="100%"
                height="100%"
                src="https://www.youtube.com/embed/7bbLVH69OUs"
                title="How BookPotato Works"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full"
              ></iframe>
            </div>
            <p className="text-center text-sm text-gray-500 mt-4">
              Watch this video to learn how BookPotato can transform your reading experience
            </p>
          </CardContent>
        </Card>

        {/* How It Works Steps */}
        <div className="space-y-6">
          <h3 className="text-xl font-bold text-center text-gray-900">Getting Started in 4 Simple Steps</h3>
          <div className="space-y-6">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <Card key={step.number} className="overflow-hidden">
                  <CardContent className="p-6">
                    <div className="flex items-start space-x-4">
                      <div className={`w-12 h-12 ${step.color} rounded-full flex items-center justify-center flex-shrink-0`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-3">
                          <Badge variant="outline" className="text-sm">Step {step.number}</Badge>
                          <h4 className="text-lg font-semibold text-gray-900">{step.title}</h4>
                        </div>
                        <p className="text-gray-600 mb-4">{step.description}</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {step.details.map((detail, idx) => (
                            <div key={idx} className="flex items-center space-x-2">
                              <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                              <span className="text-sm text-gray-700">{detail}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Brocks System */}
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 mx-auto bg-gradient-to-r from-amber-400 to-orange-500 rounded-full flex items-center justify-center">
              <Coins className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">The Brocks Reward System</h3>
            <p className="text-gray-600">Earn credits for every action and unlock amazing benefits</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {brocksFeatures.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card key={index} className="overflow-hidden">
                  <CardContent className="p-6">
                    <div className="flex items-start space-x-3">
                      <div className={`w-10 h-10 bg-gradient-to-r ${feature.gradient} rounded-lg flex items-center justify-center`}>
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-1">{feature.title}</h4>
                        <p className="text-sm text-gray-600">{feature.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Brocks Ranking System */}
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 mx-auto bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
              <Crown className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">Brocks Ranking System</h3>
            <p className="text-gray-600">Climb the leaderboard and earn exclusive titles!</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {brocksRanks.map((rank, index) => (
              <Card key={index} className="overflow-hidden border-2 border-opacity-50 hover:border-opacity-100 transition-all">
                <CardContent className="p-4 text-center">
                  <div className="text-3xl mb-2">{rank.icon}</div>
                  <h4 className="font-bold text-gray-900 mb-1">{rank.name}</h4>
                  <div className={`inline-block px-3 py-1 rounded-full text-white text-sm font-medium ${rank.color}`}>
                    {rank.max === Infinity ? `${rank.min}+ Brocks` : `${rank.min}-${rank.max} Brocks`}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Call to Action */}
        <Card className="bg-gradient-to-r from-blue-500 to-purple-600 text-white">
          <CardContent className="p-6 text-center">
            <h3 className="text-xl font-bold mb-2">Ready to Start Your BookPotato Journey?</h3>
            <p className="mb-4 opacity-90">Join your hub and start sharing books with your community today!</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button 
                className="bg-white text-blue-600 hover:bg-gray-100"
                onClick={() => navigate('/societies')}
              >
                Join a Hub
              </Button>
              <Button 
                variant="outline" 
                className="border-white text-white hover:bg-white hover:text-blue-600"
                onClick={() => navigate('/browse')}
              >
                Browse Books
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}