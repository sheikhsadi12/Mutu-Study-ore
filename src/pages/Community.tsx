import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Send, MessageCircle, User, Loader2, X } from 'lucide-react';
import { User as AuthUser } from '@supabase/supabase-js';
import { cn } from '../lib/utils';

interface ProfileData {
  id: string;
  username: string;
  avatar_url: string;
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

const ChatBubble = React.memo(({ msg, isMe, showHeader }: { msg: Message, isMe: boolean, showHeader: boolean }) => {
  return (
    <div className={cn("flex flex-col w-full", isMe ? "items-end" : "items-start", !showHeader ? "mt-1" : "mt-4")}>
      {showHeader && !isMe && (
         <div className="flex items-center gap-2 mb-1.5 ml-1">
            <img src={msg.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${msg.user_id}`} alt="Avatar" className="w-5 h-5 rounded-full bg-theme-muted" />
            <span className="text-[10px] font-bold text-theme-text/50">{msg.username || 'Unknown User'}</span>
            <span className="text-[9px] text-theme-text/30">{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
         </div>
      )}
      
      <div className={cn(
        "max-w-[85%] md:max-w-[70%] px-4 py-2 text-sm leading-relaxed whitespace-pre-wrap break-words",
        isMe 
         ? "bg-theme-accent-start text-white rounded-2xl rounded-tr-sm" 
         : "bg-theme-card border border-theme-border/50 text-theme-text rounded-2xl rounded-tl-sm shadow-sm"
      )}>
         {msg.message}
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

  const subscriptionRef = useRef<any>(null);

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
      const { data, error } = await supabase
        .from('community_messages')
        .insert([{
          user_id: user.id,
          message: msgText,
          username: profile.username,
          avatar_url: profile.avatar_url
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
        
        {profile && (
             <button 
                onClick={() => {
                   setNewUsername(profile.username);
                   setNewAvatar(profile.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${AVATAR_SEEDS[0]}`);
                   setShowSetup(true);
                }}
                className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-2 text-xs font-bold text-theme-text/70 bg-theme-muted/50 hover:bg-theme-muted rounded-full transition-colors border border-theme-border"
             >
                <img src={profile.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.id}`} alt="Me" className="w-5 h-5 rounded-full" />
                <span className="hidden sm:inline truncate max-w-[100px]">{profile.username}</span>
             </button>
        )}
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

                 return <ChatBubble key={msg.id} msg={msg} isMe={isMe} showHeader={showHeader} />;
               })
            )}
            <div ref={messagesEndRef} className="h-2 shrink-0" />
          </main>

          <footer className="p-4 border-t border-theme-border bg-theme-bg shrink-0">
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
          </footer>
        </>
      )}
    </div>
  );
}
