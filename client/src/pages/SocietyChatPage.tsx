import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import SimplifiedChat from "./SimplifiedChat";

export default function SocietyChatPage() {
  const { societyId } = useParams();
  
  // Fetch society details
  const { data: societies } = useQuery({
    queryKey: ["/api/societies/my"],
    queryFn: async () => {
      const response = await fetch("/api/societies/my");
      if (!response.ok) throw new Error('Failed to fetch societies');
      return response.json();
    }
  });

  const society = societies?.find((s: any) => s.id === parseInt(societyId || '0'));

  if (!society) {
    return (
      <div className="container mx-auto p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Society Not Found</h1>
          <p className="text-muted-foreground mb-4">
            You don't have access to this society or it doesn't exist.
          </p>
          <Link href="/societies">
            <Button>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Societies
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/societies">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Society Chat</h1>
      </div>
      
      <div className="w-full h-[calc(100vh-200px)]">
        <SimplifiedChat 
          societyId={parseInt(societyId || '0')} 
          societyName={society.name} 
        />
      </div>
    </div>
  );
}