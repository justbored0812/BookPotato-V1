import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { BookOpen, Mail, Phone, User, Chrome, Facebook, Github, Eye, EyeOff } from "lucide-react";
import logoImage from "@assets/WhatsApp Image 2025-10-05 at 17.24.19_1759671721044.jpeg";

const INDIAN_CITIES = [
  "Mumbai", "Delhi", "Bengaluru", "Hyderabad", "Chennai", "Kolkata", "Pune", "Ahmedabad",
  "Surat", "Jaipur", "Lucknow", "Kanpur", "Nagpur", "Indore", "Thane", "Bhopal",
  "Visakhapatnam", "Pimpri-Chinchwad", "Patna", "Vadodara", "Ghaziabad", "Ludhiana",
  "Agra", "Nashik", "Faridabad", "Meerut", "Rajkot", "Kalyan-Dombivli", "Vasai-Virar",
  "Varanasi", "Srinagar", "Dhanbad", "Jodhpur", "Amritsar", "Raipur", "Allahabad",
  "Coimbatore", "Jabalpur", "Gwalior", "Vijayawada", "Madurai", "Guwahati", "Chandigarh",
  "Hubli-Dharwad", "Mysore", "Tiruchirappalli", "Bareilly", "Aligarh", "Tiruppur"
];

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  flatWing: z.string().min(1, "Flat and Wing Number is required"),
  buildingName: z.string().min(1, "Building Name is required"),
  detailedAddress: z.string().min(5, "Detailed Address must be at least 5 characters"),
  city: z.string().min(1, "Please select a city"),
  referredBy: z.string().optional(),
});

const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
});

type LoginData = z.infer<typeof loginSchema>;
type RegisterData = z.infer<typeof registerSchema>;
type ForgotPasswordData = z.infer<typeof forgotPasswordSchema>;

