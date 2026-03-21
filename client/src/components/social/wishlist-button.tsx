import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";
import { motion } from "framer-motion";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface WishlistButtonProps {
  bookId: number;
  size?: "sm" | "default" | "lg";
  showText?: boolean;
  className?: string;
}

export default function WishlistButton({ 
  bookId, 
  size = "default", 
  showText = true, 
  className = "" 
}: WishlistButtonProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Check if book is in wishlist
  const { data: isWishlisted = false } = useQuery({
    queryKey: ["/api/wishlist/check", bookId],
    queryFn: async () => {
      try {
        const response = await apiRequest("GET", `/api/wishlist/check/${bookId}`);
        const data = await response.json();
        return data.isWishlisted;
      } catch (error) {
        return false;
      }
    },
  });

  // Toggle wishlist mutation
  const toggleWishlistMutation = useMutation({
    mutationFn: async () => {
      if (isWishlisted) {
        return apiRequest("DELETE", `/api/wishlist/${bookId}`);
      } else {
        return apiRequest("POST", "/api/wishlist", { bookId, priority: 1 });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/wishlist/check", bookId] });
      queryClient.invalidateQueries({ queryKey: ["/api/wishlist"] });
      
      toast({
        title: isWishlisted ? "Removed from Wishlist" : "Added to Wishlist",
        description: isWishlisted 
          ? "Book removed from your wishlist" 
          : "Book added to your wishlist successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update wishlist. Please try again.",
        variant: "destructive",
      });
    }
  });

  const sizeClasses = {
    sm: "h-8 px-2 text-xs",
    default: "h-9 px-3 text-sm",
    lg: "h-10 px-4 text-base"
  };

  const iconSizes = {
    sm: "w-3 h-3",
    default: "w-4 h-4", 
    lg: "w-5 h-5"
  };

  return (
    <Button
      variant={isWishlisted ? "default" : "outline"}
      size={size}
      className={`${sizeClasses[size]} ${className} ${
        isWishlisted 
          ? "bg-red-500 hover:bg-red-600 text-white border-red-500" 
          : "text-red-500 border-red-200 hover:bg-red-50 hover:border-red-300"
      }`}
      onClick={() => toggleWishlistMutation.mutate()}
      disabled={toggleWishlistMutation.isPending}
    >
      <motion.div
        animate={isWishlisted ? { scale: [1, 1.2, 1] } : {}}
        transition={{ duration: 0.3 }}
        className="flex items-center space-x-1"
      >
        <Heart 
          className={`${iconSizes[size]} ${
            isWishlisted ? "fill-current" : ""
          }`}
        />
        {showText && (
          <span className="hidden sm:inline">
            {isWishlisted ? "Wishlisted" : "Wishlist"}
          </span>
        )}
      </motion.div>
    </Button>
  );
}