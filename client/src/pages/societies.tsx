import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { Plus, Users, Building2, Hash, Check, AlertTriangle, ExternalLink, MapPin, MessageCircle, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import LocationPicker from "@/components/map/location-picker";

const INDIAN_CITIES = [
  "Mumbai", "Delhi", "Bengaluru", "Hyderabad", "Chennai", "Kolkata", "Pune", "Ahmedabad",
  "Surat", "Jaipur", "Lucknow", "Kanpur", "Nagpur", "Indore", "Thane", "Bhopal",
  "Visakhapatnam", "Pimpri-Chinchwad", "Patna", "Vadodara", "Ghaziabad", "Ludhiana",
  "Agra", "Nashik", "Faridabad", "Meerut", "Rajkot", "Kalyan-Dombivli", "Vasai-Virar",
  "Varanasi", "Srinagar", "Dhanbad", "Jodhpur", "Amritsar", "Raipur", "Allahabad",
  "Coimbatore", "Jabalpur", "Gwalior", "Vijayawada", "Madurai", "Guwahati", "Chandigarh",
  "Hubli-Dharwad", "Mysore", "Tiruchirappalli", "Bareilly", "Aligarh", "Tiruppur"
];

const createSocietySchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  hubType: z.enum(["society", "school", "office"]).default("society"),
  city: z.string().min(1, "City is required"),
  apartmentCount: z.number().min(1, "Member count must be at least 1"),
  location: z.string().optional(),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
});

type CreateSocietyFormData = z.infer<typeof createSocietySchema>;

interface MergeData {
  formData: CreateSocietyFormData;
  minApartments: number;
  suggestedSocieties: SocietyWithStats[];
  message: string;
}

interface MergeInterfaceProps {
  availableSocieties: SocietyWithStats[];
  onMergeRequest: (targetSocietyId: number, newSocietyName: string, newSocietyDescription?: string) => void;
}

