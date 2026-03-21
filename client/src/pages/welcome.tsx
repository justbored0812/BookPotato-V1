import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  BookOpen, 
  Users, 
  MapPin, 
  Star,
  ArrowRight,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { useLocation } from "wouter";
import communityImage from '@assets/Screen1_1759047490095.png';
import screen2Image from '@assets/Screen2_1759049549179.png';
import screen3Image from '@assets/Screen3_1759049733885.png';
import screen4Image from '@assets/Screen4_1759049750473.png';

const welcomeScreens = [
  {
    id: 1,
    title: "Welcome to BookPotato",
    subtitle: "Your Community Library Platform",
    description: "Connect with your neighbors and share books within your hub. Upload books instantly with our powerful bulk upload feature - just snap photos of multiple books and let our proprietary engine do the rest!",
    icon: BookOpen,
    gradient: "from-blue-500 to-cyan-500",
    illustration: (
      <svg viewBox="0 0 200 150" className="w-32 h-24 mx-auto">
        <defs>
          <linearGradient id="bookGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3B82F6" />
            <stop offset="100%" stopColor="#06B6D4" />
          </linearGradient>
        </defs>
        <rect x="50" y="40" width="60" height="80" rx="4" fill="url(#bookGradient)" />
        <rect x="70" y="50" width="60" height="80" rx="4" fill="#1D4ED8" />
        <rect x="90" y="60" width="60" height="80" rx="4" fill="#0EA5E9" />
        <circle cx="100" cy="25" r="15" fill="#FEF3C7" />
        <path d="M95 20 L100 30 L105 20" stroke="#F59E0B" strokeWidth="2" fill="none" />
      </svg>
    )
  },
  {
    id: 2,
    title: "Smart Bulk Upload",
    subtitle: "Add Your Library in Minutes",
    description: "Upload multiple books at once! Take photos of your bookshelf and our proprietary algorithm automatically recognizes titles, authors, and details. No more manual typing - list your entire library in seconds!",
    icon: Users,
    gradient: "from-purple-500 to-pink-500",
    illustration: (
      <svg viewBox="0 0 200 150" className="w-32 h-24 mx-auto">
        <defs>
          <linearGradient id="buildingGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#8B5CF6" />
            <stop offset="100%" stopColor="#EC4899" />
          </linearGradient>
        </defs>
        <rect x="40" y="60" width="40" height="70" fill="url(#buildingGradient)" />
        <rect x="90" y="40" width="50" height="90" fill="#7C3AED" />
        <rect x="150" y="70" width="35" height="60" fill="#A855F7" />
        <circle cx="60" cy="35" r="8" fill="#FDE68A" />
        <circle cx="115" cy="15" r="8" fill="#FDE68A" />
        <circle cx="167" cy="45" r="8" fill="#FDE68A" />
        <rect x="50" y="80" width="8" height="12" fill="#FEF3C7" />
        <rect x="100" y="60" width="8" height="12" fill="#FEF3C7" />
        <rect x="160" y="90" width="8" height="12" fill="#FEF3C7" />
      </svg>
    )
  },
  {
    id: 3,
    title: "Discover & Share",
    subtitle: "Browse Books Across Hubs",
    description: "Explore books from Societies, Schools, and Offices. Find your next great read nearby, rent or buy instantly, and earn money by sharing your collection with the community.",
    icon: MapPin,
    gradient: "from-green-500 to-teal-500",
    illustration: (
      <svg viewBox="0 0 200 150" className="w-32 h-24 mx-auto">
        <defs>
          <linearGradient id="mapGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#10B981" />
            <stop offset="100%" stopColor="#14B8A6" />
          </linearGradient>
        </defs>
        <circle cx="100" cy="75" r="60" fill="url(#mapGradient)" opacity="0.3" />
        <path d="M100 45 Q110 55 100 75 Q90 55 100 45" fill="#EF4444" />
        <circle cx="100" cy="55" r="4" fill="#FFFFFF" />
        <rect x="80" y="90" width="12" height="16" fill="#3B82F6" />
        <rect x="108" y="85" width="12" height="20" fill="#8B5CF6" />
        <rect x="136" y="95" width="10" height="15" fill="#10B981" />
        <path d="M70 110 Q100 90 130 110" stroke="#6B7280" strokeWidth="2" fill="none" strokeDasharray="3,3" />
      </svg>
    )
  },
  {
    id: 4,
    title: "Earn While Sharing",
    subtitle: "Share Books, Earn Money",
    description: "Lend your books to community members and earn daily rental fees. Turn your personal library into a source of income.",
    icon: Star,
    gradient: "from-orange-500 to-red-500",
    illustration: (
      <svg viewBox="0 0 200 150" className="w-32 h-24 mx-auto">
        <defs>
          <linearGradient id="coinGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#EF4444" />
          </linearGradient>
        </defs>
        <rect x="60" y="70" width="30" height="40" rx="2" fill="#3B82F6" />
        <rect x="110" y="60" width="30" height="50" rx="2" fill="#8B5CF6" />
        <circle cx="75" cy="50" r="12" fill="url(#coinGradient)" />
        <text x="75" y="55" textAnchor="middle" fill="#FFFFFF" fontSize="8" fontWeight="bold">₹</text>
        <circle cx="125" cy="40" r="12" fill="url(#coinGradient)" />
        <text x="125" y="45" textAnchor="middle" fill="#FFFFFF" fontSize="8" fontWeight="bold">₹</text>
        <circle cx="160" cy="85" r="10" fill="#F59E0B" />
        <text x="160" y="89" textAnchor="middle" fill="#FFFFFF" fontSize="6" fontWeight="bold">₹</text>
        <path d="M75 62 L75 68" stroke="#F59E0B" strokeWidth="2" />
        <path d="M125 52 L125 58" stroke="#F59E0B" strokeWidth="2" />
      </svg>
    )
  }
];

