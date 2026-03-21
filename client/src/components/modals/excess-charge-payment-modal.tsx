import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { AlertTriangle, CreditCard, IndianRupee } from "lucide-react";

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface ExcessChargePaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  rental: any;
  excessAmount: number;
  lateFee: number;
  platformFee: number;
  securityDeposit: number;
}

export default function ExcessChargePaymentModal({ 
  isOpen, 
  onClose, 
  rental,
  excessAmount,
  lateFee,
  platformFee,
  securityDeposit
}: ExcessChargePaymentModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isProcessing, setIsProcessing] = useState(false);

  const payExcessMutation = useMutation({
    mutationFn: async (data: { paymentId: string; orderId: string }) => {
      const response = await apiRequest("POST", `/api/rentals/${rental.id}/pay-excess-charges`, {
        excessAmount,
        paymentId: data.paymentId,
        orderId: data.orderId,
        paymentMethod: "razorpay"
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Payment Successful!",
        description: `Successfully paid ₹${excessAmount.toFixed(2)} in excess charges`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/rentals/borrowed"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      setIsProcessing(false);
      onClose();
    },
    onError: () => {
      toast({
        title: "Payment Failed",
        description: "Failed to process excess charge payment",
        variant: "destructive",
      });
      setIsProcessing(false);
    },
  });

  const handlePayExcess = async () => {
    if (excessAmount <= 0) {
      toast({
        title: "No Payment Required",
        description: "There are no excess charges to pay",
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
          amount: excessAmount * 100, // Convert to paise
          bookTitle: rental.book?.title || "Excess Charge Payment",
          lenderName: "Excess Charge Payment"
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
        description: `Excess Charges for ${rental.book?.title}`,
        order_id: orderData.orderId,
        handler: async function (razorpayResponse: any) {
          console.log('💳 Razorpay payment successful for excess charges:', razorpayResponse);
          try {
            await payExcessMutation.mutateAsync({
              paymentId: razorpayResponse.razorpay_payment_id,
              orderId: razorpayResponse.razorpay_order_id,
            });
          } catch (error) {
            console.error('Error completing excess charge payment after Razorpay:', error);
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

  if (!rental || !rental.book) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            <span>Excess Charges Payment Required</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Book Info */}
          <Card>
            <CardContent className="p-4">
              <h3 className="font-medium text-gray-900">{rental.book?.title}</h3>
              <p className="text-sm text-gray-600">by {rental.book?.author}</p>
              <div className="flex items-center space-x-2 mt-2">
                <Badge variant="destructive">Returned - Payment Due</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Charge Breakdown */}
          <Card className="border-orange-200 bg-orange-50">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center space-x-2">
                <CreditCard className="w-4 h-4 text-orange-600" />
                <span className="font-medium text-orange-800">Payment Breakdown</span>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Security Deposit:</span>
                  <span className="font-medium">₹{securityDeposit.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-red-600">
                  <span>Late Fee:</span>
                  <span className="font-medium">₹{lateFee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-red-600">
                  <span>Platform Fee on Late Charges:</span>
                  <span className="font-medium">₹{platformFee.toFixed(2)}</span>
                </div>
                <hr className="border-orange-200" />
                <div className="flex justify-between">
                  <span className="text-gray-600">Deducted from Deposit:</span>
                  <span className="font-medium">₹{securityDeposit.toFixed(2)}</span>
                </div>
                <hr className="border-orange-200" />
                <div className="flex justify-between font-bold text-base">
                  <span>Amount You Need to Pay:</span>
                  <span className="text-orange-700 flex items-center">
                    <IndianRupee className="w-4 h-4" />
                    {excessAmount.toFixed(2)}
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
                <p>The charges exceeded your security deposit. Please complete the payment to close this transaction.</p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-2">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              onClick={handlePayExcess}
              disabled={isProcessing}
              className="flex-1 bg-orange-600 hover:bg-orange-700"
              data-testid="pay-excess-button"
            >
              {isProcessing ? (
                "Processing..."
              ) : (
                <>
                  <CreditCard className="w-4 h-4 mr-2" />
                  Pay ₹{excessAmount.toFixed(2)}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
