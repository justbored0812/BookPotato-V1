import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { X, Camera, Loader2, AlertCircle, Type } from "lucide-react";
import { BrowserMultiFormatReader, NotFoundException } from '@zxing/library';

interface CameraFirstBarcodeScannerProps {
  onScan: (barcode: string) => void;
  onClose: () => void;
  isOpen: boolean;
}

export default function CameraFirstBarcodeScanner({ onScan, onClose, isOpen }: CameraFirstBarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualCode, setManualCode] = useState("");

  const stopCamera = useCallback(() => {
    // Stop the video stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
      });
      streamRef.current = null;
    }
    
    // Clear video element
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    // Reset barcode reader
    if (readerRef.current) {
      try {
        readerRef.current.reset();
      } catch (e) {
        // Ignore reset errors
      }
      readerRef.current = null;
    }
    
    setIsScanning(false);
    setIsInitializing(false);
  }, []);

  const startCamera = useCallback(async () => {
    try {
      setError(null);
      setIsInitializing(true);
      
      // Request camera access with explicit constraints
      const constraints = {
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1920, min: 640 },
          height: { ideal: 1080, min: 480 }
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        // Wait for video to be ready
        await new Promise<void>((resolve, reject) => {
          if (!videoRef.current) return reject();
          
          const handleLoadedMetadata = () => {
            videoRef.current?.removeEventListener('loadedmetadata', handleLoadedMetadata);
            resolve();
          };
          
          const handleError = () => {
            videoRef.current?.removeEventListener('error', handleError);
            reject();
          };
          
          videoRef.current.addEventListener('loadedmetadata', handleLoadedMetadata);
          videoRef.current.addEventListener('error', handleError);
          
          // Timeout after 10 seconds
          setTimeout(() => {
            videoRef.current?.removeEventListener('loadedmetadata', handleLoadedMetadata);
            videoRef.current?.removeEventListener('error', handleError);
            reject(new Error('Video load timeout'));
          }, 10000);
        });
        
        setIsInitializing(false);
        setIsScanning(true);
        
        // Initialize barcode reader
        const reader = new BrowserMultiFormatReader();
        readerRef.current = reader;
        
        // Start continuous scanning with improved barcode detection
        try {
          reader.decodeFromVideoDevice(null, videoRef.current, (result, error) => {
            if (result) {
              const scannedText = result.getText();
              console.log('Barcode scanned:', scannedText);
              
              if (scannedText && scannedText.trim()) {
                const cleanCode = scannedText.trim();
                
                // Validate barcode format - accept ISBNs, UPCs, and other book barcodes
                if (cleanCode.length >= 8) {
                  // Check if it looks like a valid book barcode
                  const digitCode = cleanCode.replace(/[^0-9]/g, '');
                  if (digitCode.length >= 8) {
                    console.log('Valid barcode detected:', cleanCode);
                    onScan(cleanCode);
                    return;
                  }
                }
                
                // For shorter codes, still allow them but with a slight delay
                if (cleanCode.length >= 3) {
                  setTimeout(() => {
                    console.log('Short code detected:', cleanCode);
                    onScan(cleanCode);
                  }, 500);
                }
              }
            }
            
            // Only log actual errors, not NotFoundException
            if (error && !(error instanceof NotFoundException)) {
              console.warn('Barcode scan error:', error.message);
            }
          });
        } catch (scanError) {
          console.error('Scanner initialization error:', scanError);
          setError("Barcode scanner initialization failed. Please try again or use manual input.");
          setIsScanning(false);
        }
      }
    } catch (err: any) {
      setIsInitializing(false);
      setIsScanning(false);
      
      let errorMessage = "Camera access failed. ";
      
      if (err.name === 'NotAllowedError') {
        errorMessage = "Camera permission denied. Please allow camera access in your browser settings and try again.";
      } else if (err.name === 'NotFoundError') {
        errorMessage = "No camera found on this device. Please use manual input instead.";
      } else if (err.name === 'NotReadableError') {
        errorMessage = "Camera is being used by another application. Please close other camera apps and try again.";
      } else if (err.name === 'OverconstrainedError') {
        errorMessage = "Camera doesn't support the required constraints. Please use manual input.";
      } else {
        errorMessage = "Failed to access camera. Please check your browser permissions and try again.";
      }
      
      setError(errorMessage);
    }
  }, [onScan]);

  const handleManualSubmit = () => {
    if (manualCode.trim()) {
      onScan(manualCode.trim());
      setManualCode("");
      onClose();
    }
  };

  const handleClose = () => {
    stopCamera();
    setShowManualInput(false);
    setManualCode("");
    setError(null);
    onClose();
  };

  useEffect(() => {
    if (isOpen && !showManualInput) {
      // Start camera immediately when dialog opens
      startCamera();
    } else if (!isOpen) {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, showManualInput, startCamera]);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span className="flex items-center space-x-2">
              <Camera className="w-5 h-5" />
              <span>Scan Book Barcode</span>
            </span>
            <Button variant="ghost" size="icon" onClick={handleClose}>
              <X className="w-4 h-4" />
            </Button>
          </DialogTitle>
          <DialogDescription>
            Point your camera at the book's barcode to scan it automatically
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!showManualInput ? (
            <>
              {/* Camera View */}
              <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                
                {/* Scanning Overlay */}
                {isScanning && !error && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="relative">
                      {/* Main Scanning Frame */}
                      <div className="border-2 border-green-400 rounded-lg w-72 h-36 opacity-90 bg-black bg-opacity-20">
                        {/* Animated Scanning Line */}
                        <div className="absolute top-1/2 left-2 right-2 h-0.5 bg-red-500 animate-pulse shadow-lg"></div>
                        
                        {/* Inner guidelines */}
                        <div className="absolute inset-2 border border-green-300 rounded opacity-50"></div>
                      </div>
                      
                      {/* Enhanced Corner markers */}
                      <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-green-400 rounded-tl"></div>
                      <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-green-400 rounded-tr"></div>
                      <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-green-400 rounded-bl"></div>
                      <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-green-400 rounded-br"></div>
                    </div>
                    
                    {/* Instructions */}
                    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-80 rounded-lg px-4 py-2 max-w-xs text-center">
                      <p className="text-white text-sm font-medium">Hold steady - align barcode in frame</p>
                      <p className="text-green-300 text-xs mt-1">Scanner is active and detecting...</p>
                    </div>
                  </div>
                )}
                
                {/* Loading State */}
                {isInitializing && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-white text-center">
                      <Loader2 className="w-12 h-12 mx-auto mb-2 opacity-75 animate-spin" />
                      <p className="text-sm opacity-75">Starting camera...</p>
                    </div>
                  </div>
                )}

                {/* Error or No Camera State */}
                {!isScanning && !isInitializing && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-white text-center">
                      <Camera className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p className="text-sm opacity-75">Preparing camera...</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                    <p className="text-red-800 text-sm">{error}</p>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Button 
                      onClick={startCamera} 
                      variant="outline" 
                      size="sm"
                    >
                      Try Again
                    </Button>
                    <Button 
                      onClick={() => setShowManualInput(true)} 
                      variant="outline" 
                      size="sm"
                    >
                      Manual Input
                    </Button>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-2">
                <Button 
                  onClick={() => setShowManualInput(true)} 
                  variant="outline" 
                  className="w-full"
                >
                  <Type className="w-4 h-4 mr-2" />
                  Enter Manually Instead
                </Button>
                <Button onClick={handleClose} variant="secondary" className="w-full">
                  Cancel
                </Button>
              </div>
            </>
          ) : (
            /* Manual Input Mode */
            <div className="space-y-4">
              <div className="text-center">
                <Type className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                <h3 className="text-lg font-medium mb-2">Enter Barcode Manually</h3>
                <p className="text-sm text-gray-600">Type the ISBN or barcode number from your book</p>
              </div>
              
              <div className="space-y-3">
                <Input
                  placeholder="Enter ISBN or barcode (e.g., 9780142437200)"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleManualSubmit()}
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button 
                    onClick={handleManualSubmit} 
                    disabled={!manualCode.trim()}
                    className="flex-1"
                  >
                    Use This Code
                  </Button>
                  <Button 
                    onClick={() => setShowManualInput(false)} 
                    variant="outline"
                    className="flex-1"
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    Back to Camera
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Help Text */}
          <div className="text-xs text-gray-500 text-center space-y-1">
            <p>Works with ISBN-13, ISBN-10, and UPC codes</p>
            <p>Make sure the barcode is well-lit and clearly visible</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}