import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const extendRequestSchema = z.object({
  days: z.number().min(1, "Must extend by at least 1 day").max(30, "Cannot extend by more than 30 days"),
  reason: z.string().min(10, "Please provide a reason (minimum 10 characters)"),
});

type ExtendRequestData = z.infer<typeof extendRequestSchema>;

interface ExtendRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  rental: any;
  borrowerName: string;
}

export default function ExtendRequestModal({ 
  isOpen, 
  onClose, 
  rental,
  borrowerName 
}: ExtendRequestModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<ExtendRequestData>({
    resolver: zodResolver(extendRequestSchema),
    defaultValues: {
      days: 7,
      reason: "",
    },
  });

  const extendMutation = useMutation({
    mutationFn: async (data: ExtendRequestData) => {
      const response = await apiRequest("POST", "/api/notifications", {
        userId: rental.lenderId,
        title: "Extension Request",
        message: `${borrowerName} requests to extend "${rental.book.title}" by ${data.days} days. Reason: ${data.reason}`,
        type: "extension_request",
        data: { rentalId: rental.id, requestedDays: data.days, reason: data.reason }
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Extension Request Sent",
        description: "Your request has been sent to the book owner",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      onClose();
      form.reset();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send extension request",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ExtendRequestData) => {
    extendMutation.mutate(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request Extension</DialogTitle>
        </DialogHeader>
        
        <div className="mb-4">
          <p className="text-sm text-gray-600">
            Book: <span className="font-medium">{rental?.book?.title}</span>
          </p>
          <p className="text-sm text-gray-600">
            Current due date: <span className="font-medium">{new Date(rental?.endDate).toLocaleDateString()}</span>
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="days"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Extension Days</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="7"
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason for Extension</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Please explain why you need the extension..."
                      className="min-h-[80px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex space-x-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={extendMutation.isPending}
                className="flex-1"
              >
                {extendMutation.isPending ? "Sending..." : "Send Request"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}