import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { ArrowLeft, Ban, CheckCircle, Search, ShieldAlert, Users, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface AdminUser {

  id: string;
  email: string;
  username: string;
  created_at?: string;
  is_banned?: boolean; // From profiles join or manual merge
}

export function AdminDashboard() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

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
          .select('id, is_banned')
          .in('id', ids);

        if (profilesError) throw profilesError;

        // Merge
        const merged: AdminUser[] = adminList.map((adminUser) => {
          const profile = profiles?.find((p) => p.id === adminUser.id);
          return {
            ...adminUser,
            is_banned: profile?.is_banned || false,
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
                  <th className="p-4 text-xs font-bold text-theme-text/50 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                   <tr>
                      <td colSpan={5} className="p-8 text-center text-theme-text/50">
                         <div className="flex items-center justify-center gap-3">
                            <div className="w-5 h-5 border-2 border-theme-accent-start border-t-transparent rounded-full animate-spin"></div>
                            Loading intel...
                         </div>
                      </td>
                   </tr>
                ) : filteredUsers.length === 0 ? (
                   <tr>
                      <td colSpan={5} className="p-8 text-center text-theme-text/50">
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
