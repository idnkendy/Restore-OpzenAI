
import React, { useState, useRef, useEffect } from 'react';
import { UserStatus } from '../types';
import { User } from '@supabase/supabase-js';
import { Logo } from './common/Logo';

const SunIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M12 12a5 5 0 100-10 5 5 0 000 10z" />
    </svg>
);
const MoonIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
    </svg>
);

const LogoutIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
);

const GalleryIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
);

const ProfileIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const CoinIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const CalendarIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
);

const GiftIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
    </svg>
);

const ChevronDownIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
);

interface HeaderProps {
  onGoHome: () => void;
  onThemeToggle: () => void;
  theme: 'light' | 'dark';
  onSignOut: () => void;
  onOpenGallery?: () => void;
  onUpgrade?: () => void;
  onOpenProfile?: () => void;
  userStatus?: UserStatus | null;
  user?: User | null;
  onToggleNav?: () => void;
}

const Header: React.FC<HeaderProps> = ({ onGoHome, onThemeToggle, theme, onSignOut, onOpenGallery, onUpgrade, onOpenProfile, userStatus, user, onToggleNav }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const expirationDate = userStatus?.subscriptionEnd 
    ? new Date(userStatus.subscriptionEnd).toLocaleDateString('vi-VN') 
    : 'Vĩnh viễn';

  return (
     <header className="bg-surface/80 dark:bg-[#121212]/80 backdrop-blur-md shadow-sm sticky top-0 z-40 transition-colors duration-300 px-3 sm:px-6 lg:px-8 border-b border-border-color dark:border-[#302839]">
        <nav className="flex justify-between items-center py-3">
            <div className="flex items-center gap-3 sm:gap-4">
                {/* Hamburger for Mobile */}
                <button 
                    onClick={onToggleNav} 
                    className="md:hidden text-text-secondary dark:text-gray-400 hover:text-text-primary dark:hover:text-white focus:outline-none p-1 rounded-md hover:bg-gray-100 dark:hover:bg-[#302839]"
                >
                    <span className="material-symbols-outlined text-2xl">menu</span>
                </button>

                <div className="flex items-center cursor-pointer group" onClick={onGoHome} title="Trang chủ">
                    <Logo className="w-12 h-12 sm:w-14 sm:h-14 text-[#7f13ec]" />
                    <span className="text-text-primary dark:text-white text-xl sm:text-2xl font-bold tracking-tight ml-2">OPZEN AI</span>
                </div>
            </div>
            
            <div className="flex items-center space-x-2 sm:space-x-6">
                {/* Status Display - External */}
                {!isDropdownOpen && userStatus && (
                    <div className="flex items-center gap-3">
                         {/* Credits - Hidden on extra small screens, visible on small+ */}
                        <div 
                            className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-purple-50 dark:bg-[#2a1a35] text-purple-700 dark:text-[#DA70D6] rounded-full text-sm font-semibold border border-purple-200 dark:border-[#DA70D6]/30 cursor-default transition-colors" 
                            title="Số dư Credits"
                        >
                            <CoinIcon />
                            <span>{userStatus.credits}</span>
                        </div>
                    </div>
                )}

                <button 
                    onClick={onThemeToggle} 
                    className="p-2 rounded-full text-text-secondary dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#302839] hover:text-text-primary dark:hover:text-white transition-all" 
                    aria-label="Toggle theme"
                >
                    {theme === 'light' ? <MoonIcon /> : <SunIcon />}
                </button>
                
                {/* User Avatar Dropdown */}
                <div className="relative" ref={dropdownRef}>
                    <button 
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        className="flex items-center gap-1 sm:gap-2 focus:outline-none"
                    >
                        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-tr from-[#8A2BE2] to-[#DA70D6] flex items-center justify-center text-white shadow-md ring-2 ring-white dark:ring-[#191919]">
                            <span className="text-xs font-bold">{user?.email?.[0].toUpperCase()}</span>
                        </div>
                        <ChevronDownIcon />
                    </button>

                    {isDropdownOpen && (
                        <div className="absolute right-0 mt-3 w-72 bg-surface dark:bg-[#191919] rounded-xl shadow-2xl border border-border-color dark:border-[#302839] py-1 z-50 animate-fade-in origin-top-right">
                            <div className="px-5 py-4 border-b border-border-color dark:border-[#302839] bg-gray-50 dark:bg-[#202020]">
                                {user ? (
                                    <div className="mb-3">
                                        <p className="text-sm font-bold text-text-primary dark:text-white truncate">
                                            {user.user_metadata?.full_name || user.email?.split('@')[0] || 'Người dùng'}
                                        </p>
                                        <p className="text-xs text-text-secondary dark:text-gray-400 truncate">
                                            {user.email}
                                        </p>
                                    </div>
                                ) : (
                                    <p className="text-sm font-bold text-text-primary dark:text-white mb-2">Tài khoản</p>
                                )}
                                
                                {/* Credit & Expiration Display - Internal */}
                                {userStatus && (
                                    <div className="space-y-2 mt-3">
                                        <div className="flex items-center justify-between text-sm text-purple-700 dark:text-[#DA70D6] font-semibold bg-purple-50 dark:bg-[#2a1a35] px-3 py-2 rounded-lg border border-purple-200 dark:border-[#DA70D6]/30">
                                             <div className="flex items-center gap-2">
                                                 <CoinIcon />
                                                 <span>Credits</span>
                                             </div>
                                             <span>{userStatus.credits}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-xs text-text-secondary dark:text-gray-400 px-1">
                                             <div className="flex items-center gap-2">
                                                 <CalendarIcon />
                                                 <span>Hết hạn:</span>
                                             </div>
                                             <span className="font-medium text-text-primary dark:text-white">{expirationDate}</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                            
                            <div className="py-1">
                                {onOpenProfile && (
                                    <>
                                        <button 
                                            onClick={() => { onOpenProfile(); setIsDropdownOpen(false); }}
                                            className="w-full text-left px-4 py-2.5 text-sm text-text-secondary dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#302839] hover:text-text-primary dark:hover:text-white flex items-center gap-3"
                                        >
                                            <GiftIcon /> Nhập Giftcode
                                        </button>
                                        <button 
                                            onClick={() => { onOpenProfile(); setIsDropdownOpen(false); }}
                                            className="w-full text-left px-4 py-2.5 text-sm text-text-secondary dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#302839] hover:text-text-primary dark:hover:text-white flex items-center gap-3"
                                        >
                                            <ProfileIcon /> Hồ sơ cá nhân
                                        </button>
                                    </>
                                )}

                                {onOpenGallery && (
                                    <button 
                                        onClick={() => { onOpenGallery(); setIsDropdownOpen(false); }}
                                        className="w-full text-left px-4 py-2.5 text-sm text-text-secondary dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#302839] hover:text-text-primary dark:hover:text-white flex items-center gap-3"
                                    >
                                        <GalleryIcon /> Thư viện của tôi
                                    </button>
                                )}
                            </div>
                            
                            <div className="border-t border-border-color dark:border-[#302839] my-1"></div>
                            
                            <button 
                                onClick={onSignOut}
                                className="w-full text-left px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-[#302839] flex items-center gap-3 rounded-b-lg"
                            >
                                <LogoutIcon /> Đăng xuất
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </nav>
    </header>
  );
};

export default Header;
