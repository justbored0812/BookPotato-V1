import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import BookCard from "@/components/book-card";
import BorrowBookModal from "@/components/modals/borrow-book-modal";
import { BookWithOwner } from "@shared/schema";

const genres = [
  "All",
  "Fiction",
  "Non-Fiction", 
  "Mystery",
  "Romance",
  "Science Fiction",
  "Fantasy",
  "Biography",
  "History",
  "Self-Help",
  "Technical",
  "Other"
];

export default function Browse() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGenre, setSelectedGenre] = useState("All");
  const [selectedBook, setSelectedBook] = useState<BookWithOwner | null>(null);
  const [showBorrowModal, setShowBorrowModal] = useState(false);
  const [selectedSociety, setSelectedSociety] = useState<any>(null);

  const { data: societies } = useQuery({
    queryKey: ["/api/societies/my"],
  });

  const { data: user } = useQuery({
    queryKey: ["/api/auth/me"],
    queryFn: async () => {
      const response = await fetch("/api/auth/me");
      if (!response.ok) return null;
      return response.json();
    },
  });

  const currentSociety = selectedSociety || societies?.[0];

  // Set default society when societies load
  useEffect(() => {
    if (societies && societies.length > 0 && !selectedSociety) {
      setSelectedSociety(societies[0]);
    }
  }, [societies, selectedSociety]);

  const { data: books = [], isLoading } = useQuery({
    queryKey: ["/api/books/society", currentSociety?.id],
    queryFn: () => {
      return fetch(`/api/books/society/${currentSociety?.id}`)
        .then(r => r.json());
    },
    enabled: !!currentSociety?.id,
  });

  const handleBorrowBook = (book: BookWithOwner) => {
    setSelectedBook(book);
    setShowBorrowModal(true);
  };

  if (!societies || societies.length === 0) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-semibold mb-2">No Societies Found</h2>
        <p className="text-gray-600">Please join a society first to browse books.</p>
      </div>
    );
  }

  if (!currentSociety) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-semibold mb-2">Loading...</h2>
      </div>
    );
  }

  // Filter books based on search and genre
  const filteredBooks = books.filter((book: any) => {
    const matchesSearch = !searchQuery || 
      book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      book.author.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesGenre = selectedGenre === "All" || book.genre === selectedGenre;
    
    return matchesSearch && matchesGenre;
  });

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold mb-2">Browse Books</h1>
        <p className="text-gray-600">
          Discover and borrow books from your community
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search books or authors..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <Select value={selectedGenre} onValueChange={setSelectedGenre}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Genres" />
          </SelectTrigger>
          <SelectContent>
            {genres.map((genre) => (
              <SelectItem key={genre} value={genre}>
                {genre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select 
          value={currentSociety?.id?.toString() || ""}
          onValueChange={(value) => {
            if (value === "all") {
              setSelectedSociety({ id: 0, name: "All Societies" } as any);
            } else {
              const society = societies?.find((s: any) => s.id === parseInt(value));
              setSelectedSociety(society || null);
            }
          }}
        >
          <SelectTrigger className="w-[250px]">
            <SelectValue placeholder="Select society" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Societies</SelectItem>
            {societies?.map((society: any) => (
              <SelectItem key={society.id} value={society.id.toString()}>
                {society.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Results */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <p className="text-sm text-gray-600">
            {isLoading ? "Loading..." : `${filteredBooks.length} books found in ${currentSociety.name}`}
          </p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-64 bg-gray-200 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : filteredBooks.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBooks.map((book: BookWithOwner) => (
              <BookCard
                key={book.id}
                book={book}
                onBorrow={book.isAvailable && book.ownerId !== user?.user?.id ? handleBorrowBook : undefined}
                onEdit={book.ownerId === user?.user?.id ? () => {
                  console.log('Edit book:', book.id);
                } : undefined}
                showOwner={true}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📚</div>
            <h3 className="text-lg font-semibold mb-2">No books found</h3>
            <p className="text-gray-600">
              {searchQuery || selectedGenre !== "All" 
                ? "Try adjusting your search filters"
                : "Be the first to add a book to this society!"
              }
            </p>
          </div>
        )}
      </div>

      <BorrowBookModal
        book={selectedBook}
        open={showBorrowModal}
        onOpenChange={setShowBorrowModal}
      />
    </div>
  );
}