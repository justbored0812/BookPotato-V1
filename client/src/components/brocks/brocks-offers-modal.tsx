import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Coins, Gift, Zap } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";

interface BrocksOffersModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentAmount: number;
  onApplyOffer: (offerType: 'rupees' | 'commission-free', brocksUsed: number, discountAmount: number) => void;
}

export function BrocksOffersModal({ 
  isOpen, 
  onClose, 
  currentAmount,
  onApplyOffer 
}: BrocksOffersModalProps) {
  const [selectedOffer, setSelectedOffer] = useState<'rupees' | 'commission-free' | null>(null);
  const [customBrocksAmount, setCustomBrocksAmount] = useState<number>(0);

  const { data: userCredits } = useQuery({
    queryKey: ["/api/user/credits"],
  });

  const { data: brocksSettings } = useQuery({
    queryKey: ["/api/admin/brocks-conversion-rates"],
  });

  const userBalance = userCredits?.balance || 0;
  const rupeesConversionRate = parseInt(brocksSettings?.creditsToRupeesRate || '20');
  const commissionFreeConversionRate = parseInt(brocksSettings?.creditsToCommissionFreeRate || '20');

  // Calculate available conversions based on user input or maximum
  const maxRupeesFromBrocks = Math.floor(userBalance / rupeesConversionRate);
  const maxCommissionFreeDays = Math.floor(userBalance / commissionFreeConversionRate);
  
  // Use custom amount if set, otherwise use maximum available
  const brocksToUse = customBrocksAmount > 0 ? Math.min(customBrocksAmount, userBalance) : userBalance;
  
  // Calculate conversions based on selected amount
  const rupeesFromSelectedBrocks = Math.floor(brocksToUse / rupeesConversionRate);
  const rupeesDiscount = Math.min(rupeesFromSelectedBrocks, currentAmount);
  const brocksForRupeesDiscount = rupeesDiscount * rupeesConversionRate;
  
  const commissionFreeDaysFromSelected = Math.floor(brocksToUse / commissionFreeConversionRate);
  const brocksForCommissionFree = commissionFreeDaysFromSelected * commissionFreeConversionRate;

  const handleApplyOffer = () => {
    if (!selectedOffer) return;

    if (selectedOffer === 'rupees' && rupeesDiscount > 0) {
      onApplyOffer('rupees', brocksForRupeesDiscount, rupeesDiscount);
    } else if (selectedOffer === 'commission-free' && commissionFreeDaysFromSelected > 0) {
      onApplyOffer('commission-free', brocksForCommissionFree, 0);
    }
    
    onClose();
  };

  const resetSelection = () => {
    setSelectedOffer(null);
    setCustomBrocksAmount(0);
  };

  // Set default custom amount when offer is selected
  useEffect(() => {
    if (selectedOffer === 'rupees') {
      setCustomBrocksAmount(Math.min(userBalance, rupeesConversionRate));
    } else if (selectedOffer === 'commission-free') {
      setCustomBrocksAmount(Math.min(userBalance, commissionFreeConversionRate));
    }
  }, [selectedOffer, userBalance, rupeesConversionRate, commissionFreeConversionRate]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5 text-amber-600" />
            Use Your Brocks Credits
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current Balance */}
          <Card className="bg-amber-50 border-amber-200">
            <CardContent className="pt-4">
              <div className="flex items-center justify-center gap-2">
                <Coins className="h-5 w-5 text-amber-600" />
                <span className="text-lg font-semibold text-amber-600">
                  {userBalance} Brocks Available
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Payment Amount */}
          <div className="text-center text-sm text-muted-foreground">
            Current Payment: ₹{currentAmount}
          </div>

          {/* Offer Options */}
          <div className="space-y-3">
            {/* Rupees Conversion Option */}
            {maxRupeesFromBrocks > 0 && (
              <Card 
                className={`cursor-pointer transition-all ${
                  selectedOffer === 'rupees' 
                    ? 'ring-2 ring-primary bg-primary/5' 
                    : 'hover:shadow-md'
                }`}
                onClick={() => setSelectedOffer('rupees')}
              >
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Gift className="h-5 w-5 text-green-600" />
                      <div>
                        <div className="font-medium">Convert to Rupees</div>
                        <div className="text-sm text-muted-foreground">
                          Up to ₹{maxRupeesFromBrocks} available
                        </div>
                      </div>
                    </div>
                    {selectedOffer === 'rupees' && (
                      <Badge variant="default" className="bg-green-600">
                        Selected
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Commission-Free Days Option */}
            {maxCommissionFreeDays > 0 && (
              <Card 
                className={`cursor-pointer transition-all ${
                  selectedOffer === 'commission-free' 
                    ? 'ring-2 ring-primary bg-primary/5' 
                    : 'hover:shadow-md'
                }`}
                onClick={() => setSelectedOffer('commission-free')}
              >
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Zap className="h-5 w-5 text-blue-600" />
                      <div>
                        <div className="font-medium">Commission-Free Days</div>
                        <div className="text-sm text-muted-foreground">
                          Up to {maxCommissionFreeDays} days available
                        </div>
                      </div>
                    </div>
                    {selectedOffer === 'commission-free' && (
                      <Badge variant="default" className="bg-blue-600">
                        Selected
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Custom Amount Input */}
            {selectedOffer && (
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="pt-4">
                  <div className="space-y-3">
                    <Label htmlFor="brocks-amount" className="text-sm font-medium">
                      How many Brocks do you want to use? (Maximum: {userBalance})
                    </Label>
                    <Input
                      id="brocks-amount"
                      type="number"
                      min="0"
                      max={userBalance}
                      value={customBrocksAmount}
                      onChange={(e) => setCustomBrocksAmount(Math.min(parseInt(e.target.value) || 0, userBalance))}
                      placeholder="Enter amount..."
                      className="w-full"
                    />
                    {selectedOffer === 'rupees' && customBrocksAmount > 0 && (
                      <div className="text-sm text-muted-foreground">
                        {customBrocksAmount} Brocks = ₹{Math.floor(customBrocksAmount / rupeesConversionRate)} discount
                      </div>
                    )}
                    {selectedOffer === 'commission-free' && customBrocksAmount > 0 && (
                      <div className="text-sm text-muted-foreground">
                        {customBrocksAmount} Brocks = {Math.floor(customBrocksAmount / commissionFreeConversionRate)} commission-free days
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* No Offers Available */}
          {maxRupeesFromBrocks === 0 && maxCommissionFreeDays === 0 && (
            <Card className="bg-muted/50">
              <CardContent className="pt-4">
                <div className="text-center space-y-3">
                  <div className="text-muted-foreground">
                    {userBalance === 0 ? (
                      <>
                        <p className="font-medium">Start earning Brocks credits!</p>
                        <p className="text-sm">You can earn Brocks by:</p>
                        <ul className="text-sm space-y-1 mt-2">
                          <li>• Uploading books (1 credit per book)</li>
                          <li>• Referring friends (5 credits per referral)</li>
                          <li>• Borrowing books (5 credits per transaction)</li>
                          <li>• Lending books (5 credits per transaction)</li>
                        </ul>
                      </>
                    ) : (
                      `You need at least ${rupeesConversionRate} Brocks to use conversion options.`
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4">
            <Button 
              variant="outline" 
              onClick={resetSelection}
              className="flex-1"
            >
              Reset
            </Button>
            <Button 
              onClick={handleApplyOffer}
              disabled={!selectedOffer || customBrocksAmount <= 0}
              className="flex-1"
            >
              Apply Offer
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}