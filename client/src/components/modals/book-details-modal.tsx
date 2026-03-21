import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Calendar, User, MapPin, IndianRupee, BookOpen, Edit, Trash2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import PaymentModal from "./payment-modal";

interface BookDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  book: any;
  user: any;
  onEdit?: (book: any) => void;
  onDelete?: (bookId: number) => void;
}

export default function BookDetailsModal({ isOpen, onClose, book, user, onEdit, onDelete }: BookDetailsModalProps) {
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Always call hooks first, before any early returns
  const deleteBookMutation = useMutation({
    mutationFn: async (bookId: number) => {
      const response = await apiRequest("DELETE", `/api/books/${bookId}`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Book Deleted",
        description: "Your book has been successfully removed from the library.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/books"] });
      onDelete?.(book?.id);
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete book. It may be currently borrowed.",
        variant: "destructive",
      });
    },
  });

  if (!book) return null;

  const isOwner = book.ownerId === user?.id;
  const canBorrow = !isOwner && book.isAvailable;
  const canBuy = !isOwner && book.isAvailable && book.sellingPrice;

  const handleBorrow = () => {
    setShowPaymentModal(true);
  };

  const handleBuy = () => {
    setShowPurchaseModal(true);
  };

  const handleEdit = () => {
    onEdit?.(book);
    onClose();
  };

  const handleDelete = () => {
    if (showDeleteConfirm) {
      deleteBookMutation.mutate(book.id);
      setShowDeleteConfirm(false);
    } else {
      setShowDeleteConfirm(true);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Book Details</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 overflow-y-auto flex-1 pr-2">
            {/* Book Cover and Title */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-start space-x-4">
                  <div className="w-16 h-20 bg-gradient-to-br from-primary/20 to-secondary/20 rounded flex items-center justify-center flex-shrink-0">
                    {book.imageUrl || book.coverImageUrl ? (
                      <img 
                        src={book.coverImageUrl || book.imageUrl} 
                        alt={book.title}
                        className="w-full h-full object-cover rounded"
                      />
                    ) : (
                      <BookOpen className="h-8 w-8 text-primary" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{book.title}</h3>
                    <p className="text-text-secondary">by {book.author}</p>
                    <div className="flex items-center space-x-2 mt-2">
                      <Badge variant={book.isAvailable ? "default" : "secondary"}>
                        {book.isAvailable ? "Available" : "Borrowed"}
                      </Badge>
                      <Badge variant="outline">{book.condition}</Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Book Information */}
            <Card>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center space-x-3">
                  <User className="h-4 w-4 text-text-secondary" />
                  <span className="text-sm">Owner: {book.owner?.name}</span>
                </div>
                
                <div className="flex items-center space-x-3">
                  <IndianRupee className="h-4 w-4 text-text-secondary" />
                  <span className="text-sm">Rental: ₹{book.dailyFee}/day</span>
                </div>

                <div className="flex items-center space-x-3">
                  <IndianRupee className="h-4 w-4 text-text-secondary" />
                  <span className={`text-sm font-semibold ${book.sellingPrice ? 'text-green-600' : 'text-gray-400'}`}>
                    Selling Price: {book.sellingPrice ? `₹${book.sellingPrice}` : 'Not for Sale'}
                  </span>
                </div>

                {book.genre && (
                  <div className="flex items-center space-x-3">
                    <BookOpen className="h-4 w-4 text-text-secondary" />
                    <span className="text-sm">Genre: {book.genre}</span>
                  </div>
                )}

                {book.isbn && (
                  <div className="flex items-center space-x-3">
                    <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">
                      ISBN: {book.isbn}
                    </span>
                  </div>
                )}

                {book.description && (
                  <div className="pt-2">
                    <h4 className="text-sm font-medium mb-2">Description:</h4>
                    <p className="text-sm text-text-secondary leading-relaxed">{book.description}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Actions - Fixed at bottom */}
          <div className="flex flex-col space-y-3 border-t pt-4 mt-4">
              {/* Primary actions row */}
              <div className="flex space-x-3">
                <Button 
                  variant="outline" 
                  onClick={onClose}
                  className="flex-1"
                >
                  Close
                </Button>
                
                {isOwner && (
                  <Button 
                    variant="outline" 
                    onClick={handleEdit}
                    className="flex-1"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                )}
                
                {canBorrow && (
                  <Button 
                    onClick={handleBorrow}
                    className="flex-1"
                  >
                    Borrow Book
                  </Button>
                )}
                
                {canBuy && (
                  <Button 
                    onClick={handleBuy}
                    variant="secondary"
                    className="flex-1"
                  >
                    Buy Book
                  </Button>
                )}
              </div>

              {/* Delete button for owner */}
              {isOwner && (
                <div className="flex space-x-3">
                  <Button 
                    variant={showDeleteConfirm ? "destructive" : "outline"}
                    onClick={handleDelete}
                    disabled={deleteBookMutation.isPending}
                    className="flex-1"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    {showDeleteConfirm 
                      ? (deleteBookMutation.isPending ? "Deleting..." : "Confirm Delete") 
                      : "Delete Book"
                    }
                  </Button>
                  {showDeleteConfirm && (
                    <Button 
                      variant="outline" 
                      onClick={() => setShowDeleteConfirm(false)}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment Modal */}
      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        book={book}
        onSuccess={() => {
          setShowPaymentModal(false);
          onClose();
        }}
      />

      {/* Purchase Modal - Simple version */}
      <Dialog open={showPurchaseModal} onOpenChange={setShowPurchaseModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Purchase Book</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>Coming soon: Complete purchase flow for "{book?.title}"</p>
            <p className="text-sm text-gray-600">Purchase price: ₹{book?.sellingPrice}</p>
            <Button onClick={() => setShowPurchaseModal(false)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}