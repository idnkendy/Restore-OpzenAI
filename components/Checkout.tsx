
import React from 'react';
import { PricingPlan } from '../types';
import { plans } from '../constants/plans';

const CheckIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 dark:text-green-400 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
    </svg>
);

interface CheckoutProps {
    onPlanSelect?: (plan: PricingPlan) => void;
}

const Checkout: React.FC<CheckoutProps> = ({ onPlanSelect }) => {
    
    const handleBuyClick = (plan: PricingPlan) => {
        if (onPlanSelect) {
            onPlanSelect(plan);
        }
    };

    return (
        <div className="pb-6">
            <h2 className="text-xl font-bold text-text-primary dark:text-white mb-2 text-center">Bảng Giá & Gói Cước</h2>
            <p className="text-text-secondary dark:text-gray-300 mb-6 text-center text-sm max-w-xl mx-auto">Chọn gói cước phù hợp để sở hữu Credits và sáng tạo không giới hạn.</p>

            {/* Pricing Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 mb-8 items-stretch">
                {plans.map((plan) => {
                    const discountPercent = plan.originalPrice 
                        ? Math.round(((plan.originalPrice - plan.price) / plan.originalPrice) * 100) 
                        : 0;

                    return (
                        <div 
                            key={plan.id}
                            className={`relative flex flex-col h-full p-6 rounded-xl transition-all duration-300 border break-words group ${
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
                                <p className="text-text-secondary dark:text-gray-400 text-xs min-h-[2rem] px-2 mt-1">{plan.description}</p>
                                
                                <div className="my-4 flex flex-col justify-center items-center relative">
                                    {plan.originalPrice && (
                                        <div className="absolute -top-2 right-0 sm:right-4 translate-x-2">
                                            <span className="bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-red-200 dark:border-red-800/50">
                                                -{discountPercent}%
                                            </span>
                                        </div>
                                    )}
                                    
                                    <div className="flex items-baseline gap-2">
                                        {plan.originalPrice && (
                                            <span className="text-text-secondary/60 dark:text-gray-500 line-through text-sm decoration-gray-400/50">
                                                {new Intl.NumberFormat('vi-VN').format(plan.originalPrice)}
                                            </span>
                                        )}
                                        <div className="flex items-start">
                                            <span className="text-3xl font-extrabold text-text-primary dark:text-white tracking-tight">
                                                {new Intl.NumberFormat('vi-VN').format(plan.price)}
                                            </span>
                                            <span className="text-sm font-medium text-text-secondary dark:text-gray-400 mt-1.5 ml-0.5">{plan.currency}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="mb-4 bg-gray-100 dark:bg-gray-700/30 p-3 rounded-lg text-center border border-gray-200 dark:border-gray-600">
                                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Tổng nhận được</p>
                                <p className="text-xl font-bold text-accent">{new Intl.NumberFormat('vi-VN').format(plan.credits || 0)} Credits</p>
                            </div>

                            <ul className="space-y-2 text-text-secondary dark:text-gray-300 mb-6 flex-grow text-sm whitespace-normal">
                                {plan.features.map((feature, idx) => (
                                    <li key={idx} className="flex items-start gap-2">
                                        <div className="mt-0.5 text-green-500 dark:text-green-400">
                                            <CheckIcon />
                                        </div>
                                        <span className="text-xs sm:text-sm leading-tight">{feature}</span>
                                    </li>
                                ))}
                            </ul>
                            
                            <button 
                                onClick={() => handleBuyClick(plan)}
                                className={`w-full font-bold py-2.5 px-4 rounded-lg transition-all duration-200 flex justify-center items-center gap-2 text-sm transform hover:-translate-y-0.5 ${
                                    plan.highlight 
                                        ? 'bg-accent hover:bg-accent-600 text-white shadow-lg shadow-accent/30' 
                                        : 'bg-gray-600 hover:bg-gray-700 text-white hover:shadow-md'
                                }`}
                            >
                                Đăng ký ngay
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default Checkout;
