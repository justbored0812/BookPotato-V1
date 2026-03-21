import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Search, 
  Filter, 
  MapPin, 
  Star, 
  Book,
  Users,
  SlidersHorizontal,
  X
} from "lucide-react";
import BookCard from "@/components/book-card";
import BookDetailsModal from "@/components/book-details-modal";
import BorrowBookModal from "@/components/modals/borrow-book-modal";
import type { BookWithOwner } from "@shared/schema";

const genres = [
  "Fiction", "Non-Fiction", "Mystery", "Romance", "Science Fiction", 
  "Fantasy", "Biography", "History", "Self-Help", "Business",
  "Technology", "Health", "Travel", "Cooking", "Art"
];

const conditions = ["New", "Like New", "Good", "Fair"];
const sortOptions = [
  { value: "newest", label: "Newest First" },
  { value: "oldest", label: "Oldest First" },
  { value: "price_low", label: "Price: Low to High" },
  { value: "price_high", label: "Price: High to Low" },
  { value: "rating", label: "Highest Rated" },
  { value: "distance", label: "Nearest to Me" }
];

interface Filters {
  search: string;
  genres: string[];
  priceRange: [number, number];
  conditions: string[];
  societies: string[];
  availability: "all" | "available" | "rented";
  sortBy: string;
  location: string;
}

