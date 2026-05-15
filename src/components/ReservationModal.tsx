import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocalizedField } from '../lib/i18n-utils';
import { motion, AnimatePresence } from 'motion/react';
import { X, Loader2, CheckCircle2, Calendar, MapPin, User, Mail, Phone, Ticket, ChevronDown, AlertCircle } from 'lucide-react';
import { Event, Reservation } from '../types';
import { db, collection, addDoc, serverTimestamp } from '../firebase';

interface ReservationModalProps {
  isOpen: boolean;
  onClose: () => void;
  events: Event[];
  selectedEventId?: string;
}

export default function ReservationModal({ isOpen, onClose, events, selectedEventId }: ReservationModalProps) {
  const { t } = useTranslation();
  const getLocalized = useLocalizedField();
  const [loading, setLoading] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // MMGate state
  const [mmgateStep, setMmgateStep] = useState<'idle' | 'confirm_duplicate' | 'polling'>('idle');
  const [pollingId, setPollingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    eventId: selectedEventId || (events.length > 0 ? events[0].id : ''),
    userName: '',
    userEmail: '',
    userPhone: '',
    ticketType: 'Standard',
    paymentMethod: 'momo_mtn' // Default to MTN
  });

  // Update eventId if selectedEventId changes
  React.useEffect(() => {
    if (selectedEventId) {
      setFormData(prev => ({ ...prev, eventId: selectedEventId }));
    }
  }, [selectedEventId]);

  const selectedEvent = events.find(e => e.id === formData.eventId);

  const getPrice = () => {
    if (!selectedEvent) return 0;
    
    // Check if event has a general price, or specific ticket types
    if (selectedEvent.ticketTypes && selectedEvent.ticketTypes.length > 0) {
      const type = selectedEvent.ticketTypes.find(t => t.name === formData.ticketType);
      if (type) {
         const p = parseFloat(type.price.replace(/\s/g, '').replace(/[^\d.]/g, ''));
         return isNaN(p) ? 0 : p;
      }
    }
    
    if (selectedEvent.price && selectedEvent.price.toLowerCase() !== 'gratuit') {
        const p = parseFloat(selectedEvent.price.replace(/\s/g, '').replace(/[^\d.]/g, ''));
        return isNaN(p) ? 0 : p;
    }
    
    return 0; // Free
  };

  const amountToPay = getPrice();

  const handleFinalizeReservation = async (transactionId?: string) => {
    try {
      const reservation: Omit<Reservation, 'id'> = {
        eventId: formData.eventId,
        eventTitle: selectedEvent?.title || 'Unknown Event',
        userName: formData.userName,
        userEmail: formData.userEmail,
        userPhone: formData.userPhone,
        ticketType: formData.ticketType,
        status: amountToPay > 0 ? 'confirmed' : 'pending',
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, 'reservations'), reservation);
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
        setFormData({
          eventId: selectedEventId || (events.length > 0 ? events[0].id : ''),
          userName: '',
          userEmail: '',
          userPhone: '',
          ticketType: 'Standard',
          paymentMethod: 'momo_mtn'
        });
        setMmgateStep('idle');
      }, 3000);
    } catch (err) {
      console.error("Error creating reservation:", err);
      setError(t('reservation_error') || 'Erreur lors de la réservation.');
    } finally {
      setLoading(null);
    }
  };

  const startPolling = async (idoper: string) => {
    setMmgateStep('polling');
    setPollingId(idoper);

    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch(`/api/mmgate/status/${idoper}`);
        const data = await res.json();

        const pendingStates = [300, '300', 401, '401'];
        if (data.ETATO === 200 || data.ETATO === '200') {
          // Success
          clearInterval(pollInterval);
          await handleFinalizeReservation(idoper);
        } else if (!pendingStates.includes(data.ETATO)) {
          // Failed or Not Found
          clearInterval(pollInterval);

          let errorMessage = "Le paiement a échoué.";
          if (data.ETATO == 402) errorMessage = "Échec : Solde insuffisant. Veuillez recharger votre compte.";
          else if (data.ETATO == 403) errorMessage = "Paiement annulé par l'utilisateur.";
          else if (data.ETATO == 404) errorMessage = "Numéro non valide ou paiement introuvable.";
          else if (data.ETATO == 500) errorMessage = "Erreur de l'opérateur mobile.";

          setError(errorMessage);
          setLoading(null);
          setMmgateStep('idle');
          setPollingId(null);
        }
        // 401, 300 -> continues
      } catch (err) {
        console.error("Polling error:", err);
      }
    }, 20000);
  };

  const handleMMGateDuplicateConfirm = async () => {
    setLoading(t('processing') || 'Traitement...');
    try {
      const response = await fetch('/api/mmgate/payment/confirm-duplicate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phoneNumber: formData.userPhone,
            amount: amountToPay
          }),
      });
      const data = await response.json();
      
      if (data.ETAT === 200 && data.IDOPER) {
         startPolling(data.IDOPER);
      } else {
         throw new Error(data.message || `Erreur MMGate (ETAT: ${data.ETAT})`);
      }
    } catch (err: any) {
       setError(err.message || t('common.error_occurred'));
       setLoading(null);
       setMmgateStep('idle');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // If free event, just finalize
    if (amountToPay <= 0) {
        setLoading('Finalisation...');
        await handleFinalizeReservation();
        return;
    }

    // Otherwise, initiate MMGate
    const cleanPhone = formData.userPhone.replace(/\s+/g, '');
    if (!/^((237)?6[0-9]{8})$/.test(cleanPhone)) {
      setError("Le numéro de paiement doit être au format Camerounais (ex: 6XXXXXXXX ou 2376XXXXXXXX)");
      return;
    }

    setLoading('Initialisation du paiement...');
    setMmgateStep('idle');
    
    try {
        const response = await fetch('/api/mmgate/payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              phoneNumber: formData.userPhone,
              amount: amountToPay,
              reference: `ev_${formData.eventId}_${Date.now()}`
            }),
        });

        if (!response.ok) {
            const d = await response.json();
            throw new Error(d.error || 'Erreur serveur');
        }

        const data = await response.json();
        
        if (data.ETAT === 200 && data.IDOPER) {
            startPolling(data.IDOPER);
        } else if (data.ETAT === 600) {
            setMmgateStep('confirm_duplicate');
            setLoading(null);
        } else {
            throw new Error(data.message || `Erreur lors de l'initiation (ETAT: ${data.ETAT})`);
        }
    } catch (err: any) {
        setError(err.message || t('common.error_occurred'));
        setLoading(null);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="bg-white w-full max-w-2xl overflow-y-auto max-h-[90vh] shadow-2xl relative"
        >
          <button 
            onClick={onClose}
            className="absolute top-6 right-6 text-gray-400 hover:text-black transition-colors z-10"
          >
            <X size={24} />
          </button>

          <div className="grid md:grid-cols-5 h-full min-h-[500px]">
            {/* Left Side - Info */}
            <div className="md:col-span-2 bg-burgundy text-white p-8 flex flex-col justify-between">
              <div>
                <h2 className="text-3xl font-serif mb-6">{t('reservation')}</h2>
                <p className="text-burgundy-light text-sm leading-relaxed mb-8">
                  {amountToPay > 0 ? "Achetez votre billet en quelques clics via Mobile Money." : t('reservation_desc')}
                </p>
              </div>

              {selectedEvent && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-sm">
                    <Calendar size={16} className="text-gold" />
                    <span>{selectedEvent.date}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <MapPin size={16} className="text-gold" />
                    <span>{selectedEvent.location}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Right Side - Form */}
            <div className="md:col-span-3 p-8">
              {success ? (
                <div className="h-full flex flex-col items-center justify-center text-center py-12">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6"
                  >
                    <CheckCircle2 size={40} />
                  </motion.div>
                  <h3 className="text-2xl font-serif mb-2">{amountToPay > 0 ? "Transaction réussie !" : t('request_sent')}</h3>
                  <p className="text-gray-500 text-sm">
                    {amountToPay > 0 ? "Votre place est validée." : t('reservation_success_desc')}
                  </p>
                </div>
              ) : mmgateStep === 'confirm_duplicate' ? (
                <div className="h-full flex flex-col items-center justify-center py-12 space-y-6">
                    <div className="p-4 bg-yellow-50 text-yellow-800 rounded-lg text-sm mb-4 border border-yellow-200 flex gap-3">
                        <AlertCircle className="flex-none mt-0.5" size={20} />
                        Une transaction similaire a été détectée très récemment (Doublon probable). Voulez-vous tout de même procéder à ce nouveau paiement ?
                    </div>
                    <div className="flex w-full gap-4">
                        <button 
                            type="button"
                            onClick={() => setMmgateStep('idle')}
                            className="flex-1 py-4 bg-gray-100 text-gray-700 uppercase tracking-widest text-xs font-bold hover:bg-gray-200 transition-colors"
                        >
                            Annuler
                        </button>
                        <button 
                            type="button"
                            onClick={handleMMGateDuplicateConfirm}
                            className="flex-1 py-4 bg-gold text-black uppercase tracking-widest text-xs font-bold hover:bg-yellow-500 transition-colors flex justify-center items-center gap-2"
                        >
                            <Ticket size={16} /> Oui, Payer
                        </button>
                    </div>
                </div>
              ) : mmgateStep === 'polling' ? (
                 <div className="h-full flex flex-col items-center justify-center text-center py-12">
                    <Loader2 className="animate-spin text-gold mx-auto mb-4" size={40} />
                    <h3 className="font-serif text-xl mb-2">Paiement en attente...</h3>
                    <p className="text-sm text-gray-500">
                      Veuillez vérifier votre téléphone et saisir votre code PIN pour valider la transaction de {amountToPay} FCFA. Ne fermez pas cette page.
                    </p>
                 </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-1">
                       {t('event')}
                    </label>
                    {error && (
                      <div className="mb-3 p-3 bg-red-50 text-red-500 text-[10px] font-bold uppercase tracking-widest rounded flex items-center gap-2">
                        <X size={12} /> {error}
                      </div>
                    )}
                    <div className="relative">
                      <select
                        required
                        value={formData.eventId}
                        onChange={(e) => setFormData({ ...formData, eventId: e.target.value })}
                        className="w-full bg-gray-50 border border-gray-100 px-4 py-2.5 rounded focus:outline-none focus:border-gold transition-colors appearance-none text-sm"
                      >
                        <option value="" disabled>{t('select_event')}</option>
                        {events.map(event => (
                          <option key={event.id} value={event.id}>{getLocalized(event, 'title')}</option>
                        ))}
                      </select>
                      <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-1">
                        {t('full_name')}
                      </label>
                      <div className="relative">
                        <User size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          required
                          type="text"
                          value={formData.userName}
                          onChange={(e) => setFormData({ ...formData, userName: e.target.value })}
                          className="w-full bg-gray-50 border border-gray-100 pl-10 pr-4 py-2.5 rounded focus:outline-none focus:border-gold transition-colors text-sm"
                          placeholder="Jane Doe"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-1">
                        Numéro Mobile Money
                      </label>
                      <div className="relative">
                        <Phone size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          required
                          type="tel"
                          value={formData.userPhone}
                          onChange={(e) => setFormData({ ...formData, userPhone: e.target.value })}
                          className="w-full bg-gray-50 border border-gray-100 pl-10 pr-4 py-2.5 rounded focus:outline-none focus:border-gold transition-colors text-sm"
                          placeholder="Ex: 6XXXXXXXX"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-1">
                      Email
                    </label>
                    <div className="relative">
                      <Mail size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        required
                        type="email"
                        value={formData.userEmail}
                        onChange={(e) => setFormData({ ...formData, userEmail: e.target.value })}
                        className="w-full bg-gray-50 border border-gray-100 pl-10 pr-4 py-2.5 rounded focus:outline-none focus:border-gold transition-colors text-sm"
                        placeholder="jane@example.com"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-1">
                      {t('reservation_type')}
                    </label>
                    <div className="relative mb-2">
                      <Ticket size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                      <select
                        required
                        value={formData.ticketType}
                        onChange={(e) => setFormData({ ...formData, ticketType: e.target.value })}
                        className="w-full bg-gray-50 border border-gray-100 pl-10 pr-10 py-2.5 rounded focus:outline-none focus:border-gold transition-colors appearance-none text-sm"
                      >
                        {selectedEvent?.ticketTypes && selectedEvent.ticketTypes.length > 0 ? (
                           selectedEvent.ticketTypes.map(t => (
                              <option key={t.name} value={t.name}>{t.name} ({t.price})</option>
                           ))
                        ) : (
                            <option value="Standard">Standard {selectedEvent?.price && selectedEvent.price !== 'Gratuit' ? `(${selectedEvent.price})` : ''}</option>
                        )}
                      </select>
                      <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                  </div>
                  
                  {amountToPay > 0 && (
                    <div className="mb-2">
                        <label className="block text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-1">
                           Moyen de Paiement
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, paymentMethod: 'momo_mtn' })}
                                className={`p-2 border rounded text-xs transition-colors font-medium flex items-center justify-center gap-2 ${formData.paymentMethod === 'momo_mtn' ? 'border-yellow-400 bg-yellow-50 text-black' : 'border-gray-200 hover:border-yellow-200'}`}
                            >
                                <svg width="20" height="20" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                                  <rect width="100" height="100" rx="20" fill="#FFCC00"/>
                                  <ellipse cx="50" cy="50" rx="35" ry="25" fill="#FFCC00" stroke="black" strokeWidth="4"/>
                                  <text x="50" y="55" fill="black" fontSize="24" fontFamily="Arial, sans-serif" fontWeight="bold" textAnchor="middle">MTN</text>
                                </svg>
                                MTN MoMo
                            </button>
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, paymentMethod: 'momo_orange' })}
                                className={`p-2 border rounded text-xs transition-colors font-medium flex items-center justify-center gap-2 ${formData.paymentMethod === 'momo_orange' ? 'border-orange-500 bg-orange-50 text-black' : 'border-gray-200 hover:border-orange-200'}`}
                            >
                                <svg width="20" height="20" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                                  <rect width="100" height="100" rx="20" fill="#FF6600"/>
                                  <rect x="25" y="25" width="50" height="50" fill="#FF6600" stroke="white" strokeWidth="4"/>
                                  <text x="50" y="55" fill="white" fontSize="16" fontFamily="Arial, sans-serif" fontWeight="bold" textAnchor="middle">orange</text>
                                </svg>
                                Orange Money
                            </button>
                        </div>
                    </div>
                  )}

                  <div className="pt-2">
                      <div className="flex justify-between items-center mb-4 p-3 bg-gray-50 border border-gray-100 rounded">
                        <span className="text-xs uppercase tracking-widest font-bold text-gray-500">Total à payer</span>
                        <span className="text-xl font-serif text-burgundy">{amountToPay > 0 ? `${amountToPay} FCFA` : 'Gratuit'}</span>
                      </div>
                      
                      <button
                        disabled={loading !== null}
                        type="submit"
                        className="w-full bg-black text-white py-3 5 text-xs uppercase tracking-widest font-bold hover:bg-gold hover:text-black transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                      >
                        {loading !== null ? (
                          <>
                            <Loader2 size={16} className="animate-spin" />
                            {loading}
                          </>
                        ) : (
                          amountToPay > 0 ? "Payer et Confirmer" : t('confirm_reservation')
                        )}
                      </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