export default function EnhancedAuth() {
  const [activeTab, setActiveTab] = useState("login");
  const [showPassword, setShowPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const loginForm = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
  });

  const registerForm = useForm<RegisterData>({
    resolver: zodResolver(registerSchema),
  });

  const forgotPasswordForm = useForm<ForgotPasswordData>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const loginMutation = useMutation({
    mutationFn: async (data: LoginData) => {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Login failed");
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Logged in successfully!" });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      window.location.href = "/";
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Login failed",
        variant: "destructive" 
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: RegisterData) => {
      const response = await apiRequest("POST", "/api/auth/register", data);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Account created successfully!" });
      setActiveTab("login");
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Registration failed",
        variant: "destructive" 
      });
    },
  });

  const forgotPasswordMutation = useMutation({
    mutationFn: async (data: ForgotPasswordData) => {
      const response = await apiRequest("POST", "/api/auth/forgot-password", data);
      return response.json();
    },
    onSuccess: () => {
      toast({ 
        title: "Success", 
        description: "Password Reset Email sent. Please check your inbox as well as spam folder" 
      });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to send reset email",
        variant: "destructive" 
      });
    },
  });

  const handleSocialLogin = (provider: string) => {
    try {
      // Implement Google OAuth
      window.location.href = `/api/auth/${provider}`;
    } catch (error) {
      toast({
        title: "Connection Error",
        description: "Unable to connect to Google. Please use email/password login instead.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-teal-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <img src={logoImage} alt="BookPotato" className="w-16 h-16 object-contain rounded-full" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">BookPotato</h1>
          <p className="text-gray-600 mt-2">Connect, Share, Read</p>
        </div>

        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Sign In</TabsTrigger>
              <TabsTrigger value="register">Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="space-y-4 p-6">
              <CardHeader className="text-center p-0 mb-4">
                <CardTitle>Welcome Back</CardTitle>
                <CardDescription>Sign in to your account</CardDescription>
              </CardHeader>

              {/* Social Login Options */}
              <div className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => handleSocialLogin("google")}
                >
                  <Chrome className="w-4 h-4 mr-2" />
                  Continue with Google
                </Button>
                
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-2 text-muted-foreground">Or continue with</span>
                  </div>
                </div>
              </div>

              <form onSubmit={loginForm.handleSubmit((data) => loginMutation.mutate(data))}>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      {...loginForm.register("email")}
                      className="mt-1"
                    />
                    {loginForm.formState.errors.email && (
                      <p className="text-sm text-red-600 mt-1">
                        {loginForm.formState.errors.email.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="password">Password</Label>
                    <div className="relative mt-1">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        {...loginForm.register("password")}
                        className="pr-10"
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4 text-gray-400" />
                        ) : (
                          <Eye className="h-4 w-4 text-gray-400" />
                        )}
                      </button>
                    </div>
                    {loginForm.formState.errors.password && (
                      <p className="text-sm text-red-600 mt-1">
                        {loginForm.formState.errors.password.message}
                      </p>
                    )}
                  </div>

                  <Button
                    type="button"
                    variant="link"
                    className="p-0 h-auto text-sm"
                    onClick={() => setActiveTab("forgot")}
                  >
                    Forgot your password?
                  </Button>

                  <Button
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-700"
                    disabled={loginMutation.isPending}
                  >
                    {loginMutation.isPending ? "Signing in..." : "Sign In"}
                  </Button>
                </div>
              </form>
            </TabsContent>

            <TabsContent value="register" className="space-y-4 p-6">
              <CardHeader className="text-center p-0 mb-4">
                <CardTitle>Create Account</CardTitle>
                <CardDescription>Join the BookPotato community</CardDescription>
              </CardHeader>

              <form onSubmit={registerForm.handleSubmit((data) => registerMutation.mutate(data))}>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Full Name *</Label>
                    <Input
                      id="name"
                      {...registerForm.register("name")}
                      className="mt-1"
                    />
                    {registerForm.formState.errors.name && (
                      <p className="text-sm text-red-600 mt-1">
                        {registerForm.formState.errors.name.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      {...registerForm.register("email")}
                      className="mt-1"
                    />
                    {registerForm.formState.errors.email && (
                      <p className="text-sm text-red-600 mt-1">
                        {registerForm.formState.errors.email.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="phone">Phone Number *</Label>
                    <Input
                      id="phone"
                      {...registerForm.register("phone")}
                      className="mt-1"
                    />
                    {registerForm.formState.errors.phone && (
                      <p className="text-sm text-red-600 mt-1">
                        {registerForm.formState.errors.phone.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="city">City *</Label>
                    <Select onValueChange={(value) => registerForm.setValue("city", value)}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select your city" />
                      </SelectTrigger>
                      <SelectContent>
                        {INDIAN_CITIES.map((city) => (
                          <SelectItem key={city} value={city}>
                            {city}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {registerForm.formState.errors.city && (
                      <p className="text-sm text-red-600 mt-1">
                        {registerForm.formState.errors.city.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="flatWing">Flat and Wing Number *</Label>
                    <Input
                      id="flatWing"
                      placeholder="e.g., A-301"
                      {...registerForm.register("flatWing")}
                      className="mt-1"
                    />
                    {registerForm.formState.errors.flatWing && (
                      <p className="text-sm text-red-600 mt-1">
                        {registerForm.formState.errors.flatWing.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="buildingName">Building Name *</Label>
                    <Input
                      id="buildingName"
                      placeholder="e.g., Crystal Tower"
                      {...registerForm.register("buildingName")}
                      className="mt-1"
                    />
                    {registerForm.formState.errors.buildingName && (
                      <p className="text-sm text-red-600 mt-1">
                        {registerForm.formState.errors.buildingName.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="detailedAddress">Detailed Address *</Label>
                    <Input
                      id="detailedAddress"
                      placeholder="e.g., Behind Metro Station, Near Park"
                      {...registerForm.register("detailedAddress")}
                      className="mt-1"
                    />
                    {registerForm.formState.errors.detailedAddress && (
                      <p className="text-sm text-red-600 mt-1">
                        {registerForm.formState.errors.detailedAddress.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="referredBy">Who helped you get here? (Optional)</Label>
                    <Input
                      id="referredBy"
                      placeholder="Enter their user number"
                      {...registerForm.register("referredBy")}
                      className="mt-1"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Enter the user number of the person who referred you
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="password">Password *</Label>
                    <div className="relative mt-1">
                      <Input
                        id="password"
                        type={showRegisterPassword ? "text" : "password"}
                        {...registerForm.register("password")}
                        className="pr-10"
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                      >
                        {showRegisterPassword ? (
                          <EyeOff className="h-4 w-4 text-gray-400" />
                        ) : (
                          <Eye className="h-4 w-4 text-gray-400" />
                        )}
                      </button>
                    </div>
                    {registerForm.formState.errors.password && (
                      <p className="text-sm text-red-600 mt-1">
                        {registerForm.formState.errors.password.message}
                      </p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-700"
                    disabled={registerMutation.isPending}
                  >
                    {registerMutation.isPending ? "Creating Account..." : "Create Account"}
                  </Button>
                </div>
              </form>
            </TabsContent>
          </Tabs>

          {activeTab === "forgot" && (
            <div className="p-6">
              <CardHeader className="text-center p-0 mb-4">
                <CardTitle>Reset Password</CardTitle>
                <CardDescription>Enter your email to receive reset instructions</CardDescription>
              </CardHeader>

              <form onSubmit={forgotPasswordForm.handleSubmit((data) => forgotPasswordMutation.mutate(data))}>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="forgot-email">Email</Label>
                    <Input
                      id="forgot-email"
                      type="email"
                      {...forgotPasswordForm.register("email")}
                      className="mt-1"
                    />
                    {forgotPasswordForm.formState.errors.email && (
                      <p className="text-sm text-red-600 mt-1">
                        {forgotPasswordForm.formState.errors.email.message}
                      </p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-700"
                    disabled={forgotPasswordMutation.isPending}
                  >
                    {forgotPasswordMutation.isPending ? "Sending..." : "Send Reset Email"}
                  </Button>

                  <Button
                    type="button"
                    variant="link"
                    className="w-full"
                    onClick={() => setActiveTab("login")}
                  >
                    Back to Sign In
                  </Button>
                </div>
              </form>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}