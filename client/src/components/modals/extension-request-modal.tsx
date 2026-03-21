import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Calendar, Clock, User, Book, IndianRupee, CheckCircle, Send } from "lucide-react";

const extensionRequestSchema = z.object({
  extensionDays: z.number().min(1, "Extension must be at least 1 day").max(30, "Extension cannot exceed 30 days"),
});

type ExtensionRequestForm = z.infer<typeof extensionRequestSchema>;

interface ExtensionRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  rental: any;
}

export default function ExtensionRequestModal({ isOpen, onClose, rental }: ExtensionRequestModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<'calculate' | 'confirm' | 'sending' | 'sent'>('calculate');
  const [costData, setCostData] = useState<any>(null);

  const form = useForm<ExtensionRequestForm>({
    resolver: zodResolver(extensionRequestSchema),
    defaultValues: {
      extensionDays: 7,
    },
  });

  const extensionDays = form.watch("extensionDays");

  // Mutation to calculate extension cost
  const calculateCostMutation = useMutation({
    mutationFn: async (data: ExtensionRequestForm) => {
      const response = await apiRequest("POST", "/api/rentals/extensions/calculate", {
        rentalId: rental.id,
        extensionDays: data.extensionDays,
      });
      return response.json();
    },
    onSuccess: (data) => {
      setCostData(data);
      setStep('confirm');
    },
    onError: (error: any) => {
      toast({
        title: "Calculation Failed",
        description: error.message || "There was an error calculating the extension cost.",
        variant: "destructive",
      });
    },
  });

  // Mutation to send extension request to owner
  const sendRequestMutation = useMutation({
    mutationFn: async (data: ExtensionRequestForm) => {
      setStep('sending');
      
      const response = await apiRequest("POST", "/api/rentals/extensions/request", {
        rentalId: rental.id,
        extensionDays: data.extensionDays,
      });
      return response.json();
    },
    onSuccess: (data) => {
      setStep('sent');
      toast({
        title: "Extension Request Sent",
        description: "Your extension request has been sent to the book owner for approval.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
    onError: (error: any) => {
      toast({
        title: "Request Failed",
        description: error.message || "There was an error sending your extension request.",
        variant: "destructive",
      });
      setStep('confirm');
    },
  });

  const handleClose = () => {
    onClose();
    form.reset();
    setStep('calculate');
    setCostData(null);
  };

  const handleCalculate = (data: ExtensionRequestForm) => {
    calculateCostMutation.mutate(data);
  };

  const handleSendRequest = () => {
    const formData = form.getValues();
    sendRequestMutation.mutate(formData);
  };

  const handleBack = () => {
    setStep('calculate');
    setCostData(null);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(date);
  };

  const calculateNewDueDate = () => {
    const currentDate = new Date(rental.endDate);
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + extensionDays);
    return newDate;
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Request Book Extension
          </DialogTitle>
        </DialogHeader>

        {step === 'calculate' && (
          <div className="space-y-6">
            <div className="bg-muted/50 p-4 rounded-lg space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Book className="h-4 w-4" />
                Book Details
              </div>
              <div className="text-sm text-muted-foreground">
                <p><strong>Title:</strong> {rental.book.title}</p>
                <p><strong>Author:</strong> {rental.book.author}</p>
                <p><strong>Owner:</strong> {rental.lender.name}</p>
                <p><strong>Current Due Date:</strong> {formatDate(new Date(rental.endDate))}</p>
              </div>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleCalculate)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="extensionDays"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Extension Days</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="Enter number of days"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {extensionDays > 0 && (
                  <div className="bg-blue-50 p-3 rounded-lg text-sm">
                    <div className="flex items-center gap-2 font-medium text-blue-800">
                      <Clock className="h-4 w-4" />
                      New Due Date Preview
                    </div>
                    <p className="text-blue-700 mt-1">
                      {formatDate(calculateNewDueDate())}
                    </p>
                  </div>
                )}

                <div className="flex gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleClose}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={calculateCostMutation.isPending || extensionDays <= 0}
                    className="flex-1"
                  >
                    {calculateCostMutation.isPending ? "Calculating..." : "Calculate Cost"}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        )}

        {step === 'confirm' && costData && (
          <div className="space-y-6">
            <div className="bg-muted/50 p-4 rounded-lg space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <IndianRupee className="h-4 w-4" />
                Extension Cost Breakdown
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Extension Days:</span>
                  <span>{extensionDays} days</span>
                </div>
                <div className="flex justify-between">
                  <span>Daily Fee:</span>
                  <span>₹{costData.dailyFee}</span>
                </div>
                <div className="flex justify-between">
                  <span>Extension Fee:</span>
                  <span>₹{costData.totalExtensionFee}</span>
                </div>
                <div className="flex justify-between">
                  <span>Platform Commission:</span>
                  <span>₹{costData.platformCommission}</span>
                </div>
                <div className="border-t pt-2 flex justify-between font-medium">
                  <span>Owner Earnings:</span>
                  <span>₹{costData.lenderEarnings}</span>
                </div>
              </div>

              <div className="bg-green-50 p-3 rounded-lg mt-3">
                <div className="text-sm font-medium text-green-800">New Due Date</div>
                <div className="text-green-700">{formatDate(calculateNewDueDate())}</div>
              </div>
            </div>

            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
              <div className="text-sm text-yellow-800">
                <strong>Note:</strong> This request will be sent to {rental.lender.name} for approval. 
                You'll only be charged if they approve your extension request.
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleBack}
                className="flex-1"
              >
                Back
              </Button>
              <Button
                onClick={handleSendRequest}
                disabled={sendRequestMutation.isPending}
                className="flex-1"
              >
                <Send className="h-4 w-4 mr-2" />
                Send Request
              </Button>
            </div>
          </div>
        )}

        {step === 'sending' && (
          <div className="space-y-6 text-center py-8">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
            <div>
              <h3 className="font-medium">Sending Request</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Please wait while we send your extension request to the book owner...
              </p>
            </div>
          </div>
        )}

        {step === 'sent' && (
          <div className="space-y-6 text-center py-8">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
            <div>
              <h3 className="font-medium text-green-700">Request Sent Successfully!</h3>
              <p className="text-sm text-muted-foreground mt-2">
                Your extension request has been sent to {rental.lender.name}. 
                You'll receive a notification once they respond.
              </p>
              <p className="text-xs text-muted-foreground mt-3">
                If approved, you'll be able to complete payment to confirm the extension.
              </p>
            </div>
            
            <Button onClick={handleClose} className="w-full">
              Close
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}