import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { ArrowLeft, Ban, CheckCircle, Search, ShieldAlert, Users, Trash2, Settings, Power } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface AdminUser {
  id: string;
  email: string;
  username: string;
  created_at?: string;
  is_banned?: boolean;
  is_admin?: boolean;
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
  const [searchTerm, setSearchTerm] = useState('');
  const [systemControls, setSystemControls] = useState<SystemControls>({
    id: 1,
    is_login_disabled: false,
    is_chat_disabled: false,
    is_comments_disabled: false,
  });
  const [loadingControls, setLoadingControls] = useState(true);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setCurrentUserEmail(session?.user?.email || null);
    });
    fetchUsers();
    fetchSystemControls();

    const subscription = supabase
      .channel('admin_user_list_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'admin_user_list' },
        (payload) => {
          fetchUsers(); // Refresh the list when changes occur
        }
      )
      .subscribe();

    const controlsSubscription = supabase
      .channel('system_controls_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'system_controls' },
        (payload) => {
          fetchSystemControls();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
      supabase.removeChannel(controlsSubscription);
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
      // Fetch admin_user_list
      const { data: adminList, error: adminListError } = await supabase
        .from('admin_user_list')
        .select('*');

      if (adminListError) throw adminListError;

      // Extract ids to fetch profile status
      if (adminList && adminList.length > 0) {
        const ids = adminList.map((u) => u.id);
        
        // Fetch profiles
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, is_banned, is_admin')
          .in('id', ids);

        if (profilesError) throw profilesError;

        // Merge
        const merged: AdminUser[] = adminList.map((adminUser) => {
          const profile = profiles?.find((p) => p.id === adminUser.id);
          return {
            ...adminUser,
            is_banned: profile?.is_banned || false,
            is_admin: profile?.is_admin || adminUser.is_admin || false,
          };
        });

        // Sort by newest first, assuming created_at exists, otherwise ID
        merged.sort((a, b) => {
           if (a.created_at && b.created_at) {
              return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
           }
           return 0;
        });

        setUsers(merged);
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
      const { error: adminError } = await supabase
        .from('admin_user_list')
        .update({ is_admin: !currentlyAdmin })
        .eq('id', userId);

      if (adminError) throw adminError;

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

  const filteredUsers = users.filter(u => 
      u.email?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      u.username?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-theme-bg font-sans font-medium">
      <header className="h-[70px] px-6 flex items-center justify-between border-b border-theme-border bg-theme-bg sticky top-0 z-40">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
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

        <div className="flex flex-col md:flex-row items-center gap-6 justify-between bg-theme-card border border-theme-border p-6 rounded-[24px] shadow-sm">
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
                 placeholder="Search email or username..." 
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
                 className="w-full pl-11 pr-4 py-3 rounded-xl bg-theme-muted/50 border border-theme-border focus:border-theme-accent-end focus:ring-1 focus:ring-theme-accent-end outline-none transition-all text-theme-text"
              />
              <Search className="w-5 h-5 text-theme-text/40 absolute left-4 top-1/2 -translate-y-1/2" />
           </div>
        </div>

        <div className="bg-theme-card border border-theme-border rounded-[24px] shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-theme-border bg-theme-muted/20">
                  <th className="p-4 text-xs font-bold text-theme-text/50 uppercase tracking-wider">Email (Real Identity)</th>
                  <th className="p-4 text-xs font-bold text-theme-text/50 uppercase tracking-wider">Community Nickname</th>
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
                        <div className="font-mono text-sm text-theme-text">{user.email || 'N/A'}</div>
                        <div className="text-[10px] text-theme-text/40 font-mono mt-1 break-all">{user.id}</div>
                      </td>
                      <td className="p-4">
                        <div className="font-bold text-theme-text">{user.username}</div>
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
