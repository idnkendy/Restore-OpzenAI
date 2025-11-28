
import React, { useState, useEffect } from 'react';
import { Session } from '@supabase/supabase-js';
import { PricingPlan, Transaction } from '../types';
import * as paymentService from '../services/paymentService';
import Spinner from './Spinner';
import Checkout from './Checkout'; // Import Checkout component

const UserIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 md:h-20 md:w-20 text-gray-400 bg-gray-200 rounded-full p-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
);

const GiftIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M5 5a3 3 0 015-2.236A3 3 0 0114.83 6H16a2 2 0 110 4h-5V9a1 1 0 10-2 0v1H4a2 2 0 110-4h1.17C5.06 5.687 5 5.35 5 5zm4 1V5a1 1 0 10-1 1h1zm3 0a1 1 0 10-1-1v1h1z" clipRule="evenodd" />
        <path d="M9 11H3v5a2 2 0 002 2h4v-7zM11 18h4a2 2 0 002-2v-5h-6v7z" />
    </svg>
);

const CoinIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

interface UserProfileProps {
    session: Session;
    initialTab?: 'profile' | 'plans' | 'history';
    onTabChange: (tab: 'profile' | 'plans' | 'history') => void;
    onPurchaseSuccess?: () => void;
}

const UserProfile: React.FC<UserProfileProps> = ({ session, initialTab = 'profile', onTabChange, onPurchaseSuccess }) => {
    // Changed default to 'profile'
    const [activeTab, setActiveTab] = useState<'profile' | 'plans' | 'history'>(initialTab === 'plans' ? 'profile' : initialTab);
    
    // History State
    const [transactionHistory, setTransactionHistory] = useState<Transaction[]>([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);

    // Giftcode State
    const [giftCode, setGiftCode] = useState('');
    const [isRedeeming, setIsRedeeming] = useState(false);
    const [redeemStatus, setRedeemStatus] = useState<{type: 'success' | 'error', msg: string} | null>(null);
    
    // Additional User Info State
    const [subscriptionEnd, setSubscriptionEnd] = useState<string | null>(null);

    useEffect(() => {
        // Fallback to profile if plans is requested but hidden
        setActiveTab(initialTab === 'plans' ? 'profile' : initialTab);
    }, [initialTab]);

    useEffect(() => {
        if (activeTab === 'history') {
            loadHistory();
        }
    }, [activeTab]);
    
    useEffect(() => {
        const loadUserStatus = async () => {
            const status = await paymentService.getUserStatus(session.user.id);
            setSubscriptionEnd(status.subscriptionEnd);
        };
        loadUserStatus();
    }, [session.user.id]);

    const loadHistory = async () => {
        setIsLoadingHistory(true);
        try {
            const history = await paymentService.getTransactionHistory();
            setTransactionHistory(history);
        } catch (error) {
            console.error("Failed to load transactions", error);
        } finally {
            setIsLoadingHistory(false);
        }
    };

    const handleTabClick = (tab: 'profile' | 'plans' | 'history') => {
        setActiveTab(tab);
        onTabChange(tab);
    };

    const handleRedeemCode = async () => {
        if (!giftCode.trim()) return;
        
        setIsRedeeming(true);
        setRedeemStatus(null);

        try {
            const creditsAdded = await paymentService.redeemGiftCode(session.user.id, giftCode);
            setRedeemStatus({
                type: 'success',
                msg: `Thành công! Bạn đã nhận được ${creditsAdded} credits.`
            });
            setGiftCode('');
            // Update expiration date locally if giftcode extended it (though redeem usually adds credits, some logic might change dates)
            const status = await paymentService.getUserStatus(session.user.id);
            setSubscriptionEnd(status.subscriptionEnd);
            
            if (onPurchaseSuccess) onPurchaseSuccess(); // Refresh credits in header
        } catch (err: any) {
            setRedeemStatus({
                type: 'error',
                msg: err.message || "Mã không hợp lệ hoặc lỗi hệ thống."
            });
        } finally {
            setIsRedeeming(false);
        }
    };

    // Mock Profile Data
    const userEmail = session.user.email;
    const userName = session.user.user_metadata?.full_name || "Người dùng OPZEN AI";
    
    // Fix for potentially invalid date handling
    let joinDate = 'N/A';
    try {
        joinDate = new Date(session.user.created_at).toLocaleDateString('vi-VN');
    } catch (e) {
        console.error("Invalid join date", e);
    }

    const expirationDateString = subscriptionEnd ? new Date(subscriptionEnd).toLocaleDateString('vi-VN') : 'Vĩnh viễn';

    return (
        <div className="flex flex-col lg:flex-row gap-6 h-full max-h-[calc(100vh-100px)]">
            {/* Sidebar */}
            <div className="lg:w-1/4 bg-surface dark:bg-dark-bg rounded-xl shadow-sm border border-border-color dark:border-gray-700 p-6 flex flex-col items-center text-center h-fit flex-shrink-0">
                <div className="mb-4">
                    <UserIcon />
                </div>
                <h2 className="text-xl font-bold text-text-primary dark:text-white">{userName}</h2>
                <p className="text-sm text-text-secondary dark:text-gray-400 mb-6 truncate max-w-full">{userEmail}</p>
                
                {/* Mobile: Horizontal Scroll, Desktop: Vertical Stack */}
                <div className="w-full flex lg:flex-col gap-2 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0">
                    <button 
                        onClick={() => handleTabClick('profile')}
                        className={`flex-shrink-0 w-auto lg:w-full text-left px-4 py-2 rounded-lg transition-colors whitespace-nowrap ${activeTab === 'profile' ? 'bg-accent text-white' : 'text-text-secondary dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                    >
                        Thông tin tài khoản
                    </button>
                    
                    <button 
                        onClick={() => handleTabClick('history')}
                        className={`flex-shrink-0 w-auto lg:w-full text-left px-4 py-2 rounded-lg transition-colors whitespace-nowrap ${activeTab === 'history' ? 'bg-accent text-white' : 'text-text-secondary dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                    >
                        Lịch sử giao dịch
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div className="lg:w-3/4 bg-surface dark:bg-dark-bg rounded-xl shadow-sm border border-border-color dark:border-gray-700 p-4 sm:p-6 lg:p-8 overflow-y-auto scrollbar-hide flex-grow h-full">
                
                {/* === TAB: PROFILE === */}
                {activeTab === 'profile' && (
                    <div className="space-y-8 animate-fade-in">
                        <div>
                            <h3 className="text-2xl font-bold text-text-primary dark:text-white mb-4">Thông tin tài khoản</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-text-secondary dark:text-gray-400 mb-1">Họ và tên</label>
                                    <input type="text" value={userName} disabled className="w-full bg-main-bg dark:bg-gray-800 border border-border-color dark:border-gray-600 rounded-lg p-3 text-text-primary dark:text-gray-300 opacity-70" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-text-secondary dark:text-gray-400 mb-1">Email</label>
                                    <input type="email" value={userEmail} disabled className="w-full bg-main-bg dark:bg-gray-800 border border-border-color dark:border-gray-600 rounded-lg p-3 text-text-primary dark:text-gray-300 opacity-70" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-text-secondary dark:text-gray-400 mb-1">Ngày tham gia</label>
                                    <input type="text" value={joinDate} disabled className="w-full bg-main-bg dark:bg-gray-800 border border-border-color dark:border-gray-600 rounded-lg p-3 text-text-primary dark:text-gray-300 opacity-70" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-text-secondary dark:text-gray-400 mb-1">Ngày hết hạn</label>
                                    <input type="text" value={expirationDateString} disabled className="w-full bg-main-bg dark:bg-gray-800 border border-border-color dark:border-gray-600 rounded-lg p-3 text-text-primary dark:text-gray-300 opacity-70 font-semibold text-purple-600 dark:text-purple-400" />
                                </div>
                            </div>
                        </div>

                        {/* GIFT CODE SECTION */}
                        <div className="pt-6 border-t border-border-color dark:border-gray-700">
                            <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 p-6 rounded-xl border border-purple-100 dark:border-purple-800/50">
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="bg-white dark:bg-gray-800 p-2 rounded-full shadow-sm">
                                        <div className="text-purple-600 dark:text-purple-400">
                                            <GiftIcon />
                                        </div>
                                    </div>
                                    <h4 className="font-bold text-lg text-text-primary dark:text-white">Nhập mã quà tặng (Giftcode)</h4>
                                </div>
                                
                                <div className="flex flex-col sm:flex-row gap-3">
                                    <input 
                                        type="text" 
                                        value={giftCode}
                                        onChange={(e) => setGiftCode(e.target.value.toUpperCase())}
                                        placeholder="Nhập mã của bạn"
                                        className="flex-grow bg-white dark:bg-gray-800 border border-border-color dark:border-gray-600 rounded-lg p-3 text-text-primary dark:text-white focus:ring-2 focus:ring-accent focus:outline-none uppercase placeholder:normal-case"
                                        disabled={isRedeeming}
                                    />
                                    <button 
                                        onClick={handleRedeemCode}
                                        disabled={!giftCode.trim() || isRedeeming}
                                        className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2 min-w-[120px]"
                                    >
                                        {isRedeeming ? <Spinner /> : 'Áp dụng'}
                                    </button>
                                </div>
                                
                                {redeemStatus && (
                                    <div className={`mt-3 text-sm flex items-center gap-2 ${redeemStatus.type === 'success' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                        {redeemStatus.type === 'success' ? (
                                            <CoinIcon />
                                        ) : (
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                            </svg>
                                        )}
                                        {redeemStatus.msg}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="pt-6 border-t border-border-color dark:border-gray-700">
                            <h4 className="font-semibold text-text-primary dark:text-white mb-2">Bảo mật</h4>
                            <button className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-text-primary dark:text-white rounded-lg transition-colors text-sm">
                                Đổi mật khẩu
                            </button>
                        </div>
                    </div>
                )}

                {/* === TAB: HISTORY === */}
                {activeTab === 'history' && (
                    <div className="space-y-6 animate-fade-in">
                        <h3 className="text-2xl font-bold text-text-primary dark:text-white mb-4">Lịch sử giao dịch</h3>
                        
                        {isLoadingHistory ? (
                             <div className="flex justify-center py-10"><Spinner /></div>
                        ) : transactionHistory.length === 0 ? (
                             <p className="text-center text-text-secondary dark:text-gray-400 py-10">Bạn chưa có giao dịch nào.</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left text-text-secondary dark:text-gray-400">
                                    <thead className="text-xs text-text-primary uppercase bg-gray-100 dark:bg-gray-700 dark:text-gray-200">
                                        <tr>
                                            <th scope="col" className="px-6 py-3 whitespace-nowrap">Mã giao dịch</th>
                                            <th scope="col" className="px-6 py-3 whitespace-nowrap">Dịch vụ</th>
                                            <th scope="col" className="px-6 py-3 whitespace-nowrap">Số tiền</th>
                                            <th scope="col" className="px-6 py-3 whitespace-nowrap">Ngày</th>
                                            <th scope="col" className="px-6 py-3 whitespace-nowrap">Trạng thái</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {transactionHistory.map((tx) => (
                                            <tr key={tx.id} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                                                <td className="px-6 py-4 font-mono whitespace-nowrap">{tx.transaction_code || tx.id.substring(0, 8)}</td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    {tx.plan_name}
                                                    {tx.payment_method === 'giftcode' && (
                                                        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300">
                                                            Giftcode
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(tx.amount)}</td>
                                                <td className="px-6 py-4 whitespace-nowrap">{new Date(tx.created_at).toLocaleDateString('vi-VN')}</td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`text-xs font-medium px-2.5 py-0.5 rounded ${
                                                        tx.status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' :
                                                        tx.status === 'pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' :
                                                        'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                                                    }`}>
                                                        {tx.status === 'completed' ? 'Thành công' : tx.status === 'pending' ? 'Đang xử lý' : 'Thất bại'}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default UserProfile;
