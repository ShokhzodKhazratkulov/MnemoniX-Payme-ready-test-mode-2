
import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Sparkles, 
  CreditCard, 
  Zap, 
  CheckCircle2, 
  ChevronLeft,
  Loader2,
  ShieldCheck,
  Star,
  Infinity as InfinityIcon,
  MessageSquare,
  Search
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { Language, AppView, SubscriptionTier } from '../types';

const PACKAGES = [
  { 
    id: '1_month', 
    price: 36000, 
    months: 1, 
    label: '1 OY', 
    daily: '1,200 UZS', 
    color: 'blue',
    features: ['Unlimited word searches', 'Voice mode access', 'Post creations', 'No daily limits']
  },
  { 
    id: '3_months', 
    price: 96000, 
    months: 3, 
    label: '3 OY', 
    daily: '1,066 UZS', 
    popular: true, 
    color: 'accent',
    features: ['All Premium features', 'Priority Support', 'Early access to models', 'Best value monthly']
  },
  { 
    id: '6_months', 
    price: 180000, 
    months: 6, 
    label: '6 OY', 
    daily: '1,000 UZS', 
    color: 'purple',
    features: ['All Premium features', 'Long-term savings', 'Lifetime word history', 'Premium Badge']
  },
];

interface Props {
  user: any;
  onNavigate: (view: AppView) => void;
  language: Language;
  t: any;
  onSignIn: () => void;
}

