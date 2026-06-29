import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Bell, 
  Megaphone, 
  FileText, 
  Bot, 
  Users, 
  User, 
  Clock, 
  ChevronRight, 
  Calendar,
  Sparkles,
  Award,
  BookOpen
} from 'lucide-react';
import { Header } from '../components/Header';
import { EliteSuggestionBanner } from '../components/EliteSuggestionBanner';
import { supabase } from '../supabaseClient';

interface DashboardProps {
  toggleTheme: () => void;
  isDarkMode: boolean;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export function Dashboard({ toggleTheme, isDarkMode, searchQuery, setSearchQuery }: DashboardProps) {
  const navigate = useNavigate();

  // Settings states with responsive default fallbacks
  const [noticeText, setNoticeText] = useState('নোটিশ: আগামীকাল ইংরেজি ২য় পত্রের মডেল টেস্ট। প্রস্তুতি নিতে ভুলবে না!');
  const [countdownDate, setCountdownDate] = useState('2026-08-01T00:00:00');
  
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isCompleted: false
  });

  // Load configuration from database (with localStorage fallback)
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const { data, error } = await supabase
          .from('notes')
          .select('*')
          .eq('subject', 'SYSTEM_CONFIG')
          .maybeSingle();
        
        if (data && data.html_code) {
          const parsed = JSON.parse(data.html_code);
          if (parsed.noticeText) setNoticeText(parsed.noticeText);
          if (parsed.countdownDate) setCountdownDate(parsed.countdownDate);
        } else {
          // If no row exists yet, check localStorage
          const savedNoticeText = localStorage.getItem('system_notice_text');
          const savedCountdownDate = localStorage.getItem('system_countdown_date');
          if (savedNoticeText) setNoticeText(savedNoticeText);
          if (savedCountdownDate) setCountdownDate(savedCountdownDate);
        }
      } catch (err) {
        console.error("Error loading system dashboard settings, using fallbacks:", err);
        const savedNoticeText = localStorage.getItem('system_notice_text');
        const savedCountdownDate = localStorage.getItem('system_countdown_date');
        if (savedNoticeText) setNoticeText(savedNoticeText);
        if (savedCountdownDate) setCountdownDate(savedCountdownDate);
      }
    };

    loadConfig();
    
    // Subscribe to changes on the notes table for instant update
    const channel = supabase
      .channel('schema-db-configs')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notes', filter: 'subject=eq.SYSTEM_CONFIG' },
        (payload) => {
          if (payload.new && (payload.new as any).html_code) {
            try {
              const parsed = JSON.parse((payload.new as any).html_code);
              if (parsed.noticeText) setNoticeText(parsed.noticeText);
              if (parsed.countdownDate) setCountdownDate(parsed.countdownDate);
            } catch (jsonErr) {
              console.error("Error parsing real-time settings payload:", jsonErr);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Update redirect on search
  useEffect(() => {
    if (searchQuery && searchQuery.trim() !== '') {
      navigate('/notes');
    }
  }, [searchQuery, navigate]);

  // Exam Real-Time Countdown logic
  useEffect(() => {
    const calculateTime = () => {
      const target = new Date(countdownDate).getTime();
      const now = new Date().getTime();
      const difference = target - now;

      if (isNaN(target) || difference <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isCompleted: true });
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds, isCompleted: false });
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);

    return () => clearInterval(interval);
  }, [countdownDate]);

  return (
    <div className="flex flex-col h-screen bg-theme-bg overflow-hidden relative">
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
        .animate-marquee-custom {
          animation: marquee 20s linear infinite;
        }
        .animate-marquee-custom:hover {
          animation-play-state: paused;
        }
        .text-glow-accent {
          text-shadow: 0 0 10px rgba(252, 211, 77, 0.4);
        }
      `}</style>

      {/* Primary Header */}
      <Header 
        toggleTheme={toggleTheme} 
        isDarkMode={isDarkMode} 
        searchQuery={searchQuery} 
        setSearchQuery={setSearchQuery}
      />

      {/* Main Container */}
      <div className="flex-1 overflow-y-auto w-full p-4 md:p-6 space-y-5 pb-20 font-sans">
        
        {/* Sleek News Ticker Alert Box */}
        <div id="notice-board-element" className="w-full max-w-2xl mx-auto rounded-xl bg-theme-card border border-theme-border flex items-center h-10 overflow-hidden relative px-3 py-1.5 shadow-sm shrink-0">
          <div className="flex items-center gap-1 px-2 py-0.5 mr-3 rounded-lg bg-theme-accent-start/10 border border-theme-accent-start/20 text-theme-accent-start shrink-0 z-10 font-bold text-[11px] select-none">
            <Megaphone className="w-3 h-3 text-theme-accent-start animate-bounce" />
            <span>নোটিশ</span>
          </div>
          <div className="flex-1 overflow-hidden relative h-full flex items-center bg-transparent">
            <span className="animate-marquee-custom whitespace-nowrap text-xs font-semibold text-theme-text/85 cursor-pointer select-none">
              {noticeText}
            </span>
          </div>
        </div>

        {/* Compact Countdown Section (Adapts to Light/Dark Modes with Royal Maroon Themes) */}
        <section className="w-full max-w-2xl mx-auto relative group">
          {/* Custom style injection for premium animated glass-shine effects */}
          <style dangerouslySetInnerHTML={{__html: `
            @keyframes glass-shine-animation {
              0% { transform: translateX(-180%) skewX(-20deg); opacity: 0; }
              15% { opacity: 0.65; }
              35% { transform: translateX(180%) skewX(-20deg); opacity: 0; }
              100% { transform: translateX(180%) skewX(-20deg); opacity: 0; }
            }
            .glass-shine-effect {
              position: absolute;
              top: 0;
              bottom: 0;
              left: -50%;
              width: 60%;
              background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.18), transparent);
              pointer-events: none;
              animation: glass-shine-animation 5.5s infinite ease-in-out;
            }
            .glass-shine-effect-light {
              position: absolute;
              top: 0;
              bottom: 0;
              left: -50%;
              width: 60%;
              background: linear-gradient(90deg, transparent, rgba(232, 195, 162, 0.25), transparent);
              pointer-events: none;
              animation: glass-shine-animation 5.5s infinite ease-in-out;
            }
          `}} />

          {/* Ambient overlay matching royal colors */}
          <div className={`absolute -inset-1 rounded-2xl bg-gradient-to-r ${isDarkMode ? 'from-[#4c0519]/15 to-[#7c2d12]/15' : 'from-[#e8c3a2]/20 to-[#fbf5ee]/10'} blur-md opacity-70`}></div>
          
          <div className={`relative rounded-2xl p-4 shadow-md text-center overflow-hidden border backdrop-blur-sm ${
            isDarkMode 
              ? 'bg-gradient-to-br from-[#130004]/90 via-[#2a020b]/95 to-[#130004]/90 border-[#7c2d12]/50 text-white' 
              : 'bg-gradient-to-br from-[#fffdf9]/95 via-[#fdfbf6]/98 to-[#f7ebd9]/95 border-[#e8c3a2] text-[#2d1610]'
          }`}>
            <div className={`absolute top-0 left-0 w-full h-[2.5px] bg-gradient-to-r from-[#4c0519] to-[#e8c3a2]`}></div>
            
            {/* Glossy animated shine lines */}
            <div className={isDarkMode ? "glass-shine-effect" : "glass-shine-effect-light"} />

            <div className="flex flex-col items-center gap-1">
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider leading-none ${
                isDarkMode 
                  ? 'bg-[#4c0519]/60 text-[#e8c3a2] border border-[#7c2d12]/40' 
                  : 'bg-[#fbf5ee] text-[#4c0519] border border-[#e8c3a2]/50'
              }`}>
                <Award className="w-2.5 h-2.5 text-[#4c0519] dark:text-[#e8c3a2]" />
                Alim Exam Countdown • আলিম পরীক্ষা
              </span>
              <h2 className="text-sm md:text-base font-heading font-black tracking-tight mt-1">
                মহা পরীক্ষার প্রস্তুতি কাউন্টডাউন
              </h2>
            </div>

            {timeLeft.isCompleted ? (
              <div className="py-3 font-heading font-black text-sm text-theme-accent-start">
                পরীক্ষা শুরু হয়েছে! সবার জন্য শুভকামনা।
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-2 w-full max-w-xs sm:max-w-sm mx-auto py-2.5">
                {/* Days */}
                <div className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all shadow-sm ${
                  isDarkMode 
                    ? 'bg-[#2a020b]/80 border border-[#7c2d12]/45' 
                    : 'bg-white border border-[#e8c3a2]'
                }`}>
                  <span className={`text-lg sm:text-xl font-black font-mono tracking-tight ${
                    isDarkMode ? 'text-[#fff6ee]' : 'text-[#4c0519]'
                  }`}>
                    {timeLeft.days.toString().padStart(2, '0')}
                  </span>
                  <div className="flex items-center gap-0.5 mt-0.5 text-[7px] sm:text-[9px] font-bold text-theme-text/45">
                    <span className="uppercase font-mono">Days</span>
                    <span>•</span>
                    <span>দিন</span>
                  </div>
                </div>

                {/* Hours */}
                <div className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all shadow-sm ${
                  isDarkMode 
                    ? 'bg-[#2a020b]/80 border border-[#7c2d12]/45' 
                    : 'bg-white border border-[#e8c3a2]'
                }`}>
                  <span className={`text-lg sm:text-xl font-black font-mono tracking-tight ${
                    isDarkMode ? 'text-[#fff6ee]' : 'text-[#4c0519]'
                  }`}>
                    {timeLeft.hours.toString().padStart(2, '0')}
                  </span>
                  <div className="flex items-center gap-0.5 mt-0.5 text-[7px] sm:text-[9px] font-bold text-theme-text/45">
                    <span className="uppercase font-mono">Hours</span>
                    <span>•</span>
                    <span>ঘণ্টা</span>
                  </div>
                </div>

                {/* Minutes */}
                <div className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all shadow-sm ${
                  isDarkMode 
                    ? 'bg-[#2a020b]/80 border border-[#7c2d12]/45' 
                    : 'bg-white border border-[#e8c3a2]'
                }`}>
                  <span className={`text-lg sm:text-xl font-black font-mono tracking-tight ${
                    isDarkMode ? 'text-[#fff6ee]' : 'text-[#4c0519]'
                  }`}>
                    {timeLeft.minutes.toString().padStart(2, '0')}
                  </span>
                  <div className="flex items-center gap-0.5 mt-0.5 text-[7px] sm:text-[9px] font-bold text-theme-text/45">
                    <span className="uppercase font-mono">Mins</span>
                    <span>•</span>
                    <span>মিনিট</span>
                  </div>
                </div>

                {/* Seconds */}
                <div className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all shadow-sm ${
                  isDarkMode 
                    ? 'bg-[#2a020b]/80 border border-[#7c2d12]/45' 
                    : 'bg-white border border-[#e8c3a2]'
                }`}>
                  <span className={`text-lg sm:text-xl font-black font-mono tracking-tight ${
                    isDarkMode ? 'text-[#fff6ee]' : 'text-[#4c0519]'
                  }`}>
                    {timeLeft.seconds.toString().padStart(2, '0')}
                  </span>
                  <div className="flex items-center gap-0.5 mt-0.5 text-[7px] sm:text-[9px] font-bold text-theme-text/45">
                    <span className="uppercase font-mono">Secs</span>
                    <span>•</span>
                    <span>সেকেন্ড</span>
                  </div>
                </div>
              </div>
            )}

            <div className={`mt-1 flex items-center justify-center gap-1 text-[9px] py-0.5 px-2 w-fit mx-auto rounded-full border ${
              isDarkMode 
                ? 'text-white/40 bg-black/15 border-white/5' 
                : 'text-[#2d1610]/55 bg-[#fbf5ee] border-[#e8c3a2]/40'
            }`}>
              <Calendar className="w-2.5 h-2.5 text-theme-accent-start" />
              <span>নির্ধারিত তারিখ: {new Date(countdownDate).toLocaleDateString('bn-BD', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
            </div>
          </div>
        </section>

        {/* Elite Suggestion Section */}
        <section className="w-full max-w-2xl mx-auto flex flex-col pt-2">
          <EliteSuggestionBanner onSelectNote={(note) => {
             if (note) {
               localStorage.setItem('elite_target_note', JSON.stringify(note));
             } else {
               localStorage.removeItem('elite_target_note');
             }
             navigate('/elite-suggestions');
          }} />
        </section>

        {/* Modules Navigation Grid */}
        <section className="w-full max-w-2xl mx-auto space-y-4 font-sans">
          <div className="flex items-center justify-between text-theme-text px-1">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-theme-accent-start" />
              <h3 className="font-heading font-black text-base md:text-lg">ড্যাশবোর্ড মডিউল (Modules)</h3>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            
            {/* 1. HIGHLIGHTED & DESIGNED MAIN MODULE: "Notes & Suggestions" */}
            <div className="col-span-2 relative group cursor-pointer" onClick={() => navigate('/notes')}>
              
              <div className={`relative p-5 md:p-6 rounded-2xl border-2 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col items-stretch justify-between gap-4 overflow-hidden backdrop-blur-sm ${
                isDarkMode 
                  ? 'bg-gradient-to-br from-[#2a020b]/55 to-[#1c0005]/90 border-[#7c2d12]/50 hover:border-[#7c2d12]'
                  : 'bg-gradient-to-br from-[#ffffff]/95 to-[#fffdf9]/95 border-[#e8c3a2] hover:border-[#7c2d12]'
              }`}>
                
                {/* Glossy animated shine lines */}
                <div className={isDarkMode ? "glass-shine-effect" : "glass-shine-effect-light"} />
                
                {/* Royal decorative emblem watermark in background */}
                <div className={`absolute right-0 bottom-0 translate-x-12 translate-y-12 w-48 h-48 rounded-full bg-gradient-to-tr ${
                  isDarkMode ? 'from-[#7c2d12]/5 to-transparent' : 'from-[#e8c3a2]/10 to-transparent'
                }`}></div>
                
                <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 relative z-10 w-full">
                  <div className="flex items-start sm:items-center gap-4">
                    {/* Floating Masterwork Icon Wrapper */}
                    <div className="w-[49px] h-[49px] rounded-2xl bg-gradient-to-br from-[#4c0519] to-[#7c2d12] text-white flex items-center justify-center border-2 border-[#e8c3a2]/50 shadow-md group-hover:scale-105 transition-transform shrink-0 relative">
                      <div className="absolute inset-0 bg-white/5 rounded-2xl animate-pulse"></div>
                      <FileText className="w-6 h-6 text-[#e5c2a1]" />
                    </div>
                    <div>
                      <h4 className="font-heading font-black text-xl md:text-2xl text-theme-text group-hover:text-theme-accent-start transition-colors flex items-center gap-2">
                        নোট ও সাজেশন্স (Notes & suggestions)
                      </h4>
                      <p className="text-xs text-theme-text/80 mt-1 uppercase tracking-wider font-semibold">
                        আলিম পরীক্ষার  সাজেশন, চূড়ান্ত টিপ্স এবং এক্সক্লুসিভ স্টাডি ম্যাটেরিয়ালস
                      </p>
                    </div>
                  </div>

                  <div className="w-full md:w-auto flex items-center justify-end shrink-0 pt-2 md:pt-0">
                    <div className="w-full md:w-auto px-5 py-3 bg-gradient-to-r from-[#4c0519] to-[#7c2d12] text-white font-extrabold text-xs uppercase tracking-widest rounded-xl flex items-center justify-center gap-1.5 shadow-sm group-hover:shadow-md transition-all group-hover:brightness-110">
                      <span>See suggestions</span>
                      <ChevronRight className="w-4 h-4 text-[#e8c3a2] group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* 2. Secondary Card: AI Tutor */}
            <button 
              onClick={() => navigate('/ai-chat')}
              className="group text-left p-4 rounded-2xl bg-theme-card border border-theme-border shadow-sm hover:shadow-md hover:border-theme-accent-start/40 transform hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between h-32 relative overflow-hidden"
            >
              <div className="absolute right-0 top-0 translate-x-1/4 -translate-y-1/4 w-24 h-24 rounded-full bg-theme-accent-start/5 group-hover:bg-theme-accent-start/10 transition-colors"></div>
              <div className="w-9 h-9 rounded-xl bg-theme-accent-start/10 flex items-center justify-center text-theme-accent-end border border-theme-border group-hover:bg-[#4c0519] group-hover:text-white transition-colors">
                <Bot className="w-4.5 h-4.5" />
              </div>
              <div>
                <h4 className="font-black font-heading text-sm md:text-base text-theme-text group-hover:text-theme-accent-start transition-colors flex items-center justify-between">
                  <span>এআই টিউটর</span>
                  <ChevronRight className="w-4 h-4 text-theme-text/40 group-hover:translate-x-1 transition-transform" />
                </h4>
                <p className="text-[10px] md:text-xs text-theme-text/60 mt-0.5 font-medium">Interactive AI Mate</p>
              </div>
            </button>

            {/* 3. Secondary Card: Community Chat */}
            <button 
              onClick={() => navigate('/community')}
              className="group text-left p-4 rounded-2xl bg-theme-card border border-theme-border shadow-sm hover:shadow-md hover:border-theme-accent-start/40 transform hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between h-32 relative overflow-hidden"
            >
              <div className="absolute right-0 top-0 translate-x-1/4 -translate-y-1/4 w-24 h-24 rounded-full bg-theme-accent-start/5 group-hover:bg-theme-accent-start/10 transition-colors"></div>
              <div className="w-9 h-9 rounded-xl bg-theme-accent-start/10 flex items-center justify-center text-theme-accent-end border border-theme-border group-hover:bg-[#4c0519] group-hover:text-white transition-colors">
                <Users className="w-4.5 h-4.5" />
              </div>
              <div>
                <h4 className="font-black font-heading text-sm md:text-base text-theme-text group-hover:text-theme-accent-start transition-colors flex items-center justify-between">
                  <span>কমিউনিটি চ্যাট</span>
                  <ChevronRight className="w-4 h-4 text-theme-text/40 group-hover:translate-x-1 transition-transform" />
                </h4>
                <p className="text-[10px] md:text-xs text-theme-text/60 mt-0.5 font-medium">Students Lounge & Discussions</p>
              </div>
            </button>

            {/* 4. Secondary Card: Profile Settings */}
            <button 
              onClick={() => navigate('/profile')}
              className="group text-left p-4 rounded-2xl bg-theme-card border border-theme-border shadow-sm hover:shadow-md hover:border-theme-accent-start/40 transform hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between h-32 relative overflow-hidden md:col-span-1 col-span-2"
            >
              <div className="absolute right-0 top-0 translate-x-1/4 -translate-y-1/4 w-24 h-24 rounded-full bg-theme-accent-start/5 group-hover:bg-theme-accent-start/10 transition-colors"></div>
              <div className="w-9 h-9 rounded-xl bg-theme-accent-start/10 flex items-center justify-center text-theme-accent-end border border-theme-border group-hover:bg-[#4c0519] group-hover:text-white transition-colors">
                <User className="w-4.5 h-4.5" />
              </div>
              <div>
                <h4 className="font-black font-heading text-sm md:text-base text-theme-text group-hover:text-theme-accent-start transition-colors flex items-center justify-between">
                  <span>প্রোফাইল সেটিংস</span>
                  <ChevronRight className="w-4 h-4 text-theme-text/40 group-hover:translate-x-1 transition-transform" />
                </h4>
                <p className="text-[10px] md:text-xs text-theme-text/60 mt-0.5 font-medium">Progress Tracker & Bio</p>
              </div>
            </button>

          </div>
        </section>

      </div>
    </div>
  );
}
