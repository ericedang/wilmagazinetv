import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import { Crown, Lock, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { useFirestoreCollection } from '../hooks/useFirestoreCollection';
import { Article } from '../types';
import { useTranslation } from 'react-i18next';
import { useLocalizedField } from '../lib/i18n-utils';
import BackButton from '../components/BackButton';

export default function Articles() {
  const { profile } = useAuth();
  const { t } = useTranslation();
  const getLocalized = useLocalizedField();
  const isPremium = profile?.subscriptionStatus === 'premium';
  const { data: articles, loading } = useFirestoreCollection<Article>('articles');
  const [activeCategory, setActiveCategory] = React.useState('Tous');

  const categories = [
    'Tous', 'Leadership', 'Mindset & Succès', 'Foi & Leadership', 
    'Science', 'Culture', 'Transformation Personnelle', 'Portrait', 
    'Business', 'Technologie', 'Inspiration'
  ];

  const filteredArticles = activeCategory === 'Tous' 
    ? articles.filter(a => !a.isHidden)
    : articles.filter(a => a.category === activeCategory && !a.isHidden);

  if (loading) {
    return (
      <div className="pt-32 min-h-[100dvh] flex items-center justify-center">
        <Loader2 className="animate-spin text-gold" size={48} />
      </div>
    );
  }

  return (
    <div className="pt-32 pb-20 container-custom min-h-[100dvh]">
      <BackButton className="mb-8" />
      <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-8">
        <div>
          <h1 className="text-5xl md:text-6xl font-serif mb-4">{t('articles')}</h1>
          <p className="text-gray-500 uppercase tracking-widest text-[10px]">{t('articles_subtitle')}</p>
        </div>
        <div className="flex flex-wrap gap-6 text-[10px] uppercase tracking-widest font-bold border-b border-gray-100 pb-2">
          {categories.map(cat => (
            <button 
              key={cat} 
              onClick={() => setActiveCategory(cat)}
              className={`hover:text-gold transition-colors relative group ${activeCategory === cat ? 'text-gold' : ''}`}
            >
              {cat === 'Tous' ? t('all') : cat}
              <span className={`absolute -bottom-2 left-0 h-[1px] bg-gold transition-all ${activeCategory === cat ? 'w-full' : 'w-0 group-hover:w-full'}`} />
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
        {filteredArticles.map((article, idx) => (
          <motion.div 
            key={article.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="group cursor-pointer"
          >
            <div className="aspect-video bg-gray-100 mb-8 overflow-hidden relative shadow-sm">
              <img 
                src={article.image || `https://picsum.photos/seed/${article.id}/800/600`} 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                alt={getLocalized(article, 'title')}
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${article.id}/800/600`;
                }}
              />
              {article.isPremium && (
                <div className="absolute top-4 right-4 bg-gold text-black-rich p-2 shadow-lg">
                  <Crown size={14} />
                </div>
              )}
              {article.isPremium && !isPremium && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-[2px]">
                  <div className="text-center text-white p-6">
                    <Lock size={24} className="mx-auto mb-4 text-gold" />
                    <p className="text-xs uppercase tracking-widest font-bold mb-4">{t('premium_content')}</p>
                    <Link to="/subscribe" className="btn-gold py-2 px-6 text-[10px]">{t('subscribe_to_read')}</Link>
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-3 text-[10px] uppercase tracking-widest text-gold mb-4 font-bold">
              <span>{getLocalized(article, 'category')}</span>
              {article.isPremium && <span className="w-1 h-1 bg-gray-300 rounded-full" />}
              {article.isPremium && <span className="text-gray-400">Premium</span>}
            </div>

            <h3 className="font-serif text-2xl mb-4 group-hover:text-burgundy transition-colors leading-tight">
              {getLocalized(article, 'title')}
            </h3>
            
            <p className="text-gray-600 text-sm mb-8 line-clamp-3 leading-relaxed">
              {getLocalized(article, 'excerpt')}
            </p>

            <div className="flex items-center justify-between pt-6 border-t border-gray-100">
              <div className="text-[9px] uppercase tracking-widest text-gray-400 font-medium">
                {getLocalized(article, 'date')}
              </div>
              <Link 
                to={article.isPremium && !isPremium ? "/subscribe" : `/articles/${article.id}`}
                className="text-[10px] uppercase tracking-widest font-bold text-black-rich hover:text-gold transition-colors flex items-center gap-2"
              >
                {t('read_more')}
              </Link>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
