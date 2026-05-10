import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import { Download, FileText, X, ChevronLeft, ChevronRight, Loader2, ExternalLink, AlertCircle, Phone } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { db, doc, updateDoc, arrayUnion } from '../firebase';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface MagazineViewerProps {
  pdfUrl: string;
  title: string;
  magazineId?: string;
  price?: string;
  onClose: () => void;
}

const MagazineViewer: React.FC<MagazineViewerProps> = ({ pdfUrl, title, magazineId, price = '2000', onClose }) => {
  const { profile, user } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  
  const hasPurchased = magazineId && profile?.purchasedMagazines?.includes(magazineId);
  const isPremium = profile?.subscriptionStatus === 'premium' || profile?.role === 'admin' || profile?.role === 'super-admin' || profile?.role === 'editor' || hasPurchased;

  const [numPages, setNumPages] = useState<number>();
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [isPdfError, setIsPdfError] = useState(false);

  // MMGate payment state
  const [mmgateStep, setMmgateStep] = useState<'idle' | 'confirm_duplicate' | 'polling'>('idle');
  const [paymentPhone, setPaymentPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('momo_mtn');
  const [paymentLoading, setPaymentLoading] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [localAccess, setLocalAccess] = useState(false); // To grant access immediately after successful payment

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    setIsPdfError(false);
  }

  function onDocumentLoadError(error: any) {
    console.warn("React-PDF failed to load, falling back to iframe:", error?.message || error);
    setIsPdfError(true);
  }

  const safePdfUrl = pdfUrl === '#' ? 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf' : pdfUrl;

  const handleDownload = (e: React.MouseEvent) => {
    e.preventDefault();
    import('../lib/download').then(({ downloadFile }) => {
      downloadFile(safePdfUrl, `${title}.pdf`);
    });
  };

  const getGoogleDrivePreviewUrl = (url: string) => {
    if (!url.includes('drive.google.com')) return null;
    const match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      return `https://drive.google.com/file/d/${match[1]}/preview`;
    }
    return url.replace(/\/view.*/, '/preview');
  };

  const drivePreviewUrl = getGoogleDrivePreviewUrl(pdfUrl);

  const isCloudinaryPdf = pdfUrl.includes('cloudinary.com') && pdfUrl.toLowerCase().endsWith('.pdf');
  const [cloudPage, setCloudPage] = useState<number>(1);
  const [maxCloudPage, setMaxCloudPage] = useState<number | null>(null);
  const [cloudImgLoading, setCloudImgLoading] = useState(true);

  const getCloudinaryPageUrl = (url: string, page: number) => {
    const parts = url.split('/upload/');
    if (parts.length !== 2) return url;
    const suffix = parts[1].replace(/\.pdf$/i, '.jpg');
    return `${parts[0]}/upload/pg_${page}/${suffix}`;
  };

  const amountToPay = parseFloat(price.replace(/\s/g, '').replace(/[^\d.]/g, ''));

  const grantAccess = async () => {
    setLocalAccess(true);
    if (user && magazineId) {
      try {
        await updateDoc(doc(db, 'users', user.uid), {
          purchasedMagazines: arrayUnion(magazineId)
        });
      } catch (err) {
        console.error("Error updating user purchasedMagazines:", err);
      }
    }
  };

  const startPolling = async (idoper: string) => {
    setMmgateStep('polling');

    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch(`/api/mmgate/status/${idoper}`);
        const data = await res.json();

        if (data.ETATO === 200 || data.ETATO === '200') {
          clearInterval(pollInterval);
          setPaymentLoading(null);
          setMmgateStep('idle');
          await grantAccess();
        } else if (data.ETATO !== 300 && data.ETATO !== '300') { // 300 means pending, anything else is failed
          clearInterval(pollInterval);
          setPaymentError(data.ETATO === 404 ? "Paiement refusé." : data.ETATO === 403 ? "Paiement annulé." : "Le paiement a échoué.");
          setPaymentLoading(null);
          setMmgateStep('idle');
        }
      } catch (err) {
        console.error("Polling error:", err);
      }
    }, 5000);
  };

  const handleBuyNow = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!user) {
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
              reference: `mag_${magazineId}_${Date.now()}`
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
            reference: `mag_${magazineId}_${Date.now()}`
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

  const displayMagazine = isPremium || localAccess;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] bg-black/95 backdrop-blur-md flex flex-col"
    >
      <div className="p-6 border-b border-white/10 flex justify-between items-center bg-black-rich">
        <div className="flex items-center gap-4">
          <FileText className="text-gold" />
          <h2 className="text-white font-serif text-xl">{title}</h2>
        </div>
        <div className="flex items-center gap-6">
          {displayMagazine && !isCloudinaryPdf && (
            <button 
              onClick={handleDownload}
              className="flex items-center gap-2 text-gold text-xs uppercase tracking-widest font-bold hover:text-white transition-colors"
            >
              <Download size={16} /> {t('download_pdf', 'Télécharger le PDF')}
            </button>
          )}
          <button 
            onClick={onClose}
            className="text-white hover:text-gold transition-colors"
          >
            <X size={24} />
          </button>
        </div>
      </div>

      <div className="flex-grow relative bg-gray-900 overflow-hidden flex flex-col items-center justify-center">
        {displayMagazine ? (
          drivePreviewUrl ? (
            <iframe 
              src={drivePreviewUrl} 
              className="w-full h-full border-none" 
              title={title}
              allow="autoplay"
            />
          ) : isCloudinaryPdf ? (
            <div className="h-full w-full flex flex-col overflow-hidden">
               <div className="flex-grow overflow-y-auto w-full flex justify-center p-4 custom-scrollbar relative">
                 {cloudImgLoading && (
                   <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-gold z-10 bg-gray-900/50 backdrop-blur-sm">
                     <Loader2 className="animate-spin" size={48} />
                   </div>
                 )}
                 <img 
                   src={getCloudinaryPageUrl(pdfUrl, cloudPage)} 
                   className="shadow-2xl shadow-black max-w-full h-auto object-contain"
                   style={{ width: Math.min(window.innerWidth * 0.9, 1000) }}
                   onLoad={() => setCloudImgLoading(false)}
                   onError={() => {
                     setCloudImgLoading(false);
                     if (cloudPage > 1) {
                        setMaxCloudPage(cloudPage - 1);
                        setCloudPage(cloudPage - 1);
                     } else {
                        setIsPdfError(true);
                     }
                   }}
                   alt={`Page ${cloudPage}`}
                   referrerPolicy="no-referrer"
                 />
               </div>
               <div className="h-20 bg-black-rich border-t border-white/5 flex items-center justify-between px-4 md:px-8 w-full flex-shrink-0">
                  <button 
                    onClick={() => { setCloudImgLoading(true); setCloudPage(prev => Math.max(prev - 1, 1)); }}
                    disabled={cloudPage <= 1}
                    className="p-3 text-white disabled:text-gray-700 hover:text-gold transition-colors flex items-center gap-2"
                  >
                    <ChevronLeft /> Précédent
                  </button>
                  <div className="text-gray-400 text-sm font-mono bg-black/50 px-6 py-2 rounded-full border border-white/10">
                    <span className="text-white font-bold">{cloudPage}</span> {maxCloudPage ? ` / ${maxCloudPage}` : ''}
                  </div>
                  <button 
                    onClick={() => { setCloudImgLoading(true); setCloudPage(prev => prev + 1); }}
                    disabled={maxCloudPage !== null && cloudPage >= maxCloudPage}
                    className="p-3 text-white disabled:text-gray-700 hover:text-gold transition-colors flex items-center gap-2"
                  >
                    Suivant <ChevronRight />
                  </button>
                </div>
            </div>
          ) : isPdfError ? (
            <div className="flex flex-col items-center justify-center h-full w-full p-8 text-center text-white max-w-lg">
              <AlertCircle size={64} className="text-gold mb-6" />
              <p className="text-gray-200 mb-4 text-xl font-serif">Aperçu indisponible</p>
              <p className="text-gray-400 mb-6 text-sm leading-relaxed">
                Le navigateur ne permet pas l'affichage direct de ce fichier.
              </p>
              <a 
                href={safePdfUrl} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="btn-gold flex items-center gap-2"
              >
                <ExternalLink size={20} /> Ouvrir le magazine
              </a>
            </div>
          ) : (
            <div className="h-full w-full flex flex-col overflow-hidden">
              <div className="flex-grow overflow-y-auto w-full flex justify-center p-4 custom-scrollbar">
                <Document
                  file={safePdfUrl}
                  onLoadSuccess={onDocumentLoadSuccess}
                  onLoadError={onDocumentLoadError}
                  loading={
                    <div className="flex flex-col items-center justify-center h-full gap-4 text-gold">
                      <Loader2 className="animate-spin" size={48} />
                      <p className="text-sm font-bold tracking-widest uppercase">Chargement du magazine...</p>
                    </div>
                  }
                  className="max-w-full flex justify-center"
                >
                  <Page 
                    pageNumber={pageNumber} 
                    renderTextLayer={false}
                    renderAnnotationLayer={false}
                    className="shadow-2xl shadow-black max-w-full"
                    width={Math.min(window.innerWidth * 0.9, 1000)}
                  />
                </Document>
              </div>
              {numPages && (
                <div className="h-20 bg-black-rich border-t border-white/5 flex items-center justify-between px-4 md:px-8 w-full flex-shrink-0">
                  <button 
                    onClick={() => setPageNumber(prev => Math.max(prev - 1, 1))}
                    disabled={pageNumber <= 1}
                    className="p-3 text-white disabled:text-gray-700 hover:text-gold transition-colors flex items-center gap-2"
                  >
                    <ChevronLeft /> Précédent
                  </button>
                  <div className="text-gray-400 text-sm font-mono bg-black/50 px-6 py-2 rounded-full border border-white/10">
                    <span className="text-white font-bold">{pageNumber}</span> / {numPages}
                  </div>
                  <button 
                    onClick={() => setPageNumber(prev => Math.min(prev + 1, numPages))}
                    disabled={pageNumber >= numPages}
                    className="p-3 text-white disabled:text-gray-700 hover:text-gold transition-colors flex items-center gap-2"
                  >
                    Suivant <ChevronRight />
                  </button>
                </div>
              )}
            </div>
          )
        ) : (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center bg-gray-900 w-full">
            <div className="text-center p-8 bg-black-rich border border-gold/20 shadow-2xl max-w-xl w-full pointer-events-auto flex flex-col md:flex-row items-center gap-8">
              
              <div className="flex-1 text-left">
                  <h3 className="text-white font-serif text-2xl mb-4">Lecture restreinte</h3>
                  <p className="text-gray-400 text-sm mb-6 leading-relaxed">
                    Ce numéro de magazine est réservé aux abonnés Premium. Vous pouvez vous abonner pour un accès illimité, ou acheter ce numéro spécifiquement.
                  </p>
                  <button 
                    onClick={() => navigate('/subscribe')}
                    className="btn-gold w-full text-center"
                  >
                    {t('subscribe_now')}
                  </button>
              </div>

              <div className="h-px md:h-48 w-full md:w-px bg-white/10 block my-4 md:my-0"></div>

              <div className="flex-1">
                 <h4 className="text-white font-serif text-xl mb-4 text-left">Acheter ce numéro</h4>
                 {mmgateStep === 'confirm_duplicate' ? (
                    <div className="space-y-4">
                        <div className="p-3 bg-yellow-500/10 text-yellow-500 rounded text-xs text-left mb-2 border border-yellow-500/20 flex gap-2">
                            <AlertCircle className="flex-none mt-0.5" size={16} />
                            Doublon probable. Procéder à nouveau ?
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => setMmgateStep('idle')} className="flex-1 py-2 bg-gray-800 text-white text-xs hover:bg-gray-700">Annuler</button>
                            <button onClick={handleMMGateDuplicateConfirm} className="flex-1 py-2 bg-gold text-black text-xs hover:bg-yellow-500">Oui, Payer</button>
                        </div>
                    </div>
                 ) : mmgateStep === 'polling' ? (
                    <div className="py-4">
                        <Loader2 className="animate-spin text-gold mx-auto mb-4" size={32} />
                        <p className="text-xs text-gray-400">Veuillez vérifier votre téléphone et saisir votre PIN.</p>
                    </div>
                 ) : (
                    <form onSubmit={handleBuyNow} className="space-y-4 text-left">
                        {paymentError && (
                          <div className="p-2 bg-red-500/10 text-red-400 text-xs rounded border border-red-500/20 mb-2">
                            {paymentError}
                          </div>
                        )}
                        <span className="block text-2xl font-serif text-gold mb-2">{amountToPay} FCFA</span>
                        <div>
                           <label className="block text-[10px] uppercase text-gray-400 mb-1">Paiement Mobile Money</label>
                           <div className="grid grid-cols-2 gap-2 mb-3">
                                <button type="button" onClick={() => setPaymentMethod('momo_mtn')} className={`p-2 border rounded text-xs flex items-center justify-center gap-2 ${paymentMethod === 'momo_mtn' ? 'border-yellow-400 text-white' : 'border-gray-700 text-gray-500 hover:border-gray-500'}`}>
                                    <svg width="16" height="16" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                                      <rect width="100" height="100" rx="20" fill="#FFCC00"/>
                                      <ellipse cx="50" cy="50" rx="35" ry="25" fill="#FFCC00" stroke="black" strokeWidth="4"/>
                                      <text x="50" y="55" fill="black" fontSize="24" fontFamily="Arial, sans-serif" fontWeight="bold" textAnchor="middle">MTN</text>
                                    </svg> MTN
                                </button>
                                <button type="button" onClick={() => setPaymentMethod('momo_orange')} className={`p-2 border rounded text-xs flex items-center justify-center gap-2 ${paymentMethod === 'momo_orange' ? 'border-orange-500 text-white' : 'border-gray-700 text-gray-500 hover:border-gray-500'}`}>
                                    <svg width="16" height="16" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                                      <rect width="100" height="100" rx="20" fill="#FF6600"/>
                                      <rect x="25" y="25" width="50" height="50" fill="#FF6600" stroke="white" strokeWidth="4"/>
                                      <text x="50" y="55" fill="white" fontSize="16" fontFamily="Arial, sans-serif" fontWeight="bold" textAnchor="middle">orange</text>
                                    </svg> Orange
                                </button>
                           </div>
                           <div className="relative">
                              <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                              <input 
                                required type="tel" value={paymentPhone} onChange={(e) => setPaymentPhone(e.target.value)} 
                                placeholder="Ex: 6XXXXXXXX" 
                                className="w-full bg-gray-800 border border-gray-700 text-white pl-9 pr-3 py-2 text-sm rounded focus:border-gold outline-none"
                              />
                           </div>
                        </div>
                        <button disabled={paymentLoading !== null || !user} type="submit" className="w-full bg-white text-black py-2 text-xs uppercase tracking-widest font-bold hover:bg-gray-200 transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
                           {paymentLoading ? <><Loader2 size={14} className="animate-spin" /> {paymentLoading}</> : (user ? "Payer et Débloquer" : "Connectez-vous pour acheter")}
                        </button>
                    </form>
                 )}
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default MagazineViewer;
