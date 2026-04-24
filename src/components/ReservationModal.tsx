import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocalizedField } from '../lib/i18n-utils';
import { motion, AnimatePresence } from 'motion/react';
import { X, Loader2, CheckCircle2, Calendar, MapPin, User, Mail, Phone, Ticket, ChevronDown } from 'lucide-react';
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
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    eventId: selectedEventId || (events.length > 0 ? events[0].id : ''),
    userName: '',
    userEmail: '',
    userPhone: '',
    ticketType: 'Standard'
  });

  // Update eventId if selectedEventId changes
  React.useEffect(() => {
    if (selectedEventId) {
      setFormData(prev => ({ ...prev, eventId: selectedEventId }));
    }
  }, [selectedEventId]);

  const selectedEvent = events.find(e => e.id === formData.eventId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const reservation: Omit<Reservation, 'id'> = {
        eventId: formData.eventId,
        eventTitle: selectedEvent?.title || 'Unknown Event',
        userName: formData.userName,
        userEmail: formData.userEmail,
        userPhone: formData.userPhone,
        ticketType: formData.ticketType,
        status: 'pending',
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
          ticketType: 'Standard'
        });
      }, 3000);
    } catch (error) {
      console.error("Error creating reservation:", error);
      setError(t('reservation_error'));
    } finally {
      setLoading(false);
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

          <div className="grid md:grid-cols-5 h-full">
            {/* Left Side - Info */}
            <div className="md:col-span-2 bg-burgundy text-white p-8 flex flex-col justify-between">
              <div>
                <h2 className="text-3xl font-serif mb-6">{t('reservation')}</h2>
                <p className="text-burgundy-light text-sm leading-relaxed mb-8">
                  {t('reservation_desc')}
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
                  <h3 className="text-2xl font-serif mb-2">{t('request_sent')}</h3>
                  <p className="text-gray-500 text-sm">
                    {t('reservation_success_desc')}
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label className="block text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-2">
                      {t('event')}
                    </label>
                    {error && (
                      <div className="mb-4 p-3 bg-red-50 text-red-500 text-[10px] font-bold uppercase tracking-widest rounded flex items-center gap-2">
                        <X size={12} /> {error}
                      </div>
                    )}
                    <div className="relative">
                      <select
                        required
                        value={formData.eventId}
                        onChange={(e) => setFormData({ ...formData, eventId: e.target.value })}
                        className="w-full bg-gray-50 border border-gray-100 px-4 py-3 rounded focus:outline-none focus:border-gold transition-colors appearance-none text-sm"
                      >
                        <option value="" disabled>{t('select_event')}</option>
                        {events.map(event => (
                          <option key={event.id} value={event.id}>{getLocalized(event, 'title')}</option>
                        ))}
                      </select>
                      <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-2">
                        {t('full_name')}
                      </label>
                      <div className="relative">
                        <User size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          required
                          type="text"
                          value={formData.userName}
                          onChange={(e) => setFormData({ ...formData, userName: e.target.value })}
                          className="w-full bg-gray-50 border border-gray-100 pl-10 pr-4 py-3 rounded focus:outline-none focus:border-gold transition-colors text-sm"
                          placeholder="Jane Doe"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-2">
                        {t('phone')}
                      </label>
                      <div className="relative">
                        <Phone size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          required
                          type="tel"
                          value={formData.userPhone}
                          onChange={(e) => setFormData({ ...formData, userPhone: e.target.value })}
                          className="w-full bg-gray-50 border border-gray-100 pl-10 pr-4 py-3 rounded focus:outline-none focus:border-gold transition-colors text-sm"
                          placeholder="+237 ..."
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-2">
                      Email
                    </label>
                    <div className="relative">
                      <Mail size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        required
                        type="email"
                        value={formData.userEmail}
                        onChange={(e) => setFormData({ ...formData, userEmail: e.target.value })}
                        className="w-full bg-gray-50 border border-gray-100 pl-10 pr-4 py-3 rounded focus:outline-none focus:border-gold transition-colors text-sm"
                        placeholder="jane@example.com"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-2">
                      {t('reservation_type')}
                    </label>
                    <div className="relative">
                      <Ticket size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                      <select
                        required
                        value={formData.ticketType}
                        onChange={(e) => setFormData({ ...formData, ticketType: e.target.value })}
                        className="w-full bg-gray-50 border border-gray-100 pl-10 pr-10 py-3 rounded focus:outline-none focus:border-gold transition-colors appearance-none text-sm"
                      >
                        <option value="Standard">Standard</option>
                        <option value="VIP">VIP</option>
                        <option value="VVIP">VVIP / Corporate</option>
                      </select>
                      <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                  </div>

                  <button
                    disabled={loading}
                    type="submit"
                    className="w-full bg-black text-white py-4 text-xs uppercase tracking-widest font-bold hover:bg-gold hover:text-black transition-all flex items-center justify-center gap-3"
                  >
                    {loading ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        {t('processing')}
                      </>
                    ) : (
                      t('confirm_reservation')
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
