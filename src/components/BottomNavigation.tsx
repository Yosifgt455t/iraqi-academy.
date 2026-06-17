import { useState, useEffect } from 'react';
import { Home, BookOpen, Brain, Users, Gamepad2 } from 'lucide-react';
import { motion } from 'motion/react';

interface BottomNavigationProps {
  currentView: string;
  isLectureActive: boolean; 
  onTabSelect: (view: 'home' | 'smart_assistant' | 'community' | 'activities' | 'lectures_root') => void;
}

export default function BottomNavigation({ currentView, isLectureActive, onTabSelect }: BottomNavigationProps) {
  const [theme, setTheme] = useState('glass');

  // Dynamically listen to active theme changes on html tag
  useEffect(() => {
    const updateTheme = () => {
      const preferred = localStorage.getItem('preferredStyleTheme') || 'glass';
      setTheme(preferred);
    };

    updateTheme();

    // Set up a mutation observer to listen to class changes on documentElement
    const observer = new MutationObserver(updateTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });

    return () => observer.disconnect();
  }, []);

  const tabs = [
    {
      id: 'home',
      label: 'الرئيسية',
      icon: Home,
      view: 'home' as const,
      color: 'neo-bg-yellow'
    },
    {
      id: 'lectures',
      label: 'المحاضرات',
      icon: BookOpen,
      view: 'lectures_root' as const, // Custom action to reset lecture path
      color: 'neo-bg-teal'
    },
    {
      id: 'smart_assistant',
      label: 'الدراسة الذكية',
      icon: Brain,
      view: 'smart_assistant' as const,
      color: 'neo-bg-blue'
    },
    {
      id: 'community',
      label: 'المجتمع',
      icon: Users,
      view: 'community' as const,
      color: 'neo-bg-pink'
    },
    {
      id: 'activities',
      label: 'الفعاليات',
      icon: Gamepad2,
      view: 'activities' as const,
      color: 'neo-bg-green'
    }
  ];

  // Helper to determine active state of a tab
  const getIsActive = (tabId: string) => {
    if (tabId === 'home') {
      return currentView === 'home' && !isLectureActive;
    }
    if (tabId === 'lectures') {
      return currentView === 'home' && isLectureActive;
    }
    return currentView === tabId;
  };

  // Theme-specific styles
  const getContainerStyles = () => {
    switch (theme) {
      case 'glass':
        return 'bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-t border-slate-200/50 dark:border-slate-800/50 shadow-[0_-10px_35px_rgba(15,23,42,0.08)]';
      case 'amethyst':
        return 'bg-purple-950/90 backdrop-blur-xl border-t border-purple-500/30 shadow-[0_-10px_35px_rgba(139,92,246,0.15)] text-white';
      case 'cosmic':
        return 'bg-zinc-950/95 backdrop-blur-lg border-t border-cyan-500/40 shadow-[0_-8px_30px_rgba(6,182,212,0.15)] text-white';
      case 'neo':
      default:
        return 'bg-[#FFF3EC] dark:bg-black border-t-4 border-black dark:border-white shadow-[0_-4px_0px_0px_rgba(0,0,0,1)]';
    }
  };

  const getButtonStyles = (isActive: boolean, tabColor: string) => {
    if (!isActive) {
      return 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200';
    }

    switch (theme) {
      case 'glass':
        return 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 rounded-xl';
      case 'amethyst':
        return 'text-fuchsia-400 bg-fuchsia-950/40 border border-fuchsia-500/30 rounded-xl';
      case 'cosmic':
        return 'text-cyan-400 bg-cyan-950/40 border border-cyan-500/30 rounded-xl';
      case 'neo':
      default:
        return `text-black border-2 border-black ${tabColor} shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] rounded-xl`;
    }
  };

  return (
    <div 
      className={`fixed bottom-0 left-0 right-0 z-[999] transition-all px-4 pb-2 pt-2.5 ${getContainerStyles()}`}
      dir="rtl"
    >
      <div className="max-w-xl mx-auto flex items-center justify-between gap-1 sm:gap-2">
        {tabs.map((tab) => {
          const isActive = getIsActive(tab.id);
          const TabIcon = tab.icon;

          return (
            <button
              key={tab.id}
              onClick={() => onTabSelect(tab.view)}
              className={`flex-1 flex flex-col items-center justify-center py-2 px-1 relative transition-all duration-300 ${getButtonStyles(isActive, tab.color)}`}
            >
              <div className="relative">
                <TabIcon size={22} className="transition-transform duration-300 group-hover:scale-110" />
                {isActive && theme !== 'neo' && (
                  <motion.span 
                    layoutId="activeDot"
                    className={`absolute -top-1.5 -right-1.5 w-1.5 h-1.5 rounded-full ${
                      theme === 'glass' ? 'bg-indigo-600' : theme === 'amethyst' ? 'bg-fuchsia-400' : 'bg-cyan-400'
                    }`} 
                  />
                )}
              </div>
              <span className="text-[10px] sm:text-[11px] font-black mt-1 tracking-tight truncate max-w-[70px]">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
