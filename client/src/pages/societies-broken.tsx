import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Users, Building2, Hash, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import AppLayout from "@/components/layout/app-layout";
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

export default function Societies() {
  const [showCreateModal, setShowCreateModal] = useState(false);
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
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Society created successfully!",
      });
      setShowCreateModal(false);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/societies"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create society",
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
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Society
            </Button>
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
    <AppLayout>
      <div className="space-y-6">
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
                        <Input placeholder="Enter area/location" {...field} />
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
      </div>
    </AppLayout>
  );
}