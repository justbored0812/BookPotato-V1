import { useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { CreditCard, Clock, Shield, IndianRupee, Gift } from "lucide-react";
import { BrocksOffersModal } from "@/components/brocks/brocks-offers-modal";
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

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  book: any;
  onSuccess: () => void;
}

export default function PaymentModal({ isOpen, onClose, book, onSuccess }: PaymentModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [showBrocksModal, setShowBrocksModal] = useState(false);
  const [appliedBrocks, setAppliedBrocks] = useState<{
    offerType: 'rupees' | 'commission-free';
    brocksUsed: number;
    discountAmount: number;
  } | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch user credits
  const { data: userCredits } = useQuery({
    queryKey: ["/api/user/credits"],
  });

  // Fetch platform settings
  const { data: platformSettings } = useQuery({
    queryKey: ["/api/platform/settings"],
    staleTime: 30 * 1000, // Cache for 30 seconds only
    refetchOnWindowFocus: true,
  });

  const dailyFee = parseFloat(book?.dailyFee || "0");
  const duration = 7; // Default 7 days
  const rentalFee = dailyFee * duration;
  const commissionRate = (platformSettings as any)?.commissionRate ? (platformSettings as any).commissionRate / 100 : 0.05;
  const platformFee = rentalFee * commissionRate;
  const securityDeposit = (platformSettings as any)?.securityDeposit || 100;
  const originalAmount = rentalFee + securityDeposit;
  
  // Apply Brocks discount if available
  const finalAmount = appliedBrocks ? originalAmount - appliedBrocks.discountAmount : originalAmount;

  const borrowMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/rentals/borrow", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          bookId: book.id, 
          duration: duration,
          paymentMethod: "mock", // Simulated payment
          appliedBrocks: appliedBrocks
        })
      });
      if (!response.ok) {
        throw new Error("Failed to process rental");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Payment Successful!",
        description: "Book borrowed successfully. You can find it in 'My Books'."
      });
      queryClient.invalidateQueries({ queryKey: ['/api/books/all'] });
      queryClient.invalidateQueries({ queryKey: ['/api/rentals/active'] });
      onSuccess();
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Payment Failed",
        description: error.message || "Failed to process payment",
        variant: "destructive"
      });
      setIsProcessing(false);
    }
  });

  const handlePayment = async () => {
    setIsProcessing(true);
    
    // Simulate payment processing delay
    setTimeout(() => {
      borrowMutation.mutate();
    }, 2000);
  };

  if (!book) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Rent Book</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Book Details */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-16 bg-gradient-to-br from-primary/20 to-secondary/20 rounded flex items-center justify-center">
                  <div className="text-2xl">📚</div>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-sm">{book.title}</h3>
                  <p className="text-xs text-text-secondary">by {book.author}</p>
                  <p className="text-xs text-text-secondary">Owner: {book.owner?.name}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Rental Details */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-text-secondary" />
                  <span className="text-sm">Duration</span>
                </div>
                <Badge variant="secondary">{duration} days</Badge>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Rental Fee ({duration} days)</span>
                  <span>₹{rentalFee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Platform Fee ({platformSettings ? platformSettings.commissionRate : 5}%)</span>
                  <span>₹{platformFee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <div className="flex items-center space-x-1">
                    <Shield className="h-3 w-3" />
                    <span>Security Deposit</span>
                  </div>
                  <span>₹{securityDeposit}</span>
                </div>
                <hr />
                {appliedBrocks && (
                  <div className="flex justify-between text-green-600">
                    <span>Brocks Discount</span>
                    <span>-₹{appliedBrocks.discountAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-semibold">
                  <span>Total Amount</span>
                  <span>₹{finalAmount.toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Brocks Offers - Always show this section */}
          {!appliedBrocks && (
            <Card className="border-amber-200 bg-amber-50/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Gift className="h-5 w-5 text-amber-600" />
                    <div>
                      <p className="font-medium text-sm">Use Brocks Credits</p>
                      <p className="text-xs text-amber-700">
                        {userCredits?.balance > 0 
                          ? `You have ${userCredits.balance} Brocks • Convert to rupees or get commission-free days`
                          : 'Earn Brocks through book uploads, referrals, and transactions'
                        }
                      </p>
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setShowBrocksModal(true)}
                    className="border-amber-300 text-amber-700 hover:bg-amber-100"
                  >
                    {userCredits?.balance > 0 ? 'View Offers' : 'Learn More'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Applied Brocks Info */}
          {appliedBrocks && (
            <Card className="border-green-200 bg-green-50/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Gift className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="font-medium text-sm">Brocks Applied</p>
                      <p className="text-xs text-green-700">
                        {appliedBrocks.offerType === 'rupees' 
                          ? `${appliedBrocks.brocksUsed} Brocks → ₹${appliedBrocks.discountAmount} discount`
                          : `${appliedBrocks.brocksUsed} Brocks → Commission-free days`
                        }
                      </p>
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setAppliedBrocks(null)}
                    className="text-green-700 hover:bg-green-100"
                  >
                    Remove
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Payment Method */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <CreditCard className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium text-sm">Simulated Payment</p>
                  <p className="text-xs text-text-secondary">
                    Payment processing simulated for testing
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex space-x-3">
            <Button 
              variant="outline" 
              onClick={onClose}
              disabled={isProcessing}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button 
              onClick={handlePayment}
              disabled={isProcessing}
              className="flex-1"
            >
              {isProcessing ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Processing...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <IndianRupee className="h-4 w-4" />
                  <span>Pay ₹{finalAmount.toFixed(2)}</span>
                </div>
              )}
            </Button>
          </div>

          <p className="text-xs text-text-secondary text-center">
            Security deposit will be refunded when book is returned in good condition
          </p>
        </div>
      </DialogContent>

      {/* Brocks Offers Modal */}
      <BrocksOffersModal
        isOpen={showBrocksModal}
        onClose={() => setShowBrocksModal(false)}
        currentAmount={originalAmount}
        onApplyOffer={(offerType, brocksUsed, discountAmount) => {
          setAppliedBrocks({
            offerType,
            brocksUsed,
            discountAmount
          });
          setShowBrocksModal(false);
          toast({
            title: "Brocks Applied!",
            description: `${brocksUsed} Brocks ${offerType === 'rupees' ? `converted to ₹${discountAmount} discount` : 'converted to commission-free days'}`,
          });
        }}
      />
    </Dialog>
  );
}