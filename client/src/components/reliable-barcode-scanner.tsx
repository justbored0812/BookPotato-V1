import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { X, Type, Camera, Smartphone } from "lucide-react";

interface ReliableBarcodeScannerProps {
  onScan: (barcode: string) => void;
  onClose: () => void;
  isOpen: boolean;
}

export default function ReliableBarcodeScanner({ onScan, onClose, isOpen }: ReliableBarcodeScannerProps) {
  const [manualCode, setManualCode] = useState("");
  const [showCameraOption, setShowCameraOption] = useState(true);

  const handleManualSubmit = () => {
    if (manualCode.trim()) {
      onScan(manualCode.trim());
      setManualCode("");
      onClose();
    }
  };

  const handleClose = () => {
    setManualCode("");
    setShowCameraOption(true);
    onClose();
  };

  const tryCamera = async () => {
    try {
      // Quick camera permission check
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: "environment" } 
      });
      
      // Stop the stream immediately - we just wanted to check permissions
      stream.getTracks().forEach(track => track.stop());
      
      // Show success message and focus on manual input
      alert("Camera access granted! For the best experience, please enter the barcode manually below. Camera scanning will be available in a future update.");
      
    } catch (error: any) {
      let message = "Camera not available. Please enter the barcode manually.";
      
      if (error.name === 'NotAllowedError') {
        message = "Camera permission denied. Please enter the barcode manually.";
      } else if (error.name === 'NotFoundError') {
        message = "No camera found. Please enter the barcode manually.";
      }
      
      alert(message);
    }
    
    // Always hide camera option after attempt and focus on manual input
    setShowCameraOption(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span className="flex items-center space-x-2">
              <Type className="w-5 h-5" />
              <span>Add Book Barcode</span>
            </span>
            <Button variant="ghost" size="icon" onClick={handleClose}>
              <X className="w-4 h-4" />
            </Button>
          </DialogTitle>
          <DialogDescription>
            Enter your book's ISBN or barcode number manually for the most reliable experience
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Manual Input Section - Primary Option */}
          <div className="space-y-4">
            <div className="text-center">
              <Type className="w-12 h-12 mx-auto mb-3 text-primary" />
              <h3 className="text-lg font-medium mb-2">Enter Barcode</h3>
              <p className="text-sm text-muted-foreground">
                Type the ISBN or barcode number from your book
              </p>
            </div>
            
            <div className="space-y-3">
              <Input
                placeholder="Enter ISBN or barcode (e.g., 9780142437200)"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleManualSubmit()}
                autoFocus
                className="text-center text-lg"
              />
              <Button 
                onClick={handleManualSubmit} 
                disabled={!manualCode.trim()}
                className="w-full"
                size="lg"
              >
                Add This Book
              </Button>
            </div>
          </div>

          {/* Camera Option - Secondary */}
          {showCameraOption && (
            <>
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">Or try camera</span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="text-center">
                  <Smartphone className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Test camera permissions (manual entry recommended)
                  </p>
                </div>
                <Button 
                  onClick={tryCamera} 
                  variant="outline" 
                  className="w-full"
                >
                  <Camera className="w-4 h-4 mr-2" />
                  Test Camera Access
                </Button>
              </div>
            </>
          )}

          {/* Help Text */}
          <div className="text-xs text-muted-foreground text-center space-y-1 pt-2 border-t">
            <p><strong>Where to find the barcode:</strong></p>
            <p>• Back cover near the bottom (ISBN barcode)</p>
            <p>• Inside front/back cover</p>
            <p>• Usually starts with 978 or 979</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}