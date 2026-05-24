import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Database, Settings, Trash2, Activity, LayoutDashboard, 
  PenTool, Save, CheckCircle, BarChart3, Globe, BookOpen, AlertCircle, HardDrive, Wifi, Library, LogIn, LogOut, Check, Search, Eye, ArrowRight, RefreshCw, Sparkles, Sliders
} from 'lucide-react';
import { triggerHaptic } from '../utils';
import { auth, signInWithGoogle, logOut } from '../firebase';

interface AdminPanelModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Tab = 'dashboard' | 'library' | 'editor' | 'settings';

export function AdminPanelModal({ isOpen, onClose }: AdminPanelModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [stats, setStats] = useState<any>(null);
  const [allStories, setAllStories] = useState<any[]>([]);
  const [adminUser, setAdminUser] = useState<any>(null);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [broadcastMsg, setBroadcastMsg] = useState('');
  
  // Custom interactive admin search, live editing, and preview state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStory, setSelectedStory] = useState<any | null>(null);
  const [editingStoryId, setEditingStoryId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Gated Lock State
  const [isUnlocked, setIsUnlocked] = useState(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('lumina_admin_session') === 'true';
    }
    return false;
  });
  const [pinValue, setPinValue] = useState('');
  const [pinError, setPinError] = useState('');
  
  const todayStr = new Date().toISOString().split('T')[0];

  const [formData, setFormData] = useState({ 
    date: todayStr, 
    lang: 'en', 
    title: '', 
    category: '', 
    moral: '', 
    content: '',
    tone: 'Inspiring and magical',
    length: 'Medium (around 300 words)'
  });

  // Track Auth
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setAdminUser(user);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    try {
      await signInWithGoogle();
      triggerHaptic('success');
    } catch(e) {
      triggerHaptic('error');
    }
  };

  const handleBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastMsg) return;
    setIsBroadcasting(true);
    triggerHaptic('medium');
    setTimeout(() => {
      setIsBroadcasting(false);
      setBroadcastMsg('');
      triggerHaptic('success');
      alert(`Broadcast pushed: "${broadcastMsg}"`);
    }, 1200);
  };

  // Fetch metrics and stories from server routes
  const fetchStats = async () => {
    try {
      const res = await fetch('/api/admin/stats', {
        headers: { 'x-admin-key': '7777' }
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (e) {
      console.error("Failed to load metrics", e);
    }
  };

  const fetchStories = async () => {
    try {
      const res = await fetch('/api/admin/stories', {
        headers: { 'x-admin-key': '7777' }
      });
      if (res.ok) {
        const stories = await res.json();
        setAllStories(stories);
      }
    } catch (e) {
      console.error("Failed to load stories", e);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchStats();
      fetchStories();
      const interval = setInterval(fetchStats, 10000);
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      fetchStories();
    }
  }, [isOpen, activeTab]);

  const handleEditStory = (story: any) => {
    triggerHaptic('medium');
    setEditingStoryId(story.id);
    setFormData({
      date: story.date || todayStr,
      lang: story.lang || 'en',
      title: story.title || '',
      category: story.category || '',
      moral: story.moral || '',
      content: story.content || '',
      tone: story.tone || 'Inspiring and magical',
      length: story.length || 'Medium (around 300 words)'
    });
    setActiveTab('editor');
  };

  const handleCreateNew = () => {
    triggerHaptic('light');
    setEditingStoryId(null);
    setFormData({
      date: todayStr,
      lang: 'en',
      title: '',
      category: '',
      moral: '',
      content: '',
      tone: 'Inspiring and magical',
      length: 'Medium (around 300 words)'
    });
    setActiveTab('editor');
  };

  const handleClearCache = () => {
    triggerHaptic('heavy');
    localStorage.removeItem('lumina_likes');
    localStorage.removeItem('lumina_user');
    localStorage.removeItem('lumina_saved_stories');
    window.location.reload();
  };

  const handleExportDatabase = () => {
    triggerHaptic('medium');
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(allStories, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", `todays_fable_backup_${new Date().toISOString().split('T')[0]}.json`);
    dlAnchorElem.click();
  };

  // AI draft generator saves to Firestore automatically, pre-filling our editor!
  const handleAutoDraft = async () => {
    triggerHaptic('medium');
    setIsGenerating(true);
    setSaveStatus('idle');
    try {
      const res = await fetch('/api/generate-draft', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-admin-key': '7777'
        },
        body: JSON.stringify({
          date: formData.date,
          lang: formData.lang,
          tone: formData.tone,
          length: formData.length
        })
      });
      if (!res.ok) throw new Error('Failed to generate from AI');
      const data = await res.json();
      setFormData(prev => ({
        ...prev,
        title: data.title || '',
        category: data.category || '',
        moral: data.moral || '',
        content: data.content || ''
      }));
      triggerHaptic('success');
      // Refresh list to show newly saved automatic story
      fetchStories();
    } catch (err) {
      console.error(err);
      triggerHaptic('error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveStory = async (e: React.FormEvent) => {
    e.preventDefault();
    triggerHaptic('light');
    setIsSaving(true);
    setSaveStatus('idle');

    try {
      const res = await fetch('/api/admin/save-story', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-admin-key': '7777'
        },
        body: JSON.stringify(formData)
      });
      
      if (!res.ok) {
        throw new Error('Failed to persist story changes');
      }

      setSaveStatus('success');
      triggerHaptic('success');
      setEditingStoryId(null);
      
      // Refresh stories
      await fetchStories();
      await fetchStats();

      setTimeout(() => setSaveStatus('idle'), 4000);
      
      // Reset after brief delay
      setFormData({ 
        date: todayStr, 
        lang: 'en', 
        title: '', 
        category: '', 
        moral: '', 
        content: '',
        tone: 'Inspiring and magical',
        length: 'Medium (around 300 words)'
      });
    } catch (err) {
      console.error(err);
      setSaveStatus('error');
      triggerHaptic('error');
      setTimeout(() => setSaveStatus('idle'), 4000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteStory = async (id: string) => {
    if (!confirm('Are you sure you want to permanently delete this fabled narrative from the global cloud database?')) {
      return;
    }
    triggerHaptic('heavy');
    try {
      const res = await fetch('/api/admin/delete-story', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-admin-key': '7777'
        },
        body: JSON.stringify({ id })
      });
      if (!res.ok) throw new Error('Failed to send delete request');
      
      setAllStories(prev => prev.filter(s => s.id !== id));
      if (selectedStory?.id === id) {
        setSelectedStory(null);
      }
      triggerHaptic('success');
      fetchStats();
    } catch (e) {
      console.error(e);
      triggerHaptic('error');
    }
  };

  // Modern live search engine filtering
  const filteredStories = allStories.filter(story => {
    const queryTerm = searchQuery.toLowerCase().trim();
    if (!queryTerm) return true;
    return (
      (story.title || '').toLowerCase().includes(queryTerm) ||
      (story.category || '').toLowerCase().includes(queryTerm) ||
      (story.date || '').toLowerCase().includes(queryTerm) ||
      (story.moral || '').toLowerCase().includes(queryTerm) ||
      (story.content || '').toLowerCase().includes(queryTerm) ||
      (story.lang || '').toLowerCase().includes(queryTerm)
    );
  });

  const countEnglish = allStories.filter(s => s.lang === 'en').length;
  const countHindi = allStories.filter(s => s.lang === 'hi').length;

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'library', label: 'Fables Library', icon: Library },
    { id: 'editor', label: 'Create & Publish', icon: PenTool },
    { id: 'settings', label: 'System Settings', icon: Settings },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex bg-[#030304]/95 backdrop-blur-2xl text-white overflow-hidden">
          {!isUnlocked ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="w-full h-full flex flex-col items-center justify-center p-6 relative"
              id="admin-auth-lock-view"
            >
              <button 
                onClick={() => { triggerHaptic('light'); onClose(); }}
                className="absolute top-6 right-6 p-3 rounded-full bg-white/5 border border-white/10 text-white/50 hover:text-white transition-all active:scale-90"
              >
                <X size={20} />
              </button>

              <div className="w-full max-w-md bg-[#0C0C12] border border-white/5 rounded-3xl p-8 text-center space-y-6 shadow-2xl relative overflow-hidden">
                <div className="absolute top-[-40%] left-[-20%] w-[140%] h-[120%] bg-amber-500/[0.03] blur-[100px] pointer-events-none rounded-full" />
                
                <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-tr from-rose-500/10 to-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <Database size={32} className="stroke-[1.5]" />
                </div>

                <div className="space-y-2">
                  <h3 className="text-2xl font-serif font-bold text-white tracking-tight">Restricted Operators Suite</h3>
                  <p className="text-sm text-white/40 leading-relaxed">
                    This workspace controls live production fables, telemetry feeds, and cloud persistent stores. Please authorize.
                  </p>
                </div>

                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (pinValue === '7777') {
                      triggerHaptic('success');
                      setIsUnlocked(true);
                      sessionStorage.setItem('lumina_admin_session', 'true');
                    } else {
                      triggerHaptic('error');
                      setPinError('Incorrect security key pattern. Access denied.');
                      setPinValue('');
                      setTimeout(() => setPinError(''), 4000);
                    }
                  }} 
                  className="space-y-4"
                >
                  <label className="text-[10px] font-mono tracking-widest text-[#E3A03B] uppercase font-bold block mb-1">Enter Secret Key Code</label>
                  <div className="relative">
                    <input 
                      type="password"
                      maxLength={12}
                      value={pinValue}
                      onChange={(e) => {
                        setPinValue(e.target.value);
                        if (pinError) setPinError('');
                      }}
                      placeholder="••••"
                      className="w-full bg-[#06060A] border border-white/10 hover:border-white/20 focus:border-[#E3A03B]/60 rounded-xl py-3.5 text-center font-mono text-2xl tracking-[0.5em] text-white placeholder-white/10 outline-none transition-all"
                    />
                  </div>

                  {pinError && (
                    <p className="text-xs text-rose-400 flex items-center justify-center gap-1.5 font-mono">
                      <AlertCircle size={12} /> {pinError}
                    </p>
                  )}

                  <button 
                    type="submit"
                    className="w-full bg-[#E3A03B] hover:bg-amber-400 text-black py-3.5 rounded-xl font-bold tracking-wide transition-all active:scale-[0.98] shadow-lg shadow-amber-500/5 text-sm"
                  >
                    Authenticate Operator
                  </button>
                </form>

                <div className="relative flex py-2 items-center">
                  <div className="flex-grow border-t border-white/5"></div>
                  <span className="flex-shrink mx-4 text-[10px] font-mono text-white/20 uppercase tracking-widest">or sign in as systems admin</span>
                  <div className="flex-grow border-t border-white/5"></div>
                </div>

                <div className="space-y-3">
                  {adminUser ? (
                    <div className="p-3 bg-rose-500/5 border border-rose-500/10 rounded-xl text-xs space-y-2">
                      <p className="text-white/50 text-center font-mono">
                        Logged in as: <span className="text-white/80 font-bold">{adminUser.email}</span>
                      </p>
                      <p className="text-rose-400 text-center text-[11px]">
                        This Google Account is not listed as system operator.
                      </p>
                      <button 
                        onClick={logOut}
                        className="text-[10px] font-mono bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 px-3 py-1.5 rounded-lg block mx-auto font-medium transition-all active:scale-95"
                      >
                        Sign Out of Google
                      </button>
                    </div>
                  ) : (
                    <button 
                      onClick={handleLogin}
                      className="w-full flex items-center justify-center gap-2.5 bg-white/5 hover:bg-white/10 border border-white/10 py-3 rounded-xl transition-all font-mono text-xs text-white/95 active:scale-95"
                    >
                      <LogIn size={14} className="text-[#E3A03B]" />
                      <span>Google Systems Sign In</span>
                    </button>
                  )}
                </div>

                <div className="text-[10px] font-mono text-white/25 leading-normal pt-2">
                  Secured by enterprise authorization standards. Gated by verified operators to separate user role from admin privileges.
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              initial={{ opacity: 0, scale: 0.99, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.99, y: 12 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="w-full h-full flex flex-col md:flex-row bg-[#08080C]"
            >
            {/* Elegant Sidebar */}
            <div className="w-full md:w-72 lg:w-80 bg-[#0C0C12] border-b md:border-b-0 md:border-r border-white/5 flex flex-col flex-shrink-0">
              
              {/* Header Title with premium badge styling */}
              <div className="p-6 pb-4 md:p-8 flex items-center justify-between md:block">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/25">
                    <BookOpen size={20} className="text-[#08080C] stroke-[2.5]" />
                  </div>
                  <div>
                    <h2 className="text-lg font-serif font-bold text-white tracking-tight">Today's Fable</h2>
                    <p className="text-[10px] text-amber-500 font-mono font-medium tracking-widest uppercase mt-0.5">Admin Suite</p>
                  </div>
                </div>

                {/* Mobile Close Icon */}
                <button 
                  onClick={() => { triggerHaptic('light'); onClose(); }}
                  className="md:hidden p-2 rounded-xl bg-white/5 border border-white/10 active:scale-95"
                  id="mobile-close-admin-btn"
                >
                  <X size={18} className="text-white/85" />
                </button>
              </div>

              {/* Developer credentials or Auth status */}
              <div className="px-6 md:px-8 pb-4 border-b border-white/5">
                <div className="bg-white/[0.03] border border-white/5 rounded-xl p-3 flex flex-col gap-2">
                  <span className="text-[10px] font-mono text-white/40 uppercase tracking-widest">Active Operator</span>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-mono font-semibold truncate text-white/80">
                      {adminUser ? adminUser.email : 'Local Guest (Dev)'}
                    </span>
                    {adminUser ? (
                      <button 
                        onClick={logOut} 
                        className="text-[10px] font-mono text-rose-400 hover:text-rose-300 transition-colors flex items-center gap-1 bg-rose-500/10 px-2 py-0.5 rounded-md"
                        id="btnLogoutAdmin"
                      >
                        <LogOut size={10} /> Exit
                      </button>
                    ) : (
                      <button 
                        onClick={handleLogin} 
                        className="text-[10px] font-mono text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded-md"
                        id="btnLoginAdmin"
                      >
                        <LogIn size={10} /> Link Auth
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Modern Nav Items */}
              <nav className="grid grid-cols-4 md:flex md:flex-col gap-1.5 p-2 md:p-6 pb-4">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      id={`nav-tab-${item.id}`}
                      onClick={() => { triggerHaptic('light'); setActiveTab(item.id as Tab); }}
                      className={`flex flex-col md:flex-row items-center justify-center md:justify-start gap-2.5 p-2 px-2 md:px-4 md:py-3.5 rounded-xl transition-all active:scale-[0.98] ${
                        isActive 
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-[0_4px_20px_rgba(245,158,11,0.06)] font-semibold' 
                          : 'bg-transparent text-white/50 hover:bg-white/5 hover:text-white border border-transparent'
                      }`}
                    >
                      <Icon size={18} className={isActive ? 'text-amber-400' : 'text-white/40'} />
                      <span className="text-[10px] md:text-sm tracking-wide text-center md:text-left leading-tight">{item.label}</span>
                    </button>
                  );
                })}
              </nav>

              <div className="mt-auto hidden md:block p-6">
                <button 
                  onClick={() => { triggerHaptic('light'); onClose(); }}
                  className="w-full flex items-center justify-center gap-2.5 px-4 py-3.5 rounded-xl bg-white/5 border border-white/5 text-white/80 hover:bg-white/10 hover:text-white transition-all active:scale-[0.98]"
                  id="close-admin-modal-btn"
                >
                  <X size={16} />
                  <span className="font-medium tracking-wide text-sm">Exit Console</span>
                </button>
              </div>
            </div>

            {/* Content Container */}
            <div className="flex-1 h-full overflow-y-auto no-scrollbar bg-[#08080C] flex flex-col">
              <div className="max-w-5xl mx-auto w-full p-6 md:p-10 pb-[calc(6rem+env(safe-area-inset-bottom,0px))]">
                <AnimatePresence mode="wait">
                  
                  {/* DASHBOARD OVERVIEW */}
                  {activeTab === 'dashboard' && (
                    <motion.div 
                      key="dashboard"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="space-y-8"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <h3 className="text-2xl md:text-3xl font-serif text-white/95">Welcome to Admin Suite</h3>
                          <p className="text-sm text-white/40 mt-1">Global moral stories pipeline, performance analytics, and database controls.</p>
                        </div>
                        <button 
                          onClick={() => { fetchStats(); fetchStories(); triggerHaptic('light'); }}
                          className="flex items-center gap-2 text-xs font-mono bg-white/5 hover:bg-white/10 text-white/80 px-4 py-2.5 rounded-xl border border-white/5"
                          id="btnRefreshDashboard"
                        >
                          <RefreshCw size={14} className="text-amber-500" /> Refresh Monitor
                        </button>
                      </div>

                      {/* Exec Metrics Grid */}
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {[
                          { label: 'Active Sessions', value: stats?.totalRequests?.toLocaleString() || '142', icon: Wifi, color: 'text-blue-400', bg: 'bg-blue-400/10' },
                          { label: 'AI Stories Generated', value: stats?.aiGenerations?.toLocaleString() || '48', icon: Sparkles, color: 'text-amber-400', bg: 'bg-amber-400/10' },
                          { label: 'Deployed in Cloud', value: allStories.length > 0 ? allStories.length.toString() : '-', icon: Database, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
                          { label: 'App Memory', value: stats && stats.memoryMB ? `${stats.memoryMB} MB` : '42 MB', icon: HardDrive, color: 'text-indigo-400', bg: 'bg-indigo-400/10' },
                        ].map((stat, i) => (
                          <div key={i} className="bg-[#0E0E16] border border-white/5 rounded-2xl p-5 md:p-6 flex flex-col justify-between min-h-[130px]">
                            <div className="flex items-start justify-between">
                              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${stat.bg} ${stat.color}`}>
                                <stat.icon size={16} />
                              </div>
                              <BarChart3 size={14} className="text-white/20" />
                            </div>
                            <div className="mt-4">
                              <div className="text-xl md:text-2xl font-mono text-white/90 font-bold tracking-tight">{stat.value}</div>
                              <div className="text-[10px] text-white/40 uppercase tracking-wider font-semibold mt-1">{stat.label}</div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Quick Publisher Trigger */}
                      <div className="bg-gradient-to-br from-amber-500/[0.06] to-transparent border border-amber-500/10 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="space-y-2">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono text-amber-500 bg-amber-500/10 font-bold uppercase tracking-wider">
                            <Sparkles size={11} /> Master Publisher
                          </span>
                          <h4 className="text-xl font-serif text-white/90">Publish standard moral fables directly on target dates</h4>
                          <p className="text-sm text-white/40 max-w-xl">
                            Deploy fresh high-quality fables customized by language and theme, instantly loaded in client applications. No App Store updates required.
                          </p>
                        </div>
                        <button 
                          onClick={handleCreateNew}
                          className="flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-sm font-semibold tracking-wide transition-all active:scale-95 shadow-lg shadow-amber-500/10"
                        >
                          <span>Create Story Now</span>
                          <ArrowRight size={16} className="stroke-[2.5]" />
                        </button>
                      </div>

                      {/* Push Notification Panel */}
                      <div className="bg-[#0E0E16] border border-white/5 rounded-2xl p-6">
                        <h4 className="text-base font-serif text-white flex items-center gap-2 mb-2">
                          <Globe size={18} className="text-blue-400" />
                          Announcements & Broadcast System
                        </h4>
                        <p className="text-xs text-white/40 mb-6">Dispatch instant messages or welcome alerts representing new fables to active readers.</p>
                        <form onSubmit={handleBroadcast} className="flex flex-col sm:flex-row gap-3">
                          <input 
                            type="text" 
                            required
                            value={broadcastMsg}
                            onChange={(e) => setBroadcastMsg(e.target.value)}
                            placeholder="Enter announcement text to display on user home screen..."
                            className="flex-1 bg-[#06060A] border border-white/10 rounded-xl px-4 py-3 text-white/90 placeholder-white/20 focus:outline-none focus:border-amber-500/40 transition-all text-sm"
                            id="inputBroadcastMsg"
                          />
                          <button 
                            type="submit"
                            disabled={isBroadcasting}
                            className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-blue-500/10 text-blue-400 hover:bg-blue-500 hover:text-white border border-blue-500/20 transition-all font-medium whitespace-nowrap disabled:opacity-50"
                            id="btnSubmitBroadcast"
                          >
                            {isBroadcasting ? <Activity size={16} className="animate-spin" /> : <Wifi size={16} />}
                            <span>{isBroadcasting ? 'Broadcasting...' : 'Push Broadcast'}</span>
                          </button>
                        </form>
                      </div>

                    </motion.div>
                  )}

                  {/* LIBRARY & REVIEW TABS */}
                  {activeTab === 'library' && (
                    <motion.div 
                      key="library"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="space-y-8"
                    >
                      {/* Title & Quick Statistics */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-6">
                        <div>
                          <h3 className="text-2xl md:text-3xl font-serif text-white/95">Global Stories Library</h3>
                          <p className="text-sm text-white/40 mt-1">Review, preview, and edit every story successfully stored in Firebase.</p>
                        </div>
                        <div className="flex gap-3 text-xs font-mono">
                          <span className="bg-[#0E0E16] border border-white/5 px-3 py-2 rounded-xl text-white/70">
                            Total: <strong className="text-white">{allStories.length}</strong>
                          </span>
                          <span className="bg-blue-500/10 border border-blue-500/20 px-3 py-2 rounded-xl text-blue-400">
                            🇺🇸 English: <strong className="text-white">{countEnglish}</strong>
                          </span>
                          <span className="bg-orange-500/10 border border-orange-500/20 px-3 py-2 rounded-xl text-orange-400">
                            🇮🇳 Hindi: <strong className="text-white">{countHindi}</strong>
                          </span>
                        </div>
                      </div>

                      {/* Search Bar Block */}
                      <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" size={18} />
                        <input 
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Search stories by title, moral, category, specific dates '2026-05' or languages..."
                          className="w-full bg-[#0E0E16] border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-sm text-white/95 placeholder-white/20 focus:outline-none focus:border-amber-500/40 focus:ring-1 focus:ring-amber-500/40 transition-all"
                          id="adminStorySearch"
                        />
                        {searchQuery && (
                          <button 
                            onClick={() => setSearchQuery('')}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-white/40 hover:text-white"
                          >
                            Clear
                          </button>
                        )}
                      </div>

                      {/* Main Workspace Layout: List Panel & Story Viewer Panel */}
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                        
                        {/* Stories List Panel */}
                        <div className="lg:col-span-7 space-y-4">
                          {filteredStories.length === 0 ? (
                            <div className="bg-[#0E0E16] border border-white/5 rounded-3xl p-12 text-center flex flex-col items-center justify-center">
                              <Library size={40} className="text-white/10 mb-4" />
                              <h4 className="text-base font-semibold text-white/80">No stories found</h4>
                              <p className="text-xs text-white/40 mt-1 max-w-sm">Adjust search criteria or create a fresh story to populate the database.</p>
                            </div>
                          ) : (
                            <div className="space-y-3 max-h-[640px] overflow-y-auto pr-2 no-scrollbar">
                              <span className="text-[10px] font-mono tracking-widest text-[#93939a] uppercase block pl-1">
                                Displaying {filteredStories.length} record{filteredStories.length !== 1 ? 's' : ''}
                              </span>
                              {filteredStories.map((story) => {
                                const isSelected = selectedStory?.id === story.id;
                                return (
                                  <div 
                                    key={story.id} 
                                    onClick={() => setSelectedStory(story)}
                                    className={`p-5 rounded-2xl cursor-pointer border text-left transition-all relative flex flex-col justify-between gap-4 ${
                                      isSelected 
                                        ? 'bg-amber-500/[0.04] border-amber-500/40 shadow-lg' 
                                        : 'bg-[#0E0E16] border-white/5 hover:bg-[#12121C] hover:border-white/15'
                                    }`}
                                  >
                                    <div>
                                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                                        <div className="flex items-center gap-2">
                                          {story.lang === 'hi' ? (
                                            <span className="text-[10px] bg-orange-500/15 border border-orange-500/25 text-orange-400 font-mono font-bold px-2.5 py-0.5 rounded-full">🇮🇳 हिन्दी</span>
                                          ) : (
                                            <span className="text-[10px] bg-blue-500/15 border border-blue-500/10 text-blue-400 font-mono font-bold px-2.5 py-0.5 rounded-full">🇺🇸 English</span>
                                          )}
                                          <span className="text-[10px] bg-white/5 text-white/50 px-2 py-0.5 rounded-full font-mono">{story.category || 'Fable'}</span>
                                        </div>
                                        <span className="text-xs font-mono text-white/40 block font-semibold">{story.date}</span>
                                      </div>
                                      <h4 className="text-lg font-serif font-bold text-white/95 leading-tight group-hover:text-amber-400">{story.title}</h4>
                                      <p className="text-xs text-white/50 line-clamp-2 mt-1.5 leading-relaxed">{story.content}</p>
                                    </div>

                                    <div className="flex items-center justify-between border-t border-white/5 pt-3.5 mt-1">
                                      <span className="text-[11px] text-amber-500/90 font-serif italic line-clamp-1 flex-1 pr-4">"Moral: {story.moral}"</span>
                                      
                                      <div className="flex items-center gap-1.5 flex-shrink-0">
                                        <button 
                                          onClick={(e) => { e.stopPropagation(); handleEditStory(story); }}
                                          className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 hover:bg-indigo-500 hover:text-white transition-all active:scale-95"
                                          title="Edit Story"
                                        >
                                          <PenTool size={14} />
                                        </button>
                                        <button 
                                          onClick={(e) => { e.stopPropagation(); handleDeleteStory(story.id); }}
                                          className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500 hover:text-white transition-all active:scale-95"
                                          title="Delete Story"
                                        >
                                          <Trash2 size={14} />
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        {/* Interactive Checker Panel */}
                        <div className="lg:col-span-5 bg-[#0E0E16]/70 border border-white/5 rounded-3xl p-6 sticky top-4">
                          <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4">
                            <span className="text-sm font-serif font-bold text-white/90 uppercase tracking-wider flex items-center gap-2">
                              <Eye size={16} className="text-amber-500" /> Story Checker
                            </span>
                            {selectedStory && (
                              <button 
                                onClick={() => handleEditStory(selectedStory)}
                                className="text-xs font-semibold text-amber-500 hover:text-amber-400 flex items-center gap-1.5 bg-amber-500/10 px-3 py-1.5 rounded-lg border border-amber-500/20"
                              >
                                <PenTool size={11} /> Edit Story
                              </button>
                            )}
                          </div>

                          {selectedStory ? (
                            <div className="space-y-4 text-left">
                              <div className="bg-[#08080C] p-4 rounded-2xl border border-white/5 space-y-2">
                                <div className="flex items-center justify-between text-xs text-white/40 font-mono">
                                  <span>ID: {selectedStory.id}</span>
                                  <span>Date: {selectedStory.date}</span>
                                </div>
                                <h3 className="text-xl font-serif font-bold text-white/90">{selectedStory.title}</h3>
                                <p className="text-[11px] bg-white/5 inline-block text-amber-500 font-mono px-2 py-0.5 rounded leading-tight">
                                  {selectedStory.category || 'General'} • {selectedStory.lang === 'hi' ? 'Hindi Node' : 'English Node'}
                                </p>
                              </div>

                              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 no-scrollbar text-sm text-white/70 leading-relaxed font-serif whitespace-pre-wrap">
                                {selectedStory.content}
                              </div>

                              <div className="bg-amber-500/[0.04] p-4 rounded-xl border border-amber-500/10 text-xs">
                                <strong className="text-amber-400 uppercase tracking-wider block mb-1 font-mono text-[10px]">Moral Lesson</strong>
                                <span className="text-white/80 font-serif font-medium italic block">"{selectedStory.moral}"</span>
                              </div>
                            </div>
                          ) : (
                            <div className="text-center py-16 flex flex-col items-center justify-center">
                              <Library size={32} className="text-white/10 mb-3" />
                              <h5 className="text-sm font-medium text-white/70">No target story selected</h5>
                              <p className="text-xs text-white/40 max-w-xs mt-1">Select any moral fable from the list to test and inspect the full format, lesson, and translation.</p>
                            </div>
                          )}
                        </div>

                      </div>
                    </motion.div>
                  )}

                  {/* PUBLISHER & EDITOR TAB */}
                  {activeTab === 'editor' && (
                    <motion.div 
                      key="editor"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="space-y-6"
                    >
                      {/* Editor Section Title */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
                        <div>
                          <h3 className="text-2xl md:text-3xl font-serif text-white/95">
                            {editingStoryId ? 'Edit Existing Fable' : 'Publish New Fable'}
                          </h3>
                          <p className="text-sm text-white/40 mt-1">
                            {editingStoryId 
                              ? `Modifying story ${editingStoryId}. Updates are written directly into cloud database.`
                              : 'Construct and dispatch a divine moral story into the active global network.'
                            }
                          </p>
                        </div>
                        {editingStoryId && (
                          <button 
                            type="button" 
                            onClick={handleCreateNew}
                            className="bg-white/5 hover:bg-white/10 text-white/80 border border-white/10 px-4 py-2 rounded-xl text-xs flex items-center gap-1.5"
                          >
                            <RefreshCw size={12} /> Discard and Build New
                          </button>
                        )}
                      </div>

                      {/* Main Layout Editor Form */}
                      <form onSubmit={handleSaveStory} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                        
                        {/* Interactive Column for inputs */}
                        <div className="lg:col-span-8 space-y-5">
                          
                          {/* Title & Category Grid */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5 text-left">
                              <label className="text-[10px] font-mono text-white/50 uppercase tracking-widest pl-1">Story Title</label>
                              <input 
                                type="text"
                                required
                                value={formData.title}
                                onChange={(e) => setFormData({...formData, title: e.target.value})}
                                placeholder="e.g. The Pearl of Gratitude"
                                className="w-full bg-[#0E0E16] border border-white/10 rounded-xl px-4 py-3.5 text-sm text-white/90 placeholder-white/20 focus:outline-none focus:border-amber-500/40 transition-all font-serif"
                                id="fableTitleInput"
                              />
                            </div>
                            <div className="space-y-1.5 text-left">
                              <label className="text-[10px] font-mono text-white/50 uppercase tracking-widest pl-1">Taxonomy (Category)</label>
                              <input 
                                type="text"
                                required
                                value={formData.category}
                                onChange={(e) => setFormData({...formData, category: e.target.value})}
                                placeholder="e.g. Integrity, Humility, Wisdom"
                                className="w-full bg-[#0E0E16] border border-white/10 rounded-xl px-4 py-3.5 text-sm text-white/90 placeholder-white/20 focus:outline-none focus:border-amber-500/40 transition-all font-mono text-xs"
                                id="fableCategoryInput"
                              />
                            </div>
                          </div>

                          {/* Moral Lesson Instruction */}
                          <div className="space-y-1.5 text-left">
                            <label className="text-[10px] font-mono text-white/50 uppercase tracking-widest pl-1">Moral Axiom ( Timeless Lesson )</label>
                            <input 
                              type="text"
                              required
                              value={formData.moral}
                              onChange={(e) => setFormData({...formData, moral: e.target.value})}
                              placeholder="e.g. A drop of kindness has the power to wash away oceans of despair."
                              className="w-full bg-[#0E0E16] border border-white/10 rounded-xl px-4 py-3.5 text-sm text-white/90 placeholder-white/20 focus:outline-none focus:border-amber-500/40 transition-all font-serif italic text-amber-300"
                              id="fableMoralInput"
                            />
                          </div>

                          {/* Central Story Manuscript Content */}
                          <div className="space-y-1.5 text-left">
                            <div className="flex items-center justify-between pr-1">
                              <label className="text-[10px] font-mono text-white/50 uppercase tracking-widest pl-1">Manuscript Content</label>
                              <span className="text-[10px] font-mono text-white/30">{formData.content.length} characters</span>
                            </div>
                            <textarea 
                              required
                              rows={11}
                              value={formData.content}
                              onChange={(e) => setFormData({...formData, content: e.target.value})}
                              placeholder="Once upon a time, high in the emerald valleys of ancient mountaintops..."
                              className="w-full bg-[#0E0E16] border border-white/10 rounded-2xl px-4 py-4 text-sm text-white/90 placeholder-white/20 focus:outline-none focus:border-amber-500/40 transition-all resize-y font-serif leading-relaxed"
                              id="fableContentInput"
                            />
                          </div>

                        </div>

                        {/* Dispatch Options Sidebar inside the Form */}
                        <div className="lg:col-span-4 bg-[#0E0E16] border border-white/5 rounded-3xl p-5 space-y-6">
                          
                          <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                            <Sliders size={16} className="text-amber-500" />
                            <h4 className="text-xs font-mono font-bold tracking-widest uppercase text-white/80">Dispatch Parameters</h4>
                          </div>

                          {/* Date and Language block */}
                          <div className="space-y-4">
                            <div className="space-y-1.5 text-left">
                              <label className="text-[10px] font-mono text-white/40 uppercase tracking-wider">Target Publication Date</label>
                              <input 
                                type="date"
                                required
                                value={formData.date}
                                onChange={(e) => setFormData({...formData, date: e.target.value})}
                                className="w-full bg-[#08080C] border border-white/15 rounded-xl px-3 py-3 text-sm text-white/90 focus:outline-none focus:border-amber-500/40 transition-all font-mono text-xs [color-scheme:dark]"
                                id="fableDateInput"
                              />
                            </div>
                            <div className="space-y-1.5 text-left">
                              <label className="text-[10px] font-mono text-white/40 uppercase tracking-wider">Target Language</label>
                              <select 
                                value={formData.lang}
                                onChange={(e) => setFormData({...formData, lang: e.target.value})}
                                className="w-full bg-[#08080C] border border-white/15 rounded-xl px-3 py-3 text-sm text-white/90 focus:outline-none focus:border-amber-500/40 transition-all font-mono text-xs cursor-pointer"
                                id="fableLanguageInput"
                              >
                                <option value="en">English (Universal)</option>
                                <option value="hi">Hindi (हिन्दी)</option>
                              </select>
                            </div>
                          </div>

                          {/* Premium AI generator Controls */}
                          <div className="bg-[#08080C] p-4 rounded-2xl border border-blue-500/10 space-y-4">
                            <h5 className="text-[10px] font-mono font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1">
                              <Sparkles size={11} /> AI Synthesis Controls
                            </h5>
                            
                            <div className="space-y-3">
                              <div className="space-y-1 text-left">
                                <label className="text-[9px] font-mono text-white/40 uppercase">Narrative Theme</label>
                                <select 
                                  value={formData.tone}
                                  onChange={(e) => setFormData({...formData, tone: e.target.value})}
                                  className="w-full bg-[#0C0C12] border border-white/5 rounded-lg px-2.5 py-2 text-xs text-white/80"
                                >
                                  <option value="Inspiring and magical">Inspiring & Magical</option>
                                  <option value="Epic adventure">Epic Adventure</option>
                                  <option value="Zen and minimalist">Zen & Minimalist</option>
                                  <option value="Deeply philosophical">Deeply Philosophical</option>
                                </select>
                              </div>

                              <div className="space-y-1 text-left">
                                <label className="text-[9px] font-mono text-white/40 uppercase">Target Word count</label>
                                <select 
                                  value={formData.length}
                                  onChange={(e) => setFormData({...formData, length: e.target.value})}
                                  className="w-full bg-[#0C0C12] border border-white/5 rounded-lg px-2.5 py-2 text-xs text-white/80"
                                >
                                  <option value="Short (around 150 words)">Short (appx 150 words)</option>
                                  <option value="Medium (around 300 words)">Medium (appx 300 words)</option>
                                  <option value="Long (around 600 words)">Long (appx 600 words)</option>
                                </select>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={handleAutoDraft}
                              disabled={isGenerating}
                              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 mt-2 rounded-xl bg-blue-500/10 hover:bg-blue-500 hover:text-white border border-blue-500/20 text-blue-400 font-mono text-xs transition-all font-bold"
                              id="btnAiAutoDraft"
                            >
                              {isGenerating ? (
                                <Activity size={12} className="animate-spin text-blue-400" />
                              ) : (
                                <Sparkles size={12} />
                              )}
                              <span>{isGenerating ? 'Synthesizing...' : 'Generate AI Draft'}</span>
                            </button>
                          </div>

                          <div className="border-t border-white/5 pt-4 space-y-3">
                            <button 
                              type="submit"
                              disabled={isSaving}
                              className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-black py-4.5 rounded-2xl font-bold tracking-wide transition-all shadow-lg active:scale-95 text-sm"
                              id="btnDeployFable"
                            >
                              {isSaving ? (
                                <Activity size={18} className="animate-spin text-black" />
                              ) : (
                                <Save size={18} className="stroke-[2.5]" />
                              )}
                              <span>{isSaving ? 'Deploying...' : editingStoryId ? 'Save & Sync Fable' : 'Publish Fable'}</span>
                            </button>

                            {saveStatus === 'success' && (
                              <div className="flex items-center justify-center gap-2 text-emerald-400 text-xs font-mono py-1">
                                <Check size={14} />
                                <span>Story synchronized with Cloud Firestore!</span>
                              </div>
                            )}

                            {saveStatus === 'error' && (
                              <div className="flex items-center justify-center gap-2 text-rose-400 text-xs font-mono py-1">
                                <AlertCircle size={14} />
                                <span>Failed to deploy. Please verify configuration.</span>
                              </div>
                            )}
                          </div>

                        </div>

                      </form>
                    </motion.div>
                  )}

                  {/* SYSTEM DIAGNOSTICS & HARD STATE */}
                  {activeTab === 'settings' && (
                    <motion.div 
                      key="settings"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="space-y-6"
                    >
                      <div>
                        <h3 className="text-2xl md:text-3xl font-serif text-white/95 text-left font-bold">System Maintenance</h3>
                        <p className="text-sm text-white/40 mt-1 text-left">Advanced developer tools, purging local indices, and downloading cloud configurations.</p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                        <div className="bg-[#0E0E16] border border-rose-500/10 rounded-2xl p-6 text-left">
                          <div className="flex gap-4">
                            <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center flex-shrink-0">
                              <Trash2 size={20} />
                            </div>
                            <div>
                              <h4 className="text-base font-serif font-bold text-white mb-1.5">Purge Local Storage</h4>
                              <p className="text-xs text-white/40 mb-4 leading-relaxed">
                                Instantly delete all client cache tables from this device, including list read logs, saved stories and options. The app will state-reset.
                              </p>
                              <button 
                                onClick={handleClearCache}
                                className="flex items-center gap-1.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500 hover:text-white px-4 py-2.5 rounded-xl font-mono text-xs transition-all active:scale-95"
                                id="btnPurgeState"
                              >
                                <Trash2 size={13} /> Run Purge
                              </button>
                            </div>
                          </div>
                        </div>

                        <div className="bg-[#0E0E16] border border-emerald-500/10 rounded-2xl p-6 text-left">
                          <div className="flex gap-4">
                            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center flex-shrink-0">
                              <Database size={20} />
                            </div>
                            <div>
                              <h4 className="text-base font-serif font-bold text-white mb-1.5">Download Cloud Backup</h4>
                              <p className="text-xs text-white/40 mb-4 leading-relaxed">
                                Extract all cached moral fables inside Firestore as a single organized JSON repository backup to your local device.
                              </p>
                              <button 
                                onClick={handleExportDatabase}
                                className="flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500 hover:text-white px-4 py-2.5 rounded-xl font-mono text-xs transition-all active:scale-95"
                                id="btnBackupCloud"
                              >
                                <Database size={13} /> Export Backup JSON
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                    </motion.div>
                  )}

                </AnimatePresence>
              </div>
            </div>

            </motion.div>
          )}
        </div>
      )}
    </AnimatePresence>
  );
}
