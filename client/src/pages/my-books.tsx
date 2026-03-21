import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { formatCurrency, formatDateRelative, getBookStatusColor, getBookStatusText } from "@/lib/utils";
import type { RentalWithDetails, Book } from "@shared/schema";
import { BookOpen, Plus, Edit, Camera } from "lucide-react";
import AddBookModal from "@/components/modals/add-book-modal";
import BookDetailsModal from "@/components/modals/book-details-modal";
import ExtensionRequestModal from "@/components/modals/extension-request-modal";
import LateFeeModal from "@/components/modals/late-fee-modal";
import ReturnConfirmationModal from "@/components/modals/return-confirmation-modal";
import ExcessChargePaymentModal from "@/components/modals/excess-charge-payment-modal";
import { BulkBookUpload } from "@/components/bulk-book-upload";

export default function MyBooks() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedBook, setSelectedBook] = useState<any>(null);
  const [showBookDetails, setShowBookDetails] = useState(false);
  const [editingBook, setEditingBook] = useState<any>(null);
  const [selectedRental, setSelectedRental] = useState<any>(null);
  const [showExtendModal, setShowExtendModal] = useState(false);
  const [showLateFeeModal, setShowLateFeeModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnModalType, setReturnModalType] = useState<"confirm" | "request">("request");
  const [showBulkUploadModal, setShowBulkUploadModal] = useState(false);
  const [showExcessChargeModal, setShowExcessChargeModal] = useState(false);
  const [excessChargeData, setExcessChargeData] = useState<any>(null);

  const { data: borrowedBooks, isLoading: loadingBorrowed } = useQuery({
    queryKey: ["/api/rentals/borrowed"],
  });

  const { data: lentBooks, isLoading: loadingLent } = useQuery({
    queryKey: ["/api/rentals/lent"],
  });

  const { data: myBooks, isLoading: loadingOwned } = useQuery({
    queryKey: ["/api/books/my"],
  });

  const { data: boughtBooks, isLoading: loadingBought } = useQuery({
    queryKey: ["/api/books/bought"],
  });

  const { data: soldBooks, isLoading: loadingSold } = useQuery({
    queryKey: ["/api/books/sold"],
  });

  const { data: userResponse } = useQuery({
    queryKey: ['/api/auth/me'],
  });

  const user = (userResponse as any)?.user;

  const handleBookClick = (book: any) => {
    setSelectedBook(book);
    setShowBookDetails(true);
  };

  const handleEditBook = (book: any) => {
    console.log('📝 Opening edit modal for book:', book);
    setEditingBook(book);
    setShowAddModal(true);
  };

  const returnBookMutation = useMutation({
    mutationFn: async (rentalId: number) => {
      const response = await apiRequest("PATCH", `/api/rentals/${rentalId}/return`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Book Returned",
        description: "Book has been successfully returned.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/rentals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/books"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to return book",
        variant: "destructive",
      });
    },
  });

  const handleReturnBook = (rentalId: number) => {
    returnBookMutation.mutate(rentalId);
  };

  const BorrowedBooksTab = () => (
    <div className="space-y-4">
      {loadingBorrowed ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="flex items-start space-x-3">
                  <div className="w-12 h-16 bg-gray-200 rounded"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded"></div>
                    <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                    <div className="h-6 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : Array.isArray(borrowedBooks) && borrowedBooks.length > 0 ? (
        borrowedBooks.map((rental: RentalWithDetails) => (
          <Card key={rental.id}>
            <CardContent className="p-4">
              <div className="flex items-start space-x-3">
                <div className="w-12 h-16 bg-gradient-to-br from-blue-100 to-blue-200 rounded flex items-center justify-center flex-shrink-0">
                  <span className="text-xs text-blue-600 font-medium text-center px-1">
                    {rental.book.title.substring(0, 3)}
                  </span>
                </div>
                
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-text-primary mb-1">
                    {rental.book.title}
                  </h4>
                  <p className="text-sm text-text-secondary mb-1">
                    {rental.book.author}
                  </p>
                  <p className="text-sm text-text-secondary mb-2">
                    Lender: {rental.lender.name}
                  </p>
                  
                  <div className="flex items-center justify-between mb-3">
                    <Badge className={getBookStatusColor(false, rental.endDate)}>
                      {rental.status === 'return_requested' ? 'Pending Owner Confirmation' : formatDateRelative(rental.endDate)}
                    </Badge>
                    <span className="text-sm text-text-secondary">
                      {formatCurrency(rental.book.dailyFee)}/day
                    </span>
                  </div>
                </div>
              </div>
              
              {rental.status === 'return_requested' ? (
                <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    Return request sent to {rental.lender.name}. Waiting for owner confirmation.
                  </p>
                </div>
              ) : (
                <div className="flex space-x-2 mt-3">
                  <Button 
                    onClick={async () => {
                      try {
                        // Request return from lender
                        const response = await apiRequest("POST", `/api/rentals/${rental.id}/request-return`, {
                          notes: `I would like to return "${rental.book.title}". Please coordinate with me for a meeting spot.`
                        });
                        
                        const data = await response.json();
                        
                        // Check if payment is required upfront due to excess late fees
                        if (data.requiresPayment && data.excessAmount > 0) {
                          setExcessChargeData({
                            rental: rental,
                            excessAmount: data.excessAmount,
                            lateFee: data.lateFee,
                            platformFee: data.platformFeeOnLateFee,
                            securityDeposit: parseFloat(rental.securityDeposit)
                          });
                          setShowExcessChargeModal(true);
                        } else {
                          toast({
                            title: "Return Request Sent",
                            description: `Return request sent to ${rental.lender.name}. They will be notified with coordination details including phone numbers.`,
                          });
                          queryClient.invalidateQueries({ queryKey: ["/api/rentals/borrowed"] });
                        }
                      } catch (error) {
                        console.error("Return request error:", error);
                        toast({
                          title: "Error", 
                          description: "Failed to send return request. Please try again.",
                          variant: "destructive",
                        });
                      }
                    }}
                    className="flex-1"
                  >
                    Request Return
                  </Button>
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => {
                      setSelectedRental(rental);
                      setShowExtendModal(true);
                    }}
                  >
                    Extend
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))
      ) : (
        <Card>
          <CardContent className="pt-6 text-center">
            <BookOpen className="h-12 w-12 text-text-secondary mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-text-primary mb-2">
              No Borrowed Books
            </h3>
            <p className="text-text-secondary mb-4">
              You haven't borrowed any books yet. Browse available books to get started!
            </p>
            <Button onClick={() => window.location.href = '/browse'}>
              Browse Books
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );

  const LentBooksTab = () => (
    <div className="space-y-4">
      {loadingLent ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="flex items-start space-x-3">
                  <div className="w-12 h-16 bg-gray-200 rounded"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded"></div>
                    <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                    <div className="h-6 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : Array.isArray(lentBooks) && lentBooks.length > 0 ? (
        lentBooks.map((rental: RentalWithDetails) => (
          <Card key={rental.id}>
            <CardContent className="p-4">
              <div className="flex items-start space-x-3">
                <div className="w-12 h-16 bg-gradient-to-br from-green-100 to-green-200 rounded flex items-center justify-center flex-shrink-0">
                  <span className="text-xs text-green-600 font-medium text-center px-1">
                    {rental.book.title.substring(0, 3)}
                  </span>
                </div>
                
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-text-primary mb-1">
                    {rental.book.title}
                  </h4>
                  <p className="text-sm text-text-secondary mb-1">
                    {rental.book.author}
                  </p>
                  <p className="text-sm text-text-secondary mb-2">
                    Borrower: {rental.borrower.name}
                  </p>
                  
                  <div className="flex items-center justify-between mb-3">
                    <Badge className={getBookStatusColor(false, rental.endDate)}>
                      {formatDateRelative(rental.endDate)}
                    </Badge>
                    <span className="text-sm text-primary font-medium">
                      Earning: {formatCurrency(rental.lenderAmount)}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="flex space-x-2 mt-3">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => {
                    // Send reminder to borrower using the proper endpoint
                    apiRequest("POST", `/api/rentals/${rental.id}/send-reminder`, {})
                      .then(() => {
                        const daysUntilDue = Math.ceil((new Date(rental.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                        toast({
                          title: "Reminder Sent",
                          description: `Return reminder sent to ${rental.borrower.name} for "${rental.book.title}" (due in ${daysUntilDue} days)`,
                        });
                      })
                      .catch((error) => {
                        console.error("Send reminder error:", error);
                        toast({
                          title: "Error",
                          description: "Failed to send reminder. Please try again.",
                          variant: "destructive",
                        });
                      });
                  }}
                >
                  Send Reminder
                </Button>
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => {
                    // Show borrower details
                    toast({
                      title: "Borrower Details",
                      description: `Name: ${rental.borrower.name}\nPhone: Contact through app notifications\nDue: ${new Date(rental.endDate).toLocaleDateString()}`,
                    });
                  }}
                >
                  Details
                </Button>
              </div>
            </CardContent>
          </Card>
        ))
      ) : (
        <Card>
          <CardContent className="pt-6 text-center">
            <BookOpen className="h-12 w-12 text-text-secondary mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-text-primary mb-2">
              No Lent Books
            </h3>
            <p className="text-text-secondary">
              You haven't lent any books yet. Add books to your library to start earning!
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );

  const MyLibraryTab = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">My Library</h3>
        <Button size="sm" onClick={() => setShowAddModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Book
        </Button>
      </div>
      
      {loadingOwned ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="flex items-start space-x-3">
                  <div className="w-12 h-16 bg-gray-200 rounded"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded"></div>
                    <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                    <div className="h-6 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : Array.isArray(myBooks) && myBooks.length > 0 ? (
        myBooks.map((book: Book) => (
          <Card key={book.id} className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => handleBookClick(book)}>
            <CardContent className="p-4">
              <div className="flex items-start space-x-3">
                <div className="w-12 h-16 bg-gradient-to-br from-purple-100 to-purple-200 rounded flex items-center justify-center flex-shrink-0">
                  {book.coverImageUrl || book.imageUrl ? (
                    <img 
                      src={(book.coverImageUrl || book.imageUrl)!} 
                      alt={book.title}
                      className="w-full h-full object-cover rounded"
                    />
                  ) : (
                    <span className="text-xs text-purple-600 font-medium text-center px-1">
                      {book.title.substring(0, 3)}
                    </span>
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-text-primary mb-1">
                    {book.title}
                  </h4>
                  <p className="text-sm text-text-secondary mb-2">
                    {book.author}
                  </p>
                  
                  <div className="flex items-center justify-between">
                    <Badge className={getBookStatusColor(book.isAvailable)}>
                      {getBookStatusText(book.isAvailable)}
                    </Badge>
                    <span className="text-sm text-primary font-medium">
                      {formatCurrency(book.dailyFee)}/day
                    </span>
                  </div>
                </div>
                
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEditBook(book);
                  }}
                >
                  <Edit className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))
      ) : (
        <Card>
          <CardContent className="pt-6 text-center">
            <BookOpen className="h-12 w-12 text-text-secondary mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-text-primary mb-2">
              No Books in Library
            </h3>
            <p className="text-text-secondary mb-4">
              Start building your library by adding books you'd like to lend out.
            </p>
            <Button onClick={() => setShowAddModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Book
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );

  const BoughtBooksTab = () => (
    <div className="space-y-4">
      {loadingBought ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="flex items-start space-x-3">
                  <div className="w-12 h-16 bg-gray-200 rounded"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded"></div>
                    <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : Array.isArray(boughtBooks) && boughtBooks.length > 0 ? (
        boughtBooks.map((purchase: any) => (
          <Card key={purchase.id}>
            <CardContent className="p-4">
              <div className="flex items-start space-x-3">
                <div className="w-12 h-16 bg-gradient-to-br from-green-100 to-green-200 rounded flex items-center justify-center flex-shrink-0">
                  <span className="text-xs text-green-600 font-medium text-center px-1">
                    {purchase.book.title.substring(0, 3)}
                  </span>
                </div>
                
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-text-primary mb-1">
                    {purchase.book.title}
                  </h4>
                  <p className="text-sm text-text-secondary mb-1">
                    {purchase.book.author}
                  </p>
                  <p className="text-sm text-text-secondary mb-2">
                    Seller: {purchase.seller.name}
                  </p>
                  
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary">
                      Purchased {formatDateRelative(purchase.createdAt)}
                    </Badge>
                    <span className="text-sm font-semibold text-green-600">
                      {formatCurrency(purchase.purchasePrice)}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      ) : (
        <Card>
          <CardContent className="pt-6 text-center">
            <BookOpen className="h-12 w-12 text-text-secondary mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-text-primary mb-2">
              No Purchased Books
            </h3>
            <p className="text-text-secondary mb-4">
              You haven't purchased any books yet. Browse available books for sale!
            </p>
            <Button onClick={() => window.location.href = '/browse'}>
              Browse Books
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );

  const SoldBooksTab = () => (
    <div className="space-y-4">
      {loadingSold ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="flex items-start space-x-3">
                  <div className="w-12 h-16 bg-gray-200 rounded"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded"></div>
                    <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : Array.isArray(soldBooks) && soldBooks.length > 0 ? (
        soldBooks.map((purchase: any) => (
          <Card key={purchase.id}>
            <CardContent className="p-4">
              <div className="flex items-start space-x-3">
                <div className="w-12 h-16 bg-gradient-to-br from-orange-100 to-orange-200 rounded flex items-center justify-center flex-shrink-0">
                  <span className="text-xs text-orange-600 font-medium text-center px-1">
                    {purchase.book.title.substring(0, 3)}
                  </span>
                </div>
                
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-text-primary mb-1">
                    {purchase.book.title}
                  </h4>
                  <p className="text-sm text-text-secondary mb-1">
                    {purchase.book.author}
                  </p>
                  <p className="text-sm text-text-secondary mb-2">
                    Buyer: {purchase.buyer.name}
                  </p>
                  
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary">
                      Sold {formatDateRelative(purchase.createdAt)}
                    </Badge>
                    <span className="text-sm font-semibold text-green-600">
                      {formatCurrency(purchase.purchasePrice)}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      ) : (
        <Card>
          <CardContent className="pt-6 text-center">
            <BookOpen className="h-12 w-12 text-text-secondary mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-text-primary mb-2">
              No Sold Books
            </h3>
            <p className="text-text-secondary mb-4">
              You haven't sold any books yet. Add books with a selling price to start selling!
            </p>
            <Button onClick={() => setShowAddModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Book
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-text-primary">My Books</h1>
        <Button onClick={() => setShowBulkUploadModal(true)} variant="outline" data-testid="button-bulk-upload">
          <Camera className="h-4 w-4 mr-2" />
          Add Books In Bulk
        </Button>
      </div>
      
      <Tabs defaultValue="borrowed" className="w-full">
        <TabsList className="grid w-full grid-cols-5 mb-6">
          <TabsTrigger value="borrowed">Borrowed</TabsTrigger>
          <TabsTrigger value="lent">Lent Out</TabsTrigger>
          <TabsTrigger value="owned">My Library</TabsTrigger>
          <TabsTrigger value="bought">Bought</TabsTrigger>
          <TabsTrigger value="sold">Sold</TabsTrigger>
        </TabsList>
        
        <TabsContent value="borrowed">
          <BorrowedBooksTab />
        </TabsContent>
        
        <TabsContent value="lent">
          <LentBooksTab />
        </TabsContent>
        
        <TabsContent value="owned">
          <MyLibraryTab />
        </TabsContent>
        
        <TabsContent value="bought">
          <BoughtBooksTab />
        </TabsContent>
        
        <TabsContent value="sold">
          <SoldBooksTab />
        </TabsContent>
      </Tabs>
      
      {/* Book Details Modal */}
      <BookDetailsModal
        isOpen={showBookDetails}
        onClose={() => setShowBookDetails(false)}
        book={selectedBook}
        user={user}
        onEdit={handleEditBook}
        onDelete={(bookId) => {
          // Refresh the books list after deletion
          queryClient.invalidateQueries({ queryKey: ["/api/books/my"] });
          setShowBookDetails(false);
        }}
      />

      {/* Add/Edit Book Modal */}
      <AddBookModal 
        open={showAddModal} 
        onOpenChange={(open) => {
          setShowAddModal(open);
          if (!open) {
            setEditingBook(null);
          }
        }}
        editBook={editingBook}
        onOpenBulkUpload={() => setShowBulkUploadModal(true)}
      />

      {/* Extension Request Modal */}
      {selectedRental && (
        <ExtensionRequestModal
          isOpen={showExtendModal}
          onClose={() => {
            setShowExtendModal(false);
            setSelectedRental(null);
          }}
          rental={selectedRental}
        />
      )}

      {/* Late Fee Modal */}
      {selectedRental && (
        <LateFeeModal
          isOpen={showLateFeeModal}
          onClose={() => {
            setShowLateFeeModal(false);
            setSelectedRental(null);
          }}
          rental={selectedRental}
        />
      )}

      {/* Return Confirmation Modal */}
      {selectedRental && (
        <ReturnConfirmationModal
          isOpen={showReturnModal}
          onClose={() => {
            setShowReturnModal(false);
            setSelectedRental(null);
          }}
          rental={selectedRental}
          type={returnModalType}
        />
      )}

      {/* Excess Charge Payment Modal */}
      {excessChargeData && (
        <ExcessChargePaymentModal
          isOpen={showExcessChargeModal}
          onClose={() => {
            setShowExcessChargeModal(false);
            setExcessChargeData(null);
          }}
          rental={excessChargeData.rental}
          excessAmount={excessChargeData.excessAmount}
          lateFee={excessChargeData.lateFee}
          platformFee={excessChargeData.platformFee}
          securityDeposit={excessChargeData.securityDeposit}
        />
      )}

      {/* Bulk Upload Modal */}
      {showBulkUploadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-auto">
          <div className="w-full max-w-4xl max-h-[90vh] overflow-auto bg-white rounded-lg shadow-xl">
            <BulkBookUpload
              onClose={() => setShowBulkUploadModal(false)}
              onBooksAdded={() => {
                setShowBulkUploadModal(false);
                queryClient.invalidateQueries({ queryKey: ["/api/books/my"] });
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
