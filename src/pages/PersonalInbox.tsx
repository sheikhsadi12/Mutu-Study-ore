import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { User } from '@supabase/supabase-js';
import { Send, ArrowLeft, CheckCircle2, User as UserIcon, MessageSquare } from 'lucide-react';
import { ADMIN_EMAIL, CO_ADMIN_EMAILS } from '../components/PrivateRoute';
import { useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';
import { Header } from '../components/Header';

interface DirectMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  is_read: boolean;
}

interface ChatUser {
  id: string;
  email: string;
  username: string;
  avatar_url?: string;
  unread_count: number;
  last_message_at: string;
}

export function PersonalInbox({ toggleTheme, isDarkMode }: any) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  
  // For Admin view
  const [chatUsers, setChatUsers] = useState<ChatUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const user = session?.user;
      if (user) {
        setCurrentUser(user);
        const adminCheck = user.email === ADMIN_EMAIL || (user.email && CO_ADMIN_EMAILS.includes(user.email));
        setIsAdmin(!!adminCheck);
      } else {
        navigate('/login');
      }
    });
  }, [navigate]);

  useEffect(() => {
    if (!currentUser) return;

    if (isAdmin) {
      fetchAdminInbox();
    } else {
      fetchUserMessages();
    }

    const channel = supabase.channel('direct_messages_changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'direct_messages' }, (payload) => {
        const newMsg = payload.new as DirectMessage;
        
        if (isAdmin) {
          if (selectedUserId && (newMsg.sender_id === selectedUserId || newMsg.receiver_id === selectedUserId)) {
            setMessages(prev => [...prev, newMsg]);
            if (newMsg.sender_id === selectedUserId) {
               markAsRead(newMsg.id);
            }
          }
          fetchAdminInbox(); // Refresh user list
        } else {
          if (newMsg.sender_id === currentUser.id || newMsg.receiver_id === currentUser.id) {
            setMessages(prev => [...prev, newMsg]);
            if (newMsg.receiver_id === currentUser.id) {
               markAsRead(newMsg.id);
            }
          }
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser, isAdmin, selectedUserId]);

  useEffect(() => {
    if (isAdmin && selectedUserId) {
      fetchMessagesForAdmin(selectedUserId);
    }
  }, [selectedUserId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchUserMessages = async () => {
    if (!currentUser) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('direct_messages')
      .select('*')
      .or(`sender_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`)
      .order('created_at', { ascending: true });

    if (error) {
       if (error.code === '42P01') {
          console.error("direct_messages table missing");
       }
    } else if (data) {
      setMessages(data);
      // Mark unread from admin as read
      const unreadIds = data.filter(m => m.receiver_id === currentUser.id && !m.is_read).map(m => m.id);
      if (unreadIds.length > 0) {
         await supabase.from('direct_messages').update({ is_read: true }).in('id', unreadIds);
      }
    }
    setLoading(false);
  };

  const fetchAdminInbox = async () => {
    // Custom query or fetching all messages to aggregate users
    const { data: allMsgs, error } = await supabase
      .from('direct_messages')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (error || !allMsgs) {
       setLoading(false);
       return;
    }
    
    // Aggregate unique users interacting with admin
    const userMap = new Map<string, any>();
    allMsgs.forEach((msg) => {
       const otherId = msg.sender_id === currentUser?.id ? msg.receiver_id : msg.sender_id;
       if (!userMap.has(otherId)) {
          userMap.set(otherId, {
             id: otherId,
             unread_count: 0,
             last_message_at: msg.created_at
          });
       }
       if (msg.receiver_id === currentUser?.id && !msg.is_read) {
          userMap.get(otherId).unread_count += 1;
       }
    });
    
    // Fetch profiles for those users
    const userIds = Array.from(userMap.keys());
    if (userIds.length > 0) {
      const { data: profiles } = await supabase.from('profiles').select('id, username, email, avatar_url').in('id', userIds);
      if (profiles) {
         profiles.forEach(p => {
            if (userMap.has(p.id)) {
               const u = userMap.get(p.id);
               u.email = p.email;
               u.username = p.username;
               u.avatar_url = p.avatar_url;
            }
         });
      }
    }
    
    setChatUsers(Array.from(userMap.values()).sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()));
    setLoading(false);
  };

  const fetchMessagesForAdmin = async (userId: string) => {
    setLoading(true);
    const { data } = await supabase
      .from('direct_messages')
      .select('*')
      .or(`and(sender_id.eq.${currentUser?.id},receiver_id.eq.${userId}),and(sender_id.eq.${userId},receiver_id.eq.${currentUser?.id})`)
      .order('created_at', { ascending: true });

    if (data) {
      setMessages(data);
      // Mark unread as read
      const unreadIds = data.filter(m => m.receiver_id === currentUser?.id && !m.is_read).map(m => m.id);
      if (unreadIds.length > 0) {
         await supabase.from('direct_messages').update({ is_read: true }).in('id', unreadIds);
         setChatUsers(prev => prev.map(u => u.id === userId ? { ...u, unread_count: 0 } : u));
      }
    }
    setLoading(false);
  };

  const markAsRead = async (msgId: string) => {
     await supabase.from('direct_messages').update({ is_read: true }).eq('id', msgId);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentUser) return;
    
    // If user is not admin, they message the primary admin (or we need to know the admin ID)
    // For simplicity, if receiver_id is needed, regular users send to a fixed role or we fetch the admin id.
    // If admin is responding, they send to selectedUserId.
    let receiverId = selectedUserId;
    if (!isAdmin) {
       // Fetch primary admin ID
       const { data: adminProfile } = await supabase.from('profiles').select('id').eq('email', ADMIN_EMAIL).single();
       if (adminProfile) {
          receiverId = adminProfile.id;
       } else {
          alert("Admin account not found.");
          return;
       }
    }
    
    if (!receiverId) return;

    const newMsgObj = {
      sender_id: currentUser.id,
      receiver_id: receiverId,
      content: newMessage.trim(),
      is_read: false
    };

    setNewMessage('');
    const { error } = await supabase.from('direct_messages').insert([newMsgObj]);
    if (error) {
       console.error("Error sending message:", error);
       alert("Could not send message. Ensure 'direct_messages' table exists.");
    }
  };

  const ChatArea = () => (
    <div className="flex flex-col h-full bg-theme-bg">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading && messages.length === 0 ? (
          <div className="flex justify-center py-10">
            <div className="w-8 h-8 border-2 border-theme-accent-end border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-theme-text/50">
             <MessageSquare className="w-12 h-12 mb-3 opacity-20" />
             <p className="text-sm">No messages yet.</p>
             {!isAdmin && <p className="text-xs mt-1">Send a message to contact the admin directly.</p>}
          </div>
        ) : (
          messages.map((msg, idx) => {
            const isMe = msg.sender_id === currentUser?.id;
            return (
              <div key={msg.id} className={cn("flex flex-col max-w-[80%]", isMe ? "ml-auto items-end" : "mr-auto items-start")}>
                <div className={cn(
                  "px-4 py-2.5 rounded-2xl text-sm shadow-sm",
                  isMe ? "bg-gradient-to-br from-theme-accent-start to-theme-accent-end text-white rounded-br-sm" : "bg-theme-muted/50 border border-theme-border text-theme-text rounded-bl-sm"
                )}>
                  {msg.content}
                </div>
                <span className="text-[10px] text-theme-text/40 mt-1 px-1">
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  {isMe && msg.is_read && <CheckCircle2 className="w-3 h-3 inline ml-1 text-theme-accent-end" />}
                </span>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <div className="p-4 bg-theme-bg border-t border-theme-border shrink-0">
        <form onSubmit={handleSendMessage} className="flex gap-2 max-w-4xl mx-auto w-full">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 bg-theme-muted/30 border border-theme-border rounded-full px-4 py-3 text-sm focus:outline-none focus:border-theme-accent-end focus:ring-1 focus:ring-theme-accent-end"
          />
          <button 
            type="submit" 
            disabled={!newMessage.trim()}
            className="w-11 h-11 flex items-center justify-center rounded-full bg-theme-accent-end text-white shadow-md disabled:opacity-50 transition-transform active:scale-95"
          >
            <Send className="w-5 h-5 ml-1" />
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-screen max-h-[100dvh] bg-theme-bg text-theme-text font-sans overflow-hidden">
      <Header toggleTheme={toggleTheme} isDarkMode={isDarkMode} searchQuery="" setSearchQuery={() => {}} onBack={() => navigate(-1)} />
      
      <div className="flex flex-1 overflow-hidden relative">
        {isAdmin ? (
          <>
            {/* Sidebar for Admin */}
            <div className={cn("w-full md:w-80 bg-theme-muted/20 border-r border-theme-border flex flex-col shrink-0 transition-transform duration-300", selectedUserId ? "hidden md:flex" : "flex")}>
               <div className="p-4 border-b border-theme-border bg-theme-bg">
                  <h2 className="font-bold text-lg">Inbox</h2>
               </div>
               <div className="flex-1 overflow-y-auto">
                  {loading && chatUsers.length === 0 ? (
                     <div className="p-4 text-center text-theme-text/50 text-sm">Loading...</div>
                  ) : chatUsers.length === 0 ? (
                     <div className="p-4 text-center text-theme-text/50 text-sm">No conversations yet.</div>
                  ) : (
                     chatUsers.map(u => (
                        <div 
                           key={u.id} 
                           onClick={() => setSelectedUserId(u.id)}
                           className={cn("p-4 border-b border-theme-border/50 flex items-center gap-3 cursor-pointer hover:bg-theme-muted/50 transition-colors", selectedUserId === u.id && "bg-theme-muted")}
                        >
                           <div className="w-10 h-10 rounded-full bg-theme-accent-start/20 flex items-center justify-center text-theme-accent-end font-bold shrink-0">
                              {u.avatar_url ? <img src={u.avatar_url} className="w-full h-full rounded-full object-cover" /> : (u.username?.[0] || u.email?.[0] || '?').toUpperCase()}
                           </div>
                           <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-sm truncate">{u.username || u.email || 'Unknown User'}</h3>
                              <p className="text-xs text-theme-text/50 truncate">Click to view messages</p>
                           </div>
                           {u.unread_count > 0 && (
                              <div className="w-5 h-5 bg-theme-accent-end rounded-full text-white text-[10px] font-bold flex items-center justify-center">
                                 {u.unread_count}
                              </div>
                           )}
                        </div>
                     ))
                  )}
               </div>
            </div>
            
            {/* Chat Area for Admin */}
            <div className={cn("flex-1 flex flex-col min-w-0", !selectedUserId ? "hidden md:flex" : "flex")}>
               {selectedUserId ? (
                  <>
                     <div className="p-3 md:p-4 border-b border-theme-border bg-theme-bg flex items-center gap-3">
                        <button className="md:hidden p-2 text-theme-text/70" onClick={() => setSelectedUserId(null)}>
                           <ArrowLeft className="w-5 h-5" />
                        </button>
                        <h2 className="font-bold">Chat with User</h2>
                     </div>
                     <ChatArea />
                  </>
               ) : (
                  <div className="flex-1 flex items-center justify-center text-theme-text/40 flex-col gap-3">
                     <MessageSquare className="w-12 h-12 opacity-20" />
                     <p>Select a user to view conversation</p>
                  </div>
               )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col w-full max-w-4xl mx-auto border-x border-theme-border shadow-sm relative bg-theme-bg">
             <div className="p-4 border-b border-theme-border bg-theme-muted/30 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-theme-accent-start to-theme-accent-end flex items-center justify-center shrink-0">
                   <UserIcon className="w-5 h-5 text-white" />
                </div>
                <div>
                   <h2 className="font-bold text-lg">Support Admin</h2>
                   <p className="text-xs text-theme-text/60">Usually replies within a few hours</p>
                </div>
             </div>
             <ChatArea />
          </div>
        )}
      </div>
    </div>
  );
}
