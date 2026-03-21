import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Camera, X, Loader2, Images } from "lucide-react";
import EnhancedBarcodeScanner from "@/components/enhanced-barcode-scanner-working";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const genres = [
  "Fiction",
  "Non-Fiction",
  "Academic",
  "Biography",
  "Self-Help",
  "Mystery",
  "Romance",
  "Science Fiction",
  "Fantasy",
  "History",
  "Business",
  "Health",
];

const conditions = [
  "Excellent",
  "Very Good", 
  "Good",
  "Fair",
  "Poor",
];

const bookSchema = z.object({
  title: z.string().min(1, "Title is required"),
  author: z.string().min(1, "Author is required"),
  isbn: z.string().min(1, "ISBN is required"),
  genre: z.string().min(1, "Genre is required"),
  description: z.string().optional(),
  imageUrl: z.string().optional(),
  coverImageUrl: z.string().optional(),
  condition: z.string().min(1, "Condition is required"),
  dailyFee: z.string().min(1, "Daily fee is required").refine(
    (val) => !isNaN(Number(val)) && Number(val) > 0,
    "Daily fee must be a positive number"
  ),
  sellingPrice: z.string().optional().refine(
    (val) => !val || (Number(val) >= 0),
    "Selling price must be a positive number or empty"
  ),
});

type BookFormData = z.infer<typeof bookSchema>;

interface AddBookModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editBook?: any;
  onOpenBulkUpload?: () => void;
}

