
import React, { useState } from 'react';
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

const AuthPage: React.FC<AuthPageProps> = ({ onGoHome }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
  }

  return (
    <div className="min-h-screen bg-main-bg dark:bg-gray-900 flex flex-col items-center justify-center p-4 relative font-sans">
        <button onClick={onGoHome} className="absolute top-4 left-4 text-text-secondary dark:text-gray-400 hover:text-accent transition-colors flex items-center gap-2 text-sm font-medium">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
            Quay lại trang chủ
        </button>
        <div className="w-full max-w-md text-center">
            <div className="flex justify-center items-center mb-8">
                 <Logo className="w-16 h-16 mr-3" />
                <span className="text-text-primary dark:text-white text-3xl font-bold tracking-tight">OPZEN AI</span>
            </div>
            
            <div className="bg-surface dark:bg-dark-bg p-8 rounded-2xl shadow-2xl border border-border-color dark:border-gray-700">
                <h3 className="text-xl font-bold text-text-primary dark:text-white mb-2">Đăng nhập để tiếp tục</h3>
                <p className="text-text-secondary dark:text-gray-400 text-sm mb-8">Sử dụng tài khoản Google của bạn để truy cập.</p>

                {error && <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 text-red-600 dark:text-red-400 rounded-lg text-sm">{error}</div>}
                
                {!isSupabaseConfigured && (
                    <div className="mb-6 p-3 bg-yellow-50 border border-yellow-200 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-200 rounded-lg text-xs text-center">
                        Chưa cấu hình Supabase Key. Đăng nhập Google có thể không hoạt động.
                    </div>
                )}

                <button
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  className="w-full flex justify-center items-center gap-3 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-white font-semibold py-3.5 px-4 rounded-xl transition-all duration-200 border border-gray-200 dark:border-gray-600 shadow-sm disabled:opacity-50"
                >
                    {loading ? <Spinner /> : (
                        <>
                            <GoogleIcon />
                            <span>Tiếp tục với Google</span>
                        </>
                    )}
                </button>
            </div>
            
            <p className="mt-8 text-center text-xs text-text-secondary dark:text-gray-500 max-w-sm mx-auto">
                Bằng việc đăng nhập, bạn đồng ý với Điều khoản dịch vụ và Chính sách bảo mật của OPZEN AI.
            </p>
        </div>
    </div>
  );
};

export default AuthPage;
