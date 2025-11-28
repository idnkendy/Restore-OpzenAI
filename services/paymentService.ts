
import { PricingPlan, Transaction, UserStatus, UsageLog } from "../types";
import { supabase } from "./supabaseClient";

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Format database errors strictly
const formatDbError = (err: any): string => {
    let msg = "";
    if (typeof err === 'string') msg = err;
    else if (err?.message) msg = err.message;
    else msg = JSON.stringify(err);

    // Try to extract code if it's a JSON string
    if (msg.trim().startsWith('{')) {
        try {
            const parsed = JSON.parse(msg);
            if (parsed.code) msg = parsed.code + ' ' + (parsed.message || '');
        } catch(e) {}
    }

    if (msg.includes('Network') || msg.includes('fetch')) return "[NET] Lỗi kết nối mạng. Vui lòng thử lại sau.";
    if (msg.includes('402')) return "[402] Không đủ Credits. Vui lòng thử lại sau.";
    if (msg.includes('403')) return "[403] Gói cước hết hạn. Vui lòng thử lại sau.";
    if (msg.includes('409')) return "[409] Mã đã sử dụng. Vui lòng thử lại sau.";
    if (msg.includes('404')) return "[404] Mã không tồn tại. Vui lòng thử lại sau.";
    
    return "[DB] Lỗi cơ sở dữ liệu. Vui lòng thử lại sau.";
};

const withRetry = async <T>(operation: () => PromiseLike<T>, maxRetries: number = 3, delayMs: number = 1000): Promise<T> => {
    let lastError: any;
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await operation();
        } catch (error: any) {
            lastError = error;
            const msg = String(error?.message || error);
            const isRetryable = msg.includes('fetch') || msg.includes('Network') || msg.includes('50');
            
            if (i < maxRetries - 1 && isRetryable) {
                await new Promise(resolve => setTimeout(resolve, delayMs * Math.pow(2, i)));
            } else {
                throw error;
            }
        }
    }
    throw lastError;
};

export interface PaymentResult {
    success: boolean;
    message: string;
    transactionId?: string;
}

export const processPayment = async (userId: string, plan: PricingPlan, paymentMethod: 'qr' | 'card'): Promise<PaymentResult> => {
    try {
        await delay(1000);
        const transactionCode = `TXN_${Date.now().toString().slice(-6)}`;

        const { error: txError } = await withRetry<{ error: any }>(() => supabase.from('transactions').insert({
            user_id: userId,
            plan_id: plan.id,
            plan_name: plan.name,
            amount: plan.price,
            currency: 'VND',
            type: plan.type,
            credits_added: plan.credits || 0,
            status: 'completed',
            payment_method: paymentMethod,
            transaction_code: transactionCode
        }));

        if (txError) throw txError;

        const { data: currentProfile } = await withRetry<{ data: { credits: number, subscription_end?: string } | null }>(() => supabase
            .from('profiles')
            .select('credits, subscription_end')
            .eq('id', userId)
            .maybeSingle()
        );
        const currentCredits = currentProfile?.credits || 0;
        
        const now = new Date();
        const durationMonths = plan.durationMonths || 1;
        const potentialNewExpiry = new Date(now);
        potentialNewExpiry.setMonth(potentialNewExpiry.getMonth() + durationMonths);
        const currentExpiry = currentProfile?.subscription_end ? new Date(currentProfile.subscription_end) : null;

        let newSubscriptionEnd: Date;
        if (!currentExpiry || currentExpiry < now) {
            newSubscriptionEnd = potentialNewExpiry;
        } else {
            newSubscriptionEnd = (potentialNewExpiry > currentExpiry) ? potentialNewExpiry : currentExpiry;
        }

        const { error: updateError } = await withRetry<{ error: any }>(() => supabase.from('profiles').upsert({
            id: userId,
            credits: currentCredits + (plan.credits || 0),
            subscription_end: newSubscriptionEnd.toISOString(),
            updated_at: new Date().toISOString()
        }, { onConflict: 'id' }));

        if (updateError) throw updateError;

        return {
            success: true,
            message: `Thanh toán thành công! Đã cộng ${plan.credits} credits.`,
            transactionId: transactionCode
        };
    } catch (e) {
        throw new Error(formatDbError(e));
    }
};

export const getTransactionHistory = async (): Promise<Transaction[]> => {
    try {
        const { data, error } = await withRetry<{ data: any[] | null, error: any }>(() => supabase
            .from('transactions')
            .select('*')
            .order('created_at', { ascending: false }));

        if (error) return [];
        return data as Transaction[];
    } catch (e) {
        return [];
    }
};

