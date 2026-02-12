
import React from 'react';
import { Home, Calendar, Plus, MessageSquare, User, ChevronLeft } from 'lucide-react';
import { AppScreen } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  activeScreen: AppScreen;
  setScreen: (screen: AppScreen) => void;
  title: string;
  subtitle?: string;
  headerAction?: React.ReactNode;
  onBack?: () => void;
  hideBottomNav?: boolean;
}

const Layout: React.FC<LayoutProps> = ({ 
  children, 
  activeScreen, 
  setScreen, 
  title, 
  subtitle,
  headerAction,
  onBack,
  hideBottomNav = false
}) => {
  const isAuthScreen = [AppScreen.WELCOME, AppScreen.REGISTER].includes(activeScreen);

  if (isAuthScreen) {
    return <div className="h-[100dvh] w-full bg-slate-50">{children}</div>;
  }

  const isHome = activeScreen === AppScreen.HOME;

  return (
    <div className="flex flex-col h-[100dvh] w-full bg-slate-50 relative sm:max-w-md sm:mx-auto sm:h-[90vh] sm:my-auto sm:rounded-[40px] sm:shadow-2xl overflow-hidden transition-all duration-300">
      
      <header className="bg-white/90 backdrop-blur-lg border-b border-slate-100 px-4 pb-3 pt-safe sticky top-0 z-30 flex items-center justify-between shrink-0">
        <div className="flex items-center w-12">
          {onBack ? (
            <button 
              onClick={onBack}
              className="p-2 -ml-2 text-slate-800 hover:bg-slate-100 rounded-full transition-all active:scale-90"
            >
              <ChevronLeft size={24} />
            </button>
          ) : (
            <div className="w-6" /> 
          )}
        </div>

        <div className="flex flex-col items-center justify-center flex-1 mx-2">
          <h1 className="text-base font-black text-slate-800 tracking-tight truncate max-w-[200px] text-center">
            {title}
          </h1>
          {subtitle && !isHome && (
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide truncate mt-0.5">
              {subtitle}
            </p>
          )}
        </div>

        <div className="flex items-center justify-end w-12">
          {headerAction ? (
             <div className="flex items-center justify-center">
               {headerAction}
             </div>
          ) : <div className="w-6" />}
        </div>
      </header>

      <main className={`flex-1 overflow-y-auto no-scrollbar bg-slate-50 ${hideBottomNav ? 'pb-0' : 'pb-24'}`}>
        {children}
      </main>

      {!hideBottomNav && (
        <nav className="absolute bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-2 py-3 pb-safe flex justify-around items-center z-50 shadow-[0_-10px_40px_rgba(0,0,0,0.02)]">
          <NavButton 
            active={activeScreen === AppScreen.HOME} 
            onClick={() => setScreen(AppScreen.HOME)} 
            icon={<Home size={24} strokeWidth={activeScreen === AppScreen.HOME ? 2.5 : 2} />} 
            label="Home" 
          />
          <NavButton 
            active={activeScreen === AppScreen.CALENDAR} 
            onClick={() => setScreen(AppScreen.CALENDAR)} 
            icon={<Calendar size={24} strokeWidth={activeScreen === AppScreen.CALENDAR ? 2.5 : 2} />} 
            label="Calendario" 
          />
          
          <button 
            onClick={() => setScreen(AppScreen.NEW_REQUEST)}
            className={`flex flex-col items-center justify-center -mt-8 w-14 h-14 rounded-full shadow-xl transition-all active:scale-90 ${activeScreen === AppScreen.NEW_REQUEST ? 'bg-slate-900 text-white scale-105 shadow-slate-300' : 'bg-slate-800 text-white'}`}
          >
            <Plus size={28} strokeWidth={3} />
          </button>

          <NavButton 
            active={activeScreen === AppScreen.CHATS || activeScreen === AppScreen.CHAT_ROOM} 
            onClick={() => setScreen(AppScreen.CHATS)} 
            icon={<MessageSquare size={24} strokeWidth={activeScreen === AppScreen.CHATS || activeScreen === AppScreen.CHAT_ROOM ? 2.5 : 2} />} 
            label="Chat" 
          />

          <NavButton 
            active={activeScreen === AppScreen.PROFILE} 
            onClick={() => setScreen(AppScreen.PROFILE)} 
            icon={<User size={24} strokeWidth={activeScreen === AppScreen.PROFILE ? 2.5 : 2} />} 
            label="Profilo" 
          />
        </nav>
      )}
    </div>
  );
};

interface NavButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}

const NavButton: React.FC<NavButtonProps> = ({ active, onClick, icon, label }) => (
  <button 
    onClick={onClick}
    className={`flex flex-col items-center gap-1 transition-all flex-1 py-1 active:scale-90 ${active ? 'text-indigo-600' : 'text-slate-300'}`}
  >
    <div className={`transition-transform duration-300 ${active ? 'scale-105 translate-y-[-1px]' : 'scale-100'}`}>
      {icon}
    </div>
    <span className={`text-[9px] font-bold uppercase tracking-tight ${active ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden'}`}>{label}</span>
  </button>
);

export default Layout;
