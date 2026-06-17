import React, { useState, useEffect, useRef } from "react";
import { Heart, Send, MessageCircle, MoreVertical, Copy, Check, Trash2, User, Ban, X, Loader2, Clock, CheckCircle } from "lucide-react";
import { supabase } from "../supabaseClient";
import { cn } from "../lib/utils";

interface ProfileData {
  id: string;
  username: string;
  avatar_url: string;
  is_banned?: boolean;
  suspended_until?: string | null;
}

interface NoteComment {
  id: string;
  note_id: string;
  user_id: string;
  username: string;
  avatar_url: string;
  content: string;
  created_at: string;
}

export function Comments({ noteId }: { noteId: string }) {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [comments, setComments] = useState<NoteComment[]>([]);
  const [likesCount, setLikesCount] = useState(0);
  const [hasLiked, setHasLiked] = useState(false);
  const [newComment, setNewComment] = useState("");
  
  const [selectedAdminProfile, setSelectedAdminProfile] = useState<NoteComment | null>(null);
  const [adminUserStatus, setAdminUserStatus] = useState<{is_banned: boolean, suspended_until: string | null} | null>(null);

  const subscriptionRef = useRef<any>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isAdmin = user?.email === 'sadishekh671@gmail.com';

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
    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
      }
    };
  }, [noteId, user?.id]);

  useEffect(() => {
    if (user?.email === 'sadishekh671@gmail.com' && selectedAdminProfile) {
       supabase.from('profiles').select('is_banned, suspended_until').eq('id', selectedAdminProfile.user_id).single()
         .then(({data}) => {
            if (data) setAdminUserStatus(data);
         });
    } else {
       setAdminUserStatus(null);
    }
  }, [selectedAdminProfile, user?.email]);

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

    const isAdminUser = user.email === 'sadishekh671@gmail.com';
    const finalAvatarUrl = isAdminUser ? `${profile.avatar_url}#admin` : profile.avatar_url;

    const { data, error } = await supabase.from('note_comments').insert({
       note_id: noteId,
       user_id: user.id,
       username: profile.username || 'User',
       avatar_url: finalAvatarUrl,
       content: contentStr
    }).select().single();

    if (error) {
       console.error("Comment error:", error);
       alert("Failed to submit comment.");
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

  return (
    <div className="p-5 shrink-0 bg-theme-card border-t border-theme-border shadow-[0_-4px_20px_rgb(0,0,0,0.02)] isolate z-10 w-full mt-auto">
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={handleLike}
          className={cn(
            "flex items-center gap-2 px-5 py-2.5 rounded-[25px] transition-all cursor-pointer font-semibold shadow-sm",
            hasLiked
              ? "bg-gradient-to-r from-theme-accent-start to-theme-accent-end text-white border-transparent"
              : "bg-theme-bg border border-theme-border text-theme-text/80 hover:bg-theme-muted"
          )}
        >
          <Heart className={cn("w-4 h-4", hasLiked && "fill-white")} />
          <span>{likesCount} Likes</span>
        </button>
        <div className="flex items-center gap-2 text-theme-text/60 font-semibold px-2">
          <MessageCircle className="w-5 h-5" />
          <span>{comments.length} Comments</span>
        </div>
      </div>

      <div className="space-y-5 max-w-2xl mx-auto">
        <h3 className="font-heading font-black text-xl border-b border-theme-border pb-3">
          Community Discussion
        </h3>

        {isRestricted ? (
           <div className="max-w-4xl mx-auto bg-red-500/10 border border-red-500/20 text-red-500 text-sm font-bold p-4 rounded-xl flex items-center justify-center gap-2 text-center transform-gpu will-change-transform">
              <Ban className="w-5 h-5 shrink-0" />
              You have been restricted from interactions.
           </div>
        ) : (
           <div className="relative flex items-end">
              <textarea
                ref={textareaRef}
                rows={1}
                placeholder="Share a thoughtful insight..."
                value={newComment}
                onChange={handleInput}
                className="w-full bg-theme-muted/30 border border-theme-border rounded-[24px] py-[13px] pl-6 pr-[52px] text-[15px] leading-[20px] focus:outline-none focus:border-theme-accent-end transition-all text-theme-text resize-none overflow-y-auto block"
                style={{ minHeight: '48px', maxHeight: '160px' }}
              />
              <button
                type="button"
                onClick={handleAddComment}
                disabled={!newComment.trim()}
                className="absolute right-2 bottom-[8px] w-[32px] h-[32px] flex items-center justify-center bg-theme-accent-end text-white rounded-full disabled:opacity-50 hover:scale-105 transition-transform transform-gpu will-change-transform shrink-0"
              >
                <Send className="w-4 h-4 -ml-[1px] mt-[1px]" />
              </button>
           </div>
        )}

        <div className="space-y-4 mt-6 pb-12">
          {comments.length === 0 ? (
            <p className="text-center text-theme-text/50 py-8 text-sm font-semibold tracking-wide uppercase">
              Be the first to start the discussion.
            </p>
          ) : (
            comments.map((c, i) => (
               <CommentItem 
                  key={c.id} 
                  comment={c} 
                  isMe={c.user_id === user?.id}
                  isAdmin={isAdmin}
                  onDelete={handleDeleteComment}
                  onBan={handleBanUser}
                  onViewProfile={setSelectedAdminProfile}
               />
            ))
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

const CommentItem = React.memo(({ comment, isMe, isAdmin, onDelete, onBan, onViewProfile }: { comment: NoteComment, isMe: boolean, isAdmin: boolean, onDelete: (id: string) => void, onBan: (id: string) => void, onViewProfile: (c: NoteComment) => void }) => {
   const [showMenu, setShowMenu] = useState(false);
   const [copied, setCopied] = useState(false);
   const menuRef = useRef<HTMLDivElement>(null);

   const isMsgAdmin = comment.avatar_url?.includes('#admin') || false;

   useEffect(() => {
     const handleClickOutside = (event: MouseEvent) => {
       if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
         setShowMenu(false);
       }
     };
     if (showMenu) document.addEventListener('mousedown', handleClickOutside);
     return () => document.removeEventListener('mousedown', handleClickOutside);
   }, [showMenu]);

   const handleCopy = () => {
     navigator.clipboard.writeText(comment.content);
     setCopied(true);
     setTimeout(() => { setCopied(false); setShowMenu(false); }, 2000);
   };

   return (
      <div className="flex gap-3 group relative w-full items-start">
         <img src={comment.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${comment.user_id}`} alt="Avatar" className="w-8 h-8 rounded-full bg-theme-muted shrink-0" />
         
         <div className={cn("bg-theme-card border border-theme-border/70 p-3.5 rounded-2xl rounded-tl-sm text-[14px] flex-1 shadow-sm relative transition-all", isMsgAdmin && "bg-gradient-to-r from-[#2a020b] to-[#4C0519] border-[#4C0519]/50 text-[#e8c3a2]")}>
            <div className="flex justify-between items-center mb-1.5">
               <div className="flex items-center gap-1.5">
                  <p className="font-bold">{comment.username || 'Unknown'}</p>
                  {isMsgAdmin && <span className="text-[9px] bg-yellow-500/20 border border-yellow-500/30 text-yellow-500 px-1.5 py-0.5 rounded font-black tracking-widest uppercase shadow-sm">👑 Admin</span>}
                  <span className="text-[10px] text-theme-text/40 ml-1">{new Date(comment.created_at).toLocaleDateString()}</span>
               </div>
               
               <div className="relative" ref={menuRef}>
                  <button 
                     onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }} 
                     className="p-1 text-theme-text/30 hover:text-theme-text/80 rounded-full transition-colors active:bg-theme-muted"
                  >
                     <MoreVertical className="w-4 h-4" />
                  </button>
                  {showMenu && (
                     <div className="absolute top-full right-0 mt-1 min-w-[140px] bg-theme-bg border border-theme-border/50 rounded-xl shadow-md overflow-hidden z-[100] transform-gpu will-change-transform">
                        <button onClick={(e) => { e.stopPropagation(); handleCopy(); }} className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-theme-text hover:bg-theme-muted/50 transition-colors text-left font-medium">
                           {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                           {copied ? 'Copied!' : 'Copy Text'}
                        </button>
                        {(isMe || isAdmin) && (
                           <>
                              <div className="h-px bg-theme-border/50 w-full" />
                              <button onClick={(e) => { e.stopPropagation(); setShowMenu(false); onDelete(comment.id); }} className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-red-500 hover:bg-red-500/10 transition-colors text-left font-medium">
                                 <Trash2 className="w-3.5 h-3.5" />
                                 Delete
                              </button>
                           </>
                        )}
                        {isAdmin && !isMe && (
                           <>
                              <div className="h-px bg-theme-border/50 w-full" />
                              <button onClick={(e) => { e.stopPropagation(); setShowMenu(false); onViewProfile(comment); }} className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-theme-text hover:bg-theme-muted/50 transition-colors text-left font-medium">
                                 <User className="w-3.5 h-3.5" />
                                 View Profile
                              </button>
                              <div className="h-px bg-theme-border/50 w-full" />
                              <button onClick={(e) => { e.stopPropagation(); setShowMenu(false); onBan(comment.user_id); }} className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-red-500 hover:bg-red-500/10 transition-colors text-left font-medium">
                                 <Ban className="w-3.5 h-3.5" />
                                 Ban User
                              </button>
                           </>
                        )}
                     </div>
                  )}
               </div>
            </div>
            <p className={cn("leading-relaxed", isMsgAdmin ? "opacity-90" : "opacity-80 whitespace-pre-wrap break-words")}>
               {comment.content}
            </p>
         </div>
      </div>
   );
});
