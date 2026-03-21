import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface AvailabilityAlertButtonProps {
  bookId: number;
  bookTitle: string;
  isAvailable: boolean;
  size?: "sm" | "default" | "lg";
  className?: string;
}

export default function AvailabilityAlertButton({
  bookId,
  bookTitle,
  isAvailable,
  size = "sm",
  className = ""
}: AvailabilityAlertButtonProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Don't show button if book is available
  if (isAvailable) return null;

  // Check if user has alert for this book
  const { data: alertStatus, isLoading } = useQuery({
    queryKey: [`/api/books/${bookId}/availability-alert`],
    queryFn: async () => {
      const response = await fetch(`/api/books/${bookId}/availability-alert`);
      if (!response.ok) return { hasAlert: false };
      return response.json();
    },
  });

  // Create alert mutation
  const createAlertMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/books/${bookId}/availability-alert`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/books/${bookId}/availability-alert`] });
      toast({
        title: "Alert Set!",
        description: `You'll be notified when "${bookTitle}" becomes available.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to set availability alert",
        variant: "destructive",
      });
    },
  });

  // Remove alert mutation
  const removeAlertMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("DELETE", `/api/books/${bookId}/availability-alert`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/books/${bookId}/availability-alert`] });
      toast({
        title: "Alert Removed",
        description: `You'll no longer be notified about "${bookTitle}".`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove availability alert",
        variant: "destructive",
      });
    },
  });

  const hasAlert = alertStatus?.hasAlert || false;
  const isPending = createAlertMutation.isPending || removeAlertMutation.isPending;

  const handleClick = () => {
    if (hasAlert) {
      removeAlertMutation.mutate();
    } else {
      createAlertMutation.mutate();
    }
  };

  return (
    <Button
      onClick={handleClick}
      disabled={isLoading || isPending}
      size="sm"
      variant={hasAlert ? "default" : "outline"}
      className={`${className} ${hasAlert ? "bg-blue-600 hover:bg-blue-700 text-white" : ""} text-xs px-2 py-1 h-6`}
    >
      {isLoading || isPending ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : hasAlert ? (
        <>
          <BellOff className="h-3 w-3 mr-1" />
          Cancel Alert
        </>
      ) : (
        <>
          <Bell className="h-3 w-3 mr-1" />
          Notify Me
        </>
      )}
    </Button>
  );
}