export default function AddBookModal({ open, onOpenChange, editBook, onOpenBulkUpload }: AddBookModalProps) {
  const [scanMode, setScanMode] = useState(false);
  const [isLookingUpISBN, setIsLookingUpISBN] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: societies } = useQuery({
    queryKey: ["/api/societies/my"],
  });

  const form = useForm<BookFormData>({
    resolver: zodResolver(bookSchema),
    defaultValues: {
      title: "",
      author: "",
      isbn: "",
      genre: "",
      description: "",
      imageUrl: "",
      coverImageUrl: "",
      condition: "",
      dailyFee: "",
      sellingPrice: "",
    },
  });

  // Update form when editBook changes
  useEffect(() => {
    console.log('📝 AddBookModal editBook changed:', editBook);
    if (editBook && open) {
      console.log('📝 Resetting form with editBook data:', editBook);
      form.reset({
        title: editBook.title || "",
        author: editBook.author || "",
        isbn: editBook.isbn || "",
        genre: editBook.genre || "",
        description: editBook.description || "",
        imageUrl: editBook.imageUrl || "",
        coverImageUrl: editBook.coverImageUrl || "",
        condition: editBook.condition || "",
        dailyFee: editBook.dailyFee?.toString() || "",
        sellingPrice: editBook.sellingPrice?.toString() || "",
        societyIds: editBook.societyId ? [editBook.societyId] : [],
        schoolIds: [],
        officeIds: [],
      });
    } else if (open && !editBook) {
      // Reset to empty form for new books
      form.reset({
        title: "",
        author: "",
        isbn: "",
        genre: "",
        description: "",
        imageUrl: "",
        coverImageUrl: "",
        condition: "",
        dailyFee: "",
        sellingPrice: "",
        societyIds: [],
        schoolIds: [],
        officeIds: [],
      });
    }
  }, [editBook, open, societies, form]);

  const addBookMutation = useMutation({
    mutationFn: async (data: BookFormData) => {
      const method = editBook ? "PATCH" : "POST";
      const url = editBook ? `/api/books/${editBook.id}` : "/api/books";
      
      const response = await apiRequest(method, url, {
        title: data.title,
        author: data.author,
        isbn: data.isbn,
        genre: data.genre,
        description: data.description,
        imageUrl: data.imageUrl,
        coverImageUrl: data.coverImageUrl,
        condition: data.condition,
        dailyFee: Number(data.dailyFee),
        sellingPrice: data.sellingPrice ? Number(data.sellingPrice) : null,
      });
      return response.json();
    },
    onSuccess: () => {
      const successMessage = editBook ? "Book updated successfully!" : "Book added to your library successfully!";
      toast({
        title: "Success",
        description: successMessage,
      });
      // Invalidate all book-related queries
      queryClient.invalidateQueries({ queryKey: ["/api/books"] });
      queryClient.invalidateQueries({ queryKey: ["/api/books/my"] });
      queryClient.invalidateQueries({ queryKey: ["/api/books/all"] });
      queryClient.invalidateQueries({ queryKey: ["/api/societies"] });
      queryClient.invalidateQueries({ queryKey: ["/api/societies/my"] });
      form.reset();
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add book",
        variant: "destructive",
      });
    },
  });

  // Function to fetch book information from ISBN
  const fetchBookInfo = async (isbn: string) => {
    if (!isbn || isbn.length < 10) return null;
    
    setIsLookingUpISBN(true);
    try {
      // Try Google Books API first
      const response = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`);
      const data = await response.json();
      
      if (data.items && data.items.length > 0) {
        const book = data.items[0].volumeInfo;
        return {
          title: book.title || '',
          author: book.authors ? book.authors.join(', ') : '',
          description: book.description || '',
          imageUrl: book.imageLinks?.thumbnail || book.imageLinks?.smallThumbnail || null,
          categories: book.categories || []
        };
      }
      
      // Fallback to Open Library API
      const openLibResponse = await fetch(`https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`);
      const openLibData = await openLibResponse.json();
      
      const bookKey = `ISBN:${isbn}`;
      if (openLibData[bookKey]) {
        const book = openLibData[bookKey];
        return {
          title: book.title || '',
          author: book.authors ? book.authors.map((a: any) => a.name).join(', ') : '',
          description: book.notes || book.description || '',
          imageUrl: book.cover?.medium || book.cover?.large || book.cover?.small || null
        };
      }
      
      return null;
    } catch (error) {
      console.error('Failed to fetch book info:', error);
      return null;
    } finally {
      setIsLookingUpISBN(false);
    }
  };

  // Handle ISBN field changes with automatic lookup
  const handleISBNChange = async (isbn: string) => {
    form.setValue("isbn", isbn);
    
    // Only lookup if ISBN is complete (10 or 13 digits)
    const cleanISBN = isbn.replace(/[^\d]/g, '');
    if (cleanISBN.length === 10 || cleanISBN.length === 13) {
      const bookData = await fetchBookInfo(cleanISBN);
      
      if (bookData) {
        // Auto-fill form fields if they're empty
        if (bookData.title && !form.getValues("title")) {
          form.setValue("title", bookData.title);
        }
        if (bookData.author && !form.getValues("author")) {
          form.setValue("author", bookData.author);
        }
        if (bookData.description && !form.getValues("description")) {
          form.setValue("description", bookData.description);
        }
        if (bookData.imageUrl && !form.getValues("imageUrl")) {
          form.setValue("imageUrl", bookData.imageUrl);
          form.setValue("coverImageUrl", bookData.imageUrl);
        }
        
        // Map categories to our available genres
        if (bookData.categories && bookData.categories.length > 0 && !form.getValues("genre")) {
          const category = bookData.categories[0];
          const mappedGenre = genres.find(g => 
            category.toLowerCase().includes(g.toLowerCase()) ||
            g.toLowerCase().includes(category.toLowerCase())
          );
          if (mappedGenre) {
            form.setValue("genre", mappedGenre);
          }
        }
        
        const filledFields = [];
        if (bookData.title) filledFields.push("title");
        if (bookData.author) filledFields.push("author");
        if (bookData.description) filledFields.push("description");
        if (bookData.imageUrl) filledFields.push("cover image");
        
        toast({
          title: "Book Details Found!",
          description: `Auto-filled ${filledFields.join(", ")} for "${bookData.title}"`,
        });
      }
    }
  };

  const onSubmit = (data: BookFormData) => {
    addBookMutation.mutate(data);
  };

  const handleBarcodeScanned = async (barcode: string, bookData?: any) => {
    console.log("Barcode scanned:", barcode);
    
    try {
      if (bookData) {
        // Use book data provided by enhanced scanner
        form.setValue("isbn", barcode);
        form.setValue("title", bookData.title || "");
        form.setValue("author", bookData.author || "");
        form.setValue("description", bookData.description || "");
        
        // Set cover image URLs
        if (bookData.imageUrl) {
          form.setValue("imageUrl", bookData.imageUrl);
          form.setValue("coverImageUrl", bookData.imageUrl);
        }
        
        // Map categories to our available genres
        let genre = "Fiction";
        if (bookData.categories && bookData.categories.length > 0) {
          const category = bookData.categories[0];
          const mappedGenre = genres.find(g => 
            category.toLowerCase().includes(g.toLowerCase()) ||
            g.toLowerCase().includes(category.toLowerCase())
          );
          if (mappedGenre) {
            genre = mappedGenre;
          }
        }
        form.setValue("genre", genre);
        
        const filledFields = [];
        if (bookData.title) filledFields.push("title");
        if (bookData.author) filledFields.push("author");
        if (bookData.description) filledFields.push("description");
        if (bookData.imageUrl) filledFields.push("cover image");
        
        toast({
          title: "Book Details Found!",
          description: `Auto-filled ${filledFields.join(", ")} for "${bookData.title}"`,
        });
      } else {
        // Just set the ISBN if no data found
        form.setValue("isbn", barcode);
        toast({
          title: "Barcode Scanned",
          description: "ISBN filled. Please enter book details manually.",
        });
      }
    } catch (error) {
      console.error("Error fetching book data:", error);
      form.setValue("isbn", barcode);
      toast({
        title: "Barcode Scanned",
        description: "ISBN filled. Please enter book details manually.",
      });
    }
  };



  if (!(societies as any[])?.length) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Book</DialogTitle>
          </DialogHeader>
          <div className="text-center py-8">
            <p className="text-text-secondary mb-4">
              You need to join a society before adding books.
            </p>
            <Button onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>{editBook ? "Edit Book" : "Add Book to Library"}</DialogTitle>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        {scanMode ? (
          <div className="space-y-6">
            <div className="bg-surface rounded-xl p-6 text-center">
              <Camera className="h-12 w-12 text-primary mx-auto mb-4" />
              <h3 className="font-semibold text-text-primary mb-2">
                Scan Book Barcode
              </h3>
              <p className="text-sm text-text-secondary mb-4">
                Position the barcode within the frame
              </p>
              <div className="space-y-2">
                <Button onClick={() => setScanMode(true)} className="w-full">
                  <Camera className="h-4 w-4 mr-2" />
                  Scan Barcode
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {/* TODO: Add photo barcode functionality */}}
                  className="w-full"
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Click Photo of Barcode
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setScanMode(false)}
                  className="w-full"
                >
                  Enter Details Manually
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {!editBook && onOpenBulkUpload && (
              <div className="space-y-3 pb-4 border-b">
                <Button
                  type="button"
                  variant="default"
                  className="w-full"
                  onClick={() => {
                    onOpenChange(false);
                    onOpenBulkUpload();
                  }}
                  data-testid="button-open-bulk-upload"
                >
                  <Images className="h-4 w-4 mr-2" />
                  Add Books In Bulk
                </Button>
                <p className="text-center text-sm text-text-secondary">
                  Or Add Books One by One
                </p>
              </div>
            )}
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="isbn"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        ISBN (Fill it for auto populating details)
                        {isLookingUpISBN && <Loader2 className="h-4 w-4 animate-spin" />}
                      </FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Enter ISBN (e.g., 9780123456789)" 
                          {...field}
                          onChange={(e) => handleISBNChange(e.target.value)}
                          disabled={isLookingUpISBN}
                        />
                      </FormControl>
                      <FormMessage />
                      {isLookingUpISBN && (
                        <p className="text-sm text-muted-foreground">
                          Looking up book details...
                        </p>
                      )}
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Book Title</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter book title" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="author"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Author</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter author name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="genre"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Genre</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select genre" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {genres.map((genre) => (
                            <SelectItem key={genre} value={genre}>
                              {genre}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="condition"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Condition</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select condition" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {conditions.map((condition) => (
                            <SelectItem key={condition} value={condition}>
                              {condition}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="dailyFee"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Daily Rental Fee (₹)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="0" 
                          min="1"
                          step="0.01"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="sellingPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Selling Price (If you want to sell) - ₹</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="Leave empty if not for sale" 
                          min="0"
                          step="0.01"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (Optional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Brief description of the book"
                          className="resize-none"
                          rows={3}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Cover Image Preview */}
                {(form.watch("coverImageUrl") || form.watch("imageUrl")) && (
                  <div className="space-y-2">
                    <FormLabel>Book Cover Preview</FormLabel>
                    <div className="flex items-center space-x-3">
                      <div className="w-16 h-20 bg-gray-100 rounded overflow-hidden flex-shrink-0">
                        <img 
                          src={form.watch("coverImageUrl") || form.watch("imageUrl")} 
                          alt="Book cover preview"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                            (e.target as HTMLElement).nextElementSibling?.classList.remove('hidden');
                          }}
                        />
                        <div className="hidden w-full h-full flex items-center justify-center text-xs text-gray-500">
                          No image
                        </div>
                      </div>
                      <div className="text-sm text-gray-600">
                        Cover image will be displayed in book listings
                      </div>
                    </div>
                  </div>
                )}

                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={addBookMutation.isPending}
                >
                  {addBookMutation.isPending ? "Adding..." : "Add to Library"}
                </Button>
              </form>
            </Form>
          </div>
        )}
        
        <EnhancedBarcodeScanner
          isOpen={scanMode}
          onScan={handleBarcodeScanned}
          onClose={() => setScanMode(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
