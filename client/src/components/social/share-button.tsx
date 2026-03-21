import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Share2, Copy, MessageCircle, Facebook, Twitter, Mail, Link2, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ShareButtonProps {
  bookId: number;
  bookTitle: string;
  bookAuthor: string;
  dailyFee: string;
  size?: "sm" | "default" | "lg";
  variant?: "default" | "outline" | "ghost";
  showText?: boolean;
  className?: string;
}

export default function ShareButton({ 
  bookId, 
  bookTitle, 
  bookAuthor, 
  dailyFee,
  size = "default",
  variant = "outline",
  showText = true,
  className = ""
}: ShareButtonProps) {
  const [showModal, setShowModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const shareUrl = `${window.location.origin}/book/${bookId}`;
  const shareText = `Check out "${bookTitle}" by ${bookAuthor} on BookShare! Available for ₹${dailyFee}/day. Join our community library and start sharing books today!`;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(`${shareText}\n\n${shareUrl}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: "Link Copied!",
        description: "Book link copied to clipboard",
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
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`${shareText}\n\n${shareUrl}`)}`;
    window.open(whatsappUrl, '_blank');
  };

  const shareViaFacebook = () => {
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(shareText)}`;
    window.open(facebookUrl, '_blank');
  };

  const shareViaTwitter = () => {
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
    window.open(twitterUrl, '_blank');
  };

  const shareViaEmail = () => {
    const emailUrl = `mailto:?subject=${encodeURIComponent(`Book Recommendation: ${bookTitle}`)}&body=${encodeURIComponent(`${shareText}\n\n${shareUrl}`)}`;
    window.open(emailUrl);
  };

  const shareViaWebShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `BookShare: ${bookTitle}`,
          text: shareText,
          url: shareUrl,
        });
      } catch (error) {
        // User cancelled share or error occurred
        setShowModal(true);
      }
    } else {
      setShowModal(true);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant={variant} 
            size={size}
            className={`${className} hover:bg-blue-50 border-blue-200 text-blue-600`}
          >
            <Share2 className={`${size === "sm" ? "w-3 h-3" : "w-4 h-4"} ${showText ? "mr-1" : ""}`} />
            {showText && "Share"}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="font-medium text-center">
            Share "{bookTitle}"
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          <DropdownMenuItem onClick={shareViaWhatsApp} className="cursor-pointer">
            <MessageCircle className="w-4 h-4 mr-3 text-green-600" />
            <span>WhatsApp</span>
          </DropdownMenuItem>
          
          <DropdownMenuItem onClick={shareViaFacebook} className="cursor-pointer">
            <Facebook className="w-4 h-4 mr-3 text-blue-600" />
            <span>Facebook</span>
          </DropdownMenuItem>
          
          <DropdownMenuItem onClick={shareViaTwitter} className="cursor-pointer">
            <Twitter className="w-4 h-4 mr-3 text-sky-500" />
            <span>Twitter</span>
          </DropdownMenuItem>
          
          <DropdownMenuItem onClick={shareViaEmail} className="cursor-pointer">
            <Mail className="w-4 h-4 mr-3 text-gray-600" />
            <span>Email</span>
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem onClick={copyToClipboard} className="cursor-pointer">
            {copied ? (
              <Check className="w-4 h-4 mr-3 text-green-600" />
            ) : (
              <Copy className="w-4 h-4 mr-3 text-gray-600" />
            )}
            <span>{copied ? "Copied!" : "Copy Link"}</span>
          </DropdownMenuItem>
          
          <DropdownMenuItem onClick={() => setShowModal(true)} className="cursor-pointer">
            <Link2 className="w-4 h-4 mr-3 text-gray-600" />
            <span>More Options</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Advanced Share Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Share2 className="w-5 h-5 text-blue-600" />
              <span>Share Book</span>
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Book Preview */}
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg border">
              <h3 className="font-semibold text-gray-900 truncate">{bookTitle}</h3>
              <p className="text-sm text-gray-600">by {bookAuthor}</p>
              <Badge variant="outline" className="mt-2">
                ₹{dailyFee}/day
              </Badge>
            </div>
            
            {/* Share Text Preview */}
            <div>
              <label className="text-sm font-medium text-gray-700">Share Message:</label>
              <div className="mt-1 p-3 bg-gray-50 rounded-lg border text-sm text-gray-600">
                {shareText}
              </div>
            </div>
            
            {/* Copy Link */}
            <div>
              <label className="text-sm font-medium text-gray-700">Book Link:</label>
              <div className="mt-1 flex space-x-2">
                <input
                  type="text"
                  value={shareUrl}
                  readOnly
                  className="flex-1 p-2 bg-gray-50 border rounded text-sm"
                />
                <Button onClick={copyToClipboard} size="sm">
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>
            
            {/* Quick Share Buttons */}
            <div className="grid grid-cols-2 gap-2">
              <Button onClick={shareViaWhatsApp} variant="outline" className="flex items-center justify-center space-x-2">
                <MessageCircle className="w-4 h-4 text-green-600" />
                <span>WhatsApp</span>
              </Button>
              <Button onClick={shareViaFacebook} variant="outline" className="flex items-center justify-center space-x-2">
                <Facebook className="w-4 h-4 text-blue-600" />
                <span>Facebook</span>
              </Button>
              <Button onClick={shareViaTwitter} variant="outline" className="flex items-center justify-center space-x-2">
                <Twitter className="w-4 h-4 text-sky-500" />
                <span>Twitter</span>
              </Button>
              <Button onClick={shareViaEmail} variant="outline" className="flex items-center justify-center space-x-2">
                <Mail className="w-4 h-4 text-gray-600" />
                <span>Email</span>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}