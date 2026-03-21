import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, ThumbsUp, User } from "lucide-react";
// Note: formatDateRelative will be replaced with a simple date format
function formatDateRelative(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
  
  if (diffInHours < 24) {
    return `${diffInHours}h ago`;
  } else {
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
  }
}

interface BookReview {
  id: number;
  rating: number;
  reviewText?: string;
  helpfulVotes: number;
  createdAt: string;
  user: {
    id: number;
    name: string;
  };
}

interface BookReviewsProps {
  bookId: number;
}

export default function BookReviews({ bookId }: BookReviewsProps) {
  const { data: reviews = [], isLoading } = useQuery({
    queryKey: [`/api/books/${bookId}/reviews`],
    queryFn: async () => {
      const response = await fetch(`/api/books/${bookId}/reviews`);
      if (!response.ok) return [];
      return response.json();
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Star className="w-5 h-5" />
            <span>Reviews</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                <div className="h-3 bg-gray-200 rounded w-full"></div>
                <div className="h-3 bg-gray-200 rounded w-3/4"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (reviews.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Star className="w-5 h-5" />
            <span>Reviews</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <Star className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No reviews yet. Be the first to review this book!</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate average rating
  const averageRating = reviews.reduce((sum: number, review: BookReview) => sum + review.rating, 0) / reviews.length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Star className="w-5 h-5" />
            <span>Reviews ({reviews.length})</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="flex">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`w-4 h-4 ${
                    star <= Math.round(averageRating)
                      ? "fill-yellow-400 text-yellow-400"
                      : "text-gray-300"
                  }`}
                />
              ))}
            </div>
            <span className="text-sm text-gray-600">
              {averageRating.toFixed(1)}
            </span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {reviews.map((review: BookReview) => (
          <div key={review.id} className="border-b border-gray-100 pb-4 last:border-0">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <div className="font-medium text-sm">{review.user.name}</div>
                  <div className="text-xs text-gray-500">
                    {formatDateRelative(review.createdAt)}
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-3 h-3 ${
                      star <= review.rating
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-gray-300"
                    }`}
                  />
                ))}
              </div>
            </div>
            
            {review.reviewText && (
              <p className="text-sm text-gray-700 mb-2">{review.reviewText}</p>
            )}
            
            {review.helpfulVotes > 0 && (
              <div className="flex items-center space-x-1 text-xs text-gray-500">
                <ThumbsUp className="w-3 h-3" />
                <span>{review.helpfulVotes} found helpful</span>
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}