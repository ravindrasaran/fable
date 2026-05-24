import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Heart, Share2, MessageCircleHeart, Settings2, Headphones, Waves, Minus, Plus, Volume2, 
  VolumeX, Clock, AlignLeft, ChevronLeft, ChevronRight, Calendar, Award, Sparkles, 
  AlertCircle, Quote, Palette, Check, Copy, HeartHandshake, Flame, X, Lock
} from 'lucide-react';
import type { Story, User } from '../types';
import { triggerHaptic, estimateReadingTime, toggleAmbientNoise } from '../utils';

interface StoryViewerProps {
  story: Story | null;
  isLoading: boolean;
  dateKey: string;
  language: string;
  onScrollStateChange?: (isScrollingDown: boolean) => void;
  user?: User | null;
  onStoryRead?: (dateStr: string) => void;
  onPrevDay?: () => void;
  onNextDay?: () => void;
  isToday?: boolean;
  onUpdateUser?: (updates: Partial<User>) => void;
  onLoginTrigger?: () => void;
}

export function StoryViewer({ 
  story, isLoading, dateKey, language, onScrollStateChange, 
  user, onStoryRead, onPrevDay, onNextDay, isToday, onUpdateUser,
  onLoginTrigger
}: StoryViewerProps) {
  const [liked, setLiked] = useState(false);
  const [fontSize, setFontSize] = useState(1.125); // base 1.125rem = 18px equivalent commonly
  const [lineHeight, setLineHeight] = useState(1.8);
  const [progress, setProgress] = useState(0);
  const [showTools, setShowTools] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isAmbientOn, setIsAmbientOn] = useState(false);
  const lastScrollY = useRef(0);
  const cancelSpeech = useRef(false);
  const readLogged = useRef(false);

  // Game States
  const [activeQuizStep, setActiveQuizStep] = useState<'idle' | 'q1' | 'q2' | 'completed' | 'failed'>('idle');
  const [selectedAns1, setSelectedAns1] = useState<number | null>(null);
  const [selectedAns2, setSelectedAns2] = useState<number | null>(null);
  const [confettiActive, setConfettiActive] = useState(false);

  useEffect(() => {
    readLogged.current = false;
    cancelSpeech.current = true;
    window.speechSynthesis?.cancel();
    setIsSpeaking(false);
    
    // Reset or Load Game Mechanics on Fable Change to enforce single attempt daily
    const quizStatusKey = `fable_quiz_status_${dateKey}_${user?.name || 'guest'}`;
    const savedStatus = localStorage.getItem(quizStatusKey);
    if (savedStatus === 'completed') {
      setActiveQuizStep('completed');
    } else if (savedStatus === 'failed') {
      setActiveQuizStep('failed');
    } else {
      setActiveQuizStep('idle');
    }
    
    setSelectedAns1(null);
    setSelectedAns2(null);
    setConfettiActive(false);
  }, [story, language, dateKey, user]);

  useEffect(() => {
    return () => {
      window.speechSynthesis?.cancel();
      toggleAmbientNoise(false);
    };
  }, []);

  React.useEffect(() => {
    const likes = JSON.parse(localStorage.getItem('lumina_likes') || '{}');
    setLiked(!!likes[dateKey]);
    
    const savedSize = localStorage.getItem('lumina_fontsize');
    if (savedSize) setFontSize(parseFloat(savedSize));
  }, [dateKey]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    const { scrollTop, scrollHeight, clientHeight } = target;
    const scrollMax = scrollHeight - clientHeight;
    let currentProgress = 0;
    if (scrollMax > 0) {
      currentProgress = (scrollTop / scrollMax) * 100;
      setProgress(currentProgress);
    } else {
      setProgress(0);
      currentProgress = 100; // If it's too short, it's 100%
    }
    
    if (currentProgress > 80 && !readLogged.current && onStoryRead) {
      readLogged.current = true;
      onStoryRead(dateKey);
    }
    
    if (onScrollStateChange) {
      if (scrollTop > lastScrollY.current + 5 && scrollTop > 80) {
        onScrollStateChange(true);
        lastScrollY.current = scrollTop;
      } else if (scrollTop < lastScrollY.current - 5) {
        onScrollStateChange(false);
        lastScrollY.current = scrollTop;
      }
    }
  };

  const handleAnswerSubmit = (questionNumber: 1 | 2, selectedIndex: number) => {
    const quizStatusKey = `fable_quiz_status_${dateKey}_${user?.name || 'guest'}`;
    const currentSavedStatus = localStorage.getItem(quizStatusKey);
    if (currentSavedStatus === 'completed' || currentSavedStatus === 'failed') {
      return;
    }

    if (questionNumber === 1) {
      setSelectedAns1(selectedIndex);
      if (selectedIndex === 1) {
        triggerHaptic('success');
        setTimeout(() => {
          setActiveQuizStep('q2');
        }, 1200);
      } else {
        triggerHaptic('error');
      }
    } else {
      setSelectedAns2(selectedIndex);
      if (selectedIndex === 1) {
        triggerHaptic('success');
        setConfettiActive(true);
        setTimeout(() => setConfettiActive(false), 5000);
        
        // Save as completed in localStorage to prevent repeated reward claims
        localStorage.setItem(quizStatusKey, 'completed');
        
        // Award 50 Wisdom XP points & verify achievements
        if (onUpdateUser && user) {
          const currentXp = user.wisdomXp || 0;
          const currentUnlocks = user.unlockedBadges || [];
          const newXp = currentXp + 50;
          
          let updatedUnlocks = [...currentUnlocks];
          if (newXp >= 50 && !updatedUnlocks.includes('novice')) {
            updatedUnlocks.push('novice');
          }
          if (newXp >= 150 && !updatedUnlocks.includes('scholar')) {
            updatedUnlocks.push('scholar');
          }
          if (user.streak && user.streak >= 7 && !updatedUnlocks.includes('sages')) {
            updatedUnlocks.push('sages');
          }
          
          onUpdateUser({
            wisdomXp: newXp,
            unlockedBadges: updatedUnlocks
          });
        }
        
        setTimeout(() => {
          setActiveQuizStep('completed');
        }, 1200);
      } else {
        triggerHaptic('error');
      }
    }
  };

  const handleLike = () => {
    triggerHaptic('medium');
    const newLiked = !liked;
    setLiked(newLiked);
    
    try {
      const likes = JSON.parse(localStorage.getItem('lumina_likes') || '{}');
      const savedStories = JSON.parse(localStorage.getItem('lumina_saved_stories') || '{}');
      
      if (newLiked && story) {
        likes[dateKey] = true;
        savedStories[dateKey] = { ...story, dateKey };
      } else {
        delete likes[dateKey];
        delete savedStories[dateKey];
      }
      
      localStorage.setItem('lumina_likes', JSON.stringify(likes));
      localStorage.setItem('lumina_saved_stories', JSON.stringify(savedStories));
    } catch (e) {
      console.error(e);
    }
  };

  const adjustFontSize = (delta: number) => {
    triggerHaptic('light');
    setFontSize(prev => {
      const newSize = Math.max(0.8, Math.min(prev + delta, 1.8));
      localStorage.setItem('lumina_fontsize', newSize.toString());
      return newSize;
    });
  };

  const toggleLineHeight = () => {
    triggerHaptic('light');
    setLineHeight(prev => prev === 1.8 ? 2.2 : prev === 2.2 ? 1.5 : 1.8);
  };

  const toggleSpeech = () => {
    triggerHaptic('medium');
    if (isSpeaking) {
      cancelSpeech.current = true;
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    } else {
      if (!story) return;
      cancelSpeech.current = false;
      window.speechSynthesis.cancel();

      const fullText = `${story.title}. . ${story.content} . . The moral of the story: ${story.moral}`;
      const sentences = fullText.match(/[^.!?]+[.!?]+/g) || [fullText];
      
      let currentIndex = 0;
      setIsSpeaking(true);

      const speakNext = () => {
        if (cancelSpeech.current) return;

        if (currentIndex < sentences.length) {
          const textToSpeak = sentences[currentIndex].trim();
          if (!textToSpeak) {
             currentIndex++;
             speakNext();
             return;
          }
          
          const utterance = new SpeechSynthesisUtterance(textToSpeak);
          utterance.rate = language === 'hi' ? 0.85 : 0.95;
          utterance.lang = language === 'hi' ? 'hi-IN' : 'en-US';
          
          utterance.onend = () => {
             currentIndex++;
             speakNext();
          };
          
          utterance.onerror = () => {
             if (!cancelSpeech.current) {
                currentIndex++;
                speakNext();
             }
          };

          window.speechSynthesis.speak(utterance);
        } else {
          setIsSpeaking(false);
        }
      };

      speakNext();
    }
  };

  const handleShare = async () => {
    if (!story) return;
    
    const shareData = {
      title: story.title,
      text: `Read today's majestic story on Today's Fable:\n\n${story.title}\n\nMoral: ${story.moral}\n\n`,
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(`${shareData.text} ${shareData.url}`);
        alert('Story link copied to clipboard!');
      }
    } catch (err) {
      console.error('Error sharing:', err);
    }
  };

  const formattedContent = React.useMemo(() => {
    if (!story?.content) return [];
    return story.content.split('\n').filter(p => p.trim() !== '');
  }, [story?.content]);

  return (
    <div 
      className="w-full flex-1 relative flex flex-col h-full overflow-y-auto no-scrollbar scroll-smooth story-content"
      onScroll={handleScroll}
    >
      {/* Progress Bar */}
      {!isLoading && story && (
        <div className="fixed top-14 left-0 w-full h-[2px] bg-white/5 z-40">
          <motion.div 
            className="h-full bg-gradient-to-r from-amber-500/50 to-amber-400"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Floating Tools */}
      {!isLoading && story && (
        <div className="fixed bottom-[calc(8rem+env(safe-area-inset-bottom,0px))] right-4 md:right-8 z-40 flex flex-col items-end gap-3 pointer-events-none">
          <AnimatePresence>
            {showTools && (
              <motion.div 
                initial={{ opacity: 0, y: 10, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                className="bg-[#1C1C1E]/90 backdrop-blur-xl border border-white/10 rounded-2xl p-2 flex flex-col gap-2 pointer-events-auto"
              >
                <button onClick={() => adjustFontSize(0.1)} className="p-3 text-white/70 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-colors active:scale-95">
                  <Plus size={20} />
                </button>
                <button onClick={() => adjustFontSize(-0.1)} className="p-3 text-white/70 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-colors active:scale-95">
                  <Minus size={20} />
                </button>
                <div className="w-8 h-px bg-white/10 mx-auto my-1" />
                <button onClick={toggleLineHeight} className="p-3 text-white/70 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-colors active:scale-95">
                  <AlignLeft size={20} />
                </button>
                <div className="w-8 h-px bg-white/10 mx-auto my-1" />
                <button 
                  onClick={() => {
                      triggerHaptic('medium');
                      const nextState = !isAmbientOn;
                      setIsAmbientOn(nextState);
                      toggleAmbientNoise(nextState);
                  }} 
                  className={`p-3 rounded-xl transition-colors active:scale-95 ${isAmbientOn ? 'bg-indigo-500/20 text-indigo-300' : 'bg-white/5 hover:bg-white/10 text-white/70 hover:text-white'}`}
                >
                  {isAmbientOn ? <Headphones size={20} /> : <Waves size={20} />}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
          <button 
            onClick={() => setShowTools(!showTools)}
            className="p-4 rounded-full bg-[#1C1C1E]/90 backdrop-blur-xl border border-white/10 text-white/80 hover:text-white shadow-xl pointer-events-auto active:scale-95 transition-all"
          >
            <Settings2 size={20} />
          </button>
        </div>
      )}

      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col items-center justify-center space-y-6 min-h-[80vh]"
          >
             <div className="w-16 h-16 border-2 border-white/10 border-t-white rounded-full animate-spin" />
             <p className="text-white/50 font-serif italic text-xl tracking-wide">
               Summoning the lore...
             </p>
          </motion.div>
        ) : story ? (
          <motion.div
            key="story"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-2xl mx-auto flex flex-col min-h-screen px-6 pt-16 pb-[calc(10rem+env(safe-area-inset-bottom,0px))]"
          >
            {/* Story Header */}
            <div className="mb-8">
              <motion.span 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="inline-block px-3 py-1 bg-white/5 border border-white/10 rounded-full text-white/70 text-xs font-semibold tracking-[0.2em] uppercase mb-6"
              >
                {story.category}
              </motion.span>
              <motion.h1 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="font-serif text-4xl md:text-5xl text-white font-medium leading-[1.1] mb-6 text-shadow-premium"
              >
                {story.title}
              </motion.h1>
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="flex items-center gap-2 text-white/40 mb-6 font-sans border border-white/5 bg-white/5 inline-flex px-3 py-1.5 rounded-full"
              >
                <Clock size={16} />
                <span className="text-sm tracking-wide">{estimateReadingTime(story.content)} min read</span>
              </motion.div>
              <motion.div 
                initial={{ opacity: 0, scaleX: 0 }}
                animate={{ opacity: 1, scaleX: 1 }}
                transition={{ delay: 0.5, duration: 0.8 }}
                className="w-16 h-px bg-white/30 origin-left" 
              />
            </div>

            {/* Story Content */}
            <div 
               className="space-y-6 text-white/80 leading-relaxed font-sans font-light story-content pb-4"
               style={{ fontSize: `${fontSize}rem`, lineHeight: lineHeight }}
            >
              {formattedContent.map((paragraph, idx) => (
                <motion.p 
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.7, delay: idx * 0.05, ease: [0.16, 1, 0.3, 1] }}
                  className="first-letter:text-[3em] first-letter:font-serif first-letter:float-left first-letter:mr-4 first-letter:leading-[0.8] first-letter:text-white"
                >
                  {paragraph}
                </motion.p>
              ))}
            </div>

            {/* Moral Card */}
            <motion.div 
               initial={{ opacity: 0, scale: 0.95 }}
               animate={{ opacity: 1, scale: 1 }}
               transition={{ duration: 0.8, delay: 0.3 }}
               className="mt-6 p-6 sm:p-8 rounded-[2rem] bg-gradient-to-br from-white/10 to-white/5 border border-white/10 backdrop-blur-md relative h-auto"
            >
               <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-white/50 to-transparent opacity-50" />
               <div className="flex items-center gap-3 mb-4">
                 <MessageCircleHeart size={20} className="text-white/60" />
                 <span className="text-white/60 font-semibold text-xs tracking-[0.15em] uppercase">The Lesson</span>
               </div>
               <p className="font-serif text-lg md:text-xl text-white/90 italic leading-relaxed font-medium">
                  "{story.moral || "True fulfillment comes from within and sharing light with others."}"
               </p>
            </motion.div>

            {/* Interactive Wisdom Quest */}
            {story && (
              <motion.div 
                layout
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35, duration: 0.8 }}
                className="mt-8 p-6 sm:p-8 rounded-[2rem] border border-white/10 bg-[#0A0A0F] relative overflow-visible text-left shadow-2xl h-auto min-h-max"
                id="interactive-wisdom-quest-view"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-[40px] rounded-full pointer-events-none" />
                
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2.5">
                     <Award size={18} className="text-[#E3A03B]" />
                     <span className="text-[10px] sm:text-xs font-bold tracking-[0.15em] uppercase text-white/50">Daily Wisdom Quest</span>
                  </div>
                  {user && (
                    <div className="flex items-center gap-1 bg-[#E3A03B]/10 px-3 py-1 rounded-full border border-[#E3A03B]/20">
                      <Sparkles size={11} className="text-[#E3A03B] animate-pulse" />
                      <span className="text-[10px] font-mono font-bold text-[#E3A03B]">{user.wisdomXp || 0} XP</span>
                    </div>
                  )}
                </div>

                <AnimatePresence mode="wait">
                  {!user ? (
                    <motion.div 
                      key="login-gate"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.3 }}
                      className="text-center py-4 space-y-4"
                    >
                      <div className="relative mx-auto w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                        <Lock size={28} className="text-amber-500 animate-pulse" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="font-serif text-xl text-white font-medium">
                          {language === 'hi' ? 'बुद्धि का परीक्षण (लॉगिन आवश्यक)' : 'Enlightenment Quest Locked'}
                        </h4>
                        <p className="text-[10px] text-amber-500 font-mono tracking-widest font-bold uppercase">
                          {language === 'hi' ? 'लॉगिन करना आवश्यक है' : "authentication required"}
                        </p>
                      </div>
                      <p className="text-sm text-white/50 max-w-xs mx-auto leading-relaxed whitespace-normal break-words">
                        {language === 'hi' 
                          ? 'सत्य मार्ग की इस पवित्र प्रश्नोत्तरी में भाग लेने और ५० विज्डम एक्सपी (XP) पुरस्कार अर्जित करने के लिए कृपया अपना नाम दर्ज कर प्रवेश करें।'
                          : 'This daily wisdom test and its rewarded +50 Wisdom XP points are reserved for logged-in seekers. Please login or enter your name to unlock tonight\'s insights.'}
                      </p>
                      
                      {onLoginTrigger && (
                        <button
                          onClick={() => { triggerHaptic('medium'); onLoginTrigger(); }}
                          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-white hover:bg-neutral-100 text-black font-semibold text-xs tracking-wider uppercase transition-all duration-300 active:scale-95 cursor-pointer max-w-xs mx-auto"
                        >
                          <Sparkles size={14} className="text-amber-500" />
                          <span>{language === 'hi' ? 'साधकरूप में लॉगिन करें' : 'Login to Answer'}</span>
                        </button>
                      )}
                    </motion.div>
                  ) : activeQuizStep === 'idle' && (
                    <motion.div 
                      key="idle"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.3 }}
                      className="space-y-4"
                    >
                      <h4 className="font-serif text-xl text-white font-medium">Verify Your Enlightenment</h4>
                      <p className="text-sm text-white/50 leading-relaxed font-light whitespace-normal break-words">
                        {language === 'hi'
                          ? 'आज की इस पावन कथा के रहस्यों को क्या आपने आत्मसात किया है? अपनी आंतरिक बुद्धि को जाग्रत करें और २ छोटे प्रश्नों के उत्तर दें!'
                          : 'Have you fully absorbed the timeless essence of today\'s tale? Test your intuition to earn +50 Wisdom XP points!'}
                      </p>
                      <button 
                        onClick={() => { triggerHaptic('medium'); setActiveQuizStep('q1'); }}
                        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-white hover:bg-neutral-100 text-black font-semibold text-xs tracking-wider uppercase transition-all duration-300 active:scale-95 cursor-pointer"
                      >
                        <Sparkles size={14} className="animate-spin text-indigo-500" />
                        <span>{language === 'hi' ? 'बुद्धि का परीक्षण आरंभ करें' : 'Initiate Wisdom Quiz'}</span>
                      </button>
                    </motion.div>
                  )}

                  {activeQuizStep === 'q1' && (
                    <motion.div 
                      key="q1"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.3 }}
                      className="space-y-4"
                    >
                      <div className="flex justify-between items-center text-[10px] font-mono tracking-widest text-[#E3A03B] uppercase">
                        <span>Question 1 of 2</span>
                        <span className="text-white/30">Theme Alignment</span>
                      </div>
                      <h4 className="font-serif text-lg text-white font-medium leading-snug whitespace-normal break-words">
                        {language === 'hi' 
                          ? `इस शुभ कथा "${story.title}" के केंद्र में किस सत्य या सीख की खोज की गई है?`
                          : `At the heart of today's category, "${story.category}", what core wisdom does "${story.title}" demonstrate?`}
                      </h4>
                      <div className="space-y-2.5 pt-2">
                        {[
                        language === 'hi' 
                          ? ["बाहरी सफलता और भौतिक वस्तुओं का संचय।", "धैर्य, आंतरिक शांति, और सुंदर आत्म-साक्षात्कार की शक्ति।", "दूसरों से स्वयं की तुलना करके दुखी रहना।", "चमत्कारों के सहारे जीवन व्यतीत करना।"]
                          : [
                              "Conquering external competitors by sheer force and raw ambition.",
                              "The power of patience, presence, and realizing one's unique inner magic.",
                              "Waiting for others to step forward and fix our personal challenges.",
                              "Discovering a fast physical shortcut to completely bypass hardships."
                            ]
                      ][0].map((opt, i) => {
                        const isCorrect = i === 1;
                        const isSelected = selectedAns1 === i;
                        return (
                          <button
                            key={i}
                            disabled={selectedAns1 !== null}
                            onClick={() => handleAnswerSubmit(1, i)}
                            className={`w-full text-left p-4 rounded-xl border text-xs sm:text-sm font-light leading-relaxed transition-all active:scale-[0.99] h-auto whitespace-normal break-words flex items-start gap-3 ${
                              selectedAns1 === null 
                                ? 'bg-white/5 border-white/10 text-white/80 hover:bg-white/10 hover:border-white/20' 
                                : isSelected 
                                  ? isCorrect 
                                    ? 'bg-emerald-500/15 border-emerald-500 text-emerald-300' 
                                    : 'bg-rose-500/15 border-rose-500 text-rose-300'
                                  : isCorrect 
                                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300' 
                                    : 'bg-white/[0.02] border-white/5 opacity-40 text-white/50'
                            }`}
                          >
                            <span className="font-mono text-[#E3A03B] font-semibold mt-[2px]">{String.fromCharCode(65 + i)}.</span>
                            <span className="flex-1 text-left whitespace-normal break-words leading-relaxed text-white/95">{opt}</span>
                          </button>
                        );
                      })}
                    </div>

                    {selectedAns1 !== null && selectedAns1 !== 1 && (
                      <motion.div 
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="pt-4 flex flex-col items-center gap-3 border-t border-white/5 mt-4"
                      >
                        <p className="text-xs text-rose-400 font-sans leading-relaxed text-center">
                          {language === 'hi' 
                            ? 'ग़लत उत्तर। इस पावन कथा के केंद्रीय विचार पर पुनः विचार करें।' 
                            : 'Incorrect understanding. Re-examine the fable\'s central idea.'}
                        </p>
                        <button
                          onClick={() => { triggerHaptic('light'); setSelectedAns1(null); }}
                          className="px-6 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-medium text-xs tracking-wider uppercase transition-all duration-300 active:scale-95 cursor-pointer border border-white/10"
                        >
                          {language === 'hi' ? 'फिर से प्रयास करें' : 'Try Again'}
                        </button>
                      </motion.div>
                    )}
                  </motion.div>
                )}

                {activeQuizStep === 'q2' && (
                  <motion.div 
                    key="q2"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-4"
                  >
                    <div className="flex justify-between items-center text-[10px] font-mono tracking-widest text-[#E3A03B] uppercase">
                      <span>Question 2 of 2</span>
                      <span className="text-white/30">Action Integration</span>
                    </div>
                    <h4 className="font-serif text-lg text-white font-medium leading-snug whitespace-normal break-words">
                      {language === 'hi' 
                        ? `आज के संदेश "${story.moral}" को आप अपने जीवन में कैसे आत्मसात करेंगे?`
                        : `Today's moral is: "${story.moral}". How can you practically weave this lesson into your actions?`}
                    </h4>
                    <div className="space-y-2.5 pt-2">
                      {[
                        language === 'hi' 
                          ? ["संकल्प को केवल दूसरों पर थोपकर स्वयं निष्क्रिय रहना।", "सचेत रहते हुए सदिच्छा, प्रेम और सेवा का एक छोटा सा कार्य करना।", "यह मानना कि नैतिक सिद्धांत केवल पुरानी कहानियों तक ही सीमित हैं।", "अपने स्वार्थ की रक्षा के लिए दूसरों के अधिकारों की उपेक्षा करना।"]
                          : [
                              "By passive waiting, expecting circumstances or people to adapt on their own.",
                              "By practicing deliberate presence and showing a sincere act of kindness or support.",
                              "By thinking this beautiful fable only represents fantasy or historical fables.",
                              "By keeping our focus strictly on dynamic self-interest and avoiding duties."
                            ]
                      ][0].map((opt, i) => {
                        const isCorrect = i === 1;
                        const isSelected = selectedAns2 === i;
                        return (
                          <button
                            key={i}
                            disabled={selectedAns2 !== null}
                            onClick={() => handleAnswerSubmit(2, i)}
                            className={`w-full text-left p-4 rounded-xl border text-xs sm:text-sm font-light leading-relaxed transition-all active:scale-[0.99] h-auto whitespace-normal break-words flex items-start gap-3 ${
                              selectedAns2 === null 
                                ? 'bg-white/5 border-white/10 text-white/80 hover:bg-white/10 hover:border-white/20' 
                                : isSelected 
                                  ? isCorrect 
                                    ? 'bg-emerald-500/15 border-emerald-500 text-emerald-300' 
                                    : 'bg-rose-500/15 border-rose-500 text-rose-300'
                                  : isCorrect 
                                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300' 
                                    : 'bg-white/[0.02] border-white/5 opacity-40 text-white/50'
                            }`}
                          >
                            <span className="font-mono text-[#E3A03B] font-semibold mt-[2px]">{String.fromCharCode(65 + i)}.</span>
                            <span className="flex-1 text-left whitespace-normal break-words leading-relaxed text-white/95">{opt}</span>
                          </button>
                        );
                      })}
                    </div>
                    
                    {selectedAns2 !== null && selectedAns2 !== 1 && (
                      <motion.div 
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="pt-4 flex flex-col items-center gap-3 border-t border-white/5 mt-4"
                      >
                        <p className="text-xs text-rose-400 font-sans leading-relaxed text-center">
                          {language === 'hi' 
                            ? 'यह विकल्प सत्य मार्ग नहीं है। नैतिक मूल्य को जीवन में ढालने पर फिर से सोचें।' 
                            : 'This choice is not the true path. Reflect again on living this moral.'}
                        </p>
                        <button
                          onClick={() => { triggerHaptic('light'); setSelectedAns2(null); }}
                          className="px-6 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-medium text-xs tracking-wider uppercase transition-all duration-300 active:scale-95 cursor-pointer border border-white/10"
                        >
                          {language === 'hi' ? 'फिर से प्रयास करें' : 'Try Again'}
                        </button>
                      </motion.div>
                    )}
                  </motion.div>
                )}

                  {activeQuizStep === 'completed' && (
                    <motion.div 
                      key="completed"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      className="text-center py-4 space-y-4"
                    >
                      <div className="relative mx-auto w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                        <Sparkles size={28} className="animate-bounce text-[#E3A03B]" />
                        {confettiActive && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            {[...Array(8)].map((_, j) => (
                              <motion.div
                                key={j}
                                className="absolute w-2 h-2 bg-[#E3A03B] rounded-full"
                                animate={{ 
                                  x: [0, (j % 2 === 0 ? 1 : -1) * (20 + j * 10)], 
                                  y: [0, -30 - j * 8], 
                                  opacity: [1, 0] 
                                }}
                                transition={{ duration: 1.5, repeat: Infinity, delay: j * 0.1 }}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="space-y-1">
                        <h4 className="font-serif text-2xl text-white font-medium">{language === 'hi' ? 'परम संबोधि जाग्रत!' : 'Wisdom Unlocked!'}</h4>
                        <p className="text-xs text-emerald-400 font-mono tracking-widest font-bold uppercase">+50 wisdom xp credited</p>
                      </div>
                      <p className="text-sm text-white/40 max-w-xs mx-auto leading-relaxed whitespace-normal break-words">
                        {language === 'hi' 
                          ? 'अद्भुत! आपकी आंतरिक अंतर्दृष्टि ने आज की इस नैतिक सीख को पूर्ण रूप से ग्रहण कर लिया है।'
                          : 'Marvelous insight! Your intuitive heart has successfully absorbed the lessons of today\'s fable.'}
                      </p>
                    </motion.div>
                  )}

                  {activeQuizStep === 'failed' && (
                    <motion.div 
                      key="failed"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      className="text-center py-4 space-y-4"
                    >
                      <div className="relative mx-auto w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                        <AlertCircle size={28} className="text-rose-500" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="font-serif text-2xl text-white font-medium">
                          {language === 'hi' ? 'उत्तर त्रुटीपूर्ण है!' : 'Misunderstood Essence'}
                        </h4>
                        <p className="text-xs text-rose-400 font-mono tracking-widest font-bold uppercase">
                          {language === 'hi' ? 'आज का परीक्षण समाप्त' : "today's quest closed"}
                        </p>
                      </div>
                      <p className="text-sm text-white/40 max-w-xs mx-auto leading-relaxed whitespace-normal break-words">
                        {language === 'hi' 
                          ? 'आज का उत्तर सही नहीं था। आप केवल एक बार प्रयास कर सकते हैं। अब अगले दिन की पावन कथा से आंतरिक प्रकाश प्राप्त करें।'
                          : 'You missed the essence of today\'s fables moral. To keep rewards fair, only one attempt is permitted daily. Seek enlightenment from tomorrow\'s fable.'}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}

            {/* Action Bar */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="mt-12 mb-8 flex flex-wrap justify-center gap-4 sm:gap-6"
            >
              <button 
                onClick={handleLike}
                className="flex flex-col items-center gap-2 group"
              >
                <div className={`w-11 h-11 rounded-full flex items-center justify-center transition-all duration-300 active:scale-90 ${liked ? 'bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.2)]' : 'bg-white/5 border border-white/10 text-white/70 group-hover:bg-white/10 group-hover:text-white'}`}>
                  <Heart size={18} className={liked ? "fill-black" : ""} />
                </div>
                <span className={`text-[10px] font-semibold tracking-[0.15em] uppercase transition-colors ${liked ? 'text-white' : 'text-white/40 group-hover:text-white/70'}`}>
                  {liked ? 'Endeared' : 'Endear'}
                </span>
              </button>

              <button
                onClick={toggleSpeech}
                className="flex flex-col items-center gap-2 group"
              >
                <div className={`w-11 h-11 rounded-full flex items-center justify-center transition-all duration-300 active:scale-90 ${isSpeaking ? 'bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.2)]' : 'bg-white/5 border border-white/10 text-white/70 group-hover:bg-white/10 group-hover:text-white'}`}>
                  {isSpeaking ? <VolumeX size={18} /> : <Volume2 size={18} />}
                </div>
                <span className={`text-[10px] font-semibold tracking-[0.15em] uppercase transition-colors ${isSpeaking ? 'text-white' : 'text-white/40 group-hover:text-white/70'}`}>
                  {isSpeaking ? 'Stop' : 'Listen'}
                </span>
              </button>

              <button
                onClick={handleShare}
                className="flex flex-col items-center gap-2 group"
              >
                <div className="w-11 h-11 rounded-full flex items-center justify-center bg-white/5 border border-white/10 text-white/70 transition-all duration-300 active:scale-90 group-hover:bg-white/10 group-hover:text-white">
                  <Share2 size={18} />
                </div>
                <span className="text-[10px] font-semibold tracking-[0.15em] uppercase text-white/40 group-hover:text-white/70 transition-colors">
                  Share
                </span>
              </button>
            </motion.div>

            {/* Date Navigation Archive */}
            <motion.div
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: 0.6, duration: 0.6 }}
               className="mt-6 pt-8 border-t border-white/10 flex flex-col items-center"
            >
               <div className="flex items-center gap-2 text-white/50 mb-6">
                 <Calendar size={14} />
                 <span className="text-[10px] tracking-[0.2em] font-semibold uppercase">Past Fables Archive</span>
               </div>
               
               <div className="flex w-full items-center justify-between gap-4 bg-white/5 p-2 rounded-full border border-white/5 backdrop-blur-md">
                 <button 
                   onClick={onPrevDay} 
                   className="flex items-center gap-2 px-4 py-3 rounded-full hover:bg-white/10 transition-colors active:scale-95 text-white/60 hover:text-white"
                 >
                   <ChevronLeft size={16} />
                   <span className="text-xs font-medium tracking-wider uppercase">Previous</span>
                 </button>
                 
                 <div className="w-px h-6 bg-white/10"></div>
                 
                 <button 
                   onClick={onNextDay} 
                   disabled={isToday}
                   className={`flex items-center gap-2 px-4 py-3 rounded-full transition-colors active:scale-95 ${isToday ? 'text-white/20 cursor-not-allowed' : 'text-white/60 hover:text-white hover:bg-white/10'}`}
                 >
                   <span className="text-xs font-medium tracking-wider uppercase">Next</span>
                   <ChevronRight size={16} />
                 </button>
               </div>
            </motion.div>

          </motion.div>
        ) : (
          <div key="error" className="flex-1 flex items-center justify-center text-rose-400/80 font-serif italic text-xl px-4 text-center min-h-[80vh]">
             The archives could not be reached. Pray, try again later.
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
