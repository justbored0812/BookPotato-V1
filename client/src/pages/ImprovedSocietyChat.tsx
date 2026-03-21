import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Send, 
  MessageCircle, 
  Users, 
  Bell, 
  Hash, 
  ArrowLeft,
  Menu
} from "lucide-react";
import { useUser } from "@/hooks/use-user";
import { apiRequest } from "@/lib/queryClient";
import { formatDistanceToNow } from "date-fns";

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

interface ImprovedSocietyChatProps {
  societyId: number;
  societyName: string;
}

export default function ImprovedSocietyChat({ societyId, societyName }: ImprovedSocietyChatProps) {
  const { user } = useUser();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const [activeView, setActiveView] = useState<"general" | "members" | "direct" | "notifications">("general");
  const [selectedContact, setSelectedContact] = useState<number | null>(null);
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [showSidebar, setShowSidebar] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch society messages
  const { data: societyMessages = [] } = useQuery({
    queryKey: [`/api/societies/${societyId}/messages`],
    queryFn: async () => {
      const response = await fetch(`/api/societies/${societyId}/messages`);
      if (!response.ok) throw new Error('Failed to fetch messages');
      return response.json();
    }
  });

  // Fetch society members
  const { data: members = [] } = useQuery({
    queryKey: [`/api/societies/${societyId}/members`],
    queryFn: async () => {
      const response = await fetch(`/api/societies/${societyId}/members`);
      if (!response.ok) throw new Error('Failed to fetch members');
      return response.json();
    }
  });

  // Fetch direct message contacts
  const { data: contacts = [] } = useQuery({
    queryKey: ['/api/direct-messages/contacts'],
    queryFn: async () => {
      const response = await fetch('/api/direct-messages/contacts');
      if (!response.ok) throw new Error('Failed to fetch contacts');
      return response.json();
    }
  });

  // Fetch direct messages
  const { data: directMessages = [] } = useQuery({
    queryKey: [`/api/direct-messages/${selectedContact}`],
    queryFn: async () => {
      if (!selectedContact) return [];
      const response = await fetch(`/api/direct-messages/${selectedContact}`);
      if (!response.ok) throw new Error('Failed to fetch direct messages');
      return response.json();
    },
    enabled: selectedContact !== null
  });

  // Send society message mutation
  const sendSocietyMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      return apiRequest(`/api/societies/${societyId}/messages`, 'POST', { content, messageType: 'text' });
    },
    onSuccess: () => {
      setMessage("");
      queryClient.invalidateQueries({ queryKey: [`/api/societies/${societyId}/messages`] });
    }
  });

  // Send direct message mutation
  const sendDirectMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!selectedContact) throw new Error('No contact selected');
      return apiRequest(`/api/direct-messages/${selectedContact}`, 'POST', { content, messageType: 'text' });
    },
    onSuccess: () => {
      setMessage("");
      queryClient.invalidateQueries({ queryKey: [`/api/direct-messages/${selectedContact}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/direct-messages/contacts'] });
    }
  });

  // WebSocket connection
  useEffect(() => {
    if (!user) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const websocket = new WebSocket(wsUrl);

    websocket.onopen = () => {
      websocket.send(JSON.stringify({
        type: 'join_society',
        societyId,
        userId: user?.user?.id || user?.id
      }));
      setWs(websocket);
    };

    websocket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'new_message') {
        queryClient.invalidateQueries({ queryKey: [`/api/societies/${societyId}/messages`] });
      }
      
      if (data.type === 'new_direct_message') {
        queryClient.invalidateQueries({ queryKey: [`/api/direct-messages/${data.senderId}`] });
        queryClient.invalidateQueries({ queryKey: [`/api/direct-messages/${data.receiverId}`] });
        queryClient.invalidateQueries({ queryKey: ['/api/direct-messages/contacts'] });
      }
    };

    websocket.onclose = () => {
      setWs(null);
    };

    return () => {
      websocket.close();
    };
  }, [user, societyId, queryClient]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [societyMessages, directMessages]);

  const handleSendMessage = () => {
    if (!message.trim()) return;
    
    if (activeView === "general") {
      sendSocietyMessageMutation.mutate(message);
    } else if (activeView === "direct" && selectedContact) {
      sendDirectMessageMutation.mutate(message);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const startDirectChat = (memberId: number) => {
    setSelectedContact(memberId);
    setActiveView("direct");
  };

  const renderMessages = (messages: Message[]) => (
    <div className="space-y-4 p-4">
      {messages.length === 0 ? (
        <div className="text-center text-muted-foreground py-8">
          <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No messages yet. Start the conversation!</p>
        </div>
      ) : (
        messages.slice().reverse().map((msg: Message) => {
          const isMyMessage = msg.sender_id === (user?.user?.id || user?.id);
          return (
            <div
              key={msg.id}
              className={`flex gap-3 ${isMyMessage ? 'flex-row-reverse' : ''}`}
            >
              <Avatar className="h-8 w-8">
                <AvatarImage src={msg.sender_picture} />
                <AvatarFallback>
                  {msg.sender_name?.charAt(0)?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              
              <div className={`flex flex-col ${isMyMessage ? 'items-end' : 'items-start'} max-w-[70%]`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium">{msg.sender_name}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                  </span>
                </div>
                
                <div
                  className={`rounded-lg px-3 py-2 ${
                    isMyMessage
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            </div>
          );
        })
      )}
      <div ref={messagesEndRef} />
    </div>
  );

  return (
    <div className="h-[600px] flex flex-col">
      {/* Header */}
      <div className="border-b p-4 flex items-center justify-between bg-background">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setShowSidebar(!showSidebar)}>
            <Menu className="h-4 w-4" />
          </Button>
          <MessageCircle className="h-5 w-5" />
          <h3 className="font-semibold">{societyName}</h3>
        </div>
        
        {/* View Toggle Buttons */}
        <div className="flex gap-1">
          <Button 
            variant={activeView === "general" ? "default" : "ghost"} 
            size="sm"
            onClick={() => setActiveView("general")}
            className="flex items-center gap-2"
          >
            <Hash className="h-4 w-4" />
            <span className="hidden sm:inline">General</span>
          </Button>
          <Button 
            variant={activeView === "members" ? "default" : "ghost"} 
            size="sm"
            onClick={() => setActiveView("members")}
            className="flex items-center gap-2"
          >
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Members</span>
            <Badge variant="secondary" className="text-xs">
              {members.length}
            </Badge>
          </Button>
          <Button 
            variant={activeView === "direct" ? "default" : "ghost"} 
            size="sm"
            onClick={() => setActiveView("direct")}
            className="flex items-center gap-2"
          >
            <MessageCircle className="h-4 w-4" />
            <span className="hidden sm:inline">Direct</span>
            {contacts.filter((c: Contact) => c.unread_count > 0).length > 0 && (
              <Badge variant="destructive" className="text-xs">
                {contacts.reduce((sum: number, c: Contact) => sum + c.unread_count, 0)}
              </Badge>
            )}
          </Button>
          <Button 
            variant={activeView === "notifications" ? "default" : "ghost"} 
            size="sm"
            onClick={() => setActiveView("notifications")}
            className="flex items-center gap-2"
          >
            <Bell className="h-4 w-4" />
            <span className="hidden sm:inline">Notify</span>
          </Button>
        </div>
      </div>

      <div className="flex-1 flex">
        {/* Sidebar - Only show when needed */}
        {showSidebar && (activeView === "members" || activeView === "direct") && (
          <div className="w-80 border-r bg-muted/30">
            <ScrollArea className="h-full p-4">
              {activeView === "members" && (
                <div className="space-y-3">
                  <h4 className="font-medium text-sm flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Society Members ({members.length})
                  </h4>
                  {members.map((member: SocietyMember) => (
                    <div
                      key={member.id}
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-background cursor-pointer transition-colors"
                      onClick={() => startDirectChat(member.id)}
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={member.profile_picture} />
                        <AvatarFallback>
                          {member.name?.charAt(0)?.toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{member.name}</span>
                          {member.is_admin && (
                            <Badge variant="secondary" className="text-xs">Admin</Badge>
                          )}
                        </div>
                        <span className="text-sm text-muted-foreground">
                          Click to start chat
                        </span>
                      </div>
                      <MessageCircle className="h-4 w-4 text-primary" />
                    </div>
                  ))}
                </div>
              )}

              {activeView === "direct" && (
                <div className="space-y-3">
                  <h4 className="font-medium text-sm flex items-center gap-2">
                    <MessageCircle className="h-4 w-4" />
                    Recent Chats ({contacts.length})
                  </h4>
                  {contacts.map((contact: Contact) => (
                    <div
                      key={contact.contact_id}
                      className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                        selectedContact === contact.contact_id ? 'bg-primary/10' : 'hover:bg-background'
                      }`}
                      onClick={() => setSelectedContact(contact.contact_id)}
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={contact.contact_picture} />
                        <AvatarFallback>
                          {contact.contact_name?.charAt(0)?.toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{contact.contact_name}</span>
                          {contact.unread_count > 0 && (
                            <Badge variant="destructive" className="text-xs">
                              {contact.unread_count}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {contact.last_message}
                        </p>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(contact.last_message_at), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col">
          {/* Messages Area */}
          <ScrollArea className="flex-1">
            {activeView === "general" && renderMessages(societyMessages)}
            {activeView === "members" && (
              <div className="p-8 text-center text-muted-foreground">
                <Users className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">Society Members</h3>
                <p>Click on any member from the sidebar to start a private conversation</p>
              </div>
            )}
            {activeView === "direct" && selectedContact && renderMessages(directMessages)}
            {activeView === "direct" && !selectedContact && (
              <div className="p-8 text-center text-muted-foreground">
                <MessageCircle className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">Direct Messages</h3>
                <p>Select a contact from the sidebar to start chatting</p>
              </div>
            )}
            {activeView === "notifications" && (
              <div className="p-8 text-center text-muted-foreground">
                <Bell className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">Notifications</h3>
                <p>No new notifications</p>
              </div>
            )}
          </ScrollArea>

          {/* Message Input - Only show for general and direct chat */}
          {(activeView === "general" || (activeView === "direct" && selectedContact)) && (
            <div className="border-t p-4">
              <div className="flex gap-2">
                <Input
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={
                    activeView === "general" 
                      ? "Type your message to the society..." 
                      : "Type your private message..."
                  }
                  className="flex-1"
                  disabled={
                    (activeView === "general" && sendSocietyMessageMutation.isPending) ||
                    (activeView === "direct" && sendDirectMessageMutation.isPending)
                  }
                />
                <Button 
                  onClick={handleSendMessage}
                  disabled={
                    !message.trim() || 
                    (activeView === "general" && sendSocietyMessageMutation.isPending) ||
                    (activeView === "direct" && sendDirectMessageMutation.isPending)
                  }
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}