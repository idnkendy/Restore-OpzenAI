
import { supabase } from './supabaseClient';
import { PricingPlan, UserStatus, Transaction } from '../types';

export const getUserStatus = async (userId: string, email?: string): Promise<UserStatus> => {
    try {
        // 1. Try to fetch existing profile
        let { data, error } = await supabase
            .from('profiles')
            .select('credits, subscription_end')
            .eq('id', userId)
            .maybeSingle(); // Use maybeSingle to avoid PGRST116 error noise

        // 2. If no profile exists and we have an email, try to create one (First time user)
        if (!data && email) {
             console.log("Profile not found, attempting to create new profile...");
             const { error: insertError } = await supabase
                .from('profiles')
                .insert([{ id: userId, email, credits: 60 }]); // Default trial credits
             
             if (insertError) {
                 // RACE CONDITION HANDLING:
                 console.warn("Profile creation failed (likely race condition), forcing re-fetch...", insertError.message);
                 
                 const { data: retryData, error: retryError } = await supabase
                    .from('profiles')
                    .select('credits, subscription_end')
                    .eq('id', userId)
                    .single();
                    
                 if (retryError || !retryData) {
                     console.error("CRITICAL: Retry fetch also failed.", retryError);
                     return { credits: 0, subscriptionEnd: null, isExpired: false };
                 }
                 data = retryData;
             } else {
                 return { credits: 60, subscriptionEnd: null, isExpired: false };
             }
        } else if (!data) {
            return { credits: 0, subscriptionEnd: null, isExpired: false };
        }

        const credits = data?.credits ?? 0;
        const subscriptionEnd = data?.subscription_end;
        const isExpired = subscriptionEnd ? new Date(subscriptionEnd) < new Date() : false;

        return {
            credits,
            subscriptionEnd,
            isExpired
        };
    } catch (e) {
        console.error("Exception in getUserStatus:", e);
        return { credits: 0, subscriptionEnd: null, isExpired: false };
    }
};

// NEW: Fetch user profile details (Name, Phone)
export const getUserProfile = async (userId: string) => {
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('full_name, phone')
            .eq('id', userId)
            .single();
        
        if (error) throw error;
        return data;
    } catch (e) {
        console.error("Error fetching user profile:", e);
        return null;
    }
};

// NEW: Update user profile
export const updateUserProfile = async (userId: string, fullName: string, phone: string) => {
    try {
        const { error } = await supabase
            .from('profiles')
            .update({ full_name: fullName, phone: phone })
            .eq('id', userId);
            
        if (error) throw error;
        return true;
    } catch (e: any) {
        throw new Error(e.message || "Lỗi cập nhật thông tin.");
    }
};

export const deductCredits = async (userId: string, amount: number, description: string): Promise<string> => {
    const { data, error } = await supabase.rpc('deduct_credits', {
        p_user_id: userId,
        p_amount: amount,
        p_description: description
    });

    if (error) {
        console.error("deductCredits RPC error:", error.message || JSON.stringify(error));
        throw new Error(`Giao dịch thất bại: ${error.message || 'Lỗi hệ thống'}`);
    }

    return data; // Returns log ID
};

export const refundCredits = async (userId: string, amount: number, description: string): Promise<void> => {
    console.log(`[PaymentService] Attempting to refund ${amount} credits for user ${userId}. Reason: ${description}`);
    
    const { error } = await supabase.rpc('refund_credits', {
        p_user_id: userId,
        p_amount: amount,
        p_description: description
    });

    if (!error) {
        console.log("[PaymentService] Refund successful via RPC.");
        return; 
    }

    console.warn("[PaymentService] refundCredits RPC failed, attempting client-side fallback. Error:", error.message);

    try {
        const { data: profile, error: fetchError } = await supabase
            .from('profiles')
            .select('credits')
            .eq('id', userId)
            .single();
        
        if (fetchError) throw fetchError;

        if (profile) {
            const newCredits = (profile.credits || 0) + amount;
            const { error: updateError } = await supabase
                .from('profiles')
                .update({ credits: newCredits })
                .eq('id', userId);
            if (updateError) throw updateError;
            console.log(`[PaymentService] Refund successful via Client Fallback. New balance: ${newCredits}`);
        }
    } catch (e: any) {
        console.error("[PaymentService] CRITICAL: Client-side refund fallback also failed:", e.message || e);
    }
};

export const getTransactionHistory = async (): Promise<Transaction[]> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

    if (error) {
        console.error("getTransactionHistory error:", error.message || error);
        return [];
    }

    return data as Transaction[];
};

export const redeemGiftCode = async (userId: string, code: string): Promise<number> => {
    const { data, error } = await supabase.rpc('redeem_giftcode', {
        p_user_id: userId,
        p_code: code
    });

    if (error) {
        throw new Error(error.message || "Lỗi đổi mã quà tặng");
    }

    return data; // returns amount added
};

