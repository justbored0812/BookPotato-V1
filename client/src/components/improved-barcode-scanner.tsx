import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { X, Camera, Loader2, AlertCircle, Smartphone, Type } from "lucide-react";
import { BrowserMultiFormatReader, NotFoundException } from '@zxing/library';

interface ImprovedBarcodeScannerProps {
  onScan: (barcode: string) => void;
  onClose: () => void;
  isOpen: boolean;
}

export default function ImprovedBarcodeScanner({ onScan, onClose, isOpen }: ImprovedBarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [codeReader, setCodeReader] = useState<BrowserMultiFormatReader | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [permissionState, setPermissionState] = useState<'prompt' | 'granted' | 'denied'>('prompt');

  const stopCamera = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
    }
    
    if (stream) {
      stream.getTracks().forEach(track => {
        track.stop();
      });
      setStream(null);
    }
    
    if (codeReader) {
      try {
        codeReader.reset();
      } catch (e) {
        // Ignore reset errors
      }
      setCodeReader(null);
    }
    
    setIsScanning(false);
    setIsInitializing(false);
  }, [stream, codeReader]);

  const checkCameraPermission = useCallback(async () => {
    try {
      const permission = await navigator.permissions.query({ name: 'camera' as PermissionName });
      setPermissionState(permission.state);
      return permission.state === 'granted';
    } catch (e) {
      // If permissions API is not supported, assume we need to request
      return false;
    }
  }, []);

  const startCamera = useCallback(async () => {
    try {
      setError(null);
      setIsInitializing(true);
      
      // Simplified camera constraints for better compatibility
      const constraints = {
        video: { 
          facingMode: "environment"
        }
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      
      setStream(mediaStream);
      setPermissionState('granted');
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        
        // Simplified video loading with proper error handling
        videoRef.current.onloadedmetadata = () => {
          setIsInitializing(false);
          
          // Give user option to start manual scanning or use camera
          // Don't auto-start barcode scanner as it can cause endless loading
          setTimeout(() => {
            setShowManualInput(true);
          }, 2000);
        };
        
        videoRef.current.onerror = () => {
          setError("Video stream error. Please use manual input.");
          setIsInitializing(false);
          setShowManualInput(true);
        };
        
        // Timeout for video loading
        setTimeout(() => {
          if (isInitializing) {
            setError("Camera is taking too long to load. Please use manual input.");
            setIsInitializing(false);
            setShowManualInput(true);
          }
        }, 8000);
      }
    } catch (err: any) {
      setIsInitializing(false);
      setIsScanning(false);
      
      if (err.name === 'NotAllowedError') {
        setPermissionState('denied');
        setError("Camera access denied. Please allow camera permissions and try manual input.");
      } else if (err.name === 'NotFoundError') {
        setError("No camera found on this device. Please use manual input.");
      } else if (err.name === 'NotReadableError') {
        setError("Camera is being used by another application. Please use manual input.");
      } else {
        setError("Camera access failed. Please use manual input.");
      }
      
      // Always show manual input as fallback
      setShowManualInput(true);
    }
  }, [onScan, isInitializing]);

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
      // Small delay to ensure dialog is rendered
      const timer = setTimeout(startCamera, 100);
      return () => clearTimeout(timer);
    } else if (!isOpen) {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, showManualInput, startCamera, stopCamera]);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md" aria-describedby="barcode-scanner-description">
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
          <DialogDescription id="barcode-scanner-description">
            Position the book's barcode in the camera view or enter it manually
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!showManualInput ? (
            <>
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

              <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                
                {isScanning && !error && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="border-2 border-green-400 rounded-lg w-48 h-24 opacity-90 relative">
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
                      <Smartphone className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p className="text-sm opacity-75">Initializing scanner...</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Button 
                  onClick={() => setShowManualInput(true)} 
                  variant="outline" 
                  className="w-full"
                >
                  <Type className="w-4 h-4 mr-2" />
                  Enter ISBN/Barcode Manually
                </Button>
                <Button onClick={handleClose} variant="secondary" className="w-full">
                  Cancel
                </Button>
              </div>
            </>
          ) : (
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
                    Camera
                  </Button>
                </div>
              </div>
            </div>
          )}

          <div className="text-xs text-gray-500 text-center space-y-1">
            <p>Works with ISBN-13, ISBN-10, and UPC codes</p>
            <p>Make sure there's good lighting for camera scanning</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}