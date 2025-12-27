
import { supabase } from './supabaseClient';
import { PricingPlan, UserStatus, Transaction } from '../types';

export const getUserStatus = async (userId: string, email?: string): Promise<UserStatus> => {
    try {
        let { data, error } = await supabase
            .from('profiles')
            .select('credits, subscription_end')
            .eq('id', userId)
            .maybeSingle();

        if (!data && email) {
             const { error: insertError } = await supabase
                .from('profiles')
                .insert([{ id: userId, email, credits: 60 }]);
             
             if (insertError) {
                 const { data: retryData, error: retryError } = await supabase
                    .from('profiles')
                    .select('credits, subscription_end')
                    .eq('id', userId)
                    .single();
                    
                 if (retryError || !retryData) {
                     return { credits: 0, subscriptionEnd: null, isExpired: false };
                 }
                 data = retryData;
             } else {
                 return { credits: 60, subscriptionEnd: null, isExpired: false };
             }
        } else if (!data) {
            return { credits: 0, subscriptionEnd: null, isExpired: false };
        }

        return { 
            credits: data?.credits ?? 0, 
            subscriptionEnd: data?.subscription_end, 
            isExpired: data?.subscription_end ? new Date(data.subscription_end) < new Date() : false 
        };
    } catch (e) {
        return { credits: 0, subscriptionEnd: null, isExpired: false };
    }
};

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
        return null;
    }
};

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

/**
 * TRỪ TIỀN (Deduct)
 */
export const deductCredits = async (userId: string, amount: number, description: string): Promise<string> => {
    const { data: logId, error } = await supabase.rpc('deduct_credits', {
        p_user_id: userId,
        p_amount: amount,
        p_description: description
    });

    if (error) throw new Error(`Giao dịch thất bại: ${error.message}`);
    
    if (logId) {
        localStorage.setItem('opzen_last_log_id', logId);
    }
    return logId;
};

/**
 * HOÀN TIỀN (Refund)
 */
export const refundCredits = async (userId: string, amount: number, description: string, originalLogId?: string): Promise<void> => {
    if (amount <= 0) return;

    const finalLogId = originalLogId || localStorage.getItem('opzen_last_log_id');

    if (!finalLogId) {
        console.warn("[PaymentService] Không tìm thấy Log ID để hoàn tiền chính xác.");
    }

    const { error } = await supabase.rpc('refund_credits', {
        p_user_id: userId,
        p_amount: amount,
        p_description: description,
        p_usage_log_id: finalLogId
    });

    if (!error) {
        localStorage.removeItem('opzen_last_log_id');
        console.log(`[PaymentService] Đã hoàn tiền thành công (${amount} credits)`);
    } else {
        console.error("[PaymentService] Lỗi hoàn tiền nghiêm trọng:", error.message);
    }
};

export const getTransactionHistory = async (): Promise<Transaction[]> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    const { data, error } = await supabase.from('transactions').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    return (data || []) as Transaction[];
};

export const redeemGiftCode = async (userId: string, code: string): Promise<number> => {
    const { data, error } = await supabase.rpc('redeem_giftcode', { p_user_id: userId, p_code: code });
    if (error) throw new Error(error.message || "Lỗi đổi mã quà tặng");
    return data;
};

export const createPendingTransaction = async (userId: string, plan: PricingPlan, amount: number, customerInfo?: { name: string, phone: string, email: string }) => {
    const intAmount = Math.round(amount);
    const { data: existingTx } = await supabase.from('transactions').select('id, transaction_code, amount, created_at').eq('user_id', userId).eq('plan_id', plan.id).eq('status', 'pending').order('created_at', { ascending: false }).limit(1).maybeSingle();

    if (existingTx) {
        const isCorrectPrefix = existingTx.transaction_code.startsWith('OPZ');
        if (Math.round(existingTx.amount) === intAmount && isCorrectPrefix) {
            if (customerInfo) {
                await supabase.from('transactions').update({ customer_name: customerInfo.name, customer_phone: customerInfo.phone, customer_email: customerInfo.email }).eq('id', existingTx.id);
            }
            return { transactionId: existingTx.id, transactionCode: existingTx.transaction_code, amount: existingTx.amount };
        }
        await supabase.from('transactions').update({ status: 'cancelled' }).eq('id', existingTx.id);
    }

    await supabase.from('transactions').update({ status: 'cancelled' }).eq('user_id', userId).eq('status', 'pending');
    const transactionCode = `OPZ${Math.floor(100000 + Math.random() * 900000)}`;
    const { data, error } = await supabase.from('transactions').insert({
        user_id: userId, plan_id: plan.id, plan_name: plan.name, amount: intAmount, currency: plan.currency, type: plan.type, credits_added: plan.credits || 0,
        status: 'pending', payment_method: 'bank_transfer', transaction_code: transactionCode, customer_name: customerInfo?.name, customer_phone: customerInfo?.phone, customer_email: customerInfo?.email
    }).select('id, transaction_code, amount').single();

    if (error) throw new Error(error.message);
    return { transactionId: data.id, transactionCode: data.transaction_code, amount: data.amount };
};

export const subscribeToTransaction = (transactionId: string, onPaid: () => void) => {
    const channel = supabase.channel(`tx-${transactionId}`).on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'transactions', filter: `id=eq.${transactionId}` }, (payload) => {
        if (payload.new.status === 'completed') onPaid();
    }).subscribe();
    return () => { supabase.removeChannel(channel); };
};

export const checkVoucher = async (code: string): Promise<number> => {
    try {
        const { data, error } = await supabase.from('vouchers').select('discount_percent, is_active').eq('code', code).single();
        if (error) throw new Error(error.message);
        if (!data.is_active) throw new Error("Mã giảm giá đã hết hạn.");
        return data.discount_percent;
    } catch (e: any) {
        const hardcoded: Record<string, number> = { 'OPZEN20': 20, 'FREE100': 100 };
        if (hardcoded[code.toUpperCase()]) return hardcoded[code.toUpperCase()];
        throw e;
    }
};
