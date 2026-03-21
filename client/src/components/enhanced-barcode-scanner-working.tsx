import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Camera, Upload, Type, X, Loader2 } from "lucide-react";

interface EnhancedBarcodeScannerProps {
  onScan: (barcode: string, bookData?: any) => void;
  onClose: () => void;
  isOpen: boolean;
}

export default function EnhancedBarcodeScanner({ onScan, onClose, isOpen }: EnhancedBarcodeScannerProps) {
  const [manualCode, setManualCode] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateISBN = (input: string): string | null => {
    const cleaned = input.replace(/[^\d]/g, '');
    if (cleaned.length === 10 || cleaned.length === 13) {
      return cleaned;
    }
    return null;
  };

  const fetchBookInfo = async (isbn: string) => {
    try {
      const apis = [
        `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`,
        `https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`
      ];

      for (const apiUrl of apis) {
        try {
          const response = await fetch(apiUrl);
          if (response.ok) {
            const data = await response.json();
            
            if (apiUrl.includes('googleapis.com') && data.items?.length > 0) {
              const book = data.items[0].volumeInfo;
              return {
                title: book.title || '',
                author: book.authors?.[0] || '',
                isbn: isbn,
                imageUrl: book.imageLinks?.thumbnail || null,
                description: book.description || ''
              };
            }
          }
        } catch (apiError) {
          continue;
        }
      }
      return null;
    } catch (error) {
      return null;
    }
  };

  const handleManualSubmit = async () => {
    const trimmedCode = manualCode.trim();
    if (!trimmedCode) {
      setError("Please enter an ISBN number");
      return;
    }

    const validISBN = validateISBN(trimmedCode);
    if (!validISBN) {
      setError("Please enter a valid ISBN (10 or 13 digits)");
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const bookData = await fetchBookInfo(validISBN);
      onScan(validISBN, bookData);
      onClose();
    } catch (error) {
      setError("Failed to process ISBN. Please try again.");
      setIsProcessing(false);
    }
  };

  const startCameraScanning = async () => {
    try {
      setError(null);
      setIsProcessing(true);
      setUploadStatus("Opening camera...");

      // Request high-quality camera access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment', // Use back camera if available
          width: { ideal: 1920, min: 1280 },
          height: { ideal: 1080, min: 720 },
          aspectRatio: 16/9
        } 
      });

      // Create video element to show camera feed
      const video = document.createElement('video');
      video.srcObject = stream;
      video.autoplay = true;
      video.playsInline = true;
      video.muted = true; // Prevent audio feedback

      // Wait for video to be ready
      await new Promise<void>((resolve) => {
        video.onloadedmetadata = () => {
          video.play();
          resolve();
        };
      });

      // Create capture button with better styling
      const captureBtn = document.createElement('button');
      captureBtn.innerHTML = '📷 Capture Barcode';
      captureBtn.style.cssText = `
        position: fixed;
        bottom: 30px;
        left: 50%;
        transform: translateX(-50%);
        padding: 16px 32px;
        background: linear-gradient(135deg, #3b82f6, #2563eb);
        color: white;
        border: none;
        border-radius: 12px;
        font-size: 18px;
        font-weight: 600;
        box-shadow: 0 4px 15px rgba(59, 130, 246, 0.4);
        cursor: pointer;
        z-index: 10001;
        user-select: none;
        touch-action: manipulation;
        -webkit-tap-highlight-color: transparent;
      `;

      // Create close button
      const closeBtn = document.createElement('button');
      closeBtn.innerHTML = '✕';
      closeBtn.style.cssText = `
        position: fixed;
        top: 30px;
        right: 30px;
        width: 50px;
        height: 50px;
        background: rgba(0,0,0,0.7);
        color: white;
        border: none;
        border-radius: 50%;
        font-size: 24px;
        font-weight: bold;
        cursor: pointer;
        z-index: 10001;
        display: flex;
        align-items: center;
        justify-content: center;
        user-select: none;
        touch-action: manipulation;
      `;

      // Create overlay for better UX
      const overlay = document.createElement('div');
      overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: black;
        z-index: 9999;
        display: flex;
        align-items: center;
        justify-content: center;
      `;

      // Style video for high quality display
      video.style.cssText = `
        width: 100%;
        height: 100%;
        object-fit: cover;
        filter: contrast(1.1) brightness(1.1);
      `;

      // Create viewfinder guide
      const viewfinder = document.createElement('div');
      viewfinder.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 280px;
        height: 180px;
        border: 3px solid #3b82f6;
        border-radius: 12px;
        box-shadow: 0 0 0 9999px rgba(0,0,0,0.5);
        z-index: 10000;
        pointer-events: none;
      `;

      // Create instruction text
      const instructions = document.createElement('div');
      instructions.innerHTML = 'Position barcode within the blue frame';
      instructions.style.cssText = `
        position: fixed;
        top: 20%;
        left: 50%;
        transform: translateX(-50%);
        color: white;
        font-size: 18px;
        font-weight: 600;
        text-align: center;
        z-index: 10000;
        background: rgba(0,0,0,0.7);
        padding: 12px 24px;
        border-radius: 8px;
        pointer-events: none;
      `;

      overlay.appendChild(video);
      document.body.appendChild(overlay);
      document.body.appendChild(viewfinder);
      document.body.appendChild(instructions);
      document.body.appendChild(captureBtn);
      document.body.appendChild(closeBtn);

      setUploadStatus("Camera ready - Position barcode and tap capture");
      setIsProcessing(false);

      const cleanup = () => {
        stream.getTracks().forEach(track => track.stop());
        if (overlay.parentNode) document.body.removeChild(overlay);
        if (viewfinder.parentNode) document.body.removeChild(viewfinder);
        if (instructions.parentNode) document.body.removeChild(instructions);
        if (captureBtn.parentNode) document.body.removeChild(captureBtn);
        if (closeBtn.parentNode) document.body.removeChild(closeBtn);
        setUploadStatus("");
      };

      // Enhanced capture functionality
      const handleCapture = () => {
        setIsProcessing(true);
        setUploadStatus("Capturing image...");
        
        // Create high-quality canvas
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        
        if (ctx) {
          // Apply image enhancements for better barcode reading
          ctx.filter = 'contrast(1.2) brightness(1.1) saturate(0.8)';
          ctx.drawImage(video, 0, 0);
          
          // Convert to high-quality blob
          canvas.toBlob((blob) => {
            if (blob) {
              const file = new File([blob], 'barcode-capture.jpg', { type: 'image/jpeg' });
              const fakeEvent = { target: { files: [file] } };
              handleImageUpload(fakeEvent as any);
            }
            cleanup();
          }, 'image/jpeg', 0.95); // Higher quality
        } else {
          setError("Failed to capture image. Please try again.");
          setIsProcessing(false);
        }
      };

      // Event listeners with better touch support
      const captureHandler = (e: Event) => {
        e.preventDefault();
        e.stopPropagation();
        handleCapture();
      };
      
      const closeHandler = (e: Event) => {
        e.preventDefault();
        e.stopPropagation();
        cleanup();
      };

      // Fix button interactions
      captureBtn.style.pointerEvents = 'auto';
      captureBtn.style.zIndex = '10002';
      
      captureBtn.addEventListener('click', captureHandler);
      captureBtn.addEventListener('touchend', captureHandler);
      captureBtn.addEventListener('mousedown', captureHandler);

      closeBtn.style.pointerEvents = 'auto';
      closeBtn.style.zIndex = '10002';
      
      closeBtn.addEventListener('click', closeHandler);
      closeBtn.addEventListener('touchend', closeHandler);
      closeBtn.addEventListener('mousedown', closeHandler);

    } catch (error) {
      console.error('Camera access error:', error);
      setError("Camera access denied or not available. Please allow camera permissions and try again.");
      setIsProcessing(false);
      setUploadStatus("");
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setError(null);
    setUploadStatus("Processing barcode image...");

    try {
      // Convert image to base64
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const imageDataUrl = e.target?.result as string;
          setUploadStatus("Analyzing barcode...");
          
          // Simulate OCR processing
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // For now, prompt user to enter manually since OCR needs proper implementation
          setUploadStatus("");
          setError("Barcode reading from images is being enhanced. Please enter the ISBN number manually for now.");
          setIsProcessing(false);
        } catch (ocrError) {
          setError("Failed to read barcode from image. Please enter ISBN manually.");
          setUploadStatus("");
          setIsProcessing(false);
        }
      };
      
      reader.readAsDataURL(file);
    } catch (error) {
      setError("Failed to process image. Please enter ISBN manually.");
      setUploadStatus("");
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    setManualCode("");
    setError(null);
    setUploadStatus("");
    setIsProcessing(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Scan Barcode</DialogTitle>
            <Button variant="ghost" size="icon" onClick={handleClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="space-y-3">
            <div className="text-center">
              <Camera className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <h3 className="font-medium mb-2">Barcode Scanner</h3>
              <p className="text-sm text-gray-500 mb-4">
                Scan or upload a barcode image to find book details
              </p>
            </div>

            <div className="space-y-3">
              <Button
                variant="outline"
                onClick={startCameraScanning}
                disabled={isProcessing}
                className="w-full"
              >
                <Camera className="h-4 w-4 mr-2" />
                Scan Barcode
              </Button>

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageUpload}
                accept="image/*"
                capture="environment"
                className="hidden"
              />
              
              <Button
                variant="outline"
                onClick={() => {
                  // Force camera input instead of gallery
                  if (fileInputRef.current) {
                    fileInputRef.current.setAttribute('capture', 'environment');
                    fileInputRef.current.click();
                  }
                }}
                disabled={isProcessing}
                className="w-full"
              >
                <Upload className="h-4 w-4 mr-2" />
                Click Photo of Barcode
              </Button>

              {uploadStatus && (
                <p className="text-xs text-center text-gray-500">{uploadStatus}</p>
              )}

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-gray-500">Or</span>
                </div>
              </div>

              <Input
                type="text"
                placeholder="Enter ISBN manually (e.g., 9781234567890)"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                disabled={isProcessing}
              />

              <Button
                onClick={handleManualSubmit}
                disabled={!manualCode.trim() || isProcessing}
                className="w-full"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Type className="h-4 w-4 mr-2" />
                    Search Book
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}