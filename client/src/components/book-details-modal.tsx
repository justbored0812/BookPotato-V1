import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { formatCurrency, getBookStatusColor, getBookStatusText } from "@/lib/utils";
import { Book, User, Calendar, MapPin, Clock, Star, Heart, MessageSquare } from "lucide-react";
import type { BookWithOwner } from "@shared/schema";
import WishlistButton from "@/components/social/wishlist-button";
import BookReviews from "@/components/social/book-reviews";
import BookReviewForm from "@/components/social/book-review-form";
import ShareButton from "@/components/social/share-button";
import { useState } from "react";

interface BookDetailsModalProps {
  book: BookWithOwner | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBorrow?: (book: BookWithOwner) => void;
  onBuy?: (book: BookWithOwner) => void;
  onEdit?: (book: BookWithOwner) => void;
  user?: { id: number; name?: string };
}

export default function BookDetailsModal({ 
  book, 
  open, 
  onOpenChange, 
  onBorrow,
  onBuy, 
  onEdit,
  user
}: BookDetailsModalProps) {
  const [showReviewForm, setShowReviewForm] = useState(false);
  
  if (!book) return null;

  const statusColor = getBookStatusColor(book.isAvailable);
  const statusText = getBookStatusText(book.isAvailable);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md mx-auto max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center space-x-2">
            <Book className="h-5 w-5 text-primary" />
            <span>Book Details</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 overflow-y-auto flex-1 pr-2">
          {/* Book Cover */}
          <div className="w-full h-48 bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg flex items-center justify-center mb-4 relative overflow-hidden">
            {book.coverImageUrl || book.imageUrl ? (
              <img 
                src={(book.coverImageUrl || book.imageUrl)!} 
                alt={book.title}
                className="w-full h-full object-cover rounded-lg"
              />
            ) : (
              <span className="text-lg font-bold text-blue-800 text-center px-4">
                {book.title}
              </span>
            )}
          </div>
          
          {/* Title and Author */}
          <div className="text-center">
            <h2 className="text-xl font-bold text-gray-900 mb-1">{book.title}</h2>
            <p className="text-lg text-gray-600">{book.author}</p>
          </div>
          
          <Separator />
          
          {/* Book Details */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Genre:</span>
              <Badge variant="secondary">{book.genre}</Badge>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Condition:</span>
              <span className="text-sm text-gray-600">{book.condition}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Daily Fee:</span>
              <span className="text-lg font-bold text-primary">{formatCurrency(book.dailyFee)}/day</span>
            </div>
            
            {book.sellingPrice && (
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Selling Price:</span>
                <span className="text-lg font-bold text-green-600">{formatCurrency(book.sellingPrice)}</span>
              </div>
            )}
            
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Status:</span>
              <Badge className={statusColor}>{statusText}</Badge>
            </div>
            
            {book.owner && (
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 flex items-center">
                  <User className="h-4 w-4 mr-1" />
                  Owner:
                </span>
                <span className="text-sm text-gray-600">{book.owner.name}</span>
              </div>
            )}
            
            {book.isbn && (
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">ISBN:</span>
                <span className="text-sm text-gray-600 font-mono">{book.isbn}</span>
              </div>
            )}
          </div>
          
          {book.description && (
            <>
              <Separator />
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Description:</h4>
                <p className="text-sm text-gray-600 leading-relaxed">{book.description}</p>
              </div>
            </>
          )}

          {/* Reviews Section */}
          <Separator />
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-gray-700 flex items-center">
                <Star className="h-4 w-4 mr-1" />
                Reviews & Ratings
              </h4>
              {user && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowReviewForm(!showReviewForm)}
                >
                  {showReviewForm ? "Cancel" : "Write Review"}
                </Button>
              )}
            </div>
            
            {showReviewForm && user && (
              <BookReviewForm 
                bookId={book.id}
                onSuccess={() => setShowReviewForm(false)}
              />
            )}
            
            <BookReviews bookId={book.id} />
          </div>
          
        </div>
        
        {/* Action Buttons - Fixed at bottom */}
        <div className="flex-shrink-0 pt-4 border-t">
          <div className="flex space-x-2">
            {(onBorrow || onBuy) ? (
              <>
                {onBorrow && (
                  <Button 
                    onClick={() => {
                      onBorrow(book);
                    }}
                    className="flex-1"
                    disabled={!book.isAvailable}
                    data-testid={`button-borrow-modal-${book.id}`}
                  >
                    Borrow Book
                  </Button>
                )}
                {onBuy && (
                  <Button 
                    onClick={() => {
                      if (book.sellingPrice) {
                        onBuy(book);
                      }
                    }}
                    variant="secondary"
                    className="flex-1"
                    disabled={!book.sellingPrice}
                    data-testid={`button-buy-modal-${book.id}`}
                  >
                    {book.sellingPrice ? `Buy for ₹${book.sellingPrice}` : 'Not for Sale'}
                  </Button>
                )}
              </>
            ) : onEdit ? (
              <Button 
                onClick={() => {
                  onEdit(book);
                  onOpenChange(false);
                }}
                variant="outline"
                className="flex-1"
                data-testid={`button-edit-modal-${book.id}`}
              >
                Edit Book
              </Button>
            ) : (
              <Button disabled className="flex-1">
                Currently Unavailable
              </Button>
            )}
            
            <WishlistButton 
              bookId={book.id} 
              size="default"
              showText={false}
              className="px-3"
            />
            
            <ShareButton
              bookId={book.id}
              bookTitle={book.title}
              bookAuthor={book.author}
              dailyFee={book.dailyFee}
              size="default"
              showText={false}
              className="px-3"
            />
            
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="px-6"
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}