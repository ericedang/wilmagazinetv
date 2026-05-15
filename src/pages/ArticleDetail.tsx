import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { db, doc, getDoc, updateDoc, arrayUnion, arrayRemove, OperationType, handleFirestoreError } from '../firebase';
import { Article } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { Loader2, ArrowLeft, Crown, Clock, User, Share2, Bookmark, Linkedin, Facebook, Twitter, Link as LinkIcon, AlertCircle, Phone } from 'lucide-react';
import { motion } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import CommentSection from '../components/CommentSection';
import { toast } from 'react-hot-toast';
import { cn } from '../lib/utils';
import { useTranslation } from 'react-i18next';
import { useLocalizedField } from '../lib/i18n-utils';
import BackButton from '../components/BackButton';

export default function ArticleDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const getLocalized = useLocalizedField();
  const { profile, user } = useAuth();
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);

  // MMGate state
  const [mmgateStep, setMmgateStep] = useState<'idle' | 'confirm_duplicate' | 'polling'>('idle');
  const [paymentPhone, setPaymentPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('momo_mtn');
  const [paymentLoading, setPaymentLoading] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [localAccess, setLocalAccess] = useState(false);

  const isPremiumUser = profile?.subscriptionStatus === 'premium' || profile?.role === 'admin' || profile?.role === 'super-admin' || profile?.role === 'editor';
  const hasPurchased = id && profile?.purchasedArticles?.includes(id);

  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
  const shareTitle = article ? getLocalized(article, 'title') : '';

  const amountToPay = article && article.price ? parseFloat(article.price.replace(/\s/g, '').replace(/[^\d.]/g, '')) : 1000; // default to 1000 CFA if not set for testing

  const grantAccess = async () => {
    setLocalAccess(true);
    if (user && article) {
      try {
        await updateDoc(doc(db, 'users', user.uid), {
          purchasedArticles: arrayUnion(article.id)
        });
      } catch (err) {
        console.error("Error updating user purchasedArticles:", err);
      }
    }
  };

  const startPolling = async (idoper: string) => {
    setMmgateStep('polling');

    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch(`/api/mmgate/status/${idoper}`);
        const data = await res.json();

        const pendingStates = [300, '300', 401, '401'];
        if (data.ETATO === 200 || data.ETATO === '200') {
          clearInterval(pollInterval);
          setPaymentLoading(null);
          setMmgateStep('idle');
          await grantAccess();
          toast.success("Achat d'article réussi !");
        } else if (!pendingStates.includes(data.ETATO)) {
          clearInterval(pollInterval);
          
          let errorMessage = "Le paiement a échoué.";
          if (data.ETATO == 402) errorMessage = "Échec : Solde insuffisant. Veuillez recharger votre compte.";
          else if (data.ETATO == 403) errorMessage = "Paiement annulé par l'utilisateur.";
          else if (data.ETATO == 404) errorMessage = "Numéro non valide ou paiement introuvable.";
          else if (data.ETATO == 500) errorMessage = "Erreur de l'opérateur mobile.";

          setPaymentError(errorMessage);
          setPaymentLoading(null);
          setMmgateStep('idle');
        }
      } catch (err) {
        console.error("Polling error:", err);
      }
    }, 20000);
  };

  const handleBuyNow = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!user) {
      toast.error('Veuillez vous connecter pour acheter.');
      navigate('/dashboard');
      return;
    }
    if (!paymentPhone) {
      setPaymentError("Veuillez entrer un numéro de téléphone");
      return;
    }
    const cleanPhone = paymentPhone.replace(/\s+/g, '');
    if (!/^((237)?6[0-9]{8})$/.test(cleanPhone)) {
      setPaymentError("Numéro invalide. Format attendu : 6XXXXXXXX ou 2376XXXXXXXX");
      return;
    }

    setPaymentError(null);
    setPaymentLoading('Initialisation...');
    setMmgateStep('idle');

    try {
        const response = await fetch('/api/mmgate/payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              phoneNumber: paymentPhone,
              amount: amountToPay,
              reference: `art_${article?.id}_${Date.now()}`
            }),
        });

        if (!response.ok) throw new Error('Erreur serveur');

        const data = await response.json();
        
        if (data.ETAT === 200 && data.IDOPER) {
            startPolling(data.IDOPER);
        } else if (data.ETAT === 600) {
            setMmgateStep('confirm_duplicate');
            setPaymentLoading(null);
        } else {
            throw new Error(data.message || `Erreur (ETAT: ${data.ETAT})`);
        }
    } catch (err: any) {
        setPaymentError(err.message || t('common.error_occurred'));
        setPaymentLoading(null);
    }
  };

  const handleMMGateDuplicateConfirm = async () => {
    setPaymentLoading('Traitement...');
    try {
      const response = await fetch('/api/mmgate/payment/confirm-duplicate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phoneNumber: paymentPhone,
            amount: amountToPay,
            reference: `art_${article?.id}_${Date.now()}`
          }),
      });
      const data = await response.json();
      
      if (data.ETAT === 200 && data.IDOPER) {
         startPolling(data.IDOPER);
      } else {
         throw new Error(data.message || `Erreur MMGate (ETAT: ${data.ETAT})`);
      }
    } catch (err: any) {
       setPaymentError(err.message || t('common.error_occurred'));
       setPaymentLoading(null);
       setMmgateStep('idle');
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          url: shareUrl
        });
      } catch (err) {
        console.log('Error sharing:', err);
      }
    } else {
      // Fallback: scroll to social buttons or copy link
      navigator.clipboard.writeText(shareUrl);
      toast.success(t('link_copied'));
    }
  };

  const toggleFavorite = async () => {
    if (!user || !article) {
      toast.error(t('login_to_save_article'));
      return;
    }

    const isFavorite = profile?.favorites?.includes(article.id);
    const userRef = doc(db, 'users', user.uid);

    try {
      if (isFavorite) {
        await updateDoc(userRef, {
          favorites: arrayRemove(article.id)
        });
        toast.success(t('removed_from_favorites'));
      } else {
        await updateDoc(userRef, {
          favorites: arrayUnion(article.id)
        });
        toast.success(t('added_to_favorites'));
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
    }
  };

  useEffect(() => {
    const fetchArticle = async () => {
      if (!id) return;
      try {
        const docRef = doc(db, 'articles', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setArticle({ id: docSnap.id, ...docSnap.data() } as Article);
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `articles/${id}`);
      } finally {
        setLoading(false);
      }
    };

    fetchArticle();
  }, [id]);

  if (loading) {
    return (
      <div className="pt-32 min-h-[100dvh] flex items-center justify-center">
        <Loader2 className="animate-spin text-gold" size={48} />
      </div>
    );
  }

  if (!article) {
    return (
      <div className="pt-32 min-h-[100dvh] container-custom text-center">
        <BackButton className="mx-auto mb-8" />
        <h1 className="text-4xl font-serif mb-8">{t('article_not_found')}</h1>
        <Link to="/articles" className="btn-gold">{t('back_to_articles')}</Link>
      </div>
    );
  }

  // Remove the early return block for article.isPremium to allow viewing the header/image

  const isPremiumRestriction = article.isPremium && !isPremiumUser && !hasPurchased && !localAccess;

  const getTruncatedContent = (content: string) => {
    const paragraphs = content.split('\n\n');
    if (paragraphs.length <= 2) return content.substring(0, 300) + '...';
    return paragraphs.slice(0, 2).join('\n\n') + '\n\n...';
  };

  return (
    <div className="pt-32 pb-20 min-h-[100dvh] bg-white">
      <article className="container-custom max-w-4xl">
        <BackButton className="mb-12" />

        <header className="mb-16">
          <div className="flex items-center gap-3 text-[10px] uppercase tracking-widest text-gold mb-6 font-bold">
            <span>{getLocalized(article, 'category')}</span>
            <span className="w-1 h-1 bg-gray-300 rounded-full" />
            <span className="text-gray-400">{t('reading')} {getLocalized(article, 'date')}</span>
          </div>
          <h1 className="text-3xl md:text-5xl lg:text-7xl font-serif mb-12 leading-tight">
            {getLocalized(article, 'title')}
          </h1>
          <div className="flex flex-wrap items-center justify-between gap-8 py-8 border-y border-gray-100">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-burgundy font-bold">
                {article.author.charAt(0)}
              </div>
              <div>
                <div className="text-xs font-bold uppercase tracking-widest">{article.author}</div>
                <div className="text-[10px] text-gray-400 uppercase tracking-widest">{t('wil_editor')}</div>
              </div>
            </div>
            <div className="flex items-center gap-6 text-gray-400">
              <button onClick={handleShare} className="hover:text-gold transition-colors flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold">
                <Share2 size={16} /> {t('share')}
              </button>
              <button 
                onClick={toggleFavorite}
                className={cn(
                  "transition-colors flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold",
                  profile?.favorites?.includes(article.id) ? "text-gold" : "hover:text-gold"
                )}
              >
                <Bookmark size={16} fill={profile?.favorites?.includes(article.id) ? "currentColor" : "none"} /> 
                {profile?.favorites?.includes(article.id) ? t('saved') : t('save')}
              </button>
            </div>
          </div>
        </header>

        <div className="aspect-video mb-16 overflow-hidden shadow-2xl bg-gray-100">
          <img 
            src={article.image || `https://picsum.photos/seed/${article.id}/1600/900`} 
            alt={getLocalized(article, 'title')} 
            className="w-full h-full object-cover" 
            referrerPolicy="no-referrer" 
            onError={(e) => {
              (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${article.id}/1600/900`;
            }}
          />
        </div>

        <div className="relative mb-16">
          <div className="prose prose-xl prose-burgundy max-w-none font-serif leading-relaxed text-gray-800">
            <ReactMarkdown>
              {isPremiumRestriction ? getTruncatedContent(getLocalized(article, 'content')) : getLocalized(article, 'content')}
            </ReactMarkdown>
          </div>
          {isPremiumRestriction && (
            <div className="absolute bottom-0 left-0 right-0 h-64 bg-gradient-to-t from-white via-white/80 to-transparent pointer-events-none flex items-end justify-center pb-8" />
          )}
        </div>

        {isPremiumRestriction ? (
          <div className="max-w-4xl mx-auto bg-black-rich p-8 md:p-12 text-white shadow-2xl mb-16 relative z-10 border border-gold/20 flex flex-col items-center">
            <Crown size={48} className="mx-auto mb-6 text-gold" />
            <h2 className="text-3xl font-serif mb-4 text-center">{t('read_rest_article_title')}</h2>
            <p className="text-gray-400 mb-8 max-w-xl text-center mx-auto">
              Cet article exclusif est réservé aux abonnés. Abonnez-vous pour un accès illimité à tout notre contenu, ou achetez cet article à l'unité.
            </p>
            
            <div className="grid md:grid-cols-2 gap-12 w-full max-w-3xl border border-white/10 p-6 md:p-8 bg-black/50">
              {/* Option 1: Subscription */}
              <div className="flex flex-col justify-center items-center text-center">
                 <h3 className="text-gold font-serif text-xl mb-4">Devenir Abonné Premium</h3>
                 <p className="text-sm text-gray-400 mb-6">Accès illimité à tous les articles, magazines et événements exclusifs.</p>
                 <Link to="/subscribe" className="btn-gold w-full text-center">S'abonner</Link>
              </div>

              {/* Separator line for mobile, vertical for desktop */}
              <div className="w-full h-px bg-white/10 md:hidden" />

              {/* Option 2: One-time Buy */}
              <div className="flex flex-col">
                 <h3 className="text-white font-serif text-xl mb-4 text-center md:text-left">Acheter l'article à l'unité</h3>
                 
                 {mmgateStep === 'confirm_duplicate' ? (
                    <div className="space-y-4">
                        <div className="p-3 bg-yellow-500/10 text-yellow-500 rounded text-xs text-left mb-2 border border-yellow-500/20 flex gap-2">
                            <AlertCircle className="flex-none mt-0.5" size={16} />
                            Doublon probable avec une transaction récente. Confirmer le paiement ?
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => setMmgateStep('idle')} className="flex-1 py-2 bg-gray-800 text-white text-xs hover:bg-gray-700">Annuler</button>
                            <button onClick={handleMMGateDuplicateConfirm} className="flex-1 py-2 bg-gold text-black text-xs hover:bg-yellow-500">Oui, payer</button>
                        </div>
                    </div>
                 ) : mmgateStep === 'polling' ? (
                    <div className="py-8 text-center flex flex-col items-center">
                        <Loader2 className="animate-spin text-gold mx-auto mb-4" size={32} />
                        <p className="text-sm text-gray-400">Veuillez valider le paiement sur votre téléphone (code PIN).</p>
                    </div>
                 ) : (
                    <form onSubmit={handleBuyNow} className="space-y-4 text-left">
                        {paymentError && (
                          <div className="p-2 bg-red-500/10 text-red-500 text-xs rounded border border-red-500/20 mb-2">
                            {paymentError}
                          </div>
                        )}
                        <span className="block text-3xl font-serif text-gold mb-4 text-center md:text-left">{amountToPay} FCFA</span>
                        <div>
                           <div className="grid grid-cols-2 gap-2 mb-4">
                                <button type="button" onClick={() => setPaymentMethod('momo_mtn')} className={`p-3 border rounded text-sm flex items-center justify-center gap-2 ${paymentMethod === 'momo_mtn' ? 'border-yellow-400 text-white' : 'border-gray-700 text-gray-400 hover:border-gray-500'}`}>
                                    <svg width="20" height="20" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                                      <rect width="100" height="100" rx="20" fill="#FFCC00"/>
                                      <ellipse cx="50" cy="50" rx="35" ry="25" fill="#FFCC00" stroke="black" strokeWidth="4"/>
                                      <text x="50" y="55" fill="black" fontSize="24" fontFamily="Arial, sans-serif" fontWeight="bold" textAnchor="middle">MTN</text>
                                    </svg> MTN Mobile Money
                                </button>
                                <button type="button" onClick={() => setPaymentMethod('momo_orange')} className={`p-3 border rounded text-sm flex items-center justify-center gap-2 ${paymentMethod === 'momo_orange' ? 'border-orange-500 text-white' : 'border-gray-700 text-gray-400 hover:border-gray-500'}`}>
                                     <svg width="20" height="20" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                                      <rect width="100" height="100" rx="20" fill="#FF6600"/>
                                      <rect x="25" y="25" width="50" height="50" fill="#FF6600" stroke="white" strokeWidth="4"/>
                                      <text x="50" y="55" fill="white" fontSize="16" fontFamily="Arial, sans-serif" fontWeight="bold" textAnchor="middle">orange</text>
                                    </svg> Orange Money
                                </button>
                           </div>
                           <div className="relative">
                              <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                              <input 
                                required type="tel" value={paymentPhone} onChange={(e) => setPaymentPhone(e.target.value)} 
                                placeholder="Ex: 6XXXXXXXX" 
                                className="w-full bg-gray-900 border border-gray-700 text-white pl-12 pr-4 py-3 text-sm rounded focus:border-gold outline-none"
                              />
                           </div>
                        </div>
                        <button disabled={paymentLoading !== null || !user} type="submit" className="w-full bg-white text-black py-3 text-sm uppercase tracking-widest font-bold hover:bg-gray-200 transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
                           {paymentLoading ? <><Loader2 size={16} className="animate-spin" /> {paymentLoading}</> : (user ? "Payer cet article" : "Connectez-vous pour acheter")}
                        </button>
                    </form>
                 )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 border-t border-gray-100 mb-12">
            <h3 className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-6">{t('share_this_article')}</h3>
            <div className="flex items-center gap-4">
              <a 
                href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center text-gray-600 hover:bg-[#0077b5] hover:text-white transition-colors"
                title={t('share_on_linkedin')}
              >
                <Linkedin size={20} />
              </a>
              <a 
                href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center text-gray-600 hover:bg-[#1877f2] hover:text-white transition-colors"
                title={t('share_on_facebook')}
              >
                <Facebook size={20} />
              </a>
              <a 
                href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareTitle)}`} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center text-gray-600 hover:bg-[#1da1f2] hover:text-white transition-colors"
                title={t('share_on_twitter')}
              >
                <Twitter size={20} />
              </a>
              <button 
                onClick={() => { navigator.clipboard.writeText(shareUrl); toast.success(t('link_copied')); }} 
                className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center text-gray-600 hover:bg-gold hover:text-white transition-colors"
                title={t('copy_link')}
              >
                <LinkIcon size={20} />
              </button>
            </div>
          </div>
        )}

        {/* Comment Section (only for premium to encourage subscribing, or for everybody?) */}
        {!isPremiumRestriction && <CommentSection targetId={article.id} />}
      </article>
    </div>
  );
}