export const getUserStatus = async (userId: string, email?: string): Promise<UserStatus> => {
    try {
        const { data: profile } = await withRetry<{ data: { credits: number, subscription_end: string | null, email?: string } | null }>(() => supabase
            .from('profiles')
            .select('credits, subscription_end, email')
            .eq('id', userId)
            .maybeSingle());

        if (profile) {
            if (email && !profile.email) {
                supabase.from('profiles').update({ email, updated_at: new Date().toISOString() }).eq('id', userId).then();
            }
            const now = new Date();
            const subEnd = profile.subscription_end ? new Date(profile.subscription_end) : null;
            const isExpired = subEnd ? subEnd < now : true;

            if (isExpired && profile.credits > 0) {
                supabase.from('profiles').update({ credits: 0, updated_at: new Date().toISOString() }).eq('id', userId).then();
                return { credits: 0, subscriptionEnd: profile.subscription_end, isExpired: true };
            }
            return { credits: profile.credits, subscriptionEnd: profile.subscription_end, isExpired: isExpired };
        } else {
            const now = new Date();
            const oneMonthLater = new Date(now.setMonth(now.getMonth() + 1));
            const initialCredits = 60;
            const { error } = await supabase.from('profiles').upsert({
                id: userId,
                email: email,
                credits: initialCredits,
                subscription_end: oneMonthLater.toISOString()
            }, { onConflict: 'id' });
            
            if (!error) return { credits: initialCredits, subscriptionEnd: oneMonthLater.toISOString(), isExpired: false };
        }
    } catch (e) {}
    return { credits: 0, subscriptionEnd: null, isExpired: true };
};

export const deductCredits = async (userId: string, amount: number, description: string = 'Sử dụng tính năng AI'): Promise<string> => {
    try {
        return await withRetry(async () => {
            const { data: profile, error: fetchError } = await supabase
                .from('profiles')
                .select('credits, subscription_end')
                .eq('id', userId)
                .single();
                
            if (fetchError) throw fetchError;

            const now = new Date();
            const subEnd = profile.subscription_end ? new Date(profile.subscription_end) : null;
            if (!subEnd || subEnd < now) throw new Error('[403] Expired');

            const currentCredits = profile?.credits ?? 0;
            if (currentCredits < amount) throw new Error(`[402] Insufficient`);

            const { data: logData, error: logError } = await supabase
                .from('usage_logs')
                .insert({
                    user_id: userId,
                    credits_used: amount,
                    description: description,
                })
                .select('id')
                .single();

            if (logError) throw logError;

            const { error: updateError } = await supabase
                .from('profiles')
                .update({ 
                    credits: currentCredits - amount,
                    updated_at: new Date().toISOString()
                })
                .eq('id', userId);

            if (updateError) throw updateError;

            return logData.id;
        });

    } catch (error: any) {
        throw new Error(formatDbError(error));
    }
};

export const refundCredits = async (userId: string, amount: number, description: string = 'Hoàn tiền'): Promise<void> => {
    try {
        const { data: profile } = await supabase.from('profiles').select('credits').eq('id', userId).single();
        if (!profile) return;

        await supabase.from('profiles').update({ 
            credits: profile.credits + amount, 
            updated_at: new Date().toISOString() 
        }).eq('id', userId);

        await supabase.from('usage_logs').insert({
            user_id: userId,
            credits_used: -amount,
            description: description,
        });
    } catch (e) {}
};

export const redeemGiftCode = async (userId: string, code: string): Promise<number> => {
    try {
        const cleanCode = code.trim().toUpperCase();
        const { data: giftCode, error: codeError } = await supabase
            .from('gift_codes')
            .select('*')
            .eq('code', cleanCode)
            .eq('is_active', true)
            .single();

        if (codeError || !giftCode) throw new Error('[404] Mã không tồn tại');
        if (giftCode.expires_at && new Date(giftCode.expires_at) < new Date()) throw new Error('[410] Mã hết hạn');

        const { data: usage } = await supabase.from('gift_code_usages').select('id').eq('user_id', userId).eq('code_id', giftCode.id).maybeSingle();
        if (usage) throw new Error('[409] Mã đã sử dụng');

        const { error: usageError } = await supabase.from('gift_code_usages').insert({ user_id: userId, code_id: giftCode.id });
        if (usageError) throw usageError;

        const { data: profile } = await supabase.from('profiles').select('credits, subscription_end').eq('id', userId).single();
        const currentCredits = profile?.credits || 0;
        const newCredits = currentCredits + giftCode.credits;
        
        let newSubscriptionEnd = profile?.subscription_end;
        const durationDays = (giftCode as any).duration_days;
        if (durationDays && durationDays > 0) {
            const now = new Date();
            const potentialNewExpiry = new Date(now);
            potentialNewExpiry.setDate(potentialNewExpiry.getDate() + durationDays);
            const currentExpiry = profile?.subscription_end ? new Date(profile.subscription_end) : null;
            
            if (!currentExpiry || currentExpiry < now) newSubscriptionEnd = potentialNewExpiry.toISOString();
            else newSubscriptionEnd = (potentialNewExpiry > currentExpiry) ? potentialNewExpiry.toISOString() : currentExpiry.toISOString();
        }

        const updatePayload: any = { credits: newCredits, updated_at: new Date().toISOString() };
        if (newSubscriptionEnd) updatePayload.subscription_end = newSubscriptionEnd;

        await supabase.from('profiles').update(updatePayload).eq('id', userId);
        
        // Log transaction
        supabase.from('transactions').insert({
            user_id: userId,
            plan_name: `Giftcode: ${cleanCode}`,
            plan_id: 'gift_redemption',
            amount: 0,
            currency: 'VND',
            type: 'credit',
            credits_added: giftCode.credits,
            status: 'completed',
            payment_method: 'giftcode',
            transaction_code: cleanCode
        }).then();

        return giftCode.credits;
    } catch (e: any) {
        throw new Error(formatDbError(e));
    }
};
