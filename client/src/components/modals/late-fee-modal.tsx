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
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { AlertTriangle, Clock, IndianRupee } from "lucide-react";

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface LateFeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  rental: any;
}

export default function LateFeeModal({ isOpen, onClose, rental }: LateFeeModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isProcessing, setIsProcessing] = useState(false);

  const calculateLateFee = () => {
    if (!rental || !rental.book) return { daysLate: 0, dailyLateFee: 0, totalLateFee: 0 };
    
    const endDate = new Date(rental.endDate);
    const currentDate = new Date();
    const daysLate = Math.max(0, Math.ceil((currentDate.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24)));
    const dailyLateFee = (parseFloat(rental.book.dailyFee) || 0) * 0.5 || 5; // 50% of daily fee or ₹5 minimum
    return {
      daysLate,
      dailyLateFee,
      totalLateFee: daysLate * dailyLateFee
    };
  };

  const { daysLate, dailyLateFee, totalLateFee } = calculateLateFee();

  // Don't render if rental or book data is missing
  if (!rental || !rental.book) {
    return null;
  }

  const payLateFeesMutation = useMutation({
    mutationFn: async (data: { paymentId: string; orderId: string }) => {
      const response = await apiRequest("POST", `/api/rentals/${rental.id}/pay-late-fees`, {
        lateFeeAmount: totalLateFee,
        paymentId: data.paymentId,
        orderId: data.orderId,
        paymentMethod: "razorpay"
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Late Fees Paid",
        description: `Successfully paid ₹${totalLateFee.toFixed(2)} in late fees`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/rentals/borrowed"] });
      queryClient.invalidateQueries({ queryKey: ["/api/rentals/lent"] });
      setIsProcessing(false);
      onClose();
    },
    onError: () => {
      toast({
        title: "Payment Failed",
        description: "Failed to process late fee payment",
        variant: "destructive",
      });
      setIsProcessing(false);
    },
  });

  const handlePayLateFees = async () => {
    if (totalLateFee <= 0) {
      toast({
        title: "No Late Fees",
        description: "There are no late fees to pay",
      });
      return;
    }

    setIsProcessing(true);

    try {
      // Create Razorpay order
      const response = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          amount: totalLateFee * 100, // Convert to paise
          bookTitle: rental.book?.title || "Late Fee Payment",
          lenderName: "Late Fee Payment"
        }),
      });

      const orderData = await response.json();

      if (!response.ok) {
        throw new Error(orderData.message || 'Failed to create order');
      }

      // Initialize Razorpay
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: orderData.amount,
        currency: 'INR',
        name: 'BookPotato',
        description: `Late Fee Payment for ${rental.book?.title}`,
        order_id: orderData.orderId,
        handler: async function (razorpayResponse: any) {
          console.log('💳 Razorpay payment successful for late fee:', razorpayResponse);
          try {
            // Complete the payment with payment details
            await payLateFeesMutation.mutateAsync({
              paymentId: razorpayResponse.razorpay_payment_id,
              orderId: razorpayResponse.razorpay_order_id,
            });
          } catch (error) {
            console.error('Error completing late fee payment after Razorpay:', error);
            toast({
              title: "Transaction Failed",
              description: "Payment was successful but failed to complete the transaction. Please contact support.",
              variant: "destructive",
            });
          }
        },
        prefill: {
          name: 'User Name',
          email: 'user@example.com',
        },
        theme: {
          color: '#0EA5E9'
        },
        modal: {
          ondismiss: function() {
            setIsProcessing(false);
            toast({
              title: "Payment Cancelled",
              description: "You cancelled the payment process",
            });
          }
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.open();

    } catch (error) {
      console.error('Payment error:', error);
      toast({
        title: "Payment Failed",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      });
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md" aria-describedby="late-fee-description">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <span>Late Fee Payment</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Book Info */}
          <Card>
            <CardContent className="p-4">
              <h3 className="font-medium text-gray-900">{rental.book?.title}</h3>
              <p className="text-sm text-gray-600">by {rental.book?.author}</p>
              <div className="flex items-center space-x-2 mt-2">
                <Badge variant="destructive">Overdue</Badge>
                <span className="text-sm text-gray-500">
                  Due: {new Date(rental.endDate).toLocaleDateString()}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Late Fee Breakdown */}
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center space-x-2">
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
            </CardContent>
          </Card>

          {/* Warning Message */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <div className="flex items-start space-x-2">
              <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5" />
              <div className="text-sm text-yellow-800">
                <p className="font-medium">Important:</p>
                <p>Late fees continue to accumulate daily until the book is returned and payment is made.</p>
              </div>
            </div>
          </div>

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
              onClick={handlePayLateFees}
              disabled={payLateFeesMutation.isPending || isProcessing}
              className="flex-1 bg-red-600 hover:bg-red-700"
            >
              {payLateFeesMutation.isPending ? "Processing..." : `Pay ₹${totalLateFee.toFixed(2)}`}
            </Button>
          </div>

          <p className="text-xs text-gray-500 text-center">
            Payment will be processed through Razorpay. The book must still be returned separately.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}