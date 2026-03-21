import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Type, X, Loader2, Camera, Upload } from "lucide-react";

interface SimpleISBNScannerProps {
  onScan: (barcode: string, bookData?: any) => void;
  onClose: () => void;
  isOpen: boolean;
}

export default function SimpleISBNScanner({ onScan, onClose, isOpen }: SimpleISBNScannerProps) {
  const [manualCode, setManualCode] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Validate and clean ISBN
  const validateISBN = (input: string): string | null => {
    // Remove all non-digit characters
    const cleaned = input.replace(/[^\d]/g, '');
    
    // Check if it's a valid length
    if (cleaned.length === 10 || cleaned.length === 13) {
      return cleaned;
    }
    
    // If it's close to valid length, try to fix common issues
    if (cleaned.length >= 9 && cleaned.length <= 14) {
      // Try adding missing digit for 12-digit sequences (missing check digit)
      if (cleaned.length === 12) {
        return cleaned + '0'; // Add dummy check digit
      }
      // Try removing extra digit for 14-digit sequences
      if (cleaned.length === 14) {
        return cleaned.substring(1); // Remove first digit
      }
      // For 9-digit, add leading 9 if missing
      if (cleaned.length === 9) {
        return '9' + cleaned;
      }
    }
    
    return null;
  };

  // Fetch book information from ISBN
  const fetchBookInfo = async (isbn: string) => {
    try {
      // Try multiple book APIs
      const apis = [
        `https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`,
        `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`,
      ];

      for (const apiUrl of apis) {
        try {
          const response = await fetch(apiUrl);
          if (response.ok) {
            const data = await response.json();
            
            // Process OpenLibrary response
            if (apiUrl.includes('openlibrary.org')) {
              const bookKey = `ISBN:${isbn}`;
              if (data[bookKey]) {
                const book = data[bookKey];
                return {
                  title: book.title || '',
                  author: book.authors?.[0]?.name || '',
                  isbn: isbn,
                  imageUrl: book.cover?.medium || null,
                  description: book.description || ''
                };
              }
            }
            
            // Process Google Books response
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
          console.log(`API ${apiUrl} failed:`, apiError);
          continue;
        }
      }
      
      return null;
    } catch (error) {
      console.error('All book APIs failed:', error);
      return null;
    }
  };

  // Handle manual ISBN submission
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
    setUploadStatus("Looking up book information...");

    try {
      const bookData = await fetchBookInfo(validISBN);
      console.log('Book information found:', bookData);
      setUploadStatus("Book found! Adding to library...");
      onScan(validISBN, bookData);
      handleClose();
    } catch (error) {
      console.error('Manual submission failed:', error);
      setError("Failed to process ISBN. Please try again.");
      setIsProcessing(false);
      setUploadStatus("");
    }
  };

  // Handle photo upload with basic OCR
  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      console.log('No file selected');
      return;
    }

    console.log('Photo selected:', file.name, file.type, file.size);
    setIsProcessing(true);
    setError(null);
    setUploadStatus("Processing image...");

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const imageDataUrl = e.target?.result as string;
          if (!imageDataUrl) {
            throw new Error('Failed to read image file');
          }

          setUploadStatus("Reading text from image...");
          
          // Import Tesseract dynamically
          const Tesseract = await import('tesseract.js');
          
          const { data: { text } } = await Tesseract.recognize(imageDataUrl, 'eng', {
            logger: m => {
              if (m.status === 'recognizing text') {
                const progress = Math.round(m.progress * 100);
                setUploadStatus(`Reading text: ${progress}%`);
              }
            }
          });

          console.log('OCR detected text:', text);
          
          // Extract all number sequences from OCR text
          const numberSequences = text.match(/\d+/g) || [];
          console.log('Found number sequences:', numberSequences);
          
          // Also look for sequences with common OCR misreads
          const ocrPatterns = [
            /9[lI]\d{11,}/g,  // 9l or 9I followed by digits
            /978\d{10}/g,     // Standard ISBN-13 starting with 978
            /979\d{10}/g,     // Standard ISBN-13 starting with 979
            /\d{10,13}/g      // Any 10-13 digit sequence
          ];
          
          const additionalSequences = [];
          for (const pattern of ocrPatterns) {
            const matches = text.match(pattern);
            if (matches) {
              additionalSequences.push(...matches);
            }
          }
          
          // Combine and process all sequences
          const allSequences = [...numberSequences, ...additionalSequences];
          console.log('All number sequences found:', allSequences);
          
          let detectedISBN = null;
          
          // Look for valid ISBN patterns in the sequences
          for (const sequence of allSequences) {
            // Fix common OCR errors before validation
            let cleanSequence = sequence;
            if (sequence.match(/^9[lI]/)) {
              cleanSequence = '978' + sequence.substring(2);
            }
            
            const validISBN = validateISBN(cleanSequence);
            if (validISBN) {
              detectedISBN = validISBN;
              console.log('Valid ISBN found:', validISBN, 'from sequence:', sequence);
              break;
            }
          }

          if (detectedISBN) {
            setUploadStatus("Fetching book information...");
            const bookData = await fetchBookInfo(detectedISBN);
            setUploadStatus("Book found! Adding to library...");
            onScan(detectedISBN, bookData);
            handleClose();
          } else {
            setError("No valid ISBN found in image. Please try manual entry or a clearer photo.");
            setIsProcessing(false);
            setUploadStatus("");
          }

        } catch (ocrError) {
          console.error('OCR processing failed:', ocrError);
          setError("Failed to read text from image. Please try manual entry.");
          setIsProcessing(false);
          setUploadStatus("");
        }
      };

      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Photo upload failed:', error);
      setError("Failed to process image. Please try manual entry.");
      setIsProcessing(false);
      setUploadStatus("");
    }
  };

  const triggerPhotoUpload = () => {
    console.log('Triggering photo upload');
    if (fileInputRef.current) {
      console.log('File input found, clicking...');
      fileInputRef.current.click();
    } else {
      console.error('File input ref not found');
      setError("Photo upload not available. Please try manual entry.");
    }
  };

  const handleClose = () => {
    setManualCode("");
    setError(null);
    setIsProcessing(false);
    setUploadStatus("");
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            Add Book by ISBN
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
          {/* Manual ISBN Entry - Primary Method */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Type className="w-4 h-4" />
              Enter ISBN Number (Recommended)
            </label>
            <div className="flex gap-2">
              <Input
                placeholder="Enter ISBN (e.g., 9780140449136)"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleManualSubmit()}
                disabled={isProcessing}
                className="flex-1"
              />
              <Button 
                onClick={handleManualSubmit}
                disabled={isProcessing || !manualCode.trim()}
              >
                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add"}
              </Button>
            </div>
            <div className="text-xs text-gray-500">
              You can find the ISBN on the back cover or copyright page
            </div>
          </div>

          {/* Photo Upload - Secondary Method */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Upload className="w-4 h-4" />
              Or Upload Photo (Experimental)
            </label>
            
            <div className="flex gap-2">
              <Button 
                onClick={triggerPhotoUpload}
                variant="outline"
                className="flex-1"
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Camera className="w-4 h-4 mr-2" />
                    Camera
                  </>
                )}
              </Button>
              
              <label 
                htmlFor="photo-upload"
                className="flex-1 cursor-pointer"
              >
                <Button 
                  type="button"
                  variant="outline"
                  className="w-full"
                  disabled={isProcessing}
                  asChild
                >
                  <span>
                    <Upload className="w-4 h-4 mr-2" />
                    Gallery
                  </span>
                </Button>
              </label>
            </div>
            
            <input
              id="photo-upload"
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
            />
            
            <div className="text-xs text-gray-500">
              Take a clear photo showing the ISBN number clearly
            </div>
          </div>

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
        </div>
      </DialogContent>
    </Dialog>
  );
}