export const SubscriptionPage: React.FC<Props> = ({ user, onNavigate, language, t, onSignIn }) => {
  const [isUpdating, setIsUpdating] = useState(false);

  const handleSubscribe = async (pkg: typeof PACKAGES[0]) => {
    if (!user) {
      onSignIn();
      return;
    }

    const orderId = `order_${user.id}_${Date.now()}`;
    const amountInTiyin = pkg.price * 100;
    
    setIsUpdating(true);
    try {
      const { error } = await supabase.from('payments').insert({
        user_id: user.id,
        order_id: orderId,
        amount: amountInTiyin,
        package_type: pkg.id,
        status: 'pending'
      });

      if (error) throw error;

      const merchantId = import.meta.env.VITE_PAYME_MERCHANT_ID;
      if (!merchantId) throw new Error("Payme Merchant ID missing");

      const params = `m=${merchantId};ac.order_id=${orderId};a=${amountInTiyin}`;
      const base64Params = btoa(params);
      const checkoutUrl = `https://checkout.paycom.uz/${base64Params}`;

      window.open(checkoutUrl, '_blank');
    } catch (err: any) {
      console.error('Error starting payment:', err);
      alert((t.errorOccurred || 'An error occurred') + ': ' + err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral dark:bg-primary py-24 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto space-y-12">
        {/* Header */}
        <div className="flex items-center justify-between">
          <button 
            onClick={() => onNavigate(AppView.PROFILE)}
            className="p-3 bg-white dark:bg-white/5 rounded-full hover:bg-accent/10 transition-colors"
          >
            <ChevronLeft />
          </button>
          <div className="text-right">
            <h2 className="text-3xl font-black">{t.premium?.plans || "Premium Rejalar"}</h2>
            <p className="text-gray-500 text-sm font-medium">{t.premium?.choosePlan || "O'zingizga mos rejani tanlang"}</p>
          </div>
        </div>

        {/* Hero Section */}
        <div className="relative bg-gradient-to-br from-slate-900 to-indigo-950 rounded-[3rem] p-10 overflow-hidden text-white shadow-2xl">
          <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-accent/20 rounded-full border border-accent/20">
                <Sparkles size={16} className="text-accent" />
                <span className="text-xs font-black uppercase tracking-widest">{t.premium?.bestOffer || "Eng yaxshi tanlov"}</span>
              </div>
              <h1 className="text-4xl sm:text-5xl font-black leading-tight">
                {t.premium?.unlockFullPotential || "Barcha imkoniyatlarni ishga soling"}
              </h1>
              <p className="text-indigo-200/60 leading-relaxed font-medium">
                {t.premium?.premiumBenefitsDesc || "MnemonikX Premium bilan so'z boyligingizni cheksiz oshiring. Hech qanday limitlar va to'siqlarsiz o'rganing."}
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: InfinityIcon, label: t.navSearch || 'Search' },
                { icon: MessageSquare, label: t.btnVoice || 'AI Voice' },
                { icon: Star, label: t.navPosts || 'Posts' },
                { icon: ShieldCheck, label: 'Security' }
              ].map((feature, i) => (
                <div key={i} className="p-6 bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl flex flex-col items-center gap-3">
                  <feature.icon className="text-accent" size={32} />
                  <span className="text-[10px] font-black uppercase tracking-widest text-indigo-200/40">{feature.label}</span>
                </div>
              ))}
            </div>
          </div>
          
          <div className="absolute top-0 right-0 p-12 opacity-10 animate-spin-slow">
            <Sparkles size={200} />
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PACKAGES.map((pkg) => (
            <motion.div 
              key={pkg.id}
              whileHover={{ y: -8 }}
              className={`relative flex flex-col bg-white dark:bg-white/5 border-4 rounded-[2.5rem] p-8 transition-all ${
                pkg.popular ? 'border-accent shadow-2xl shadow-accent/20 ring-4 ring-accent/5' : 'border-transparent'
              }`}
            >
              {pkg.popular && (
                <div className="absolute -top-5 left-1/2 -translate-x-1/2 px-6 py-2 bg-accent text-white text-xs font-black rounded-full uppercase tracking-widest shadow-xl">
                  {t.premium?.popular || 'ENG MASHHUR'}
                </div>
              )}

              <div className="flex-1 space-y-8">
                <div className="text-center">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">{pkg.label} {t.premium?.title || 'OBUNA'}</p>
                  <h3 className="text-3xl font-black">{pkg.price.toLocaleString()} UZS</h3>
                  <div className="mt-2 text-xs font-bold text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1 rounded-full inline-block">
                    Kuniga {pkg.daily}
                  </div>
                </div>

                <div className="space-y-4">
                  {pkg.features.map((feat, i) => (
                    <div key={i} className="flex items-center gap-3 text-sm font-medium text-gray-600 dark:text-gray-300">
                      <div className="flex-shrink-0 w-5 h-5 bg-emerald-100 dark:bg-emerald-500/20 rounded-full flex items-center justify-center text-emerald-600">
                        <CheckCircle2 size={12} />
                      </div>
                      {feat}
                    </div>
                  ))}
                </div>
              </div>

              <button 
                onClick={() => handleSubscribe(pkg)}
                disabled={isUpdating}
                className={`mt-10 w-full py-4 rounded-[1.5rem] font-black text-sm transition-all active:scale-95 flex items-center justify-center gap-2 ${
                  pkg.popular ? 'bg-accent text-white hover:bg-accent-hover' : 'bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20'
                }`}
              >
                {isUpdating ? <Loader2 className="animate-spin" size={18} /> : <CreditCard size={18} />}
                {t.premium?.selectPlan || 'DAVOM ETISH'}
              </button>
            </motion.div>
          ))}
        </div>

        <div className="text-center space-y-6">
          <div className="flex items-center justify-center gap-2 text-gray-400 font-bold text-[10px] uppercase tracking-widest">
            <ShieldCheck size={14} className="text-emerald-500" />
            {t.premium?.securePayment || "Xavfsiz to'lov tizimi (Payme)"}
          </div>
          <p className="text-[10px] text-gray-400 max-w-sm mx-auto leading-relaxed">
            {t.premium?.paymentNote || "Obuna orqali siz MnemonikX litsenziya shartlariga rozilik bildirasiz. To'lovlar qaytarilmaydi."}
          </p>
        </div>
      </div>
    </div>
  );
};
