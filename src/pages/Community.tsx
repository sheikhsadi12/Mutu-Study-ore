import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Send, MessageCircle, User, Loader2, X, Trash2, Ban, MoreVertical, Copy, Check } from 'lucide-react';
import { User as AuthUser } from '@supabase/supabase-js';
import { cn } from '../lib/utils';

interface ProfileData {
  id: string;
  username: string;
  avatar_url: string;
  is_banned?: boolean;
}

interface Message {
  id: string;
  user_id: string;
  message: string;
  created_at: string;
  username: string;
  avatar_url: string;
}

const AVATAR_SEEDS = ['bot1', 'bot2', 'bot3', 'bot4', 'bot5', 'bot6', 'bot7', 'bot8'];

const ChatBubble = React.memo(({ msg, isMe, showHeader, isAdmin, onDelete, onBan, onViewProfile }: { msg: Message, isMe: boolean, showHeader: boolean, isAdmin: boolean, onDelete: (id: string) => void, onBan: (userId: string) => void, onViewProfile: (msg: Message) => void }) => {
  const [showMenu, setShowMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isMsgAdmin = msg.avatar_url?.includes('#admin') || false;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };
    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenu]);

  const handleCopy = () => {
    navigator.clipboard.writeText(msg.message);
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
      setShowMenu(false);
    }, 2000);
  };

  return (
    <div className={cn("flex flex-col w-full relative", isMe ? "items-end" : "items-start", !showHeader ? "mt-1" : "mt-4")}>
      {showHeader && !isMe && (
         <div className="flex items-center gap-2 mb-1.5 ml-1">
            <img src={msg.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${msg.user_id}`} alt="Avatar" className="w-5 h-5 rounded-full bg-theme-muted" />
            <span className="text-[10px] font-bold text-theme-text/50">{msg.username || 'Unknown User'}</span>
            {isMsgAdmin && (
              <span className="text-[9px] bg-yellow-500/20 border border-yellow-500/30 text-yellow-500 px-1.5 py-0.5 rounded font-black tracking-widest uppercase shadow-sm">👑 Admin</span>
            )}
            <span className="text-[9px] text-theme-text/30">{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
         </div>
      )}
      
      <div className={cn("flex items-center gap-1.5 w-full", isMe ? "justify-end" : "justify-start")}>
        {isMe && (
          <div className="relative" ref={isMe ? menuRef : null}>
            <button 
              onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }} 
              className="p-1.5 text-theme-text/40 hover:text-theme-text/80 rounded-full transition-colors active:bg-theme-muted mt-auto"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
            {showMenu && (
              <div className="absolute top-full mt-1 right-0 min-w-[140px] bg-theme-bg border border-theme-border rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 z-[100]">
                <button onClick={(e) => { e.stopPropagation(); handleCopy(); }} className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-theme-text hover:bg-theme-muted/50 transition-colors text-left font-medium">
                  {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copied!' : 'Copy Text'}
                </button>
                <div className="h-px bg-theme-border/50 w-full" />
                <button onClick={(e) => { e.stopPropagation(); setShowMenu(false); onDelete(msg.id); }} className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-red-500 hover:bg-red-500/10 transition-colors text-left font-medium">
                  <Trash2 className="w-3.5 h-3.5" />
                  Unsend
                </button>
              </div>
            )}
          </div>
        )}
        
        <div 
          className={cn(
            "w-fit max-w-[85%] px-4 py-2 text-[15px] leading-relaxed whitespace-pre-wrap break-words relative",
            isMsgAdmin 
              ? "bg-gradient-to-r from-[#2a020b] to-[#4C0519] text-[#e8c3a2] rounded-2xl shadow-lg border border-[#4C0519]/50" 
              : isMe 
                ? "bg-theme-accent-start text-white rounded-2xl rounded-tr-sm shadow-sm" 
                : "bg-theme-card border border-theme-border/70 text-theme-text rounded-2xl rounded-tl-sm shadow-sm",
            isMsgAdmin && isMe ? "rounded-tr-sm" : isMsgAdmin && !isMe ? "rounded-tl-sm" : ""
          )}
        >
          {msg.message}
        </div>

        {!isMe && (
          <div className="relative" ref={!isMe ? menuRef : null}>
             <button 
              onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }} 
              className="p-1.5 text-theme-text/40 hover:text-theme-text/80 rounded-full transition-colors active:bg-theme-muted mt-auto"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
            {showMenu && (
              <div className="absolute top-full mt-1 left-0 min-w-[140px] bg-theme-bg border border-theme-border rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 z-[100]">
                <button onClick={(e) => { e.stopPropagation(); handleCopy(); }} className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-theme-text hover:bg-theme-muted/50 transition-colors text-left font-medium">
                  {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copied!' : 'Copy Text'}
                </button>
                {isAdmin && (
                  <>
                    <div className="h-px bg-theme-border/50 w-full" />
                    <button onClick={(e) => { e.stopPropagation(); setShowMenu(false); onViewProfile(msg); }} className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-theme-text hover:bg-theme-muted/50 transition-colors text-left font-medium">
                      <User className="w-3.5 h-3.5" />
                      View Profile
                    </button>
                    <div className="h-px bg-theme-border/50 w-full" />
                    <button onClick={(e) => { e.stopPropagation(); setShowMenu(false); onBan(msg.user_id); }} className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-red-500 hover:bg-red-500/10 transition-colors text-left font-medium">
                      <Ban className="w-3.5 h-3.5" />
                      Ban User
                    </button>
                    <div className="h-px bg-theme-border/50 w-full" />
                    <button onClick={(e) => { e.stopPropagation(); setShowMenu(false); onDelete(msg.id); }} className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-red-500 hover:bg-red-500/10 transition-colors text-left font-medium">
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {showHeader && isMe && (
         <div className="flex items-center gap-2 mt-1 mr-2 opacity-50">
            <span className="text-[9px] text-theme-text/70">{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
         </div>
      )}
    </div>
  );
});

export function Community() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  
  // Setup Modal State
  const [showSetup, setShowSetup] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newAvatar, setNewAvatar] = useState(`https://api.dicebear.com/7.x/bottts/svg?seed=${AVATAR_SEEDS[0]}`);
  const [isSavingSetup, setIsSavingSetup] = useState(false);

  // Chat State
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const scrollContainerRef = useRef<HTMLElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [selectedAdminProfile, setSelectedAdminProfile] = useState<Message | null>(null);

  const subscriptionRef = useRef<any>(null);

  const isAdmin = user?.email === 'sadishekh671@gmail.com';

  const handleDeleteMessage = async (messageId: string) => {
    try {
      setMessages(prev => prev.filter(m => m.id !== messageId)); // Optimistic UI
      const { error } = await supabase.from('community_messages').delete().eq('id', messageId);
      if (error) {
         fetchMessages(); // Revert on error
         throw error;
      }
    } catch (e: any) {
      console.error('Error deleting message:', e);
      alert('Failed to delete message.');
    }
  };

  const handleBanUser = async (userId: string) => {
    if (!window.confirm("Are you sure you want to ban this user?")) return;
    try {
      const { error } = await supabase.from('profiles').update({ is_banned: true }).eq('id', userId);
      if (error) throw error;
      alert('User successfully banned.');
    } catch (e: any) {
      console.error('Error banning user:', e);
      alert('Failed to ban user.');
    }
  };

  const handleClearAllMessages = async () => {
    if (!window.confirm("Are you sure you want to permanently delete ALL messages for everyone?")) return;
    try {
      setMessages([]);
      // The user specifically requested `.neq('id', 0)` approach to satisfy Supabase's require-filter-for-deletes.
      // We will cast to any to satisfy TS, though practically .neq('id', '00000000-0000-0000-0000-000000000000') is safer for UUID columns
      const { error } = await supabase.from('community_messages').delete().neq('id', '00000000-0000-0000-0000-000000000000' as any);
      if (error) {
        // Fallback to literal 0 if the id is actually a numeric serial column
        await supabase.from('community_messages').delete().neq('id', 0 as any);
      }
    } catch (e: any) {
      console.error('Error clearing messages:', e);
      alert('Failed to clear messages.');
      fetchMessages();
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        checkProfile(session.user.id);
      } else {
        navigate('/login');
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUser(session.user);
        checkProfile(session.user.id);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
      }
    };
  }, [navigate]);

  const checkProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching profile:', error);
      }

      if (data && data.username) {
        setProfile(data);
        fetchMessages();
        setupRealtimeSubscription();
        
        // If coming from Profile page settings
        const searchParams = new URLSearchParams(location.search);
        if (searchParams.get('setup') === 'true') {
           setNewUsername(data.username);
           setNewAvatar(data.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${AVATAR_SEEDS[0]}`);
           setShowSetup(true);
        }
      } else {
        setShowSetup(true);
        setIsLoading(false);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim() || !user) return;

    setIsSavingSetup(true);
    try {
      const payload = {
        id: user.id,
        username: newUsername.trim(),
        avatar_url: newAvatar,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase.from('profiles').upsert(payload);
      
      if (error) throw error;
      
      try {
        await supabase.from('admin_user_list').update({ username: newUsername.trim() }).eq('id', user.id);
      } catch(syncErr) {
        console.error("Admin user list sync error:", syncErr);
      }
      
      setProfile(payload as ProfileData);
      setShowSetup(false);
      fetchMessages();
      setupRealtimeSubscription();
    } catch (e: any) {
      console.error(e);
      alert('Error saving profile: ' + (e.message || 'Unknown error'));
    } finally {
      setIsSavingSetup(false);
    }
  };

  const fetchMessages = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('community_messages')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching messages:', error);
      } else if (data) {
        setMessages((data as Message[]).reverse());
      }
      scrollToBottom(true);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    if (subscriptionRef.current) return;

    const channel = supabase
      .channel(`community_messages_${Date.now()}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'community_messages' },
        (payload) => {
          setMessages(prev => {
             if (prev.find(m => m.id === payload.new.id)) return prev;
             return [...prev, payload.new as Message];
          });
          scrollToBottom();
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'community_messages' },
        (payload) => {
          setMessages(prev => prev.filter(m => m.id !== payload.old.id));
        }
      )
      .subscribe();

    subscriptionRef.current = channel;
  };

  const scrollToBottom = (force = false) => {
    setTimeout(() => {
       if (force) {
           messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
           return;
       }
       if (scrollContainerRef.current) {
           const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
           // If user is within 250px of the bottom, auto-scroll gracefully to the new message
           if (scrollHeight - scrollTop - clientHeight < 250) {
               messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
           }
       } else {
           messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
       }
    }, 100);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !profile) return;

    const msgText = newMessage.trim();
    setNewMessage(''); // optimistic clear

    try {
      const isAdminUser = user.email === 'sadishekh671@gmail.com';
      const finalAvatarUrl = isAdminUser ? `${profile.avatar_url}#admin` : profile.avatar_url;

      const { data, error } = await supabase
        .from('community_messages')
        .insert([{
          user_id: user.id,
          message: msgText,
          username: profile.username,
          avatar_url: finalAvatarUrl
        }])
        .select()
        .single();

      if (error) throw error;
      
      if (data) {
        setMessages(prev => {
          if (prev.find(m => m.id === data.id)) return prev;
          return [...prev, data as Message];
        });
        scrollToBottom();
      }
    } catch (e: any) {
      console.error(e);
      alert('Error sending message: ' + (e.message || 'Unknown error'));
      setNewMessage(msgText); // restore
    }
  };

  if (!user) return null;

  return (
    <div className="flex flex-col min-h-screen bg-theme-bg font-sans max-h-screen">
      <header className="h-[56px] px-4 md:px-6 flex items-center border-b border-theme-border bg-theme-bg shrink-0 z-40 sticky top-0 justify-between w-full">
        <div className="flex items-center">
            <button onClick={() => navigate('/')} className="p-2 rounded-full hover:bg-theme-muted transition-colors text-theme-text/80 mr-3 shrink-0">
            <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-theme-accent-start to-theme-accent-end flex items-center justify-center text-white shrink-0">
                <MessageCircle className="w-4 h-4" />
            </div>
            <div>
                <h1 className="text-base md:text-lg font-heading font-black text-theme-accent-start leading-none truncate max-w-[150px] sm:max-w-none">Community</h1>
                <p className="text-[10px] text-theme-text/50 uppercase tracking-widest mt-0.5 truncate max-w-[150px] sm:max-w-none">End-to-End Anonymous</p>
            </div>
            </div>
        </div>
        
        <div className="flex items-center gap-2">
          {isAdmin && (
             <button
               onClick={handleClearAllMessages}
               className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 text-xs font-bold rounded-full transition-colors border border-red-500/20 mr-1 sm:mr-2"
             >
               <Trash2 className="w-3.5 h-3.5" />
               <span className="hidden sm:inline">Clear Chat</span>
             </button>
          )}
          {profile && (
               <button 
                  onClick={() => {
                     setNewUsername(profile.username);
                     setNewAvatar(profile.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${AVATAR_SEEDS[0]}`);
                     setShowSetup(true);
                  }}
                  className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-2 text-xs font-bold text-theme-text/70 bg-theme-muted/50 hover:bg-theme-muted rounded-full transition-colors border border-theme-border"
               >
                  <img src={profile.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.id}`} alt="Me" className="w-5 h-5 rounded-full shrink-0" />
                  <span className="hidden sm:inline truncate max-w-[100px]">{profile.username}</span>
               </button>
          )}
        </div>
      </header>

      {showSetup ? (
        <div className="flex-1 flex items-center justify-center p-4 relative isolate z-50">
           {/* Blur Overlay */}
           <div className="absolute inset-0 bg-theme-bg/80 backdrop-blur-md z-0" />
           
           <div className="card-base p-6 md:p-8 w-full max-w-md relative z-10 rounded-[24px] shadow-2xl border-theme-border/50 animate-in zoom-in-95 duration-300">
             {profile && (
                 <button onClick={() => setShowSetup(false)} className="absolute top-4 right-4 p-2 rounded-full hover:bg-theme-muted text-theme-text/50 transition-colors hover:text-theme-text">
                    <X className="w-5 h-5" />
                 </button>
             )}
             <div className="text-center mb-6">
               <div className="w-16 h-16 mx-auto bg-theme-accent-start/10 rounded-full flex items-center justify-center mb-4 border border-theme-accent-start/20">
                 <User className="w-8 h-8 text-theme-accent-start" />
               </div>
               <h2 className="text-2xl font-black font-heading text-theme-text">Privacy First</h2>
               <p className="text-sm text-theme-text/60 mt-2">Set your Community Nickname & Avatar. Your real email will be strictly hidden from everyone.</p>
             </div>

             <form onSubmit={handleSaveSetup} className="space-y-6">
                <div>
                   <label className="text-xs font-bold text-theme-text/70 uppercase mb-3 block text-center">Select an Identity (Avatar)</label>
                   <div className="flex flex-wrap justify-center gap-3 mb-2">
                      {AVATAR_SEEDS.map(seed => {
                        const url = `https://api.dicebear.com/7.x/bottts/svg?seed=${seed}`;
                        return (
                          <button
                            key={seed}
                            type="button"
                            onClick={() => setNewAvatar(url)}
                            className={cn(
                              "w-12 h-12 rounded-full border-2 transition-all overflow-hidden",
                              newAvatar === url ? "border-theme-accent-start scale-110 shadow-lg" : "border-theme-border opacity-60 hover:opacity-100"
                            )}
                          >
                            <img src={url} alt={seed} className="w-full h-full bg-theme-muted" />
                          </button>
                        );
                      })}
                   </div>
                </div>

                <div>
                   <label className="text-xs font-bold text-theme-text/70 uppercase mb-1.5 block">Community Nickname *</label>
                   <input
                     type="text"
                     required
                     maxLength={20}
                     placeholder="e.g. StudyNinja99"
                     value={newUsername}
                     onChange={(e) => setNewUsername(e.target.value)}
                     className="w-full px-4 py-3 bg-theme-muted/30 border border-theme-border rounded-xl focus:border-theme-accent-end focus:outline-none transition-colors text-theme-text font-bold"
                   />
                </div>

                <button 
                  type="submit" 
                  disabled={isSavingSetup || !newUsername.trim()}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-theme-accent-start to-theme-accent-end text-white font-bold disabled:opacity-50 transition-all hover:opacity-90 shadow-md"
                >
                  {isSavingSetup ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Access Community"}
                </button>
             </form>
           </div>
        </div>
      ) : (
        <>
          <main ref={scrollContainerRef} className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 relative scroll-smooth">
            {isLoading ? (
               <div className="h-full flex items-center justify-center text-theme-text/40 gap-2">
                 <Loader2 className="w-5 h-5 animate-spin" /> Loading connection...
               </div>
            ) : messages.length === 0 ? (
               <div className="text-center py-20 text-theme-text/50">
                 <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-20" />
                 <p>No messages yet. Say hello to the community!</p>
               </div>
            ) : (
               messages.map((msg, idx) => {
                 const isMe = msg.user_id === user?.id;
                 const showHeader = idx === 0 || messages[idx - 1].user_id !== msg.user_id || 
                    (new Date(msg.created_at).getTime() - new Date(messages[idx - 1].created_at).getTime() > 5 * 60000); // 5 mins gap

                 return <ChatBubble 
                   key={msg.id} 
                   msg={msg} 
                   isMe={isMe} 
                   showHeader={showHeader}
                   isAdmin={isAdmin}
                   onDelete={handleDeleteMessage}
                   onBan={handleBanUser}
                   onViewProfile={setSelectedAdminProfile}
                 />;
               })
            )}
            <div ref={messagesEndRef} className="h-20 shrink-0" />
          </main>

          <footer className="p-4 border-t border-theme-border bg-theme-bg shrink-0">
            {profile?.is_banned ? (
               <div className="max-w-4xl mx-auto bg-red-500/10 border border-red-500/20 text-red-500 text-sm font-bold p-4 rounded-xl flex items-center justify-center gap-2 text-center">
                  <Ban className="w-5 h-5 shrink-0" />
                  You have been restricted from the community for violating rules.
               </div>
            ) : (
               <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto relative flex items-center">
                  <input 
                    type="text"
                    placeholder={`Message as ${profile?.username}...`}
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    className="w-full bg-theme-muted/30 border border-theme-border rounded-full py-3.5 pl-6 pr-14 text-sm focus:outline-none focus:border-theme-accent-end transition-all text-theme-text"
                  />
                  <button 
                    type="submit"
                    disabled={!newMessage.trim()}
                    className="absolute right-2 p-2 bg-theme-accent-end text-white rounded-full disabled:opacity-50 hover:scale-105 transition-transform"
                  >
                    <Send className="w-4 h-4 ml-0.5" />
                  </button>
               </form>
            )}
          </footer>
        </>
      )}

      {/* Admin Profile Modal */}
      {isAdmin && selectedAdminProfile && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-[200]">
          <div className="bg-theme-bg/90 backdrop-blur-md border border-theme-border rounded-3xl p-6 w-full max-w-sm shadow-2xl relative animate-in fade-in zoom-in-95">
             <button onClick={() => setSelectedAdminProfile(null)} className="absolute top-4 right-4 p-2 rounded-full hover:bg-theme-muted transition-colors text-theme-text/60">
                <X className="w-5 h-5" />
             </button>
             
             <div className="flex flex-col items-center mt-4">
                <img src={selectedAdminProfile.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${selectedAdminProfile.user_id}`} alt="Avatar" className="w-24 h-24 rounded-full bg-theme-muted mb-4 border-4 border-theme-bg shadow-lg" />
                <h3 className="text-xl font-bold text-theme-text mb-1">{selectedAdminProfile.username || 'Unknown User'}</h3>
                <p className="text-xs text-theme-text/40 font-mono bg-theme-muted px-2 py-1 rounded-md mb-8 select-all">{selectedAdminProfile.user_id}</p>
                
                <div className="w-full space-y-3">
                   <button 
                      onClick={async () => {
                         try {
                           await supabase.from('profiles').update({ is_banned: true }).eq('id', selectedAdminProfile.user_id);
                           setSelectedAdminProfile(null);
                           // Force refresh messages so any UI updates happen if necessary, though it won't retroactively hide them without page reload or explicit filtering
                         } catch (err) { console.error(err); }
                      }}
                      className="w-full bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-600 border border-yellow-500/30 rounded-xl py-3 font-bold flex items-center justify-center gap-2 transition-all shadow-sm"
                   >
                      <Ban className="w-4 h-4" /> ⏱️ Suspend User
                   </button>
                   <button 
                      onClick={async () => {
                         if (!confirm("Are you sure you want to permanent kick and wipe their chat history?")) return;
                         try {
                           await supabase.from('profiles').update({ is_banned: true }).eq('id', selectedAdminProfile.user_id);
                           await supabase.from('community_messages').delete().eq('user_id', selectedAdminProfile.user_id);
                           setSelectedAdminProfile(null);
                         } catch (err) { console.error(err); }
                      }}
                      className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/30 rounded-xl py-3 font-bold flex items-center justify-center gap-2 transition-all shadow-sm"
                   >
                      <Trash2 className="w-4 h-4" /> 🚫 Permanent Kick & Wipe
                   </button>
                   <button 
                      onClick={() => setSelectedAdminProfile(null)}
                      className="w-full mt-2 text-theme-text/60 hover:text-theme-text/90 font-medium py-2 rounded-xl hover:bg-theme-muted/50 transition-colors"
                   >
                      Close
                   </button>
                </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}
