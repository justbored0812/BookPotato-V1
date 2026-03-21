import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Share2, Users, MessageCircle, Copy, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

export default function QuickShareWidget() {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const { data: currentUser } = useQuery({
    queryKey: ["/api/auth/me"],
  });

  const userCode = (currentUser as any)?.user?.userNumber || (currentUser as any)?.userNumber;
  const shareText = `Join BookPotato and share books with your community! 📚\n\nUse my referral code: ${userCode}\nSign up at: https://bookpotato.in\n\nStart sharing and reading books today!`;

  const copyInviteLink = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: "Invite Link Copied!",
        description: "Your referral code and link have been copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Please copy the link manually",
        variant: "destructive",
      });
    }
  };

  const shareViaWhatsApp = () => {
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
    window.open(whatsappUrl, '_blank');
  };

  const shareViaSocial = () => {
    if (navigator.share) {
      navigator.share({
        title: "BookPotato - Community Library",
        text: shareText,
        url: "https://bookpotato.in",
      });
    } else {
      copyInviteLink();
    }
  };

  return (
    <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center space-x-2 text-green-700">
          <Share2 className="w-5 h-5" />
          <span>Invite Friends</span>
          <Sparkles className="w-4 h-4 text-amber-500" />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-green-600">
          Share BookShare with your neighbors and friends! Build a stronger community library together.
        </p>
        
        <div className="flex space-x-2">
          <Button
            onClick={shareViaWhatsApp}
            size="sm"
            className="flex-1 bg-green-600 hover:bg-green-700 text-white"
          >
            <MessageCircle className="w-4 h-4 mr-1" />
            WhatsApp
          </Button>
          
          <Button
            onClick={copyInviteLink}
            size="sm"
            variant="outline"
            className="flex-1 border-green-300 text-green-700 hover:bg-green-50"
          >
            {copied ? (
              <>
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="w-4 h-4 mr-1 text-green-600"
                >
                  ✓
                </motion.div>
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 mr-1" />
                Copy Link
              </>
            )}
          </Button>
        </div>
        
        <div className="flex items-center justify-center space-x-1 text-xs text-green-600">
          <Users className="w-3 h-3" />
          <span>Help grow our book-sharing community</span>
        </div>
      </CardContent>
    </Card>
  );
}