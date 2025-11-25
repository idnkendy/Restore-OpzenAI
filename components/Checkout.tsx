
import React, { useState } from 'react';
import { PricingPlan } from '../types';
import * as paymentService from '../services/paymentService';
import Spinner from './Spinner';
import { supabase } from '../services/supabaseClient';

const CheckIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 dark:text-green-400 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
    </svg>
);

const QRCodeIcon = () => (
    <svg className="w-32 h-32 text-gray-800 bg-white p-2 rounded-lg" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">
        <path fill="currentColor" d="M128 256a128 128 0 1 1 128-128 128 128 0 0 1-128 128Z"/>
        <path fill="#fff" d="M128 0a128 128 0 0 0 0 256V0Z"/>
        <path fill="currentColor" d="M188 68v40h-40V68ZM88 68v40H48V68ZM68 48H48v20h20Zm20 0V28H68v20Zm100 0h20v20h-20Zm-20 20V48h20v20Zm0 0h20v20h-20Zm-20-20H88v20h80ZM68 88H48v20h20Zm20 0V68H68v20Zm-20 20H48v20h20Zm0 20H48v20h20Zm0 20H48v20h20Zm0 20H48v20h20Zm20-20H68v20h20Zm20 0H88v20h20Zm-20-20H68v20h20Zm100 80v-20h20v20Zm-20-20v-20h20v20Zm0-20v-20h20v20Zm0-20v-20h20v20Zm-20 60v-20h20v20Zm0-20v-20h20v20Zm-20 0v-20h20v20Zm-20 0v-20h20v20Zm20 20v20h20v-20Zm40 0v20h20v-20Zm-60-60H88v20h20Zm20 0h20v20h-20Zm0 20H88v20h40Zm0 20h20v20h-20Zm-20 20H88v20h20Zm100-20h-20v20h20Zm-20-20h-20v20h20Zm0-20h-20v20h20Z"/>
    </svg>
);

const plans: PricingPlan[] = [
    {
        id: 'plan_starter',
        name: 'Starter',
        price: 299000,
        currency: 'đ',
        features: [
            'Tổng 3,000 Credits',
            'Gói tiêu chuẩn',
            'Hạn sử dụng: 1 Tháng',
            'Truy cập tất cả công cụ AI'
        ],
        type: 'subscription',
        credits: 3000,
        durationMonths: 1,
        description: 'Gói trải nghiệm cho người mới bắt đầu.'
    },
    {
        id: 'plan_pro',
        name: 'Pro',
        price: 599000,
        currency: 'đ',
        features: [
            'Tổng 7,000 Credits',
            '(6,000 Gốc + 1,000 Tặng)',
            'Tăng thêm ~17% Credits',
            'Hạn sử dụng: 2 Tháng',
            'Truy cập tất cả công cụ AI'
        ],
        type: 'subscription',
        credits: 7000,
        highlight: true,
        durationMonths: 2,
        description: 'Lựa chọn tốt nhất cho Kiến trúc sư & Freelancer.'
    },
    {
        id: 'plan_ultra',
        name: 'Ultra',
        price: 1999000,
        currency: 'đ',
        features: [
            'Tổng 25,000 Credits',
            '(20,000 Gốc + 5,000 Tặng)',
            'Tăng thêm 25% Credits',
            'Hạn sử dụng: 3 Tháng',
            'Chi phí rẻ nhất/credit',
            'Hỗ trợ ưu tiên'
        ],
        type: 'subscription',
        credits: 25000,
        durationMonths: 3,
        description: 'Giải pháp tối ưu cho Studio và Doanh nghiệp.'
    }
];

