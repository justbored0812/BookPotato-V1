import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Camera, Upload, Type, X, Loader2, Video } from "lucide-react";

interface AlternativeScannerProps {
  onScan: (barcode: string, bookData?: any) => void;
  onClose: () => void;
  isOpen: boolean;
}

export default function AlternativeScanner({ onScan, onClose, isOpen }: AlternativeScannerProps) {
  const [manualCode, setManualCode] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string>("");
  const [showWebCamera, setShowWebCamera] = useState(false);
  const [isCameraInitializing, setIsCameraInitializing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Function to fetch book information from ISBN
  const fetchBookInfo = async (isbn: string) => {
    if (!isbn || isbn.length < 10) return null;
    
    try {
      // Try Google Books API first
      const response = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`);
      const data = await response.json();
      
      if (data.items && data.items.length > 0) {
        const book = data.items[0].volumeInfo;
        return {
          title: book.title || 'Unknown Title',
          author: book.authors ? book.authors.join(', ') : 'Unknown Author',
          isbn: isbn,
          description: book.description || '',
          imageUrl: book.imageLinks?.thumbnail || null,
          pageCount: book.pageCount || 0,
          publishedDate: book.publishedDate || '',
          categories: book.categories || []
        };
      }
      
      return null;
    } catch (error) {
      console.log('Book info fetch failed:', error);
      return null;
    }
  };

  // Handle manual ISBN input
  const handleManualSubmit = async () => {
    if (!manualCode.trim()) {
      setError("Please enter an ISBN number");
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const cleanIsbn = manualCode.replace(/[^\d]/g, '');
      
      if (cleanIsbn.length !== 10 && cleanIsbn.length !== 13) {
        setError("Please enter a valid 10 or 13 digit ISBN");
        setIsProcessing(false);
        return;
      }

      const bookData = await fetchBookInfo(cleanIsbn);
      console.log('Book information found:', bookData);
      console.log('Manual ISBN entered:', cleanIsbn);
      
      onScan(cleanIsbn, bookData);
      handleClose();
    } catch (error) {
      setError("Failed to process ISBN. Please try again.");
      setIsProcessing(false);
    }
  };

  // Handle photo upload from device camera or gallery
  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    // Prevent default behavior to avoid navigation
    event.preventDefault();
    event.stopPropagation();
    
    const file = event.target.files?.[0];
    if (!file) {
      console.log('No file selected');
      setIsProcessing(false);
      return;
    }

    console.log('File selected:', file.name, file.type, file.size);
    setIsProcessing(true);
    setError(null);
    setUploadStatus("Loading image...");

    try {
      // Convert file to base64 for processing
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const imageDataUrl = e.target?.result as string;
          
          if (!imageDataUrl) {
            throw new Error('Failed to read image file');
          }
          
          console.log('Image loaded, starting OCR...');
          setUploadStatus("Starting text recognition...");
          
          // Import Tesseract dynamically to avoid build issues
          const Tesseract = await import('tesseract.js');
          
          // Use OCR to extract text from uploaded image
          const { data: { text } } = await Tesseract.recognize(imageDataUrl, 'eng', {
            logger: m => {
              if (m.status === 'recognizing text') {
                const progress = Math.round(m.progress * 100);
                setUploadStatus(`Reading text: ${progress}%`);
                console.log(`OCR Progress: ${progress}%`);
              }
            }
          });
          
          console.log('OCR detected text from upload:', text);
          
          // Extract ISBN patterns - handle OCR misreads like "9lI" instead of "978"
          const potentialIsbns = [];
          
          // Look for various ISBN patterns including OCR errors
          const isbnPatterns = [
            /ISBN[-:\s]*(\d{3}[-\s]?\d{1}[-\s]?\d{3}[-\s]?\d{5}[-\s]?\d{1})/gi,
            /ISBN[-:\s]*(\d{13})/gi,
            /ISBN[-:\s]*(\d{10})/gi,
            // Handle OCR errors: 9lI, 9l, 9I at start
            /9[lI]{1,2}\d{11,}/g,
            /9[lI]\d{12,}/g,
            // Standard 978/979 patterns  
            /978\d{10}/g,
            /979\d{10}/g,
            // Any sequence of 10-13 digits
            /\d{10,13}/g
          ];

          for (const pattern of isbnPatterns) {
            const matches = text.match(pattern);
            if (matches) {
              for (const match of matches) {
                let processedMatch = match;
                
                // Fix common OCR errors at the beginning
                if (match.match(/^9[lI]{1,2}/)) {
                  // Replace 9lI or 9ll or 9II with 978
                  processedMatch = '978' + match.substring(3);
                } else if (match.match(/^9[lI]/)) {
                  // Replace 9l or 9I with 97
                  processedMatch = '97' + match.substring(2);
                }
                
                const cleanIsbn = processedMatch.replace(/[^\d]/g, '');
                
                if (cleanIsbn.length === 10 || cleanIsbn.length === 13) {
                  potentialIsbns.push(cleanIsbn);
                  console.log('Found potential ISBN:', cleanIsbn, 'from OCR text:', match);
                }
              }
            }
          }

          // Prioritize 13-digit ISBNs starting with 978/979
          let detectedIsbn = null;
          for (const isbn of potentialIsbns) {
            if (isbn.length === 13 && (isbn.startsWith('978') || isbn.startsWith('979'))) {
              detectedIsbn = isbn;
              break;
            }
          }
          
          // Fall back to any valid ISBN
          if (!detectedIsbn && potentialIsbns.length > 0) {
            detectedIsbn = potentialIsbns[0];
          }
          
          if (detectedIsbn) {
            console.log('Found ISBN in uploaded image:', detectedIsbn);
            setUploadStatus("Fetching book information...");
            const bookData = await fetchBookInfo(detectedIsbn);
            console.log('Book data fetched:', bookData);
            setUploadStatus("Book found! Adding to library...");
            onScan(detectedIsbn, bookData);
            handleClose();
          } else {
            setError("No ISBN found in the uploaded image. Please try a clearer photo showing the ISBN number or barcode.");
            setIsProcessing(false);
            setUploadStatus("");
          }
          
        } catch (ocrError) {
          console.error('OCR processing failed:', ocrError);
          setError("Failed to read text from image. Please try manual entry.");
          setIsProcessing(false);
        }
      };
      
      reader.onerror = (error) => {
        console.error('FileReader error:', error);
        setError("Failed to read image file. Please try again.");
        setIsProcessing(false);
      };
      
      reader.readAsDataURL(file);
      
    } catch (error) {
      console.error('Photo upload failed:', error);
      setError("Failed to process photo. Please try again.");
      setIsProcessing(false);
    }

    // Clear the file input to allow the same file to be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Start web camera for in-browser photo capture
  const startWebCamera = useCallback(async () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }

    setIsCameraInitializing(true);
    setError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1920, max: 1920 },
          height: { ideal: 1080, max: 1080 }
        }
      });

      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await new Promise<void>((resolve) => {
          if (videoRef.current) {
            videoRef.current.onloadedmetadata = () => {
              setIsCameraInitializing(false);
              setShowWebCamera(true);
              resolve();
            };
          }
        });
      }
    } catch (error) {
      console.error('Camera access failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setError(`Camera access failed: ${errorMessage}. Please allow camera permissions or try manual entry.`);
      setIsCameraInitializing(false);
    }
  }, []);

  // Stop web camera
  const stopWebCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setShowWebCamera(false);
  }, []);

  // Capture photo from web camera
  const capturePhoto = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !streamRef.current) {
      setError("Camera not ready. Please try again.");
      return;
    }

    setIsProcessing(true);
    setError(null);
    setUploadStatus("Capturing image...");

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      if (!context) {
        throw new Error('Could not get canvas context');
      }

      // Set canvas size and capture frame
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Convert to data URL for OCR processing
      const imageDataUrl = canvas.toDataURL('image/jpeg', 0.95);
      
      setUploadStatus("Starting text recognition...");
      
      // Process with OCR
      const Tesseract = await import('tesseract.js');
      
      const { data: { text } } = await Tesseract.recognize(imageDataUrl, 'eng', {
        logger: m => {
          if (m.status === 'recognizing text') {
            const progress = Math.round(m.progress * 100);
            setUploadStatus(`Reading text: ${progress}%`);
          }
        }
      });

      console.log('OCR detected text from camera:', text);

      // Extract ISBN patterns
      const isbnPatterns = [
        /ISBN[-:\s]*(\d{3}[-\s]?\d{1}[-\s]?\d{3}[-\s]?\d{5}[-\s]?\d{1})/gi,
        /ISBN[-:\s]*(\d{1}[-\s]?\d{3}[-\s]?\d{5}[-\s]?\d{1})/gi,
        /ISBN[-:\s]*(\d{13})/gi,
        /ISBN[-:\s]*(\d{10})/gi,
        /(\d{13})/g,
        /(\d{10})/g,
      ];

      let detectedIsbn = null;

      for (const pattern of isbnPatterns) {
        const matches = text.match(pattern);
        if (matches) {
          for (const match of matches) {
            const cleanIsbn = match.replace(/[^\d]/g, '');
            if (cleanIsbn.length === 10 || cleanIsbn.length === 13) {
              detectedIsbn = cleanIsbn;
              break;
            }
          }
          if (detectedIsbn) break;
        }
      }

      if (detectedIsbn) {
        console.log('Found ISBN from camera:', detectedIsbn);
        setUploadStatus("Fetching book information...");
        const bookData = await fetchBookInfo(detectedIsbn);
        setUploadStatus("Book found! Adding to library...");
        onScan(detectedIsbn, bookData);
        handleClose();
      } else {
        setError("No ISBN found in the image. Please try positioning the book's ISBN clearly in view.");
        setIsProcessing(false);
        setUploadStatus("");
      }

    } catch (error) {
      console.error('Photo capture failed:', error);
      setError("Failed to capture and process photo. Please try again.");
      setIsProcessing(false);
      setUploadStatus("");
    }
  }, [fetchBookInfo, onScan]);

  const triggerPhotoUpload = () => {
    if (fileInputRef.current) {
      console.log('Triggering file input click');
      try {
        fileInputRef.current.click();
      } catch (error) {
        console.error('File input click failed:', error);
        setError("Failed to open camera. Please try manual entry.");
      }
    }
  };

  const handleClose = () => {
    setManualCode("");
    setError(null);
    setIsProcessing(false);
    setUploadStatus("");
    // Clear file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    // Stop camera if running
    stopWebCamera();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Camera className="w-5 h-5" />
              Add Book by ISBN
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Manual ISBN Entry */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Type className="w-4 h-4" />
              Manual ISBN Entry (Most Reliable)
            </label>
            <div className="flex gap-2">
              <Input
                placeholder="Enter ISBN (e.g., 9780140449136)"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleManualSubmit()}
                disabled={isProcessing}
              />
              <Button 
                onClick={handleManualSubmit}
                disabled={isProcessing || !manualCode.trim()}
              >
                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add"}
              </Button>
            </div>
          </div>

          {/* Web Camera */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Video className="w-4 h-4" />
              Camera Scanner (Recommended)
            </label>
            
            {!showWebCamera ? (
              <Button 
                onClick={startWebCamera}
                disabled={isProcessing || isCameraInitializing}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isCameraInitializing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Starting Camera...
                  </>
                ) : (
                  <>
                    <Video className="w-4 h-4 mr-2" />
                    Start Camera
                  </>
                )}
              </Button>
            ) : (
              <div className="space-y-3">
                {/* Camera Video Feed */}
                <div className="relative bg-black rounded-lg overflow-hidden">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-64 object-cover"
                  />
                  <div className="absolute inset-0 border-2 border-white/20 rounded-lg pointer-events-none">
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-48 h-24 border-2 border-red-500 rounded bg-red-500/10">
                      <div className="text-white text-xs text-center mt-1">Position ISBN here</div>
                    </div>
                  </div>
                </div>

                {/* Camera Controls */}
                <div className="flex gap-2">
                  <Button 
                    onClick={capturePhoto}
                    disabled={isProcessing}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Camera className="w-4 h-4 mr-2" />
                        Capture
                      </>
                    )}
                  </Button>
                  <Button 
                    onClick={stopWebCamera}
                    disabled={isProcessing}
                    variant="outline"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Photo Upload Fallback */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Upload className="w-4 h-4" />
              Upload from Gallery
            </label>
            <Button 
              onClick={triggerPhotoUpload}
              variant="outline"
              className="w-full"
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing Image...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Photo
                </>
              )}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoUpload}
              onClick={(e) => {
                console.log('File input clicked');
                e.stopPropagation();
              }}
              onFocus={() => console.log('File input focused')}
              onBlur={() => console.log('File input blurred')}
              className="hidden"
              style={{ display: 'none' }}
            />
          </div>

          {/* Hidden canvas for image processing */}
          <canvas ref={canvasRef} className="hidden" />

          {/* Status Display */}
          {uploadStatus && (
            <div className="text-xs text-blue-600 text-center bg-blue-50 p-2 rounded">
              {uploadStatus}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
              {error}
            </div>
          )}

          {/* Help Text */}
          <div className="text-xs text-gray-500 text-center space-y-1">
            <p><strong>Manual entry</strong> is most reliable - ISBN format: 9780140449136</p>
            <p><strong>Photo method</strong> uses your device camera to capture a sharp image</p>
            <p>Point camera at ISBN barcode or printed ISBN number for best results</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}