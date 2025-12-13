
import { PricingPlan } from '../types';

export const plans: PricingPlan[] = [
    {
        id: 'plan_starter',
        name: 'Starter',
        price: 299000,
        currency: 'đ',
        features: [
            'Tổng 3,000 Credits',
            'Gói tiêu chuẩn',
            'Hạn sử dụng: 1 Tháng',
            'Truy cập tất cả công cụ AI',
            'Render tốc độ tiêu chuẩn',
            'Hỗ trợ ưu tiên 24/7',
            'Tính năng truy cập sớm'
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
        originalPrice: 700000,
        currency: 'đ',
        features: [
            'Tổng 7,000 Credits',
            'Hạn sử dụng: 2 Tháng',
            'Tối ưu chi phí & hiệu năng',
            'Truy cập tất cả công cụ AI',
            'Render tốc độ cao',
            'Hỗ trợ ưu tiên 24/7',
            'Tính năng truy cập sớm'
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
        originalPrice: 2500000,
        currency: 'đ',
        features: [
            'Tổng 25,000 Credits',
            'Hạn sử dụng: 3 Tháng',
            'Chi phí rẻ nhất/credit',
            'Truy cập tất cả công cụ AI',
            'Render tốc độ siêu tốc',
            'Hỗ trợ ưu tiên 24/7',
            'Tính năng truy cập sớm'
        ],
        type: 'subscription',
        credits: 25000,
        durationMonths: 3,
        description: 'Giải pháp tối ưu cho Studio và Doanh nghiệp.'
    }
];
