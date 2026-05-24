import React from 'react';
import { format, subDays, addDays } from 'date-fns';
import { TopBar } from './components/TopBar';
import { BottomNav } from './components/BottomNav';
import { StoryViewer } from './components/StoryViewer';
import { UserProfileModal } from './components/UserProfileModal';
import { AdminPanelModal } from './components/AdminPanelModal';
import { Library as LibraryIcon, Clock, ChevronRight } from 'lucide-react';
import type { Language, Story, User } from './types';

export default function App() {
  const [language, setLanguage] = React.useState<Language>(() => {
    if (typeof window !== 'undefined') {
      const savedLang = localStorage.getItem('lumina_lang');
      if (savedLang === 'en' || savedLang === 'hi') {
        return savedLang as Language;
      }
    }
    return 'en';
  });
  const [user, setUser] = React.useState<User | null>(null);
  const [isProfileOpen, setIsProfileOpen] = React.useState(false);
  const [isAdminOpen, setIsAdminOpen] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<'today' | 'library' | 'profile'>('today');
  const [zenMode, setZenMode] = React.useState(false);
  
  const [currentDate, setCurrentDate] = React.useState(new Date());
  const [story, setStory] = React.useState<Story | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [savedStories, setSavedStories] = React.useState<Record<string, Story>>({});

  React.useEffect(() => {
    const savedUser = localStorage.getItem('lumina_user');
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser) as User;
        
        // Streak Calculation
        const today = new Date();
        const lastRead = parsedUser.lastReadDate ? new Date(parsedUser.lastReadDate) : null;
        
        let updatedUser = { ...parsedUser };
        
        if (lastRead) {
          const getMidnight = (d: Date) => {
            const midnight = new Date(d);
            midnight.setHours(0, 0, 0, 0);
            return midnight.getTime();
          };
          const lastReadMidnight = getMidnight(lastRead);
          const todayMidnight = getMidnight(today);
          const diffDays = Math.round((todayMidnight - lastReadMidnight) / (1000 * 60 * 60 * 24));
          
          if (diffDays === 1) {
            updatedUser.streak = (updatedUser.streak || 0) + 1;
            updatedUser.lastReadDate = today.toISOString();
          } else if (diffDays > 1) {
            updatedUser.streak = 1;
            updatedUser.lastReadDate = today.toISOString();
          }
        } else {
           updatedUser.streak = 1;
           updatedUser.lastReadDate = today.toISOString();
        }
        
        // Defaults
        if (!updatedUser.preferences) {
          updatedUser.preferences = { immersiveAudio: true, dailyReminders: false };
        }
        if (typeof updatedUser.storiesRead !== 'number') {
          updatedUser.storiesRead = 0;
        }
        if (!updatedUser.readStories) {
          updatedUser.readStories = [];
        }

        setUser(updatedUser);
        localStorage.setItem('lumina_user', JSON.stringify(updatedUser));
      } catch (e) {
        console.error("Error parsing user data");
      }
    }
  }, []);

  const handleLogin = (name: string) => {
    const profileKey = `lumina_user_profile_${name.trim().toLowerCase()}`;
    const savedProfile = localStorage.getItem(profileKey);
    let userDetails: User;
    
    if (savedProfile) {
      try {
        userDetails = JSON.parse(savedProfile) as User;
        
        // Ensure properties exist
        if (!userDetails.readStories) userDetails.readStories = [];
        if (typeof userDetails.storiesRead !== 'number') userDetails.storiesRead = userDetails.readStories.length;
        if (!userDetails.preferences) userDetails.preferences = { immersiveAudio: true, dailyReminders: false };
      } catch (err) {
        userDetails = {
          name,
          streak: 1,
          storiesRead: 0,
          readStories: [],
          lastReadDate: new Date().toISOString(),
          preferences: { immersiveAudio: true, dailyReminders: false }
        };
      }
    } else {
      userDetails = {
        name,
        streak: 1,
        storiesRead: 0,
        readStories: [],
        lastReadDate: new Date().toISOString(),
        preferences: { immersiveAudio: true, dailyReminders: false }
      };
    }
    
    setUser(userDetails);
    localStorage.setItem('lumina_user', JSON.stringify(userDetails));
    localStorage.setItem(profileKey, JSON.stringify(userDetails));
  };

  const handleUpdateUser = (updates: Partial<User>) => {
    if (!user) return;
    const updatedUser = { ...user, ...updates };
    setUser(updatedUser);
    localStorage.setItem('lumina_user', JSON.stringify(updatedUser));
    
    const profileKey = `lumina_user_profile_${updatedUser.name.trim().toLowerCase()}`;
    localStorage.setItem(profileKey, JSON.stringify(updatedUser));
  };

  const incrementStoriesRead = (dateStr: string) => {
    if (user) {
      const readStories = user.readStories || [];
      if (!readStories.includes(dateStr)) {
        const updatedReadStories = [...readStories, dateStr];
        handleUpdateUser({
          readStories: updatedReadStories,
          storiesRead: updatedReadStories.length
        });
      }
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('lumina_user');
    setActiveTab('today');
  };

  const dateKey = format(currentDate, 'yyyy-MM-dd');

  React.useEffect(() => {
    if (activeTab !== 'today') return;

    async function fetchStory() {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/story?date=${dateKey}&lang=${language}`);
        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || 'Failed to fetch new story');
        }
        const data = await response.json();
        setStory(data);
      } catch (error) {
        console.error("Story fetch error:", error);
        setStory(null);
      } finally {
        setIsLoading(false);
      }
    }
    fetchStory();
  }, [dateKey, language, activeTab]);

  const isToday = format(currentDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');

  // Handle tab switching
  const handleTabChange = (tab: 'today' | 'library' | 'profile') => {
    if (tab === 'profile') {
      setIsProfileOpen(true);
    } else {
      setActiveTab(tab);
      setZenMode(false);
      if (tab === 'library') {
        const saved = JSON.parse(localStorage.getItem('lumina_saved_stories') || '{}');
        setSavedStories(saved);
      }
    }
  };

  return (
    <div className="h-screen w-full flex flex-col bg-[#050505] overflow-hidden relative">
      <TopBar 
        language={language}
        onLanguageChange={(lang) => {
          setLanguage(lang);
          localStorage.setItem('lumina_lang', lang);
        }}
        dateText={isToday ? "Today's Fable" : format(currentDate, 'MMM d, yyyy')}
        hidden={zenMode && activeTab === 'today'}
      />

      {/* Main Content Area */}
      <main className="flex-1 w-full h-full relative overflow-hidden flex flex-col pt-14 pb-20">
        {activeTab === 'today' && (
           <StoryViewer 
            story={story}
            isLoading={isLoading}
            dateKey={dateKey}
            language={language}
            onScrollStateChange={setZenMode}
            user={user}
            onStoryRead={incrementStoriesRead}
            onPrevDay={() => setCurrentDate(prev => subDays(prev, 1))}
            onNextDay={() => setCurrentDate(prev => addDays(prev, 1))}
            isToday={isToday}
            onUpdateUser={handleUpdateUser}
            onLoginTrigger={() => setIsProfileOpen(true)}
          />
        )}
        
        {activeTab === 'library' && (
          <div className="flex-1 overflow-y-auto w-full max-w-4xl mx-auto px-6 py-12 flex flex-col items-center">
             <h2 className="text-3xl font-serif text-white/90 mb-10 mt-6 tracking-wide">The Archives</h2>
             
             {Object.keys(savedStories).length === 0 ? (
               <div className="flex flex-col items-center justify-center text-center mt-20">
                 <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-6">
                    <LibraryIcon size={24} className="text-white/40" />
                 </div>
                 <p className="text-white/50 text-lg">No fables endeared yet.</p>
               </div>
             ) : (
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full pb-[calc(10rem+env(safe-area-inset-bottom,0px))]">
                 {Object.entries(savedStories).sort((a,b) => b[0].localeCompare(a[0])).map(([date, st]: [string, any]) => (
                   <div key={date} 
                     className="bg-white/5 border border-white/10 rounded-3xl p-6 hover:bg-white/10 transition-colors cursor-pointer group flex flex-col justify-between min-h-[220px]" 
                     onClick={() => { setCurrentDate(new Date(date)); window.speechSynthesis.cancel(); setActiveTab('today'); }}>
                      <div>
                        <div className="flex justify-between items-start mb-6">
                          <span className="text-[10px] font-semibold tracking-[0.2em] uppercase text-white/40 bg-black/40 px-3 py-1.5 rounded-full">{st.category}</span>
                          <span className="text-xs font-mono text-white/30 bg-black/20 px-2 py-1 rounded">{date}</span>
                        </div>
                        <h3 className="font-serif text-2xl text-white/90 leading-snug mb-3 group-hover:text-white line-clamp-2">{st.title}</h3>
                        <p className="text-sm text-white/50 line-clamp-3 leading-relaxed">{st.content}</p>
                      </div>
                      <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/5">
                        <span className="text-xs font-serif italic text-white/30">Today's Fable</span>
                        <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-amber-500/20 group-hover:text-amber-400 transition-colors text-white/30">
                          <ChevronRight size={16} />
                        </div>
                      </div>
                   </div>
                 ))}
               </div>
             )}
          </div>
        )}
      </main>

      {/* Ambient background glows */}
      <div className="fixed inset-0 pointer-events-none z-[-1] overflow-hidden">
        <div className="absolute top-0 right-[10%] w-[50%] h-[40%] rounded-full bg-indigo-900/10 blur-[120px]" />
        <div className="absolute top-[40%] left-[-10%] w-[60%] h-[50%] rounded-full bg-amber-900/10 blur-[130px]" />
      </div>

      <BottomNav 
        activeTab={activeTab === 'profile' ? 'today' : activeTab} // Keep visual selection
        onTabChange={handleTabChange}
        user={user}
        onAdminTrigger={() => setIsAdminOpen(true)}
        hidden={zenMode && activeTab === 'today'}
      />

      <AdminPanelModal 
        isOpen={isAdminOpen}
        onClose={() => setIsAdminOpen(false)}
      />

      <UserProfileModal 
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        user={user}
        onLogin={handleLogin}
        onLogout={handleLogout}
        onUpdateUser={handleUpdateUser}
      />
    </div>
  );
}
