import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, User as UserIcon, LogOut, ChevronRight, Award, Flame } from 'lucide-react';
import type { User } from '../types';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onLogin: (name: string) => void;
  onLogout: () => void;
  onUpdateUser: (updates: Partial<User>) => void;
}

export function UserProfileModal({ isOpen, onClose, user, onLogin, onLogout, onUpdateUser }: UserProfileModalProps) {
  const [name, setName] = useState(user?.name || '');
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (user?.name) setName(user.name);
  }, [user]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onLogin(name.trim());
      onClose();
    }
  };

  const toggleAudio = () => {
    if (user && user.preferences) {
      onUpdateUser({ preferences: { ...user.preferences, immersiveAudio: !user.preferences.immersiveAudio } });
    }
  };

  const toggleReminders = () => {
    if (user && user.preferences) {
      const nextVal = !user.preferences.dailyReminders;
      if (nextVal && typeof window !== 'undefined' && 'Notification' in window) {
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            try {
              new Notification("Today's Fable", {
                body: "Glorious reminder set! We'll help you read a moral wisdom story every single day.",
              });
            } catch (err) {
              console.warn("Could not create instant welcome notification in context", err);
            }
          }
        });
      }
      onUpdateUser({ preferences: { ...user.preferences, dailyReminders: nextVal } });
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <React.Fragment>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-[80]"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[92%] max-w-[420px] bg-gradient-to-b from-[#111111] to-[#0A0A0A] border border-white/10 rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.5)] z-[90] overflow-hidden"
          >
            {/* Ambient Background Glow */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-amber-500/20 blur-[100px] rounded-full mix-blend-screen" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-indigo-500/10 blur-[100px] rounded-full mix-blend-screen" />
            </div>

            <div className="absolute top-4 right-4 z-[100]">
              <button 
                type="button" 
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClose(); }} 
                className="p-2 text-white/50 hover:text-white rounded-full bg-black/20 hover:bg-black/40 backdrop-blur-md border border-white/5 transition-colors"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-8 md:p-10 relative z-10 w-full overflow-y-auto max-h-[85vh] no-scrollbar">
              
              {user ? (
                <div className="flex flex-col items-center w-full">
                  <div className="flex items-center gap-2 text-amber-500 mb-8 opacity-80 bg-amber-500/10 px-4 py-1.5 rounded-full border border-amber-500/20">
                     <Sparkles size={14} />
                     <span className="text-[10px] font-bold tracking-[0.2em] uppercase">Premium Member</span>
                  </div>

                  <div className="relative mb-6 group">
                     {/* Outer animated ring */}
                     <div className="absolute inset-[-4px] rounded-full border border-amber-500/30 group-hover:border-amber-500/50 transition-colors animate-[spin_10s_linear_infinite]" />
                     <div className="w-24 h-24 rounded-full bg-gradient-to-br from-neutral-800 to-neutral-900 border border-white/10 flex items-center justify-center text-amber-500 font-serif text-4xl shadow-[0_0_30px_rgba(245,158,11,0.15)] relative z-10">
                       {user.name.charAt(0).toUpperCase()}
                     </div>
                  </div>
                  
                  <h3 className="text-2xl font-serif text-white mb-2">{user.name}</h3>
                  <p className="text-white/40 text-sm mb-8 text-center">Welcome back to your personal sanctuary of stories.</p>
                  
                  {/* Premium Stats Grid */}
                  <div className="grid grid-cols-2 gap-3 w-full mb-8">
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col items-center justify-center">
                      <span className="text-3xl font-serif text-white mb-1">{user.streak || 1}</span>
                      <span className="text-[10px] text-white/40 uppercase tracking-wider font-semibold">Day Streak</span>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col items-center justify-center">
                      <span className="text-3xl font-serif text-white mb-1">{user.storiesRead || 0}</span>
                      <span className="text-[10px] text-white/40 uppercase tracking-wider font-semibold">Stories Read</span>
                    </div>
                  </div>

                  {/* Wisdom level / XP tracker block */}
                  <div className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 mb-5 text-left relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-[#E3A03B]/5 blur-[20px] rounded-full" />
                    
                    <div className="flex justify-between items-center mb-3">
                      <div>
                        <p className="text-[10px] font-mono tracking-widest text-[#E3A03B] uppercase font-bold">Your Wisdom Path</p>
                        <h4 className="text-sm font-serif text-white mt-1 font-semibold">
                          Level {Math.floor((user.wisdomXp || 0) / 200) + 1} Scribe
                        </h4>
                      </div>
                      <span className="text-xs font-mono font-bold text-white/70 bg-white/10 px-2.5 py-1 rounded-full border border-white/5">
                        {user.wisdomXp || 0} XP
                      </span>
                    </div>
                    
                    <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden relative border border-white/5">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, (((user.wisdomXp || 0) % 200) / 2))}%` }}
                        transition={{ duration: 1, ease: 'easeOut' }}
                        className="h-full bg-gradient-to-r from-[#E3A03B] to-amber-400 rounded-full"
                      />
                    </div>
                    <div className="flex justify-between items-center mt-2 text-[10px] font-mono text-white/30">
                      <span>lvl {Math.floor((user.wisdomXp || 0) / 200) + 1}</span>
                      <span>{200 - ((user.wisdomXp || 0) % 200)} XP to next level</span>
                    </div>
                  </div>

                  {/* Achievements and Medallions Cabinet */}
                  <div className="w-full mb-8 text-left">
                    <p className="text-[10px] font-mono tracking-widest text-white/40 uppercase font-bold mb-3.5">Earned Wisdom Badges</p>
                    <div className="grid grid-cols-3 gap-2.5">
                      {[
                        { 
                          id: 'novice', 
                          title: 'First Scribe', 
                          desc: 'Earned 50 XP', 
                          icon: <Sparkles size={16} />, 
                          color: 'from-amber-500/20 to-orange-500/10 border-amber-500/30 text-amber-400' 
                        },
                        { 
                          id: 'scholar', 
                          title: 'Intellect', 
                          desc: 'Earned 150 XP', 
                          icon: <Award size={16} />, 
                          color: 'from-purple-500/20 to-indigo-500/10 border-indigo-500/30 text-indigo-400' 
                        },
                        { 
                          id: 'sages', 
                          title: '7 Day sage', 
                          desc: '7 Day Streak', 
                          icon: <Flame size={16} />, 
                          color: 'from-rose-500/20 to-red-500/10 border-rose-500/30 text-rose-400' 
                        }
                      ].map((badge) => {
                        const isUnlocked = user.unlockedBadges?.includes(badge.id) || 
                                           (badge.id === 'novice' && (user.wisdomXp || 0) >= 50) ||
                                           (badge.id === 'scholar' && (user.wisdomXp || 0) >= 150) ||
                                           (badge.id === 'sages' && (user.streak || 0) >= 7);

                        return (
                          <div 
                            key={badge.id}
                            className={`p-3 rounded-2xl border flex flex-col items-center justify-between text-center transition-all ${
                              isUnlocked 
                                ? `bg-gradient-to-b ${badge.color} shadow-lg scale-100`
                                : 'bg-white/5 border-white/[0.04] text-white/20 opacity-40'
                            }`}
                          >
                            <div className={`p-2 rounded-full mb-1.5 ${isUnlocked ? 'bg-black/30' : 'bg-white/5'}`}>
                              {badge.icon}
                            </div>
                            <div className="space-y-0.5">
                              <p className={`text-[10px] font-semibold tracking-tight ${isUnlocked ? 'text-white' : 'text-white/30'}`}>
                                {badge.title}
                              </p>
                              <p className="text-[8px] font-mono text-white/30 truncate max-w-[85px]">
                                {badge.desc}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Settings section */}
                  <div className="w-full space-y-2 mb-8">
                    <div 
                      className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5 cursor-pointer hover:bg-white/10 transition-colors"
                      onClick={toggleAudio}
                    >
                      <span className="text-sm font-medium text-white/80">Immersive Audio</span>
                      <div className={`w-10 h-6 rounded-full flex items-center p-1 transition-colors duration-300 ${user.preferences?.immersiveAudio ? 'bg-amber-500/20' : 'bg-white/10'}`}>
                        <div className={`w-4 h-4 rounded-full transition-transform duration-300 ${user.preferences?.immersiveAudio ? 'translate-x-4 bg-amber-500 shadow-sm' : 'translate-x-0 bg-white/40'}`} />
                      </div>
                    </div>
                    <div 
                      className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5 cursor-pointer hover:bg-white/10 transition-colors"
                      onClick={toggleReminders}
                    >
                      <span className="text-sm font-medium text-white/80">Daily Reminders</span>
                      <div className={`w-10 h-6 rounded-full flex items-center p-1 transition-colors duration-300 ${user.preferences?.dailyReminders ? 'bg-amber-500/20' : 'bg-white/10'}`}>
                        <div className={`w-4 h-4 rounded-full transition-transform duration-300 ${user.preferences?.dailyReminders ? 'translate-x-4 bg-amber-500 shadow-sm' : 'translate-x-0 bg-white/40'}`} />
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                        onLogout();
                        onClose();
                        setName('');
                    }}
                    className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 transition-all font-medium active:scale-[0.98]"
                  >
                    <LogOut size={18} />
                    Sign Out
                  </button>

                  <div className="mt-6 text-center">
                    <a href="/privacy-policy.html" target="_blank" rel="noopener noreferrer" className="text-[10px] text-white/40 hover:text-white/80 transition-colors uppercase tracking-wider">
                      Privacy Policy
                    </a>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="flex flex-col">
                  <div className="flex justify-center mb-6">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500/10 to-indigo-500/10 border border-white/10 flex items-center justify-center text-amber-400 shadow-[0_0_30px_rgba(245,158,11,0.1)] relative">
                      <div className="absolute inset-0 bg-white/5 rounded-2xl blur-sm" />
                      <Sparkles size={28} className="relative z-10" />
                    </div>
                  </div>

                  <h2 className="text-2xl md:text-3xl font-serif text-white mb-3 text-center">
                    Enter Today's Fable
                  </h2>
                  <p className="text-white/40 text-center text-sm md:text-base leading-relaxed mb-8 px-2">
                    Begin your personalized journey through daily tales of wonder and wisdom.
                  </p>

                  <div className="relative mb-8 group">
                    <div className={`absolute inset-0 bg-gradient-to-r from-amber-500/20 to-indigo-500/20 rounded-2xl blur-md transition-opacity duration-300 ${isFocused ? 'opacity-100' : 'opacity-0'}`} />
                    <div className="relative flex items-center bg-[#151515] border border-white/10 rounded-2xl overflow-hidden transition-all group-hover:border-white/20">
                      <div className="pl-5 text-white/30">
                         <UserIcon size={20} />
                      </div>
                      <input
                        type="text"
                        required
                        placeholder="What is your name?"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        onFocus={() => setIsFocused(true)}
                        onBlur={() => setIsFocused(false)}
                        className="w-full bg-transparent text-white px-4 py-4 md:py-5 focus:outline-none transition-colors placeholder:text-white/20 font-medium text-lg"
                      />
                    </div>
                  </div>
                  
                  <button
                    type="submit"
                    className="group relative w-full flex items-center justify-center gap-2 py-4 md:py-5 rounded-2xl bg-white text-black font-semibold text-lg hover:shadow-[0_0_40px_rgba(255,255,255,0.3)] transition-all active:scale-[0.98] overflow-hidden"
                  >
                    <span className="relative z-10 flex items-center gap-2">
                       Begin Journey 
                       <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
                    </span>
                    <div className="absolute inset-0 bg-gradient-to-r from-amber-100 to-indigo-100 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  </button>
                  
                  <div className="flex flex-col items-center gap-2 mt-6">
                    <p className="text-center text-[11px] text-white/30 font-medium tracking-wide uppercase">
                      A Premium Reading Experience
                    </p>
                    <a href="/privacy-policy.html" target="_blank" rel="noopener noreferrer" className="text-[10px] text-white/40 hover:text-white/80 transition-colors uppercase tracking-wider">
                      Privacy Policy
                    </a>
                  </div>
                </form>
              )}
            </div>
          </motion.div>
        </React.Fragment>
      )}
    </AnimatePresence>
  );
}
