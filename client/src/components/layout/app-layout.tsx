import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, BookOpen, Home, Search, Users, Bookmark, Plus, LogOut, User, Settings, Wallet, Coins, Heart, MessageCircle } from "lucide-react";
import logoImage from "@assets/WhatsApp Image 2025-10-05 at 17.24.19_1759671721044.jpeg";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getCurrentUser, logout } from "@/lib/auth";
import { getInitials } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import AddBookModal from "@/components/modals/add-book-modal";
import { BulkBookUpload } from "@/components/bulk-book-upload";

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const [location, setLocation] = useLocation();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkUploadModal, setShowBulkUploadModal] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: authData } = useQuery({
    queryKey: ["/api/auth/me"],
    queryFn: async () => getCurrentUser(),
  });

  const isAdmin = (authData?.user as any)?.isAdmin || authData?.user?.email === 'abhinic@gmail.com';
  const isOnChatPage = location.startsWith('/society-chat/');

  const { data: notifications } = useQuery({
    queryKey: ["/api/notifications"],
    enabled: !!authData?.user,
  });

  const { data: userCredits } = useQuery({
    queryKey: ["/api/user/credits"],
    enabled: !!authData?.user,
  });

  const unreadCount = (notifications as any[])?.filter((n: any) => !n.isRead).length || 0;

  const handleLogout = async () => {
    try {
      await logout();
      queryClient.clear();
      // Use window.location to force a full page reload and clear all state
      window.location.href = "/";
      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to logout. Please try again.",
        variant: "destructive",
      });
    }
  };

  const navigation = [
    { name: "Home", icon: Home, path: "/" },
    { name: "Browse", icon: Search, path: "/browse" },
    { name: "My Books", icon: Bookmark, path: "/my-books" },
    { name: "Chat", icon: MessageCircle, path: "/chat" },
    { name: "Hub", icon: Users, path: "/societies" },
  ];

  const isActiveTab = (path: string) => {
    if (path === "/" && location === "/") return true;
    if (path !== "/" && location.startsWith(path)) return true;
    return false;
  };

  return (
    <div className="max-w-lg mx-auto bg-white min-h-screen relative overflow-x-hidden">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-4 py-3 sticky top-0 z-30">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <img src={logoImage} alt="BookPotato" className="h-8 w-8 object-contain rounded-full" />
            <h1 className="text-lg font-semibold text-text-primary">BookPotato</h1>
          </div>
          <div className="flex items-center space-x-1 sm:space-x-3 min-w-0">
            <Link href="/earnings">
              <Button variant="ghost" size="sm" className="flex items-center space-x-1 px-1 sm:px-2 shrink-0">
                <Wallet className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-600 hidden sm:inline">Earnings</span>
              </Button>
            </Link>
            <Link href="/notifications">
              <Button variant="ghost" size="sm" className="relative p-1 sm:p-2 shrink-0">
                <Bell className="h-4 w-4 sm:h-5 sm:w-5 text-text-secondary" />
                {unreadCount > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-4 w-4 flex items-center justify-center p-0 text-xs">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </Badge>
                )}
              </Button>
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="p-1 shrink-0">
                  <Avatar className="h-6 w-6 sm:h-8 sm:w-8">
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs sm:text-sm">
                      {authData?.user ? getInitials(authData.user.name) : "?"}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {authData?.user?.name || "User"}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {authData?.user?.email || "user@example.com"}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/profile">
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/my-wishlist">
                    <Heart className="mr-2 h-4 w-4" />
                    <span>My Wishlist</span>
                  </Link>
                </DropdownMenuItem>
                {isAdmin && (
                  <DropdownMenuItem asChild>
                    <Link href="/admin">
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Admin Panel</span>
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pb-20">
        {children}
      </main>

      {/* Floating Action Button - Hide on chat pages */}
      {!isOnChatPage && (
        <Button
          onClick={() => setShowAddModal(true)}
          className="fixed bottom-24 right-4 h-14 w-14 rounded-full shadow-lg z-40"
          size="icon"
        >
          <Plus className="h-6 w-6" />
        </Button>
      )}

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-30">
        <div className="max-w-lg mx-auto px-4 py-2">
          <div className="flex justify-around">
            {navigation.map((item) => (
              <Link key={item.name} href={item.path}>
                <Button
                  variant="ghost"
                  className={`flex flex-col items-center py-2 px-3 h-auto ${
                    isActiveTab(item.path)
                      ? "text-primary"
                      : "text-text-secondary"
                  }`}
                >
                  <item.icon className="h-5 w-5 mb-1" />
                  <span className="text-xs">{item.name}</span>
                </Button>
              </Link>
            ))}
          </div>
        </div>
      </nav>

      {/* Add Book Modal */}
      <AddBookModal 
        open={showAddModal}
        onOpenChange={setShowAddModal}
        onOpenBulkUpload={() => setShowBulkUploadModal(true)}
      />

      {/* Bulk Upload Modal */}
      {showBulkUploadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-auto">
          <div className="w-full max-w-4xl max-h-[90vh] overflow-auto bg-white rounded-lg shadow-xl">
            <BulkBookUpload
              onClose={() => setShowBulkUploadModal(false)}
              onBooksAdded={() => {
                setShowBulkUploadModal(false);
                // Refresh data after bulk upload
                window.location.reload();
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
