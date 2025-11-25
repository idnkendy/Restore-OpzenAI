
import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from './services/supabaseClient';
import { Tool, FileData, UserStatus } from './types';
import Header from './components/Header';
import Navigation from './components/Navigation';
import HistoryPanel from './components/HistoryPanel';
import UserProfile from './components/UserProfile';
import { initialToolStates, ToolStates } from './state/toolState';
import Homepage from './components/Homepage';
import AuthPage from './components/auth/AuthPage';
import Spinner from './components/Spinner';
import PublicPricing from './components/PublicPricing';
import { getUserStatus, deductCredits } from './services/paymentService';
import * as jobService from './services/jobService';

// --- LAZY LOAD HEAVY COMPONENTS ---
// This splits the code into smaller chunks, so the user doesn't download everything at start.
const ImageGenerator = React.lazy(() => import('./components/ImageGenerator'));
const VideoGenerator = React.lazy(() => import('./components/VideoGenerator'));
const ImageEditor = React.lazy(() => import('./components/ImageEditor'));
const ViewSync = React.lazy(() => import('./components/ViewSync'));
const VirtualTour = React.lazy(() => import('./components/VirtualTour'));
const Renovation = React.lazy(() => import('./components/Renovation'));
const FloorPlan = React.lazy(() => import('./components/FloorPlan'));
const UrbanPlanning = React.lazy(() => import('./components/UrbanPlanning'));
const LandscapeRendering = React.lazy(() => import('./components/LandscapeRendering'));
const MaterialSwapper = React.lazy(() => import('./components/MaterialSwapper'));
const Staging = React.lazy(() => import('./components/Staging'));
const Upscale = React.lazy(() => import('./components/Upscale'));
const InteriorGenerator = React.lazy(() => import('./components/InteriorGenerator'));
const MoodboardGenerator = React.lazy(() => import('./components/MoodboardGenerator'));
const PromptSuggester = React.lazy(() => import('./components/PromptSuggester'));
const PromptEnhancer = React.lazy(() => import('./components/PromptEnhancer'));
const AITechnicalDrawings = React.lazy(() => import('./components/AITechnicalDrawings'));
const SketchConverter = React.lazy(() => import('./components/SketchConverter'));
const FengShui = React.lazy(() => import('./components/FengShui'));
const LuBanRuler = React.lazy(() => import('./components/LuBanRuler'));

