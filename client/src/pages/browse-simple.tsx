import { useQuery } from "@tanstack/react-query";
import { Search, BookOpen } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import type { BookWithOwner } from "@shared/schema";
import AvailabilityAlertButton from "@/components/availability-alert-button";

export default function BrowseSimple() {
  const [searchQuery, setSearchQuery] = useState("");

  const { data: books, isLoading } = useQuery({
    queryKey: ['/api/books/all'],
  });

  const { data: userResponse } = useQuery({
    queryKey: ['/api/auth/me'],
  });
  
  const user = (userResponse as any)?.user;

  // Filter books based on search
  const filteredBooks = (books as any[])?.filter((book: any) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      book.title?.toLowerCase().includes(query) ||
      book.author?.toLowerCase().includes(query) ||
      book.genre?.toLowerCase().includes(query)
    );
  }) || [];

  if (isLoading) {
    return (
      <div className="p-4">
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-3">
                <div className="w-full h-32 bg-gray-200 rounded-lg mb-3"></div>
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-3 bg-gray-200 rounded mb-2"></div>
                <div className="h-8 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="p-4 bg-gradient-to-r from-primary to-secondary text-white">
        <h1 className="text-xl font-bold mb-2">Browse Books</h1>
        <p className="text-sm opacity-90">
          Discover books available for borrowing
        </p>
      </div>

      {/* Search */}
      <div className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-text-secondary" />
          <Input
            className="pl-10"
            placeholder="Search books, authors..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Debug Info */}
      <div className="p-2 bg-gray-100 text-xs">
        Books loaded: {(books as any[])?.length || 0} | 
        Filtered: {filteredBooks?.length || 0} | 
        Loading: {isLoading ? 'Yes' : 'No'}
      </div>

      {/* Books Grid */}
      <div className="p-4">
        {!isLoading && filteredBooks.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center">
              <BookOpen className="h-12 w-12 text-text-secondary mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {searchQuery ? "No books found" : "No books available"}
              </h3>
              <p className="text-text-secondary">
                {searchQuery 
                  ? "Try adjusting your search terms" 
                  : "Ask your society members to add some books!"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {filteredBooks.map((book: any) => (
              <Card key={book.id} className="overflow-hidden">
                <div className="aspect-[3/4] bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                  {book.coverImage ? (
                    <img 
                      src={book.coverImage} 
                      alt={book.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <BookOpen className="h-12 w-12 text-primary" />
                  )}
                </div>
                <CardContent className="p-3">
                  <h3 className="font-semibold text-sm mb-1 line-clamp-2">
                    {book.title}
                  </h3>
                  <p className="text-xs text-text-secondary mb-2">
                    by {book.author}
                  </p>
                  {book.genre && (
                    <Badge variant="secondary" className="text-xs mb-2">
                      {book.genre}
                    </Badge>
                  )}
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-text-secondary">
                      by {book.owner?.name}
                    </span>
                    <span className="text-sm font-semibold text-primary">
                      ₹{book.dailyFee}/day
                    </span>
                  </div>
                  {book.ownerId !== user?.id && book.isAvailable && (
                    <Button 
                      size="sm" 
                      className="w-full"
                    >
                      Borrow
                    </Button>
                  )}
                  
                  {book.ownerId !== user?.id && !book.isAvailable && (
                    <AvailabilityAlertButton
                      bookId={book.id}
                      bookTitle={book.title}
                      isAvailable={book.isAvailable}
                      size="sm"
                      className="w-full"
                    />
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}