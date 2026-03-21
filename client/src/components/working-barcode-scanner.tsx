import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { X, Camera, Loader2, AlertCircle, Type, Zap } from "lucide-react";
import { BrowserMultiFormatReader, NotFoundException } from "@zxing/library";

// Image enhancement function to improve barcode detection
function enhanceImage(canvas: HTMLCanvasElement, contrast: number = 1.2, brightness: number = 10, grayscale: boolean = false): string {
  const enhanceCanvas = document.createElement('canvas');
  const enhanceCtx = enhanceCanvas.getContext('2d');
  
  if (!enhanceCtx) return canvas.toDataURL('image/png');
  
  enhanceCanvas.width = canvas.width;
  enhanceCanvas.height = canvas.height;
  
  // Draw original image
  enhanceCtx.drawImage(canvas, 0, 0);
  
  // Get image data
  const imageData = enhanceCtx.getImageData(0, 0, enhanceCanvas.width, enhanceCanvas.height);
  const data = imageData.data;
  
  // Apply enhancements
  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];
    
    // Apply contrast and brightness
    r = Math.min(255, Math.max(0, (r - 128) * contrast + 128 + brightness));
    g = Math.min(255, Math.max(0, (g - 128) * contrast + 128 + brightness));
    b = Math.min(255, Math.max(0, (b - 128) * contrast + 128 + brightness));
    
    // Apply grayscale if requested
    if (grayscale) {
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      r = g = b = gray;
    }
    
    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
  }
  
  // Put enhanced image data back
  enhanceCtx.putImageData(imageData, 0, 0);
  
  return enhanceCanvas.toDataURL('image/png');
}

interface WorkingBarcodeScannerProps {
  onScan: (barcode: string) => void;
  onClose: () => void;
  isOpen: boolean;
}

