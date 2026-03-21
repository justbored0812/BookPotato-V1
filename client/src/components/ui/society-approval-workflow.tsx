import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Building, 
  Users, 
  MapPin, 
  Clock, 
  CheckCircle, 
  XCircle,
  AlertTriangle,
  Send,
  FileText
} from "lucide-react";

interface SocietyRequest {
  id: number;
  name: string;
  description: string;
  city: string;
  location: string;
  apartmentCount: number;
  requestedBy: number;
  requesterName: string;
  status: "pending" | "approved" | "rejected";
  reviewReason?: string;
  createdAt: string;
  reviewedAt?: string;
}

interface SocietyApprovalWorkflowProps {
  isAdmin?: boolean;
}

export default function SocietyApprovalWorkflow({ isAdmin = false }: SocietyApprovalWorkflowProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedRequest, setSelectedRequest] = useState<SocietyRequest | null>(null);
  const [reviewReason, setReviewReason] = useState("");

  // Fetch society requests
  const { data: requests = [], isLoading } = useQuery({
    queryKey: isAdmin ? ["/api/admin/society-requests"] : ["/api/society-requests/mine"],
  });

  // Review society request mutation (admin only)
  const reviewMutation = useMutation({
    mutationFn: async ({ requestId, approved, reason }: { requestId: number; approved: boolean; reason?: string }) => {
      const response = await apiRequest("POST", "/api/admin/society-requests/review", {
        requestId,
        approved,
        reason
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Request Reviewed",
        description: "Society request has been processed successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/society-requests"] });
      setSelectedRequest(null);
      setReviewReason("");
    },
    onError: () => {
      toast({
        title: "Review Failed",
        description: "Failed to process society request",
        variant: "destructive",
      });
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved": return "bg-green-100 text-green-800";
      case "rejected": return "bg-red-100 text-red-800";
      case "pending": return "bg-yellow-100 text-yellow-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved": return <CheckCircle className="w-4 h-4" />;
      case "rejected": return <XCircle className="w-4 h-4" />;
      case "pending": return <Clock className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const handleReview = (approved: boolean) => {
    if (!selectedRequest) return;
    
    reviewMutation.mutate({
      requestId: selectedRequest.id,
      approved,
      reason: reviewReason.trim() || undefined
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="space-y-3">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">
          {isAdmin ? "Society Approval Requests" : "My Society Requests"}
        </h2>
        <p className="text-gray-600">
          {isAdmin 
            ? "Review and approve society creation requests" 
            : "Track the status of your society creation requests"
          }
        </p>
      </div>

      {/* Requests List */}
      {requests.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Building className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {isAdmin ? "No pending requests" : "No requests submitted"}
            </h3>
            <p className="text-gray-600">
              {isAdmin 
                ? "All society requests have been processed" 
                : "You haven't submitted any society creation requests yet"
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {requests.map((request: SocietyRequest) => (
            <Card key={request.id} className={`border-l-4 ${
              request.status === "pending" ? "border-l-yellow-500" :
              request.status === "approved" ? "border-l-green-500" :
              "border-l-red-500"
            }`}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-3 flex-1">
                    <div className="flex items-center space-x-3">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {request.name}
                      </h3>
                      <Badge className={getStatusColor(request.status)}>
                        {getStatusIcon(request.status)}
                        <span className="ml-1 capitalize">{request.status}</span>
                      </Badge>
                    </div>

                    <p className="text-gray-600">{request.description}</p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div className="flex items-center space-x-2">
                        <MapPin className="w-4 h-4 text-gray-500" />
                        <span>{request.city}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Building className="w-4 h-4 text-gray-500" />
                        <span>{request.apartmentCount} apartments</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Users className="w-4 h-4 text-gray-500" />
                        <span>By: {request.requesterName}</span>
                      </div>
                    </div>

                    <div className="text-xs text-gray-500">
                      <div>Submitted: {new Date(request.createdAt).toLocaleString()}</div>
                      {request.reviewedAt && (
                        <div>Reviewed: {new Date(request.reviewedAt).toLocaleString()}</div>
                      )}
                    </div>

                    {request.location && (
                      <div className="text-sm text-gray-600">
                        <strong>Location:</strong> {request.location}
                      </div>
                    )}

                    {request.reviewReason && (
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <div className="text-sm font-medium text-gray-700">Review Notes:</div>
                        <div className="text-sm text-gray-600 mt-1">{request.reviewReason}</div>
                      </div>
                    )}

                    {/* Apartment Count Warning */}
                    {request.apartmentCount < 90 && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                        <div className="flex items-center space-x-2">
                          <AlertTriangle className="w-4 h-4 text-yellow-600" />
                          <span className="text-sm font-medium text-yellow-800">
                            Below 90 apartment requirement
                          </span>
                        </div>
                        <p className="text-xs text-yellow-700 mt-1">
                          Consider merging with nearby societies or reaching the minimum requirement.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Admin Actions */}
                  {isAdmin && request.status === "pending" && (
                    <div className="ml-6 space-y-2">
                      <Button
                        onClick={() => setSelectedRequest(request)}
                        variant="outline"
                        size="sm"
                      >
                        Review
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Review Modal */}
      {selectedRequest && isAdmin && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-blue-800">
              Review Society Request: {selectedRequest.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-white rounded-lg p-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <strong>Apartments:</strong> {selectedRequest.apartmentCount}
                </div>
                <div>
                  <strong>City:</strong> {selectedRequest.city}
                </div>
                <div>
                  <strong>Location:</strong> {selectedRequest.location}
                </div>
                <div>
                  <strong>Requested by:</strong> {selectedRequest.requesterName}
                </div>
              </div>
              <div className="mt-3">
                <strong>Description:</strong>
                <p className="text-gray-600 mt-1">{selectedRequest.description}</p>
              </div>
            </div>

            <div>
              <Label htmlFor="review-reason">Review Notes (Optional)</Label>
              <Textarea
                id="review-reason"
                placeholder="Add any notes about your decision..."
                value={reviewReason}
                onChange={(e) => setReviewReason(e.target.value)}
                className="min-h-[80px]"
              />
            </div>

            <div className="flex space-x-2">
              <Button
                onClick={() => setSelectedRequest(null)}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={() => handleReview(false)}
                variant="destructive"
                className="flex-1"
                disabled={reviewMutation.isPending}
              >
                <XCircle className="w-4 h-4 mr-2" />
                Reject
              </Button>
              <Button
                onClick={() => handleReview(true)}
                className="flex-1 bg-green-600 hover:bg-green-700"
                disabled={reviewMutation.isPending || selectedRequest.apartmentCount < 90}
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Approve
              </Button>
            </div>

            {selectedRequest.apartmentCount < 90 && (
              <div className="bg-yellow-100 border border-yellow-300 rounded-lg p-3">
                <p className="text-sm text-yellow-800">
                  <AlertTriangle className="w-4 h-4 inline mr-1" />
                  This society has fewer than 90 apartments. Consider suggesting merger with nearby societies.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Approval Guidelines */}
      {isAdmin && (
        <Card className="border-gray-200 bg-gray-50">
          <CardHeader>
            <CardTitle className="text-gray-800">Approval Guidelines</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-gray-700">
            <div><strong>✓ Approve if:</strong> 90+ apartments, clear location, valid description</div>
            <div><strong>⚠ Review carefully:</strong> 70-89 apartments (suggest merging)</div>
            <div><strong>✗ Reject if:</strong> Under 70 apartments, unclear details, duplicate location</div>
            <div><strong>💡 Tip:</strong> Consider community density and existing societies in the area</div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}