const App: React.FC = () => {
  const [view, setView] = useState<'homepage' | 'auth' | 'app' | 'pricing'>('homepage');
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [session, setSession] = useState<Session | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [activeTool, setActiveTool] = useState<Tool>(Tool.ArchitecturalRendering);
  const [toolStates, setToolStates] = useState<ToolStates>(initialToolStates);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark'); // Default to dark mode
  const [userStatus, setUserStatus] = useState<UserStatus | null>(null);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  // Check for pending tab focus to auto-login after email verification
  useEffect(() => {
    const handleFocus = async () => {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        if (currentSession) {
            setSession(currentSession);
            if (view !== 'app') setView('app');
        }
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('visibilitychange', handleFocus);

    return () => {
        window.removeEventListener('focus', handleFocus);
        window.removeEventListener('visibilitychange', handleFocus);
    };
  }, [view]);

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
  }, [theme]);

  // Logic xác thực quan trọng: Xử lý OAuth redirect và session persistence
  useEffect(() => {
    const initSession = async () => {
        setLoadingSession(true);
        // supabase.auth.getSession() automatically parses the URL hash for session data
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        
        if (initialSession) {
            setSession(initialSession);
            // Force view to 'app' if session exists, fixing white screen on redirect
            setView('app'); 
        }
        setLoadingSession(false);
    };

    initSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
          // If we just got a session and we were loading or on auth, go to app
          setView('app');
      }
      setLoadingSession(false);
    });

    return () => subscription.unsubscribe();
  }, []); 

  // Define fetchUserStatus using useCallback to be stable
  const fetchUserStatus = useCallback(async () => {
    if (session?.user) {
      // OPTIMIZATION: Run cleanup in background (fire and forget). 
      // Do NOT await this, so the UI loads faster.
      jobService.cleanupStaleJobs(session.user.id).catch(err => console.warn("Background cleanup warning:", err));
      
      // Pass email to ensure it's saved in DB
      const status = await getUserStatus(session.user.id, session.user.email);
      setUserStatus(status);
    } else {
      setUserStatus(null);
    }
  }, [session]);

  // Fetch credits when session changes or active tool changes
  useEffect(() => {
    fetchUserStatus();
  }, [fetchUserStatus, activeTool]); 
  
  const handleDeductCredits = async (amount: number, description?: string): Promise<string> => {
      if (!session?.user) throw new Error("Vui lòng đăng nhập để sử dụng.");
      const logId = await deductCredits(session.user.id, amount, description);
      await fetchUserStatus(); // Refresh UI
      return logId;
  };

  const handleThemeToggle = () => {
    setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
  };
  
  const handleAuthNavigate = (mode: 'login' | 'signup') => {
    setAuthMode(mode);
    setView('auth');
  };

  const handleStartDesigning = () => {
    if (session) {
        setView('app');
    } else {
        handleAuthNavigate('login');
    }
  };

  // New handler to navigate to specific tool from Homepage
  const handleNavigateToTool = (tool: Tool) => {
      setActiveTool(tool);
      if (session) {
          setView('app');
      } else {
          handleAuthNavigate('login');
      }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setView('homepage');
    setSession(null);
  };
  
  const handleGoHome = () => {
    setView('homepage');
  }

  const handleOpenGallery = () => {
      if (session) {
          setView('app');
          setActiveTool(Tool.History);
      }
  }

  const handleToolStateChange = <T extends keyof ToolStates>(
    tool: T,
    newState: Partial<ToolStates[T]>
  ) => {
    setToolStates(prev => ({
      ...prev,
      [tool]: {
        ...prev[tool],
        ...newState,
      },
    }));
  };

  const handleUpgrade = () => {
      if (session) {
          setView('app');
          setActiveTool(Tool.Pricing);
          handleToolStateChange(Tool.Pricing, { activeTab: 'profile' }); // Modified to default to profile
      } else {
          // If not logged in, go to public pricing page
          setView('pricing');
      }
  }
  
  const handleOpenProfile = () => {
      if (session) {
          setView('app');
          setActiveTool(Tool.Pricing);
          // Updated: Default to 'profile' when opening profile from header
          handleToolStateChange(Tool.Pricing, { activeTab: 'profile' });
      }
  }

  const handleSendToViewSync = (image: FileData) => {
     handleToolStateChange(Tool.ViewSync, {
        sourceImage: image,
        resultImages: [], // Clear previous results
        error: null,
        customPrompt: '', // Clear any old prompt
     });
    setActiveTool(Tool.ViewSync);
  };
  
  const handleSendToViewSyncWithPrompt = (image: FileData, prompt: string) => {
     handleToolStateChange(Tool.ViewSync, {
        sourceImage: image,
        customPrompt: prompt, // Set the prompt from suggester
        resultImages: [],
        error: null,
        selectedPerspective: 'default',
        selectedAtmosphere: 'default',
        selectedFraming: 'none',
        sceneType: 'exterior'
     });
    setActiveTool(Tool.ViewSync);
  };
  
  const userCredits = userStatus?.credits || 0;

  const renderTool = () => {
    const commonProps = {
        userCredits,
        onDeductCredits: handleDeductCredits
    };

    switch (activeTool) {
      case Tool.FloorPlan:
        return <FloorPlan 
            state={toolStates.FloorPlan}
            onStateChange={(newState) => handleToolStateChange(Tool.FloorPlan, newState)}
            {...commonProps}
        />;
      case Tool.Renovation:
        return <Renovation 
            state={toolStates.Renovation}
            onStateChange={(newState) => handleToolStateChange(Tool.Renovation, newState)}
            {...commonProps}
        />;
      case Tool.ArchitecturalRendering:
        return <ImageGenerator 
            state={toolStates.ArchitecturalRendering}
            onStateChange={(newState) => handleToolStateChange(Tool.ArchitecturalRendering, newState)}
            onSendToViewSync={handleSendToViewSync} 
            {...commonProps}
        />;
      case Tool.InteriorRendering:
        return <InteriorGenerator
            state={toolStates.InteriorRendering}
            onStateChange={(newState) => handleToolStateChange(Tool.InteriorRendering, newState)}
            onSendToViewSync={handleSendToViewSync} 
            {...commonProps}
        />;
      case Tool.UrbanPlanning:
        return <UrbanPlanning
            state={toolStates.UrbanPlanning}
            onStateChange={(newState) => handleToolStateChange(Tool.UrbanPlanning, newState)}
            onSendToViewSync={handleSendToViewSync}
            {...commonProps}
        />;
      case Tool.LandscapeRendering:
        return <LandscapeRendering
            state={toolStates.LandscapeRendering}
            onStateChange={(newState) => handleToolStateChange(Tool.LandscapeRendering, newState)}
            onSendToViewSync={handleSendToViewSync}
            {...commonProps}
        />;
      case Tool.AITechnicalDrawings:
        return <AITechnicalDrawings
            state={toolStates.AITechnicalDrawings}
            onStateChange={(newState) => handleToolStateChange(Tool.AITechnicalDrawings, newState)}
            {...commonProps}
        />;
      case Tool.SketchConverter:
        return <SketchConverter
            state={toolStates.SketchConverter}
            onStateChange={(newState) => handleToolStateChange(Tool.SketchConverter, newState)}
            {...commonProps}
        />;
      case Tool.FengShui:
        return <FengShui
            state={toolStates.FengShui}
            onStateChange={(newState) => handleToolStateChange(Tool.FengShui, newState)}
            {...commonProps}
        />;
      case Tool.LuBanRuler:
        return <LuBanRuler 
            state={toolStates.LuBanRuler}
            onStateChange={(newState) => handleToolStateChange(Tool.LuBanRuler, newState)}
        />;
      case Tool.ViewSync:
        return <ViewSync 
            state={toolStates.ViewSync}
            onStateChange={(newState) => handleToolStateChange(Tool.ViewSync, newState)}
            {...commonProps}
        />;
      case Tool.VirtualTour:
        return <VirtualTour
            state={toolStates.VirtualTour}
            onStateChange={(newState) => handleToolStateChange(Tool.VirtualTour, newState)}
            {...commonProps}
        />;
      case Tool.PromptSuggester:
        return <PromptSuggester
            state={toolStates.PromptSuggester}
            onStateChange={(newState) => handleToolStateChange(Tool.PromptSuggester, newState)}
            onSendToViewSyncWithPrompt={handleSendToViewSyncWithPrompt}
        />;
       case Tool.PromptEnhancer:
        return <PromptEnhancer
            state={toolStates.PromptEnhancer}
            onStateChange={(newState) => handleToolStateChange(Tool.PromptEnhancer, newState)}
        />;
      case Tool.MaterialSwap:
        return <MaterialSwapper 
            state={toolStates.MaterialSwap}
            onStateChange={(newState) => handleToolStateChange(Tool.MaterialSwap, newState)}
            {...commonProps}
        />;
      case Tool.Staging:
        return <Staging 
            state={toolStates.Staging}
            onStateChange={(newState) => handleToolStateChange(Tool.Staging, newState)}
            {...commonProps}
        />;
      case Tool.Upscale:
        return <Upscale 
            state={toolStates.Upscale}
            onStateChange={(newState) => handleToolStateChange(Tool.Upscale, newState)}
            {...commonProps}
        />;
      case Tool.Moodboard:
        return <MoodboardGenerator 
            state={toolStates.Moodboard}
            onStateChange={(newState) => handleToolStateChange(Tool.Moodboard, newState)}
            {...commonProps}
        />;
      case Tool.VideoGeneration:
        return <VideoGenerator 
            state={toolStates.VideoGeneration}
            onStateChange={(newState) => handleToolStateChange(Tool.VideoGeneration, newState)}
            {...commonProps}
        />;
      case Tool.ImageEditing:
        return <ImageEditor 
            state={toolStates.ImageEditing}
            onStateChange={(newState) => handleToolStateChange(Tool.ImageEditing, newState)}
            {...commonProps}
        />;
      case Tool.History:
        return <HistoryPanel />;
      case Tool.Pricing:
        return session ? (
            <UserProfile 
                session={session} 
                initialTab={toolStates.Pricing.activeTab || 'profile'} // Changed default to profile
                onTabChange={(tab) => handleToolStateChange(Tool.Pricing, { activeTab: tab })}
                onPurchaseSuccess={fetchUserStatus}
            /> 
        ) : null;
      default:
        return <ImageGenerator 
            state={toolStates.ArchitecturalRendering}
            onStateChange={(newState) => handleToolStateChange(Tool.ArchitecturalRendering, newState)}
            onSendToViewSync={handleSendToViewSync}
            {...commonProps}
        />;
    }
  };

  const renderLoadingState = () => (
      <div className="flex items-center justify-center h-full min-h-[400px]">
          <div className="flex flex-col items-center gap-4">
              <Spinner />
              <p className="text-text-secondary dark:text-gray-400 animate-pulse text-sm">Đang tải công cụ...</p>
          </div>
      </div>
  );

  if (loadingSession) {
    return (
      <div className="min-h-[100dvh] bg-main-bg dark:bg-[#121212] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
            <Spinner />
            <p className="text-text-secondary dark:text-gray-400 text-sm">Đang kết nối...</p>
        </div>
      </div>
    );
  }
  
  if (session) {
    if (view === 'homepage') {
        return (
            <Homepage 
                onStart={() => setView('app')} 
                onAuthNavigate={() => setView('app')} 
                session={session} 
                onGoToGallery={handleOpenGallery}
                onUpgrade={handleUpgrade}
                onOpenProfile={handleOpenProfile}
                userStatus={userStatus}
                onNavigateToTool={handleNavigateToTool}
            />
        );
    }
    // Use h-[100dvh] for mobile browser address bar compatibility
    return (
        <div className="h-[100dvh] bg-main-bg dark:bg-[#121212] font-sans text-text-primary dark:text-[#EAEAEA] flex flex-col transition-colors duration-300 overflow-hidden">
            <Header 
                onGoHome={handleGoHome} 
                onThemeToggle={handleThemeToggle} 
                theme={theme} 
                onSignOut={handleSignOut} 
                onOpenGallery={handleOpenGallery} 
                onUpgrade={handleUpgrade} 
                onOpenProfile={handleOpenProfile} 
                userStatus={userStatus}
                user={session.user}
                onToggleNav={() => setIsMobileNavOpen(!isMobileNavOpen)}
            />
            <div className="relative flex flex-col md:flex-row flex-grow overflow-hidden">
                {/* Navigation Sidebar - Responsive */}
                <Navigation 
                    activeTool={activeTool} 
                    setActiveTool={(tool) => {
                        setActiveTool(tool);
                        setIsMobileNavOpen(false); // Close on select mobile
                    }} 
                    isMobileOpen={isMobileNavOpen}
                    onCloseMobile={() => setIsMobileNavOpen(false)}
                />
                
                {/* Main Content Area */}
                <main 
                    className="flex-1 bg-surface/90 dark:bg-[#191919]/90 backdrop-blur-md md:m-6 md:ml-0 md:rounded-2xl shadow-lg border-t md:border border-border-color dark:border-[#302839] overflow-y-auto scrollbar-hide p-3 sm:p-6 lg:p-8 relative z-0 transition-colors duration-300"
                    style={{ WebkitOverflowScrolling: 'touch' }}
                >
                    <Suspense fallback={renderLoadingState()}>
                        {renderTool()}
                    </Suspense>
                </main>
            </div>
        </div>
    );
  }

  if (view === 'auth') {
    return <AuthPage onGoHome={() => setView('homepage')} initialMode={authMode} />;
  }

  if (view === 'pricing') {
      return <PublicPricing onGoHome={() => setView('homepage')} onAuthNavigate={handleAuthNavigate} />;
  }
  
  return <Homepage onStart={handleStartDesigning} onAuthNavigate={handleAuthNavigate} onNavigateToPricing={() => setView('pricing')} />;
};

export default App;
