import React, { useState, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { loadStripe } from '@stripe/stripe-js';
import { Crown, Check, CreditCard, Smartphone, Loader2, Building2, ArrowLeft, ShieldCheck, AlertCircle, XCircle } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'motion/react';
import { useFlutterwave, closePaymentModal } from 'flutterwave-react-v3';
import { db, doc, updateDoc, serverTimestamp, collection, addDoc } from '../firebase';
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
  
  // Custom states for MMGate
  const [mmgateStep, setMmgateStep] = useState<'idle' | 'confirm_duplicate' | 'polling'>('idle');
  const [pollingId, setPollingId] = useState<string | null>(null);

  // Flutterwave Configuration
  const config = useMemo(() => ({
    public_key: import.meta.env.VITE_FLW_PUBLIC_KEY || 'FLWPUBK_TEST-3ec24e39581021714496e45a70ce0f25-X',
    tx_ref: `tx-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    amount: selectedPlan ? parseFloat(selectedPlan.priceFCFA.replace(/\s/g, '')) : 0,
    currency: 'XAF',
    payment_options: paymentMethod === 'card' ? 'card' : 
                    paymentMethod === 'bank_transfer' ? 'banktransfer' : 'card,banktransfer', // Exclude Momo from FLW as it's handled by MMGate
    customer: {
      email: user?.email || '',
      phone_number: phoneNumber || '',
      name: profile?.displayName || user?.displayName || 'Client',
    },
    customizations: {
      title: paymentMethod === 'card' ? t('card_payment') :
             paymentMethod === 'bank_transfer' ? t('bank_transfer_payment') : t('subscription_title'),
      description: `${t('subscription')} ${selectedPlan?.name} - ${selectedPlan?.priceFCFA} FCFA`,
      logo: 'https://picsum.photos/seed/womenimpact/200/200',
    },
  }), [selectedPlan, paymentMethod, user, profile, phoneNumber]);

  const handleFlutterwavePayment = useFlutterwave(config);

  const startPolling = async (idoper: string) => {
    setMmgateStep('polling');
    setPollingId(idoper);

    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch(`/api/mmgate/status/${idoper}`);
        const data = await res.json();
        
        console.log("Polling MMGate Status:", data);

        if (data.ETATO === 200 || data.ETATO === '200') {
          // Success
          clearInterval(pollInterval);
          if (user) {
            await updateDoc(doc(db, 'users', user.uid), {
                subscriptionStatus: 'premium',
                subscriptionId: idoper,
                updatedAt: serverTimestamp()
            });
          }
          setStatus({ text: t('payment_success_verified') || "Paiement validé avec succès !", type: 'success' });
          setLoading(null);
          setMmgateStep('idle');
          setPollingId(null);
          setTimeout(() => navigate('/dashboard'), 3000);
        } else if (data.ETATO !== 300 && data.ETATO !== '300') {
          // Failed or Not Found
          clearInterval(pollInterval);
          setStatus({ text: data.ETATO === 404 ? "Paiement refusé." : data.ETATO === 403 ? "Paiement annulé." : "Le paiement a échoué.", type: 'error' });
          setLoading(null);
          setMmgateStep('idle');
          setPollingId(null);
        }
        // If 401 or 402, it continues polling
      } catch (err) {
        console.error("Polling error:", err);
      }
    }, 5000);
  };

  const handleMMGateDuplicateConfirm = async () => {
    setLoading(t('processing') || 'Traitement...');
    try {
      const response = await fetch('/api/mmgate/payment/confirm-duplicate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phoneNumber,
            amount: parseFloat(selectedPlan.priceFCFA.replace(/\s/g, '')),
            reference: `sub_dup_${user?.uid}_${Date.now()}`
          }),
      });
      const data = await response.json();
      
      if (data.ETAT === 200 && data.IDOPER) {
         setStatus({ text: "Demande de paiement envoyée. Veuillez valider sur votre téléphone (Code secret).", type: 'success' });
         startPolling(data.IDOPER);
      } else {
         throw new Error(data.message || `Erreur MMGate (ETAT: ${data.ETAT})`);
      }
    } catch (err: any) {
       setStatus({ text: err.message || t('common.error_occurred'), type: 'error' });
       setLoading(null);
       setMmgateStep('idle');
    }
  };

  const handleSubscribe = async () => {
    if (!user) {
      navigate('/dashboard');
      return;
    }

    if (!selectedPlan || !paymentMethod) return;

    // Direct MMGate Handling for Mobile Money
    if (paymentMethod.startsWith('momo')) {
        const cleanPhone = phoneNumber.replace(/\s+/g, '');
        if (!/^((237)?6[0-9]{8})$/.test(cleanPhone)) {
          setStatus({ text: "Numéro invalide. Format attendu : 6XXXXXXXX ou 2376XXXXXXXX", type: 'error' });
          return;
        }

        setLoading(t('processing') || 'Traitement...');
        setMmgateStep('idle');
        setStatus(null);
        
        try {
            const response = await fetch('/api/mmgate/payment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  phoneNumber,
                  amount: parseFloat(selectedPlan.priceFCFA.replace(/\s/g, '')),
                  reference: `sub_${user.uid}_${Date.now()}`
                }),
            });

            if (!response.ok) {
              const d = await response.json();
              throw new Error(d.error || 'Erreur serveur');
            }

            const data = await response.json();
            console.log("MMGate Init:", data);

            if (data.ETAT === 200 && data.IDOPER) {
               // Success init
               setStatus({ text: "Demande de paiement envoyée. Veuillez valider sur votre téléphone (Code secret).", type: 'success' });
               startPolling(data.IDOPER);
            } else if (data.ETAT === 600) {
               // Doublon probable
               setMmgateStep('confirm_duplicate');
               setLoading(null);
            } else {
               throw new Error(data.message || `Erreur lors de l'initiation (ETAT: ${data.ETAT})`);
            }
        } catch (err: any) {
            console.error("MMGate Error:", err);
            setStatus({ text: err.message || t('common.error_occurred'), type: 'error' });
            setLoading(null);
        }
        return;
    }

    // Manual Bank Transfer
    if (paymentMethod === 'bank_transfer') {
      setLoading(t('common.processing') || 'Traitement...');
      try {
        await addDoc(collection(db, 'messages'), {
          name: profile?.displayName || user?.displayName || 'Abonné Sans Nom',
          email: user?.email || 'N/A',
          phone: phoneNumber || 'Non renseigné',
          subject: 'PREUVE DE VIREMENT - Abonnement',
          message: `L'utilisateur indique avoir effectué un virement de ${selectedPlan.priceFCFA} FCFA pour l'abonnement ${selectedPlan.name}.\n\nVeuillez vérifier le compte bancaire Afriland First Bank (Nemgne Nokam josseline, 10005-00001-05116631101-28) et activer manuellement l'abonnement en changeant le rôle de l'utilisateur à "Premium" dans le tableau de bord d'administration.`,
          status: 'new',
          createdAt: serverTimestamp()
        });
        setStatus({ text: "Demande envoyée. Votre abonnement sera activé par un administrateur dès réception de votre virement.", type: 'success' });
        setTimeout(() => navigate('/dashboard'), 5000);
      } catch (err: any) {
        console.error(err);
        setStatus({ text: "Erreur lors de l'envoi de la demande.", type: 'error' });
        setLoading(null);
      }
      return;
    }

    // Global Payment Methods (Flutterwave)
    if (paymentMethod === 'card') {
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
      price: '2.50',
      priceFCFA: '1 500',
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
      price: '25.00',
      priceFCFA: '15 000',
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
    <div className="pt-32 pb-20 container-custom min-h-[100dvh]">
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
              <div className="text-5xl font-serif text-burgundy mb-2">
                {plan.priceFCFA} <span className="text-2xl font-sans tracking-normal">FCFA</span>
              </div>
              <div className="text-lg font-medium text-gray-500 mb-8 flex items-center justify-center gap-2">
                <span>{plan.price.replace('.', ',')} €</span>
                <span className="text-gray-300">•</span>
                <span>{plan.period}</span>
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
                <div className={`w-16 h-16 rounded-xl flex items-center justify-center shadow-sm overflow-hidden bg-white`}>
                  <svg width="40" height="40" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect width="100" height="100" rx="20" fill="#f8f9fa"/>
                    <circle cx="35" cy="50" r="20" fill="#eb001b" fillOpacity="0.9"/>
                    <circle cx="65" cy="50" r="20" fill="#f79e1b" fillOpacity="0.9"/>
                  </svg>
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
                <div className={`w-16 h-16 rounded-xl flex items-center justify-center shadow-sm overflow-hidden bg-white`}>
                  <svg width="40" height="40" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect width="100" height="100" rx="20" fill="#FF6600"/>
                    <rect x="25" y="25" width="50" height="50" fill="#FF6600" stroke="white" strokeWidth="4"/>
                    <text x="50" y="55" fill="white" fontSize="16" fontFamily="Arial, sans-serif" fontWeight="bold" textAnchor="middle">orange</text>
                  </svg>
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
                <div className={`w-16 h-16 rounded-xl flex items-center justify-center shadow-sm overflow-hidden bg-white`}>
                  <svg width="40" height="40" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect width="100" height="100" rx="20" fill="#FFCC00"/>
                    <ellipse cx="50" cy="50" rx="35" ry="25" fill="#FFCC00" stroke="black" strokeWidth="4"/>
                    <text x="50" y="55" fill="black" fontSize="24" fontFamily="Arial, sans-serif" fontWeight="bold" textAnchor="middle">MTN</text>
                  </svg>
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
                <div className={`w-16 h-16 rounded-xl flex items-center justify-center shadow-sm overflow-hidden bg-white`}>
                  <svg width="40" height="40" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect width="100" height="100" rx="20" fill="#f8f9fa"/>
                    <path d="M50 20 L20 40 H80 Z" fill="#d4af37"/>
                    <rect x="30" y="45" width="8" height="30" fill="#d4af37"/>
                    <rect x="46" y="45" width="8" height="30" fill="#d4af37"/>
                    <rect x="62" y="45" width="8" height="30" fill="#d4af37"/>
                    <rect x="20" y="75" width="60" height="5" fill="#d4af37"/>
                  </svg>
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
                      placeholder="Ex: 6XXXXXXXX"
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
                      <span className="font-bold">Afriland First Bank</span>
                    </div>
                    <div className="p-4 bg-white border border-gray-100 rounded-lg">
                      <span className="text-gray-400 uppercase tracking-widest block mb-1">{t('account_name')}</span>
                      <span className="font-bold uppercase">Nemgne Nokam josseline</span>
                    </div>
                    <div className="p-4 bg-white border border-gray-100 rounded-lg">
                      <span className="text-gray-400 uppercase tracking-widest block mb-1">Numéro de compte</span>
                      <span className="font-mono font-bold text-sm tracking-widest text-[#d4af37]">10005 - 00001 - 05116631101 - 28</span>
                    </div>
                  </div>

                  <div className="p-4 bg-burgundy/5 border border-burgundy/10 rounded-lg text-burgundy text-center">
                    <div className="text-[12px] font-bold uppercase tracking-widest mb-1">{t('reference_to_indicate')} : {user?.uid.slice(0, 8).toUpperCase()}</div>
                    <div className="text-[10px] opacity-80 normal-case tracking-normal">Veuillez indiquer ce code dans le motif de votre virement pour nous permettre d'identifier votre paiement.</div>
                  </div>
                </div>
              </motion.div>
            )}

            {mmgateStep === 'confirm_duplicate' ? (
              <div className="space-y-4">
                <div className="p-4 bg-yellow-50 text-yellow-800 rounded-lg text-sm mb-4 border border-yellow-200 flex gap-3">
                  <AlertCircle className="flex-none mt-0.5" size={20} />
                  Une transaction similaire a été détectée très récemment (Doublon probable). Voulez-vous tout de même procéder à ce nouveau paiement ?
                </div>
                <div className="flex gap-4">
                  <button 
                    onClick={() => setMmgateStep('idle')}
                    className="flex-1 py-4 bg-gray-100 text-gray-700 uppercase tracking-widest text-xs font-bold hover:bg-gray-200 transition-colors"
                  >
                    Annuler
                  </button>
                  <button 
                    onClick={handleMMGateDuplicateConfirm}
                    className="flex-1 py-4 bg-gold text-black uppercase tracking-widest text-xs font-bold hover:bg-yellow-500 transition-colors"
                  >
                    Oui, Payer
                  </button>
                </div>
              </div>
            ) : mmgateStep === 'polling' ? (
              <div className="p-8 text-center bg-gray-50 rounded-xl border border-gray-100">
                <Loader2 className="animate-spin text-gold mx-auto mb-4" size={40} />
                <h3 className="font-serif text-xl mb-2">Paiement en attente...</h3>
                <p className="text-sm text-gray-500">
                  Veuillez vérifier votre téléphone et saisir votre code PIN pour valider la transaction. Ne fermez pas cette page.
                </p>
              </div>
            ) : (
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
            )}
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
