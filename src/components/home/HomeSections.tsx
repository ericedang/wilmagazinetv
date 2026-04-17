import React from 'react';
import { motion } from 'motion/react';
import { Play, ArrowRight, Calendar, Clock, BookOpen, Crown, Loader2, Send, MapPin, Phone, Mail as MailIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useFirestoreCollection } from '../../hooks/useFirestoreCollection';
import { Article, Video, Magazine, Event } from '../../types';
import { useTranslation } from 'react-i18next';
import { db, handleFirestoreError, OperationType } from '../../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useLocalizedField } from '../../lib/i18n-utils';

export const Hero = () => {
  const { t } = useTranslation();
  return (
    <section id="hero" className="relative h-screen w-full flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 bg-black/40 z-10" />
      <img 
        src="https://images.unsplash.com/photo-1573164713988-8665fc963095?auto=format&fit=crop&q=80&w=2000" 
        alt="Hero Background" 
        className="absolute inset-0 w-full h-full object-cover scale-105 animate-slow-zoom"
        referrerPolicy="no-referrer"
      />
      <div className="container-custom relative z-20 text-center text-white">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: "easeOut" }}
        >
          <span className="text-gold uppercase tracking-[0.5em] text-xs mb-6 block font-medium">{t('prestige_edition')}</span>
          <h1 className="text-5xl md:text-8xl font-serif mb-8 leading-tight">
            {t('leadership_essence').split(' ')[0]} <br /> <span className="italic">{t('leadership_essence').split(' ').slice(1).join(' ')}</span>
          </h1>
          <p className="text-lg md:text-xl mb-10 max-w-2xl mx-auto text-gray-200 font-light tracking-wide">
            {t('lucie_matsouaka')}
          </p>
          <div className="flex flex-col md:flex-row items-center justify-center gap-6">
            <Link to="/magazine" className="btn-premium w-full md:w-auto">{t('read_magazine')}</Link>
            <Link to="/tv" className="btn-gold w-full md:w-auto flex items-center justify-center gap-2">
              <Play size={16} /> {t('watch_tv')}
            </Link>
          </div>
        </motion.div>
      </div>
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-20 animate-bounce">
        <div className="w-[1px] h-12 bg-white/50" />
      </div>
    </section>
  );
};

