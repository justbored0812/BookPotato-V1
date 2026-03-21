import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Send, 
  MessageCircle, 
  Users, 
  Bell, 
  Hash, 
  ArrowLeft,
  Check,
  X,
  UserPlus,
  Clock
} from "lucide-react";
import { useUser } from "@/hooks/use-user";
import { apiRequest } from "@/lib/queryClient";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface Message {
  id: number;
  sender_id: number;
  content: string;
  message_type: string;
  created_at: string;
  sender_name: string;
  sender_picture?: string;
  is_read?: boolean;
}

interface DirectMessage extends Message {
  receiver_id: number;
}

interface SocietyMember {
  id: number;
  name: string;
  email: string;
  profile_picture?: string;
  joined_at: string;
  is_admin: boolean;
}

interface Contact {
  contact_id: number;
  contact_name: string;
  contact_picture?: string;
  last_message: string;
  last_message_at: string;
  last_sender_id: number;
  unread_count: number;
}

interface Notification {
  id: number;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
  userId: number;
  metadata?: any;
}

interface ComprehensiveChatProps {
  societyId: number;
  societyName: string;
}

export default function ComprehensiveChat({ societyId, societyName }: ComprehensiveChatProps) {
  const { user } = useUser();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [message, setMessage] = useState("");
  const [activeTab, setActiveTab] = useState("society");
  const [selectedContact, setSelectedContact] = useState<number | null>(null);
  const [ws, setWs] = useState<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Society Messages Query
  const { data: societyMessages = [] } = useQuery({
    queryKey: [`/api/societies/${societyId}/messages`],
    queryFn: async () => {
      const response = await fetch(`/api/societies/${societyId}/messages`);
      if (!response.ok) return [];
      return response.json();
    },
    refetchInterval: 30000,
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

  // Direct Message Contacts Query
  const { data: directContacts = [] } = useQuery({
    queryKey: ["/api/direct-messages/contacts"],
    queryFn: async () => {
      const response = await fetch("/api/direct-messages/contacts");
      if (!response.ok) return [];
      return response.json();
    },
  });

  // Direct Messages Query (when contact selected)
  const { data: directMessages = [] } = useQuery({
    queryKey: [`/api/direct-messages/${selectedContact}`],
    queryFn: async () => {
      if (!selectedContact) return [];
      const response = await fetch(`/api/direct-messages/${selectedContact}`);
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!selectedContact,
  });

  // Notifications Query
  const { data: notifications = [] } = useQuery({
    queryKey: ["/api/notifications"],
    queryFn: async () => {
      const response = await fetch("/api/notifications");
      if (!response.ok) return [];
      return response.json();
    },
  });

  // Send Society Message Mutation
  const sendSocietyMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      const response = await fetch(`/api/societies/${societyId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, messageType: "text" }),
      });
      if (!response.ok) throw new Error("Failed to send message");
      return response.json();
    },
    onSuccess: () => {
      setMessage("");
      queryClient.invalidateQueries({ queryKey: [`/api/societies/${societyId}/messages`] });
    },
  });

  // Send Direct Message Mutation
  const sendDirectMessageMutation = useMutation({
    mutationFn: async ({ receiverId, content }: { receiverId: number; content: string }) => {
      const response = await fetch("/api/direct-messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receiverId, content, messageType: "text" }),
      });
      if (!response.ok) throw new Error("Failed to send message");
      return response.json();
    },
    onSuccess: () => {
      setMessage("");
      queryClient.invalidateQueries({ queryKey: [`/api/direct-messages/${selectedContact}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/direct-messages/contacts"] });
    },
  });

  // Handle notification actions
  const handleNotificationAction = async (notificationId: number, action: string, metadata?: any) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(metadata || {}),
      });
      if (!response.ok) throw new Error(`Failed to ${action} notification`);
      
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      
      toast({
        title: "Action completed",
        description: `Notification ${action} successfully`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to process notification action",
        variant: "destructive",
      });
    }
  };

  // WebSocket connection
  useEffect(() => {
    if (!user) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      console.log("💬 WebSocket connected for chat");
      socket.send(JSON.stringify({ 
        type: "join_society", 
        societyId: societyId,
        userId: user?.id 
      }));
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "new_society_message") {
        queryClient.invalidateQueries({ queryKey: [`/api/societies/${societyId}/messages`] });
      } else if (data.type === "new_direct_message") {
        queryClient.invalidateQueries({ queryKey: [`/api/direct-messages/${data.senderId}`] });
        queryClient.invalidateQueries({ queryKey: ["/api/direct-messages/contacts"] });
      }
    };

    socket.onclose = () => {
      console.log("💬 WebSocket disconnected");
    };

    setWs(socket);

    return () => {
      socket.close();
    };
  }, [user, societyId, queryClient]);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [societyMessages, directMessages]);

  const handleSendMessage = () => {
    if (!message.trim()) return;

    if (activeTab === "society") {
      sendSocietyMessageMutation.mutate(message);
    } else if (activeTab === "direct" && selectedContact) {
      sendDirectMessageMutation.mutate({ receiverId: selectedContact, content: message });
    }
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

  const unreadNotificationCount = notifications.filter((n: Notification) => !n.isRead).length;

  // Society Chat Section
  const SocietyChatSection = () => (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b bg-blue-50">
        <div className="flex items-center gap-2">
          <Hash className="h-5 w-5 text-blue-600" />
          <h3 className="font-semibold text-blue-900">{societyName} General Chat</h3>
          <Badge variant="secondary">{societyMembers.length} members</Badge>
        </div>
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {societyMessages.map((msg: Message) => (
            <div key={msg.id} className={`flex gap-3 ${msg.sender_id === user?.id ? 'justify-end' : ''}`}>
              {msg.sender_id !== user?.id && (
                <Avatar className="w-8 h-8">
                  <AvatarImage src={msg.sender_picture} />
                  <AvatarFallback className="text-xs">
                    {getInitials(msg.sender_name)}
                  </AvatarFallback>
                </Avatar>
              )}
              
              <div className={`max-w-[70%] ${msg.sender_id === user?.id ? 'order-first' : ''}`}>
                {msg.sender_id !== user?.id && (
                  <p className="text-xs text-gray-500 mb-1">{msg.sender_name}</p>
                )}
                <div className={`p-3 rounded-lg ${
                  msg.sender_id === user?.id 
                    ? 'bg-blue-500 text-white ml-auto' 
                    : 'bg-gray-100 text-gray-900'
                }`}>
                  <p className="text-sm">{msg.content}</p>
                  <p className={`text-xs mt-1 ${
                    msg.sender_id === user?.id ? 'text-blue-100' : 'text-gray-500'
                  }`}>
                    {formatDate(msg.created_at)}
                  </p>
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      <div className="p-4 border-t">
        <div className="flex gap-2">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
            className="flex-1"
          />
          <Button 
            onClick={handleSendMessage}
            disabled={!message.trim() || sendSocietyMessageMutation.isPending}
            size="icon"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );

  // Direct Messages Section
  const DirectMessagesSection = () => (
    <div className="flex h-full">
      {/* Contacts Sidebar */}
      <div className="w-1/3 border-r">
        <div className="p-4 border-b bg-green-50">
          <h3 className="font-semibold text-green-900 flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Direct Messages
          </h3>
        </div>
        
        <ScrollArea className="h-full">
          <div className="p-2">
            {/* Society Members Available for Direct Chat */}
            <div className="mb-4">
              <p className="text-xs font-medium text-gray-500 mb-2 px-2">SOCIETY MEMBERS</p>
              {societyMembers
                .filter((member: SocietyMember) => member.id !== user?.id)
                .map((member: SocietyMember) => (
                <Button
                  key={member.id}
                  variant={selectedContact === member.id ? "secondary" : "ghost"}
                  className="w-full justify-start p-2 h-auto mb-1"
                  onClick={() => setSelectedContact(member.id)}
                >
                  <div className="flex items-center gap-3 w-full">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={member.profile_picture} />
                      <AvatarFallback className="text-xs">
                        {getInitials(member.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 text-left">
                      <p className="text-sm font-medium">{member.name}</p>
                      {member.is_admin && (
                        <Badge variant="outline" className="text-xs">Admin</Badge>
                      )}
                    </div>
                  </div>
                </Button>
              ))}
            </div>

            {/* Recent Direct Message Contacts */}
            {directContacts.length > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-500 mb-2 px-2">RECENT CHATS</p>
                {directContacts.map((contact: Contact) => (
                  <Button
                    key={contact.contact_id}
                    variant={selectedContact === contact.contact_id ? "secondary" : "ghost"}
                    className="w-full justify-start p-2 h-auto mb-1"
                    onClick={() => setSelectedContact(contact.contact_id)}
                  >
                    <div className="flex items-center gap-3 w-full">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={contact.contact_picture} />
                        <AvatarFallback className="text-xs">
                          {getInitials(contact.contact_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 text-left">
                        <p className="text-sm font-medium">{contact.contact_name}</p>
                        <p className="text-xs text-gray-500 truncate">
                          {contact.last_message}
                        </p>
                      </div>
                      {contact.unread_count > 0 && (
                        <Badge variant="destructive" className="text-xs">
                          {contact.unread_count}
                        </Badge>
                      )}
                    </div>
                  </Button>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedContact ? (
          <>
            <div className="p-4 border-b bg-green-50">
              <div className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-green-600" />
                <h3 className="font-semibold text-green-900">
                  {societyMembers.find((m: SocietyMember) => m.id === selectedContact)?.name || 
                   directContacts.find((c: Contact) => c.contact_id === selectedContact)?.contact_name}
                </h3>
              </div>
            </div>

            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {directMessages.map((msg: DirectMessage) => (
                  <div key={msg.id} className={`flex gap-3 ${msg.sender_id === user?.id ? 'justify-end' : ''}`}>
                    {msg.sender_id !== user?.id && (
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={msg.sender_picture} />
                        <AvatarFallback className="text-xs">
                          {getInitials(msg.sender_name)}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    
                    <div className={`max-w-[70%] ${msg.sender_id === user?.id ? 'order-first' : ''}`}>
                      <div className={`p-3 rounded-lg ${
                        msg.sender_id === user?.id 
                          ? 'bg-green-500 text-white ml-auto' 
                          : 'bg-gray-100 text-gray-900'
                      }`}>
                        <p className="text-sm">{msg.content}</p>
                        <p className={`text-xs mt-1 ${
                          msg.sender_id === user?.id ? 'text-green-100' : 'text-gray-500'
                        }`}>
                          {formatDate(msg.created_at)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            <div className="p-4 border-t">
              <div className="flex gap-2">
                <Input
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type your message..."
                  className="flex-1"
                />
                <Button 
                  onClick={handleSendMessage}
                  disabled={!message.trim() || sendDirectMessageMutation.isPending}
                  size="icon"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-center p-8">
            <div>
              <MessageCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Conversation</h3>
              <p className="text-gray-500">Choose a society member to start a direct conversation</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // Notifications Section
  const NotificationsSection = () => (
    <div className="h-full">
      <div className="p-4 border-b bg-orange-50">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-orange-600" />
          <h3 className="font-semibold text-orange-900">Notifications & Approvals</h3>
          {unreadNotificationCount > 0 && (
            <Badge variant="destructive">{unreadNotificationCount}</Badge>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {notifications.length === 0 ? (
            <div className="text-center py-8">
              <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Notifications</h3>
              <p className="text-gray-500">You're all caught up!</p>
            </div>
          ) : (
            notifications.map((notification: Notification) => (
              <Card key={notification.id} className={`${!notification.isRead ? 'border-orange-200 bg-orange-50' : ''}`}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-sm">{notification.title}</h4>
                        {!notification.isRead && (
                          <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{notification.message}</p>
                      <p className="text-xs text-gray-500">
                        {formatDate(notification.createdAt)}
                      </p>
                    </div>
                    
                    {/* Action buttons for approval notifications */}
                    {notification.type === 'extension_request' && notification.metadata && (
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleNotificationAction(notification.id, 'approve', notification.metadata)}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleNotificationAction(notification.id, 'reject', notification.metadata)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                    
                    {notification.type === 'society_join_request' && notification.metadata && (
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleNotificationAction(notification.id, 'approve', notification.metadata)}
                        >
                          <UserPlus className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleNotificationAction(notification.id, 'reject', notification.metadata)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="h-screen bg-white">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
        <div className="border-b px-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="society" className="flex items-center gap-2">
              <Hash className="h-4 w-4" />
              Society Chat
            </TabsTrigger>
            <TabsTrigger value="direct" className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4" />
              Direct Messages
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Notifications
              {unreadNotificationCount > 0 && (
                <Badge variant="destructive" className="ml-1 text-xs">
                  {unreadNotificationCount}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 overflow-hidden">
          <TabsContent value="society" className="h-full m-0">
            <SocietyChatSection />
          </TabsContent>
          
          <TabsContent value="direct" className="h-full m-0">
            <DirectMessagesSection />
          </TabsContent>
          
          <TabsContent value="notifications" className="h-full m-0">
            <NotificationsSection />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}