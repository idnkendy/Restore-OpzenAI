
import React, { useState, useEffect } from 'react';
import { PricingPlan } from '../types';
import { User } from '@supabase/supabase-js';
import * as paymentService from '../services/paymentService';
import Spinner from './Spinner';

interface PaymentPageProps {
    plan: PricingPlan;
    user: User;
    onBack: () => void;
    onSuccess: () => void;
}

// --- CẤU HÌNH TÀI KHOẢN NGÂN HÀNG SEPAY ---
const BANK_ID = "MB";
const ACCOUNT_NO = "3039798899"; 
const ACCOUNT_NAME = "CONG TY TNHH AUFLOW AI";

// --- ICONS ---
const CopyIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
);

const CheckIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
);

const ArrowLeftIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
    </svg>
);

const TicketIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
    </svg>
);

const ShieldCheckIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
);

const PaymentPage: React.FC<PaymentPageProps> = ({ plan, user, onBack, onSuccess }) => {
    // Flow State: 'checking_profile' -> 'input_info' -> 'creating_tx' -> 'ready'
    const [step, setStep] = useState<'checking_profile' | 'input_info' | 'creating_tx' | 'ready'>('checking_profile');
    
    // User Info State
    const [fullName, setFullName] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [infoError, setInfoError] = useState<string | null>(null);
    const [isUpdatingInfo, setIsUpdatingInfo] = useState(false);

    // Payment State
    const [voucherCode, setVoucherCode] = useState('');
    const [appliedDiscount, setAppliedDiscount] = useState<number>(0);
    const [voucherError, setVoucherError] = useState<string | null>(null);
    const [isCheckingVoucher, setIsCheckingVoucher] = useState(false);
    
    const [initError, setInitError] = useState<string | null>(null);
    const [copiedField, setCopiedField] = useState<string | null>(null);
    
    // Transaction Data
    const [transactionData, setTransactionData] = useState<{id: string, code: string, amount: number} | null>(null);
    const [isPaid, setIsPaid] = useState(false);

    const originalPrice = plan.price;
    const finalPrice = Math.round(originalPrice * (1 - appliedDiscount / 100));

    // 1. Check Profile on Mount
    useEffect(() => {
        const checkProfile = async () => {
            setStep('checking_profile');
            const profile = await paymentService.getUserProfile(user.id);
            if (profile && profile.full_name && profile.phone) {
                setFullName(profile.full_name);
                setPhoneNumber(profile.phone);
                setStep('creating_tx'); // Profile OK, proceed to create TX
            } else {
                setStep('input_info'); // Profile incomplete, show form
            }
        };
        checkProfile();
    }, [user.id]);

    // 2. Create Transaction when Step is 'creating_tx'
    useEffect(() => {
        if (step === 'creating_tx') {
            const createTx = async () => {
                setTransactionData(null);
                setInitError(null);
                try {
                    // Pass current user info AND EMAIL to save snapshot in transaction record
                    const result = await paymentService.createPendingTransaction(
                        user.id, 
                        plan, 
                        finalPrice,
                        { name: fullName, phone: phoneNumber, email: user.email || '' }
                    );
                    
                    setTransactionData({
                        id: result.transactionId,
                        code: result.transactionCode,
                        amount: result.amount
                    });
                    setStep('ready');
                } catch (error) {
                    console.error("Failed to create pending transaction", error);
                    setInitError("Không thể khởi tạo giao dịch. Vui lòng thử lại sau.");
                    // Keep step as creating_tx so retry might be possible or show error
                }
            };
            createTx();
        }
    }, [step, plan, finalPrice, user.id, fullName, phoneNumber, user.email]);

    // 3. Listen for Payment Success
    useEffect(() => {
        if (!transactionData) return;
        const unsubscribe = paymentService.subscribeToTransaction(transactionData.id, () => setIsPaid(true));
        return () => { unsubscribe(); };
    }, [transactionData]);

    // --- HANDLERS ---

    const handleUpdateInfo = async () => {
        if (!fullName.trim() || !phoneNumber.trim()) {
            setInfoError('Vui lòng điền đầy đủ Họ tên và Số điện thoại.');
            return;
        }
        // Simple phone regex
        if (!/^\d{9,11}$/.test(phoneNumber.trim())) {
            setInfoError('Số điện thoại không hợp lệ.');
            return;
        }

        setInfoError(null);
        setIsUpdatingInfo(true);

        try {
            await paymentService.updateUserProfile(user.id, fullName, phoneNumber);
            setStep('creating_tx'); // Proceed to create transaction
        } catch (e: any) {
            setInfoError(e.message || 'Lỗi cập nhật thông tin.');
            // Stay on input_info
        } finally {
            setIsUpdatingInfo(false);
        }
    };

    const handleApplyVoucher = async () => {
        const code = voucherCode.trim().toUpperCase();
        if (!code) {
            setVoucherError('Vui lòng nhập mã.');
            return;
        }
        setIsCheckingVoucher(true);
        setVoucherError(null);
        
        try {
            const percent = await paymentService.checkVoucher(code);
            setAppliedDiscount(percent);
            // If we are ready (showing QR), we need to recreate the TX with new price
            if (step === 'ready') {
                setStep('creating_tx');
            }
        } catch (err: any) {
            setVoucherError(err.message || 'Mã giảm giá không hợp lệ.');
            setAppliedDiscount(0);
        } finally {
            setIsCheckingVoucher(false);
        }
    };

    const handleRemoveVoucher = () => {
        setAppliedDiscount(0);
        setVoucherCode('');
        if (step === 'ready') {
            setStep('creating_tx');
        }
    };

    const copyToClipboard = (text: string, field: string) => {
        navigator.clipboard.writeText(text);
        setCopiedField(field);
        setTimeout(() => setCopiedField(null), 2000);
    };

    const qrUrl = transactionData 
        ? `https://qr.sepay.vn/img?bank=${BANK_ID}&acc=${ACCOUNT_NO}&template=compact&amount=${transactionData.amount}&des=${transactionData.code}`
        : '';

    // --- RENDER ---

    return (
        <div className="max-w-6xl mx-auto p-4 md:p-8 animate-fade-in font-sans">
            {/* Header Navigation */}
            <div className="flex items-center justify-between mb-8">
                <button 
                    onClick={onBack} 
                    className="group flex items-center gap-2 text-text-secondary dark:text-gray-400 hover:text-text-primary dark:hover:text-white transition-colors"
                >
                    <div className="p-2 rounded-full bg-gray-100 dark:bg-gray-800 group-hover:bg-gray-200 dark:group-hover:bg-gray-700 transition-colors">
                        <ArrowLeftIcon />
                    </div>
                    <span className="font-medium">Quay lại</span>
                </button>
                <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-3 py-1.5 rounded-full border border-green-200 dark:border-green-800">
                    <ShieldCheckIcon />
                    <span className="font-semibold">Thanh toán bảo mật</span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* LEFT COLUMN: PAYMENT CONTENT (7 cols) */}
                <div className="lg:col-span-7 space-y-6">
                    <div className="bg-surface dark:bg-[#1A1A1A] rounded-3xl p-1 border border-border-color dark:border-gray-700 shadow-xl relative overflow-hidden min-h-[500px] flex flex-col">
                        
                        {/* Success Overlay */}
                        {isPaid && (
                            <div className="absolute inset-0 bg-surface/95 dark:bg-[#1A1A1A]/95 backdrop-blur-md z-30 flex flex-col items-center justify-center text-center p-8 animate-fade-in">
                                <div className="w-24 h-24 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-6">
                                    <svg className="w-12 h-12 text-green-500 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                                <h2 className="text-3xl font-bold text-text-primary dark:text-white mb-3">Thanh toán thành công!</h2>
                                <p className="text-text-secondary dark:text-gray-300 mb-8 text-lg">
                                    Credits đã được cộng vào tài khoản. Chúc bạn sáng tạo vui vẻ!
                                </p>
                                <button 
                                    onClick={onSuccess} 
                                    className="px-8 py-4 bg-[#7f13ec] hover:bg-[#690fca] text-white font-bold rounded-xl transition-all shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 transform hover:-translate-y-1"
                                >
                                    Bắt đầu sử dụng ngay
                                </button>
                            </div>
                        )}

                        <div className="p-6 md:p-8 bg-main-bg dark:bg-[#121212] rounded-[20px] flex-grow flex flex-col">
                            {step === 'checking_profile' || step === 'creating_tx' ? (
                                <div className="flex-grow flex flex-col items-center justify-center text-gray-400">
                                    <Spinner />
                                    <p className="mt-4 text-sm animate-pulse">
                                        {step === 'checking_profile' ? 'Đang kiểm tra thông tin...' : 'Đang tạo giao dịch...'}
                                    </p>
                                </div>
                            ) : step === 'input_info' ? (
                                // --- INFO UPDATE FORM ---
                                <div className="flex-grow flex flex-col justify-center max-w-md mx-auto w-full animate-fade-in">
                                    <div className="text-center mb-6">
                                        <div className="inline-block p-3 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 mb-4">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                            </svg>
                                        </div>
                                        <h2 className="text-2xl font-bold text-text-primary dark:text-white">Cập nhật thông tin</h2>
                                        <p className="text-sm text-text-secondary dark:text-gray-400 mt-2">
                                            Vui lòng cập nhật thông tin liên hệ để hoàn tất thanh toán và nhận hỗ trợ tốt nhất.
                                        </p>
                                    </div>

                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-text-secondary dark:text-gray-400 mb-1">Họ và tên</label>
                                            <input 
                                                type="text" 
                                                value={fullName}
                                                onChange={(e) => setFullName(e.target.value)}
                                                className="w-full bg-surface dark:bg-gray-800 border border-border-color dark:border-gray-700 rounded-xl p-3 text-text-primary dark:text-white focus:ring-2 focus:ring-[#7f13ec] outline-none"
                                                placeholder="Họ và tên"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-text-secondary dark:text-gray-400 mb-1">Số điện thoại</label>
                                            <input 
                                                type="tel" 
                                                value={phoneNumber}
                                                onChange={(e) => setPhoneNumber(e.target.value)}
                                                className="w-full bg-surface dark:bg-gray-800 border border-border-color dark:border-gray-700 rounded-xl p-3 text-text-primary dark:text-white focus:ring-2 focus:ring-[#7f13ec] outline-none"
                                                placeholder="Số điện thoại"
                                            />
                                        </div>
                                        {infoError && (
                                            <p className="text-red-500 text-sm text-center bg-red-50 dark:bg-red-900/10 p-2 rounded-lg border border-red-100 dark:border-red-900/30">
                                                {infoError}
                                            </p>
                                        )}
                                        <button 
                                            onClick={handleUpdateInfo}
                                            disabled={isUpdatingInfo}
                                            className={`w-full bg-[#7f13ec] hover:bg-[#690fca] text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-purple-500/20 mt-2 flex justify-center items-center ${isUpdatingInfo ? 'opacity-70 cursor-not-allowed' : ''}`}
                                        >
                                            {isUpdatingInfo ? <Spinner /> : 'Tiếp tục thanh toán'}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                // --- QR CODE DISPLAY (Ready) ---
                                <div className="animate-fade-in">
                                    <h1 className="text-2xl font-bold text-text-primary dark:text-white mb-6">Thông tin chuyển khoản</h1>
                                    
                                    <div className="flex flex-col md:flex-row gap-8">
                                        {/* QR Code Column */}
                                        <div className="flex flex-col items-center justify-center space-y-4">
                                            <div className="bg-white p-4 rounded-2xl shadow-md border border-gray-200 w-60 h-60 flex items-center justify-center relative group overflow-hidden">
                                                {initError ? (
                                                    <div className="flex flex-col items-center text-red-500 text-center px-4">
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                        </svg>
                                                        <span className="text-xs font-medium">Lỗi tạo mã. Vui lòng thử lại.</span>
                                                    </div>
                                                ) : !qrUrl ? (
                                                    <div className="flex flex-col items-center text-gray-400 animate-pulse">
                                                        <Spinner />
                                                        <span className="text-xs mt-2 font-medium">Đang tải mã QR...</span>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <img src={qrUrl} alt="QR Code" className="w-full h-full object-contain" />
                                                        {/* Live Indicator */}
                                                        <div className="absolute top-2 right-2 flex items-center gap-1.5 bg-green-500/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-full backdrop-blur-sm shadow-sm animate-pulse">
                                                            <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                                                            LIVE
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                            <p className="text-sm text-text-secondary dark:text-gray-400 text-center max-w-[220px]">
                                                Mở App Ngân hàng để quét mã
                                            </p>
                                        </div>

                                        {/* Bank Details Column */}
                                        <div className="flex-1 space-y-5">
                                            {/* Bank Card Design */}
                                            <div className="bg-gradient-to-br from-[#2c1f4a] to-[#1a1025] dark:from-[#2D1B4E] dark:to-[#150E1F] rounded-2xl p-6 border border-[#7f13ec]/20 shadow-inner relative overflow-hidden group">
                                                <div className="absolute top-0 right-0 w-32 h-32 bg-[#7f13ec]/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
                                                
                                                <div className="relative z-10">
                                                    <div className="flex justify-between items-start mb-6">
                                                        <div>
                                                            <p className="text-purple-200 text-xs uppercase tracking-wider font-semibold mb-1">Ngân hàng</p>
                                                            <p className="text-white text-xl font-bold tracking-wide">{BANK_ID}</p>
                                                        </div>
                                                        <div className="h-8 w-12 bg-white/10 rounded flex items-center justify-center">
                                                            <div className="w-6 h-4 border-2 border-white/30 rounded-sm"></div>
                                                        </div>
                                                    </div>

                                                    <div className="mb-6">
                                                        <p className="text-purple-200 text-xs uppercase tracking-wider font-semibold mb-1">Số tài khoản</p>
                                                        <div className="flex items-center gap-3">
                                                            <p className="text-white text-2xl font-mono font-bold tracking-wider">{ACCOUNT_NO}</p>
                                                            <button 
                                                                onClick={() => copyToClipboard(ACCOUNT_NO, 'acc')}
                                                                className="text-purple-300 hover:text-white transition-colors p-1.5 hover:bg-white/10 rounded-lg"
                                                                title="Sao chép số tài khoản"
                                                            >
                                                                {copiedField === 'acc' ? <CheckIcon /> : <CopyIcon />}
                                                            </button>
                                                        </div>
                                                    </div>

                                                    <div>
                                                        <p className="text-purple-200 text-xs uppercase tracking-wider font-semibold mb-1">Chủ tài khoản</p>
                                                        <p className="text-white font-medium uppercase tracking-wide">{ACCOUNT_NAME}</p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Important: Transaction Code */}
                                            <div className="bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-700/50 rounded-xl p-4 relative">
                                                <p className="text-xs text-yellow-800 dark:text-yellow-500 font-bold uppercase tracking-wide mb-1">
                                                    Nội dung chuyển khoản (Bắt buộc)
                                                </p>
                                                <div className="flex items-center justify-between bg-white dark:bg-black/20 p-3 rounded-lg border border-yellow-100 dark:border-yellow-800/30">
                                                    <span className="text-lg font-mono font-bold text-yellow-900 dark:text-yellow-400">
                                                        {transactionData ? transactionData.code : '...'}
                                                    </span>
                                                    <button 
                                                        onClick={() => transactionData && copyToClipboard(transactionData.code, 'code')}
                                                        className="text-yellow-600 hover:text-yellow-800 dark:text-yellow-500 dark:hover:text-yellow-300 p-2 hover:bg-yellow-100 dark:hover:bg-yellow-900/40 rounded-lg transition-colors"
                                                    >
                                                        {copiedField === 'code' ? (
                                                            <span className="text-xs font-bold flex items-center gap-1">Đã chép <CheckIcon /></span>
                                                        ) : (
                                                            <span className="text-xs font-bold flex items-center gap-1">Sao chép <CopyIcon /></span>
                                                        )}
                                                    </button>
                                                </div>
                                                <p className="text-[11px] text-yellow-700/70 dark:text-yellow-500/60 mt-2 italic">
                                                    *Hệ thống tự động kích hoạt khi nội dung chính xác.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="mt-8 pt-6 border-t border-border-color dark:border-gray-800 flex flex-col items-center gap-3">
                                         <div className="flex items-center gap-3 text-sm text-text-secondary dark:text-gray-400 bg-surface dark:bg-gray-800 px-5 py-2.5 rounded-full border border-border-color dark:border-gray-700 shadow-sm animate-pulse">
                                            <Spinner /> 
                                            <span>Đang chờ ngân hàng xác nhận... (Tự động làm mới)</span>
                                         </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* RIGHT COLUMN: ORDER SUMMARY (5 cols) */}
                <div className="lg:col-span-5 space-y-6">
                    <div className="bg-surface dark:bg-[#1A1A1A] rounded-3xl p-6 md:p-8 border border-border-color dark:border-gray-700 shadow-lg sticky top-24">
                        <h2 className="text-xl font-bold text-text-primary dark:text-white mb-6">Chi tiết đơn hàng</h2>

                        {/* Plan Info */}
                        <div className="flex items-start gap-4 mb-6 pb-6 border-b border-border-color dark:border-gray-700">
                            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#7f13ec] to-[#a855f7] flex items-center justify-center text-white shadow-lg shadow-purple-500/20 flex-shrink-0">
                                <span className="material-symbols-outlined text-2xl">diamond</span>
                            </div>
                            <div className="flex-1">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="font-bold text-lg text-text-primary dark:text-white leading-tight">{plan.name}</h3>
                                        <p className="text-sm text-text-secondary dark:text-gray-400 mt-1">{(plan.credits || 0).toLocaleString()} Credits</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-text-primary dark:text-white">
                                            {new Intl.NumberFormat('vi-VN').format(originalPrice)} ₫
                                        </p>
                                        <p className="text-xs text-text-secondary dark:text-gray-500 mt-1">/{plan.durationMonths} tháng</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Voucher Section */}
                        <div className="mb-6">
                            <label className="text-sm font-medium text-text-secondary dark:text-gray-400 mb-2 block flex items-center gap-1">
                                <TicketIcon /> Mã giảm giá
                            </label>
                            <div className="relative flex items-center">
                                <input 
                                    type="text" 
                                    placeholder="Nhập mã..." 
                                    value={voucherCode}
                                    onChange={(e) => setVoucherCode(e.target.value)}
                                    className="w-full bg-main-bg dark:bg-gray-800 border border-border-color dark:border-gray-700 rounded-xl pl-4 pr-24 py-3 text-sm focus:ring-2 focus:ring-[#7f13ec] focus:border-transparent outline-none uppercase text-text-primary dark:text-white font-medium transition-all"
                                    disabled={appliedDiscount > 0}
                                />
                                <div className="absolute right-1.5">
                                    {appliedDiscount > 0 ? (
                                        <button 
                                            onClick={handleRemoveVoucher}
                                            className="bg-red-100 dark:bg-red-900/40 hover:bg-red-200 dark:hover:bg-red-800 text-red-600 dark:text-red-400 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
                                        >
                                            Xóa
                                        </button>
                                    ) : (
                                        <button 
                                            onClick={handleApplyVoucher}
                                            disabled={isCheckingVoucher || !voucherCode.trim()}
                                            className="bg-[#7f13ec] hover:bg-[#690fca] disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white px-4 py-1.5 rounded-lg text-xs font-bold transition-colors shadow-sm"
                                        >
                                            {isCheckingVoucher ? <Spinner /> : 'Áp dụng'}
                                        </button>
                                    )}
                                </div>
                            </div>
                            {appliedDiscount > 0 && (
                                <div className="mt-2 flex items-center gap-1 text-xs text-green-600 dark:text-green-400 font-medium bg-green-50 dark:bg-green-900/20 p-2 rounded-lg">
                                    <CheckIcon /> Đã giảm {appliedDiscount}%
                                </div>
                            )}
                            {voucherError && <p className="text-xs text-red-500 mt-2 ml-1">{voucherError}</p>}
                        </div>

                        {/* Summary Calculation */}
                        <div className="space-y-3">
                            <div className="flex justify-between text-sm text-text-secondary dark:text-gray-400">
                                <span>Tạm tính</span>
                                <span>{new Intl.NumberFormat('vi-VN').format(originalPrice)} ₫</span>
                            </div>
                            {appliedDiscount > 0 && (
                                <div className="flex justify-between text-sm text-green-600 dark:text-green-400">
                                    <span>Giảm giá ({appliedDiscount}%)</span>
                                    <span>- {new Intl.NumberFormat('vi-VN').format(Math.round(originalPrice * appliedDiscount / 100))} ₫</span>
                                </div>
                            )}
                            <div className="border-t border-border-color dark:border-gray-700 my-4"></div>
                            <div className="flex justify-between items-center">
                                <span className="font-bold text-lg text-text-primary dark:text-white">Tổng thanh toán</span>
                                <span className="font-bold text-2xl text-[#7f13ec]">
                                    {new Intl.NumberFormat('vi-VN').format(finalPrice)} ₫
                                </span>
                            </div>
                        </div>
                        
                        {/* Terms Disclaimer */}
                        <div className="mt-8 pt-6 border-t border-border-color dark:border-gray-700 text-xs text-center text-text-secondary dark:text-gray-500 italic">
                            <p>Bằng việc thực hiện chuyển khoản, bạn đã đồng ý với Chính sách bảo mật và <a href="/terms-of-service" target="_blank" rel="noopener noreferrer" className="text-[#7f13ec] hover:underline font-bold">Điều khoản dịch vụ</a> của chúng tôi.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PaymentPage;
