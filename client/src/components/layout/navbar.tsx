import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { 
  Bell, 
  MessageCircle, 
  Search,
  User,
  Menu,
  X,
  Coins
} from "lucide-react";
import MessagingSystem from "@/components/messaging/messaging-system";

interface NavbarProps {
  user: any;
}

export default function Navbar({ user }: NavbarProps) {
  const [, navigate] = useLocation();
  const [showMessaging, setShowMessaging] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Fetch unread notifications count
  const { data: notifications = [] } = useQuery({
    queryKey: ["/api/notifications"],
  });

  // Fetch unread messages count
  const { data: unreadMessagesCount = 0 } = useQuery({
    queryKey: ["/api/messages/unread-count"],
  });

  // Fetch user credits
  const { data: userCredits } = useQuery({
    queryKey: ["/api/user/credits"],
  });

  const unreadNotifications = Array.isArray(notifications) ? notifications.filter((n: any) => !n.read).length : 0;

  const navItems = [
    { label: "Home", path: "/" },
    { label: "Browse", path: "/browse" },
    { label: "My Books", path: "/my-books" },
    { label: "Hub", path: "/societies" },
  ];

  return (
    <>
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center">
              <button
                onClick={() => navigate("/")}
                className="text-xl font-bold text-blue-600 hover:text-blue-700"
              >
                BookPotato
              </button>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-8">
              {navItems.map((item) => (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className="text-gray-700 hover:text-blue-600 px-3 py-2 text-sm font-medium transition-colors"
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* Right Side Icons */}
            <div className="flex items-center space-x-2 sm:space-x-4">
              {/* Brocks Credits Display */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/earnings")}
                className="flex items-center space-x-1 px-1 sm:px-2"
              >
                <Coins className="h-4 w-4 text-amber-600" />
                <span className="text-sm font-medium text-amber-600">
                  {(userCredits as any)?.balance || 0}
                </span>
              </Button>

              {/* Search Button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/browse")}
                className="hidden sm:flex"
              >
                <Search className="w-5 h-5" />
              </Button>

              {/* Messages */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowMessaging(true)}
                className="relative"
              >
                <MessageCircle className="w-5 h-5" />
                {(unreadMessagesCount as number) > 0 && (
                  <Badge
                    variant="destructive"
                    className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center text-xs p-0"
                  >
                    {(unreadMessagesCount as number) > 9 ? "9+" : (unreadMessagesCount as number)}
                  </Badge>
                )}
              </Button>

              {/* Notifications */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/notifications")}
                className="relative"
              >
                <Bell className="w-5 h-5" />
                {unreadNotifications > 0 && (
                  <Badge
                    variant="destructive"
                    className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center text-xs p-0"
                  >
                    {unreadNotifications > 9 ? "9+" : unreadNotifications}
                  </Badge>
                )}
              </Button>

              {/* User Profile */}
              <Button
                variant="ghost"
                onClick={() => navigate("/settings")}
                className="flex items-center space-x-1 sm:space-x-2 px-1 sm:px-3"
              >
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-white" />
                </div>
                <span className="hidden sm:block font-medium">{user?.name}</span>
              </Button>

              {/* Mobile Menu Button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden"
              >
                {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </Button>
            </div>
          </div>

          {/* Mobile Menu */}
          {isMobileMenuOpen && (
            <div className="md:hidden border-t border-gray-200 py-4">
              <div className="flex flex-col space-y-2">
                {navItems.map((item) => (
                  <button
                    key={item.path}
                    onClick={() => {
                      navigate(item.path);
                      setIsMobileMenuOpen(false);
                    }}
                    className="text-gray-700 hover:text-blue-600 px-3 py-2 text-sm font-medium text-left transition-colors"
                  >
                    {item.label}
                  </button>
                ))}
                <button
                  onClick={() => {
                    navigate("/browse");
                    setIsMobileMenuOpen(false);
                  }}
                  className="text-gray-700 hover:text-blue-600 px-3 py-2 text-sm font-medium text-left transition-colors sm:hidden"
                >
                  Search Books
                </button>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Messaging System */}
      <MessagingSystem
        currentUserId={user?.id}
        isOpen={showMessaging}
        onClose={() => setShowMessaging(false)}
      />
    </>
  );
}