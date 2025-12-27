
import React, { useState } from 'react';
import { supabase, isSupabaseConfigured } from '../../services/supabaseClient';
import Spinner from '../Spinner';
import { Logo } from '../common/Logo';

interface AuthPageProps {
  onGoHome: () => void;
}

const GoogleIcon = () => (
    <svg className="w-5 h-5" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M43.611 20.083H42V20H24V28H35.303C33.674 32.69 29.232 36 24 36C17.373 36 12 30.627 12 24C12 17.373 17.373 12 24 12C27.128 12 29.938 13.189 32.126 15.01L38.288 8.848C34.692 5.652 29.692 3.5 24 3.5C13.438 3.5 5 12.062 5 24C5 35.938 13.438 44.5 24 44.5C34.563 44.5 43.156 35.938 43.156 24C43.156 22.693 43.438 21.365 43.611 20.083Z" fill="#FFC107"/>
        <path d="M6.306 14.691L12.422 19.119C14.34 14.863 18.784 12 24 12C27.128 12 29.938 13.189 32.126 15.01L38.288 8.848C34.692 5.652 29.692 3.5 24 3.5C17.437 3.5 11.562 7.062 7.562 12.25L6.306 14.691Z" fill="#FF3D00"/>
        <path d="M24 44.5C29.438 44.5 34.219 42.125 37.938 38.375L32.25 33.5C30.219 35.125 27.25 36 24 36C18.784 36 14.34 33.137 12.422 28.881L6.306 33.309C10.125 39.938 16.562 44.5 24 44.5Z" fill="#4CAF50"/>
        <path d="M43.611 20.083H42V20H24V28H35.303C34.51 30.228 33.061 32.094 31.232 33.344L37.495 39.608C42.125 35.031 44.5 28.625 44.5 21.5C44.5 20.5 44.344 19.5 44.156 18.531L43.611 20.083Z" fill="#1976D2"/>
    </svg>
);

const MailIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
);

const LockIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
);

