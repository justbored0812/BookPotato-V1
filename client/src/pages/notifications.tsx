import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { formatDateRelative } from "@/lib/utils";
import { Bell, Clock, CheckCircle, XCircle, BookOpen, Calendar, CreditCard } from "lucide-react";
import { PaymentGatewayModal } from "@/components/modals/payment-gateway-modal";
import type { Notification } from "@shared/schema";

interface ExtensionData {
  rentalId: number;
  extensionDays: number;
  reason: string;
  proposedEndDate: string;
}

interface ReturnRequestData {
  rentalId: number;
  borrowerName: string;
  borrowerPhone: string;
  lenderPhone: string;
  bookTitle: string;
  notes?: string;
}

interface SocietyRequestData {
  requestId: number;
  societyName: string;
  requestedBy: number;
  apartmentCount: number;
  city: string;
}

export default function NotificationsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [paymentModal, setPaymentModal] = useState<{
    isOpen: boolean;
    notification: Notification | null;
    paymentDetails: any;
  }>({
    isOpen: false,
    notification: null,
    paymentDetails: null
  });

  const { data: rawNotifications = [], isLoading } = useQuery({
    queryKey: ["/api/notifications"],
  });

  // Sort notifications: unread first, then by creation date (newest first)
  const notifications = (rawNotifications as Notification[]).sort((a, b) => {
    if (a.isRead !== b.isRead) {
      return a.isRead ? 1 : -1; // Unread (false) comes first
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const respondToExtensionMutation = useMutation({
    mutationFn: async ({ requestId, approved, reason }: { 
      requestId: number; 
      approved: boolean; 
      reason?: string 
    }) => {
      const endpoint = approved 
        ? `/api/rentals/extensions/requests/${requestId}/approve`
        : `/api/rentals/extensions/requests/${requestId}/deny`;
      
      const response = await apiRequest("POST", endpoint, approved ? {} : { reason });
      return response.json();
    },
    onSuccess: (data, variables) => {
      toast({
        title: variables.approved ? "Extension Approved" : "Extension Declined",
        description: variables.approved 
          ? "The extension request has been approved and the borrower has been notified."
          : "The extension request has been declined and the borrower has been notified.",
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/rentals/lent"] });
      setProcessingId(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to respond to extension request",
        variant: "destructive",
      });
      setProcessingId(null);
    },
  });

  // Mutation for processing extension payment
  const processExtensionPaymentMutation = useMutation({
    mutationFn: async (requestId: number) => {
      const response = await apiRequest("POST", `/api/rentals/extensions/requests/${requestId}/pay`);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Payment Successful",
        description: `Extension payment processed successfully! New due date: ${new Date(data.newDueDate).toLocaleDateString()}`,
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/rentals/borrowed"] });
      queryClient.invalidateQueries({ queryKey: ["/api/rentals/lent"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/earnings"] });
      setProcessingId(null);
    },
    onError: (error: any) => {
      toast({
        title: "Payment Failed",
        description: error.message || "Failed to process extension payment",
        variant: "destructive",
      });
      setProcessingId(null);
    },
  });

  const respondToSocietyMutation = useMutation({
    mutationFn: async ({ notificationId, approved, reason }: { 
      notificationId: number; 
      approved: boolean; 
      reason?: string 
    }) => {
      const response = await apiRequest("POST", `/api/notifications/${notificationId}/respond-society`, {
        approved,
        reason
      });
      return response.json();
    },
    onSuccess: (data, variables) => {
      toast({
        title: variables.approved ? "Society Request Approved" : "Society Request Rejected",
        description: variables.approved 
          ? "The society request has been approved and the requester has been notified."
          : "The society request has been rejected and the requester has been notified.",
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/society-requests"] });
      setProcessingId(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to respond to society request",
        variant: "destructive",
      });
      setProcessingId(null);
    },
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: number) => {
      const response = await apiRequest("POST", `/api/notifications/${notificationId}/mark-read`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
  });

  const confirmReturnMutation = useMutation({
    mutationFn: async ({ rentalId }: { rentalId: number }) => {
      const response = await apiRequest("POST", `/api/rentals/${rentalId}/confirm-return`, {});
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Return Confirmed",
        description: "Book return has been confirmed and payments have been processed.",
      });
      
      // Invalidate all relevant cache entries to ensure book availability updates
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/rentals/lent"] });
      queryClient.invalidateQueries({ queryKey: ["/api/books/all"] });
      queryClient.invalidateQueries({ queryKey: ["/api/books/browse"] });
      queryClient.invalidateQueries({ queryKey: ["/api/books/my"] });
      setProcessingId(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to confirm return",
        variant: "destructive",
      });
      setProcessingId(null);
    },
  });

  const handleExtensionResponse = (notification: Notification, approved: boolean) => {
    setProcessingId(notification.id);
    
    // Parse the request ID from notification data
    const extensionData = parseExtensionData(notification.data);
    if (extensionData?.requestId) {
      respondToExtensionMutation.mutate({ 
        requestId: extensionData.requestId, 
        approved,
        reason: approved ? undefined : "Owner declined the request"
      });
    } else {
      toast({
        title: "Error",
        description: "Invalid extension request data",
        variant: "destructive",
      });
      setProcessingId(null);
    }
  };

  const handleExtensionPayment = (notification: Notification) => {
    // Parse the extension data from notification
    const extensionData = parseExtensionData(notification.data);
    if (!extensionData?.requestId) {
      toast({
        title: "Error",
        description: "Invalid extension payment data",
        variant: "destructive",
      });
      return;
    }

    // Open payment gateway modal
    setPaymentModal({
      isOpen: true,
      notification,
      paymentDetails: {
        amount: extensionData.totalAmount,
        description: `Extension for "${extensionData.bookTitle}" - ${extensionData.extensionDays} day(s)`,
        breakdown: {
          extensionFee: extensionData.totalAmount,
          platformCommission: extensionData.platformCommission,
          ownerEarnings: extensionData.lenderEarnings
        }
      }
    });
  };

  const handlePaymentSuccess = () => {
    if (!paymentModal.notification) return;
    
    setProcessingId(paymentModal.notification.id);
    
    const extensionData = parseExtensionData(paymentModal.notification.data);
    if (extensionData?.requestId) {
      processExtensionPaymentMutation.mutate(extensionData.requestId);
    }
    
    // Close payment modal
    setPaymentModal({
      isOpen: false,
      notification: null,
      paymentDetails: null
    });
  };

  const handleConfirmReturn = (rentalId: number) => {
    setProcessingId(rentalId);
    confirmReturnMutation.mutate({ rentalId });
  };

  const handleMarkAsRead = (notificationId: number) => {
    markAsReadMutation.mutate(notificationId);
  };

  const parseExtensionData = (dataString: string | null): ExtensionData | null => {
    if (!dataString) return null;
    try {
      return JSON.parse(dataString);
    } catch {
      return null;
    }
  };

  const parseReturnRequestData = (dataString: string | null): ReturnRequestData | null => {
    if (!dataString) return null;
    try {
      return JSON.parse(dataString);
    } catch {
      return null;
    }
  };

  const parseSocietyRequestData = (dataString: string | null): SocietyRequestData | null => {
    if (!dataString) return null;
    try {
      return JSON.parse(dataString);
    } catch {
      return null;
    }
  };

  const handleSocietyResponse = (notification: Notification, approved: boolean) => {
    const reason = approved ? undefined : prompt("Please provide a reason for rejection (optional):");
    if (!approved && reason === null) return; // User cancelled
    
    setProcessingId(notification.id);
    respondToSocietyMutation.mutate({
      notificationId: notification.id,
      approved,
      reason: reason || undefined
    });
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "extension_request":
        return <Clock className="w-5 h-5 text-blue-500" />;
      case "extension_approved":
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "extension_declined":
        return <XCircle className="w-5 h-5 text-red-500" />;
      case "return_request":
        return <BookOpen className="w-5 h-5 text-orange-500" />;
      case "return_confirmed":
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "payment_received":
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "book_returned":
        return <BookOpen className="w-5 h-5 text-gray-500" />;
      case "society_request":
        return <Bell className="w-5 h-5 text-purple-500" />;
      case "society_approved":
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "society_rejected":
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Bell className="w-5 h-5 text-gray-500" />;
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading notifications...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-3">
            <Bell className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">Notifications</h1>
          </div>
          <Badge variant="secondary" className="text-sm">
            {notifications.filter((n: Notification) => !n.isRead).length} unread
          </Badge>
        </div>

        <div className="space-y-4">
          {notifications.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Bell className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No notifications</h3>
                <p className="text-gray-600">You're all caught up! New notifications will appear here.</p>
              </CardContent>
            </Card>
          ) : (
            notifications.map((notification: Notification) => {
              const extensionData = parseExtensionData(notification.data);
              const returnRequestData = parseReturnRequestData(notification.data);
              const societyRequestData = parseSocietyRequestData(notification.data);
              const isExtensionRequest = notification.type === "extension_request";
              const isExtensionApproved = notification.type === "extension_approved";
              const isReturnRequest = notification.type === "return_request";
              const isSocietyRequest = notification.type === "society_request";
              const isProcessing = processingId === notification.id;

              return (
                <Card key={notification.id} className={`${!notification.isRead ? 'border-blue-200 bg-blue-50/30' : ''}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        {getNotificationIcon(notification.type)}
                        <div className="flex-1">
                          <CardTitle className="text-lg font-medium text-gray-900">
                            {notification.title}
                          </CardTitle>
                          <p className="text-sm text-gray-600 mt-1">
                            {formatDateRelative(new Date(notification.createdAt))}
                          </p>
                        </div>
                      </div>
                      {!notification.isRead && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleMarkAsRead(notification.id)}
                          className="text-xs"
                        >
                          Mark as read
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  
                  <CardContent className="pt-0">
                    <p className="text-gray-700 mb-4">{notification.message}</p>
                    
                    {isExtensionRequest && extensionData && (
                      <div className="bg-gray-50 rounded-lg p-4 mb-4">
                        <h4 className="font-medium text-gray-900 mb-3">Extension Details</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                          <div className="flex items-center space-x-2">
                            <Calendar className="w-4 h-4 text-gray-500" />
                            <span className="text-gray-600">Extension:</span>
                            <span className="font-medium">{extensionData.extensionDays} day(s)</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Calendar className="w-4 h-4 text-gray-500" />
                            <span className="text-gray-600">New return date:</span>
                            <span className="font-medium">
                              {new Date(extensionData.proposedEndDate).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <div className="mt-3">
                          <span className="text-gray-600 text-sm">Reason:</span>
                          <p className="text-gray-800 text-sm mt-1 italic">"{extensionData.reason}"</p>
                        </div>
                      </div>
                    )}

                    {isExtensionApproved && extensionData && extensionData.paymentRequired && (
                      <div className="bg-green-50 rounded-lg p-4 mb-4 border border-green-200">
                        <h4 className="font-medium text-green-900 mb-3">Extension Approved - Payment Required</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm mb-4">
                          <div className="flex items-center space-x-2">
                            <BookOpen className="w-4 h-4 text-green-600" />
                            <span className="text-gray-600">Book:</span>
                            <span className="font-medium">{extensionData.bookTitle}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Calendar className="w-4 h-4 text-green-600" />
                            <span className="text-gray-600">Extension:</span>
                            <span className="font-medium">{extensionData.extensionDays} day(s)</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Calendar className="w-4 h-4 text-green-600" />
                            <span className="text-gray-600">New due date:</span>
                            <span className="font-medium">
                              {new Date(extensionData.newDueDate).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-gray-600">Total amount:</span>
                            <span className="font-medium text-green-700">₹{extensionData.totalAmount}</span>
                          </div>
                        </div>
                        
                        <div className="bg-white rounded-lg p-3 mb-4">
                          <h5 className="text-sm font-medium text-gray-900 mb-2">Payment Breakdown</h5>
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Extension fee:</span>
                              <span>₹{extensionData.totalAmount}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Platform commission:</span>
                              <span>₹{extensionData.platformCommission}</span>
                            </div>
                            <div className="flex justify-between font-medium">
                              <span className="text-gray-600">Owner earnings:</span>
                              <span className="text-green-600">₹{extensionData.lenderEarnings}</span>
                            </div>
                          </div>
                        </div>

                        {extensionData.paymentId ? (
                          <div className="w-full bg-gray-100 text-gray-700 border border-gray-300 rounded px-4 py-2 text-center">
                            <CheckCircle className="w-4 h-4 mr-2 inline text-green-600" />
                            Payment Already Done
                          </div>
                        ) : !notification.isRead ? (
                          <Button
                            onClick={() => handleExtensionPayment(notification)}
                            disabled={isProcessing}
                            className="w-full bg-green-600 hover:bg-green-700"
                          >
                            {isProcessing ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                            ) : (
                              <CreditCard className="w-4 h-4 mr-2" />
                            )}
                            Pay Now - ₹{extensionData.totalAmount}
                          </Button>
                        ) : (
                          <div className="w-full bg-gray-100 text-gray-700 border border-gray-300 rounded px-4 py-2 text-center">
                            <Clock className="w-4 h-4 mr-2 inline text-gray-500" />
                            Payment Pending
                          </div>
                        )}
                      </div>
                    )}

                    {isReturnRequest && returnRequestData && (
                      <div className="bg-orange-50 rounded-lg p-4 mb-4 border border-orange-200">
                        <h4 className="font-medium text-gray-900 mb-3">Return Coordination Details</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm mb-4">
                          <div className="flex items-center space-x-2">
                            <BookOpen className="w-4 h-4 text-orange-500" />
                            <span className="text-gray-600">Book:</span>
                            <span className="font-medium">{returnRequestData.bookTitle}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-gray-600">Borrower:</span>
                            <span className="font-medium">{returnRequestData.borrowerName}</span>
                          </div>
                        </div>
                        
                        <div className="bg-white rounded border p-3 mb-4">
                          <h5 className="font-medium text-gray-900 mb-2">Contact Information</h5>
                          <div className="space-y-2 text-sm">
                            <div>
                              <span className="text-gray-600">Borrower's Phone:</span>
                              <span className="font-mono ml-2 text-blue-600">{returnRequestData.borrowerPhone}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Your Phone:</span>
                              <span className="font-mono ml-2 text-blue-600">{returnRequestData.lenderPhone}</span>
                            </div>
                          </div>
                        </div>

                        {returnRequestData.notes && (
                          <div className="mb-4">
                            <span className="text-gray-600 text-sm">Borrower's message:</span>
                            <p className="text-gray-800 text-sm mt-1 italic bg-white p-2 rounded border">"{returnRequestData.notes}"</p>
                          </div>
                        )}

                        <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mb-4 text-sm">
                          <p className="text-yellow-800">
                            <strong>Next Steps:</strong> Contact the borrower to arrange a meeting spot for the book return. 
                            Once you receive the book back, click "Confirm Return" below to complete the transaction and process payments.
                          </p>
                        </div>
                      </div>
                    )}

                    {isSocietyRequest && societyRequestData && (
                      <div className="bg-purple-50 rounded-lg p-4 mb-4">
                        <h4 className="font-medium text-gray-900 mb-3">Society Request Details</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                          <div className="flex items-center space-x-2">
                            <span className="text-gray-600">Society Name:</span>
                            <span className="font-medium">{societyRequestData.societyName}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-gray-600">Apartment Count:</span>
                            <span className="font-medium">{societyRequestData.apartmentCount}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-gray-600">City:</span>
                            <span className="font-medium">{societyRequestData.city}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-gray-600">Request ID:</span>
                            <span className="font-medium">#{societyRequestData.requestId}</span>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {isReturnRequest && !notification.isRead && returnRequestData && (
                      <div className="flex justify-center">
                        <Button
                          onClick={() => handleConfirmReturn(returnRequestData.rentalId)}
                          disabled={isProcessing}
                          className="bg-green-600 hover:bg-green-700 px-6"
                        >
                          {isProcessing ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                          ) : (
                            <CheckCircle className="w-4 h-4 mr-2" />
                          )}
                          Confirm Book Received & Complete Return
                        </Button>
                      </div>
                    )}

                    {isSocietyRequest && !notification.isRead && (
                      <div className="flex space-x-3">
                        <Button
                          onClick={() => handleSocietyResponse(notification, true)}
                          disabled={isProcessing}
                          className="flex-1 bg-green-600 hover:bg-green-700"
                        >
                          {isProcessing ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                          ) : (
                            <CheckCircle className="w-4 h-4 mr-2" />
                          )}
                          Approve Society
                        </Button>
                        <Button
                          onClick={() => handleSocietyResponse(notification, false)}
                          disabled={isProcessing}
                          variant="destructive"
                          className="flex-1"
                        >
                          {isProcessing ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                          ) : (
                            <XCircle className="w-4 h-4 mr-2" />
                          )}
                          Reject Society
                        </Button>
                      </div>
                    )}
                    
                    {isExtensionRequest && !notification.isRead && (
                      <div className="flex space-x-3">
                        <Button
                          onClick={() => handleExtensionResponse(notification, true)}
                          disabled={isProcessing}
                          className="flex-1 bg-green-600 hover:bg-green-700"
                        >
                          {isProcessing ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                          ) : (
                            <CheckCircle className="w-4 h-4 mr-2" />
                          )}
                          Approve Extension
                        </Button>
                        <Button
                          onClick={() => handleExtensionResponse(notification, false)}
                          disabled={isProcessing}
                          variant="destructive"
                          className="flex-1"
                        >
                          {isProcessing ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                          ) : (
                            <XCircle className="w-4 h-4 mr-2" />
                          )}
                          Decline Extension
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>

      {/* Payment Gateway Modal */}
      {paymentModal.paymentDetails && (
        <PaymentGatewayModal
          isOpen={paymentModal.isOpen}
          onClose={() => setPaymentModal({ isOpen: false, notification: null, paymentDetails: null })}
          onPaymentSuccess={handlePaymentSuccess}
          paymentDetails={paymentModal.paymentDetails}
        />
      )}
    </div>
  );
}