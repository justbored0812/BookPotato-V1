import { useState, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Camera, Upload, BookOpen, Check, X, Loader2, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/hooks/use-user";

interface DetectedBook {
  id: string;
  title: string;
  author: string;
  isbn?: string;
  genre?: string;
  description?: string;
  imageUrl?: string;
  dailyFee: string;
  sellingPrice?: string;
  condition: string;
  selected: boolean;
  isbnLoading?: boolean;
  isbnFound?: boolean;
}

interface BulkBookUploadProps {
  onClose: () => void;
  onBooksAdded: () => void;
}

export function BulkBookUpload({ onClose, onBooksAdded }: BulkBookUploadProps) {
  const { user } = useUser();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  
  const [step, setStep] = useState<'capture' | 'processing' | 'review' | 'uploading'>('capture');
  

  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [detectedBooks, setDetectedBooks] = useState<DetectedBook[]>([]);
  const [processingProgress, setProcessingProgress] = useState(0);


  // Process bookshelf image using OpenAI Vision
  const processImageMutation = useMutation({
    mutationFn: async (imageBase64: string) => {
      console.log("📸 Starting image analysis request...");
      const response = await fetch("/api/books/analyze-bookshelf", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Credentials": "include"
        },
        credentials: "include",
        body: JSON.stringify({ image: imageBase64 }),
      });
      
      console.log("📊 Response status:", response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ Analysis failed:", response.status, errorText);
        throw new Error(`Failed to analyze image: ${response.status} ${errorText}`);
      }
      
      const data = await response.json();
      console.log("✅ Analysis successful, books found:", data.books?.length || 0);
      return data;
    },
    onSuccess: (data) => {
      console.log("🎉 Processing successful response:", data);
      if (data.fallbackMode) {
        toast({ 
          title: "AI Analysis Unavailable", 
          description: "AI quota exhausted. Trying alternative providers...",
          variant: "destructive" 
        });
        setStep('capture');
        return;
      }
      
      if (!data.books || data.books.length === 0) {
        toast({ 
          title: "No books detected", 
          description: "Try taking a clearer photo with better lighting",
          variant: "destructive" 
        });
        setStep('capture');
        return;
      }

      const books: DetectedBook[] = data.books.map((book: any, index: number) => ({
        id: `book-${index}`,
        title: book.title,
        author: book.author,
        genre: book.genre || "Fiction",
        description: book.description || "",
        dailyFee: "10.00",
        sellingPrice: "",
        condition: "Good",
        selected: true,
        isbnLoading: false,
        isbnFound: false,
      }));
      setDetectedBooks(books);
      setStep('review');
      
      // Start fetching ISBNs for each book
      books.forEach((book, index) => {
        fetchISBNForBook(index, book.title, book.author);
      });
    },
    onError: (error: any) => {
      console.error("🚨 Bulk upload mutation error:", error);
      toast({ 
        title: "Image analysis failed", 
        description: error.message || "Please try again with a different image",
        variant: "destructive" 
      });
      setStep('capture');
    },
  });

  // Fetch ISBN for individual book
  const fetchISBNForBook = async (index: number, title: string, author: string) => {
    setDetectedBooks(prev => prev.map((book, i) => 
      i === index ? { ...book, isbnLoading: true } : book
    ));

    try {
      const response = await fetch("/api/books/find-isbn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, author, region: "IN" }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setDetectedBooks(prev => prev.map((book, i) => 
          i === index ? { 
            ...book, 
            isbn: data.isbn,
            genre: data.genre || book.genre,
            description: data.description || book.description,
            imageUrl: data.imageUrl,
            isbnLoading: false,
            isbnFound: true 
          } : book
        ));
      } else {
        setDetectedBooks(prev => prev.map((book, i) => 
          i === index ? { ...book, isbnLoading: false, isbnFound: false } : book
        ));
      }
    } catch (error) {
      setDetectedBooks(prev => prev.map((book, i) => 
        i === index ? { ...book, isbnLoading: false, isbnFound: false } : book
      ));
    }
  };

  // Upload selected books
  const uploadBooksMutation = useMutation({
    mutationFn: async (books: DetectedBook[]) => {
      const selectedBooks = books.filter(book => book.selected);
      const response = await fetch("/api/books/bulk-add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          books: selectedBooks.map(book => ({
            title: book.title,
            author: book.author,
            isbn: book.isbn || "",
            genre: book.genre,
            description: book.description,
            imageUrl: book.imageUrl,
            condition: book.condition,
            dailyFee: parseFloat(book.dailyFee),
            sellingPrice: book.sellingPrice ? parseFloat(book.sellingPrice) : null,
          }))
        }),
      });
      if (!response.ok) throw new Error("Failed to upload books");
      return response.json();
    },
    onSuccess: (data) => {
      toast({ 
        title: `Successfully added ${data.addedCount} books!`,
        description: "Your books are now available for borrowing."
      });
      onBooksAdded();
      onClose();
    },
    onError: () => {
      toast({ title: "Failed to upload books", variant: "destructive" });
    },
  });

  const handleFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      setCapturedImage(base64);
      setStep('processing');
      
      // Convert to base64 without data URL prefix
      const base64Data = base64.split(',')[1];
      processImageMutation.mutate(base64Data);
    };
    reader.readAsDataURL(file);
  };

  const handleCameraCapture = () => {
    cameraInputRef.current?.click();
  };

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const updateBookField = (index: number, field: keyof DetectedBook, value: any) => {
    setDetectedBooks(prev => prev.map((book, i) => 
      i === index ? { ...book, [field]: value } : book
    ));
  };

  const toggleBookSelection = (index: number) => {
    setDetectedBooks(prev => prev.map((book, i) => 
      i === index ? { ...book, selected: !book.selected } : book
    ));
  };

  const handleUploadBooks = () => {
    const selectedBooks = detectedBooks.filter(book => book.selected);
    if (selectedBooks.length === 0) {
      toast({ title: "Please select at least one book", variant: "destructive" });
      return;
    }

    setStep('uploading');
    uploadBooksMutation.mutate(detectedBooks);
  };

  if (step === 'capture') {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Bulk Book Upload
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-6 w-6 p-0" 
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </CardTitle>
          <p className="text-muted-foreground">
            Take a photo of your bookshelf or upload an existing image. We'll automatically detect the books and help you add them.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Button 
              onClick={handleCameraCapture} 
              className="h-32 flex-col gap-2"
              variant="outline"
            >
              <Camera className="h-8 w-8" />
              Take Photo
            </Button>
            <Button 
              onClick={handleFileSelect} 
              className="h-32 flex-col gap-2"
              variant="outline"
            >
              <Upload className="h-8 w-8" />
              Upload Image
            </Button>
          </div>

          <div className="text-sm text-muted-foreground space-y-2">
            <p><strong>Tips for best results:</strong></p>
            <ul className="list-disc list-inside space-y-1">
              <li>Ensure book titles are clearly visible</li>
              <li>Good lighting helps with text recognition</li>
              <li>Try to capture book spines straight-on</li>
              <li>Avoid shadows and reflections</li>
            </ul>
          </div>

          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
            className="hidden"
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
            className="hidden"
          />
        </CardContent>
      </Card>
    );
  }

  if (step === 'processing') {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              Analyzing Your Bookshelf...
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-6 w-6 p-0" 
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {capturedImage && (
            <div className="w-full">
              <img 
                src={capturedImage} 
                alt="Captured bookshelf" 
                className="w-full h-48 object-cover rounded-lg border"
              />
            </div>
          )}
          <div className="text-center space-y-2">
            <p className="text-muted-foreground">
              Please wait while we identify the books in your image...
            </p>
            <p className="text-sm text-muted-foreground">
              This may take a few moments
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (step === 'review') {
    const selectedCount = detectedBooks.filter(book => book.selected).length;
    
    return (
      <Card className="w-full max-w-6xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Review Detected Books ({detectedBooks.length} found)
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{selectedCount} selected</Badge>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-6 w-6 p-0" 
                onClick={onClose}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardTitle>
          <p className="text-muted-foreground">
            Review the detected books, edit details, and select which ones to add to your library.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">Select</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Author</TableHead>
                  <TableHead>ISBN</TableHead>
                  <TableHead>Condition</TableHead>
                  <TableHead>Daily Fee (₹)</TableHead>
                  <TableHead>Selling Price (₹)</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {detectedBooks.map((book, index) => (
                  <TableRow key={book.id}>
                    <TableCell>
                      <Checkbox
                        checked={book.selected}
                        onCheckedChange={() => toggleBookSelection(index)}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={book.title}
                        onChange={(e) => updateBookField(index, 'title', e.target.value)}
                        className="min-w-[200px]"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={book.author}
                        onChange={(e) => updateBookField(index, 'author', e.target.value)}
                        className="min-w-[150px]"
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Input
                          value={book.isbn || ''}
                          onChange={(e) => updateBookField(index, 'isbn', e.target.value)}
                          placeholder="ISBN"
                          className="min-w-[120px]"
                        />
                        {book.isbnLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Select 
                        value={book.condition} 
                        onValueChange={(value) => updateBookField(index, 'condition', value)}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Excellent">Excellent</SelectItem>
                          <SelectItem value="Very Good">Very Good</SelectItem>
                          <SelectItem value="Good">Good</SelectItem>
                          <SelectItem value="Fair">Fair</SelectItem>
                          <SelectItem value="Poor">Poor</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={book.dailyFee}
                        onChange={(e) => updateBookField(index, 'dailyFee', e.target.value)}
                        className="w-20"
                        min="1"
                        step="0.01"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={book.sellingPrice || ''}
                        onChange={(e) => updateBookField(index, 'sellingPrice', e.target.value)}
                        placeholder="Optional"
                        className="w-24"
                        min="0"
                        step="0.01"
                      />
                    </TableCell>
                    <TableCell>
                      {book.isbnLoading ? (
                        <Badge variant="secondary">
                          <Loader2 className="h-3 w-3 animate-spin mr-1" />
                          Finding ISBN...
                        </Badge>
                      ) : book.isbnFound ? (
                        <Badge variant="default">
                          <Check className="h-3 w-3 mr-1" />
                          ISBN Found
                        </Badge>
                      ) : (
                        <Badge variant="destructive">
                          <X className="h-3 w-3 mr-1" />
                          No ISBN
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex justify-between items-center">
            <div className="space-x-2">
              <Button variant="outline" onClick={() => setStep('capture')}>
                Back
              </Button>
              <Button
                variant="outline"
                onClick={() => setDetectedBooks(prev => prev.map(book => ({ ...book, selected: true })))}
              >
                Select All
              </Button>
              <Button
                variant="outline"
                onClick={() => setDetectedBooks(prev => prev.map(book => ({ ...book, selected: false })))}
              >
                Clear All
              </Button>
            </div>
            <Button
              onClick={handleUploadBooks}
              disabled={selectedCount === 0}
            >
              Add {selectedCount} Books
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (step === 'uploading') {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              Adding Books to Your Library...
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-6 w-6 p-0" 
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center space-y-2">
            <p className="text-muted-foreground">
              Please wait while we add your books...
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return null;
}