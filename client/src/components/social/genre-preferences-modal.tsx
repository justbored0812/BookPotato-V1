import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { BookOpen, Heart, Star } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface GenrePreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
  isFirstTime?: boolean;
}

const GENRES = [
  { name: "Fiction", emoji: "📚", description: "Novels, stories, imaginative literature" },
  { name: "Non-Fiction", emoji: "📖", description: "Real-world topics, educational content" },
  { name: "Educational Textbook", emoji: "🎓", description: "Academic books, study materials, textbooks" },
  { name: "Science", emoji: "🧪", description: "Scientific topics, research, STEM subjects" },
  { name: "Technology & Engineering", emoji: "⚙️", description: "Engineering, technical subjects, innovation" },
  { name: "Mystery", emoji: "🔍", description: "Suspense, detective stories, thrillers" },
  { name: "Romance", emoji: "💝", description: "Love stories, romantic fiction" },
  { name: "Science Fiction", emoji: "🚀", description: "Futuristic, space, technology themes" },
  { name: "Fantasy", emoji: "🧙", description: "Magic, mythical creatures, otherworldly" },
  { name: "Biography & Autobiography", emoji: "👤", description: "Life stories of real people" },
  { name: "History", emoji: "🏛️", description: "Historical events, past civilizations" },
  { name: "Self-Help", emoji: "💪", description: "Personal development, motivation" },
  { name: "Business & Economics", emoji: "💼", description: "Entrepreneurship, management, finance" },
  { name: "Health", emoji: "🏥", description: "Wellness, medical, fitness topics" },
  { name: "Cooking", emoji: "👨‍🍳", description: "Recipes, culinary arts, food culture" },
  { name: "Travel", emoji: "✈️", description: "Adventures, destinations, cultures" },
  { name: "Art", emoji: "🎨", description: "Visual arts, creativity, design" },
  { name: "Technology", emoji: "💻", description: "Programming, digital trends, innovation" },
  { name: "Philosophy", emoji: "🤔", description: "Deep thinking, life questions, ethics" },
  { name: "Juvenile Fiction", emoji: "👶", description: "Children's fiction, young reader stories" },
  { name: "Juvenile Nonfiction", emoji: "🧒", description: "Educational books for children" },
];

export default function GenrePreferencesModal({ isOpen, onClose, isFirstTime = false }: GenrePreferencesModalProps) {
  const [selectedGenres, setSelectedGenres] = useState<{ [key: string]: number }>({});
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const savePreferencesMutation = useMutation({
    mutationFn: async (preferences: { genre: string; preferenceLevel: number }[]) => {
      return apiRequest("POST", "/api/user/genre-preferences", { preferences });
    },
    onSuccess: () => {
      toast({
        title: isFirstTime ? "Welcome to BookShare!" : "Preferences Updated",
        description: isFirstTime 
          ? "Your reading preferences have been saved. Let's find books you'll love!"
          : "Your genre preferences have been updated successfully.",
      });
      // Invalidate multiple related queries to refresh recommendations
      queryClient.invalidateQueries({ queryKey: ["/api/user/genre-preferences"] });
      queryClient.invalidateQueries({ queryKey: ["/api/books/recommended"] });
      onClose();
      
      // Small delay to ensure data refreshes properly
      setTimeout(() => {
        window.location.reload();
      }, 500);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save preferences. Please try again.",
        variant: "destructive",
      });
    }
  });

  const toggleGenre = (genre: string) => {
    setSelectedGenres(prev => {
      const current = prev[genre] || 0;
      if (current === 0) {
        return { ...prev, [genre]: 5 }; // Love it
      } else if (current === 5) {
        return { ...prev, [genre]: 3 }; // Like it
      } else if (current === 3) {
        return { ...prev, [genre]: 1 }; // Not interested
      } else {
        const { [genre]: _, ...rest } = prev;
        return rest; // Remove from selection
      }
    });
  };

  const getPreferenceLabel = (level: number) => {
    switch (level) {
      case 5: return { text: "Love", color: "bg-red-500 text-white", icon: "❤️" };
      case 3: return { text: "Like", color: "bg-blue-500 text-white", icon: "👍" };
      case 1: return { text: "Skip", color: "bg-gray-500 text-white", icon: "👎" };
      default: return null;
    }
  };

  const handleSave = () => {
    const preferences = Object.entries(selectedGenres).map(([genre, level]) => ({
      genre,
      preferenceLevel: level
    }));

    if (preferences.length === 0) {
      toast({
        title: "No preferences selected",
        description: "Please select at least one genre preference.",
        variant: "destructive",
      });
      return;
    }

    savePreferencesMutation.mutate(preferences);
  };

  return (
    <Dialog open={isOpen} onOpenChange={isFirstTime ? undefined : onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            {isFirstTime ? "🎯 What do you love to read?" : "📚 Update Your Reading Preferences"}
          </DialogTitle>
          <p className="text-center text-gray-600 mt-2">
            {isFirstTime 
              ? "Help us recommend books you'll absolutely love by selecting your favorite genres!"
              : "Update your preferences to get better book recommendations."
            }
          </p>
        </DialogHeader>

        <div className="mt-6">
          <div className="text-sm text-gray-500 mb-4 text-center">
            Tap genres to cycle: Not Selected → ❤️ Love → 👍 Like → 👎 Skip → Not Selected
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {GENRES.map((genre, index) => {
              const preference = getPreferenceLabel(selectedGenres[genre.name]);
              
              return (
                <motion.div
                  key={genre.name}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card 
                    className={`cursor-pointer transition-all duration-200 hover:scale-105 ${
                      preference ? preference.color : 'hover:border-blue-300'
                    }`}
                    onClick={() => toggleGenre(genre.name)}
                  >
                    <CardContent className="p-3 text-center">
                      <div className="text-2xl mb-1">{genre.emoji}</div>
                      <div className={`font-medium text-sm ${preference ? 'text-white' : 'text-gray-800'}`}>
                        {genre.name}
                      </div>
                      <div className={`text-xs mt-1 ${preference ? 'text-white/90' : 'text-gray-500'}`}>
                        {genre.description}
                      </div>
                      {preference && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="mt-2"
                        >
                          <Badge variant="secondary" className="text-xs">
                            {preference.icon} {preference.text}
                          </Badge>
                        </motion.div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>

          {Object.keys(selectedGenres).length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 p-4 bg-blue-50 rounded-lg"
            >
              <h3 className="font-medium text-blue-900 mb-2">Your Preferences:</h3>
              <div className="flex flex-wrap gap-2">
                {Object.entries(selectedGenres).map(([genre, level]) => {
                  const pref = getPreferenceLabel(level);
                  return (
                    <Badge key={genre} variant="outline" className="bg-white">
                      {genre} {pref?.icon}
                    </Badge>
                  );
                })}
              </div>
            </motion.div>
          )}

          <div className="flex justify-between mt-6">
            {!isFirstTime && (
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
            )}
            <Button 
              onClick={handleSave}
              disabled={savePreferencesMutation.isPending || Object.keys(selectedGenres).length === 0}
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white ml-auto"
            >
              {savePreferencesMutation.isPending ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"
                />
              ) : null}
              {isFirstTime ? "Get Started!" : "Save Preferences"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}