export default function Welcome() {
  const [currentScreen, setCurrentScreen] = useState(0);
  const [, navigate] = useLocation();

  useEffect(() => {
    // Don't redirect if already on welcome page - let user see welcome screens
  }, [navigate]);

  const nextScreen = () => {
    if (currentScreen < welcomeScreens.length - 1) {
      setCurrentScreen(currentScreen + 1);
    } else {
      completeWelcome();
    }
  };

  const prevScreen = () => {
    if (currentScreen > 0) {
      setCurrentScreen(currentScreen - 1);
    }
  };

  const completeWelcome = () => {
    localStorage.setItem("hasSeenWelcome", "true");
    navigate("/auth");
  };

  const skipWelcome = () => {
    localStorage.setItem("hasSeenWelcome", "true");
    navigate("/auth");
  };

  const screen = welcomeScreens[currentScreen];
  const Icon = screen.icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md mx-auto shadow-2xl border-0 overflow-hidden">
        {/* Progress Bar */}
        <div className="h-1 bg-gray-200">
          <div 
            className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all duration-300"
            style={{ width: `${((currentScreen + 1) / welcomeScreens.length) * 100}%` }}
          />
        </div>

        <CardContent className="p-0">
          {/* Header */}
          <div className="flex justify-between items-center p-6 pb-0">
            <div className="text-sm text-gray-500">
              {currentScreen + 1} of {welcomeScreens.length}
            </div>
          </div>

          {/* Main Content */}
          <div className="p-6 text-center space-y-6">
            {/* Illustration */}
            <div className="mb-6">
              {screen.illustration}
            </div>

            {/* Text Content */}
            <div className="space-y-3">
              <h1 className="text-2xl font-bold text-gray-900">
                {screen.title}
              </h1>
              <h2 className="text-lg font-medium text-gray-600">
                {screen.subtitle}
              </h2>
              <p className="text-gray-500 leading-relaxed">
                {screen.description}
              </p>
            </div>

            {/* Screen-specific Illustration */}
            <div className="w-full h-64 rounded-lg overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
              {currentScreen === 0 && (
                <img 
                  src={communityImage} 
                  alt="Community reading together" 
                  className="w-full h-full object-cover"
                />
              )}
              {currentScreen === 1 && (
                <img 
                  src={screen2Image} 
                  alt="Person next to purple buildings" 
                  className="w-full h-full object-cover"
                />
              )}
              {currentScreen === 2 && (
                <img 
                  src={screen3Image} 
                  alt="Local book discovery with location pin" 
                  className="w-full h-full object-cover"
                />
              )}
              {currentScreen === 3 && (
                <img 
                  src={screen4Image} 
                  alt="Earning money by sharing books" 
                  className="w-full h-full object-cover"
                />
              )}
            </div>
          </div>

          {/* Navigation */}
          <div className="p-6 pt-0">
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                onClick={prevScreen}
                disabled={currentScreen === 0}
                className="flex items-center space-x-1"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Back</span>
              </Button>

              {/* Dots Indicator */}
              <div className="flex space-x-2">
                {welcomeScreens.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentScreen(index)}
                    className={`w-2 h-2 rounded-full transition-all ${
                      index === currentScreen 
                        ? 'bg-blue-500 w-6' 
                        : 'bg-gray-300'
                    }`}
                  />
                ))}
              </div>

              <div className="flex flex-col items-end space-y-1">
                <Button
                  onClick={nextScreen}
                  className="flex items-center space-x-1 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600"
                >
                  <span>{currentScreen === welcomeScreens.length - 1 ? 'Get Started' : 'Next'}</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
                <Button
                  variant="link"
                  onClick={skipWelcome}
                  className="text-xs text-gray-500 hover:text-gray-700 h-auto p-0"
                >
                  Skip
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}