import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  Book, 
  User, 
  Building,
  ArrowRight,
  Check,
  X
} from "lucide-react";

// Mock autofill database - in production this would come from API
const autofillDatabase = {
  books: [
    {
      title: "The Alchemist",
      author: "Paulo Coelho",
      isbn: "9780062315007",
      genre: "Fiction",
      description: "A philosophical novel about a young shepherd's journey",
      coverUrl: "/api/placeholder/200/300",
      dailyFee: 5
    },
    {
      title: "Atomic Habits",
      author: "James Clear", 
      isbn: "9780735211292",
      genre: "Self-Help",
      description: "An Easy & Proven Way to Build Good Habits & Break Bad Ones",
      coverUrl: "/api/placeholder/200/300",
      dailyFee: 8
    },
    {
      title: "The Midnight Library",
      author: "Matt Haig",
      isbn: "9780525559474", 
      genre: "Fiction",
      description: "A novel about life, death, and all the other lives you might have lived",
      coverUrl: "/api/placeholder/200/300",
      dailyFee: 6
    }
  ],
  societies: [
    {
      name: "Green Valley Apartments",
      location: "Sector 18, Noida",
      city: "Noida",
      apartmentCount: 120,
      description: "Modern residential complex with excellent amenities"
    },
    {
      name: "Sunshine Residency",
      location: "Dwarka Sector 10",
      city: "Delhi", 
      apartmentCount: 95,
      description: "Family-friendly community with great connectivity"
    }
  ],
  users: [
    {
      name: "Priya Sharma",
      email: "priya.sharma@example.com",
      phone: "+91 9876543210",
      location: "Green Valley Apartments"
    },
    {
      name: "Rajesh Kumar", 
      email: "rajesh.k@example.com",
      phone: "+91 9876543211",
      location: "Sunshine Residency"
    }
  ]
};

export default function AutofillSuggestions() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<"books" | "societies" | "users">("books");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [selectedItems, setSelectedItems] = useState<any[]>([]);

  useEffect(() => {
    if (searchQuery.length > 1) {
      const filtered = autofillDatabase[selectedCategory].filter(item => {
        const searchFields = selectedCategory === "books" 
          ? [item.title, item.author, item.genre]
          : selectedCategory === "societies"
          ? [item.name, item.location, item.city]
          : [item.name, item.email, item.location];
        
        return searchFields.some(field => 
          field.toLowerCase().includes(searchQuery.toLowerCase())
        );
      });
      setSuggestions(filtered);
    } else {
      setSuggestions([]);
    }
  }, [searchQuery, selectedCategory]);

  const addToSelection = (item: any) => {
    if (!selectedItems.find(selected => selected.id === item.id)) {
      setSelectedItems([...selectedItems, { ...item, id: Date.now() + Math.random() }]);
    }
  };

  const removeFromSelection = (itemId: any) => {
    setSelectedItems(selectedItems.filter(item => item.id !== itemId));
  };

  const applyAutofill = () => {
    // In production, this would populate forms or trigger API calls
    console.log("Applying autofill with:", selectedItems);
    alert(`Would autofill ${selectedItems.length} items in production`);
  };

  const CategoryIcon = selectedCategory === "books" ? Book : selectedCategory === "societies" ? Building : User;

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Smart Autofill</h1>
          <p className="text-gray-600">
            Quickly fill forms using our comprehensive database of books, societies, and users
          </p>
        </div>

        {/* Category Selection */}
        <div className="flex justify-center space-x-2">
          {(["books", "societies", "users"] as const).map(category => (
            <Button
              key={category}
              variant={selectedCategory === category ? "default" : "outline"}
              onClick={() => {
                setSelectedCategory(category);
                setSearchQuery("");
                setSuggestions([]);
              }}
              className="capitalize"
            >
              {category === "books" && <Book className="w-4 h-4 mr-2" />}
              {category === "societies" && <Building className="w-4 h-4 mr-2" />}
              {category === "users" && <User className="w-4 h-4 mr-2" />}
              {category}
            </Button>
          ))}
        </div>

        {/* Search */}
        <Card>
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder={`Search ${selectedCategory}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Suggestions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <CategoryIcon className="w-5 h-5" />
                <span>Suggestions</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {suggestions.length === 0 && searchQuery.length > 1 && (
                  <div className="text-center py-8 text-gray-500">
                    No {selectedCategory} found matching your search
                  </div>
                )}
                
                {suggestions.length === 0 && searchQuery.length <= 1 && (
                  <div className="text-center py-8 text-gray-500">
                    Start typing to see suggestions
                  </div>
                )}

                {suggestions.map((item, index) => (
                  <Card key={index} className="border-gray-200 hover:border-blue-300 transition-colors cursor-pointer">
                    <CardContent className="p-3" onClick={() => addToSelection(item)}>
                      {selectedCategory === "books" && (
                        <div className="space-y-2">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-medium">{item.title}</h4>
                              <p className="text-sm text-gray-600">by {item.author}</p>
                            </div>
                            <Badge variant="secondary">{item.genre}</Badge>
                          </div>
                          <p className="text-xs text-gray-500">{item.description}</p>
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium">₹{item.dailyFee}/day</span>
                            <ArrowRight className="w-4 h-4 text-gray-400" />
                          </div>
                        </div>
                      )}

                      {selectedCategory === "societies" && (
                        <div className="space-y-2">
                          <h4 className="font-medium">{item.name}</h4>
                          <p className="text-sm text-gray-600">{item.location}</p>
                          <div className="flex justify-between items-center">
                            <Badge variant="outline">{item.apartmentCount} apartments</Badge>
                            <ArrowRight className="w-4 h-4 text-gray-400" />
                          </div>
                        </div>
                      )}

                      {selectedCategory === "users" && (
                        <div className="space-y-2">
                          <h4 className="font-medium">{item.name}</h4>
                          <p className="text-sm text-gray-600">{item.email}</p>
                          <p className="text-xs text-gray-500">{item.location}</p>
                          <ArrowRight className="w-4 h-4 text-gray-400" />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Selected Items */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Selected ({selectedItems.length})</span>
                {selectedItems.length > 0 && (
                  <Button onClick={applyAutofill} size="sm">
                    <Check className="w-4 h-4 mr-2" />
                    Apply Autofill
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {selectedItems.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No items selected yet
                  </div>
                )}

                {selectedItems.map((item) => (
                  <Card key={item.id} className="border-green-200 bg-green-50">
                    <CardContent className="p-3">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          {selectedCategory === "books" && (
                            <div>
                              <h4 className="font-medium">{item.title}</h4>
                              <p className="text-sm text-gray-600">by {item.author}</p>
                            </div>
                          )}
                          {selectedCategory === "societies" && (
                            <div>
                              <h4 className="font-medium">{item.name}</h4>
                              <p className="text-sm text-gray-600">{item.location}</p>
                            </div>
                          )}
                          {selectedCategory === "users" && (
                            <div>
                              <h4 className="font-medium">{item.name}</h4>
                              <p className="text-sm text-gray-600">{item.email}</p>
                            </div>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFromSelection(item.id)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Demo Note */}
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <p className="text-sm text-blue-800">
              <strong>Demo Feature:</strong> This autofill system demonstrates how BookShare can 
              intelligently suggest books, societies, and user information based on our comprehensive 
              database. In production, this would integrate with form fields across the platform.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}