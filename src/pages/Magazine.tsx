import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import PageBuilder from '../components/sections/PageBuilder';
import { useFirestoreCollection } from '../hooks/useFirestoreCollection';
import { Magazine as MagazineType } from '../types';
import { Loader2, ArrowLeft } from 'lucide-react';
import MagazineViewer from '../components/MagazineViewer';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useLocalizedField } from '../lib/i18n-utils';
import BackButton from '../components/BackButton';

export default function Magazine() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const getLocalized = useLocalizedField();
  const { data: magazines, loading } = useFirestoreCollection<MagazineType>('magazines');
  const [selectedMagazine, setSelectedMagazine] = useState<MagazineType | null>(null);

  const nativeSections = [
    {
      id: 'magazine-header',
      orderIndex: 0,
      component: (
        <div className="pt-32 pb-20 container-custom">
          <BackButton className="mb-8" />
          <div className="text-center max-w-2xl mx-auto mb-20">
            <h1 className="text-5xl md:text-6xl font-serif mb-6">{t('the_magazine')}</h1>
            <p className="text-gray-600 uppercase tracking-widest text-[10px] font-bold">{t('magazine_subtitle')}</p>
          </div>
        </div>
      )
    },
    {
      id: 'magazine-grid',
      orderIndex: 20,
      component: (
        <div className="pb-20 container-custom">
          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="animate-spin text-gold" size={48} />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-20">
              {magazines.map((issue, idx) => (
                <motion.div 
                  key={issue.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.1 }}
                  className="group cursor-pointer"
                  onClick={() => setSelectedMagazine(issue)}
                >
                  <div className="aspect-[3/4] bg-gray-100 mb-8 overflow-hidden relative shadow-2xl">
                    <img 
                      src={issue.coverImage} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      alt={getLocalized(issue, 'title')}
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all duration-500 flex items-center justify-center backdrop-blur-[2px]">
                      <button className="btn-premium transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                        {t('read_issue')}
                      </button>
                    </div>
                  </div>
                  <div className="text-center">
                    <h3 className="font-serif text-2xl mb-2 group-hover:text-gold transition-colors">{getLocalized(issue, 'title')}</h3>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-gray-400 font-bold">{issue.issueDate}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="min-h-screen">
      <PageBuilder pageSlug="magazine" nativeSections={nativeSections} />
      
      <AnimatePresence>
        {selectedMagazine && (
          <MagazineViewer 
            pdfUrl={selectedMagazine.pdfUrl} 
            title={getLocalized(selectedMagazine, 'title')} 
            onClose={() => setSelectedMagazine(null)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}
