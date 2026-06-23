import React, { useState, useEffect } from 'react';
import { Bell, MessageSquare, BookOpen, ShieldAlert, X } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { User } from '@supabase/supabase-js';

interface NotificationSettingsProps {
  user: User | null;
  onClose: () => void;
}

export function NotificationSettings({ user, onClose }: NotificationSettingsProps) {
  const [settings, setSettings] = useState({
    community_chat: true,
    content_updates: true,
    notice_board: true,
    direct_messages: true,
  });
  const [loading, setLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  useEffect(() => {
    if (!user) return;
    const fetchSettings = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (data && !error) {
        setSettings({
          community_chat: data.community_chat ?? true,
          content_updates: data.content_updates ?? true,
          notice_board: data.notice_board ?? true,
          direct_messages: data.direct_messages ?? true,
        });
      } else if (error && error.code !== 'PGRST116' && error.code !== '42P01') {
        console.error("Error fetching settings:", error);
      }
      
      // Fallback to local storage if table doesn't exist
      if (error && error.code === '42P01') {
         const local = localStorage.getItem(`notify_settings_${user.id}`);
         if (local) {
           setSettings(JSON.parse(local));
         }
      }
      
      setLoading(false);
    };
    fetchSettings();
  }, [user]);

  const toggleSetting = async (key: keyof typeof settings) => {
    if (!user) return;
    const newSettings = { ...settings, [key]: !settings[key] };
    setSettings(newSettings);
    
    setSaveStatus('saving');
    
    const { error } = await supabase
      .from('user_settings')
      .upsert({ 
         user_id: user.id, 
         community_chat: newSettings.community_chat,
         content_updates: newSettings.content_updates,
         notice_board: newSettings.notice_board,
         direct_messages: newSettings.direct_messages,
         updated_at: new Date().toISOString()
      });

    if (error) {
      console.error("Error saving settings to Supabase, falling back to local storage:", error);
      localStorage.setItem(`notify_settings_${user.id}`, JSON.stringify(newSettings));
      if (error.code !== '42P01') {
         setSaveStatus('error');
         setTimeout(() => setSaveStatus('idle'), 2000);
         return;
      }
    }
    
    setSaveStatus('saved');
    setTimeout(() => setSaveStatus('idle'), 2000);
  };

  const SettingRow = ({ icon: Icon, title, description, stateKey }: { icon: any, title: string, description: string, stateKey: keyof typeof settings }) => (
    <div className="flex items-center justify-between p-4 bg-theme-bg/50 border border-theme-border/50 rounded-xl">
      <div className="flex items-start gap-3">
        <div className="p-2 bg-theme-muted rounded-lg shrink-0">
          <Icon className="w-5 h-5 text-theme-text/80" />
        </div>
        <div>
          <h4 className="text-sm font-bold text-theme-text">{title}</h4>
          <p className="text-xs text-theme-text/60 mt-0.5">{description}</p>
        </div>
      </div>
      <button 
        onClick={() => toggleSetting(stateKey)}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${settings[stateKey] ? 'bg-gradient-to-r from-theme-accent-start to-theme-accent-end' : 'bg-theme-muted border-theme-border'}`}
      >
        <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${settings[stateKey] ? 'translate-x-5' : 'translate-x-0'}`} />
      </button>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-theme-bg border border-theme-border rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-4 border-b border-theme-border bg-theme-muted/30">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-theme-accent-end" />
            <h2 className="font-bold text-lg">Notification Settings</h2>
          </div>
          <button onClick={onClose} className="p-1.5 text-theme-text/50 hover:text-theme-text hover:bg-theme-border/50 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-4 md:p-6 flex flex-col gap-3">
          {loading ? (
             <div className="flex justify-center p-8"><div className="w-6 h-6 border-2 border-theme-accent-end border-t-transparent rounded-full animate-spin"></div></div>
          ) : (
            <>
              <SettingRow 
                icon={MessageSquare} 
                title="Community Chat Notifications" 
                description="Get notified about new messages in the community channel."
                stateKey="community_chat" 
              />
              <SettingRow 
                icon={BookOpen} 
                title="Content Updates" 
                description="Alerts when new notes or study materials are published."
                stateKey="content_updates" 
              />
              <SettingRow 
                icon={ShieldAlert} 
                title="Notice Board Alerts" 
                description="Important announcements and floating notices."
                stateKey="notice_board" 
              />
              <SettingRow 
                icon={Bell} 
                title="Direct Messages from Admin" 
                description="Notifications when you receive a 1-on-1 response."
                stateKey="direct_messages" 
              />
            </>
          )}
        </div>
        
        <div className="p-4 bg-theme-muted/20 border-t border-theme-border text-xs flex justify-between items-center text-theme-text/60">
           <span>Preferences are applied instantly.</span>
           {saveStatus === 'saving' && <span className="text-theme-text">Saving...</span>}
           {saveStatus === 'saved' && <span className="text-theme-accent-end font-bold">Saved!</span>}
           {saveStatus === 'error' && <span className="text-red-500 font-bold">Error saving</span>}
        </div>
      </div>
    </div>
  );
}
