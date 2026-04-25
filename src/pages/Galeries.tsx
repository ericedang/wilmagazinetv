import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'motion/react';
import { X, ZoomIn, Calendar, MapPin, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { db } from '../firebase';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../firebase';

export default function Galeries() {
  const { t } = useTranslation();
  const [galeries, setGaleries] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('all');

  useEffect(() => {
    const q = query(collection(db, 'galeries'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setGaleries(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setIsLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, 'galeries');
      setIsLoading(false);
    });
    return () => unsub();
  }, []);

  const categories = ['all', ...Array.from(new Set(galeries.map(g => g.category)))];

  const filteredGaleries = activeCategory === 'all' 
    ? galeries 
    : galeries.filter(g => g.category === activeCategory);

  return (
    <div className="pt-32 pb-20 container-custom min-h-[100dvh] bg-white">
      {/* Header */}
      <div className="text-center mb-16">
        <span className="text-gold uppercase tracking-[0.3em] text-xs font-bold mb-4 block">
          {t('galeries', 'Galeries')}
        </span>
        <h1 className="text-4xl md:text-6xl font-serif mb-6 text-black-rich">
          {t('discover_our_events', 'Revivez nos événements en images')}
        </h1>
        <p className="max-w-2xl mx-auto text-gray-500 leading-relaxed">
          {t('gallery_description', "Explorez les moments forts des événements Women Impact. De nos masterclasses à nos galas d'excellence, découvrez l'énergie de notre communauté à travers ces clichés.")}
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-24">
          <Loader2 className="animate-spin text-gold w-12 h-12" />
        </div>
      ) : galeries.length === 0 ? (
        <div className="text-center text-gray-400 py-24">
          Aucune galerie disponible pour le moment.
        </div>
      ) : (
        <>
          {/* Filtres */}
          <div className="flex flex-wrap justify-center gap-4 mb-16">
            {categories.map((cat, idx) => (
              <button
                key={idx}
                onClick={() => setActiveCategory(cat as string)}
                className={cn(
                  "px-6 py-2 rounded-full text-xs uppercase tracking-widest font-bold transition-all border",
                  activeCategory === cat
                    ? "bg-burgundy text-white border-burgundy shadow-lg shadow-burgundy/20"
                    : "bg-transparent border-gray-200 text-gray-500 hover:border-gold hover:text-gold"
                )}
              >
                {cat === 'all' ? t('all', 'Tous') : cat}
              </button>
            ))}
          </div>

          {/* Liste des galeries */}
          <div className="space-y-24">
            {filteredGaleries.map((galerie, idx) => (
              <motion.div 
                key={galerie.id}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: idx * 0.1 }}
                className="border-t border-gray-100 pt-16 first:border-0 first:pt-0"
              >
                <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
                  <div>
                    <h2 className="text-3xl font-serif text-black-rich mb-2">{galerie.title}</h2>
                    <div className="flex flex-wrap items-center gap-4 text-xs tracking-widest uppercase text-gray-400 font-medium">
                      <span className="flex items-center gap-1"><Calendar size={14} /> {galerie.date}</span>
                      <span className="flex items-center gap-1"><MapPin size={14} /> {galerie.location}</span>
                    </div>
                  </div>
                  {galerie.category && (
                    <span className="bg-gold/10 text-gold px-4 py-1 text-[10px] uppercase tracking-widest font-bold border border-gold/20">
                      {galerie.category}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {galerie.images?.map((img: string, imgIdx: number) => (
                    <motion.div
                      key={imgIdx}
                      whileHover={{ scale: 1.02 }}
                      className={cn(
                        "relative aspect-square overflow-hidden bg-gray-100 cursor-pointer group",
                        imgIdx === 0 && "md:col-span-2 md:row-span-2 aspect-auto h-full min-h-[300px]"
                      )}
                      onClick={() => setSelectedImage(img)}
                    >
                      <img
                        src={img}
                        alt={`${galerie.title} - Image ${imgIdx + 1}`}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                        <div className="bg-white/20 p-3 rounded-full text-white backdrop-blur-md">
                          <ZoomIn size={24} />
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </>
      )}

      {/* Lightbox / Modal */}
      <AnimatePresence>
        {selectedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 md:p-8"
            onClick={() => setSelectedImage(null)}
          >
            <button 
              className="absolute top-6 right-6 md:top-8 md:right-8 text-white/50 hover:text-white transition-colors z-10"
              onClick={() => setSelectedImage(null)}
            >
              <X size={32} />
            </button>
            <motion.img
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              src={selectedImage}
              alt="Agrandissement"
              className="max-w-full max-h-[90vh] object-contain shadow-2xl rounded-sm"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
