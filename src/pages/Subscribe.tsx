import React, { useState, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { loadStripe } from '@stripe/stripe-js';
import { Crown, Check, CreditCard, Smartphone, Loader2, Building2, ArrowLeft, ShieldCheck, AlertCircle, XCircle } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'motion/react';
import { useFlutterwave, closePaymentModal } from 'flutterwave-react-v3';
import { db, doc, updateDoc, serverTimestamp } from '../firebase';
import BackButton from '../components/BackButton';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '');

export default function Subscribe() {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<any | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'momo_orange' | 'momo_mtn' | 'bank_transfer' | null>(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [status, setStatus] = useState<{ text: string, type: 'success' | 'error' } | null>(null);
  const navigate = useNavigate();
  const { t } = useTranslation();

  // Flutterwave Configuration
  const config = useMemo(() => ({
    public_key: import.meta.env.VITE_FLW_PUBLIC_KEY || 'FLWPUBK_TEST-3ec24e39581021714496e45a70ce0f25-X',
    tx_ref: `tx-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    amount: selectedPlan ? parseFloat(selectedPlan.priceFCFA.replace(/\s/g, '')) : 0,
    currency: 'XAF',
    payment_options: paymentMethod === 'card' ? 'card' : 
                    paymentMethod?.startsWith('momo') ? 'mobilemoneyfranco' : 
                    paymentMethod === 'bank_transfer' ? 'banktransfer' : 'card,mobilemoneyfranco,banktransfer',
    customer: {
      email: user?.email || '',
      phone_number: phoneNumber || '',
      name: profile?.displayName || user?.displayName || 'Client',
    },
    customizations: {
      title: paymentMethod === 'momo_orange' ? t('orange_money_payment') :
             paymentMethod === 'momo_mtn' ? t('mtn_momo_payment') :
             paymentMethod === 'card' ? t('card_payment') :
             paymentMethod === 'bank_transfer' ? t('bank_transfer_payment') : t('subscription_title'),
      description: `${t('subscription')} ${selectedPlan?.name} - ${selectedPlan?.priceFCFA} FCFA`,
      logo: 'https://picsum.photos/seed/womenimpact/200/200',
    },
  }), [selectedPlan, paymentMethod, user, profile, phoneNumber]);

  const handleFlutterwavePayment = useFlutterwave(config);

  const handleSubscribe = async () => {
    if (!user) {
      navigate('/dashboard');
      return;
    }

    if (!selectedPlan || !paymentMethod) return;

    // Global & African Payment Methods (Flutterwave)
    if (paymentMethod === 'card' || paymentMethod.startsWith('momo') || paymentMethod === 'bank_transfer') {
      setLoading(selectedPlan.name);
      
      try {
        handleFlutterwavePayment({
          callback: async (response) => {
            console.log("Flutterwave Response:", response);
            
            if (response.status === "successful" || response.status === "completed") {
              // Show intermediate loading
              setLoading(t('verification'));
              
              // Verify payment on server-side
              try {
                const verifyRes = await fetch('/api/verify-payment', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ 
                    transaction_id: response.transaction_id || response.flw_ref,
                    tx_ref: response.tx_ref 
                  })
                });
                
                if (!verifyRes.ok) {
                  const errData = await verifyRes.json();
                  throw new Error(errData.error || "Erreur de vérification serveur");
                }

                const verifyData = await verifyRes.json();
                
                if (verifyData.status === "success" && (verifyData.data.status === "successful" || verifyData.data.status === "completed")) {
                  // Update user profile to premium
                  await updateDoc(doc(db, 'users', user.uid), {
                    subscriptionStatus: 'premium',
                    subscriptionId: (response.transaction_id || response.flw_ref).toString(),
                    updatedAt: serverTimestamp()
                  });
                  setStatus({ text: t('payment_success_verified'), type: 'success' });
                  setTimeout(() => navigate('/dashboard'), 3000);
                } else {
                  console.error("Verification failed data:", verifyData);
                  setStatus({ text: t('payment_verification_failed') + (response.transaction_id || response.flw_ref), type: 'error' });
                }
              } catch (err: any) {
                console.error("Verification error:", err);
                setStatus({ text: t('verification_error') + (err.message || t('connection_problem')), type: 'error' });
              }
            } else {
              setStatus({ text: t('payment_cancelled_failed'), type: 'error' });
            }
            closePaymentModal();
            setLoading(null);
          },
          onClose: () => {
            setLoading(null);
          },
        });
      } catch (err: any) {
        console.error("Flutterwave initialization error:", err);
        setStatus({ text: t('payment_init_error'), type: 'error' });
        setLoading(null);
      }
      return;
    }

    // Fallback or other methods (e.g. Stripe if specifically needed later)
    setLoading(selectedPlan.name);
    try {
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId: selectedPlan.id,
          userId: user.uid,
          email: user.email,
        }),
      });

      const session = await response.json();

      if (session.error) {
        throw new Error(session.error);
      }

      const stripe = await stripePromise;
      if (stripe) {
        const { error } = await (stripe as any).redirectToCheckout({
          sessionId: session.id,
        });
        if (error) {
          console.error(error);
          setStatus({ text: error.message || "Erreur Stripe", type: 'error' });
        }
      }
    } catch (error: any) {
      console.error('Subscription error:', error);
      setStatus({ text: error.message || t('common.error_occurred') || 'Une erreur est survenue.', type: 'error' });
    } finally {
      setLoading(null);
    }
  };

  const plans = [
    {
      id: 'price_monthly_placeholder',
      name: t('common.monthly'),
      price: '9.99',
      priceFCFA: '6 500',
      period: t('common.per_month') || '/mois',
      features: [
        t('unlimited_articles'),
        t('digital_magazine_included'),
        t('premium_videos'),
        t('exclusive_newsletter')
      ],
      buttonClass: 'btn-gold',
      popular: false
    },
    {
      id: 'price_yearly_placeholder',
      name: t('common.yearly'),
      price: '89',
      priceFCFA: '58 000',
      period: t('common.per_year') || '/an',
      features: [
        t('all_monthly_content'),
        t('print_magazine_delivered'),
        t('vip_event_invitations'),
        t('2_months_free'),
        t('founding_member_badge')
      ],
      buttonClass: 'btn-premium',
      popular: true
    }
  ];

  return (
    <div className="pt-32 pb-20 container-custom min-h-screen">
      <div className="text-center max-w-2xl mx-auto mb-12">
        <BackButton className="mx-auto mb-8" />
        <h1 className="text-5xl font-serif mb-6">{t('join_community') || t('common.join_community')}</h1>
        <p className="text-gray-600">
          {t('common.support_media')}
        </p>
      </div>

      {!selectedPlan ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-5xl mx-auto">
          {plans.map((plan) => (
            <div 
              key={plan.name}
              className={`border p-12 text-center transition-all duration-500 relative flex flex-col ${
                plan.popular ? 'border-burgundy border-2 scale-105 shadow-xl' : 'border-gray-200 hover:border-gold'
              }`}
            >
              {plan.popular && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-burgundy text-white px-6 py-1 text-[10px] uppercase tracking-[0.2em] font-bold">
                  {t('common.most_popular')}
                </div>
              )}
              
              <h3 className="font-serif text-3xl mb-4">{plan.name}</h3>
              <div className="text-4xl font-serif text-burgundy mb-2">
                {plan.price} € <span className="text-sm text-gray-400 font-sans tracking-normal">{plan.period}</span>
              </div>
              <div className="text-2xl font-serif text-gray-400 mb-8">
                {plan.priceFCFA} FCFA <span className="text-sm font-sans tracking-normal">{plan.period}</span>
              </div>

              <ul className="text-sm text-gray-500 space-y-5 mb-12 flex-grow text-left max-w-xs mx-auto">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <Check size={16} className="text-gold mt-0.5 flex-none" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <button 
                onClick={() => setSelectedPlan(plan)}
                className={`${plan.buttonClass} w-full py-4`}
              >
                {t('common.choose_plan')}
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="max-w-2xl mx-auto">
          <button 
            onClick={() => { setSelectedPlan(null); setPaymentMethod(null); }}
            className="mb-8 text-xs uppercase tracking-widest font-bold text-gray-400 hover:text-gold flex items-center gap-2"
          >
            ← {t('common.back_to_plans') || 'Retour aux offres'}
          </button>

          <div className="bg-white border border-gray-100 shadow-2xl p-12">
            <h2 className="text-3xl font-serif mb-2 text-center">{selectedPlan.name}</h2>
            <p className="text-center text-gray-400 text-xs uppercase tracking-widest mb-12">{t('step_2_payment_method')}</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-12">
              <button 
                onClick={() => setPaymentMethod('card')}
                className={`flex items-center gap-6 p-6 rounded-2xl border-2 transition-all text-left ${
                  paymentMethod === 'card' ? 'border-burgundy bg-burgundy/5 ring-1 ring-burgundy' : 'border-gray-100 hover:border-gray-200 bg-white'
                }`}
              >
                <div className={`w-16 h-16 rounded-xl flex items-center justify-center shadow-sm ${paymentMethod === 'card' ? 'bg-burgundy text-white' : 'bg-gray-50 text-gray-400'}`}>
                  <CreditCard size={32} />
                </div>
                <div>
                  <div className="text-xs font-bold uppercase tracking-widest mb-1">{t('bank_card')}</div>
                  <div className="text-[10px] text-gray-400">Visa, Mastercard, Verve</div>
                </div>
              </button>

              <button 
                onClick={() => setPaymentMethod('momo_orange')}
                className={`flex items-center gap-6 p-6 rounded-2xl border-2 transition-all text-left ${
                  paymentMethod === 'momo_orange' ? 'border-[#FF6600] bg-[#FF6600]/5 ring-1 ring-[#FF6600]' : 'border-gray-100 hover:border-gray-200 bg-white'
                }`}
              >
                <div className={`w-16 h-16 rounded-xl flex items-center justify-center shadow-sm ${paymentMethod === 'momo_orange' ? 'bg-[#FF6600] text-white' : 'bg-gray-50 text-gray-400'}`}>
                  <Smartphone size={32} />
                </div>
                <div>
                  <div className="text-xs font-bold uppercase tracking-widest mb-1">Orange Money</div>
                  <div className="text-[10px] text-gray-400">{t('mobile_payment_cameroon')}</div>
                </div>
              </button>

              <button 
                onClick={() => setPaymentMethod('momo_mtn')}
                className={`flex items-center gap-6 p-6 rounded-2xl border-2 transition-all text-left ${
                  paymentMethod === 'momo_mtn' ? 'border-[#FFCC00] bg-[#FFCC00]/5 ring-1 ring-[#FFCC00]' : 'border-gray-100 hover:border-gray-200 bg-white'
                }`}
              >
                <div className={`w-16 h-16 rounded-xl flex items-center justify-center shadow-sm ${paymentMethod === 'momo_mtn' ? 'bg-[#FFCC00] text-black' : 'bg-gray-50 text-gray-400'}`}>
                  <Smartphone size={32} />
                </div>
                <div>
                  <div className="text-xs font-bold uppercase tracking-widest mb-1">MTN MoMo</div>
                  <div className="text-[10px] text-gray-400">{t('mobile_money_cameroon')}</div>
                </div>
              </button>

              <button 
                onClick={() => setPaymentMethod('bank_transfer')}
                className={`flex items-center gap-6 p-6 rounded-2xl border-2 transition-all text-left ${
                  paymentMethod === 'bank_transfer' ? 'border-gold bg-gold/5 ring-1 ring-gold' : 'border-gray-100 hover:border-gray-200 bg-white'
                }`}
              >
                <div className={`w-16 h-16 rounded-xl flex items-center justify-center shadow-sm ${paymentMethod === 'bank_transfer' ? 'bg-gold text-black' : 'bg-gray-50 text-gray-400'}`}>
                  <Building2 size={32} />
                </div>
                <div>
                  <div className="text-xs font-bold uppercase tracking-widest mb-1">{t('bank_transfer')}</div>
                  <div className="text-[10px] text-gray-400">{t('direct_transfer')}</div>
                </div>
              </button>
            </div>

            {paymentMethod === 'card' && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6 mb-12"
              >
                <div className="p-6 bg-burgundy/5 border border-burgundy/10 rounded-xl flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-burgundy/10 flex items-center justify-center flex-none">
                    <ShieldCheck className="text-burgundy" size={20} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-widest mb-1">{t('secure_card_payment')}</h4>
                    <p className="text-[10px] text-gray-500 leading-relaxed">
                      {t('secure_card_payment_description')}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {(paymentMethod === 'momo_orange' || paymentMethod === 'momo_mtn') && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6 mb-12"
              >
                <div className="p-6 bg-gold/5 border border-gold/10 rounded-xl space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center flex-none">
                      <Smartphone className="text-gold" size={20} />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-widest mb-1">{t('mobile_money_payment')}</h4>
                      <p className="text-[10px] text-gray-500 leading-relaxed">
                        {t('mobile_money_payment_description')}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[8px] uppercase tracking-widest font-bold text-gray-400">
                      {t('phone_number_whatsapp')}
                    </label>
                    <input 
                      type="tel"
                      placeholder="Ex: +237 697061084"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      className="w-full bg-white border border-gray-100 px-6 py-4 rounded-lg focus:outline-none focus:border-gold transition-colors font-mono text-sm"
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {paymentMethod === 'bank_transfer' && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6 mb-12"
              >
                <div className="p-8 bg-gray-50 border border-gray-100 rounded-xl space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-none">
                      <Building2 className="text-gray-400" size={20} />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-widest mb-1">{t('bank_details')}</h4>
                      <p className="text-[10px] text-gray-500 leading-relaxed">
                        {t('bank_details_description')}
                      </p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-4 text-[10px]">
                    <div className="p-4 bg-white border border-gray-100 rounded-lg">
                      <span className="text-gray-400 uppercase tracking-widest block mb-1">{t('bank')}</span>
                      <span className="font-bold">UBA Cameroon</span>
                    </div>
                    <div className="p-4 bg-white border border-gray-100 rounded-lg">
                      <span className="text-gray-400 uppercase tracking-widest block mb-1">{t('account_name')}</span>
                      <span className="font-bold">WOMEN IMPACT MEDIA</span>
                    </div>
                    <div className="p-4 bg-white border border-gray-100 rounded-lg">
                      <span className="text-gray-400 uppercase tracking-widest block mb-1">IBAN / RIB</span>
                      <span className="font-mono font-bold">CM21 10033 05211 01234567890 12</span>
                    </div>
                  </div>

                  <div className="p-4 bg-burgundy/5 border border-burgundy/10 rounded-lg text-burgundy text-[9px] font-bold uppercase tracking-widest text-center">
                    {t('reference_to_indicate')} : {user?.uid.slice(0, 8).toUpperCase()}
                  </div>
                </div>
              </motion.div>
            )}

            <button 
              onClick={handleSubscribe}
              disabled={!paymentMethod || loading !== null || ((paymentMethod.startsWith('momo')) && !phoneNumber)}
              className="btn-premium w-full py-5 disabled:opacity-50 flex items-center justify-center gap-3"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  {t('common.processing') || 'Traitement...'}
                </>
              ) : (
                <>
                  {paymentMethod === 'card' ? t('proceed_to_card_payment') : 
                   paymentMethod === 'bank_transfer' ? t('confirm_transfer') : t('pay_now')}
                </>
              )}
            </button>
          </div>
        </div>
      )}

      <div className="mt-20 text-center space-y-6">
        <div className="text-gray-400 text-[10px] uppercase tracking-[0.3em] font-bold">
          {t('secure_encrypted_payment')}
        </div>
        <div className="flex items-center justify-center gap-8 opacity-30 grayscale hover:grayscale-0 transition-all duration-500">
          <img src="https://upload.wikimedia.org/wikipedia/commons/b/ba/Stripe_Logo%2C_revised_2016.svg" alt="Stripe" className="h-4" referrerPolicy="no-referrer" />
          <div className="h-6 w-[1px] bg-gray-300" />
          <img src="https://picsum.photos/seed/flutterwave/100/30" alt="Flutterwave" className="h-5 object-contain" referrerPolicy="no-referrer" />
          <div className="h-6 w-[1px] bg-gray-300" />
          <div className="flex gap-2">
            <div className="w-8 h-5 bg-blue-800 rounded-sm" />
            <div className="w-8 h-5 bg-orange-500 rounded-sm" />
          </div>
        </div>
        <p className="text-[9px] text-gray-400 max-w-xs mx-auto leading-relaxed">
          {t('secure_payment_description')}
        </p>
      </div>

      {/* Status Notifications */}
      <AnimatePresence>
        {status && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className={`fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] px-8 py-4 rounded-xl shadow-2xl flex flex-col items-center gap-4 min-w-[320px] backdrop-blur-xl border ${
              status.type === 'success' ? 'bg-green-500/90 border-green-400 text-white' : 'bg-red-500/90 border-red-400 text-white'
            }`}
          >
            <div className="flex items-center gap-4 w-full">
              {status.type === 'success' ? <Check size={20} /> : <AlertCircle size={20} />}
              <span className="text-sm font-bold">{status.text}</span>
              <button onClick={() => setStatus(null)} className="ml-auto hover:scale-110 transition-transform">
                <XCircle size={16} />
              </button>
            </div>
            
            {status.type === 'success' && (
              <Link 
                to="/" 
                className="mt-2 px-6 py-2 bg-white text-green-600 rounded-lg text-[10px] uppercase tracking-widest font-bold hover:bg-gray-100 transition-colors"
              >
                {t('back_to_home') || 'Retour à l\'accueil'}
              </Link>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
