import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Star, Heart, Settings } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";
import BookCard from "@/components/book-card";
import GenrePreferencesModal from "./genre-preferences-modal";
import WishlistButton from "./wishlist-button";
import ShareButton from "./share-button";
import BookDetailsModal from "@/components/book-details-modal";
import BorrowBookModal from "@/components/modals/borrow-book-modal";
import type { BookWithOwner } from "@shared/schema";

interface Book {
  id: number;
  title: string;
  author: string;
  genre: string;
  dailyFee: string;
  isAvailable: boolean;
  coverUrl?: string;
}

export default function RecommendedBooks() {
  const [showPreferences, setShowPreferences] = useState(false);
  const [selectedBook, setSelectedBook] = useState<BookWithOwner | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showBorrowModal, setShowBorrowModal] = useState(false);
  const [showAllRecommendations, setShowAllRecommendations] = useState(false);

  // Get current user data
  const { data: user } = useQuery({
    queryKey: ["/api/auth/me"],
  });

  // Check if user has set preferences
  const { data: userPreferences } = useQuery({
    queryKey: ["/api/user/genre-preferences"],
  });

  const hasPreferences = userPreferences && (userPreferences as any[]).length > 0;

  // Get recommended books based on preferences
  const { data: recommendedBooks = [], refetch: refetchRecommendations } = useQuery({
    queryKey: ["/api/books/recommended"],
    enabled: !!hasPreferences,
    refetchOnWindowFocus: false,
  });
  
  const handleViewBookDetails = (book: any) => {
    setSelectedBook(book);
    setShowDetailsModal(true);
  };

  const handleBorrowBook = (book: BookWithOwner) => {
    setSelectedBook(book);
    setShowBorrowModal(true);
  };

  // Demo books data to show the social features working
  const demoBooks: Book[] = [
    {
      id: 1,
      title: "The Psychology of Money",
      author: "Morgan Housel",
      genre: "Business",
      dailyFee: "15",
      isAvailable: true
    },
    {
      id: 2,
      title: "Atomic Habits",
      author: "James Clear",
      genre: "Self-Help",
      dailyFee: "12",
      isAvailable: true
    },
    {
      id: 3,
      title: "The Silent Patient",
      author: "Alex Michaelides",
      genre: "Mystery",
      dailyFee: "10",
      isAvailable: false
    },
    {
      id: 4,
      title: "Educated",
      author: "Tara Westover",
      genre: "Biography",
      dailyFee: "14",
      isAvailable: true
    }
  ];

  // Show genre preference setup for new users
  if (!hasPreferences) {
    return (
      <>
        <Card className="bg-gradient-to-br from-purple-50 to-blue-50 border-purple-200">
          <CardHeader className="text-center pb-4">
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", bounce: 0.5 }}
            >
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <BookOpen className="w-8 h-8 text-white" />
              </div>
            </motion.div>
            <CardTitle className="text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              🎯 Discover Books You'll Love
            </CardTitle>
            <p className="text-gray-600 text-sm mt-2">
              Tell us your reading preferences to get personalized book recommendations
            </p>
          </CardHeader>
          <CardContent className="text-center">
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                onClick={() => setShowPreferences(true)}
                className="bg-gradient-to-r from-purple-500 to-blue-600 hover:from-purple-600 hover:to-blue-700 text-white"
                size="lg"
              >
                <Star className="w-4 h-4 mr-2" />
                Set Your Preferences
              </Button>
            </motion.div>
          </CardContent>
        </Card>

        <GenrePreferencesModal
          isOpen={showPreferences}
          onClose={() => {
            setShowPreferences(false);
          }}
          isFirstTime={true}
        />
      </>
    );
  }

  return (
    <>
      <Card className="bg-gradient-to-br from-blue-50 to-purple-50 border-blue-200">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-xl font-bold text-blue-900 flex items-center">
              <Heart className="w-5 h-5 mr-2 text-red-500" />
              What You May Like
            </CardTitle>
            <p className="text-gray-600 text-sm mt-1">
              Based on your reading preferences
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPreferences(true)}
            className="border-blue-300 text-blue-700 hover:bg-blue-50"
          >
            <Settings className="w-4 h-4 mr-1" />
            Update
          </Button>
        </CardHeader>

        <CardContent>
          <div className="space-y-4">
            {/* Show actual user preferences */}
            <div className="flex flex-wrap gap-2 mb-4">
              {(userPreferences as any[])?.map((pref: any) => {
                const getPreferenceEmoji = (level: number) => {
                  switch(level) {
                    case 5: return "❤️"; // Love
                    case 4: return "👍"; // Like
                    case 3: return "😐"; // Neutral
                    case 2: return "👎"; // Dislike
                    case 1: return "❌"; // Hate
                    default: return "👍";
                  }
                };
                
                const getPreferenceColor = (level: number) => {
                  switch(level) {
                    case 5: return "bg-red-100 text-red-700 border-red-300"; // Love
                    case 4: return "bg-blue-100 text-blue-700 border-blue-300"; // Like
                    case 3: return "bg-gray-100 text-gray-700 border-gray-300"; // Neutral
                    case 2: return "bg-orange-100 text-orange-700 border-orange-300"; // Dislike
                    case 1: return "bg-red-100 text-red-700 border-red-300"; // Hate
                    default: return "bg-blue-100 text-blue-700 border-blue-300";
                  }
                };
                
                return (
                  <Badge key={pref.genre} className={getPreferenceColor(pref.preferenceLevel)}>
                    {getPreferenceEmoji(pref.preferenceLevel)} {pref.genre}
                  </Badge>
                );
              })}
            </div>

            {/* Recommended books based on preferences */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(recommendedBooks as any[]).slice(0, showAllRecommendations ? (recommendedBooks as any[]).length : 4).map((book: any, index: number) => (
                <motion.div
                  key={book.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="hover:shadow-lg transition-shadow duration-200 cursor-pointer" onClick={() => handleViewBookDetails(book)}>
                    <CardContent className="p-4">
                      <div className="flex items-start space-x-3">
                        <div className="w-12 h-16 flex-shrink-0">
                          {book.imageUrl || book.coverImageUrl ? (
                            <img 
                              src={book.imageUrl?.replace(/&amp;/g, '&') || book.coverImageUrl?.replace(/&amp;/g, '&')} 
                              alt={book.title}
                              className="w-12 h-16 object-cover rounded shadow-sm"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                                const nextEl = target.nextElementSibling as HTMLElement;
                                if (nextEl) nextEl.style.display = 'flex';
                              }}
                            />
                          ) : null}
                          <div className={`w-12 h-16 bg-gradient-to-br from-blue-400 to-purple-500 rounded flex items-center justify-center ${book.imageUrl || book.coverImageUrl ? 'hidden' : ''}`}>
                            <BookOpen className="w-6 h-6 text-white" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-sm truncate">{book.title}</h3>
                          <p className="text-xs text-gray-600 truncate">{book.author}</p>
                          <Badge variant="outline" className="text-xs mt-1">
                            {book.genre}
                          </Badge>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-sm font-semibold text-green-600">
                              ₹{book.dailyFee}/day
                            </span>
                            <div className="flex items-center space-x-1" onClick={(e) => e.stopPropagation()}>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-6 px-2 text-xs border-red-200 text-red-500 hover:bg-red-50"
                              >
                                <Heart className="w-3 h-3 mr-1" />
                                Add
                              </Button>
                              <ShareButton
                                bookId={book.id}
                                bookTitle={book.title}
                                bookAuthor={book.author}
                                dailyFee={book.dailyFee}
                                size="sm"
                                showText={false}
                                className="h-6 w-6 p-0"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>

            <div className="text-center pt-4">
              {!showAllRecommendations && (recommendedBooks as any[]).length > 4 ? (
                <Button 
                  variant="outline" 
                  className="border-blue-300 text-blue-700 hover:bg-blue-50"
                  onClick={() => setShowAllRecommendations(true)}
                >
                  View More Recommendations ({(recommendedBooks as any[]).length - 4} more)
                </Button>
              ) : showAllRecommendations ? (
                <Button 
                  variant="outline" 
                  className="border-blue-300 text-blue-700 hover:bg-blue-50"
                  onClick={() => setShowAllRecommendations(false)}
                >
                  Show Less
                </Button>
              ) : (
                <Button 
                  variant="outline" 
                  className="border-blue-300 text-blue-700 hover:bg-blue-50"
                  onClick={() => refetchRecommendations()}
                >
                  Refresh Recommendations
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <GenrePreferencesModal
        isOpen={showPreferences}
        onClose={() => setShowPreferences(false)}
        isFirstTime={false}
      />

      <BookDetailsModal
        book={selectedBook}
        open={showDetailsModal}
        onOpenChange={(open) => {
          setShowDetailsModal(open);
          if (!open) setSelectedBook(null);
        }}
        user={(user as any)?.user}
        onBorrow={handleBorrowBook}
        onEdit={() => {
          // TODO: Handle edit functionality
        }}
      />

      {selectedBook && (
        <BorrowBookModal
          isOpen={showBorrowModal}
          onClose={() => {
            setShowBorrowModal(false);
            setSelectedBook(null);
          }}
          book={selectedBook}
          borrower={(user as any)?.user}
        />
      )}
    </>
  );
}