export default function EnhancedBrowse() {
  const [filters, setFilters] = useState<Filters>({
    search: "",
    genres: [],
    priceRange: [0, 100],
    conditions: [],
    societies: [],
    availability: "all",
    sortBy: "newest",
    location: ""
  });

  const [showFilters, setShowFilters] = useState(false);
  const [selectedBook, setSelectedBook] = useState<BookWithOwner | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showBorrowModal, setShowBorrowModal] = useState(false);
  const [initialTransactionType, setInitialTransactionType] = useState<"borrow" | "buy">("borrow");

  // Fetch books with advanced filtering
  const { data: booksResponse, isLoading } = useQuery({
    queryKey: ["/api/books/browse", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.search) params.append("search", filters.search);
      if (filters.genres.length) params.append("genres", filters.genres.join(","));
      params.append("minPrice", filters.priceRange[0].toString());
      params.append("maxPrice", filters.priceRange[1].toString());
      if (filters.conditions.length) params.append("conditions", filters.conditions.join(","));
      if (filters.societies.length) params.append("societies", filters.societies.join(","));
      params.append("availability", filters.availability);
      params.append("sortBy", filters.sortBy);
      if (filters.location) params.append("location", filters.location);

      const response = await fetch(`/api/books/browse?${params.toString()}`);
      const data = await response.json();
      return data;
    }
  });

  // Ensure books is always an array
  const books = Array.isArray(booksResponse) ? booksResponse : [];

  // Fetch user's societies for filtering (only show hubs user is part of)
  const { data: societies = [] } = useQuery({
    queryKey: ["/api/societies/my"],
  });

  // Get current user data
  const { data: user } = useQuery({
    queryKey: ["/api/auth/me"],
    queryFn: async () => {
      const response = await fetch("/api/auth/me");
      if (!response.ok) return null;
      return response.json();
    },
  });

  // Pre-select all user's societies when they load
  useEffect(() => {
    if (societies && Array.isArray(societies) && societies.length > 0) {
      const allSocietyIds = societies.map((s: any) => s.id.toString());
      setFilters(prev => {
        // Only update if societies filter is empty (initial load)
        if (prev.societies.length === 0) {
          return { ...prev, societies: allSocietyIds };
        }
        return prev;
      });
    }
  }, [societies]);

  const updateFilter = (key: keyof Filters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const toggleGenre = (genre: string) => {
    setFilters(prev => ({
      ...prev,
      genres: prev.genres.includes(genre) 
        ? prev.genres.filter(g => g !== genre)
        : [...prev.genres, genre]
    }));
  };

  const toggleCondition = (condition: string) => {
    setFilters(prev => ({
      ...prev,
      conditions: prev.conditions.includes(condition)
        ? prev.conditions.filter(c => c !== condition)
        : [...prev.conditions, condition]
    }));
  };

  const toggleSociety = (societyId: string) => {
    setFilters(prev => ({
      ...prev,
      societies: prev.societies.includes(societyId)
        ? prev.societies.filter(s => s !== societyId)
        : [...prev.societies, societyId]
    }));
  };

  const clearFilters = () => {
    // When clearing filters, reset societies to all user's societies
    const allSocietyIds = societies && Array.isArray(societies) 
      ? societies.map((s: any) => s.id.toString()) 
      : [];
    
    setFilters({
      search: "",
      genres: [],
      priceRange: [0, 100],
      conditions: [],
      societies: allSocietyIds,
      availability: "all",
      sortBy: "newest",
      location: ""
    });
  };

  const activeFilterCount = 
    filters.genres.length + 
    filters.conditions.length + 
    filters.societies.length + 
    (filters.availability !== "all" ? 1 : 0) +
    (filters.location ? 1 : 0);

  return (
    <div className="container mx-auto p-6">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Browse Books</h1>
          <p className="text-gray-600">Discover amazing books in your community</p>
        </div>

        {/* Search and Quick Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col gap-4">
              {/* Search */}
              <div className="w-full relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search books, authors, or keywords..."
                  value={filters.search}
                  onChange={(e) => updateFilter("search", e.target.value)}
                  className="pl-10 h-12 text-base"
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                {/* Location Filter */}
                <div className="flex-1 sm:min-w-0">
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Location..."
                      value={filters.location}
                      onChange={(e) => updateFilter("location", e.target.value)}
                      className="pl-10 h-10"
                    />
                  </div>
                </div>

                {/* Sort */}
                <div className="flex-1 sm:min-w-0">
                  <Select value={filters.sortBy} onValueChange={(value) => updateFilter("sortBy", value)}>
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Sort by..." />
                    </SelectTrigger>
                    <SelectContent>
                      {sortOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Advanced Filters Toggle */}
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center space-x-2"
              >
                <SlidersHorizontal className="w-4 h-4" />
                <span>Filters</span>
                {activeFilterCount > 0 && (
                  <Badge variant="secondary" className="ml-1">
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Advanced Filters Panel */}
        {showFilters && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center space-x-2">
                  <Filter className="w-5 h-5" />
                  <span>Advanced Filters</span>
                </CardTitle>
                <div className="flex items-center space-x-2">
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    Clear All
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setShowFilters(false)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Price Range */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Price Range (₹/day)</Label>
                <div className="px-3">
                  <Slider
                    value={filters.priceRange}
                    onValueChange={(value) => updateFilter("priceRange", value)}
                    max={100}
                    min={0}
                    step={5}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>₹{filters.priceRange[0]}</span>
                    <span>₹{filters.priceRange[1]}</span>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Genres */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Genres</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {genres.map(genre => (
                    <div key={genre} className="flex items-center space-x-2">
                      <Checkbox
                        id={`genre-${genre}`}
                        checked={filters.genres.includes(genre)}
                        onCheckedChange={() => toggleGenre(genre)}
                      />
                      <Label htmlFor={`genre-${genre}`} className="text-sm">
                        {genre}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Book Condition */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Book Condition</Label>
                <div className="flex flex-wrap gap-2">
                  {conditions.map(condition => (
                    <div key={condition} className="flex items-center space-x-2">
                      <Checkbox
                        id={`condition-${condition}`}
                        checked={filters.conditions.includes(condition)}
                        onCheckedChange={() => toggleCondition(condition)}
                      />
                      <Label htmlFor={`condition-${condition}`} className="text-sm">
                        {condition}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Hubs */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Hubs</Label>
                <div className="space-y-4 max-h-60 overflow-y-auto">
                  {/* Societies */}
                  {(() => {
                    const societyHubs = ((societies as any[]) || []).filter((h: any) => h.hubType === 'society' || !h.hubType);
                    return societyHubs.length > 0 && (
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-gray-600">Society</Label>
                        <div className="grid gap-2 pl-2">
                          {societyHubs.map((society: any) => (
                            <div key={society.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={`society-${society.id}`}
                                checked={filters.societies.includes(society.id.toString())}
                                onCheckedChange={() => toggleSociety(society.id.toString())}
                              />
                              <Label htmlFor={`society-${society.id}`} className="text-sm">
                                {society.name}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                  
                  {/* Schools */}
                  {(() => {
                    const schoolHubs = ((societies as any[]) || []).filter((h: any) => h.hubType === 'school');
                    return schoolHubs.length > 0 && (
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-gray-600">School</Label>
                        <div className="grid gap-2 pl-2">
                          {schoolHubs.map((school: any) => (
                            <div key={school.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={`school-${school.id}`}
                                checked={filters.societies.includes(school.id.toString())}
                                onCheckedChange={() => toggleSociety(school.id.toString())}
                              />
                              <Label htmlFor={`school-${school.id}`} className="text-sm">
                                {school.name}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                  
                  {/* Offices */}
                  {(() => {
                    const officeHubs = ((societies as any[]) || []).filter((h: any) => h.hubType === 'office');
                    return officeHubs.length > 0 && (
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-gray-600">Office</Label>
                        <div className="grid gap-2 pl-2">
                          {officeHubs.map((office: any) => (
                            <div key={office.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={`office-${office.id}`}
                                checked={filters.societies.includes(office.id.toString())}
                                onCheckedChange={() => toggleSociety(office.id.toString())}
                              />
                              <Label htmlFor={`office-${office.id}`} className="text-sm">
                                {office.name}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              <Separator />

              {/* Availability */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Availability</Label>
                <div className="flex space-x-4">
                  {[
                    { value: "all", label: "All Books" },
                    { value: "available", label: "Available Now" },
                    { value: "rented", label: "Currently Rented" }
                  ].map(option => (
                    <div key={option.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={`availability-${option.value}`}
                        checked={filters.availability === option.value}
                        onCheckedChange={() => updateFilter("availability", option.value)}
                      />
                      <Label htmlFor={`availability-${option.value}`} className="text-sm">
                        {option.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Results */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h2 className="text-xl font-semibold">
              {isLoading ? "Loading..." : `${books.length} books found`}
            </h2>
            {activeFilterCount > 0 && (
              <Badge variant="outline" className="flex items-center space-x-1">
                <Filter className="w-3 h-3" />
                <span>{activeFilterCount} filters active</span>
              </Badge>
            )}
          </div>
        </div>

        {/* Books Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse h-80">
                <CardContent className="p-4">
                  <div className="w-full h-40 bg-gray-200 rounded-lg mb-4"></div>
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-200 rounded"></div>
                    <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    <div className="h-8 bg-gray-200 rounded mt-4"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : books.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Book className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No books found</h3>
              <p className="text-gray-600 mb-4">
                Try adjusting your filters or search terms to find more books.
              </p>
              <Button onClick={clearFilters} variant="outline">
                Clear All Filters
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {books.map((book: BookWithOwner) => (
              <div
                key={book.id}
                onClick={() => {
                  setSelectedBook(book);
                  setShowDetailsModal(true);
                }}
              >
                <BookCard
                  book={book}
                  showOwner={true}
                  variant="grid"
                  onBorrow={book.isAvailable && book.ownerId !== user?.user?.id ? () => {
                    setSelectedBook(book);
                    setInitialTransactionType("borrow");
                    setShowBorrowModal(true);
                  } : undefined}
                  onBuy={book.ownerId !== user?.user?.id ? () => {
                    setSelectedBook(book);
                    setInitialTransactionType("buy");
                    setShowBorrowModal(true);
                  } : undefined}
                  onEdit={book.ownerId === user?.user?.id ? () => {
                    // TODO: Add edit functionality
                    console.log('Edit book:', book.id);
                  } : undefined}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Book Details Modal */}
      <BookDetailsModal
        book={selectedBook}
        open={showDetailsModal}
        onOpenChange={(open) => {
          setShowDetailsModal(open);
          if (!open) {
            setSelectedBook(null);
          }
        }}
        onBorrow={(book) => {
          setShowDetailsModal(false);
          setInitialTransactionType("borrow");
          setShowBorrowModal(true);
        }}
        onBuy={(book) => {
          setShowDetailsModal(false);
          setInitialTransactionType("buy");
          setShowBorrowModal(true);
        }}
        user={user?.user}
      />

      {/* Borrow Book Modal */}
      <BorrowBookModal
        book={selectedBook}
        open={showBorrowModal}
        onOpenChange={(open) => {
          setShowBorrowModal(open);
          if (!open) {
            setSelectedBook(null);
          }
        }}
        initialTransactionType={initialTransactionType}
      />
    </div>
  );
}