function MergeInterface({ availableSocieties, onMergeRequest }: MergeInterfaceProps) {
  const [selectedSociety, setSelectedSociety] = useState<number | null>(null);
  const [newSocietyName, setNewSocietyName] = useState("");
  const [newSocietyDescription, setNewSocietyDescription] = useState("");

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Select Society to Merge With</h3>
        <div className="space-y-3 max-h-60 overflow-y-auto">
          {availableSocieties.map((society) => (
            <Card 
              key={society.id} 
              className={`cursor-pointer transition-colors ${
                selectedSociety === society.id ? 'ring-2 ring-primary' : ''
              }`}
              onClick={() => setSelectedSociety(society.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-primary to-secondary rounded-lg flex items-center justify-center text-white font-bold text-sm">
                      {getInitials(society.name)}
                    </div>
                    <div>
                      <h4 className="font-medium">{society.name}</h4>
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
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
                        <p className="text-xs text-gray-500 mt-1">{society.description}</p>
                      )}
                    </div>
                  </div>
                  {selectedSociety === society.id && (
                    <Check className="h-5 w-5 text-primary" />
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {selectedSociety && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Your Society Name</label>
            <Input
              placeholder="Enter your society name"
              value={newSocietyName}
              onChange={(e) => setNewSocietyName(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Description (Optional)</label>
            <Textarea
              placeholder="Describe your society..."
              value={newSocietyDescription}
              onChange={(e) => setNewSocietyDescription(e.target.value)}
              className="min-h-[80px]"
            />
          </div>
          <Button
            onClick={() => onMergeRequest(selectedSociety, newSocietyName, newSocietyDescription)}
            disabled={!newSocietyName.trim()}
            className="w-full"
          >
            Submit Merge Request
          </Button>
        </div>
      )}
    </div>
  );
}

export default function Societies() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showMergeOptions, setShowMergeOptions] = useState(false);
  const [mergeData, setMergeData] = useState<MergeData | null>(null);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{address: string; coordinates: [number, number]} | null>(null);
  const [selectedCity, setSelectedCity] = useState<string>("All Cities");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [showMemberListModal, setShowMemberListModal] = useState(false);
  const [selectedSocietyForMembers, setSelectedSocietyForMembers] = useState<SocietyWithStats | null>(null);
  const [activeTab, setActiveTab] = useState<string>("society");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  
  // Check URL for hub type and action (from home page buttons and profile links)
  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const typeParam = urlParams.get('type');
    const actionParam = urlParams.get('action');
    
    if (typeParam && ['society', 'school', 'office'].includes(typeParam)) {
      setActiveTab(typeParam);
      form.setValue('hubType', typeParam as 'society' | 'school' | 'office');
    }
    
    if (actionParam === 'create') {
      setShowCreateModal(true);
    }
  }, []);

  const form = useForm<CreateSocietyFormData>({
    resolver: zodResolver(createSocietySchema),
    defaultValues: {
      name: "",
      description: "",
      hubType: "society",
      city: "",
      apartmentCount: 0,
      location: "",
      latitude: "",
      longitude: "",
    },
  });

  const { data: mySocieties, isLoading: isLoadingMy } = useQuery({
    queryKey: ["/api/societies/my", activeTab],
    enabled: activeTab === "my-hubs",
  });

  const { data: availableSocieties, isLoading: isLoadingAvailable } = useQuery({
    queryKey: ["/api/societies/available", activeTab],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (activeTab !== "my-hubs") {
        params.append("hubType", activeTab);
      }
      const url = `/api/societies/available${params.toString() ? `?${params.toString()}` : ""}`;
      const response = await fetch(url, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch');
      return response.json();
    },
    enabled: activeTab !== "my-hubs",
  });

  // Get current user data to use their city as default
  const { data: currentUser } = useQuery({
    queryKey: ["/api/auth/me"],
  });

  // Fetch society members when modal is opened
  const { data: societyMembers, isLoading: isLoadingMembers } = useQuery({
    queryKey: [`/api/societies/${selectedSocietyForMembers?.id}/members`],
    enabled: !!selectedSocietyForMembers?.id && showMemberListModal,
  });

  // Click handlers
  const handleMemberCountClick = (society: SocietyWithStats) => {
    setSelectedSocietyForMembers(society);
    setShowMemberListModal(true);
  };

  const handleBookCountClick = (society: SocietyWithStats) => {
    setLocation(`/browse?societyId=${society.id}`);
  };

  const handleViewAllLocations = (hubType: string, societies?: any[]) => {
    const societiesToUse = societies || filteredSocieties;
    const societiesWithLocations = societiesToUse.filter((s: any) => 
      s.location && s.location.trim() !== ''
    );

    if (societiesWithLocations.length === 0) {
      toast({
        title: "No Locations Found",
        description: `No ${hubType}s have location data available.`,
        variant: "destructive",
      });
      return;
    }

    // Build location queries for each society
    const locationQueries = societiesWithLocations.map((s: any) => {
      const location = s.location.trim();
      
      // Check if it's already a Google Maps URL with coordinates
      const coordMatch = location.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
      if (coordMatch) {
        return `${coordMatch[1]},${coordMatch[2]}`;
      }
      
      // Check if it has a query parameter
      const qMatch = location.match(/[?&]query?=([^&]+)/);
      if (qMatch) {
        return decodeURIComponent(qMatch[1]);
      }
      
      // Otherwise, create a search string with society name + location + city
      return `${s.name}, ${location}, ${s.city}`;
    });

    // If only one location, open a search for it
    if (locationQueries.length === 1) {
      const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locationQueries[0])}`;
      window.open(mapsUrl, '_blank');
      return;
    }

    // For multiple locations, use the directions API with waypoints
    // This will show all locations as markers on the map
    const origin = encodeURIComponent(locationQueries[0]);
    const destination = encodeURIComponent(locationQueries[locationQueries.length - 1]);
    const waypoints = locationQueries.slice(1, -1).map(q => encodeURIComponent(q)).join('|');

    let mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}`;
    
    if (waypoints) {
      mapsUrl += `&waypoints=${waypoints}`;
    }
    
    mapsUrl += '&travelmode=driving';
    
    window.open(mapsUrl, '_blank');
  };

  // Get unique cities from available societies and filter societies by selected city
  const availableCities = availableSocieties ? 
    ["All Cities", ...Array.from(new Set((availableSocieties as SocietyWithStats[]).map(s => s.city).filter(Boolean)))] : ["All Cities"];
  
  const filteredSocieties = availableSocieties ? 
    (availableSocieties as SocietyWithStats[]).filter(society => {
      const matchesCity = selectedCity === "All Cities" || society.city === selectedCity;
      const matchesSearch = searchQuery === "" || 
        society.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        society.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (society.description && society.description.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCity && matchesSearch;
    }) : [];

  // Set default city to user's city when data loads
  React.useEffect(() => {
    if (currentUser?.city && availableCities.includes(currentUser.city) && selectedCity === "All Cities") {
      setSelectedCity(currentUser.city);
    }
  }, [currentUser?.city, availableCities, selectedCity]);

  const createMutation = useMutation({
    mutationFn: async (data: CreateSocietyFormData) => {
      const response = await apiRequest("POST", "/api/societies", data);
      return await response.json();
    },
    onSuccess: (data: any) => {
      const hubTypeLabel = data.hubType === 'society' ? 'society' : 
                          data.hubType === 'school' ? 'school' : 'office';
      toast({
        title: "Request Submitted",
        description: `Your ${hubTypeLabel} creation request has been submitted for admin approval.`,
      });
      setShowCreateModal(false);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/societies"] });
    },
    onError: (error: any) => {
      if (error.message && error.message.includes("minimum apartment requirement")) {
        const errorData = JSON.parse(error.message.split(": ")[1]);
        setMergeData({
          formData: form.getValues(),
          minApartments: errorData.minApartments,
          suggestedSocieties: errorData.suggestedSocieties || [],
          message: errorData.message
        });
        setShowCreateModal(false);
        setShowMergeOptions(true);
      } else {
        toast({
          title: "Error",
          description: error.message || "Failed to create society",
          variant: "destructive",
        });
      }
    },
  });

  const mergeMutation = useMutation({
    mutationFn: async ({ targetSocietyId, newSocietyName, newSocietyDescription }: {
      targetSocietyId: number;
      newSocietyName: string;
      newSocietyDescription?: string;
    }) => {
      const response = await apiRequest("POST", "/api/societies/merge-request", {
        targetSocietyId,
        newSocietyName,
        newSocietyDescription,
        apartmentCount: mergeData?.formData.apartmentCount || 0,
        city: mergeData?.formData.city || "",
        location: mergeData?.formData.location || ""
      });
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Merge Request Submitted",
        description: "Your merge request has been submitted for admin approval.",
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

  const handleLocationSelect = (location: { address: string; coordinates: [number, number] }) => {
    setSelectedLocation(location);
    form.setValue("location", location.address);
    setShowLocationPicker(false);
  };

  const openLocationPicker = () => {
    setShowLocationPicker(true);
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
                    formData: { name: "", hubType: "society", description: "", city: "", apartmentCount: 0, location: "" },
                    minApartments: 90,
                    suggestedSocieties: [],
                    message: "Choose an existing society to merge with. Location and name are required."
                  });
                  setShowMergeOptions(true);
                }}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Merge with Existing
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="space-y-3">
        {(mySocieties as any[])?.map((society: any) => (
          <Card key={society.id}>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
                <div className="flex items-center space-x-3 min-w-0 flex-1">
                  <div className="w-12 h-12 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center text-white font-bold">
                    <span>{getInitials(society.name)}</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-text-primary">
                        {society.name}
                      </h4>
                      <Badge variant="secondary" className="text-xs capitalize">
                        {society.hubType || 'society'}
                      </Badge>
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-text-secondary">
                      <span 
                        className="flex items-center cursor-pointer hover:text-primary transition-colors" 
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleMemberCountClick(society);
                        }}
                        data-testid={`members-count-${society.id}`}
                      >
                        <Users className="h-3 w-3 mr-1" />
                        {society.memberCount} members
                      </span>
                      <span 
                        className="flex items-center cursor-pointer hover:text-primary transition-colors" 
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleBookCountClick(society);
                        }}
                        data-testid={`books-count-${society.id}`}
                      >
                        <Building2 className="h-3 w-3 mr-1" />
                        {society.bookCount} books
                      </span>
                      <span className="flex items-center">
                        <Hash className="h-3 w-3 mr-1" />
                        {society.code}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-2 min-w-0">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => setLocation(`/societies/${society.id}/chat`)}
                    className="text-primary hover:text-primary whitespace-nowrap"
                  >
                    <MessageCircle className="h-4 w-4 mr-1" />
                    <span className="hidden sm:inline">Chat</span>
                    <span className="sm:hidden">💬</span>
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleUnjoinSociety(society.id)}
                    className="text-text-secondary hover:text-destructive whitespace-nowrap"
                  >
                    <span className="hidden sm:inline">Leave</span>
                    <span className="sm:hidden">Exit</span>
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
                  <div className="h-6 bg-gray-200 rounded w-16"></div>
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
            <Users className="h-12 w-12 text-text-secondary mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-text-primary mb-2">
              No Available Societies
            </h3>
            <p className="text-sm text-text-secondary mb-4">
              All societies are full or none exist yet. Create a new society to get started!
            </p>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="space-y-3">
        {filteredSocieties?.map((society: SocietyWithStats) => (
          <Card key={society.id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center text-white font-bold">
                    <span>{getInitials(society.name)}</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-text-primary">
                        {society.name}
                      </h4>
                      <Badge variant="secondary" className="text-xs capitalize">
                        {society.hubType || 'society'}
                      </Badge>
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-text-secondary">
                      <span className="flex items-center">
                        <MapPin className="h-3 w-3 mr-1" />
                        {society.city}
                      </span>
                      <span 
                        className="flex items-center cursor-pointer hover:text-primary transition-colors" 
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleMemberCountClick(society);
                        }}
                        data-testid={`members-count-available-${society.id}`}
                      >
                        <Users className="h-3 w-3 mr-1" />
                        {society.memberCount} members
                      </span>
                      <span 
                        className="flex items-center cursor-pointer hover:text-primary transition-colors" 
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleBookCountClick(society);
                        }}
                        data-testid={`books-count-available-${society.id}`}
                      >
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

  // Member List Modal Component
  const renderMemberListModal = () => (
    <Dialog open={showMemberListModal} onOpenChange={setShowMemberListModal}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {selectedSocietyForMembers?.name} Members
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {isLoadingMembers ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse"></div>
                  <div className="space-y-1">
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-24"></div>
                    <div className="h-3 bg-gray-200 rounded animate-pulse w-32"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : societyMembers && societyMembers.length > 0 ? (
            <div className="max-h-96 overflow-y-auto space-y-3">
              {societyMembers.map((member: any) => (
                <div key={member.id} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50">
                  <div className="w-10 h-10 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center text-white font-bold text-sm">
                    {getInitials(member.name)}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{member.name}</p>
                    <p className="text-xs text-gray-500">{member.email}</p>
                    {member.is_admin && (
                      <Badge variant="secondary" className="text-xs mt-1">Admin</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">No members found</p>
            </div>
          )}
          {selectedSocietyForMembers && (
            <div className="text-center pt-3 border-t">
              <p className="text-sm text-gray-600">
                Total: {selectedSocietyForMembers.memberCount} members
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Hubs</h1>
          <p className="text-sm text-text-secondary mt-1">
            Join societies, schools, and offices to share books
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Hub
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <TabsList>
            <TabsTrigger value="society" data-testid="tab-society">Societies</TabsTrigger>
            <TabsTrigger value="school" data-testid="tab-school">Schools</TabsTrigger>
            <TabsTrigger value="office" data-testid="tab-office">Offices</TabsTrigger>
            <TabsTrigger value="my-hubs" data-testid="tab-my-hubs">My Hubs</TabsTrigger>
          </TabsList>
          
          <div className="flex items-center space-x-2">
            <MapPin className="h-4 w-4 text-gray-500" />
            <Select value={selectedCity} onValueChange={setSelectedCity}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select city" />
              </SelectTrigger>
              <SelectContent>
                {availableCities.map((city) => (
                  <SelectItem key={city} value={city}>
                    {city}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <TabsContent value="society" className="space-y-4">
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search societies by name, city, or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="search-society"
              />
            </div>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => handleViewAllLocations('society')}
              data-testid="button-view-all-locations"
            >
              <MapPin className="h-4 w-4 mr-2" />
              View All Locations on Map ({filteredSocieties.filter((s: any) => s.location && s.location.trim() !== '').length})
            </Button>
          </div>
          {renderAvailableSocieties()}
        </TabsContent>

        <TabsContent value="school" className="space-y-4">
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search schools by name, city, or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="search-school"
              />
            </div>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => handleViewAllLocations('school')}
              data-testid="button-view-all-locations-school"
            >
              <MapPin className="h-4 w-4 mr-2" />
              View All Locations on Map ({filteredSocieties.filter((s: any) => s.location && s.location.trim() !== '').length})
            </Button>
          </div>
          {renderAvailableSocieties()}
        </TabsContent>

        <TabsContent value="office" className="space-y-4">
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search offices by name, city, or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="search-office"
              />
            </div>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => handleViewAllLocations('office')}
              data-testid="button-view-all-locations-office"
            >
              <MapPin className="h-4 w-4 mr-2" />
              View All Locations on Map ({filteredSocieties.filter((s: any) => s.location && s.location.trim() !== '').length})
            </Button>
          </div>
          {renderAvailableSocieties()}
        </TabsContent>

        <TabsContent value="my-hubs" className="space-y-4">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => handleViewAllLocations('hub', mySocieties as any[])}
            data-testid="button-view-all-locations-myhubs"
          >
            <MapPin className="h-4 w-4 mr-2" />
            View All Locations on Map ({(mySocieties as any[] || []).filter((s: any) => s.location && s.location.trim() !== '').length})
          </Button>
          {renderMySocieties()}
        </TabsContent>
      </Tabs>

      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Hub</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onCreateSubmit)} className="space-y-4">
              {(() => {
                const selectedHubType = form.watch("hubType") || "society";
                const hubTypeLabels = {
                  society: {
                    count: "Number of Members/Units",
                    countPlaceholder: "Enter number of units",
                    description: "Describe your society..."
                  },
                  school: {
                    count: "Approximate Number of Students",
                    countPlaceholder: "Enter approximate number of students",
                    description: "Describe your school..."
                  },
                  office: {
                    count: "Number of Employees",
                    countPlaceholder: "Enter number of employees",
                    description: "Describe your office..."
                  }
                };
                
                const labels = hubTypeLabels[selectedHubType as keyof typeof hubTypeLabels];
                
                return (
                  <>
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter hub name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="hubType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Hub Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select hub type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="society">Society</SelectItem>
                              <SelectItem value="school">School</SelectItem>
                              <SelectItem value="office">Office</SelectItem>
                            </SelectContent>
                          </Select>
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
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select your city" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {INDIAN_CITIES.map((city) => (
                          <SelectItem key={city} value={city}>
                            {city}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
                    <FormField
                      control={form.control}
                      name="apartmentCount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{labels.count}</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder={labels.countPlaceholder}
                              value={field.value || ""}
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
                          <div className="flex space-x-2">
                            <FormControl>
                              <Input placeholder="Enter specific location" {...field} />
                            </FormControl>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={openLocationPicker}
                              className="flex items-center space-x-2"
                            >
                              <MapPin className="w-4 h-4" />
                              <span>Map</span>
                            </Button>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="latitude"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Latitude (Optional)</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="e.g. 19.0760" 
                                {...field}
                                data-testid="input-latitude"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="longitude"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Longitude (Optional)</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="e.g. 72.8777" 
                                {...field}
                                data-testid="input-longitude"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description (Optional)</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder={labels.description} 
                              className="min-h-[80px]"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" disabled={createMutation.isPending} className="w-full">
                      {createMutation.isPending ? "Creating..." : "Create Hub"}
                    </Button>
                  </>
                );
              })()}
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
              />

              <div className="flex gap-4 pt-4">
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

      <LocationPicker
        isOpen={showLocationPicker}
        onClose={() => setShowLocationPicker(false)}
        onLocationSelect={handleLocationSelect}
        city={form.watch("city")}
      />

      {/* Member List Modal */}
      {renderMemberListModal()}
    </div>
  );
}