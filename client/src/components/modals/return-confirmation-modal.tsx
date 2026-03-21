import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { CheckCircle, XCircle, MessageSquare, Book, IndianRupee, Clock, AlertTriangle } from "lucide-react";
import { PaymentGatewayModal } from "@/components/modals/payment-gateway-modal";

interface ReturnConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  rental: any;
  type: "confirm" | "request"; // confirm for lender, request for borrower
}

export default function ReturnConfirmationModal({ 
  isOpen, 
  onClose, 
  rental, 
  type 
}: ReturnConfirmationModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [notes, setNotes] = useState("");
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Calculate late fees if overdue
  const calculateLateFee = () => {
    if (!rental || !rental.book) return { daysLate: 0, dailyLateFee: 0, totalLateFee: 0 };
    
    const endDate = new Date(rental.endDate);
    const currentDate = new Date();
    const daysLate = Math.max(0, Math.ceil((currentDate.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24)));
    const dailyLateFee = parseFloat(rental.book.dailyFee) || 10; // 100% of daily rental fee
    return {
      daysLate,
      dailyLateFee,
      totalLateFee: daysLate * dailyLateFee
    };
  };

  const { daysLate, dailyLateFee, totalLateFee } = calculateLateFee();

  const confirmReturnMutation = useMutation({
    mutationFn: async () => {
      const endpoint = type === "confirm" 
        ? `/api/rentals/${rental.id}/confirm-return`
        : `/api/rentals/${rental.id}/request-return`;
      
      const requestData: any = {
        notes: notes.trim() || undefined
      };

      // Include late fee info if borrower is requesting return for overdue book
      if (type === "request" && isOverdue && totalLateFee > 0) {
        requestData.lateFeeAmount = totalLateFee;
      }
      
      const response = await apiRequest("POST", endpoint, requestData);
      return response.json();
    },
    onSuccess: () => {
      const message = type === "confirm" 
        ? "Return confirmed successfully"
        : isOverdue && totalLateFee > 0
          ? `Return request sent. Late fee of ₹${totalLateFee.toFixed(2)} will be charged.`
          : "Return request sent to book owner";
      
      toast({
        title: type === "confirm" ? "Return Confirmed" : "Return Requested",
        description: message,
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/rentals/borrowed"] });
      queryClient.invalidateQueries({ queryKey: ["/api/rentals/lent"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/books/all"] });
      queryClient.invalidateQueries({ queryKey: ["/api/books/browse"] });
      queryClient.invalidateQueries({ queryKey: ["/api/books/my"] });
      onClose();
      setNotes("");
    },
    onError: () => {
      toast({
        title: "Error",
        description: `Failed to ${type === "confirm" ? "confirm" : "request"} return`,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    // If borrower is requesting return and book is overdue, show payment modal first
    if (type === "request" && isOverdue && totalLateFee > 0) {
      setShowPaymentModal(true);
    } else {
      // Otherwise proceed with normal flow (lender confirm or on-time return request)
      confirmReturnMutation.mutate();
    }
  };

  const handlePaymentSuccess = () => {
    // After successful payment, send the return request
    setShowPaymentModal(false);
    confirmReturnMutation.mutate();
  };

  if (!rental) {
    return null;
  }

  const isOverdue = new Date() > new Date(rental.endDate);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md" aria-describedby="return-confirmation-description">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            {type === "confirm" ? (
              <CheckCircle className="w-5 h-5 text-green-500" />
            ) : (
              <Book className="w-5 h-5 text-blue-500" />
            )}
            <span>
              {type === "confirm" ? "Confirm Book Return" : "Request Book Return"}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Book Info */}
          <Card>
            <CardContent className="p-4">
              <h3 className="font-medium text-gray-900">{rental.book?.title}</h3>
              <p className="text-sm text-gray-600">by {rental.book?.author}</p>
              <div className="flex items-center space-x-2 mt-2">
                {isOverdue ? (
                  <Badge variant="destructive">Overdue</Badge>
                ) : (
                  <Badge variant="secondary">Active</Badge>
                )}
                <span className="text-sm text-gray-500">
                  Due: {new Date(rental.endDate).toLocaleDateString()}
                </span>
              </div>
              
              {type === "confirm" && (
                <div className="mt-2 text-sm text-gray-600">
                  <p>Borrowed by: <span className="font-medium">{rental.borrower?.name}</span></p>
                </div>
              )}
              
              {type === "request" && (
                <div className="mt-2 text-sm text-gray-600">
                  <p>Owned by: <span className="font-medium">{rental.lender?.name}</span></p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Overdue Warning and Late Fee Details */}
          {isOverdue && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center space-x-2">
                  <XCircle className="w-4 h-4 text-red-600" />
                  <span className="text-sm font-medium text-red-800">
                    This book is overdue
                  </span>
                </div>
                
                {type === "request" && totalLateFee > 0 && (
                  <>
                    <div className="flex items-center space-x-2 pt-2 border-t border-red-200">
                      <Clock className="w-4 h-4 text-red-600" />
                      <span className="font-medium text-red-800">Late Fee Details</span>
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Days overdue:</span>
                        <span className="font-medium">{daysLate} days</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Late fee per day:</span>
                        <span className="font-medium">₹{dailyLateFee.toFixed(2)}</span>
                      </div>
                      <hr className="border-red-200" />
                      <div className="flex justify-between font-medium text-base">
                        <span>Total late fee:</span>
                        <span className="text-red-700 flex items-center">
                          <IndianRupee className="w-4 h-4" />
                          {totalLateFee.toFixed(2)}
                        </span>
                      </div>
                    </div>
                    
                    <p className="text-xs text-red-700 mt-2">
                      This late fee will be charged when you return the book.
                    </p>
                  </>
                )}
                
                {type === "confirm" && (
                  <p className="text-xs text-red-700 mt-1">
                    Late fees may apply. Please process the return as soon as possible.
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Notes Section */}
          <div className="space-y-2">
            <Label htmlFor="return-notes" className="flex items-center space-x-2">
              <MessageSquare className="w-4 h-4" />
              <span>
                {type === "confirm" 
                  ? "Return Notes (Optional)" 
                  : "Message to Owner (Optional)"
                }
              </span>
            </Label>
            <Textarea
              id="return-notes"
              placeholder={
                type === "confirm"
                  ? "Add any notes about the book's condition..."
                  : "Let the owner know when and how you'll return the book..."
              }
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-[80px]"
            />
          </div>

          {/* Information Box */}
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="p-3">
              <div className="text-sm text-blue-800">
                {type === "confirm" ? (
                  <div>
                    <p className="font-medium">Confirming this return will:</p>
                    <ul className="mt-1 space-y-1 text-xs">
                      <li>• Mark the book as available for other borrowers</li>
                      <li>• Complete the rental transaction</li>
                      <li>• Notify the borrower of confirmation</li>
                    </ul>
                  </div>
                ) : (
                  <div>
                    <p className="font-medium">Requesting return will:</p>
                    <ul className="mt-1 space-y-1 text-xs">
                      <li>• Notify the book owner of your return request</li>
                      <li>• Allow coordination of return logistics</li>
                      <li>• Require owner confirmation to complete</li>
                    </ul>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex space-x-2">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={confirmReturnMutation.isPending}
              className={`flex-1 ${
                type === "confirm" 
                  ? "bg-green-600 hover:bg-green-700" 
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {confirmReturnMutation.isPending 
                ? "Processing..." 
                : type === "confirm" 
                  ? "Confirm Return" 
                  : "Send Request"
              }
            </Button>
          </div>
        </div>
      </DialogContent>

      {/* Payment Gateway Modal for Overdue Late Fees */}
      {showPaymentModal && (
        <PaymentGatewayModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          onPaymentSuccess={handlePaymentSuccess}
          paymentDetails={{
            amount: totalLateFee,
            description: `Late Fee Payment for "${rental.book?.title}" - ${daysLate} days overdue`,
            breakdown: {
              extensionFee: totalLateFee,
              platformCommission: 0,
              ownerEarnings: totalLateFee,
            }
          }}
        />
      )}
    </Dialog>
  );
}