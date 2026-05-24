import React from 'react';
import { motion } from 'framer-motion';
import { Home, Library, User as UserIcon } from 'lucide-react';
import type { User } from '../types';
import { triggerHaptic } from '../utils';

interface BottomNavProps {
  activeTab: 'today' | 'library' | 'profile';
  onTabChange: (tab: 'today' | 'library' | 'profile') => void;
  user: User | null;
  onAdminTrigger?: () => void;
  hidden?: boolean;
}

export function BottomNav({ activeTab, onTabChange, user, onAdminTrigger, hidden }: BottomNavProps) {
  const tabs = [
    { id: 'today', icon: Home, label: 'Daily' },
    { id: 'library', icon: Library, label: 'Archive' },
  ];

  const [tapCount, setTapCount] = React.useState(0);
  const [lastTapTime, setLastTapTime] = React.useState(0);

  const handleTabClick = (id: 'today' | 'library' | 'profile') => {
    triggerHaptic('light');
    
    if (id === 'today' && activeTab === 'today') {
      const now = Date.now();
      if (now - lastTapTime < 400) {
        const newCount = tapCount + 1;
        setTapCount(newCount);
        if (newCount >= 4) { // 1 initial + 4 quick subsequent taps = 5 total
          if (onAdminTrigger) onAdminTrigger();
          triggerHaptic('heavy');
          setTapCount(0);
        }
      } else {
        setTapCount(0);
      }
      setLastTapTime(now);
    } else {
      setTapCount(0);
    }

    onTabChange(id);
  };

  return (
    <div className={`fixed bottom-0 w-full z-50 px-4 pt-4 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] bg-gradient-to-t from-black via-black/90 to-transparent transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${hidden ? 'translate-y-full opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'}`}>
      <div className="max-w-md mx-auto flex items-center justify-between px-6 py-3 bg-[#111111]/80 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id as 'today' | 'library')}
              className="flex flex-col items-center gap-1 p-2 relative text-white"
            >
              {isActive && (
                <motion.div
                  layoutId="bottom-nav-indicator"
                  className="absolute inset-0 bg-white/10 rounded-2xl z-0"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <Icon size={24} className={`relative z-10 transition-colors ${isActive ? 'text-white' : 'text-white/40'}`} strokeWidth={isActive ? 2 : 1.5} />
            </button>
          );
        })}

        {/* Profile Tab */}
        <button
          onClick={() => handleTabClick('profile')}
          className="flex flex-col items-center gap-1 p-2 relative text-white"
        >
          {activeTab === 'profile' && (
            <motion.div
              layoutId="bottom-nav-indicator"
              className="absolute inset-0 bg-white/10 rounded-2xl z-0"
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            />
          )}
          {user ? (
            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-[10px] font-bold relative z-10 ${activeTab === 'profile' ? 'border-white bg-white text-black' : 'border-white/40 text-white/40 bg-transparent'}`}>
              {user.name.charAt(0).toUpperCase()}
            </div>
          ) : (
            <UserIcon size={24} className={`relative z-10 transition-colors ${activeTab === 'profile' ? 'text-white' : 'text-white/40'}`} strokeWidth={activeTab === 'profile' ? 2 : 1.5} />
          )}
        </button>
      </div>
    </div>
  );
}
