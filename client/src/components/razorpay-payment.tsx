import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CreditCard } from "lucide-react";

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface RazorpayPaymentProps {
  amount: number;
  bookTitle: string;
  lenderName: string;
  onSuccess: (paymentId: string, orderId: string) => void;
  onClose: () => void;
}

export default function RazorpayPayment({ 
  amount, 
  bookTitle, 
  lenderName, 
  onSuccess, 
  onClose 
}: RazorpayPaymentProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const handlePayment = async () => {
    setIsProcessing(true);

    try {
      // Create order on backend
      const response = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: amount * 100, // Convert to paise
          bookTitle,
          lenderName
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
        name: 'BookShare',
        description: `Rent: ${bookTitle}`,
        order_id: orderData.orderId,
        handler: function (response: any) {
          onSuccess(response.razorpay_payment_id, response.razorpay_order_id);
          toast({
            title: "Payment Successful!",
            description: `You have successfully rented "${bookTitle}"`,
          });
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
            onClose();
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
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Payment Details
        </CardTitle>
        <CardDescription>
          Complete your book rental payment
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Book:</span>
            <span className="text-sm font-medium">{bookTitle}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Lender:</span>
            <span className="text-sm font-medium">{lenderName}</span>
          </div>
          <div className="flex justify-between border-t pt-2">
            <span className="font-medium">Total Amount:</span>
            <span className="font-bold text-lg">₹{amount}</span>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button 
            onClick={handlePayment} 
            disabled={isProcessing}
            className="flex-1"
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              'Pay Now'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}