export const FeaturedMagazine = () => {
  const { data: magazines, loading } = useFirestoreCollection<Magazine>('magazines');
  const { t } = useTranslation();
  const getLocalized = useLocalizedField();
  const magazine = magazines[0];

  if (loading || !magazine) return null;

  return (
    <section id="magazine" className="py-24 bg-white">
      <div className="container-custom">
        <div className="editorial-grid items-center">
          <div className="md:col-span-5">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative group cursor-pointer"
            >
              <div className="absolute -inset-4 bg-gold/10 blur-2xl group-hover:bg-gold/20 transition-all duration-500" />
              <img 
                src={magazine.coverImage} 
                alt="Magazine Cover" 
                className="relative w-full shadow-2xl transform group-hover:scale-[1.02] transition-transform duration-500"
                referrerPolicy="no-referrer"
              />
              <div className="absolute bottom-8 right-8">
                <button className="bg-burgundy text-white p-6 rounded-full shadow-xl hover:scale-110 transition-transform">
                  <BookOpen size={24} />
                </button>
              </div>
            </motion.div>
          </div>
          <div className="md:col-span-7 md:pl-12">
            <span className="text-burgundy uppercase tracking-widest text-xs font-bold mb-4 block">{t('in_kiosks')}</span>
            <h2 className="text-4xl md:text-6xl font-serif mb-8 leading-tight">WIL <span className="italic">Mag</span></h2>
            <p className="text-gray-600 text-lg mb-10 leading-relaxed max-w-xl">
              {getLocalized(magazine, 'description')}
            </p>
            <div className="flex flex-wrap gap-4">
              <Link to="/magazine" className="btn-premium">{t('latest_magazine')}</Link>
              <Link to="/subscribe" className="btn-gold">{t('subscribe')}</Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export const TVSection = () => {
  const { data: videos, loading } = useFirestoreCollection<Video>('videos');
  const { t } = useTranslation();
  const getLocalized = useLocalizedField();

  if (loading) return null;

  return (
    <section id="tv" className="py-24 bg-black-rich text-white">
      <div className="container-custom mb-12 flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-serif mb-2">WIL TV</h2>
          <p className="text-gold uppercase tracking-widest text-[10px]">{t('best_streaming')}</p>
        </div>
        <Link to="/tv" className="text-white hover:text-gold transition-colors flex items-center gap-2 uppercase tracking-widest text-xs">
          {t('see_all')} <ArrowRight size={14} />
        </Link>
      </div>
      <div className="relative">
        <div className="flex overflow-x-auto gap-6 px-[5%] no-scrollbar pb-10">
          {videos.map((video, idx) => (
            <motion.div 
              key={video.id}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.1 }}
              className="flex-none w-[300px] md:w-[450px] group cursor-pointer"
            >
              <div className="relative aspect-video overflow-hidden mb-4">
                <img src={video.thumbnail} alt={getLocalized(video, 'title')} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" referrerPolicy="no-referrer" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <div className="w-16 h-16 rounded-full border-2 border-white flex items-center justify-center">
                    <Play fill="white" size={24} />
                  </div>
                </div>
                <div className="absolute bottom-4 right-4 bg-black/80 px-2 py-1 text-[10px] tracking-widest">{video.duration}</div>
              </div>
              <h3 className="font-serif text-xl mb-1 group-hover:text-gold transition-colors">{getLocalized(video, 'title')}</h3>
              <p className="text-gray-500 text-xs uppercase tracking-widest">{getLocalized(video, 'category')}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export const ArticlesGrid = () => {
  const { data: articles, loading } = useFirestoreCollection<Article>('articles');
  const { t } = useTranslation();
  const getLocalized = useLocalizedField();

  if (loading || articles.length === 0) return null;

  return (
    <section id="articles" className="py-24 bg-gray-50">
      <div className="container-custom">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-serif mb-4">{t('featured_articles')}</h2>
          <div className="w-20 h-[1px] bg-gold mx-auto" />
        </div>
        <div className="editorial-grid">
          <div className="md:col-span-8">
            <Link to={`/articles/${articles[0].id}`} className="group block">
              <div className="relative overflow-hidden aspect-[16/9] mb-6 bg-gray-100">
                <img 
                  src={articles[0].image || `https://picsum.photos/seed/${articles[0].id}/1600/900`} 
                  alt={getLocalized(articles[0], 'title')} 
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
                  referrerPolicy="no-referrer" 
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${articles[0].id}/1600/900`;
                  }}
                />
                <div className="absolute top-6 left-6 bg-burgundy text-white px-4 py-1 text-[10px] uppercase tracking-widest">{getLocalized(articles[0], 'category')}</div>
              </div>
              <h3 className="text-3xl md:text-4xl font-serif mb-4 group-hover:text-burgundy transition-colors">{getLocalized(articles[0], 'title')}</h3>
              <p className="text-gray-600 mb-6 line-clamp-2">{getLocalized(articles[0], 'excerpt')}</p>
              <div className="flex items-center gap-4 text-[10px] uppercase tracking-[0.2em] text-gray-400">
                <span>{t('by')} {articles[0].author}</span>
                <span className="w-1 h-1 bg-gold rounded-full" />
                <span>{articles[0].date}</span>
              </div>
            </Link>
          </div>
          <div className="md:col-span-4 space-y-12">
            {articles.slice(1, 3).map((article) => (
              <Link key={article.id} to={`/articles/${article.id}`} className="group block">
                <div className="relative overflow-hidden aspect-video mb-4 bg-gray-100">
                  <img 
                    src={article.image || `https://picsum.photos/seed/${article.id}/800/600`} 
                    alt={getLocalized(article, 'title')} 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
                    referrerPolicy="no-referrer" 
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${article.id}/800/600`;
                    }}
                  />
                  {article.isPremium && <div className="absolute top-4 right-4 bg-gold text-black-rich p-2"><Crown size={12} /></div>}
                </div>
                <h4 className="text-xl font-serif mb-2 group-hover:text-burgundy transition-colors">{getLocalized(article, 'title')}</h4>
                <div className="flex items-center gap-3 text-[9px] uppercase tracking-widest text-gray-400">
                  <span>{getLocalized(article, 'category')}</span>
                  <span className="w-1 h-1 bg-gold rounded-full" />
                  <span>{article.date}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export const PortraitOfMonth = () => {
  const { t } = useTranslation();
  return (
    <section id="portrait" className="relative py-32 bg-black-rich overflow-hidden">
      <div className="absolute inset-0 opacity-40">
        <img src="https://images.unsplash.com/photo-1589156280159-27698a70f29e?auto=format&fit=crop&q=80&w=2000" alt="Portrait Background" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
      </div>
      <div className="container-custom relative z-10">
        <div className="max-w-2xl">
          <span className="text-gold uppercase tracking-[0.4em] text-xs mb-6 block">{t('portrait_month')}</span>
          <h2 className="text-5xl md:text-7xl font-serif text-white mb-8 leading-tight">
            {t('leadership_essence').split(' ')[0]} <span className="italic text-gold">{t('leadership_essence').split(' ').slice(1).join(' ')}</span>
          </h2>
          <p className="text-gray-300 text-lg mb-10 leading-relaxed italic">
            "Le véritable leadership consiste à ouvrir des portes là où d'autres ne voient que des murs. C'est un horizon de justice."
          </p>
          <Link to="/articles/1" className="btn-gold">{t('read_interview')}</Link>
        </div>
      </div>
    </section>
  );
};

export const EventsSection = () => {
  const { data: events, loading } = useFirestoreCollection<Event>('events');
  const { t } = useTranslation();
  const getLocalized = useLocalizedField();
  const event = events[0];

  if (loading || !event) return null;

  return (
    <section id="events" className="py-24 bg-white">
      <div className="container-custom">
        <div className="flex flex-col md:flex-row justify-between items-center mb-16 gap-8">
          <div>
            <h2 className="text-4xl md:text-5xl font-serif mb-2">{t('events')}</h2>
            <p className="text-burgundy uppercase tracking-widest text-xs font-bold">{t('dont_miss')}</p>
          </div>
          <div className="flex gap-6 text-center">
            {[{ label: t('days'), val: '45' }, { label: t('hours'), val: '12' }, { label: t('minutes'), val: '30' }].map((item) => (
              <div key={item.label} className="bg-gray-50 border border-gray-100 p-4 min-w-[80px]">
                <div className="text-2xl font-serif text-burgundy">{item.val}</div>
                <div className="text-[9px] uppercase tracking-widest text-gray-400">{item.label}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="relative group overflow-hidden">
          <img src={event.image} alt={getLocalized(event, 'title')} className="w-full h-[500px] object-cover transition-transform duration-1000 group-hover:scale-105" referrerPolicy="no-referrer" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-end p-12">
            <div className="text-white max-w-2xl">
              <div className="flex items-center gap-6 mb-6 text-gold uppercase tracking-widest text-xs">
                <span className="flex items-center gap-2"><Calendar size={14} /> {getLocalized(event, 'date')}</span>
              </div>
              <h3 className="text-4xl md:text-5xl font-serif mb-6">{getLocalized(event, 'title')}</h3>
              <p className="text-gray-300 mb-8">{getLocalized(event, 'description')}</p>
              <Link to="/events" className="btn-premium">{t('book_place')}</Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export const PartnersCarousel = () => {
  const { t } = useTranslation();
  return (
    <section id="partners" className="py-16 border-t border-gray-100">
      <div className="container-custom">
        <p className="text-center text-[10px] uppercase tracking-[0.4em] text-gray-400 mb-12">{t('trusted_by')}</p>
        <div className="flex flex-wrap justify-center items-center gap-12 md:gap-20 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
          {['VOGUE', 'FORBES', 'UNESCO', 'ORANGE', 'AIR FRANCE'].map((partner) => (
            <span key={partner} className="text-2xl font-serif font-bold tracking-tighter text-black-rich">{partner}</span>
          ))}
        </div>
      </div>
    </section>
  );
};

export const ContactSection = () => {
  const { t } = useTranslation();
  const [formData, setFormData] = React.useState({ name: '', email: '', phone: '', subject: '', message: '' });
  const [sending, setSending] = React.useState(false);
  const [sent, setSent] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sending) return;
    
    setSending(true);
    setError(null);
    
    try {
      // Basic validation
      if (!formData.name || !formData.email || !formData.subject || !formData.message) {
        throw new Error(t('fill_all_fields'));
      }

      await addDoc(collection(db, 'messages'), {
        ...formData,
        createdAt: serverTimestamp(),
        status: 'new'
      });
      
      setSent(true);
      setFormData({ name: '', email: '', phone: '', subject: '', message: '' });
      
      // Reset success message after 10 seconds
      setTimeout(() => setSent(false), 10000);
    } catch (err: any) {
      console.error("Error sending message:", err);
      try {
        handleFirestoreError(err, OperationType.CREATE, 'messages');
      } catch (firestoreErr: any) {
        setError(firestoreErr.message || t('error_sending_message'));
      }
    } finally {
      setSending(false);
    }
  };

  const [error, setError] = React.useState<string | null>(null);

  return (
    <section id="contact" className="py-24 bg-gray-50">
      <div className="container-custom">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
          <div>
            <span className="text-burgundy uppercase tracking-widest text-xs font-bold mb-4 block">{t('contact_us')}</span>
            <h2 className="text-4xl md:text-5xl font-serif mb-8">{t('talk_about')} <span className="italic text-gold">{t('impact')}</span></h2>
            <p className="text-gray-600 mb-12 leading-relaxed">
              {t('contact_description')}
            </p>

            <div className="space-y-8">
              <div className="flex items-start gap-6">
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm text-gold flex-none">
                  <MapPin size={20} />
                </div>
                <div>
                  <h4 className="font-serif text-lg mb-1">{t('headquarters')}</h4>
                  <p className="text-gray-500 text-sm">Yaoundé, Cameroun</p>
                </div>
              </div>
              <div className="flex items-start gap-6">
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm text-gold flex-none">
                  <Phone size={20} />
                </div>
                <div>
                  <h4 className="font-serif text-lg mb-1">{t('phone')}</h4>
                  <p className="text-gray-500 text-sm">+237 697 061 084</p>
                </div>
              </div>
              <div className="flex items-start gap-6">
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm text-gold flex-none">
                  <MailIcon size={20} />
                </div>
                <div>
                  <h4 className="font-serif text-lg mb-1">{t('email')}</h4>
                  <p className="text-gray-500 text-sm">contact@womenimpactlevel.com</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-8 md:p-12 shadow-2xl rounded-sm">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest font-bold text-gray-400">{t('full_name')}</label>
                  <input 
                    required
                    type="text" 
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full border-b border-gray-200 py-3 focus:outline-none focus:border-gold transition-colors text-sm"
                    placeholder={t('your_name')}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest font-bold text-gray-400">{t('email')}</label>
                  <input 
                    required
                    type="email" 
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full border-b border-gray-200 py-3 focus:outline-none focus:border-gold transition-colors text-sm"
                    placeholder="votre@email.com"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest font-bold text-gray-400">{t('phone_whatsapp')}</label>
                  <input 
                    type="tel" 
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className="w-full border-b border-gray-200 py-3 focus:outline-none focus:border-gold transition-colors text-sm"
                    placeholder="+237 ..."
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest font-bold text-gray-400">{t('subject')}</label>
                  <input 
                    required
                    type="text" 
                    value={formData.subject}
                    onChange={(e) => setFormData({...formData, subject: e.target.value})}
                    className="w-full border-b border-gray-200 py-3 focus:outline-none focus:border-gold transition-colors text-sm"
                    placeholder={t('what_talk_about')}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest font-bold text-gray-400">{t('message')}</label>
                <textarea 
                  required
                  rows={4}
                  value={formData.message}
                  onChange={(e) => setFormData({...formData, message: e.target.value})}
                  className="w-full border-b border-gray-200 py-3 focus:outline-none focus:border-gold transition-colors text-sm resize-none"
                  placeholder={t('your_message_here')}
                />
              </div>
              <button 
                disabled={sending}
                className="btn-premium w-full py-4 flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {sending ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
                {sending ? t('sending') : t('send_message')}
              </button>
              {sent && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-green-50 border border-green-100 rounded-lg"
                >
                  <p className="text-green-700 text-center text-xs font-bold uppercase tracking-widest">
                    {t('message_sent_success')}
                  </p>
                </motion.div>
              )}
              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-red-50 border border-red-100 rounded-lg"
                >
                  <p className="text-red-700 text-center text-[10px] font-bold uppercase tracking-widest">
                    {error.includes('{') ? t('permission_error') : error}
                  </p>
                </motion.div>
              )}
            </form>
          </div>
        </div>
      </div>
    </section>
  );
};
