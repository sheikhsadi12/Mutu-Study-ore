import React, { useState, useEffect, useRef } from "react";
import { Heart, Send, MessageCircle, MoreVertical, Copy, Check, Trash2, User, Ban, X, Loader2, Clock, CheckCircle, Reply, ChevronLeft } from "lucide-react";
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { supabase } from "../supabaseClient";
import { cn } from "../lib/utils";
import { TextFormatter } from "./TextFormatter";

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

interface NoteComment {
  id: string;
  note_id: string;
  user_id: string;
  username: string;
  avatar_url: string;
  content: string;
  created_at: string;
  reply_to_id?: string | null;
}

export function Comments({ noteId }: { noteId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [comments, setComments] = useState<NoteComment[]>([]);
  const [likesCount, setLikesCount] = useState(0);
  const [hasLiked, setHasLiked] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<NoteComment | null>(null);
  
  const [selectedAdminProfile, setSelectedAdminProfile] = useState<NoteComment | null>(null);
  const [adminUserStatus, setAdminUserStatus] = useState<{is_banned: boolean, suspended_until: string | null} | null>(null);
  const [isCommentsDisabled, setIsCommentsDisabled] = useState(false);

  const subscriptionRef = useRef<any>(null);
  const controlsSubscriptionRef = useRef<any>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isSuperAdmin = user?.email === 'sadishekh671@gmail.com';
  const isAdmin = isSuperAdmin || profile?.is_admin === true;

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        fetchProfile(session.user.id);
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUser(session.user);
        fetchProfile(session.user.id);
      } else {
        setUser(null);
        setProfile(null);
      }
    });

    return () => authListener.subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (data) {
       setProfile(data);
    }
  };

  useEffect(() => {
    fetchData();
    setupSubscriptions();
    fetchSystemControls();
    
    controlsSubscriptionRef.current = supabase.channel(`comments_controls_updates`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'system_controls' }, () => {
         fetchSystemControls();
      }).subscribe();

    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
      }
      if (controlsSubscriptionRef.current) {
        supabase.removeChannel(controlsSubscriptionRef.current);
      }
    };
  }, [noteId, user?.id]);

  const fetchSystemControls = async () => {
    try {
      const { data } = await supabase.from('system_controls').select('is_comments_disabled').eq('id', 1).single();
      if (data) setIsCommentsDisabled(data.is_comments_disabled);
    } catch(e) { console.warn("Failed to fetch system controls", e); }
  };

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

  const fetchData = async () => {
    // Fetch Comments
    const { data: commentsData } = await supabase
      .from('note_comments')
      .select('*')
      .eq('note_id', noteId)
      .order('created_at', { ascending: false });
    
    if (commentsData) setComments(commentsData);

    // Fetch Likes Count
    const { count } = await supabase
      .from('note_likes')
      .select('*', { count: 'exact', head: true })
      .eq('note_id', noteId);
    
    setLikesCount(count || 0);

    // Fetch My Like
    if (user) {
       const { data: likeData } = await supabase
         .from('note_likes')
         .select('id')
         .eq('note_id', noteId)
         .eq('user_id', user.id)
         .maybeSingle();
       
       setHasLiked(!!likeData);
    } else {
       setHasLiked(false);
    }
  };

  const setupSubscriptions = () => {
    if (subscriptionRef.current) supabase.removeChannel(subscriptionRef.current);

    const channel = supabase.channel(`note_${noteId}_updates`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'note_comments', filter: `note_id=eq.${noteId}` }, (payload) => {
         setComments(prev => {
            if (prev.find(c => c.id === payload.new.id)) return prev;
            return [payload.new as NoteComment, ...prev].sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
         });
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'note_comments', filter: `note_id=eq.${noteId}` }, (payload) => {
         setComments(prev => prev.filter(c => c.id !== payload.old.id));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'note_likes', filter: `note_id=eq.${noteId}` }, () => {
         supabase.from('note_likes').select('*', { count: 'exact', head: true }).eq('note_id', noteId)
           .then(({ count }) => {
              if (count !== null) setLikesCount(count);
           });
      });
      
    if (user) {
        channel.on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` }, (payload) => {
            if (payload.new) setProfile(payload.new as ProfileData);
        });
    }

    channel.subscribe();
    subscriptionRef.current = channel;
  };

  const isRestricted = profile?.is_banned || (profile?.suspended_until && new Date(profile.suspended_until) > new Date());

  const handleLike = async () => {
    if (!user) return alert("Please log in to like.");
    if (isRestricted) return alert("You are restricted from interactions.");

    const currentlyLiked = hasLiked;
    setHasLiked(!currentlyLiked);
    setLikesCount(prev => currentlyLiked ? Math.max(0, prev - 1) : prev + 1);

    if (currentlyLiked) {
       await supabase.from('note_likes').delete().eq('note_id', noteId).eq('user_id', user.id);
    } else {
       const { error } = await supabase.from('note_likes').insert({ note_id: noteId, user_id: user.id });
       if (error && error.code !== '23505') {
           setHasLiked(false);
           setLikesCount(prev => Math.max(0, prev - 1));
           console.error("Like error:", error);
       }
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNewComment(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !user || !profile) return;
    if (isRestricted) return;

    const contentStr = newComment.trim();
    setNewComment("");
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    const finalAvatarUrl = isAdmin ? `${profile.avatar_url}#admin` : profile.avatar_url;

    const payload: any = {
       note_id: noteId,
       user_id: user.id,
       username: profile.username || 'User',
       avatar_url: finalAvatarUrl,
       content: contentStr
    };
    
    if (replyingTo) {
       payload.reply_to_id = replyingTo.id;
    }

    const { data, error } = await supabase.from('note_comments').insert(payload).select().single();
    
    setReplyingTo(null);

    if (error) {
       console.error("Comment error:", error);
       if (error.message && error.message.includes('row-level security policy')) {
          alert('Action restricted. You might have been suspended or banned from interactions.');
       } else {
          alert("Failed to submit comment.");
       }
       setNewComment(contentStr);
    } else if (data) {
       setComments(prev => {
          if (prev.find(c => c.id === data.id)) return prev;
          return [data as NoteComment, ...prev].sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
       });
    }
  };

  const handleDeleteComment = async (id: string) => {
     try {
       setComments(prev => prev.filter(c => c.id !== id));
       await supabase.from('note_comments').delete().eq('id', id);
     } catch (e) {
       console.error(e);
     }
  };

  const handleBanUser = async (userId: string) => {
     if (!confirm("Ban this user permanently?")) return;
     await supabase.from('profiles').update({ is_banned: true }).eq('id', userId);
  };

  // Sticky footer when comments are hidden
  if (!isOpen) {
    return (
      <div className="sticky bottom-0 left-0 w-full bg-theme-bg/95 backdrop-blur-md border-t border-theme-border p-3 flex items-center justify-around shadow-[0_-10px_25px_rgb(0,0,0,0.05)] z-40 mt-auto">
         <button onClick={handleLike} className={cn("flex flex-col items-center justify-center gap-1 min-w-[80px]", hasLiked ? "text-theme-accent-end" : "text-theme-text/80")}>
            <Heart className={cn("w-6 h-6 transition-transform active:scale-90", hasLiked && "fill-theme-accent-end")} />
            <span className="text-xs font-bold">{likesCount} Likes</span>
         </button>
         <button onClick={() => setIsOpen(true)} className="flex flex-col items-center justify-center gap-1 min-w-[80px] text-theme-text/80 hover:text-theme-accent-end transition-colors active:scale-95">
            <MessageCircle className="w-6 h-6" />
            <span className="text-xs font-bold">{comments.length} Comments</span>
         </button>
      </div>
    );
  }

  // Full Screen overlay when comments are open
  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-theme-bg w-full h-full animate-in slide-in-from-bottom-5 duration-200">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-theme-border bg-theme-bg shadow-sm z-10 shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => setIsOpen(false)} className="p-2 -ml-2 rounded-full hover:bg-theme-muted transition-colors">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div className="flex flex-col">
            <span className="font-bold text-[15px]">{comments.length} Comments</span>
            <span className="text-[11px] text-theme-text/50 font-medium tracking-wide">Community Discussion</span>
          </div>
        </div>
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col-reverse gap-3 bg-theme-bg pb-24">
        {comments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 opacity-50">
            <MessageCircle className="w-10 h-10 mb-2" />
            <p className="text-sm font-semibold tracking-wide uppercase">Be the first to start the discussion.</p>
          </div>
        ) : (
          comments.map((c, i) => {
             const isMe = c.user_id === user?.id;
             const showHeader = i === comments.length - 1 || comments[i + 1].user_id !== c.user_id || 
                  (new Date(c.created_at).getTime() - new Date(comments[i + 1].created_at).getTime() > 5 * 60000);
             
             const repliedMsg = c.reply_to_id ? comments.find(m => m.id === c.reply_to_id) || null : null;

             return (
               <CommentItem 
                  key={c.id} 
                  comment={c} 
                  isMe={isMe}
                  showHeader={showHeader}
                  isAdmin={isAdmin}
                  repliedMsg={repliedMsg}
                  onDelete={handleDeleteComment}
                  onBan={handleBanUser}
                  onViewProfile={setSelectedAdminProfile}
                  onReply={setReplyingTo}
               />
             );
          })
        )}
      </div>

      {/* Input box absolute/sticky at bottom */}
      <div className="absolute bottom-0 left-0 w-full bg-theme-bg border-t border-theme-border z-50 p-2 md:p-3 shadow-lg shrink-0 mb-safe">
        <div className="max-w-4xl mx-auto flex flex-col font-sans">
          {replyingTo && (
            <div className="mb-2 bg-theme-muted/50 border border-theme-border rounded-xl p-2 px-3 flex items-start justify-between text-xs transition-all">
               <div className="flex-1 overflow-hidden">
                 <span className="font-bold text-theme-text/70 block mb-0.5">Replying to {replyingTo.username}</span>
                 <div className="truncate w-full opacity-80 text-[13px]">
                   <TextFormatter text={replyingTo.content} />
                 </div>
               </div>
               <button onClick={() => setReplyingTo(null)} className="p-1 hover:bg-theme-border/50 rounded-full text-theme-text/50 shrink-0 ml-2">
                 <X className="w-4 h-4" />
               </button>
            </div>
          )}
          {isCommentsDisabled && !isAdmin ? (
             <div className="w-full border border-theme-border/50 text-theme-text/60 text-sm font-bold p-3 rounded-xl flex items-center justify-center gap-2 text-center opacity-70">
                🔒 Comments are temporarily closed for this topic.
             </div>
          ) : isRestricted ? (
             <div className="w-full bg-red-500/10 border border-red-500/20 text-red-500 text-sm font-bold p-3 rounded-xl flex items-center justify-center gap-2 text-center">
                <Ban className="w-5 h-5 shrink-0" />
                Restricted from interactions.
             </div>
          ) : (
             <div className="relative flex items-end">
                <textarea
                  ref={textareaRef}
                  rows={1}
                  placeholder="Share a thoughtful insight..."
                  value={newComment}
                  onChange={handleInput}
                  className={cn(
                    "w-full bg-theme-muted/30 border border-theme-border rounded-[20px] py-[8px] pl-4 pr-[42px] leading-[20px] focus:outline-none focus:border-theme-accent-end transition-all text-theme-text resize-none overflow-y-auto block",
                    getTextClass(newComment)
                  )}
                  style={{ minHeight: '38px', maxHeight: '120px' }}
                />
                <button
                  type="button"
                  onClick={handleAddComment}
                  disabled={!newComment.trim()}
                  className="absolute right-1.5 bottom-[3px] w-[32px] h-[32px] flex items-center justify-center bg-theme-accent-end text-white rounded-full disabled:opacity-50 hover:scale-105 transition-transform transform-gpu shrink-0 shadow-sm"
                >
                  <Send className="w-4 h-4 -ml-[1px] mt-[1px]" />
                </button>
             </div>
          )}
        </div>
      </div>

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
                               if (!confirm("Are you sure you want to permanent kick and wipe their comments?")) return;
                               try {
                                 await supabase.from('profiles').update({ is_banned: true }).eq('id', selectedAdminProfile.user_id);
                                 await supabase.from('note_comments').delete().eq('user_id', selectedAdminProfile.user_id);
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

const CommentItem = React.memo(({ comment, isMe, isAdmin, showHeader, repliedMsg, onDelete, onBan, onViewProfile, onReply }: { comment: NoteComment, isMe: boolean, isAdmin: boolean, showHeader: boolean, repliedMsg?: NoteComment | null, onDelete: (id: string) => void, onBan: (id: string) => void, onViewProfile: (c: NoteComment) => void, onReply: (msg: NoteComment) => void }) => {
   const [copied, setCopied] = useState(false);
   const isMsgAdmin = comment.avatar_url?.includes('#admin') || false;

   const handleCopy = () => {
     navigator.clipboard.writeText(comment.content);
     setCopied(true);
     setTimeout(() => { setCopied(false); }, 2000);
   };

   return (
    <div className={cn("flex flex-col w-full relative", isMe ? "items-end" : "items-start", !showHeader ? "mt-0.5" : "mt-3")}>
      {showHeader && !isMe && (
         <div className="flex items-center gap-1.5 mb-1 ml-1 font-sans">
            <img src={comment.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${comment.user_id}`} alt="Avatar" className="w-4 h-4 rounded-full bg-theme-muted" />
            <span className="text-[10px] font-bold text-theme-text/50">{comment.username || 'Unknown User'}</span>
            {isMsgAdmin && (
              <span className="text-[8px] bg-yellow-500/20 border border-yellow-500/30 text-yellow-500 px-1 py-[1px] rounded font-black tracking-widest uppercase shadow-sm">👑 Admin</span>
            )}
            <span className="text-[9px] text-theme-text/30">{new Date(comment.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
         </div>
      )}
      
      <div className={cn("flex items-end gap-1.5 w-full", isMe ? "justify-end" : "justify-start")}>
        {isMe && (
           <MessageMenu
              isMe={isMe}
              isAdmin={isAdmin}
              copied={copied}
              onReply={() => onReply(comment)}
              onCopy={handleCopy}
              onDelete={() => onDelete(comment.id)}
           />
        )}
        
        <div 
          className={cn(
            "w-fit max-w-[85%] px-3 py-1.5 whitespace-pre-wrap break-words relative transform-gpu will-change-transform leading-relaxed shadow-sm text-[15px]",
            isMsgAdmin  
              ? "bg-theme-muted border border-theme-accent-start/40 text-theme-text shadow-sm" 
              : isMe 
                ? "bg-theme-accent-start text-white" 
                : "bg-theme-card border border-theme-border/70 text-theme-text",
            isMe ? "rounded-[18px] rounded-br-[4px]" : "rounded-[18px] rounded-bl-[4px]"
          )}
        >
          {repliedMsg && (
             <div className="mb-1 bg-black/10 dark:bg-white/10 p-1.5 rounded-lg border-l-2 border-theme-accent-end/50 text-[11px] leading-tight opacity-90 font-sans">
               <span className="font-bold opacity-75">{repliedMsg.username}</span>
               <div className="truncate opacity-80 mt-0.5"><TextFormatter text={repliedMsg.content} /></div>
             </div>
          )}
          <TextFormatter text={comment.content} />
        </div>

        {!isMe && (
           <MessageMenu
              isMe={isMe}
              isAdmin={isAdmin}
              copied={copied}
              onReply={() => onReply(comment)}
              onCopy={handleCopy}
              onDelete={() => onDelete(comment.id)}
              onViewProfile={() => onViewProfile(comment)}
              onBan={() => onBan(comment.user_id)}
           />
        )}
      </div>

      {showHeader && isMe && (
         <div className="flex items-center gap-2 mt-0.5 mr-2 opacity-50 font-sans">
            <span className="text-[9px] text-theme-text/70">{new Date(comment.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
         </div>
      )}
    </div>
  );
});

function MessageMenu({ isMe, isAdmin, copied, onReply, onCopy, onDelete, onViewProfile, onBan }: any) {
  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger asChild>
        <button className="p-1 mb-1 text-theme-text/40 hover:text-theme-text/80 rounded-full outline-none focus:ring-2 focus:ring-theme-accent-start/50 transition-colors">
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
                 <Trash2 className="w-3.5 h-3.5" /> Delete
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
