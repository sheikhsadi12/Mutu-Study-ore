import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Send, MessageCircle, User, Loader2, X, Trash2, Ban, MoreVertical, Copy, Check, Clock, CheckCircle, Reply } from 'lucide-react';
import { User as AuthUser } from '@supabase/supabase-js';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { cn } from '../lib/utils';
import { TextFormatter } from '../components/TextFormatter';
import { useHardwareBack } from '../hooks/useHardwareBack';

const isArabic = (text: string) => /[\u0600-\u06FF]/.test(text || '');
const getTextClass = (text: string) => isArabic(text) ? 'font-arabic text-[15px] leading-relaxed text-right dir-rtl' : 'font-sans text-[15px]';

interface ProfileData {
  id: string;
  username: string;
  avatar_url: string;
  is_banned?: boolean;
  suspended_until?: string | null;
  is_admin?: boolean;
}

interface Message {
  id: string;
  user_id: string;
  message: string;
  created_at: string;
  username: string;
  avatar_url: string;
  reply_to_id?: string | null;
}

const AVATAR_SEEDS = ['bot1', 'bot2', 'bot3', 'bot4', 'bot5', 'bot6', 'bot7', 'bot8'];

const ChatBubble = React.memo(({ msg, isMe, showHeader, isAdmin, onDelete, onBan, onViewProfile, repliedMsg, onReply }: { msg: Message, isMe: boolean, showHeader: boolean, isAdmin: boolean, onDelete: (id: string) => void, onBan: (userId: string) => void, onViewProfile: (msg: Message) => void, repliedMsg?: Message | null, onReply: (msg: Message) => void }) => {
  const [copied, setCopied] = useState(false);

  const isMsgAdmin = msg.avatar_url?.includes('#admin') || false;

  const handleCopy = () => {
    navigator.clipboard.writeText(msg.message);
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
    }, 2000);
  };

  return (
    <div className={cn("flex flex-col w-full relative", isMe ? "items-end" : "items-start", !showHeader ? "mt-1" : "mt-4")}>
      {showHeader && !isMe && (
         <div className="flex items-center gap-2 mb-1 ml-1">
            <img src={msg.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${msg.user_id}`} alt="Avatar" className="w-5 h-5 rounded-full bg-theme-muted" />
            <span className="text-[10px] font-bold text-theme-text/50">{msg.username || 'Unknown User'}</span>
            {isMsgAdmin && (
              <span className="text-[9px] bg-yellow-500/20 border border-yellow-500/30 text-yellow-500 px-1.5 py-0.5 rounded font-black tracking-widest uppercase shadow-sm">👑 Admin</span>
            )}
            <span className="text-[9px] text-theme-text/30">{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
         </div>
      )}
      
      <div className={cn("flex items-end gap-1.5 w-full", isMe ? "justify-end" : "justify-start")}>
        {isMe && (
           <MessageMenu
              isMe={isMe}
              isAdmin={isAdmin}
              copied={copied}
              onReply={() => onReply(msg)}
              onCopy={handleCopy}
              onDelete={() => onDelete(msg.id)}
           />
        )}
        
        <div 
          className={cn(
            "w-fit max-w-[80%] px-3 py-1.5 whitespace-pre-wrap break-words relative transform-gpu will-change-transform text-[15px]",
            isMsgAdmin 
              ? "bg-theme-muted text-theme-text rounded-[18px] shadow-sm border border-theme-accent-start/40 font-medium" 
              : isMe 
                ? "bg-theme-accent-start text-white shadow-sm" 
                : "bg-theme-card border border-theme-border/70 text-theme-text shadow-sm",
            isMe ? "rounded-[18px] rounded-br-[4px]" : "rounded-[18px] rounded-bl-[4px]"
          )}
        >
          {repliedMsg && (
             <div className="mb-1 bg-black/10 dark:bg-white/10 p-1.5 rounded-lg border-l-2 border-theme-accent-end/50 text-[11px] leading-tight opacity-90 font-sans">
               <span className="font-bold opacity-75">{repliedMsg.username}</span>
               <div className="truncate opacity-80 mt-0.5"><TextFormatter text={repliedMsg.message} /></div>
             </div>
          )}
          <TextFormatter text={msg.message} />
        </div>

        {!isMe && (
           <MessageMenu
              isMe={isMe}
              isAdmin={isAdmin}
              copied={copied}
              onReply={() => onReply(msg)}
              onCopy={handleCopy}
              onDelete={() => onDelete(msg.id)}
              onViewProfile={() => onViewProfile(msg)}
              onBan={() => onBan(msg.user_id)}
           />
        )}
      </div>

      {showHeader && isMe && (
         <div className="flex items-center gap-2 mt-1 mr-2 opacity-50 font-sans">
            <span className="text-[9px] text-theme-text/70">{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
         </div>
      )}
    </div>
  );
});

const ChatInput = React.memo(({ profile, replyingTo, onClearReply, onSendMessage }: { profile: ProfileData | null, replyingTo: Message | null, onClearReply: () => void, onSendMessage: (msg: string) => void }) => {
  const [newMessage, setNewMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    if (!newMessage.trim()) return;
    onSendMessage(newMessage.trim());
    setNewMessage('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNewMessage(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  };

  return (
    <div className="max-w-4xl mx-auto flex flex-col font-sans">
      {replyingTo && (
        <div className="mb-2 bg-theme-muted/50 border border-theme-border rounded-xl p-2 px-3 flex items-start justify-between text-xs transition-all">
           <div className="flex-1 overflow-hidden">
             <span className="font-bold text-theme-text/70 block mb-0.5">Replying to {replyingTo.username}</span>
             <div className="truncate w-full opacity-80 text-[13px]">
               <TextFormatter text={replyingTo.message} />
             </div>
           </div>
           <button onClick={onClearReply} className="p-1 hover:bg-theme-border/50 rounded-full text-theme-text/50 shrink-0 ml-2">
             <X className="w-4 h-4" />
           </button>
        </div>
      )}
      <div className="relative flex items-end">
        <textarea 
          ref={textareaRef}
          rows={1}
          placeholder={`Message as ${profile?.username}...`}
          value={newMessage}
          onChange={handleInput}
          className={cn(
            "w-full bg-theme-muted/30 border border-theme-border rounded-[24px] py-[10px] pl-5 pr-[48px] leading-[20px] focus:outline-none focus:border-theme-accent-end transition-all text-theme-text resize-none overflow-y-auto block",
            getTextClass(newMessage)
          )}
          style={{ minHeight: '42px', maxHeight: '160px' }}
        />
        <button 
          type="button"
          onClick={handleSend}
          disabled={!newMessage.trim()}
          className="absolute right-1.5 bottom-[5px] w-[32px] h-[32px] flex items-center justify-center bg-theme-accent-end text-white rounded-full disabled:opacity-50 hover:scale-105 transition-transform transform-gpu shrink-0"
        >
          <Send className="w-4 h-4 -ml-[1px] mt-[1px]" />
        </button>
      </div>
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
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const scrollContainerRef = useRef<HTMLElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [selectedAdminProfile, setSelectedAdminProfile] = useState<Message | null>(null);
  const [adminUserStatus, setAdminUserStatus] = useState<{is_banned: boolean, suspended_until: string | null} | null>(null);
  const [isChatDisabled, setIsChatDisabled] = useState(false);

  useHardwareBack(showSetup, () => {
    // We cannot just close setup if they don't have a profile, otherwise they can't chat.
    // If they press back on setup with no profile, maybe send them back to home?
    if (!profile?.username) navigate('/');
    else setShowSetup(false);
  });
  useHardwareBack(selectedAdminProfile !== null, () => setSelectedAdminProfile(null));

  const subscriptionRef = useRef<any>(null);
  const controlsSubscriptionRef = useRef<any>(null);

  const isSuperAdmin = user?.email === 'sadishekh671@gmail.com';
  const isAdmin = isSuperAdmin || profile?.is_admin === true;

  useEffect(() => {
    if (isAdmin && selectedAdminProfile) {
       supabase.from('profiles').select('is_banned, suspended_until').eq('id', selectedAdminProfile.user_id).single()
         .then(({data}) => {
            if (data) setAdminUserStatus(data);
         });
    } else {
       setAdminUserStatus(null);
    }
  }, [selectedAdminProfile, isAdmin]);

  const fetchSystemControls = async () => {
    try {
      const { data } = await supabase.from('system_controls').select('is_chat_disabled').eq('id', 1).single();
      if (data) setIsChatDisabled(data.is_chat_disabled);
    } catch(e) { console.warn("Could not fetch system controls", e); }
  };

  useEffect(() => {
    fetchSystemControls();
    
    controlsSubscriptionRef.current = supabase.channel('chat_system_controls')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'system_controls' }, (payload) => {
         fetchSystemControls();
      }).subscribe();

    return () => {
      if (controlsSubscriptionRef.current) supabase.removeChannel(controlsSubscriptionRef.current);
    }
  }, []);

  const handleDeleteMessage = React.useCallback(async (messageId: string) => {
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
  }, []);

  const handleBanUser = React.useCallback(async (userId: string) => {
    if (!window.confirm("Are you sure you want to ban this user?")) return;
    try {
      const { error } = await supabase.from('profiles').update({ is_banned: true }).eq('id', userId);
      if (error) throw error;
      alert('User successfully banned.');
    } catch (e: any) {
      console.error('Error banning user:', e);
      alert('Failed to ban user.');
    }
  }, []);

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
        setupRealtimeSubscription(userId);
        
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
      setupRealtimeSubscription(user.id);
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

  const setupRealtimeSubscription = (userId: string) => {
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
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${userId}` },
        (payload) => {
          if (payload.new) {
             setProfile(payload.new as ProfileData);
          }
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

  const handleSendMessage = async (msgText: string) => {
    if (!msgText.trim() || !user || !profile) return;

    try {
      const finalAvatarUrl = isAdmin ? `${profile.avatar_url}#admin` : profile.avatar_url;

      const payload: any = {
        user_id: user.id,
        message: msgText,
        username: profile.username,
        avatar_url: finalAvatarUrl
      };
      
      if (replyingTo) {
        payload.reply_to_id = replyingTo.id;
      }

      const { data, error } = await supabase
        .from('community_messages')
        .insert([payload])
        .select()
        .single();

      setReplyingTo(null);

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
      if (e.message && e.message.includes('row-level security policy')) {
        alert('Action restricted. You might have been suspended or banned from interactions.');
      } else {
        alert('Error sending message: ' + (e.message || 'Unknown error'));
      }
      setReplyingTo(null);
    }
  };

  if (!user) return null;

  return (
    <div className="flex flex-col h-[100dvh] bg-theme-bg font-sans overflow-hidden">
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
           <div className="absolute inset-0 bg-theme-bg/95 z-0" />
           
           <div className="card-base p-6 md:p-8 w-full max-w-md relative z-10 rounded-[24px] shadow-xl border border-theme-border/50 transform-gpu will-change-transform">
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
          <main ref={scrollContainerRef} className="flex-1 overflow-y-auto w-full p-4 md:p-6 space-y-2 relative scroll-smooth bg-theme-bg">
            {isLoading ? (
               <div className="h-full flex items-center justify-center text-theme-text/40 gap-2 font-sans">
                 <Loader2 className="w-5 h-5 animate-spin" /> Loading connection...
               </div>
            ) : messages.length === 0 ? (
               <div className="text-center py-20 text-theme-text/50 font-sans">
                 <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-20" />
                 <p>No messages yet. Say hello to the community!</p>
               </div>
            ) : (
               messages.map((msg, idx) => {
                 const isMe = msg.user_id === user?.id;
                 const showHeader = idx === 0 || messages[idx - 1].user_id !== msg.user_id || 
                    (new Date(msg.created_at).getTime() - new Date(messages[idx - 1].created_at).getTime() > 5 * 60000); // 5 mins gap
                 const repliedMsg = msg.reply_to_id ? messages.find(m => m.id === msg.reply_to_id) || null : null;

                 return <ChatBubble 
                   key={msg.id} 
                   msg={msg} 
                   isMe={isMe} 
                   showHeader={showHeader}
                   isAdmin={isAdmin}
                   repliedMsg={repliedMsg}
                   onDelete={handleDeleteMessage}
                   onBan={handleBanUser}
                   onViewProfile={setSelectedAdminProfile}
                   onReply={setReplyingTo}
                 />;
               })
            )}
            <div ref={messagesEndRef} className="h-4 shrink-0" />
          </main>

          <footer className="sticky bottom-0 bg-theme-bg border-t border-theme-border p-3 md:p-4 shrink-0 z-20 w-full mb-safe">
             {isChatDisabled && !isAdmin ? (
                <div className="max-w-4xl mx-auto border border-theme-border/50 text-theme-text/60 text-sm font-bold p-4 rounded-xl flex items-center justify-center gap-2 text-center transform-gpu will-change-transform opacity-70">
                   🔒 Community Chat is temporarily turned OFF by the Admin.
                </div>
             ) : profile?.is_banned || (profile?.suspended_until && new Date(profile.suspended_until) > new Date()) ? (
                <div className="max-w-4xl mx-auto bg-red-500/10 border border-red-500/20 text-red-500 text-sm font-bold p-4 rounded-xl flex items-center justify-center gap-2 text-center transform-gpu will-change-transform">
                   <Ban className="w-5 h-5 shrink-0" />
                   You have been restricted from the community for violating rules.
                </div>
             ) : (
                <ChatInput 
                   profile={profile} 
                   replyingTo={replyingTo}
                   onClearReply={() => setReplyingTo(null)}
                   onSendMessage={handleSendMessage} 
                />
             )}
          </footer>
        </>
      )}

      {/* Admin Profile Modal */}
      {isAdmin && selectedAdminProfile && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-[200]">
          <div className="bg-theme-bg border border-theme-border rounded-3xl p-6 w-full max-w-sm shadow-xl relative transform-gpu will-change-transform">
             <button onClick={() => setSelectedAdminProfile(null)} className="absolute top-4 right-4 p-2 rounded-full hover:bg-theme-muted transition-colors text-theme-text/60">
                <X className="w-5 h-5" />
             </button>
             
             <div className="flex flex-col items-center mt-4">
                <img src={selectedAdminProfile.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${selectedAdminProfile.user_id}`} alt="Avatar" className="w-24 h-24 rounded-full bg-theme-muted mb-4 border-4 border-theme-bg shadow-lg" />
                <h3 className="text-xl font-bold text-theme-text mb-1">{selectedAdminProfile.username || 'Unknown User'}</h3>
                <p className="text-xs text-theme-text/40 font-mono bg-theme-muted px-2 py-1 rounded-md mb-8 select-all">{selectedAdminProfile.user_id}</p>
                
                <div className="w-full space-y-3">
                   {!adminUserStatus ? (
                      <div className="flex items-center justify-center py-4 bg-theme-muted/50 rounded-xl text-theme-text/50">
                          <Loader2 className="w-5 h-5 animate-spin" />
                      </div>
                   ) : adminUserStatus.is_banned || (adminUserStatus.suspended_until && new Date(adminUserStatus.suspended_until) > new Date()) ? (
                      <button 
                         onClick={async () => {
                            try {
                               await supabase.from('profiles').update({ is_banned: false, suspended_until: null }).eq('id', selectedAdminProfile.user_id);
                               setAdminUserStatus({ is_banned: false, suspended_until: null });
                            } catch (err) { console.error(err); }
                         }}
                         className="w-full bg-green-500/10 hover:bg-green-500/20 text-green-600 border border-green-500/30 rounded-xl py-3 font-bold flex items-center justify-center gap-2 transition-all shadow-sm"
                      >
                         <CheckCircle className="w-4 h-4" /> ✅ Lift Ban / Unsuspend
                      </button>
                   ) : (
                      <>
                         <div className="flex flex-col gap-2 p-3 bg-theme-border/20 rounded-xl border border-theme-border/50">
                            <div className="flex items-center gap-1.5 px-1 mb-1">
                               <Clock className="w-3 h-3 text-yellow-600" />
                               <span className="text-[10px] font-bold text-yellow-600 uppercase tracking-widest">Time-Based Suspension</span>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                               <button 
                                  onClick={async () => {
                                     try {
                                        const futureTimestamp = new Date(Date.now() + 5 * 60000).toISOString();
                                        await supabase.from('profiles').update({ suspended_until: futureTimestamp }).eq('id', selectedAdminProfile.user_id);
                                        setAdminUserStatus({ is_banned: false, suspended_until: futureTimestamp });
                                     } catch (err) { console.error(err); }
                                  }}
                                  className="bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-600 border border-yellow-500/20 rounded-lg py-2 text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5"
                               >
                                  5 Mins
                               </button>
                               <button 
                                  onClick={async () => {
                                     try {
                                        const futureTimestamp = new Date(Date.now() + 10 * 60000).toISOString();
                                        await supabase.from('profiles').update({ suspended_until: futureTimestamp }).eq('id', selectedAdminProfile.user_id);
                                        setAdminUserStatus({ is_banned: false, suspended_until: futureTimestamp });
                                     } catch (err) { console.error(err); }
                                  }}
                                  className="bg-orange-500/10 hover:bg-orange-500/20 text-orange-600 border border-orange-500/20 rounded-lg py-2 text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5"
                               >
                                  10 Mins
                               </button>
                               <button 
                                  onClick={async () => {
                                     try {
                                        const futureTimestamp = new Date(Date.now() + 60 * 60000).toISOString();
                                        await supabase.from('profiles').update({ suspended_until: futureTimestamp }).eq('id', selectedAdminProfile.user_id);
                                        setAdminUserStatus({ is_banned: false, suspended_until: futureTimestamp });
                                     } catch (err) { console.error(err); }
                                  }}
                                  className="bg-red-500/10 hover:bg-red-500/20 text-red-600 border border-red-500/20 rounded-lg py-2 text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5"
                               >
                                  1 Hour
                               </button>
                            </div>
                         </div>
                         <button 
                            onClick={async () => {
                               if (!confirm("Are you sure you want to permanent kick and wipe their chat history?")) return;
                               try {
                                 await supabase.from('profiles').update({ is_banned: true }).eq('id', selectedAdminProfile.user_id);
                                 await supabase.from('community_messages').delete().eq('user_id', selectedAdminProfile.user_id);
                                 setSelectedAdminProfile(null);
                               } catch (err) { console.error(err); }
                            }}
                            className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-600 border border-red-500/30 rounded-xl py-3 font-bold flex items-center justify-center gap-2 transition-all shadow-sm"
                         >
                            <Trash2 className="w-4 h-4" /> 🚫 Permanent Kick & Wipe
                         </button>
                      </>
                   )}
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

export function MessageMenu({ isMe, isAdmin, copied, onReply, onCopy, onDelete, onViewProfile, onBan }: any) {
  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger asChild>
        <button className="p-1 mb-1 text-theme-text/40 hover:text-theme-text/80 rounded-full outline-none focus:ring-2 focus:ring-theme-accent-start/50 transition-colors shrink-0">
          <MoreVertical className="w-3.5 h-3.5" />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content 
           className="min-w-[140px] max-w-[220px] bg-theme-bg border border-theme-border/50 rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)] z-[99999] overflow-hidden font-sans p-1 animate-in fade-in zoom-in-95 data-[side=top]:slide-in-from-bottom-2 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2"
           sideOffset={8}
           align={isMe ? 'end' : 'start'}
           side="top"
           collisionPadding={20}
           avoidCollisions={true}
        >
          <DropdownMenu.Item className="flex items-center gap-2 px-2 py-2 text-xs text-theme-text hover:bg-theme-muted/50 rounded-lg outline-none cursor-pointer select-none font-medium transition-colors" onSelect={onReply}>
            <Reply className="w-3.5 h-3.5" /> Reply
          </DropdownMenu.Item>
          
          <DropdownMenu.Item className="flex items-center gap-2 px-2 py-2 text-xs text-theme-text hover:bg-theme-muted/50 rounded-lg outline-none cursor-pointer select-none font-medium transition-colors" onSelect={(e) => { e.preventDefault(); onCopy(); }}>
            {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />} {copied ? 'Copied!' : 'Copy'}
          </DropdownMenu.Item>

          {(isMe || isAdmin) && (
             <>
               <DropdownMenu.Separator className="h-px bg-theme-border/50 my-1 -mx-1" />
               <DropdownMenu.Item className="flex items-center gap-2 px-2 py-2 text-xs text-red-500 hover:bg-red-500/10 rounded-lg outline-none cursor-pointer select-none font-medium transition-colors" onSelect={onDelete}>
                 <Trash2 className="w-3.5 h-3.5" /> {isMe ? 'Unsend' : 'Delete'}
               </DropdownMenu.Item>
             </>
          )}

          {isAdmin && !isMe && onViewProfile && onBan && (
             <>
                <DropdownMenu.Separator className="h-px bg-theme-border/50 my-1 -mx-1" />
                <DropdownMenu.Item className="flex items-center gap-2 px-2 py-2 text-xs text-theme-text hover:bg-theme-muted/50 rounded-lg outline-none cursor-pointer select-none font-medium transition-colors" onSelect={onViewProfile}>
                  <User className="w-3.5 h-3.5" /> View Profile
                </DropdownMenu.Item>
                <DropdownMenu.Item className="flex items-center gap-2 px-2 py-2 text-xs text-red-500 hover:bg-red-500/10 rounded-lg outline-none cursor-pointer select-none font-medium transition-colors" onSelect={onBan}>
                  <Ban className="w-3.5 h-3.5" /> Ban User
                </DropdownMenu.Item>
             </>
          )}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}