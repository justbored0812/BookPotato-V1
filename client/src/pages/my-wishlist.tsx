import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Heart, BookOpen, Calendar, AlertCircle, X } from "lucide-react";
import { motion } from "framer-motion";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface WishlistItem {
  id: number;
  priority: number;
  notes?: string;
  addedAt: string;
  book: {
    id: number;
    title: string;
    author: string;
    genre: string;
    dailyFee: string;
    isAvailable: boolean;

  };
}

export default function MyWishlist() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: wishlistItems = [], isLoading } = useQuery({
    queryKey: ["/api/wishlist"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/wishlist");
      return response.json();
    },
  });

  const removeFromWishlistMutation = useMutation({
    mutationFn: async (bookId: number) => {
      return apiRequest("DELETE", `/api/wishlist/${bookId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/wishlist"] });
      toast({
        title: "Removed from Wishlist",
        description: "Book has been removed from your wishlist",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to remove book from wishlist",
        variant: "destructive",
      });
    }
  });

  const getPriorityLabel = (priority: number) => {
    switch (priority) {
      case 1: return { text: "High", color: "bg-red-100 text-red-700" };
      case 2: return { text: "Medium", color: "bg-yellow-100 text-yellow-700" };
      case 3: return { text: "Low", color: "bg-green-100 text-green-700" };
      default: return { text: "Medium", color: "bg-yellow-100 text-yellow-700" };
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <div className="container max-w-4xl mx-auto p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto p-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center space-x-3">
          <Heart className="w-8 h-8 text-red-500" />
          <span>My Wishlist</span>
        </h1>
        <p className="text-gray-600 mt-2">
          Books you want to read when they become available
        </p>
      </div>

      {wishlistItems.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <Heart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">
              Your wishlist is empty
            </h3>
            <p className="text-gray-500 mb-4">
              Start adding books you'd like to read to your wishlist
            </p>
            <Button 
              onClick={() => window.location.href = '/societies'}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Browse Books
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {wishlistItems.length}
                </div>
                <div className="text-sm text-gray-600">Total Books</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="text-2xl font-bold text-green-600">
                  {wishlistItems.filter((item: WishlistItem) => item.book.isAvailable).length}
                </div>
                <div className="text-sm text-gray-600">Available Now</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="text-2xl font-bold text-red-600">
                  {wishlistItems.filter((item: WishlistItem) => item.priority === 1).length}
                </div>
                <div className="text-sm text-gray-600">High Priority</div>
              </CardContent>
            </Card>
          </div>

          {/* Wishlist Items */}
          <div className="space-y-4">
            {wishlistItems.map((item: WishlistItem, index: number) => {
              const priority = getPriorityLabel(item.priority);
              
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className={`hover:shadow-lg transition-shadow ${
                    item.book.isAvailable ? 'border-green-200 bg-green-50' : ''
                  }`}>
                    <CardContent className="p-6">
                      <div className="flex items-start space-x-4">
                        {/* Book Icon */}
                        <div className="w-16 h-20 bg-gradient-to-br from-blue-400 to-purple-500 rounded flex items-center justify-center flex-shrink-0">
                          <BookOpen className="w-8 h-8 text-white" />
                        </div>

                        {/* Book Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h3 className="text-lg font-semibold text-gray-900 truncate">
                                {item.book.title}
                              </h3>
                              <p className="text-gray-600 truncate">by {item.book.author}</p>
                              
                              <div className="flex items-center space-x-2 mt-2">
                                <Badge variant="outline">{item.book.genre}</Badge>
                                <Badge className={priority.color}>{priority.text} Priority</Badge>
                                {item.book.isAvailable && (
                                  <Badge className="bg-green-100 text-green-700">
                                    Available Now!
                                  </Badge>
                                )}
                              </div>
                              
                              <div className="flex items-center justify-between mt-3">
                                <div className="text-sm text-gray-500 flex items-center space-x-4">
                                  <div className="flex items-center space-x-1">
                                    <Calendar className="w-4 h-4" />
                                    <span>Added {formatDate(item.addedAt)}</span>
                                  </div>
                                  <div className="font-semibold text-green-600">
                                    ₹{item.book.dailyFee}/day
                                  </div>
                                </div>
                                
                                <div className="flex items-center space-x-2">
                                  {item.book.isAvailable ? (
                                    <Button 
                                      size="sm"
                                      className="bg-green-600 hover:bg-green-700"
                                      onClick={() => {
                                        toast({
                                          title: "Borrow Book",
                                          description: `Opening borrow process for "${item.book.title}"`,
                                        });
                                        // Navigate to browse page to find and borrow the book
                                        window.location.href = '/browse';
                                      }}
                                    >
                                      Borrow Now
                                    </Button>
                                  ) : (
                                    <Button 
                                      size="sm" 
                                      variant="outline"
                                      className="text-gray-500"
                                      disabled
                                    >
                                      <AlertCircle className="w-4 h-4 mr-1" />
                                      Not Available
                                    </Button>
                                  )}
                                  
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => removeFromWishlistMutation.mutate(item.book.id)}
                                    disabled={removeFromWishlistMutation.isPending}
                                    className="text-red-500 hover:bg-red-50 hover:border-red-300"
                                  >
                                    <X className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>

                              {item.notes && (
                                <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                                  <p className="text-sm text-gray-700">
                                    <strong>Note:</strong> {item.notes}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}