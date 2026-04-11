import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Calendar, MapPin, Users, ArrowRight, Star, Loader2, ArrowLeft } from 'lucide-react';
import { useFirestoreCollection } from '../hooks/useFirestoreCollection';
import { Event } from '../types';
import { useNavigate } from 'react-router-dom';
import ReservationModal from '../components/ReservationModal';
import { useTranslation } from 'react-i18next';
import { useLocalizedField } from '../lib/i18n-utils';
import BackButton from '../components/BackButton';

export default function Events() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const getLocalized = useLocalizedField();
  const { data: events, loading } = useFirestoreCollection<Event>('events');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | undefined>(undefined);

  const handleOpenModal = (eventId?: string) => {
    setSelectedEventId(eventId);
    setIsModalOpen(true);
  };

  if (loading) {
    return (
      <div className="pt-32 min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-gold" size={48} />
      </div>
    );
  }

  return (
    <div className="pt-32 pb-20 container-custom min-h-screen">
      <BackButton className="mb-8" />
      <div className="text-center max-w-3xl mx-auto mb-24">
        <h1 className="text-5xl md:text-7xl font-serif mb-8">{t('events')}</h1>
        <p className="text-gray-600 uppercase tracking-[0.3em] text-[10px] font-bold mb-12">{t('events_subtitle')}</p>
        <div className="w-24 h-[1px] bg-gold mx-auto" />
      </div>

      <div className="space-y-32">
        {events.map((event, idx) => (
          <motion.div 
            key={event.id}
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className={`editorial-grid items-center gap-16 ${idx % 2 !== 0 ? 'md:flex-row-reverse' : ''}`}
          >
            <div className={`md:col-span-6 relative group ${idx % 2 !== 0 ? 'md:order-2' : ''}`}>
              <div className="aspect-[4/5] md:aspect-square overflow-hidden shadow-2xl">
                <img 
                  src={event.image} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000"
                  alt={getLocalized(event, 'title')}
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="absolute -bottom-8 -right-8 w-48 h-48 bg-burgundy/10 -z-10" />
              <div className="absolute -top-8 -left-8 w-48 h-48 bg-gold/10 -z-10" />
            </div>

            <div className={`md:col-span-6 flex flex-col justify-center ${idx % 2 !== 0 ? 'md:order-1' : ''}`}>
              <div className="flex items-center gap-4 text-gold uppercase tracking-widest text-xs font-bold mb-8">
                <Calendar size={16} />
                <span>{getLocalized(event, 'date')}</span>
                <span className="w-1 h-1 bg-gray-300 rounded-full" />
                <MapPin size={16} />
                <span>{getLocalized(event, 'location')}</span>
              </div>
              
              <h2 className="text-5xl font-serif mb-8 leading-tight">{getLocalized(event, 'title')}</h2>
              
              <p className="text-gray-600 mb-12 leading-relaxed text-lg">
                {getLocalized(event, 'description')}
              </p>

              <div className="grid grid-cols-2 gap-12 mb-12 border-y border-gray-100 py-8">
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-2 flex items-center gap-2">
                    <Users size={12} /> {t('participants')}
                  </div>
                  <div className="text-2xl font-serif">{event.attendees}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-2 flex items-center gap-2">
                    <Star size={12} /> {t('early_bird_rate')}
                  </div>
                  <div className="text-2xl font-serif text-burgundy">{event.price}</div>
                </div>
              </div>

              <div className="flex items-center gap-12">
                <button 
                  onClick={() => handleOpenModal(event.id)}
                  className="btn-premium px-12 py-4"
                >
                  {t('book_my_place')}
                </button>
                <button className="text-[10px] uppercase tracking-widest font-bold hover:text-gold transition-colors flex items-center gap-3 group">
                  {t('learn_more')} <ArrowRight size={16} className="group-hover:translate-x-2 transition-transform" />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <section className="mt-40 bg-black-rich text-white p-20 text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
          <img 
            src="https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&q=80&w=1200" 
            className="w-full h-full object-cover"
            alt="Background"
          />
        </div>
        <div className="relative z-10">
          <h3 className="text-4xl font-serif mb-6">{t('organize_event_with_us')}</h3>
          <p className="text-gray-400 mb-10 max-w-2xl mx-auto uppercase tracking-widest text-xs font-bold leading-loose">
            {t('organize_event_description')}
          </p>
          <button className="btn-gold px-12">{t('become_partner')}</button>
        </div>
      </section>

      <ReservationModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        events={events}
        selectedEventId={selectedEventId}
      />
    </div>
  );
}
