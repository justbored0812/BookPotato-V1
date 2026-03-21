import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Coins, Check, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface Package {
  id: number | string;
  name: string;
  brocks: number;
  bonus: number;
  price: string;
  popular: boolean;
  isActive: boolean;
}

export default function BuyBrocks() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedPackage, setSelectedPackage] = useState<number | string | null>(null);
  const [loading, setLoading] = useState(false);

  const { data: userCredits } = useQuery<any>({
    queryKey: ["/api/user/credits"],
  });

  const { data: packages = [], isLoading } = useQuery<Package[]>({
    queryKey: ["/api/brocks-packages"],
  });

  const selectedPkg = packages.find((p) => p.id === selectedPackage);

  const handleBuyNow = async () => {
    console.log("🔥🔥🔥 BUY NOW CLICKED!");
    console.log("Selected package:", selectedPackage);
    console.log("Selected pkg object:", selectedPkg);

    if (!selectedPkg) {
      toast({
        title: "Please select a package",
        description: "Choose a Brocks package to continue",
        variant: "destructive",
      });
      return;
    }

    if (!window.Razorpay) {
      console.error("❌ Razorpay not loaded!");
      toast({
        title: "Payment Error",
        description: "Payment system not loaded. Please refresh the page.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    console.log("⏳ Starting payment process...");

    try {
      const amountInPaise = Math.round(parseFloat(selectedPkg.price) * 100);
      console.log("💰 Amount:", amountInPaise, "paise");

      console.log("📡 Creating order...");
      const orderRes = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          amount: amountInPaise,
          bookTitle: `${selectedPkg.name} - ${selectedPkg.brocks + selectedPkg.bonus} Brocks`,
          lenderName: "BookPotato Platform",
        }),
      });

      if (!orderRes.ok) {
        const error = await orderRes.json();
        throw new Error(error.message || "Failed to create order");
      }

      const orderData = await orderRes.json();
      console.log("✅ Order created:", orderData);

      const razorpayKey = import.meta.env.VITE_RAZORPAY_KEY_ID;
      console.log("🔑 Razorpay key exists:", !!razorpayKey);

      const options = {
        key: razorpayKey,
        amount: orderData.amount,
        currency: "INR",
        name: "BookPotato",
        description: `${selectedPkg.name} - ${selectedPkg.brocks + selectedPkg.bonus} Brocks`,
        order_id: orderData.orderId,
        handler: async function (response: any) {
          console.log("✅ Payment successful!", response);

          try {
            const purchaseRes = await fetch("/api/brocks/purchase", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({
                packageId: String(selectedPkg.id),
                paymentId: response.razorpay_payment_id,
                orderId: response.razorpay_order_id,
                paymentMethod: "razorpay",
              }),
            });

            if (!purchaseRes.ok) {
              throw new Error("Failed to complete purchase");
            }

            const result = await purchaseRes.json();
            console.log("✅ Purchase completed:", result);

            toast({
              title: "Success!",
              description: `${result.brocksAwarded} Brocks added to your account!`,
            });

            queryClient.invalidateQueries({ queryKey: ["/api/user/credits"] });
            setSelectedPackage(null);
            setLoading(false);
          } catch (error) {
            console.error("❌ Purchase error:", error);
            toast({
              title: "Purchase Failed",
              description: error instanceof Error ? error.message : "Something went wrong",
              variant: "destructive",
            });
            setLoading(false);
          }
        },
        prefill: {
          name: "User",
          email: "user@example.com",
        },
        theme: {
          color: "#0EA5E9",
        },
        modal: {
          ondismiss: function () {
            console.log("❌ Payment cancelled");
            setLoading(false);
            toast({
              title: "Payment Cancelled",
              description: "You closed the payment window",
            });
          },
        },
      };

      console.log("🚀 Opening Razorpay...");
      const rzp = new window.Razorpay(options);
      rzp.open();
      console.log("✅ Razorpay opened!");
    } catch (error) {
      console.error("❌ Error:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="flex items-center justify-center gap-3">
            <Coins className="h-10 w-10 text-amber-500" />
            <h1 className="text-4xl font-bold">Buy Brocks Credits</h1>
          </div>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Get Brocks credits for commission-free rentals and instant discounts
          </p>
        </div>

        {/* Current Balance */}
        <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Your Balance</p>
                <div className="flex items-center gap-2">
                  <Coins className="h-6 w-6 text-amber-600" />
                  <span className="text-3xl font-bold text-amber-600">
                    {userCredits?.balance || 0}
                  </span>
                  <span className="text-lg text-muted-foreground">Brocks</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Total Earned</p>
                <p className="text-2xl font-semibold">{userCredits?.totalEarned || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Packages */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Choose Your Package</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {packages.map((pkg) => (
              <Card
                key={pkg.id}
                onClick={() => {
                  console.log("🎯 Package clicked:", pkg.id, pkg.name);
                  setSelectedPackage(pkg.id);
                }}
                className={`cursor-pointer transition-all relative ${
                  selectedPackage === pkg.id
                    ? "ring-2 ring-primary shadow-lg scale-105"
                    : "hover:shadow-md"
                } ${pkg.popular ? "border-amber-400 border-2" : ""}`}
                data-testid={`package-${pkg.id}`}
              >
                {pkg.popular && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-500 text-white">
                    Most Popular
                  </Badge>
                )}
                <CardHeader className="pb-3">
                  <CardTitle className="text-center text-xl">{pkg.name}</CardTitle>
                </CardHeader>
                <CardContent className="text-center space-y-4">
                  <div>
                    <div className="text-4xl font-bold text-amber-600">
                      {pkg.brocks + pkg.bonus}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {pkg.brocks} + {pkg.bonus} bonus
                    </div>
                  </div>
                  <div className="text-3xl font-bold">₹{parseFloat(pkg.price)}</div>
                  <div className="text-xs text-muted-foreground">
                    ₹{(parseFloat(pkg.price) / (pkg.brocks + pkg.bonus)).toFixed(2)} per Brock
                  </div>
                  {selectedPackage === pkg.id && (
                    <div className="flex justify-center pt-2">
                      <div className="bg-primary text-white rounded-full p-2">
                        <Check className="h-5 w-5" />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Purchase Button */}
        {selectedPkg && (
          <Card className="border-2 border-primary">
            <CardHeader>
              <CardTitle>Complete Your Purchase</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Package:</span>
                  <span className="font-semibold">{selectedPkg.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Base Brocks:</span>
                  <span>{selectedPkg.brocks}</span>
                </div>
                <div className="flex justify-between text-sm text-green-600">
                  <span>Bonus Brocks:</span>
                  <span>+{selectedPkg.bonus}</span>
                </div>
                <div className="border-t pt-2 mt-2 flex justify-between font-bold">
                  <span>Total Brocks:</span>
                  <span className="text-amber-600">{selectedPkg.brocks + selectedPkg.bonus}</span>
                </div>
                <div className="border-t pt-2 flex justify-between text-lg font-bold">
                  <span>Amount to Pay:</span>
                  <span className="text-primary">₹{parseFloat(selectedPkg.price)}</span>
                </div>
              </div>

              <Button
                onClick={handleBuyNow}
                disabled={loading}
                size="lg"
                className="w-full text-lg"
                data-testid="button-complete-purchase"
              >
                {loading ? (
                  "Processing..."
                ) : (
                  <>
                    <CreditCard className="mr-2 h-5 w-5" />
                    Complete Purchase - ₹{parseFloat(selectedPkg.price)}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Benefits */}
        <Card>
          <CardHeader>
            <CardTitle>Why Buy Brocks?</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold mb-2">💰 Commission-Free Rentals</h3>
                <p className="text-sm text-muted-foreground">
                  Use Brocks to get commission-free days on all your transactions
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">🎁 Instant Discounts</h3>
                <p className="text-sm text-muted-foreground">
                  Convert Brocks to rupees for instant discounts on payments
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">⏰ No Expiry</h3>
                <p className="text-sm text-muted-foreground">
                  Your Brocks never expire - use them anytime
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">🎯 Earn More</h3>
                <p className="text-sm text-muted-foreground">
                  Get bonus Brocks through referrals and book uploads
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
