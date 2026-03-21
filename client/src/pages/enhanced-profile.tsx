import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { User, Shield, Key, MapPin, Phone, Mail, Crown, Camera, Upload, Trophy, Medal, Target } from "lucide-react";
import UserBadge from "@/components/profile/user-badge";

const INDIAN_CITIES = [
  "Mumbai", "Delhi", "Bengaluru", "Hyderabad", "Chennai", "Kolkata", "Pune", "Ahmedabad",
  "Surat", "Jaipur", "Lucknow", "Kanpur", "Nagpur", "Indore", "Thane", "Bhopal"
];

const SCHOOLS = [
  "Delhi Public School", "Ryan International School", "The Shri Ram School", "Pathways World School",
  "Oberoi International School", "Jamnabai Narsee School", "Dhirubhai Ambani International School",
  "Cathedral & John Connon School", "Greenwood High International School", "The Bishop's School"
];

const COMPANIES = [
  "Tata Consultancy Services", "Infosys", "Wipro", "HCL Technologies", "Tech Mahindra",
  "Accenture India", "Cognizant", "IBM India", "Google India", "Microsoft India"
];

const profileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  flatWing: z.string().min(1, "Flat and Wing Number is required"),
  buildingName: z.string().min(1, "Building Name is required"),
  detailedAddress: z.string().min(5, "Detailed Address must be at least 5 characters"),
  city: z.string().min(1, "Please select a city"),
  school: z.string().optional(),
  grade: z.string().optional(),
  division: z.string().optional(),
  company: z.string().optional(),
  floor: z.string().optional(),
  building: z.string().optional(),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(6, "Current password is required"),
  newPassword: z.string().min(6, "New password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Please confirm your password"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type ProfileData = z.infer<typeof profileSchema>;
type PasswordData = z.infer<typeof passwordSchema>;

export default function EnhancedProfile() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [referralCode, setReferralCode] = useState("");
  const [referredByName, setReferredByName] = useState("");
  const [validatingCode, setValidatingCode] = useState(false);

  const { data: user } = useQuery({
    queryKey: ["/api/auth/me"],
    staleTime: 0, // Force fresh data
  });

  const { data: userStats } = useQuery({
    queryKey: ["/api/user/stats"],
  });

  const { data: mySocieties } = useQuery({
    queryKey: ["/api/societies/my"],
  });

  const { data: lentRentals } = useQuery({
    queryKey: ["/api/rentals/lent"],
  });

  const { data: borrowedRentals } = useQuery({
    queryKey: ["/api/rentals/borrowed"],
  });

  const { data: brocksLeaderboard } = useQuery({
    queryKey: ["/api/brocks/leaderboard"],
  });

  const profileForm = useForm<ProfileData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      flatWing: "",
      buildingName: "",
      detailedAddress: "",
      city: "",
      school: "",
      grade: "",
      division: "",
      company: "",
      floor: "",
      building: "",
    },
  });

  // Update form values when user data loads
  useEffect(() => {
    if (user) {
      console.log('Profile page user data:', user);
      const userData = (user as any)?.user || user;
      profileForm.reset({
        name: userData?.name || "",
        email: userData?.email || "",
        phone: userData?.phone || "",
        flatWing: userData?.flatWing || "",
        buildingName: userData?.buildingName || "",
        detailedAddress: userData?.detailedAddress || "",
        city: userData?.city || "",
        school: userData?.school || "",
        grade: userData?.grade || "",
        division: userData?.division || "",
        company: userData?.company || "",
        floor: userData?.floor || "",
        building: userData?.building || "",
      });
    }
  }, [user, profileForm]);

  const passwordForm = useForm<PasswordData>({
    resolver: zodResolver(passwordSchema),
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileData) => {
      const response = await fetch("/api/user/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update profile");
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Profile updated successfully!" });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to update profile",
        variant: "destructive" 
      });
    },
  });

  const updatePasswordMutation = useMutation({
    mutationFn: async (data: PasswordData) => {
      const response = await fetch("/api/user/password", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update password");
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Password updated successfully!" });
      passwordForm.reset();
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to update password",
        variant: "destructive" 
      });
    },
  });

  const uploadProfilePictureMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('profilePicture', file);
      
      const response = await fetch('/api/user/profile-picture', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Failed to upload profile picture');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Profile picture updated successfully!" });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      setUploadingImage(false);
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to upload profile picture",
        variant: "destructive" 
      });
      setUploadingImage(false);
    },
  });

  const handleProfileSubmit = (data: ProfileData) => {
    if (referralCode && !data.phone) {
      toast({
        title: "Error",
        description: "Mobile number is required when using a referral code",
        variant: "destructive"
      });
      return;
    }
    
    if (referralCode && !referredByName) {
      toast({
        title: "Error",
        description: "Please enter a valid referral code or leave it empty",
        variant: "destructive"
      });
      return;
    }
    
    const submitData = { ...data, referralCode: referralCode || undefined };
    updateProfileMutation.mutate(submitData as ProfileData);
  };

  const handlePasswordSubmit = (data: PasswordData) => {
    updatePasswordMutation.mutate(data);
  };

  const handleReferralCodeChange = async (code: string) => {
    setReferralCode(code);
    
    if (code.trim() === "") {
      setReferredByName("");
      return;
    }
    
    try {
      setValidatingCode(true);
      const response = await fetch(`/api/user/validate-referral-code/${code.trim()}`);
      
      if (response.ok) {
        const data = await response.json();
        setReferredByName(data.userName);
      } else {
        setReferredByName("");
      }
    } catch (error) {
      setReferredByName("");
    } finally {
      setValidatingCode(false);
    }
  };

  const handleImageUpload = (event: any) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({
          title: "Error",
          description: "Image size must be less than 5MB",
          variant: "destructive"
        });
        return;
      }
      
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Error",
          description: "Please select a valid image file",
          variant: "destructive"
        });
        return;
      }
      
      setUploadingImage(true);
      uploadProfilePictureMutation.mutate(file);
    }
  };

  const triggerImageUpload = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center space-x-3 mb-6">
        <User className="w-8 h-8 text-blue-600" />
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Profile Settings</h1>
          <p className="text-gray-600">Manage your account and preferences</p>
        </div>
      </div>

      {/* Profile Header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center space-x-6">
            <div className="relative group">
              <Avatar className="w-24 h-24">
                <AvatarImage src={(user as any)?.profilePicture} />
                <AvatarFallback className="text-2xl">
                  {(user as any)?.name?.split(' ').map((n: string) => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <Button
                onClick={triggerImageUpload}
                disabled={uploadingImage}
                className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                variant="ghost"
              >
                {uploadingImage ? (
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                ) : (
                  <Camera className="h-6 w-6" />
                )}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-2xl font-bold">{(user as any)?.user?.name || (user as any)?.name}</h2>
              <p className="text-gray-600 flex items-center">
                <Mail className="w-4 h-4 mr-2" />
                {(user as any)?.user?.email || (user as any)?.email}
              </p>
              <p className="text-gray-600 flex items-center">
                <Phone className="w-4 h-4 mr-2" />
                {(user as any)?.user?.phone || (user as any)?.phone}
              </p>
              <p className="text-gray-600 flex items-center">
                <span className="w-4 h-4 mr-2 text-center font-bold">#</span>
                User Number: {(user as any)?.user?.userNumber || (user as any)?.userNumber || 'Not assigned'}
              </p>
              {((user as any)?.user?.isAdmin || (user as any)?.isAdmin) && (
                <div className="flex items-center space-x-2">
                  <Crown className="w-4 h-4 text-yellow-600" />
                  <span className="text-sm font-medium text-yellow-600">Administrator</span>
                </div>
              )}
            </div>

            <div className="ml-auto">
              <UserBadge 
                referralCount={(user as any)?.user?.totalReferrals || (user as any)?.totalReferrals || 0} 
                className="text-center"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Profile Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => window.location.href = '/earnings'}>
          <CardContent className="p-4 text-center">
            <h3 className="text-2xl font-bold text-blue-600">{(borrowedRentals as any)?.length || 0}</h3>
            <p className="text-sm text-gray-600">Books Borrowed</p>
          </CardContent>
        </Card>
        
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => window.location.href = '/earnings'}>
          <CardContent className="p-4 text-center">
            <h3 className="text-2xl font-bold text-green-600">{(lentRentals as any)?.length || 0}</h3>
            <p className="text-sm text-gray-600">Books Lent</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <h3 className="text-2xl font-bold text-purple-600">{(user as any)?.user?.totalReferrals || (user as any)?.totalReferrals || 0}</h3>
            <p className="text-sm text-gray-600">People Helped</p>
          </CardContent>
        </Card>
        
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => window.location.href = '/societies'}>
          <CardContent className="p-4 text-center">
            <h3 className="text-2xl font-bold text-indigo-600">{(mySocieties as any)?.length || 0}</h3>
            <p className="text-sm text-gray-600">Societies Joined</p>
          </CardContent>
        </Card>
      </div>

      {/* Settings Tabs */}
      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 h-auto p-1 gap-1">
          <TabsTrigger value="profile" className="px-4 py-3 text-sm font-medium whitespace-nowrap">
            Profile Info
          </TabsTrigger>
          <TabsTrigger value="leaderboard" className="px-4 py-3 text-sm font-medium whitespace-nowrap">
            Leaderboard
          </TabsTrigger>
          <TabsTrigger value="security" className="px-4 py-3 text-sm font-medium whitespace-nowrap">
            Security
          </TabsTrigger>
          <TabsTrigger value="admin" disabled={!(user as any)?.isAdmin} className="px-4 py-3 text-sm font-medium whitespace-nowrap">
            Admin
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>
                Update your personal details and contact information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={profileForm.handleSubmit(handleProfileSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      {...profileForm.register("name")}
                      className="mt-1"
                    />
                    {profileForm.formState.errors.name && (
                      <p className="text-sm text-red-600 mt-1">
                        {profileForm.formState.errors.name.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      {...profileForm.register("email")}
                      className="mt-1"
                    />
                    {profileForm.formState.errors.email && (
                      <p className="text-sm text-red-600 mt-1">
                        {profileForm.formState.errors.email.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      {...profileForm.register("phone")}
                      className="mt-1"
                    />
                    {profileForm.formState.errors.phone && (
                      <p className="text-sm text-red-600 mt-1">
                        {profileForm.formState.errors.phone.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="userNumber">User Number</Label>
                    <Input
                      id="userNumber"
                      value={(user as any)?.user?.userNumber || (user as any)?.userNumber || "Not assigned"}
                      disabled
                      className="mt-1 bg-gray-50"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Share this number for referrals
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="referralCode">Referral Code (Optional)</Label>
                    <Input
                      id="referralCode"
                      placeholder="Enter referrer's user number"
                      value={referralCode}
                      onChange={(e) => handleReferralCodeChange(e.target.value)}
                      className="mt-1"
                      disabled={(user as any)?.user?.referredBy || (user as any)?.referredBy}
                      data-testid="input-referral-code"
                    />
                    {validatingCode && (
                      <p className="text-xs text-blue-600 mt-1">
                        Validating code...
                      </p>
                    )}
                    {referredByName && (
                      <p className="text-xs text-green-600 mt-1">
                        ✓ Referrer: {referredByName}
                      </p>
                    )}
                    {referralCode && !referredByName && !validatingCode && (
                      <p className="text-xs text-red-600 mt-1">
                        Invalid referral code
                      </p>
                    )}
                    {((user as any)?.user?.referredBy || (user as any)?.referredBy) && (
                      <p className="text-xs text-gray-500 mt-1">
                        You were already referred
                      </p>
                    )}
                    {referralCode && !profileForm.watch("phone") && (
                      <p className="text-xs text-amber-600 mt-1">
                        Mobile number is required when using a referral code
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="flatWing">Flat and Wing Number</Label>
                    <Input
                      id="flatWing"
                      placeholder="e.g., A-301"
                      {...profileForm.register("flatWing")}
                      className="mt-1"
                    />
                    {profileForm.formState.errors.flatWing && (
                      <p className="text-sm text-red-600 mt-1">
                        {profileForm.formState.errors.flatWing.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="buildingName">Building Name</Label>
                    <Input
                      id="buildingName"
                      placeholder="e.g., Crystal Tower"
                      {...profileForm.register("buildingName")}
                      className="mt-1"
                    />
                    {profileForm.formState.errors.buildingName && (
                      <p className="text-sm text-red-600 mt-1">
                        {profileForm.formState.errors.buildingName.message}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <Label htmlFor="detailedAddress">Detailed Address</Label>
                  <Input
                    id="detailedAddress"
                    placeholder="e.g., Behind Metro Station, Near Park"
                    {...profileForm.register("detailedAddress")}
                    className="mt-1"
                  />
                  {profileForm.formState.errors.detailedAddress && (
                    <p className="text-sm text-red-600 mt-1">
                      {profileForm.formState.errors.detailedAddress.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    placeholder="e.g., Mumbai"
                    {...profileForm.register("city")}
                    className="mt-1"
                  />
                  {profileForm.formState.errors.city && (
                    <p className="text-sm text-red-600 mt-1">
                      {profileForm.formState.errors.city.message}
                    </p>
                  )}
                </div>

                {/* School Information */}
                <div className="pt-4 border-t">
                  <h3 className="text-sm font-semibold text-gray-700 mb-4">School Information (Optional)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="school">School Name</Label>
                      <Select
                        value={profileForm.watch("school")}
                        onValueChange={(value) => profileForm.setValue("school", value)}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Select school" />
                        </SelectTrigger>
                        <SelectContent>
                          {SCHOOLS.map((school) => (
                            <SelectItem key={school} value={school}>
                              {school}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-blue-600 mt-1 cursor-pointer hover:underline" onClick={() => window.location.href = '/societies?type=school&action=create'}>
                        Send Request to Add School
                      </p>
                    </div>

                    <div>
                      <Label htmlFor="grade">Grade</Label>
                      <Input
                        id="grade"
                        placeholder="e.g., 10th"
                        {...profileForm.register("grade")}
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="division">Division</Label>
                      <Input
                        id="division"
                        placeholder="e.g., A"
                        {...profileForm.register("division")}
                        className="mt-1"
                      />
                    </div>
                  </div>
                </div>

                {/* Company Information */}
                <div className="pt-4 border-t">
                  <h3 className="text-sm font-semibold text-gray-700 mb-4">Company Information (Optional)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="company">Company Name</Label>
                      <Select
                        value={profileForm.watch("company")}
                        onValueChange={(value) => profileForm.setValue("company", value)}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Select company" />
                        </SelectTrigger>
                        <SelectContent>
                          {COMPANIES.map((company) => (
                            <SelectItem key={company} value={company}>
                              {company}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-blue-600 mt-1 cursor-pointer hover:underline" onClick={() => window.location.href = '/societies?type=office&action=create'}>
                        Send Request to Add Company
                      </p>
                    </div>

                    <div>
                      <Label htmlFor="floor">Floor Number</Label>
                      <Input
                        id="floor"
                        placeholder="e.g., 5th"
                        {...profileForm.register("floor")}
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="building">Building Name</Label>
                      <Input
                        id="building"
                        placeholder="e.g., Tower A"
                        {...profileForm.register("building")}
                        className="mt-1"
                      />
                    </div>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={updateProfileMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {updateProfileMutation.isPending ? "Updating..." : "Update Profile"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="leaderboard" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Trophy className="w-5 h-5 text-amber-600" />
                <span>Brocks Credits Leaderboard</span>
              </CardTitle>
              <CardDescription>
                See who has the most Brocks credits in the community
              </CardDescription>
            </CardHeader>
            <CardContent>
              {brocksLeaderboard && (brocksLeaderboard as any[]).length > 0 ? (
                <div className="space-y-3">
                  {(brocksLeaderboard as any[]).map((entry: any, index: number) => {
                    const isCurrentUser = entry.userId === ((user as any)?.user?.id || (user as any)?.id);
                    return (
                      <div
                        key={entry.userId}
                        className={`flex items-center justify-between p-4 rounded-lg border ${
                          isCurrentUser 
                            ? 'bg-blue-50 border-blue-200 shadow-md' 
                            : 'bg-gray-50 border-gray-200'
                        }`}
                      >
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white font-bold">
                            {entry.rank <= 3 ? (
                              entry.rank === 1 ? <Crown className="w-5 h-5" /> :
                              entry.rank === 2 ? <Medal className="w-5 h-5" /> :
                              <Target className="w-5 h-5" />
                            ) : (
                              `#${entry.rank}`
                            )}
                          </div>
                          <div>
                            <h4 className={`font-semibold ${isCurrentUser ? 'text-blue-900' : 'text-gray-900'}`}>
                              {entry.name} {isCurrentUser && <span className="text-blue-600 text-sm">(You)</span>}
                            </h4>
                            <p className="text-sm text-gray-600">
                              Total Earned: {entry.totalEarned} credits
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-amber-600">
                            {entry.credits}
                          </div>
                          <div className="text-xs text-gray-500">Brocks</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Trophy className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Leaderboard Data</h3>
                  <p className="text-gray-600">
                    Start earning Brocks credits to appear on the leaderboard!
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Key className="w-5 h-5" />
                <span>Change Password</span>
              </CardTitle>
              <CardDescription>
                Update your password to keep your account secure
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={passwordForm.handleSubmit(handlePasswordSubmit)} className="space-y-4">
                <div>
                  <Label htmlFor="currentPassword">Current Password</Label>
                  <Input
                    id="currentPassword"
                    type="password"
                    {...passwordForm.register("currentPassword")}
                    className="mt-1"
                  />
                  {passwordForm.formState.errors.currentPassword && (
                    <p className="text-sm text-red-600 mt-1">
                      {passwordForm.formState.errors.currentPassword.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    {...passwordForm.register("newPassword")}
                    className="mt-1"
                  />
                  {passwordForm.formState.errors.newPassword && (
                    <p className="text-sm text-red-600 mt-1">
                      {passwordForm.formState.errors.newPassword.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    {...passwordForm.register("confirmPassword")}
                    className="mt-1"
                  />
                  {passwordForm.formState.errors.confirmPassword && (
                    <p className="text-sm text-red-600 mt-1">
                      {passwordForm.formState.errors.confirmPassword.message}
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={updatePasswordMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {updatePasswordMutation.isPending ? "Updating..." : "Update Password"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="admin" className="space-y-4">
          {(user as any)?.isAdmin && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Shield className="w-5 h-5" />
                  <span>Administrator Controls</span>
                </CardTitle>
                <CardDescription>
                  Access administrative features and platform management
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Button
                    onClick={() => window.location.href = "/admin"}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    Open Admin Panel
                  </Button>
                  
                  <div className="text-sm text-gray-600">
                    <p>As an administrator, you have access to:</p>
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li>Society approval system</li>
                      <li>Referral reward management</li>
                      <li>Platform settings and configuration</li>
                      <li>User management and support</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}