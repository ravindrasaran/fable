import React from 'react';
import { Sparkles, Languages } from 'lucide-react';
import type { Language, User } from '../types';

interface TopBarProps {
  language: Language;
  onLanguageChange: (lang: Language) => void;
  dateText: string;
  hidden?: boolean;
}

export function TopBar({ language, onLanguageChange, dateText, hidden }: TopBarProps) {
  return (
    <div className={`w-full h-16 flex items-center justify-between px-4 sm:px-6 absolute top-0 z-50 bg-gradient-to-b from-[#050505] to-transparent transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${hidden ? '-translate-y-full opacity-0' : 'translate-y-0 opacity-100'}`}>
      
      <div className="flex items-center gap-2">
        <Sparkles size={16} className="text-amber-500/80" />
        <span className="font-serif italic text-white/90 font-medium tracking-wide text-lg whitespace-nowrap">{dateText}</span>
      </div>

      <button 
        onClick={() => onLanguageChange(language === 'en' ? 'hi' : 'en')}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 backdrop-blur-md border border-white/10 active:scale-95 transition-all text-white/80 hover:text-white"
      >
        <Languages size={14} />
        <span className="text-xs font-medium uppercase tracking-wider">{language}</span>
      </button>
    </div>
  );
}
