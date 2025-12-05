
import React, { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../../services/supabaseClient';
import Spinner from '../Spinner';
import { Logo } from '../common/Logo';

interface AuthPageProps {
  onGoHome: () => void;
  initialMode?: 'login' | 'signup';
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

const AuthPage: React.FC<AuthPageProps> = ({ onGoHome, initialMode = 'login' }) => {
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
      setMode(initialMode);
  }, [initialMode]);

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
          setError("Vui lòng nhập đầy đủ Email và Mật khẩu.");
          return;
      }
      
      setLoading(true);
      setError(null);
      setMessage(null);

      try {
          if (mode === 'signup') {
              const { error } = await supabase.auth.signUp({
                  email,
                  password,
                  options: {
                      emailRedirectTo: window.location.origin
                  }
              });
              if (error) throw error;
              setMessage("Đăng ký thành công! Vui lòng kiểm tra email để xác nhận tài khoản.");
          } else {
              const { error } = await supabase.auth.signInWithPassword({
                  email,
                  password
              });
              if (error) throw error;
              // Redirect handled by App.tsx listener
          }
      } catch (err: any) {
          let msg = err.message;
          if (msg.includes("Invalid login credentials")) msg = "Email hoặc mật khẩu không chính xác.";
          if (msg.includes("User already registered")) msg = "Email này đã được đăng ký.";
          if (msg.includes("Password should be")) msg = "Mật khẩu phải có ít nhất 6 ký tự.";
          setError(msg);
      } finally {
          setLoading(false);
      }
  };

  const handleForgotPassword = async () => {
      if (!email) {
          setError("Vui lòng nhập Email để đặt lại mật khẩu.");
          return;
      }
      setLoading(true);
      setError(null);
      setMessage(null);
      
      try {
          const { error } = await supabase.auth.resetPasswordForEmail(email, {
              redirectTo: `${window.location.origin}/update-password`,
          });
          if (error) throw error;
          setMessage("Đã gửi email đặt lại mật khẩu. Vui lòng kiểm tra hộp thư.");
      } catch (err: any) {
          setError(err.message || "Lỗi khi gửi yêu cầu.");
      } finally {
          setLoading(false);
      }
  };

  return (
    <div className="min-h-screen bg-main-bg dark:bg-gray-900 flex flex-col items-center justify-center p-4 relative font-sans">
        <button onClick={onGoHome} className="absolute top-4 left-4 text-text-secondary dark:text-gray-400 hover:text-accent transition-colors flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
            Quay lại trang chủ
        </button>
        <div className="w-full max-w-md">
            <div className="flex justify-center items-center mb-8">
                 <Logo className="w-20 h-20 mr-2" />
                <span className="text-text-primary dark:text-white text-4xl font-bold">OPZEN AI</span>
            </div>
            
            <div className="bg-surface dark:bg-dark-bg p-8 rounded-2xl shadow-xl border border-border-color dark:border-gray-700">
                <div className="flex justify-center mb-6 border-b border-border-color dark:border-gray-700">
                    <button
                        onClick={() => { setMode('login'); setError(null); setMessage(null); }}
                        className={`pb-3 px-6 font-semibold text-sm transition-all ${
                            mode === 'login' 
                            ? 'text-accent border-b-2 border-accent' 
                            : 'text-text-secondary dark:text-gray-400 hover:text-text-primary dark:hover:text-white'
                        }`}
                    >
                        Đăng nhập
                    </button>
                    <button
                        onClick={() => { setMode('signup'); setError(null); setMessage(null); }}
                        className={`pb-3 px-6 font-semibold text-sm transition-all ${
                            mode === 'signup' 
                            ? 'text-accent border-b-2 border-accent' 
                            : 'text-text-secondary dark:text-gray-400 hover:text-text-primary dark:hover:text-white'
                        }`}
                    >
                        Đăng ký
                    </button>
                </div>

                <h2 className="text-xl font-bold text-center text-text-primary dark:text-white mb-2">
                    {mode === 'login' ? 'Chào mừng trở lại' : 'Tạo tài khoản mới'}
                </h2>
                <p className="text-center text-text-secondary dark:text-gray-400 mb-6 text-sm">
                    {mode === 'login' 
                        ? 'Đăng nhập để tiếp tục sáng tạo.' 
                        : 'Tham gia OPZEN AI và nhận ngay 60 credits miễn phí.'}
                </p>
                
                {!isSupabaseConfigured && (
                    <div className="mb-6 p-4 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800 dark:bg-yellow-900/30 dark:border-yellow-500 dark:text-yellow-300 rounded-r-lg text-left">
                        <p className="font-bold">Cấu hình còn thiếu!</p>
                        <p className="text-sm">Chức năng đăng nhập chưa được kích hoạt.</p>
                    </div>
                )}
                
                {error && <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 dark:bg-red-900/50 dark:border-red-500 dark:text-red-300 rounded-lg text-sm text-left">{error}</div>}
                {message && <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 dark:bg-green-900/50 dark:border-green-500 dark:text-green-300 rounded-lg text-sm text-left">{message}</div>}

                <form onSubmit={handleEmailAuth} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-text-secondary dark:text-gray-400 mb-1">Email</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <MailIcon />
                            </div>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-main-bg dark:bg-gray-800 border border-border-color dark:border-gray-600 rounded-lg text-text-primary dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-accent focus:outline-none transition-all"
                                placeholder="name@example.com"
                                required
                            />
                        </div>
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-text-secondary dark:text-gray-400 mb-1">Mật khẩu</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <LockIcon />
                            </div>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-main-bg dark:bg-gray-800 border border-border-color dark:border-gray-600 rounded-lg text-text-primary dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-accent focus:outline-none transition-all"
                                placeholder="••••••••"
                                required
                                minLength={6}
                            />
                        </div>
                    </div>

                    {mode === 'login' && (
                        <div className="flex justify-end">
                            <button
                                type="button"
                                onClick={handleForgotPassword}
                                className="text-sm text-accent hover:text-accent-600 font-medium transition-colors"
                            >
                                Quên mật khẩu?
                            </button>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading || !isSupabaseConfigured}
                        className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-[#7f13ec] hover:bg-[#690fca] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {loading ? <Spinner /> : (mode === 'login' ? 'Đăng nhập' : 'Đăng ký tài khoản')}
                    </button>
                </form>

                <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gray-300 dark:border-gray-700"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                        <span className="px-2 bg-surface dark:bg-dark-bg text-text-secondary dark:text-gray-500">Hoặc tiếp tục với</span>
                    </div>
                </div>

                <button
                  onClick={handleGoogleSignIn}
                  disabled={loading || !isSupabaseConfigured}
                  className="w-full flex justify-center items-center gap-3 bg-white hover:bg-gray-50 text-gray-900 font-medium py-2.5 px-4 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed border border-gray-300 shadow-sm"
                >
                    <GoogleIcon />
                    <span className="text-sm">Google</span>
                </button>

                <p className="mt-6 text-xs text-center text-text-secondary dark:text-gray-500">
                    Bằng việc tiếp tục, bạn đồng ý với Điều khoản dịch vụ và Chính sách bảo mật của chúng tôi.
                </p>
            </div>
        </div>
    </div>
  );
};

export default AuthPage;