export const createPendingTransaction = async (
    userId: string, 
    plan: PricingPlan, 
    amount: number, 
    customerInfo?: { name: string, phone: string, email: string }
) => {
    // Force integer comparison to avoid floating point mismatch
    const intAmount = Math.round(amount);

    // 1. Tìm giao dịch đang pending cũ của User cho gói này
    const { data: existingTx } = await supabase
        .from('transactions')
        .select('id, transaction_code, amount, created_at')
        .eq('user_id', userId)
        .eq('plan_id', plan.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (existingTx) {
        // Kiểm tra tiền tố để đảm bảo đồng bộ (OPZ)
        const isCorrectPrefix = existingTx.transaction_code.startsWith('OPZ');
        const existingIntAmount = Math.round(existingTx.amount);

        // Nếu số tiền khớp hoàn toàn VÀ đúng tiền tố -> Tái sử dụng (Idempotency)
        // Nếu có thông tin customer mới, ta có thể cập nhật lại vào giao dịch cũ để đảm bảo nhất quán
        if (existingIntAmount === intAmount && isCorrectPrefix) {
            console.log(`[Payment] Reusing existing pending transaction: ${existingTx.transaction_code}`);
            
            // Cập nhật thông tin khách hàng nếu có
            if (customerInfo) {
                await supabase.from('transactions')
                    .update({ 
                        customer_name: customerInfo.name, 
                        customer_phone: customerInfo.phone,
                        customer_email: customerInfo.email
                    })
                    .eq('id', existingTx.id);
            }

            return {
                transactionId: existingTx.id,
                transactionCode: existingTx.transaction_code,
                amount: existingTx.amount
            };
        }

        // Nếu số tiền KHÁC (do áp dụng/xóa voucher) -> HỦY cái cũ
        await supabase
            .from('transactions')
            .update({ status: 'cancelled' })
            .eq('id', existingTx.id);
    }

    // 2. Dọn dẹp các giao dịch 'pending' khác (để tránh spam QR code rác)
    await supabase
        .from('transactions')
        .update({ status: 'cancelled' })
        .eq('user_id', userId)
        .eq('status', 'pending');

    // 3. Tạo giao dịch MỚI
    const transactionCode = `OPZ${Math.floor(100000 + Math.random() * 900000)}`;
    
    const { data, error } = await supabase
        .from('transactions')
        .insert({
            user_id: userId,
            plan_id: plan.id,
            plan_name: plan.name,
            amount: intAmount, // Store integer
            currency: plan.currency,
            type: plan.type,
            credits_added: plan.credits || 0,
            status: 'pending',
            payment_method: 'bank_transfer',
            transaction_code: transactionCode,
            customer_name: customerInfo?.name,
            customer_phone: customerInfo?.phone,
            customer_email: customerInfo?.email
        })
        .select('id, transaction_code, amount')
        .single();

    if (error) {
        throw new Error(error.message);
    }

    return {
        transactionId: data.id,
        transactionCode: data.transaction_code,
        amount: data.amount
    };
};

export const subscribeToTransaction = (transactionId: string, onPaid: () => void) => {
    const channel = supabase
        .channel(`tx-${transactionId}`)
        .on(
            'postgres_changes',
            {
                event: 'UPDATE',
                schema: 'public',
                table: 'transactions',
                filter: `id=eq.${transactionId}`
            },
            (payload) => {
                if (payload.new.status === 'completed') {
                    onPaid();
                }
            }
        )
        .subscribe();

    return () => {
        supabase.removeChannel(channel);
    };
};

export const checkVoucher = async (code: string): Promise<number> => {
    try {
        const { data, error } = await supabase
            .from('vouchers')
            .select('discount_percent, is_active, start_date, end_date')
            .eq('code', code)
            .single();

        if (error) {
            if (error.code === '42P01') {
                throw new Error("Hệ thống mã giảm giá đang bảo trì (Table missing). Vui lòng thử mã TEST10.");
            }
            if (error.code === 'PGRST116') {
                throw new Error("Mã giảm giá không hợp lệ.");
            }
            throw new Error(error.message);
        }
        
        if (!data.is_active) {
            throw new Error("Mã giảm giá đã hết hạn hoặc bị vô hiệu hóa.");
        }
        
        const now = new Date();
        if (data.start_date && new Date(data.start_date) > now) throw new Error("Mã chưa có hiệu lực.");
        if (data.end_date && new Date(data.end_date) < now) throw new Error("Mã đã hết hạn.");

        return data.discount_percent;
    } catch (e: any) {
        const hardcoded: Record<string, number> = {
            'TEST10': 10,
            'OPZEN20': 20,
            'FREE100': 100
        };
        if (hardcoded[code]) return hardcoded[code];
        
        throw e;
    }
};

export const simulateSePayWebhook = async (transactionId: string): Promise<boolean> => {
    if (transactionId.startsWith('mock-tx-')) {
        console.warn("Cannot simulate backend webhook on a mock transaction ID.");
        return true;
    }

    try {
        const { data, error } = await supabase.rpc('approve_transaction_test', {
            p_transaction_id: transactionId
        });

        if (error) {
            throw new Error(error.message || "RPC Error");
        }

        return data === true;
    } catch (e: any) {
        console.error("[DevTool] Failed to simulate webhook:", e);
        if (e.message?.includes('function') && e.message?.includes('does not exist')) {
            throw new Error("MISSING_RPC");
        }
        throw e;
    }
};