export default function WorkingBarcodeScanner({ onScan, onClose, isOpen }: WorkingBarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [scanAttempts, setScanAttempts] = useState(0);
  const [lastScannedCode, setLastScannedCode] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [bookInfo, setBookInfo] = useState<any>(null);
  const [isLoadingBookInfo, setIsLoadingBookInfo] = useState(false);

  // Function to fetch book information from ISBN
  const fetchBookInfo = async (isbn: string) => {
    if (!isbn || isbn.length < 10) return null;
    
    setIsLoadingBookInfo(true);
    try {
      // Try Google Books API first
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

  const stopCamera = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    setIsScanning(false);
    setIsInitializing(false);
    setScanAttempts(0);
    setLastScannedCode("");
    setIsProcessing(false);
  }, []);

  // Disabled automatic detection to prevent rapid scanning
  const detectBarcode = useCallback((imageData: ImageData) => {
    // Automatic detection disabled - will only work with manual trigger
    return null;
  }, []);

  const captureAndAnalyze = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || isProcessing) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    
    if (!context || video.readyState !== video.HAVE_ENOUGH_DATA) return;
    
    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Draw current video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Get image data for analysis
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    
    // Try to detect barcode
    const detectedCode = detectBarcode(imageData);
    
    if (detectedCode && detectedCode !== lastScannedCode && !isProcessing) {
      console.log('New barcode detected:', detectedCode);
      setIsProcessing(true);
      setLastScannedCode(detectedCode);
      
      // Stop scanning to prevent multiple scans
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      
      // Call onScan and close
      onScan(detectedCode);
      return true;
    }
    
    return false;
  }, [detectBarcode, onScan, lastScannedCode, isProcessing]);

  const startCamera = useCallback(async () => {
    try {
      setError(null);
      setIsInitializing(true);
      setScanAttempts(0);
      
      const constraints = {
        video: {
          facingMode: "environment",
          width: { ideal: 1920, min: 1280 },
          height: { ideal: 1080, min: 720 },
          frameRate: { ideal: 30 },
          focusMode: 'continuous',
          exposureMode: 'continuous',
          whiteBalanceMode: 'continuous'
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
            
            // Automatic scanning disabled to prevent rapid detection issues
            // Camera is ready for manual scanning only
            
            resolve();
          };
          
          videoRef.current.addEventListener('loadedmetadata', handleLoadedMetadata);
          
          setTimeout(() => {
            videoRef.current?.removeEventListener('loadedmetadata', handleLoadedMetadata);
            reject(new Error('Video load timeout'));
          }, 10000);
        });
      }
    } catch (err: any) {
      setIsInitializing(false);
      setIsScanning(false);
      
      let errorMessage = "Camera access failed. ";
      
      if (err.name === 'NotAllowedError') {
        errorMessage = "Camera permission denied. Please allow camera access and try again.";
      } else if (err.name === 'NotFoundError') {
        errorMessage = "No camera found. Please use manual input instead.";
      } else if (err.name === 'NotReadableError') {
        errorMessage = "Camera is busy. Please close other camera apps and try again.";
      } else {
        errorMessage = "Failed to access camera. Please try manual input.";
      }
      
      setError(errorMessage);
    }
  }, [captureAndAnalyze]);

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
    
    onScan(isbn);
    setManualCode("");
    onClose();
  };

  const handleClose = () => {
    stopCamera();
    setShowManualInput(false);
    setManualCode("");
    setBookInfo(null);
    setError(null);
    onClose();
  };

  // Manual scan button that actually tries to detect barcodes from camera
  const triggerManualScan = async () => {
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
      
      // Try to detect barcode using ZXing with multiple enhancements
      const codeReader = new BrowserMultiFormatReader();
      
      // Helper function to enhance image for better barcode detection
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
      
      try {
        // Try multiple image enhancements to improve detection
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
              setLastScannedCode(detectedCode);
              onScan(detectedCode);
              return;
            }
          } catch (attemptError) {
            console.log(`Detection attempt ${i + 1} failed, trying next enhancement`);
          }
        }
        
        throw new Error('No barcode detected in any enhanced image');
        
      } catch (decodeError) {
        const errorMessage = decodeError instanceof Error ? decodeError.message : 'Unknown error';
        console.log('No barcode detected after all enhancement attempts:', errorMessage);
      }
      
      // If no barcode detected, show error
      setError("No barcode detected. Please position a barcode in front of the camera and try again.");
      setIsProcessing(false);
      
    } catch (error) {
      console.error('Scan error:', error);
      setError("Scanning failed. Please try again or use manual input.");
      setIsProcessing(false);
    }
  };
  
  // Test scan for demo purposes
  const triggerTestScan = () => {
    if (isProcessing) return;
    
    setIsProcessing(true);
    const testCode = "9780140449136"; // Les Miserables ISBN
    console.log('Test scan triggered:', testCode);
    setLastScannedCode(testCode);
    
    setTimeout(() => {
      onScan(testCode);
    }, 1000);
  };

  useEffect(() => {
    if (isOpen && !showManualInput) {
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

          {/* Camera Scanning - Secondary Method */}
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
                
                {/* Hidden canvas for image processing */}
                <canvas
                  ref={canvasRef}
                  className="hidden"
                />
                
                {/* Scanning Overlay */}
                {isScanning && !error && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="relative">
                      <div className="border-2 border-green-400 rounded-lg w-72 h-36 opacity-90 bg-black bg-opacity-20">
                        <div className="absolute top-1/2 left-2 right-2 h-0.5 bg-red-500 animate-pulse shadow-lg"></div>
                        <div className="absolute inset-2 border border-green-300 rounded opacity-50"></div>
                      </div>
                      
                      <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-green-400 rounded-tl"></div>
                      <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-green-400 rounded-tr"></div>
                      <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-green-400 rounded-bl"></div>
                      <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-green-400 rounded-br"></div>
                    </div>
                    
                    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-80 rounded-lg px-4 py-2 text-center">
                      {isProcessing ? (
                        <>
                          <p className="text-green-400 text-sm font-medium">Barcode Found!</p>
                          <p className="text-green-300 text-xs mt-1">Processing...</p>
                        </>
                      ) : (
                        <>
                          <p className="text-white text-sm font-medium">Scanning... {scanAttempts} attempts</p>
                          <p className="text-green-300 text-xs mt-1">Hold barcode steady in frame</p>
                        </>
                      )}
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
                  onClick={triggerManualScan} 
                  className="w-full"
                  variant="default"
                  disabled={isProcessing}
                  size="lg"
                >
                  <Camera className="w-5 h-5 mr-2" />
                  {isProcessing ? "Scanning..." : "Scan Barcode Now"}
                </Button>
                <Button 
                  onClick={() => setShowManualInput(true)} 
                  variant="outline" 
                  className="w-full"
                  disabled={isProcessing}
                >
                  <Type className="w-4 h-4 mr-2" />
                  Enter ISBN Manually
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
                  placeholder="Enter ISBN or barcode (e.g., 9780140449136)"
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
            <p>Camera is active - press "Scan Barcode Now" to capture</p>
            <p>ISBN format: 9780140449136 (13 digits starting with 978/979)</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}