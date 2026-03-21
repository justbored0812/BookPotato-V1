import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { MessageCircle, Users, ArrowLeft, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Society {
  id: number;
  name: string;
  description?: string;
  memberCount: number;
  bookCount: number;
}

export default function ChatSelection() {
  const [, setLocation] = useLocation();

  const { data: societies = [] } = useQuery({
    queryKey: ["/api/societies/my"],
    queryFn: async () => {
      const response = await fetch("/api/societies/my");
      if (!response.ok) throw new Error('Failed to fetch societies');
      return response.json();
    }
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-md mx-auto bg-white min-h-screen">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b px-4 py-3 flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation("/")}
            className="p-2"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-lg font-semibold">Select Chat</h1>
            <p className="text-sm text-muted-foreground">Choose a society to chat with</p>
          </div>
        </div>

        <div className="p-4">
          {/* Society Chats */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-3">
              <Users className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">Society Chats</h2>
            </div>

            {societies.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <MessageCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-medium mb-2">No Societies Joined</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Join a society to start chatting with other members
                  </p>
                  <Link href="/societies">
                    <Button>
                      <Users className="w-4 h-4 mr-2" />
                      Browse Societies
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {societies.map((society: Society) => (
                  <div key={society.id} onClick={() => setLocation(`/societies/${society.id}/chat`)} className="cursor-pointer">
                    <Card className="hover:shadow-md transition-shadow cursor-pointer">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-12 w-12">
                            <AvatarFallback className="bg-primary/10 text-primary">
                              {society.name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          
                          <div className="flex-1">
                            <h3 className="font-semibold text-base">{society.name}</h3>
                            {society.description && (
                              <p className="text-sm text-muted-foreground line-clamp-1 mb-1">
                                {society.description}
                              </p>
                            )}
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {society.memberCount} members
                              </span>
                              <span className="flex items-center gap-1">
                                📚 {society.bookCount} books
                              </span>
                            </div>
                          </div>
                          
                          <div className="flex flex-col items-end gap-1">
                            <MessageCircle className="h-5 w-5 text-muted-foreground" />
                            <Badge variant="secondary" className="text-xs">
                              Active
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}