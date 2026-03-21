import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Camera, Upload, X, Loader2 } from "lucide-react";
import { BrowserMultiFormatReader } from '@zxing/library';

interface ImprovedCameraScannerProps {
  onScan: (barcode: string, bookData?: any) => void;
  onClose: () => void;
  isOpen: boolean;
}

export default function ImprovedCameraScanner({ onScan, onClose, isOpen }: ImprovedCameraScannerProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Enhanced image processing for barcode detection
  const processImageFile = async (file: File) => {
    try {
      setIsProcessing(true);
      setError(null);
      setUploadStatus("Processing barcode image...");

      const reader = new BrowserMultiFormatReader();
      
      // Create image element for processing
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      return new Promise<void>((resolve, reject) => {
        img.onload = async () => {
          try {
            // Set canvas dimensions
            canvas.width = img.width;
            canvas.height = img.height;
            
            if (ctx) {
              // Apply image enhancements for better barcode reading
              ctx.filter = 'contrast(1.3) brightness(1.2) saturate(0.8)';
              ctx.drawImage(img, 0, 0);
              
              // Convert to ImageData for ZXing
              const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
              
              try {
                const result = await reader.decodeFromCanvas(canvas);
                const barcode = result.getText();
                console.log('📱 Barcode detected:', barcode);
                
                // Fetch book information
                const bookData = await fetchBookInfo(barcode);
                setUploadStatus("Barcode scan successful!");
                onScan(barcode, bookData);
                setIsProcessing(false);
                resolve();
              } catch (scanError) {
                console.log('📱 ZXing scan failed, trying alternative processing...');
                
                // Try with different image processing
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.filter = 'grayscale(100%) contrast(2) brightness(1.5)';
                ctx.drawImage(img, 0, 0);
                
                const enhancedImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                
                try {
                  const retryResult = await reader.decodeFromCanvas(canvas);
                  const barcode = retryResult.getText();
                  console.log('📱 Barcode detected on retry:', barcode);
                  
                  const bookData = await fetchBookInfo(barcode);
                  setUploadStatus("Barcode scan successful!");
                  onScan(barcode, bookData);
                  setIsProcessing(false);
                  resolve();
                } catch (retryError) {
                  throw new Error('Could not detect barcode in image');
                }
              }
            }
          } catch (error) {
            reject(error);
          }
        };
        
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = URL.createObjectURL(file);
      });

    } catch (error: any) {
      console.error('📱 Barcode processing error:', error);
      setError("Could not detect barcode in image. Please ensure the barcode is clear and well-lit.");
      setIsProcessing(false);
      setUploadStatus("");
    }
  };

  // Fetch book information from ISBN
  const fetchBookInfo = async (isbn: string) => {
    if (!isbn || isbn.length < 10) return null;
    
    try {
      const response = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`);
      const data = await response.json();
      
      if (data.items && data.items.length > 0) {
        const book = data.items[0].volumeInfo;
        return {
          title: book.title || 'Unknown Title',
          author: book.authors ? book.authors.join(', ') : 'Unknown Author',
          isbn: isbn,
          description: book.description || '',
          genre: book.categories?.[0] || 'Fiction',
          imageUrl: book.imageLinks?.thumbnail || null
        };
      }
      
      return null;
    } catch (error) {
      console.log('Book info fetch failed:', error);
      return null;
    }
  };

  // Enhanced camera capture functionality
  const startEnhancedCamera = async () => {
    try {
      setError(null);
      setIsProcessing(true);
      setUploadStatus("Initializing camera...");

      // Request high-quality camera access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment',
          width: { ideal: 1920, min: 1280 },
          height: { ideal: 1080, min: 720 },
          aspectRatio: { ideal: 16/9 }
        } 
      });

      // Create enhanced camera UI
      const overlay = document.createElement('div');
      overlay.className = 'camera-overlay';
      overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: black;
        z-index: 10000;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
      `;

      const video = document.createElement('video');
      video.srcObject = stream;
      video.autoplay = true;
      video.playsInline = true;
      video.muted = true;
      video.style.cssText = `
        width: 100%;
        height: 100%;
        object-fit: cover;
        filter: brightness(1.1) contrast(1.1);
      `;

      // Barcode targeting frame
      const targetFrame = document.createElement('div');
      targetFrame.style.cssText = `
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 300px;
        height: 200px;
        border: 3px solid #00ff00;
        border-radius: 8px;
        box-shadow: 0 0 0 9999px rgba(0,0,0,0.6);
        pointer-events: none;
      `;

      // Instructions
      const instructions = document.createElement('div');
      instructions.innerHTML = '📱 Position barcode within green frame';
      instructions.style.cssText = `
        position: absolute;
        top: 25%;
        left: 50%;
        transform: translateX(-50%);
        color: white;
        font-size: 18px;
        font-weight: bold;
        text-align: center;
        background: rgba(0,0,0,0.8);
        padding: 12px 24px;
        border-radius: 8px;
        pointer-events: none;
      `;

      // Enhanced capture button
      const captureBtn = document.createElement('button');
      captureBtn.innerHTML = '📷 Capture Barcode';
      captureBtn.style.cssText = `
        position: absolute;
        bottom: 40px;
        left: 50%;
        transform: translateX(-50%);
        padding: 18px 36px;
        background: linear-gradient(135deg, #00ff00, #00cc00);
        color: white;
        border: none;
        border-radius: 50px;
        font-size: 18px;
        font-weight: bold;
        box-shadow: 0 6px 20px rgba(0, 255, 0, 0.4);
        cursor: pointer;
        z-index: 10001;
        transition: all 0.2s ease;
      `;

      // Close button
      const closeBtn = document.createElement('button');
      closeBtn.innerHTML = '✕';
      closeBtn.style.cssText = `
        position: absolute;
        top: 30px;
        right: 30px;
        width: 50px;
        height: 50px;
        background: rgba(255,0,0,0.8);
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
      `;

      overlay.appendChild(video);
      overlay.appendChild(targetFrame);
      overlay.appendChild(instructions);
      overlay.appendChild(captureBtn);
      overlay.appendChild(closeBtn);
      document.body.appendChild(overlay);

      setUploadStatus("Camera ready - Position barcode and capture");
      setIsProcessing(false);

      const cleanup = () => {
        stream.getTracks().forEach(track => track.stop());
        if (overlay.parentNode) document.body.removeChild(overlay);
        setUploadStatus("");
      };

      const handleCapture = () => {
        setIsProcessing(true);
        setUploadStatus("Capturing and analyzing...");
        
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        
        if (ctx) {
          ctx.drawImage(video, 0, 0);
          
          canvas.toBlob((blob) => {
            if (blob) {
              const file = new File([blob], 'barcode-capture.jpg', { type: 'image/jpeg' });
              processImageFile(file);
            }
            cleanup();
          }, 'image/jpeg', 0.95);
        }
      };

      captureBtn.onclick = handleCapture;
      closeBtn.onclick = cleanup;

      // Auto-focus effect
      captureBtn.addEventListener('mouseenter', () => {
        captureBtn.style.transform = 'translateX(-50%) scale(1.05)';
      });
      captureBtn.addEventListener('mouseleave', () => {
        captureBtn.style.transform = 'translateX(-50%) scale(1)';
      });

    } catch (error) {
      console.error('Camera access error:', error);
      setError("Camera access denied. Please allow camera permissions and try again.");
      setIsProcessing(false);
      setUploadStatus("");
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Scan Barcode
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}
          
          {uploadStatus && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-blue-700 text-sm">{uploadStatus}</p>
            </div>
          )}

          <div className="grid grid-cols-1 gap-3">
            <Button
              onClick={startEnhancedCamera}
              disabled={isProcessing}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              {isProcessing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Camera className="h-4 w-4 mr-2" />
              )}
              Open Camera Scanner
            </Button>
            
            <Button
              variant="outline"
              onClick={() => {
                if (fileInputRef.current) {
                  fileInputRef.current.setAttribute('capture', 'environment');
                  fileInputRef.current.click();
                }
              }}
              disabled={isProcessing}
              className="w-full"
            >
              <Upload className="h-4 w-4 mr-2" />
              Take Photo of Barcode
            </Button>
          </div>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageUpload}
            accept="image/*"
            capture="environment"
            className="hidden"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}