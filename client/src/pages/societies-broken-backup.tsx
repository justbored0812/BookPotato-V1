import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Users, Building2, Hash, Check, AlertTriangle, ExternalLink, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { getInitials } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { SocietyWithStats } from "@shared/schema";

const createSocietySchema = z.object({
  name: z.string().min(1, "Society name is required"),
  description: z.string().optional(),
  city: z.string().min(1, "City is required"),
  apartmentCount: z.number().min(1, "Apartment count must be at least 1"),
  location: z.string().optional(),
});

type CreateSocietyFormData = z.infer<typeof createSocietySchema>;

interface MergeInterfaceProps {
  availableSocieties: SocietyWithStats[];
  onMergeRequest: (targetSocietyId: number, newSocietyName: string, newSocietyDescription?: string) => void;
  isLoading: boolean;
}

function MergeInterface({ availableSocieties, onMergeRequest, isLoading }: MergeInterfaceProps) {
  const [selectedSociety, setSelectedSociety] = useState<SocietyWithStats | null>(null);
  const [newSocietyName, setNewSocietyName] = useState("");
  const [newSocietyDescription, setNewSocietyDescription] = useState("");

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold mb-3">Select a Society to Merge With:</h3>
        <p className="text-sm text-gray-600 mb-4">
          Choose an existing society in your area. Both society name and location are required for the merge request.
        </p>
        
        {availableSocieties.length > 0 ? (
          <div className="space-y-3 max-h-60 overflow-y-auto">
            {availableSocieties.map((society) => (
              <Card 
                key={society.id} 
                className={`p-4 cursor-pointer transition-colors ${
                  selectedSociety?.id === society.id ? 'ring-2 ring-primary bg-primary/5' : 'hover:bg-gray-50'
                }`}
                onClick={() => setSelectedSociety(society)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">{society.name}</h4>
                    <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                      <span className="flex items-center">
                        <MapPin className="w-3 h-3 mr-1" />
                        {society.city}
                        {society.location && ` • ${society.location}`}
                      </span>
                      <span className="flex items-center">
                        <Building2 className="w-3 h-3 mr-1" />
                        {society.apartmentCount} apartments
                      </span>
                      <span className="flex items-center">
                        <Users className="w-3 h-3 mr-1" />
                        {society.memberCount} members
                      </span>
                    </div>
                  </div>
                  {selectedSociety?.id === society.id && (
                    <Check className="w-5 h-5 text-primary" />
                  )}
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-6 text-center">
            <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No societies available for merging.</p>
            <p className="text-sm text-gray-500 mt-2">
              Create a new society instead or wait for more societies to be created.
            </p>
          </Card>
        )}
      </div>

      {selectedSociety && (
        <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium">Merge Request Details</h4>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Your Society Name *
            </label>
            <Input
              value={newSocietyName}
              onChange={(e) => setNewSocietyName(e.target.value)}
              placeholder="Enter your society name"
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description (Optional)
            </label>
            <Textarea
              value={newSocietyDescription}
              onChange={(e) => setNewSocietyDescription(e.target.value)}
              placeholder="Describe your society and reason for merging"
              className="w-full min-h-[80px]"
            />
          </div>
          <Button
            onClick={() => {
              if (selectedSociety && newSocietyName.trim()) {
                onMergeRequest(selectedSociety.id, newSocietyName.trim(), newSocietyDescription.trim() || undefined);
              }
            }}
            disabled={!newSocietyName.trim() || isLoading}
            className="w-full"
          >
            {isLoading ? "Submitting Request..." : `Request Merge with ${selectedSociety.name}`}
          </Button>
        </div>
      )}
    </div>
  );
}

export default function Societies() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showMergeOptions, setShowMergeOptions] = useState(false);
  const [mergeData, setMergeData] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<CreateSocietyFormData>({
    resolver: zodResolver(createSocietySchema),
    defaultValues: {
      name: "",
      description: "",
      city: "",
      apartmentCount: 0,
      location: "",
    },
  });

  const { data: mySocieties, isLoading: isLoadingMy } = useQuery({
    queryKey: ["/api/societies/my"],
  });

  const { data: availableSocieties, isLoading: isLoadingAvailable } = useQuery({
    queryKey: ["/api/societies/available"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: CreateSocietyFormData) => {
      const response = await apiRequest("POST", "/api/societies", data);
      
      if (!response.ok) {
        const errorData = await response.json();
        if (errorData.requiresMerge) {
          // Store merge data and show merge options
          setMergeData({
            formData: data,
            minApartments: errorData.minApartments,
            suggestedSocieties: errorData.suggestedSocieties,
            message: errorData.message
          });
          setShowMergeOptions(true);
          setShowCreateModal(false);
          throw new Error("MERGE_REQUIRED");
        }
        throw new Error(errorData.message || "Failed to create society");
      }
      
      return await response.json();
    },
    onSuccess: (data) => {
      if (data.status === "pending") {
        toast({
          title: "Request Submitted",
          description: "Your society creation request has been submitted for admin approval.",
        });
      } else {
        toast({
          title: "Success", 
          description: "Society created successfully!",
        });
      }
      setShowCreateModal(false);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/societies"] });
    },
    onError: (error: any) => {
      if (error.message === "MERGE_REQUIRED") {
        // Don't show error toast for merge requirement
        return;
      }
      toast({
        title: "Error",
        description: error.message || "Failed to create society",
        variant: "destructive",
      });
    },
  });

  const mergeMutation = useMutation({
    mutationFn: async ({ targetSocietyId, newSocietyName, newSocietyDescription }: {
      targetSocietyId: number;
      newSocietyName: string;
      newSocietyDescription?: string;
    }) => {
      const response = await apiRequest("POST", "/api/societies/merge", {
        targetSocietyId,
        newSocietyName,
        newSocietyDescription
      });
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Merge Request Submitted",
        description: `Your request to merge with ${data.targetSociety.name} has been submitted for admin approval.`,
      });
      setShowMergeOptions(false);
      setMergeData(null);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit merge request",
        variant: "destructive",
      });
    },
  });

  const joinByIdMutation = useMutation({
    mutationFn: async (societyId: number) => {
      const response = await apiRequest("POST", `/api/societies/${societyId}/join`);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Successfully joined society!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/societies"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to join society",
        variant: "destructive",
      });
    },
  });

  const onCreateSubmit = (data: CreateSocietyFormData) => {
    createMutation.mutate(data);
  };

  const handleUnjoinSociety = async (societyId: number) => {
    try {
      const response = await apiRequest("POST", `/api/societies/${societyId}/leave`);
      if (response.ok) {
        queryClient.invalidateQueries({ queryKey: ['/api/societies/my'] });
        queryClient.invalidateQueries({ queryKey: ['/api/societies/available'] });
      }
    } catch (error) {
      console.error('Error leaving society:', error);
    }
  };

  const handleJoinById = (societyId: number) => {
    joinByIdMutation.mutate(societyId);
  };

  function renderMySocieties() {
    if (isLoadingMy) {
      return (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gray-200 rounded-xl animate-pulse"></div>
                    <div className="space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-32"></div>
                      <div className="h-3 bg-gray-200 rounded w-24"></div>
                    </div>
                  </div>
                  <div className="h-6 bg-gray-200 rounded w-16"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      );
    }

    if (!mySocieties || (mySocieties as any[])?.length === 0) {
      return (
        <Card>
          <CardContent className="pt-6 text-center">
            <Building2 className="h-12 w-12 text-text-secondary mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-text-primary mb-2">
              No Societies Yet
            </h3>
            <p className="text-sm text-text-secondary mb-4">
              You haven't joined any societies yet. Create your own or join an existing one!
            </p>
            <div className="space-y-3">
              <Button onClick={() => setShowCreateModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Society
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  setMergeData({
                    formData: { name: "", description: "", city: "", apartmentCount: 0, location: "" },
                    minApartments: 90,
                    suggestedSocieties: [],
                    message: "Choose an existing society to merge with. Location and name are required."
                  });
                  setShowMergeOptions(true);
                }}
                className="w-full"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Merge with Existing Society
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="space-y-3">
        {(mySocieties as SocietyWithStats[])?.map((society: SocietyWithStats) => (
          <Card key={society.id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center text-white font-bold">
                    <span>{getInitials(society.name)}</span>
                  </div>
                  <div>
                    <h4 className="font-medium text-text-primary">
                      {society.name}
                    </h4>
                    <div className="flex items-center space-x-4 text-sm text-text-secondary">
                      <span className="flex items-center">
                        <Users className="h-3 w-3 mr-1" />
                        {society.memberCount} members
                      </span>
                      <span className="flex items-center">
                        <Building2 className="h-3 w-3 mr-1" />
                        {society.bookCount} books
                      </span>
                    </div>
                    {society.description && (
                      <p className="text-xs text-text-secondary mt-1">
                        {society.description}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant="secondary">
                    <Hash className="h-3 w-3 mr-1" />
                    {society.code}
                  </Badge>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="text-red-600 border-red-200 hover:bg-red-50"
                    onClick={() => handleUnjoinSociety(society.id)}
                  >
                    Unjoin
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  function renderAvailableSocieties() {
    if (isLoadingAvailable) {
      return (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gray-200 rounded-xl animate-pulse"></div>
                    <div className="space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-32"></div>
                      <div className="h-3 bg-gray-200 rounded w-24"></div>
                    </div>
                  </div>
                  <div className="h-8 bg-gray-200 rounded w-16"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      );
    }

    if (!availableSocieties || (availableSocieties as any[])?.length === 0) {
      return (
        <Card>
          <CardContent className="pt-6 text-center">
            <Building2 className="h-12 w-12 text-text-secondary mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-text-primary mb-2">
              No Societies Available
            </h3>
            <p className="text-sm text-text-secondary">
              All societies are full or none exist yet. Create a new society to get started!
            </p>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="space-y-3">
        {(availableSocieties as SocietyWithStats[])?.map((society: SocietyWithStats) => (
          <Card key={society.id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center text-white font-bold">
                    <span>{getInitials(society.name)}</span>
                  </div>
                  <div>
                    <h4 className="font-medium text-text-primary">
                      {society.name}
                    </h4>
                    <div className="flex items-center space-x-4 text-sm text-text-secondary">
                      <span className="flex items-center">
                        <Users className="h-3 w-3 mr-1" />
                        {society.memberCount} members
                      </span>
                      <span className="flex items-center">
                        <Building2 className="h-3 w-3 mr-1" />
                        {society.bookCount} books
                      </span>
                    </div>
                    {society.description && (
                      <p className="text-xs text-text-secondary mt-1">
                        {society.description}
                      </p>
                    )}
                  </div>
                </div>
                <Button 
                  size="sm" 
                  onClick={() => handleJoinById(society.id)}
                  disabled={joinByIdMutation.isPending}
                  className="bg-secondary text-white hover:bg-secondary/90"
                >
                  <Check className="h-4 w-4 mr-1" />
                  {joinByIdMutation.isPending ? "Joining..." : "Join"}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Societies</h1>
          <p className="text-sm text-text-secondary mt-1">
            Join communities and share books with your neighbors
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Society
        </Button>
      </div>

      <Tabs defaultValue="my-societies" className="w-full">
        <TabsList>
          <TabsTrigger value="my-societies">My Societies</TabsTrigger>
          <TabsTrigger value="available">Available to Join</TabsTrigger>
        </TabsList>

        <TabsContent value="my-societies" className="space-y-4">
          {renderMySocieties()}
        </TabsContent>

        <TabsContent value="available" className="space-y-4">
          {renderAvailableSocieties()}
        </TabsContent>
      </Tabs>

      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Society</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onCreateSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Society Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter society name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter city" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="apartmentCount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Number of Apartments</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="Enter apartment count" 
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
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter specific location" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (Optional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Describe your society..." 
                          className="min-h-[80px]"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={createMutation.isPending} className="w-full">
                  {createMutation.isPending ? "Creating..." : "Create Society"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Merge Options Dialog */}
        <Dialog open={showMergeOptions} onOpenChange={setShowMergeOptions}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                Minimum Apartment Requirement Not Met
              </DialogTitle>
            </DialogHeader>
            
            {mergeData && (
              <div className="space-y-6">
                <Alert>
                  <AlertTriangle className="w-4 h-4" />
                  <AlertDescription>
                    {mergeData.message}
                  </AlertDescription>
                </Alert>

                <MergeInterface 
                  availableSocieties={availableSocieties as SocietyWithStats[] || []}
                  onMergeRequest={(targetSocietyId: number, newSocietyName: string, newSocietyDescription?: string) => {
                    mergeMutation.mutate({
                      targetSocietyId,
                      newSocietyName,
                      newSocietyDescription
                    });
                  }}
                  isLoading={mergeMutation.isPending}
                />

                <div className="flex gap-3 pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowMergeOptions(false);
                      setMergeData(null);
                      setShowCreateModal(true);
                    }}
                    className="flex-1"
                  >
                    Modify Society Details
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowMergeOptions(false);
                      setMergeData(null);
                    }}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}