const Checkout: React.FC = () => {
    const [isProcessing, setIsProcessing] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState<PricingPlan | null>(null);
    const [paymentStatus, setPaymentStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [statusMessage, setStatusMessage] = useState('');

    const handleBuyClick = async (plan: PricingPlan) => {
        setSelectedPlan(plan);
        setIsProcessing(true);
        setPaymentStatus('idle');
        
        try {
            const { data: { user } } = await supabase.auth.getUser();
            const userId = user?.id || 'guest';

            const result = await paymentService.processPayment(userId, plan, 'qr');
            setPaymentStatus('success');
            setStatusMessage(result.message);
        } catch (err: any) {
            setPaymentStatus('error');
            setStatusMessage(err.message || "Có lỗi xảy ra khi thanh toán.");
        } finally {
            setIsProcessing(false);
        }
    };

    const closeStatusModal = () => {
        setPaymentStatus('idle');
        setSelectedPlan(null);
    };

    return (
        <div className="pb-6">
            <h2 className="text-xl font-bold text-text-primary dark:text-white mb-2 text-center">Bảng Giá & Gói Cước</h2>
            <p className="text-text-secondary dark:text-gray-300 mb-6 text-center text-sm max-w-xl mx-auto">Chọn gói cước phù hợp để sở hữu Credits và sáng tạo không giới hạn.</p>

            {/* Pricing Cards - Optimized Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 mb-8 items-stretch">
                {plans.map((plan) => (
                    <div 
                        key={plan.id}
                        className={`relative flex flex-col h-full p-6 rounded-xl transition-all duration-300 border break-words ${
                            plan.highlight 
                                ? 'bg-accent/5 dark:bg-accent/10 border-accent shadow-xl shadow-accent/10 z-10' 
                                : 'bg-main-bg/50 dark:bg-dark-bg/50 border-border-color dark:border-gray-700 hover:border-accent/50'
                        }`}
                    >
                        {plan.highlight && (
                            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                                <span className="bg-accent text-white text-[10px] uppercase font-bold px-3 py-1 rounded-full shadow-sm whitespace-nowrap">
                                    Khuyên Dùng
                                </span>
                            </div>
                        )}
                        <div className="text-center">
                            <h3 className="text-xl font-bold text-text-primary dark:text-white truncate">{plan.name}</h3>
                            <div className="my-3 flex justify-center items-baseline flex-wrap">
                                <span className="text-3xl font-bold text-text-primary dark:text-white">{new Intl.NumberFormat('vi-VN').format(plan.price)}</span>
                                <span className="text-sm font-medium text-text-secondary dark:text-gray-400 ml-1">{plan.currency}</span>
                            </div>
                            <p className="text-text-secondary dark:text-gray-400 text-xs min-h-[2rem] px-2">{plan.description}</p>
                        </div>
                        
                        <div className="my-4 bg-gray-100 dark:bg-gray-700/30 p-3 rounded-lg text-center border border-gray-200 dark:border-gray-600">
                            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Tổng nhận được</p>
                            <p className="text-xl font-bold text-accent">{new Intl.NumberFormat('vi-VN').format(plan.credits || 0)} Credits</p>
                        </div>

                        <ul className="space-y-2 text-text-secondary dark:text-gray-300 mb-6 flex-grow text-sm whitespace-normal">
                            {plan.features.map((feature, idx) => (
                                <li key={idx} className="flex items-start gap-2">
                                    <CheckIcon />
                                    <span className="text-xs sm:text-sm leading-tight">{feature}</span>
                                </li>
                            ))}
                        </ul>
                        
                        <button 
                            onClick={() => handleBuyClick(plan)}
                            disabled={isProcessing}
                            className={`w-full font-bold py-2.5 px-4 rounded-lg transition-colors flex justify-center items-center gap-2 text-sm ${
                                plan.highlight 
                                    ? 'bg-accent hover:bg-accent-600 text-white shadow-lg shadow-accent/30' 
                                    : 'bg-gray-600 hover:bg-gray-700 text-white'
                            }`}
                        >
                            Đăng ký ngay
                        </button>
                    </div>
                ))}
            </div>

            {/* Payment Info / QR Section - Centered and Enhanced */}
            <div className="bg-gradient-to-br from-white/80 to-gray-100/80 dark:from-gray-800/80 dark:to-gray-900/80 backdrop-blur-md rounded-xl shadow-lg p-6 border border-border-color dark:border-gray-700 max-w-3xl mx-auto">
                <h3 className="text-lg font-bold text-text-primary dark:text-white mb-4 flex items-center gap-2 justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-accent" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" /></svg>
                    Thanh toán chuyển khoản
                </h3>
                <div className="flex flex-col sm:flex-row items-center gap-6">
                    <div className="flex-shrink-0 text-center">
                        <QRCodeIcon />
                        <p className="text-text-secondary dark:text-gray-400 mt-2 text-xs font-medium">Quét mã QR</p>
                    </div>
                    <div className="w-full flex-grow space-y-2 text-sm">
                        <div className="flex justify-between p-2 bg-white dark:bg-gray-800 rounded shadow-sm">
                            <span className="text-text-secondary dark:text-gray-400">Ngân hàng</span>
                            <span className="font-semibold text-text-primary dark:text-gray-100">MB Bank</span>
                        </div>
                        <div className="flex justify-between p-2 bg-white dark:bg-gray-800 rounded shadow-sm">
                            <span className="text-text-secondary dark:text-gray-400">Chủ tài khoản</span>
                            <span className="font-semibold text-text-primary dark:text-gray-100">NGUYEN VAN A</span>
                        </div>
                        <div className="flex justify-between p-2 bg-white dark:bg-gray-800 rounded shadow-sm">
                            <span className="text-text-secondary dark:text-gray-400">Số tài khoản</span>
                            <span className="font-semibold text-text-primary dark:text-gray-100 font-mono text-base">0123456789</span>
                        </div>
                        <div className="mt-3 p-2 bg-yellow-100/50 dark:bg-yellow-900/20 border border-yellow-500/30 rounded text-xs">
                            <p className="font-semibold text-yellow-800 dark:text-yellow-400">Nội dung chuyển khoản:</p>
                            <p className="text-text-primary dark:text-yellow-100 font-mono mt-1">[SĐT] [Tên Gói] (VD: 0912345678 PRO)</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Processing / Result Modal */}
            {(isProcessing || paymentStatus !== 'idle') && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl max-w-sm w-full text-center shadow-2xl border border-gray-200 dark:border-gray-700">
                        {isProcessing ? (
                            <div className="py-8">
                                <div className="flex justify-center mb-4 text-accent">
                                   <Spinner />
                                </div>
                                <h3 className="text-xl font-bold text-text-primary dark:text-white mb-2">Đang xử lý...</h3>
                                <p className="text-text-secondary dark:text-gray-400 text-sm">Vui lòng không tắt trình duyệt.</p>
                            </div>
                        ) : paymentStatus === 'success' ? (
                            <div>
                                <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                                </div>
                                <h3 className="text-xl font-bold text-green-600 dark:text-green-400 mb-2">Thành công!</h3>
                                <p className="text-text-secondary dark:text-gray-300 mb-6 text-sm">{statusMessage}</p>
                                <button onClick={closeStatusModal} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition-colors">
                                    Hoàn tất
                                </button>
                            </div>
                        ) : (
                            <div>
                                <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                                </div>
                                <h3 className="text-xl font-bold text-red-600 dark:text-red-400 mb-2">Thất bại</h3>
                                <p className="text-text-secondary dark:text-gray-300 mb-6 text-sm">{statusMessage}</p>
                                <button onClick={closeStatusModal} className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg transition-colors">
                                    Thử lại
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Checkout;
