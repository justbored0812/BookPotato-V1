import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { X, Camera, Loader2, AlertCircle } from "lucide-react";
import { BrowserMultiFormatReader, NotFoundException } from '@zxing/library';

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  onClose: () => void;
  isOpen: boolean;
}

export default function BarcodeScanner({ onScan, onClose, isOpen }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [codeReader, setCodeReader] = useState<BrowserMultiFormatReader | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);

  const stopCamera = useCallback(() => {
    console.log("Stopping camera...");
    
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
    }
    
    if (stream) {
      stream.getTracks().forEach(track => {
        track.stop();
        console.log("Camera track stopped");
      });
      setStream(null);
    }
    
    if (codeReader) {
      try {
        codeReader.reset();
        console.log("Scanner reset");
      } catch (e) {
        console.log("Scanner reset error:", e);
      }
      setCodeReader(null);
    }
    
    setIsScanning(false);
    setIsInitializing(false);
  }, [stream, codeReader]);

  const startCamera = useCallback(async () => {
    try {
      setError(null);
      setIsInitializing(true);
      
      console.log("Requesting camera access...");
      
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: "environment",
          width: { ideal: 640 },
          height: { ideal: 480 }
        }
      });
      
      console.log("Camera access granted");
      setStream(mediaStream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        
        // Wait for video to load before starting scanner
        videoRef.current.onloadedmetadata = () => {
          setIsInitializing(false);
          setIsScanning(true);
          
          const reader = new BrowserMultiFormatReader();
          setCodeReader(reader);
          
          console.log("Starting barcode scanning...");
          
          // Start continuous scanning with proper error handling
          try {
            reader.decodeFromVideoDevice(null, videoRef.current!, (result, error) => {
              if (result) {
                const scannedText = result.getText();
                console.log('Barcode scanned:', scannedText);
                onScan(scannedText);
                return;
              }
              // Don't log NotFoundException as it's normal when no barcode is detected
              if (error && !(error instanceof NotFoundException)) {
                console.error('Scan error:', error);
              }
            });
          } catch (scanError) {
            console.error('Scanner initialization error:', scanError);
            setError("Failed to initialize barcode scanner. Please try again.");
            setIsScanning(false);
          }
        };
        
        videoRef.current.onerror = () => {
          setError("Video stream error. Please try again.");
          setIsInitializing(false);
          setIsScanning(false);
        };
      }
    } catch (err: any) {
      console.error("Error accessing camera:", err);
      setIsInitializing(false);
      setIsScanning(false);
      
      if (err.name === 'NotAllowedError') {
        setError("Camera access denied. Please allow camera permissions and try again.");
      } else if (err.name === 'NotFoundError') {
        setError("No camera found. Please ensure your device has a camera.");
      } else if (err.name === 'NotReadableError') {
        setError("Camera is being used by another application. Please close other camera apps and try again.");
      } else {
        setError("Could not access camera. Please check permissions and try again.");
      }
    }
  }, [onScan, onClose]);

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, startCamera, stopCamera]);

  const handleManualInput = () => {
    const barcode = prompt("Enter ISBN or barcode manually:");
    if (barcode && barcode.trim()) {
      onScan(barcode.trim());
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md" aria-describedby="barcode-scanner-description">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span className="flex items-center space-x-2">
              <Camera className="w-5 h-5" />
              <span>Scan Book Barcode</span>
            </span>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4" id="barcode-scanner-description">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-red-600" />
                <p className="text-red-800 text-sm">{error}</p>
              </div>
              <Button 
                onClick={startCamera} 
                variant="outline" 
                size="sm" 
                className="mt-2"
              >
                Try Again
              </Button>
            </div>
          )}

          <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
              style={{ transform: 'scaleX(-1)' }}
            />
            
            {isScanning && !error && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="border-2 border-green-400 rounded-lg w-48 h-24 opacity-90">
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-44 h-0.5 bg-red-500 animate-pulse"></div>
                </div>
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-75 rounded px-3 py-2">
                  <p className="text-white text-sm font-medium">Position barcode in frame</p>
                </div>
              </div>
            )}
            
            {isInitializing && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-white text-center">
                  <Loader2 className="w-12 h-12 mx-auto mb-2 opacity-75 animate-spin" />
                  <p className="text-sm opacity-75">Starting camera...</p>
                </div>
              </div>
            )}

            {!isScanning && !isInitializing && !error && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-white text-center">
                  <Camera className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm opacity-75">Tap to start scanning</p>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Button onClick={handleManualInput} variant="outline" className="w-full">
              Enter ISBN/Barcode Manually
            </Button>
            <Button onClick={onClose} variant="secondary" className="w-full">
              Cancel
            </Button>
          </div>

          <div className="text-xs text-gray-500 text-center space-y-1">
            <p>Position the book's barcode within the green frame</p>
            <p>Make sure there's good lighting and the barcode is clear</p>
            <p>Works with ISBN-13, ISBN-10, and UPC codes</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}