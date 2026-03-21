import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { X, Camera, Loader2, AlertCircle, Type, BookOpen } from "lucide-react";
import { BrowserMultiFormatReader } from "@zxing/library";

interface EnhancedBarcodeScannerProps {
  onScan: (barcode: string, bookData?: any) => void;
  onClose: () => void;
  isOpen: boolean;
}

export default function EnhancedBarcodeScanner({ onScan, onClose, isOpen }: EnhancedBarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [bookInfo, setBookInfo] = useState<any>(null);
  const [isLoadingBookInfo, setIsLoadingBookInfo] = useState(false);
  const [showCamera, setShowCamera] = useState(false);


  // Function to fetch book information from ISBN
  const fetchBookInfo = async (isbn: string) => {
    if (!isbn || isbn.length < 10) return null;
    
    setIsLoadingBookInfo(true);
    try {
      // Try Google Books API
      const response = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`);
      const data = await response.json();
      
      if (data.items && data.items.length > 0) {
        const book = data.items[0].volumeInfo;
        const bookData = {
          title: book.title || '',
          author: book.authors ? book.authors.join(', ') : '',
          isbn: isbn,
          description: book.description || '',
          imageUrl: book.imageLinks?.thumbnail || book.imageLinks?.smallThumbnail || null,
          pageCount: book.pageCount || null,
          publishedDate: book.publishedDate || '',
          categories: book.categories || []
        };
        setBookInfo(bookData);
        return bookData;
      }
      
      // Fallback to Open Library API
      const openLibResponse = await fetch(`https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`);
      const openLibData = await openLibResponse.json();
      
      const bookKey = `ISBN:${isbn}`;
      if (openLibData[bookKey]) {
        const book = openLibData[bookKey];
        const bookData = {
          title: book.title || '',
          author: book.authors ? book.authors.map((a: any) => a.name).join(', ') : '',
          isbn: isbn,
          description: book.notes || '',
          imageUrl: book.cover?.medium || book.cover?.small || null,
          pageCount: book.number_of_pages || null,
          publishedDate: book.publish_date || '',
          categories: book.subjects ? book.subjects.map((s: any) => s.name) : []
        };
        setBookInfo(bookData);
        return bookData;
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching book info:', error);
      return null;
    } finally {
      setIsLoadingBookInfo(false);
    }
  };

  const startCamera = useCallback(async () => {
    try {
      setError(null);
      setIsInitializing(true);
      
      const constraints = {
        video: {
          facingMode: "environment",
          width: { ideal: 1920, min: 1280 },
          height: { ideal: 1080, min: 720 },
          frameRate: { ideal: 60, min: 30 },
          aspectRatio: { ideal: 16/9 }
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        await new Promise<void>((resolve, reject) => {
          if (!videoRef.current) return reject();
          
          const handleLoadedMetadata = () => {
            videoRef.current?.removeEventListener('loadedmetadata', handleLoadedMetadata);
            setIsInitializing(false);
            setIsScanning(true);
            resolve();
          };
          
          videoRef.current.addEventListener('loadedmetadata', handleLoadedMetadata);
        });
      }
    } catch (error) {
      console.error('Camera access error:', error);
      setError("Camera access denied. Please allow camera permissions and try again.");
      setIsInitializing(false);
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    setIsScanning(false);
    setIsInitializing(false);
  }, []);

  const handleManualSubmit = async () => {
    const isbn = manualCode.trim();
    if (!isbn) return;
    
    setIsProcessing(true);
    
    // Fetch book information for auto-fill
    const bookData = await fetchBookInfo(isbn);
    
    if (bookData) {
      console.log('Book information found:', bookData);
    } else {
      console.log('No book information found, proceeding with ISBN only');
    }
    
    onScan(isbn, bookData);
    setManualCode("");
    handleClose();
  };

  const handleClose = () => {
    stopCamera();
    setManualCode("");
    setBookInfo(null);
    setError(null);
    setShowCamera(false);
    onClose();
  };



  // Manual scan button for camera detection
  const triggerCameraScan = async () => {
    if (isProcessing) return;
    
    if (!videoRef.current || !canvasRef.current) {
      setError("Camera not ready. Please try again or use manual input.");
      return;
    }
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    
    if (!context || video.readyState !== video.HAVE_ENOUGH_DATA) {
      setError("Camera feed not ready. Please try again or use manual input.");
      return;
    }
    
    setIsProcessing(true);
    setError(null);
    
    try {
      // Capture current frame
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Try to detect barcode using ZXing
      const codeReader = new BrowserMultiFormatReader();
      
      // Create enhanced image versions for better detection
      const createEnhancedImage = (sourceCanvas: HTMLCanvasElement, contrast: number, brightness: number, grayscale: boolean = false): string => {
        const enhanceCanvas = document.createElement('canvas');
        const enhanceCtx = enhanceCanvas.getContext('2d');
        
        if (!enhanceCtx) return sourceCanvas.toDataURL('image/png');
        
        enhanceCanvas.width = sourceCanvas.width;
        enhanceCanvas.height = sourceCanvas.height;
        
        enhanceCtx.drawImage(sourceCanvas, 0, 0);
        
        const imageData = enhanceCtx.getImageData(0, 0, enhanceCanvas.width, enhanceCanvas.height);
        const data = imageData.data;
        
        for (let i = 0; i < data.length; i += 4) {
          let r = data[i];
          let g = data[i + 1];
          let b = data[i + 2];
          
          // Apply contrast and brightness
          r = Math.min(255, Math.max(0, (r - 128) * contrast + 128 + brightness));
          g = Math.min(255, Math.max(0, (g - 128) * contrast + 128 + brightness));
          b = Math.min(255, Math.max(0, (b - 128) * contrast + 128 + brightness));
          
          if (grayscale) {
            const gray = 0.299 * r + 0.587 * g + 0.114 * b;
            r = g = b = gray;
          }
          
          data[i] = r;
          data[i + 1] = g;
          data[i + 2] = b;
        }
        
        enhanceCtx.putImageData(imageData, 0, 0);
        return enhanceCanvas.toDataURL('image/png');
      };
      
      // Try multiple image enhancements
      const attempts = [
        canvas.toDataURL('image/png'), // Original
        createEnhancedImage(canvas, 1.5, 30), // High contrast
        createEnhancedImage(canvas, 1.2, 0, true), // Grayscale
        createEnhancedImage(canvas, 2.0, 50), // Very high contrast
      ];
      
      for (let i = 0; i < attempts.length; i++) {
        try {
          const img = new Image();
          
          const loadPromise = new Promise<HTMLImageElement>((resolve, reject) => {
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = attempts[i];
          });
          
          const imageElement = await loadPromise;
          const result = await codeReader.decodeFromImageElement(imageElement);
          
          if (result && result.getText()) {
            const detectedCode = result.getText();
            console.log(`Barcode detected on attempt ${i + 1}:`, detectedCode);
            
            // Fetch book info and pass to callback
            const bookData = await fetchBookInfo(detectedCode);
            onScan(detectedCode, bookData);
            handleClose();
            return;
          }
        } catch (attemptError) {
          console.log(`Detection attempt ${i + 1} failed, trying next enhancement`);
        }
      }
      
      // If no barcode detected, show error
      setError("No barcode detected. Please position a barcode clearly in front of the camera and try again.");
      setIsProcessing(false);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.log('No barcode detected after all enhancement attempts:', errorMessage);
      setError("Scanning failed. Please try again or use manual input.");
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    if (isOpen && showCamera) {
      startCamera();
    } else if (!isOpen) {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, showCamera, startCamera]);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span className="flex items-center space-x-2">
              <BookOpen className="w-5 h-5" />
              <span>Add Book</span>
            </span>
            <Button variant="ghost" size="icon" onClick={handleClose}>
              <X className="w-4 h-4" />
            </Button>
          </DialogTitle>
          <DialogDescription>
            Enter ISBN manually for best results, or try camera scanning
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Manual ISBN Entry - Primary Method */}
          <div className="space-y-3">
            <div className="text-sm font-medium text-gray-700">Enter ISBN Number</div>
            <div className="space-y-2">
              <Input
                type="text"
                placeholder="978-0-123456-78-9 or 9780123456789"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleManualSubmit()}
                className="text-lg"
                disabled={isLoadingBookInfo}
                autoFocus
              />
              <Button 
                onClick={handleManualSubmit} 
                className="w-full"
                disabled={!manualCode.trim() || isLoadingBookInfo}
                size="lg"
              >
                {isLoadingBookInfo ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Looking up book info...
                  </>
                ) : (
                  <>
                    <Type className="w-4 h-4 mr-2" />
                    Add Book with ISBN
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Book Preview */}
          {bookInfo && (
            <div className="border rounded-lg p-3 bg-gray-50">
              <div className="text-sm font-medium text-gray-700 mb-2">Book Preview</div>
              <div className="flex space-x-3">
                {bookInfo.imageUrl && (
                  <img 
                    src={bookInfo.imageUrl} 
                    alt={bookInfo.title}
                    className="w-16 h-20 object-cover rounded"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{bookInfo.title}</div>
                  <div className="text-sm text-gray-600 truncate">{bookInfo.author}</div>
                  <div className="text-xs text-gray-500">ISBN: {bookInfo.isbn}</div>
                </div>
              </div>
            </div>
          )}

          {/* Divider */}
          <div className="flex items-center space-x-2">
            <div className="flex-1 border-t border-gray-200"></div>
            <span className="text-xs text-gray-500 px-2">OR</span>
            <div className="flex-1 border-t border-gray-200"></div>
          </div>

          {/* Camera Scanning Toggle */}
          {!showCamera ? (
            <Button 
              onClick={() => setShowCamera(true)} 
              variant="outline" 
              className="w-full"
            >
              <Camera className="w-4 h-4 mr-2" />
              Try Camera Scanning
            </Button>
          ) : (
            <div className="space-y-3">
              {/* Camera View */}
              <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                  style={{ 
                    imageRendering: 'crisp-edges',
                    filter: 'contrast(1.2) brightness(1.1)'
                  }}
                />
                <canvas ref={canvasRef} className="hidden" />

                {/* Loading State */}
                {isInitializing && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                    <div className="text-white text-center">
                      <Loader2 className="w-8 h-8 mx-auto mb-2 animate-spin" />
                      <p className="text-sm">Starting camera...</p>
                    </div>
                  </div>
                )}

                {/* Camera not ready state */}
                {!isScanning && !isInitializing && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                    <div className="text-white text-center">
                      <Camera className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Preparing camera...</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Camera Controls */}
              <div className="flex gap-2">
                <Button 
                  onClick={triggerCameraScan} 
                  className="flex-1"
                  disabled={isProcessing || !isScanning}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Scanning...
                    </>
                  ) : (
                    <>
                      <Camera className="w-4 h-4 mr-2" />
                      Scan Barcode Now
                    </>
                  )}
                </Button>
                <Button 
                  onClick={() => setShowCamera(false)} 
                  variant="outline"
                >
                  Hide Camera
                </Button>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            </div>
          )}

          {/* Help Text */}
          <div className="text-xs text-gray-500 text-center space-y-1">
            <p>Manual entry is most reliable - ISBN format: 9780140449136</p>
            <p>Camera scanning works best with good lighting and steady hands</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}