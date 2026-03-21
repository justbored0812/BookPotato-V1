import { useState, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, CreditCard, Smartphone, Gift, Coins } from "lucide-react";
import { BrocksOffersModal } from "@/components/brocks/brocks-offers-modal";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { formatCurrency, calculateRentalCost } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import type { BookWithOwner } from "@shared/schema";

declare global {
  interface Window {
    Razorpay: any;
  }
}

const borrowSchema = z.object({
  transactionType: z.enum(["borrow", "buy"], {
    required_error: "Please select transaction type",
  }),
  duration: z.string().optional(),
  paymentMethod: z.string().min(1, "Please select payment method"),
}).refine((data) => {
  if (data.transactionType === "borrow") {
    return data.duration && data.duration.length > 0;
  }
  return true;
}, {
  message: "Please select rental duration",
  path: ["duration"],
});

type BorrowFormData = z.infer<typeof borrowSchema>;

interface BorrowBookModalProps {
  book: BookWithOwner | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTransactionType?: "borrow" | "buy";
}

const durationOptions = [
  { value: "3", label: "3 days", days: 3 },
  { value: "7", label: "1 week", days: 7 },
  { value: "14", label: "2 weeks", days: 14 },
  { value: "30", label: "1 month", days: 30 },
];

export default function BorrowBookModal({ book, open, onOpenChange, initialTransactionType = "borrow" }: BorrowBookModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showBrocksModal, setShowBrocksModal] = useState(false);
  const [appliedBrocks, setAppliedBrocks] = useState<{
    offerType: 'rupees' | 'commission-free';
    brocksUsed: number;
    discountAmount: number;
  } | null>(null);

  // Fetch user credits
  const { data: userCredits } = useQuery({
    queryKey: ["/api/user/credits"],
  });

  // Fetch platform settings
  const { data: platformSettings } = useQuery({
    queryKey: ["/api/platform/settings"],
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
  });

  const form = useForm<BorrowFormData>({
    resolver: zodResolver(borrowSchema),
    defaultValues: {
      transactionType: initialTransactionType,
      duration: "",
      paymentMethod: "card",
    },
  });

  // Update form when initialTransactionType changes
  useEffect(() => {
    if (open) {
      form.setValue("transactionType", initialTransactionType);
      form.setValue("duration", "");
      setAppliedBrocks(null);
    }
  }, [open, initialTransactionType, form]);

  const watchedTransactionType = form.watch("transactionType");
  const watchedDuration = form.watch("duration");
  const watchedPaymentMethod = form.watch("paymentMethod");

  // Fetch Brocks conversion rates
  const { data: conversionRates } = useQuery({
    queryKey: ["/api/admin/brocks-conversion-rates"],
    enabled: watchedPaymentMethod === "brocks",
  });
  
  // Calculate cost based on transaction type
  const rentalCost = book && watchedDuration && watchedTransactionType === "borrow"
    ? calculateRentalCost(
        book.dailyFee, 
        parseInt(watchedDuration), 
        platformSettings as { commissionRate: number; securityDeposit: number } | undefined
      )
    : null;

  const buyCost = book && watchedTransactionType === "buy" && book.sellingPrice ? {
    itemPrice: book.sellingPrice,
    platformFee: (parseFloat(book.sellingPrice) * 0.05).toFixed(2),
    totalAmount: (parseFloat(book.sellingPrice) * 1.05).toFixed(2),
  } : null;

  const currentCost = watchedTransactionType === "buy" ? buyCost : rentalCost;

  // Calculate Brocks cost using admin-configured conversion rate
  const brocksCost = currentCost && conversionRates ? (
    watchedTransactionType === "buy" && buyCost ? {
      itemPrice: Math.round(parseFloat(buyCost.itemPrice) * parseFloat((conversionRates as any)?.creditsToRupeesRate || '10')),
      platformFee: Math.round(parseFloat(buyCost.platformFee) * parseFloat((conversionRates as any)?.creditsToRupeesRate || '10')),
      totalAmount: Math.round(parseFloat(buyCost.totalAmount) * parseFloat((conversionRates as any)?.creditsToRupeesRate || '10')),
    } : rentalCost ? {
      rentalFee: Math.round(rentalCost.rentalFee * parseFloat((conversionRates as any)?.creditsToRupeesRate || '10')),
      platformFee: Math.round(rentalCost.platformFee * parseFloat((conversionRates as any)?.creditsToRupeesRate || '10')),
      securityDeposit: Math.round(rentalCost.securityDeposit * parseFloat((conversionRates as any)?.creditsToRupeesRate || '10')),
      totalAmount: Math.round(rentalCost.totalAmount * parseFloat((conversionRates as any)?.creditsToRupeesRate || '10')),
    } : null
  ) : null;

  // Apply Brocks discount if available (only for borrow, not buy)
  const finalCost = currentCost && appliedBrocks && watchedTransactionType === "borrow" ? {
    ...currentCost,
    totalAmount: parseFloat(currentCost.totalAmount.toString()) - appliedBrocks.discountAmount
  } : currentCost;

  const borrowMutation = useMutation({
    mutationFn: async (data: { formData: BorrowFormData; paymentId?: string; orderId?: string }) => {
      if (!book) throw new Error("No book selected");
      
      if (data.formData.transactionType === "buy") {
        const response = await apiRequest("POST", "/api/purchases/buy", {
          bookId: book.id,
          paymentMethod: data.formData.paymentMethod,
          paymentId: data.paymentId,
          orderId: data.orderId,
        });
        return response.json();
      } else {
        const response = await apiRequest("POST", "/api/rentals/borrow", {
          bookId: book.id,
          duration: parseInt(data.formData.duration!),
          paymentMethod: data.formData.paymentMethod,
          appliedBrocks: appliedBrocks,
          paymentId: data.paymentId,
          orderId: data.orderId,
        });
        return response.json();
      }
    },
    onSuccess: (data: any, variables) => {
      if (variables.formData.transactionType === "buy") {
        const { sellerInfo } = data || {};
        
        let purchaseMessage = "The book is now yours! Check 'My Books > Bought' to see your purchase.";
        
        if (sellerInfo && sellerInfo.flatWing && sellerInfo.buildingName) {
          purchaseMessage = `Please go to ${sellerInfo.flatWing}, ${sellerInfo.buildingName} to collect your book. In case you want to call, the phone number is ${sellerInfo.phone || 'not provided'}`;
        } else {
          purchaseMessage = "The book is now yours! Please contact the seller for collection details.";
        }

        toast({
          title: "Book Purchased Successfully! 🎉",
          description: purchaseMessage,
          duration: 8000,
        });
      } else {
        const { collectionInfo } = data || {};
        
        let instructionsMessage = "Book borrowed successfully!";
        
        if (collectionInfo && collectionInfo.flatWing && collectionInfo.buildingName) {
          instructionsMessage = `Please go to ${collectionInfo.flatWing}, ${collectionInfo.buildingName} to collect the book. In case you want to call, the phone number is ${collectionInfo.phone || 'not provided'}`;
        } else {
          instructionsMessage = "Book borrowed successfully! Please contact the owner for collection details.";
        }

        toast({
          title: "Book Borrowed Successfully! 📚",
          description: instructionsMessage,
          duration: 8000,
        });
      }
      
      queryClient.invalidateQueries({ queryKey: ["/api/books"] });
      queryClient.invalidateQueries({ queryKey: ["/api/books/browse"] });
      queryClient.invalidateQueries({ queryKey: ["/api/rentals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/purchases"] });
      form.reset();
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || `Failed to ${watchedTransactionType} book`,
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (data: BorrowFormData) => {
    // If payment method is Brocks, submit directly (no Razorpay needed)
    if (data.paymentMethod === "brocks") {
      borrowMutation.mutate({ formData: data });
      return;
    }

    // For card/UPI payment, use Razorpay
    try {
      if (!finalCost) {
        throw new Error("Unable to calculate cost");
      }

      const amount = parseFloat(finalCost.totalAmount.toString()) * 100; // Convert to paise
      const description = data.transactionType === "buy" 
        ? `Purchase: ${book.title}`
        : `Rent ${book.title} for ${data.duration} days`;

      // Create Razorpay order
      const response = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          amount: amount,
          bookTitle: book.title,
          lenderName: book.owner?.name || "Book Owner"
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
        description: description,
        order_id: orderData.orderId,
        handler: async function (razorpayResponse: any) {
          console.log('💳 Razorpay payment successful:', razorpayResponse);
          
          try {
            // Make direct API call instead of using mutation
            const endpoint = data.transactionType === "buy" ? "/api/purchases/buy" : "/api/rentals/borrow";
            const payload = data.transactionType === "buy" ? {
              bookId: book.id,
              paymentMethod: data.paymentMethod,
              paymentId: razorpayResponse.razorpay_payment_id,
              orderId: razorpayResponse.razorpay_order_id,
            } : {
              bookId: book.id,
              duration: parseInt(data.duration!),
              paymentMethod: data.paymentMethod,
              appliedBrocks: appliedBrocks,
              paymentId: razorpayResponse.razorpay_payment_id,
              orderId: razorpayResponse.razorpay_order_id,
            };

            console.log('🚀 Making API call to:', endpoint);
            console.log('📦 Payload:', payload);

            const response = await apiRequest("POST", endpoint, payload);
            const result = await response.json();
            
            console.log('✅ Transaction completed successfully:', result);

            // Show success message
            if (data.transactionType === "buy") {
              const { sellerInfo } = result || {};
              let purchaseMessage = "The book is now yours! Check 'My Books > Bought' to see your purchase.";
              
              if (sellerInfo && sellerInfo.flatWing && sellerInfo.buildingName) {
                purchaseMessage = `Please go to ${sellerInfo.flatWing}, ${sellerInfo.buildingName} to collect your book. In case you want to call, the phone number is ${sellerInfo.phone || 'not provided'}`;
              }

              toast({
                title: "Book Purchased Successfully! 🎉",
                description: purchaseMessage,
                duration: 8000,
              });
            } else {
              const { collectionInfo } = result || {};
              let instructionsMessage = "Book borrowed successfully!";
              
              if (collectionInfo && collectionInfo.flatWing && collectionInfo.buildingName) {
                instructionsMessage = `Please go to ${collectionInfo.flatWing}, ${collectionInfo.buildingName} to collect the book. In case you want to call, the phone number is ${collectionInfo.phone || 'not provided'}`;
              }

              toast({
                title: "Book Borrowed Successfully! 📚",
                description: instructionsMessage,
                duration: 8000,
              });
            }
            
            // Invalidate queries
            queryClient.invalidateQueries({ queryKey: ["/api/books"] });
            queryClient.invalidateQueries({ queryKey: ["/api/books/browse"] });
            queryClient.invalidateQueries({ queryKey: ["/api/rentals"] });
            queryClient.invalidateQueries({ queryKey: ["/api/purchases"] });
            
            form.reset();
            onOpenChange(false);
            
          } catch (error) {
            console.error('❌ Error:', error);
            const errorMessage = error instanceof Error ? error.message : 
                               'Payment was successful but failed to complete the transaction. Please contact support.';
            
            toast({
              title: "Transaction Failed",
              description: errorMessage,
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
    }
  };

  if (!book) return null;

  const canBuy = book.sellingPrice && parseFloat(book.sellingPrice) > 0;
  const modalTitle = watchedTransactionType === "buy" ? "Buy Book" : "Borrow Book";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>{modalTitle}</DialogTitle>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Book Details */}
          <div className="flex items-start space-x-4">
            <div className="w-16 h-20 bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-xs text-blue-600 font-medium text-center px-1">
                {book.title.substring(0, 4)}
              </span>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-text-primary">
                {book.title}
              </h3>
              <p className="text-text-secondary">{book.author}</p>
              <p className="text-sm text-text-secondary mt-1">
                {watchedTransactionType === "buy" ? "Seller" : "Lender"}: {book.owner.name}
              </p>
              <div className="flex items-center mt-2">
                <span className="text-lg font-semibold text-primary">
                  {formatCurrency(watchedTransactionType === "buy" && book.sellingPrice ? book.sellingPrice : book.dailyFee)}
                </span>
                {watchedTransactionType === "borrow" && <span className="text-text-secondary">/day</span>}
              </div>
            </div>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Transaction Type Selection */}
              <FormField
                control={form.control}
                name="transactionType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Transaction Type</FormLabel>
                    <Select 
                      onValueChange={(value) => {
                        field.onChange(value);
                        if (value === "buy") {
                          form.setValue("duration", "");
                          setAppliedBrocks(null);
                        }
                      }} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-transaction-type">
                          <SelectValue placeholder="Select transaction type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="borrow" data-testid="option-borrow">
                          Borrow - ₹{book.dailyFee}/day
                        </SelectItem>
                        {canBuy && (
                          <SelectItem value="buy" data-testid="option-buy">
                            Buy - ₹{book.sellingPrice}
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Rental Period - Only show for borrow */}
              {watchedTransactionType === "borrow" && (
                <FormField
                  control={form.control}
                  name="duration"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rental Period</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-rental-period">
                            <SelectValue placeholder="Select rental period" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {durationOptions.map((option) => {
                            const cost = calculateRentalCost(
                              book.dailyFee, 
                              option.days,
                              platformSettings as { commissionRate: number; securityDeposit: number } | undefined
                            );
                            return (
                              <SelectItem key={option.value} value={option.value} data-testid={`option-duration-${option.value}`}>
                                {option.label} - {formatCurrency(cost.rentalFee)}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Cost Breakdown */}
              {currentCost && (
                <div className="bg-surface rounded-xl p-4">
                  <h4 className="font-medium text-text-primary mb-3">
                    Cost Breakdown {watchedPaymentMethod === 'brocks' && (
                      <span className="text-amber-600 text-sm font-normal">(in Brocks)</span>
                    )}
                  </h4>
                  <div className="space-y-2 text-sm">
                    {watchedTransactionType === "buy" && buyCost ? (
                      <>
                        <div className="flex justify-between">
                          <span className="text-text-secondary">Book price</span>
                          <span className="flex items-center">
                            {watchedPaymentMethod === 'brocks' ? (
                              <>
                                <Coins className="w-4 h-4 text-amber-600 mr-1" />
                                {(brocksCost as any)?.itemPrice}
                              </>
                            ) : (
                              formatCurrency(buyCost.itemPrice)
                            )}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-text-secondary">Platform fee (5%)</span>
                          <span className="flex items-center">
                            {watchedPaymentMethod === 'brocks' ? (
                              <>
                                <Coins className="w-4 h-4 text-amber-600 mr-1" />
                                {(brocksCost as any)?.platformFee}
                              </>
                            ) : (
                              formatCurrency(buyCost.platformFee)
                            )}
                          </span>
                        </div>
                      </>
                    ) : rentalCost && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-text-secondary">
                            Rental fee ({watchedDuration} days)
                          </span>
                          <span className="flex items-center">
                            {watchedPaymentMethod === 'brocks' ? (
                              <>
                                <Coins className="w-4 h-4 text-amber-600 mr-1" />
                                {(brocksCost as any)?.rentalFee}
                              </>
                            ) : (
                              formatCurrency(rentalCost.rentalFee)
                            )}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-text-secondary">Platform fee (5%)</span>
                          <span className="flex items-center">
                            {watchedPaymentMethod === 'brocks' ? (
                              <>
                                <Coins className="w-4 h-4 text-amber-600 mr-1" />
                                {(brocksCost as any)?.platformFee}
                              </>
                            ) : (
                              formatCurrency(rentalCost.platformFee)
                            )}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-text-secondary">Security deposit</span>
                          <span className="flex items-center">
                            {watchedPaymentMethod === 'brocks' ? (
                              <>
                                <Coins className="w-4 h-4 text-amber-600 mr-1" />
                                {(brocksCost as any)?.securityDeposit}
                              </>
                            ) : (
                              formatCurrency(rentalCost.securityDeposit)
                            )}
                          </span>
                        </div>
                      </>
                    )}
                    {appliedBrocks && watchedPaymentMethod !== 'brocks' && watchedTransactionType === "borrow" && (
                      <div className="flex justify-between text-green-600">
                        <span>Brocks Discount</span>
                        <span>-{formatCurrency(appliedBrocks.discountAmount)}</span>
                      </div>
                    )}
                    <hr className="my-2" />
                    <div className="flex justify-between font-semibold">
                      <span>Total</span>
                      <span className="flex items-center">
                        {watchedPaymentMethod === 'brocks' ? (
                          <>
                            <Coins className="w-4 h-4 text-amber-600 mr-1" />
                            {(brocksCost as any)?.totalAmount}
                          </>
                        ) : (
                          formatCurrency(finalCost ? parseFloat(finalCost.totalAmount.toString()) : parseFloat(currentCost.totalAmount.toString()))
                        )}
                      </span>
                    </div>
                    <p className="text-xs text-text-secondary mt-2">
                      {watchedTransactionType === "borrow" ? (
                        <>
                          *Security deposit will be refunded upon return
                          {watchedPaymentMethod === 'brocks' && (
                            <>
                              <br />
                              *Lender receives payment in Brocks (minus platform commission)
                            </>
                          )}
                        </>
                      ) : (
                        "*This is a one-time purchase. The book will be yours permanently."
                      )}
                    </p>
                  </div>
                </div>
              )}

              {/* Brocks Offers - Show only for borrow, when not using Brocks payment */}
              {!appliedBrocks && watchedPaymentMethod !== 'brocks' && watchedTransactionType === "borrow" && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Gift className="h-5 w-5 text-amber-600" />
                      <div>
                        <p className="font-medium text-sm">Use Brocks Credits</p>
                        <p className="text-xs text-amber-700">
                          {(userCredits as any)?.balance > 0 
                            ? `You have ${(userCredits as any).balance} Brocks • Convert to rupees or get commission-free days`
                            : 'Earn Brocks through book uploads, referrals, and transactions'
                          }
                        </p>
                      </div>
                    </div>
                    <Button 
                      type="button"
                      variant="outline" 
                      size="sm"
                      onClick={() => setShowBrocksModal(true)}
                      className="border-amber-300 text-amber-700 hover:bg-amber-100"
                    >
                      {(userCredits as any)?.balance > 0 ? 'View Offers' : 'Learn More'}
                    </Button>
                  </div>
                </div>
              )}

              {/* Applied Brocks Info - Show only for borrow, when not using Brocks payment */}
              {appliedBrocks && watchedPaymentMethod !== 'brocks' && watchedTransactionType === "borrow" && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Gift className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="font-medium text-sm">Brocks Applied</p>
                        <p className="text-xs text-green-700">
                          {appliedBrocks.offerType === 'rupees' 
                            ? `${appliedBrocks.brocksUsed} Brocks → ${formatCurrency(appliedBrocks.discountAmount)} discount`
                            : `${appliedBrocks.brocksUsed} Brocks → Commission-free days`
                          }
                        </p>
                      </div>
                    </div>
                    <Button 
                      type="button"
                      variant="outline" 
                      size="sm"
                      onClick={() => setAppliedBrocks(null)}
                      className="text-green-700 hover:bg-green-100"
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              )}

              <FormField
                control={form.control}
                name="paymentMethod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Method</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="space-y-2"
                      >
                        <div className="flex items-center space-x-3 p-3 border border-gray-300 rounded-xl">
                          <RadioGroupItem value="card" id="card" data-testid="payment-card" />
                          <CreditCard className="h-5 w-5 text-primary" />
                          <Label htmlFor="card" className="flex-1">
                            Credit/Debit Card
                          </Label>
                        </div>
                        <div className="flex items-center space-x-3 p-3 border border-gray-300 rounded-xl">
                          <RadioGroupItem value="upi" id="upi" data-testid="payment-upi" />
                          <Smartphone className="h-5 w-5 text-primary" />
                          <Label htmlFor="upi" className="flex-1">
                            UPI
                          </Label>
                        </div>
                        <div className={`flex items-center space-x-3 p-3 border rounded-xl ${
                          ((userCredits as any)?.balance || 0) >= ((brocksCost as any)?.totalAmount || 0)
                            ? 'border-amber-300 bg-amber-50' 
                            : 'border-gray-300 bg-gray-50 opacity-50'
                        }`}>
                          <RadioGroupItem 
                            value="brocks" 
                            id="brocks" 
                            data-testid="payment-brocks"
                            disabled={((userCredits as any)?.balance || 0) < ((brocksCost as any)?.totalAmount || 0)}
                          />
                          <Coins className="h-5 w-5 text-amber-600" />
                          <Label htmlFor="brocks" className="flex-1">
                            <div>
                              <span>Pay with Brocks</span>
                              <div className="text-xs text-gray-600">
                                Balance: {(userCredits as any)?.balance || 0} Brocks
                                {((userCredits as any)?.balance || 0) < ((brocksCost as any)?.totalAmount || 0) && (
                                  <span className="text-red-600 ml-1">(Insufficient)</span>
                                )}
                              </div>
                            </div>
                          </Label>
                        </div>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button 
                type="submit" 
                className="w-full"
                data-testid="button-proceed-payment"
                disabled={borrowMutation.isPending || !currentCost || (watchedPaymentMethod === 'brocks' && ((userCredits as any)?.balance || 0) < ((brocksCost as any)?.totalAmount || 0))}
              >
                {borrowMutation.isPending ? "Processing..." : 
                  watchedPaymentMethod === 'brocks' 
                    ? `Pay with Brocks ${brocksCost ? `- ${(brocksCost as any).totalAmount} Brocks` : ""}`
                    : `Proceed to Payment ${finalCost ? `- ${formatCurrency(typeof finalCost.totalAmount === 'number' ? finalCost.totalAmount : parseFloat(finalCost.totalAmount))}` : ""}`
                }
              </Button>
            </form>
          </Form>
        </div>
      </DialogContent>

      {/* Brocks Offers Modal */}
      <BrocksOffersModal
        isOpen={showBrocksModal}
        onClose={() => setShowBrocksModal(false)}
        currentAmount={rentalCost ? rentalCost.totalAmount : 0}
        onApplyOffer={(offerType, brocksUsed, discountAmount) => {
          setAppliedBrocks({
            offerType,
            brocksUsed,
            discountAmount
          });
          setShowBrocksModal(false);
          toast({
            title: "Brocks Applied!",
            description: `${brocksUsed} Brocks ${offerType === 'rupees' ? `converted to ${formatCurrency(discountAmount)} discount` : 'converted to commission-free days'}`,
          });
        }}
      />
    </Dialog>
  );
}
