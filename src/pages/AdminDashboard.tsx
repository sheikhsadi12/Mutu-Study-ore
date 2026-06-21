import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { ArrowLeft, Ban, CheckCircle, Search, ShieldAlert, Users, Trash2, Settings, Power, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface AdminUser {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  is_banned: boolean;
  is_admin: boolean;
  created_at?: string;
}

interface SystemControls {
  id: number;
  is_login_disabled: boolean;
  is_chat_disabled: boolean;
  is_comments_disabled: boolean;
}

export function AdminDashboard() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [systemControls, setSystemControls] = useState<SystemControls>({
    id: 1,
    is_login_disabled: false,
    is_chat_disabled: false,
    is_comments_disabled: false,
  });
  const [loadingControls, setLoadingControls] = useState(true);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);

  // Dynamic Dashboard settings states
  const [noticeText, setNoticeText] = useState('নোটিশ: আগামীকাল ইংরেজি ২য় পত্রের মডেল টেস্ট। প্রস্তুতি নিতে ভুলবে না!');
  const [countdownDate, setCountdownDate] = useState('2026-08-01T00:00:00');
  const [savingConfig, setSavingConfig] = useState(false);
  const [loadingConfig, setLoadingConfig] = useState(true);

  useEffect(() => {
    let isMounted = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (isMounted) {
        setCurrentUserEmail(session?.user?.email || null);
      }
    });

    const loadInitialData = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, email, full_name, avatar_url, created_at, is_admin, is_banned')
          .order('created_at', { ascending: false });

        if (profilesError) {
          throw profilesError;
        }

        if (profiles && profiles.length > 0) {
          const mapped: AdminUser[] = profiles.map((p) => ({
            id: p.id,
            email: p.email || '',
            full_name: p.full_name,
            avatar_url: p.avatar_url,
            is_banned: p.is_banned || false,
            is_admin: p.is_admin || false,
            created_at: p.created_at || undefined,
          }));

          if (isMounted) setUsers(mapped);
        } else {
          if (isMounted) setUsers([]);
        }
      } catch (e: any) {
        console.error('Supabase Fetch Error:', e.message);
        if (isMounted) setError(e.message || 'Failed to load users');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    const loadSystemControls = async () => {
      try {
        const { data, error } = await supabase
          .from('system_controls')
          .select('*')
          .eq('id', 1)
          .single();
        
        if (error && error.code !== 'PGRST116') {
          throw error;
        }
        
        if (data && isMounted) {
          setSystemControls(data);
        }
      } catch (e) {
        console.error('Failed to fetch system controls', e);
      } finally {
        if (isMounted) setLoadingControls(false);
      }
    };

    const loadDashboardConfig = async () => {
      try {
        const { data } = await supabase
          .from('notes')
          .select('*')
          .eq('subject', 'SYSTEM_CONFIG')
          .maybeSingle();
        if (data && data.html_code && isMounted) {
          try {
            const parsed = JSON.parse(data.html_code);
            if (parsed.noticeText) setNoticeText(parsed.noticeText);
            if (parsed.countdownDate) setCountdownDate(parsed.countdownDate);
          } catch (jsonErr) {
            console.error("Error parsing dashboard config JSON:", jsonErr);
          }
        }
      } catch (err) {
        console.error("Error loading dashboard configuration row:", err);
      } finally {
        if (isMounted) setLoadingConfig(false);
      }
    };

    loadInitialData();
    loadSystemControls();
    loadDashboardConfig();

    const profilesChannel = supabase.channel('public:profiles');
    
    profilesChannel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'profiles' },
      (payload) => {
        if (payload.eventType === 'INSERT') {
          const newProfile = payload.new;
          const newUser: AdminUser = {
            id: newProfile.id,
            full_name: newProfile.full_name || 'Unknown Student',
            email: newProfile.email || '',
            avatar_url: newProfile.avatar_url,
            created_at: newProfile.created_at || new Date().toISOString(),
            is_banned: newProfile.is_banned || false,
            is_admin: newProfile.is_admin || false,
          };

          setUsers((prevUsers) => {
            if (prevUsers.some((u) => u.id === newProfile.id)) return prevUsers;
            return [newUser, ...prevUsers];
          });
        } else if (payload.eventType === 'UPDATE') {
          const updatedProfile = payload.new;
          setUsers((prevUsers) =>
            prevUsers.map((user) =>
              user.id === updatedProfile.id
                ? {
                    ...user,
                    is_banned: updatedProfile.is_banned,
                    is_admin: updatedProfile.is_admin,
                    full_name: updatedProfile.full_name || user.full_name,
                    email: updatedProfile.email || user.email,
                    avatar_url: updatedProfile.avatar_url || user.avatar_url,
                  }
                : user
            )
          );
        } else if (payload.eventType === 'DELETE') {
          setUsers((prevUsers) => prevUsers.filter((user) => user.id !== payload.old.id));
        }
      }
    ).subscribe();

    const controlsChannel = supabase.channel('system_controls_changes');
    
    controlsChannel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'system_controls' },
      (payload) => {
        loadSystemControls();
      }
    ).subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(profilesChannel);
      supabase.removeChannel(controlsChannel);
    };
  }, []);

  const fetchSystemControls = async () => {
    try {
      const { data, error } = await supabase
        .from('system_controls')
        .select('*')
        .eq('id', 1)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        throw error;
      }
      
      if (data) {
        setSystemControls(data);
      }
    } catch (e) {
      console.error('Failed to fetch system controls', e);
    } finally {
      setLoadingControls(false);
    }
  };

  const toggleControl = async (field: keyof SystemControls) => {
    try {
      const newValue = !systemControls[field];
      
      // Optimitistic update
      setSystemControls(prev => ({ ...prev, [field]: newValue }));

      const { error } = await supabase
        .from('system_controls')
        .upsert({ id: 1, [field]: newValue });

      if (error) {
        throw error;
      }
    } catch (e: any) {
      console.error(`Failed to toggle ${field}`, e);
      // Revert optimistic update
      fetchSystemControls();
      alert('Failed to apply system control change.');
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*');

      if (profilesError) throw profilesError;

      if (profiles && profiles.length > 0) {
        const mapped: AdminUser[] = profiles.map((p) => ({
          id: p.id,
          email: p.email || '',
          full_name: p.full_name,
          avatar_url: p.avatar_url,
          is_banned: p.is_banned || false,
          is_admin: p.is_admin || false,
          created_at: p.created_at || undefined,
        }));

        mapped.sort((a, b) => {
           if (a.created_at && b.created_at) {
              return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
           }
           return 0;
        });

        setUsers(mapped);
      } else {
        setUsers([]);
      }
    } catch (e: any) {
      console.error('Error fetching admin dashboard users:', e);
      alert('Failed to load user list.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAdmin = async (userId: string, currentlyAdmin: boolean) => {
    if (!window.confirm(`Are you sure you want to ${currentlyAdmin ? 'remove' : 'make'} this user an admin?`)) return;

    try {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ is_admin: !currentlyAdmin })
        .eq('id', userId);

      if (profileError) throw profileError;

      setUsers((prev) =>
        prev.map((u) => {
          if (u.id === userId) {
            return { ...u, is_admin: !currentlyAdmin };
          }
          return u;
        })
      );
    } catch (e: any) {
      console.error('Error toggling admin status:', e);
      alert('Failed to update admin status.');
    }
  };

  const handleBanUser = async (userId: string, isBanned: boolean) => {
    if (!window.confirm(`Are you sure you want to ${isBanned ? 'unban' : 'ban'} this user?`)) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_banned: !isBanned })
        .eq('id', userId);

      if (error) throw error;

      // Update state locally
      setUsers((prev) =>
        prev.map((u) => {
          if (u.id === userId) {
            return { ...u, is_banned: !isBanned };
          }
          return u;
        })
      );
    } catch (e: any) {
      console.error('Error banning user:', e);
      alert('Failed to update ban status.');
    }
  };

  const handleSaveDashboardConfig = async () => {
    setSavingConfig(true);
    try {
      localStorage.setItem('system_notice_text', noticeText);
      localStorage.setItem('system_countdown_date', countdownDate);

      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;
      if (!userId) {
        alert("Authorization error: User details could not be found.");
        return;
      }

      const { error } = await supabase
        .from('notes')
        .upsert({
          id: '00000000-0000-0000-0000-000000001000',
          title: 'System Dashboard Config',
          subject: 'SYSTEM_CONFIG',
          type: 'config',
          html_code: JSON.stringify({ noticeText, countdownDate }),
          user_id: userId,
          created_at: new Date().toISOString()
        });

      if (error) throw error;
      alert("Dashboard settings updated and synchronized successfully!");
    } catch (e: any) {
      console.error(e);
      alert("Error synchronizing settings globally: " + (e.message || "Network exception. Registered on local session."));
    } finally {
      setSavingConfig(false);
    }
  };

  const filteredUsers = users.filter(u => 
      u.email?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      u.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-theme-bg font-sans font-medium">
      <header className="h-[70px] px-6 flex items-center justify-between border-b border-theme-border bg-theme-bg sticky top-0 z-40">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-full hover:bg-theme-muted transition-colors text-theme-text/80"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 text-theme-text">
            <ShieldAlert className="w-6 h-6 text-red-500" />
            <div>
              <h1 className="text-xl font-heading font-black leading-none uppercase tracking-wide">
                Admin Control Panel
              </h1>
              <p className="text-[11px] text-theme-text/50 uppercase tracking-widest mt-1 font-bold">
                Level 4 Access Clearance
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="p-6 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
        
        {/* System Maintence Controls */}
        {currentUserEmail === 'sadishekh671@gmail.com' && (
        <div className="bg-theme-card border border-theme-border p-6 rounded-[24px] shadow-sm">
          <div className="flex items-center gap-3 mb-6 border-b border-theme-border/50 pb-4">
            <Settings className="w-6 h-6 text-theme-accent-end" />
            <h2 className="text-xl font-heading font-black text-theme-text uppercase tracking-wide">System Maintenance Kill-Switches</h2>
          </div>
          
          {loadingControls ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-theme-accent-start border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  id: 'is_login_disabled',
                  label: 'Disable New Logins / Registration',
                  icon: <Power className="w-5 h-5" />,
                  danger: true
                },
                {
                  id: 'is_chat_disabled',
                  label: 'Disable Community Chat',
                  icon: <Power className="w-5 h-5" />,
                  danger: false
                },
                {
                  id: 'is_comments_disabled',
                  label: 'Disable Topic Comments',
                  icon: <Power className="w-5 h-5" />,
                  danger: false
                }
              ].map((control) => {
                const isActive = systemControls[control.id as keyof SystemControls];
                return (
                  <div key={control.id} className={`flex flex-col gap-4 p-5 rounded-2xl border transition-all ${isActive ? 'bg-red-500/5 border-red-500/20' : 'bg-theme-bg border-theme-border'}`}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${isActive ? 'bg-red-500/20 text-red-500' : 'bg-theme-muted text-theme-text/70'}`}>
                           {isActive ? <Ban className="w-5 h-5" /> : control.icon}
                        </div>
                        <span className={`font-bold text-sm ${isActive ? 'text-red-500' : 'text-theme-text'}`}>
                           {control.label}
                        </span>
                      </div>
                      <button
                        onClick={() => toggleControl(control.id as keyof SystemControls)}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-theme-accent-start focus:ring-offset-2 focus:ring-offset-theme-bg ${isActive ? 'bg-red-500' : 'bg-theme-border'}`}
                      >
                        <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isActive ? 'translate-x-5' : 'translate-x-0'}`} />
                      </button>
                    </div>
                    {isActive && (
                      <p className="text-xs text-red-500/80 font-bold uppercase tracking-wider">Currently Disabled</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
        )}

        {/* System Dashboard Config (Notice & Countdown Date) */}
        {currentUserEmail === 'sadishekh671@gmail.com' && (
        <div className="bg-theme-card border border-theme-border p-6 rounded-[24px] shadow-sm space-y-6">
          <div className="flex items-center gap-3 border-b border-theme-border/50 pb-4">
            <div className="p-2 rounded-full bg-amber-500/15 text-amber-600">
              <Settings className="w-5 h-5 animate-spin-slow" />
            </div>
            <div>
              <h2 className="text-xl font-heading font-black text-theme-text uppercase tracking-wide">কনফিগারেশন কন্ট্রোল (Dashboard Configuration)</h2>
              <p className="text-xs text-theme-text/50 font-bold uppercase tracking-widest mt-0.5">Set Global Notice Announcement & Exam Countdown</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Notice Input */}
            <div className="space-y-2">
              <label className="block text-xs font-black uppercase tracking-wider text-theme-text/75">
                নোটিশ বোর্ড টেক্সট (Notice Board Announcement Text)
              </label>
              <textarea
                value={noticeText}
                onChange={(e) => setNoticeText(e.target.value)}
                placeholder="Write global notice board/alert marquee content..."
                rows={3}
                className="w-full px-4 py-3 rounded-xl bg-theme-bg border border-theme-border text-theme-text font-sans font-medium text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-all"
              />
              <p className="text-[10px] text-theme-text/40 font-bold uppercase tracking-widest leading-normal">
                This notice floats dynamically inside the top ticker marquee of the student's dashboard.
              </p>
            </div>

            {/* Countdown Input */}
            <div className="space-y-2">
              <label className="block text-xs font-black uppercase tracking-wider text-theme-text/75">
                পরীক্ষার তারিখ ও সময় নির্ধারণ (Exam Date & Time Countdown)
              </label>
              <input
                type="datetime-local"
                value={countdownDate.substring(0, 16)}
                onChange={(e) => setCountdownDate(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-theme-bg border border-theme-border text-theme-text font-mono font-bold text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-all"
              />
              <p className="text-[10px] text-theme-text/40 font-bold uppercase tracking-widest leading-normal">
                Adjusts the real-time exam countdown clock of the student's dashboard dynamically.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end pt-4 border-t border-theme-border/30">
            <button
              onClick={handleSaveDashboardConfig}
              disabled={savingConfig}
              className="px-6 py-3 bg-[#ea580c] hover:bg-amber-600 text-white font-extrabold text-xs uppercase tracking-widest rounded-xl hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
            >
              {savingConfig ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>সংরক্ষণ হচ্ছে...</span>
                </>
              ) : (
                <span>সেটিংস্ সংরক্ষণ করুন (Save Settings)</span>
              )}
            </button>
          </div>
        </div>
        )}

        <div className="flex flex-col md:flex-row items-center gap-6 justify-between bg-theme-card border border-theme-border p-6 rounded-[24px] shadow-sm mb-6">
           <div className="flex items-center gap-4 text-theme-text">
              <div className="w-14 h-14 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                 <Users className="w-7 h-7 text-blue-500" />
              </div>
              <div>
                 <h2 className="text-2xl font-black">{users.length}</h2>
                 <p className="text-theme-text/60 text-sm font-semibold uppercase tracking-wider">Total Members</p>
              </div>
           </div>

           <div className="relative w-full md:w-80">
              <input 
                 type="text" 
                 placeholder="Search email or full name..." 
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
                 className="w-full pl-11 pr-4 py-3 rounded-xl bg-theme-muted/50 border border-theme-border focus:border-theme-accent-end focus:ring-1 focus:ring-theme-accent-end outline-none transition-all text-theme-text"
              />
              <Search className="w-5 h-5 text-theme-text/40 absolute left-4 top-1/2 -translate-y-1/2" />
           </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500 flex items-center justify-center text-red-500 p-4 rounded-xl gap-3 font-semibold mb-6">
            <AlertTriangle className="w-5 h-5" />
            Failed to load users: {error}
          </div>
        )}

        <div className="bg-theme-card border border-theme-border rounded-[24px] shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-theme-border bg-theme-muted/20">
                  <th className="p-4 text-xs font-bold text-theme-text/50 uppercase tracking-wider">User</th>
                  <th className="p-4 text-xs font-bold text-theme-text/50 uppercase tracking-wider">User ID</th>
                  <th className="p-4 text-xs font-bold text-theme-text/50 uppercase tracking-wider">Join Date</th>
                  <th className="p-4 text-xs font-bold text-theme-text/50 uppercase tracking-wider">Status</th>
                  {currentUserEmail === 'sadishekh671@gmail.com' && (
                     <th className="p-4 text-xs font-bold text-theme-text/50 uppercase tracking-wider">Admin Status</th>
                  )}
                  <th className="p-4 text-xs font-bold text-theme-text/50 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                   <tr>
                      <td colSpan={currentUserEmail === 'sadishekh671@gmail.com' ? 6 : 5} className="p-8 text-center text-theme-text/50">
                         <div className="flex items-center justify-center gap-3">
                            <div className="w-5 h-5 border-2 border-theme-accent-start border-t-transparent rounded-full animate-spin"></div>
                            Loading intel...
                         </div>
                      </td>
                   </tr>
                ) : filteredUsers.length === 0 ? (
                   <tr>
                      <td colSpan={currentUserEmail === 'sadishekh671@gmail.com' ? 6 : 5} className="p-8 text-center text-theme-text/50">
                        No users found in the database.
                      </td>
                   </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.id} className="border-b last:border-b-0 border-theme-border hover:bg-theme-muted/10 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <img 
                            src={user.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.full_name || 'Unknown Student')}&background=random`} 
                            alt={user.full_name || 'Unknown Student'} 
                            className="w-10 h-10 rounded-full border border-theme-border object-cover"
                          />
                          <div>
                            <div className="font-bold text-theme-text">{user.full_name || 'Unknown Student'}</div>
                            <div className="text-sm text-theme-text/70">{user.email || 'N/A'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="text-[10px] text-theme-text/40 font-mono break-all">{user.id}</div>
                      </td>
                      <td className="p-4 text-sm text-theme-text/70 uppercase">
                        {user.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) : 'Unknown'}
                      </td>
                      <td className="p-4">
                        {user.is_banned ? (
                           <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-red-500/10 text-red-500 border border-red-500/20 shadow-sm uppercase tracking-wider">
                              <Ban className="w-3.5 h-3.5" /> Banned
                           </span>
                        ) : (
                           <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-green-500/10 text-green-500 border border-green-500/20 shadow-sm uppercase tracking-wider">
                              <CheckCircle className="w-3.5 h-3.5" /> Active
                           </span>
                        )}
                      </td>
                      {currentUserEmail === 'sadishekh671@gmail.com' && (
                        <td className="p-4">
                          <button
                            onClick={() => handleToggleAdmin(user.id, user.is_admin || false)}
                            disabled={user.email === 'sadishekh671@gmail.com'}
                            className={`inline-flex items-center justify-center min-w-[120px] px-3 py-1.5 rounded-lg text-xs font-bold border shadow-sm transition-all ${
                              user.is_admin 
                              ? 'bg-theme-muted text-theme-text hover:bg-theme-border border-theme-border/50 disabled:opacity-50' 
                              : 'bg-blue-500/10 text-blue-500 border-blue-500/20 hover:bg-blue-500/20 disabled:opacity-50'
                            }`}
                          >
                            {user.is_admin ? '❌ Remove Admin' : '👑 Make Admin'}
                          </button>
                        </td>
                      )}
                      <td className="p-4 text-right">
                        <button
                          onClick={() => handleBanUser(user.id, user.is_banned || false)}
                          className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm border ${
                             user.is_banned 
                             ? 'bg-theme-card text-theme-text hover:bg-theme-muted border-theme-border'
                             : 'bg-red-500/10 hover:bg-red-500/20 text-red-500 border-red-500/20'
                          }`}
                        >
                          {user.is_banned ? 'Restore Access' : <><Ban className="w-3.5 h-3.5" /> Ban User 🚫</>}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