const AuthPage: React.FC<AuthPageProps> = ({ onGoHome }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  
  // Email Auth State
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    });
    if (error) {
        setError(error.message);
        setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!email || !password) {
          setError("Vui lòng nhập đầy đủ email và mật khẩu.");
          return;
      }
      
      setLoading(true);
      setError(null);
      setSuccessMsg(null);

      try {
          if (authMode === 'signup') {
              const { error } = await supabase.auth.signUp({
                  email,
                  password,
                  options: {
                      emailRedirectTo: window.location.origin
                  }
              });
              if (error) throw error;
              setSuccessMsg("Đăng ký thành công! Vui lòng kiểm tra email để xác nhận tài khoản.");
          } else {
              const { error } = await supabase.auth.signInWithPassword({
                  email,
                  password
              });
              if (error) throw error;
              // Redirect happens automatically via onAuthStateChange in App.tsx
          }
      } catch (err: any) {
          setError(err.message || "Đã xảy ra lỗi xác thực.");
      } finally {
          setLoading(false);
      }
  };

  return (
    <div className="min-h-screen bg-main-bg dark:bg-[#0F0F0F] flex flex-col items-center justify-center p-4 relative font-sans transition-colors duration-300">
        <button onClick={onGoHome} className="absolute top-6 left-6 text-text-secondary dark:text-gray-400 hover:text-accent transition-colors flex items-center gap-2 font-medium">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
            Quay lại trang chủ
        </button>

        <div className="w-full max-w-md">
            <div className="flex flex-col items-center mb-8 animate-fade-in">
                 <Logo className="w-16 h-16 mb-4 drop-shadow-2xl" />
                <h1 className="text-text-primary dark:text-white text-3xl font-extrabold mb-1 tracking-tight">OPZEN AI</h1>
                <p className="text-text-secondary dark:text-gray-400 text-center text-sm font-medium opacity-80">Kiến tạo không gian với AI</p>
            </div>
            
            <div className="bg-surface dark:bg-[#191919] p-8 rounded-3xl shadow-2xl border border-border-color dark:border-[#302839] relative overflow-hidden">
                <div className="text-center mb-6">
                    <h2 className="text-2xl font-bold text-text-primary dark:text-white">
                        {authMode === 'signin' ? 'Đăng nhập' : 'Đăng ký tài khoản'}
                    </h2>
                    <p className="text-sm text-text-secondary dark:text-gray-400 mt-2">
                        {authMode === 'signin' ? 'Chào mừng bạn trở lại!' : 'Tạo tài khoản để bắt đầu sáng tạo'}
                    </p>
                </div>
                
                {!isSupabaseConfigured && (
                    <div className="mb-6 p-4 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800 dark:bg-yellow-900/30 dark:border-yellow-500 dark:text-yellow-300 rounded-r-lg text-left">
                        <p className="font-bold text-sm">Cấu hình chưa hoàn tất!</p>
                        <p className="text-xs">Chức năng đăng nhập hiện chưa khả dụng.</p>
                    </div>
                )}
                
                {error && <div className="mb-6 p-3 bg-red-100 border border-red-400 text-red-700 dark:bg-red-900/20 dark:border-red-500 dark:text-red-400 rounded-xl text-sm text-left animate-shake">{error}</div>}
                {successMsg && <div className="mb-6 p-3 bg-green-100 border border-green-400 text-green-700 dark:bg-green-900/20 dark:border-green-500 dark:text-green-400 rounded-xl text-sm text-left">{successMsg}</div>}

                {/* EMAIL FORM */}
                <form onSubmit={handleEmailAuth} className="space-y-4 mb-6">
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <MailIcon />
                        </div>
                        <input
                            type="email"
                            placeholder="Email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-white dark:bg-[#252525] border border-gray-300 dark:border-[#333] text-gray-900 dark:text-white text-sm rounded-xl focus:ring-[#7f13ec] focus:border-[#7f13ec] block w-full pl-10 p-3 outline-none transition-all"
                            required
                        />
                    </div>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <LockIcon />
                        </div>
                        <input
                            type="password"
                            placeholder="Mật khẩu"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-white dark:bg-[#252525] border border-gray-300 dark:border-[#333] text-gray-900 dark:text-white text-sm rounded-xl focus:ring-[#7f13ec] focus:border-[#7f13ec] block w-full pl-10 p-3 outline-none transition-all"
                            required
                            minLength={6}
                        />
                    </div>
                    
                    <button
                        type="submit"
                        disabled={loading || !isSupabaseConfigured}
                        className="w-full flex justify-center items-center bg-[#7f13ec] hover:bg-[#690fca] text-white font-bold py-3.5 px-4 rounded-xl transition-all duration-200 shadow-lg shadow-purple-500/20 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {loading ? <Spinner /> : (authMode === 'signin' ? 'Đăng nhập' : 'Đăng ký')}
                    </button>
                </form>

                <div className="relative flex py-2 items-center">
                    <div className="flex-grow border-t border-gray-300 dark:border-gray-700"></div>
                    <span className="flex-shrink-0 mx-4 text-xs text-gray-400">Hoặc tiếp tục với</span>
                    <div className="flex-grow border-t border-gray-300 dark:border-gray-700"></div>
                </div>

                {/* GOOGLE LOGIN */}
                <div className="space-y-4 mt-4">
                    <button
                        onClick={handleGoogleSignIn}
                        disabled={loading || !isSupabaseConfigured}
                        className="w-full flex justify-center items-center gap-3 bg-white dark:bg-[#252525] hover:bg-gray-50 dark:hover:bg-[#2a2a2a] text-gray-700 dark:text-gray-200 font-bold py-3.5 px-4 rounded-xl transition-all duration-200 border border-gray-300 dark:border-[#333] shadow-sm group"
                    >
                        <GoogleIcon />
                        <span className="text-sm sm:text-base group-hover:text-[#7f13ec] transition-colors">Google</span>
                    </button>
                </div>

                {/* TOGGLE MODE */}
                <div className="mt-6 text-center">
                    <p className="text-sm text-text-secondary dark:text-gray-400">
                        {authMode === 'signin' ? 'Chưa có tài khoản?' : 'Đã có tài khoản?'}
                        <button 
                            onClick={() => {
                                setAuthMode(authMode === 'signin' ? 'signup' : 'signin');
                                setError(null);
                                setSuccessMsg(null);
                            }}
                            className="ml-1 text-[#7f13ec] hover:underline font-semibold focus:outline-none"
                        >
                            {authMode === 'signin' ? 'Đăng ký ngay' : 'Đăng nhập'}
                        </button>
                    </p>
                </div>
            </div>
            
            <p className="text-center text-[10px] text-text-secondary dark:text-gray-500 mt-8 leading-relaxed px-4 opacity-60">
                Bằng việc tiếp tục, bạn đồng ý với <a href="/terms-of-service" className="underline hover:text-[#7f13ec] transition-colors">Điều khoản dịch vụ</a> & <a href="#" className="underline hover:text-[#7f13ec] transition-colors">Chính sách bảo mật</a> của OPZEN AI.
            </p>
        </div>
        <style>{`
            @keyframes shake {
                0%, 100% { transform: translateX(0); }
                25% { transform: translateX(-5px); }
                75% { transform: translateX(5px); }
            }
            .animate-shake { animation: shake 0.2s ease-in-out 0s 2; }
        `}</style>
    </div>
  );
};

export default AuthPage;
