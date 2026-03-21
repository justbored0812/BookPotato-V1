import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Send, MessageCircle, Users, Bell, Hash } from "lucide-react";
import { useUser } from "@/hooks/use-user";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface SimplifiedChatProps {
  societyId: number;
  societyName: string;
}

export default function SimplifiedChat({ societyId, societyName }: SimplifiedChatProps) {
  const { user } = useUser();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [message, setMessage] = useState("");
  // Only society chat is available now
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Get currentUserId safely
  const currentUserId = user?.user?.id;
  
  if (!user?.user) {
    return <div className="flex items-center justify-center h-64">
      <p className="text-gray-500">Please login to access chat</p>
    </div>;
  }

  // Society Messages Query
  const { data: societyMessages = [], refetch: refetchSocietyMessages } = useQuery({
    queryKey: [`/api/societies/${societyId}/messages`],
    queryFn: async () => {
      const response = await fetch(`/api/societies/${societyId}/messages`);
      if (!response.ok) return [];
      return response.json();
    },
  });

  // Society Members Query  
  const { data: societyMembers = [] } = useQuery({
    queryKey: [`/api/societies/${societyId}/members`],
    queryFn: async () => {
      const response = await fetch(`/api/societies/${societyId}/members`);
      if (!response.ok) return [];
      return response.json();
    },
  });

  // Direct Messages functionality removed for now

  // Send Society Message
  const sendSocietyMessage = useMutation({
    mutationFn: async (content: string) => {
      console.log(`Sending society message to society ${societyId}:`, content);
      const response = await fetch(`/api/societies/${societyId}/messages`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({ content, messageType: "text" }),
      });
      
      console.log("Society message response status:", response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Society message error:", response.status, errorText);
        throw new Error(`Failed to send message: ${response.status} ${errorText}`);
      }
      return response.json();
    },
    onSuccess: (data) => {
      console.log("Society message sent successfully:", data);
      setMessage("");
      refetchSocietyMessages();
      toast({ title: "Message sent!" });
    },
    onError: (error: any) => {
      console.error("Society message mutation error:", error);
      toast({ 
        title: "Failed to send message", 
        description: error.message || "Please check if you're a member of this society",
        variant: "destructive" 
      });
    },
  });

  // Direct Messages functionality removed for now

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [societyMessages]);

  const handleSendMessage = () => {
    if (!message.trim()) return;

    console.log("Attempting to send society message:", {
      message,
      societyId,
      userId: currentUserId
    });

    if (!societyId) {
      console.error("No societyId available for society chat");
      toast({ title: "Society not found", variant: "destructive" });
      return;
    }
    sendSocietyMessage.mutate(message);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch {
      return "Just now";
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (!user) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  return (
    <div className="h-screen bg-white">
      <Tabs value="society" className="h-full flex flex-col">
        <div className="border-b px-4">
          <TabsList className="grid w-full grid-cols-1">
            <TabsTrigger value="society" className="flex items-center gap-2">
              <Hash className="h-4 w-4" />
              Society Chat
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 overflow-hidden">
          <TabsContent value="society" className="h-full m-0 flex flex-col">
            <div className="flex flex-col h-full">
              <div className="p-4 border-b bg-blue-50 shrink-0">
                <div className="flex items-center gap-2">
                  <Hash className="h-5 w-5 text-blue-600" />
                  <span className="font-semibold text-blue-900">{societyName} General Chat</span>
                  <Badge variant="secondary">{societyMembers.length} members</Badge>
                </div>
              </div>

              <ScrollArea className="flex-1">
                <div className="space-y-4 p-4">
                  {societyMessages.length === 0 ? (
                    <div className="text-center py-8">
                      <MessageCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No messages yet</h3>
                      <p className="text-gray-500">Start the conversation with your society members!</p>
                    </div>
                  ) : (
                    societyMessages
                      .sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
                      .map((msg: any) => (
                      <div key={msg.id} className={`flex gap-3 ${msg.sender_id === currentUserId ? 'justify-end' : ''}`}>
                        {msg.sender_id !== currentUserId && (
                          <Avatar className="w-8 h-8">
                            <AvatarImage src={msg.sender_picture} />
                            <AvatarFallback className="text-xs">
                              {getInitials(msg.sender_name)}
                            </AvatarFallback>
                          </Avatar>
                        )}
                        
                        <div className={`max-w-[70%] ${msg.sender_id === currentUserId ? 'order-first' : ''}`}>
                          <p className={`text-xs mb-1 ${msg.sender_id === currentUserId ? 'text-blue-600 text-right' : 'text-gray-500'}`}>
                            {msg.sender_name || 'Unknown User'}
                          </p>
                          <div className={`p-3 rounded-lg ${
                            msg.sender_id === currentUserId 
                              ? 'bg-blue-500 text-white ml-auto' 
                              : 'bg-gray-100 text-gray-900'
                          }`}>
                            <p className="text-sm">{msg.content}</p>
                            <p className={`text-xs mt-1 ${
                              msg.sender_id === currentUserId ? 'text-blue-100' : 'text-gray-500'
                            }`}>
                              {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              <div className="p-4 border-t bg-white shrink-0 sticky bottom-0 z-50">
                <div className="flex gap-2 items-center">
                  <Input
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type your message..."
                    className="flex-1 min-h-[40px] border-2 border-gray-300 focus:border-blue-500"
                  />
                  <Button 
                    onClick={handleSendMessage}
                    disabled={!message.trim() || sendSocietyMessage.isPending}
                    size="icon"
                    className="h-[40px] w-[40px] shrink-0 bg-blue-600 hover:bg-blue-700"
                  >
                    {sendSocietyMessage.isPending ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}