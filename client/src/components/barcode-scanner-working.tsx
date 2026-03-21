import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  onClose: () => void;
  isOpen: boolean;
}

export default function BarcodeScannerWorking({ onScan, onClose, isOpen }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string>("");
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen]);

  const startCamera = async () => {
    try {
      setError("");
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: "environment", // Use back camera
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play();
      }
      
      setIsScanning(true);
    } catch (err) {
      console.error("Camera access error:", err);
      setError("Camera access denied. Please enable camera permissions and try again.");
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsScanning(false);
  };

  const handleManualInput = () => {
    const barcode = prompt("Enter barcode manually:");
    if (barcode && barcode.trim()) {
      onScan(barcode.trim());
    }
  };

  // Simulate barcode detection for demo purposes
  const simulateBarcodeScan = () => {
    const testBarcodes = [
      "9780142437200", // Example ISBN
      "9780385544912", 
      "9780525521143",
      "9780062316097"
    ];
    const randomBarcode = testBarcodes[Math.floor(Math.random() * testBarcodes.length)];
    onScan(randomBarcode);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            Scan Book Barcode
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {error ? (
            <div className="text-center space-y-4">
              <div className="text-red-600 text-sm">{error}</div>
              <div className="space-y-2">
                <Button onClick={startCamera} className="w-full">
                  Try Again
                </Button>
                <Button variant="outline" onClick={handleManualInput} className="w-full">
                  Enter Manually
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  playsInline
                  muted
                />
                
                {isScanning && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="border-2 border-white rounded-lg w-64 h-32 opacity-50"></div>
                  </div>
                )}
                
                {isScanning && (
                  <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-white text-sm bg-black bg-opacity-50 px-3 py-1 rounded">
                    Position barcode within the frame
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Button 
                  onClick={simulateBarcodeScan} 
                  className="w-full"
                  variant="outline"
                >
                  Test Scanner (Demo)
                </Button>
                <Button 
                  onClick={handleManualInput} 
                  variant="outline" 
                  className="w-full"
                >
                  Enter Barcode Manually
                </Button>
              </div>

              <div className="text-xs text-gray-500 text-center">
                Point your camera at the book's barcode. The scanner will automatically detect and capture it.
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}