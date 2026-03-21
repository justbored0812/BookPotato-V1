import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CreditCard, Smartphone, Building2, Wallet, Check, AlertCircle } from "lucide-react";

interface PaymentGatewayModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPaymentSuccess: () => void;
  paymentDetails: {
    amount: number;
    description: string;
    breakdown?: {
      extensionFee: number;
      platformCommission: number;
      ownerEarnings: number;
    };
  };
}

const paymentMethods = [
  {
    id: "card",
    name: "Credit/Debit Card",
    icon: CreditCard,
    description: "Visa, Mastercard, RuPay",
    popular: true
  },
  {
    id: "upi",
    name: "UPI Payment",
    icon: Smartphone,
    description: "PhonePe, GPay, Paytm"
  },
  {
    id: "netbanking",
    name: "Net Banking",
    icon: Building2,
    description: "All major banks"
  },
  {
    id: "wallet",
    name: "Digital Wallet",
    icon: Wallet,
    description: "Paytm, MobiKwik"
  }
];

export function PaymentGatewayModal({ isOpen, onClose, onPaymentSuccess, paymentDetails }: PaymentGatewayModalProps) {
  // Don't render if no payment details
  if (!paymentDetails) {
    return null;
  }
  const [selectedMethod, setSelectedMethod] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentStep, setPaymentStep] = useState<"select" | "processing" | "success">("select");

  const handlePayment = async () => {
    if (!selectedMethod) return;
    
    setIsProcessing(true);
    setPaymentStep("processing");
    
    // Simulate payment processing
    setTimeout(() => {
      setPaymentStep("success");
      setTimeout(() => {
        onPaymentSuccess();
        onClose();
        // Reset state for next use
        setPaymentStep("select");
        setSelectedMethod("");
        setIsProcessing(false);
      }, 2000);
    }, 2000);
  };

  const handleClose = () => {
    if (!isProcessing) {
      onClose();
      setPaymentStep("select");
      setSelectedMethod("");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">
            {paymentStep === "select" && "Choose Payment Method"}
            {paymentStep === "processing" && "Processing Payment"}
            {paymentStep === "success" && "Payment Successful"}
          </DialogTitle>
        </DialogHeader>

        {paymentStep === "select" && (
          <div className="space-y-4">
            {/* Payment Amount */}
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-900">₹{paymentDetails.amount}</div>
                  <div className="text-sm text-blue-700">{paymentDetails.description}</div>
                </div>
                
                {paymentDetails.breakdown && (
                  <div className="mt-3 space-y-1">
                    <Separator className="bg-blue-200" />
                    <div className="text-xs space-y-1">
                      <div className="flex justify-between">
                        <span className="text-blue-600">Extension fee:</span>
                        <span>₹{paymentDetails.breakdown.extensionFee}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-blue-600">Platform commission:</span>
                        <span>₹{paymentDetails.breakdown.platformCommission}</span>
                      </div>
                      <div className="flex justify-between font-medium">
                        <span className="text-blue-600">Owner earnings:</span>
                        <span className="text-green-600">₹{paymentDetails.breakdown.ownerEarnings}</span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Payment Methods */}
            <div className="space-y-2">
              <div className="text-sm font-medium text-gray-700">Select Payment Method</div>
              {paymentMethods.map((method) => {
                const Icon = method.icon;
                return (
                  <Card
                    key={method.id}
                    className={`cursor-pointer transition-colors ${
                      selectedMethod === method.id
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                    onClick={() => setSelectedMethod(method.id)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center space-x-3">
                        <Icon className="w-5 h-5 text-gray-600" />
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium text-sm">{method.name}</span>
                            {method.popular && (
                              <Badge variant="secondary" className="text-xs px-1 py-0">
                                Popular
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-gray-500">{method.description}</div>
                        </div>
                        {selectedMethod === method.id && (
                          <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center">
                            <Check className="w-2.5 h-2.5 text-white" />
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Payment Button */}
            <Button
              onClick={handlePayment}
              disabled={!selectedMethod}
              className="w-full"
              size="lg"
            >
              Pay ₹{paymentDetails.amount}
            </Button>

            <div className="text-xs text-gray-500 text-center">
              <AlertCircle className="w-3 h-3 inline mr-1" />
              This is a demo payment gateway. No real payment will be processed.
            </div>
          </div>
        )}

        {paymentStep === "processing" && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto mb-4" />
            <div className="text-lg font-medium">Processing Payment...</div>
            <div className="text-sm text-gray-500 mt-1">Please wait while we process your payment</div>
          </div>
        )}

        {paymentStep === "success" && (
          <div className="text-center py-8">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-6 h-6 text-green-600" />
            </div>
            <div className="text-lg font-medium text-green-900">Payment Successful!</div>
            <div className="text-sm text-gray-500 mt-1">Your extension has been processed</div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}