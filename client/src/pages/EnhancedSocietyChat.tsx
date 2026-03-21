import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useUser } from "@/hooks/use-user";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Send, 
  MessageCircle, 
  Users, 
  Bell, 
  Hash, 
  Plus,
  UserPlus,
  Settings
} from "lucide-react";
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

interface ChatRoom {
  id: number;
  name: string;
  description?: string;
  room_type: string;
  message_count: number;
  creator_name?: string;
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

interface EnhancedSocietyChatProps {
  societyId: number;
  societyName: string;
}

export default function EnhancedSocietyChat({ societyId, societyName }: EnhancedSocietyChatProps) {
  const { user } = useUser();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [selectedContact, setSelectedContact] = useState<number | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<string>("general");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch society members
  const { data: members = [] } = useQuery({
    queryKey: [`/api/societies/${societyId}/members`],
    queryFn: async () => {
      const response = await fetch(`/api/societies/${societyId}/members`);
      if (!response.ok) throw new Error('Failed to fetch members');
      return response.json();
    }
  });

  // Fetch chat rooms
  const { data: chatRooms = [] } = useQuery({
    queryKey: [`/api/societies/${societyId}/chat-rooms`],
    queryFn: async () => {
      const response = await fetch(`/api/societies/${societyId}/chat-rooms`);
      if (!response.ok) throw new Error('Failed to fetch chat rooms');
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

  // Fetch society messages for selected room
  const { data: societyMessages = [] } = useQuery({
    queryKey: [`/api/societies/${societyId}/messages`, selectedRoom],
    queryFn: async () => {
      const response = await fetch(`/api/societies/${societyId}/messages`);
      if (!response.ok) throw new Error('Failed to fetch messages');
      return response.json();
    },
    enabled: activeTab === "general"
  });

  // Fetch direct messages for selected contact
  const { data: directMessages = [] } = useQuery({
    queryKey: [`/api/direct-messages/${selectedContact}`],
    queryFn: async () => {
      if (!selectedContact) return [];
      const response = await fetch(`/api/direct-messages/${selectedContact}`);
      if (!response.ok) throw new Error('Failed to fetch direct messages');
      return response.json();
    },
    enabled: activeTab === "direct" && selectedContact !== null
  });

  // Fetch notifications
  const { data: notifications = [] } = useQuery({
    queryKey: ['/api/notifications'],
    queryFn: async () => {
      const response = await fetch('/api/notifications');
      if (!response.ok) throw new Error('Failed to fetch notifications');
      return response.json();
    }
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
    
    if (activeTab === "general") {
      sendSocietyMessageMutation.mutate(message);
    } else if (activeTab === "direct" && selectedContact) {
      sendDirectMessageMutation.mutate(message);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const renderSocietyMembers = () => (
    <div className="space-y-2">
      <h4 className="font-medium text-sm flex items-center gap-2">
        <Users className="h-4 w-4" />
        Society Members ({members.length})
      </h4>
      <p className="text-xs text-muted-foreground mb-3">Click on any member to start a private chat</p>
      {members.filter((member: SocietyMember) => member.id !== user?.id).map((member: SocietyMember) => (
        <div
          key={member.id}
          className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-muted transition-colors ${
            selectedContact === member.id ? 'bg-muted' : ''
          }`}
          onClick={() => {
            setSelectedContact(member.id);
            setActiveTab("direct");
          }}
        >
          <Avatar className="h-8 w-8">
            <AvatarImage src={member.profile_picture} />
            <AvatarFallback>
              {member.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{member.name}</span>
              {member.is_admin && (
                <Badge variant="secondary" className="text-xs">Admin</Badge>
              )}
            </div>
            <span className="text-xs text-muted-foreground">
              Click to chat privately
            </span>
          </div>
          <MessageCircle className="h-4 w-4 text-primary" />
        </div>
      ))}
      
      {/* Show current user */}
      {user && (
        <div className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user?.user?.profilePicture || user?.profilePicture} />
            <AvatarFallback>
              {(user?.user?.name || user?.name || 'U').charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{user?.user?.name || user?.name}</span>
              <Badge variant="outline" className="text-xs">You</Badge>
              {members.find((m: SocietyMember) => m.id === (user?.user?.id || user?.id))?.is_admin && (
                <Badge variant="secondary" className="text-xs">Admin</Badge>
              )}
            </div>
            <span className="text-xs text-muted-foreground">That's you!</span>
          </div>
        </div>
      )}
    </div>
  );

  const renderDirectMessageContacts = () => (
    <div className="space-y-2">
      <h4 className="font-medium text-sm flex items-center gap-2">
        <MessageCircle className="h-4 w-4" />
        Recent Chats ({contacts.length})
      </h4>
      {contacts.map((contact: Contact) => (
        <div
          key={contact.contact_id}
          className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-muted transition-colors ${
            selectedContact === contact.contact_id ? 'bg-muted' : ''
          }`}
          onClick={() => {
            setSelectedContact(contact.contact_id);
            setActiveTab("direct");
          }}
        >
          <Avatar className="h-8 w-8">
            <AvatarImage src={contact.contact_picture} />
            <AvatarFallback>
              {contact.contact_name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{contact.contact_name}</span>
              {contact.unread_count > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {contact.unread_count}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground truncate">
              {contact.last_sender_id === user?.id ? 'You: ' : ''}{contact.last_message}
            </p>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(contact.last_message_at), { addSuffix: true })}
            </span>
          </div>
        </div>
      ))}
    </div>
  );

  const renderChatRooms = () => (
    <div className="space-y-2">
      <h4 className="font-medium text-sm flex items-center gap-2">
        <Hash className="h-4 w-4" />
        Chat Rooms ({chatRooms.length})
      </h4>
      {chatRooms.map((room: ChatRoom) => (
        <div
          key={room.id}
          className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-muted transition-colors ${
            selectedRoom === room.id ? 'bg-muted' : ''
          }`}
          onClick={() => {
            setSelectedRoom(room.id);
            setActiveTab("general");
          }}
        >
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Hash className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{room.name}</span>
              <span className="text-xs text-muted-foreground">{room.message_count}</span>
            </div>
            {room.description && (
              <p className="text-xs text-muted-foreground truncate">{room.description}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );

  const renderMessages = (messages: Message[]) => (
    <div className="space-y-4 p-4">
      {messages.length === 0 ? (
        <div className="text-center text-muted-foreground py-8">
          <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No messages yet. Start the conversation!</p>
        </div>
      ) : (
        messages.slice().reverse().map((msg: Message) => (
          <div
            key={msg.id}
            className={`flex items-start gap-3 ${
              msg.sender_id === (user?.user?.id || user?.id) ? 'flex-row-reverse' : ''
            }`}
          >
            <Avatar className="h-8 w-8">
              <AvatarImage src={msg.sender_picture} />
              <AvatarFallback>
                {msg.sender_name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            
            <div className={`flex flex-col ${msg.sender_id === (user?.user?.id || user?.id) ? 'items-end' : 'items-start'}`}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium">{msg.sender_name}</span>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                </span>
              </div>
              
              <div
                className={`rounded-lg px-3 py-2 max-w-[70%] ${
                  msg.sender_id === (user?.user?.id || user?.id)
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          </div>
        ))
      )}
      <div ref={messagesEndRef} />
    </div>
  );

  const renderNotifications = () => (
    <div className="space-y-2 p-4">
      <h4 className="font-medium text-sm flex items-center gap-2">
        <Bell className="h-4 w-4" />
        Notifications ({notifications.length})
      </h4>
      {notifications.length === 0 ? (
        <div className="text-center text-muted-foreground py-8">
          <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No new notifications</p>
        </div>
      ) : (
        notifications.map((notification: any) => (
          <div key={notification.id} className="p-3 bg-muted rounded-lg">
            <h5 className="font-medium text-sm">{notification.title}</h5>
            <p className="text-sm text-muted-foreground">{notification.message}</p>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
            </span>
          </div>
        ))
      )}
    </div>
  );

  return (
    <div className="h-[600px] flex">
      {/* Sidebar */}
      <div className="w-80 border-r bg-background">
        <div className="p-4 border-b">
          <h3 className="font-semibold flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            {societyName}
          </h3>
        </div>
        
        <ScrollArea className="h-[calc(600px-80px)]">
          <div className="p-4 space-y-6">
            {renderChatRooms()}
            {renderSocietyMembers()}
            {renderDirectMessageContacts()}
          </div>
        </ScrollArea>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <div className="border-b p-2 flex-shrink-0">
            <TabsList className="grid w-full grid-cols-3 h-10">
              <TabsTrigger value="general" className="flex items-center gap-1 text-xs px-2">
                <Hash className="h-3 w-3" />
                <span className="hidden sm:inline">General Chat</span>
                <span className="sm:hidden">Chat</span>
              </TabsTrigger>
              <TabsTrigger value="direct" className="flex items-center gap-1 text-xs px-2">
                <MessageCircle className="h-3 w-3" />
                <span className="hidden sm:inline">Direct Messages</span>
                <span className="sm:hidden">Direct</span>
                {contacts.filter((c: Contact) => c.unread_count > 0).length > 0 && (
                  <Badge variant="destructive" className="ml-1 text-xs h-4 w-4 p-0 flex items-center justify-center">
                    {contacts.reduce((sum: number, c: Contact) => sum + c.unread_count, 0)}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="notifications" className="flex items-center gap-1 text-xs px-2">
                <Bell className="h-3 w-3" />
                <span className="hidden sm:inline">Notifications</span>
                <span className="sm:hidden">Notify</span>
                {notifications.length > 0 && (
                  <Badge variant="destructive" className="ml-1 text-xs h-4 w-4 p-0 flex items-center justify-center">
                    {notifications.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="general" className="flex-1 flex flex-col m-0 data-[state=active]:flex">
            <ScrollArea className="flex-1">
              {renderMessages(societyMessages)}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="direct" className="flex-1 flex flex-col m-0 data-[state=active]:flex">
            {selectedContact ? (
              <>
                <div className="border-b p-3 flex-shrink-0">
                  <h4 className="font-medium">
                    Chat with {members.find((m: SocietyMember) => m.id === selectedContact)?.name}
                  </h4>
                </div>
                <ScrollArea className="flex-1">
                  {renderMessages(directMessages)}
                </ScrollArea>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Select a member to start chatting</p>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="notifications" className="flex-1 m-0 data-[state=active]:flex">
            <ScrollArea className="h-full">
              {renderNotifications()}
            </ScrollArea>
          </TabsContent>

          {/* Message Input - only show for general and direct tabs */}
          {(activeTab === "general" || (activeTab === "direct" && selectedContact)) && (
            <div className="border-t p-4">
              <div className="flex gap-2">
                <Input
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={
                    activeTab === "general" 
                      ? "Type your message to the society..." 
                      : "Type your private message..."
                  }
                  className="flex-1"
                  disabled={
                    (activeTab === "general" && sendSocietyMessageMutation.isPending) ||
                    (activeTab === "direct" && sendDirectMessageMutation.isPending)
                  }
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={
                    !message.trim() || 
                    (activeTab === "general" && sendSocietyMessageMutation.isPending) ||
                    (activeTab === "direct" && sendDirectMessageMutation.isPending)
                  }
                  size="icon"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </Tabs>
      </div>
    </div>
  );
}