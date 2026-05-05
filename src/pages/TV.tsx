import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Clock, Share2, Bookmark, Loader2, ChevronRight, ChevronLeft, Info, Volume2, VolumeX, Radio, ArrowLeft } from 'lucide-react';
import PageBuilder from '../components/sections/PageBuilder';
import { useFirestoreCollection } from '../hooks/useFirestoreCollection';
import { Video } from '../types';
import { cn } from '../lib/utils';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { db, doc, updateDoc, arrayUnion, arrayRemove, OperationType, handleFirestoreError } from '../firebase';
import { toast } from 'react-hot-toast';
import { useLocalizedField } from '../lib/i18n-utils';
import BackButton from '../components/BackButton';

interface VideoShelfProps {
  title: string;
  videos: Video[];
  onSelect: (video: Video) => void;
}

const VideoShelf = ({ title, videos, onSelect }: VideoShelfProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const getLocalized = useLocalizedField();

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const { scrollLeft, clientWidth } = scrollRef.current;
      const scrollTo = direction === 'left' ? scrollLeft - clientWidth : scrollLeft + clientWidth;
      scrollRef.current.scrollTo({ left: scrollTo, behavior: 'smooth' });
    }
  };

  const handleScroll = () => {
    if (scrollRef.current) {
      setShowLeftArrow(scrollRef.current.scrollLeft > 0);
    }
  };

  if (videos.length === 0) return null;

  return (
    <div className="mb-16 relative group/shelf">
      <div className="container-custom flex items-center justify-between mb-6">
        <h3 className="text-2xl md:text-3xl font-serif text-white tracking-tight flex items-center gap-3">
          {title}
          <span className="h-[1px] w-12 bg-gold/30 hidden md:block" />
        </h3>
        <div className="flex gap-2 opacity-0 group-hover/shelf:opacity-100 transition-opacity">
          <button 
            onClick={() => scroll('left')}
            className={cn(
              "p-2 rounded-full border border-white/10 hover:bg-white/10 transition-colors text-white",
              !showLeftArrow && "opacity-30 cursor-not-allowed"
            )}
            disabled={!showLeftArrow}
          >
            <ChevronLeft size={20} />
          </button>
          <button 
            onClick={() => scroll('right')}
            className="p-2 rounded-full border border-white/10 hover:bg-white/10 transition-colors text-white"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      <div 
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex overflow-x-auto gap-6 px-[5%] no-scrollbar scroll-smooth pb-8"
      >
        {videos.map((video, idx) => (
          <motion.div 
            key={video.id}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            viewport={{ once: true }}
            onClick={() => onSelect(video)}
            className="flex-none w-[280px] md:w-[400px] group cursor-pointer relative overflow-hidden"
          >
            <div className="relative aspect-video overflow-hidden rounded-sm shadow-lg">
              <img 
                src={video.thumbnail} 
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                alt={getLocalized(video, 'title')} 
                referrerPolicy="no-referrer" 
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
              
              <div className="absolute bottom-4 left-4">
                <span className="text-[10px] text-gold uppercase tracking-widest font-bold block mb-1">{getLocalized(video, 'category')}</span>
                <h4 className="text-white font-serif text-lg leading-tight">{getLocalized(video, 'title')}</h4>
              </div>

              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center">
                <div className="w-12 h-12 rounded-full border border-white/50 flex items-center justify-center backdrop-blur-sm">
                  <Play fill="white" size={20} />
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default function TV() {
  const navigate = useNavigate();
  const { profile, user } = useAuth();
  const { data: videos, loading } = useFirestoreCollection<Video>('videos');
  const { data: announcements } = useFirestoreCollection<{ text: string; isActive: boolean }>('announcements');
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [activeCategory, setActiveCategory] = useState('Tous');
  const { t } = useTranslation();
  const getLocalized = useLocalizedField();

  const toggleWatchlist = async (videoId: string) => {
    if (!user) {
      toast.error(t('login_to_manage_list'));
      return;
    }

    const isFavorite = profile?.favorites?.includes(videoId);
    const userRef = doc(db, 'users', user.uid);

    try {
      if (isFavorite) {
        await updateDoc(userRef, {
          favorites: arrayRemove(videoId)
        });
        toast.success(t('removed_from_list'));
      } else {
        await updateDoc(userRef, {
          favorites: arrayUnion(videoId)
        });
        toast.success(t('added_to_list'));
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
    }
  };

  const activeAnnouncements = announcements.filter(a => a.isActive);
  const tickerText = activeAnnouncements.length > 0 
    ? activeAnnouncements.map(a => a.text).join(' • ') + ' • '
    : "Women Impact Summit 2026 : Le 24 Avril à l'Hôtel Djeuga Palace de Yaoundé • Cérémonie de lancement de WIL magazine • Bienvenue sur Women Impact TV • Le prochain magazine papier sera disponible le 15 mai • ";

  const featuredVideo = videos[0];
  const categories = ['Tous', 'Interview', 'Documentaire', 'Masterclass', 'Reportage', 'Mindset', 'Leadership', 'Technologie', 'Société'];

  const filteredVideos = activeCategory === 'Tous' 
    ? videos 
    : videos.filter(v => v.category === activeCategory);

  const nativeSections = [
    {
      id: 'tv-back',
      orderIndex: -20,
      component: (
        <div className="bg-black pt-24 pb-4 container-custom">
          <BackButton className="text-white/40 hover:text-gold" />
        </div>
      )
    },
    {
      id: 'tv-live',
      orderIndex: -10,
      component: (
        <section className="bg-burgundy py-4 border-b border-white/10">
          <div className="container-custom flex items-center gap-4">
            <div className="flex items-center gap-2 bg-red-600 px-3 py-1 rounded animate-pulse">
              <Radio size={14} className="text-white" />
              <span className="text-[10px] font-bold text-white uppercase tracking-widest">LIVE</span>
            </div>
            <div className="flex-grow overflow-hidden">
              <div className="text-white text-sm font-serif italic truncate">
                {t('common.live_tv')}: Women Impact Summit 2026 - En direct de Yaoundé (Hôtel Djeuga Palace)
              </div>
            </div>
            <button className="text-gold text-[10px] font-bold uppercase tracking-widest border border-gold/30 px-4 py-1 hover:bg-gold hover:text-black transition-all">
              {t('common.watch_now')}
            </button>
          </div>
        </section>
      )
    },
    {
      id: 'tv-hero',
      orderIndex: 0,
      component: (
        <section className="relative h-[85vh] w-full bg-black overflow-hidden">
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="animate-spin text-gold" size={48} />
            </div>
          ) : featuredVideo ? (
            <>
              {/* Background Cinematic Visual */}
              <div className="absolute inset-0 z-0">
                <img 
                  src={featuredVideo.thumbnail} 
                  className="absolute w-full h-full object-cover opacity-60 scale-105 animate-slow-zoom"
                  alt="Featured Background"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-r from-black via-black/20 to-transparent" />
              </div>

              {/* Content */}
              <div className="relative z-10 flex flex-col justify-end h-full p-12 md:p-24 container-custom">
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8 }}
                  className="max-w-4xl"
                >
                  <span className="text-gold uppercase tracking-[0.4em] text-xs mb-6 block font-bold">
                    {t('common.exclusive')} • {getLocalized(featuredVideo, 'category')}
                  </span>

                  <h1 className="text-5xl md:text-8xl font-serif text-white mb-8 leading-tight tracking-tighter">
                    {getLocalized(featuredVideo, 'title')}
                  </h1>

                  <p className="text-gray-300 text-lg md:text-xl max-w-2xl mb-10 leading-relaxed font-light italic">
                    {getLocalized(featuredVideo, 'description')}
                  </p>

                  <div className="flex flex-wrap gap-4">
                    <button 
                      onClick={() => setSelectedVideo(featuredVideo)}
                      className="bg-gold text-black-rich px-8 py-4 font-bold uppercase text-xs tracking-widest hover:scale-105 transition-all flex items-center gap-2"
                    >
                      <Play fill="currentColor" size={16} /> {t('common.watch_now')}
                    </button>
                    <button 
                      onClick={() => toggleWatchlist(featuredVideo.id)}
                      className={cn(
                        "px-8 py-4 text-xs uppercase tracking-widest font-bold transition-all flex items-center gap-2",
                        profile?.favorites?.includes(featuredVideo.id)
                          ? "bg-gold text-black-rich"
                          : "border border-white/30 text-white hover:bg-white/10"
                      )}
                    >
                      {profile?.favorites?.includes(featuredVideo.id) ? `✓ ${t('in_my_list')}` : `+ ${t('my_list')}`}
                    </button>
                  </div>
                </motion.div>
              </div>

              {/* Controls */}
              <div className="absolute bottom-12 right-[5%] z-20 flex items-center gap-6">
                <button 
                  onClick={() => setIsMuted(!isMuted)}
                  className="w-12 h-12 rounded-full border border-white/20 flex items-center justify-center text-white hover:bg-white/10 transition-colors"
                >
                  {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                </button>
                <div className="h-12 w-[1px] bg-white/20" />
                <div className="text-white/40 text-[10px] uppercase tracking-[0.3em] font-bold">
                  {t('common.scroll_explore')}
                </div>
              </div>
            </>
          ) : null}
        </section>
      )
    },
    {
      id: 'tv-navigation',
      orderIndex: 10,
      component: (
        <div className="bg-black py-8 border-y border-white/5 sticky top-20 z-40 backdrop-blur-xl bg-black/80">
          <div className="container-custom flex flex-wrap items-center justify-between gap-6">
            <div className="flex gap-8 overflow-x-auto no-scrollbar pb-2 md:pb-0">
              {categories.map(cat => (
                <button 
                  key={cat} 
                  onClick={() => setActiveCategory(cat)}
                  className={cn(
                    "text-[10px] uppercase tracking-[0.3em] font-bold transition-all relative group whitespace-nowrap",
                    activeCategory === cat ? "text-gold" : "text-white/40 hover:text-white"
                  )}
                >
                  {cat}
                  {activeCategory === cat && (
                    <motion.div 
                      layoutId="cat-underline"
                      className="absolute -bottom-2 left-0 w-full h-[2px] bg-gold"
                    />
                  )}
                </button>
              ))}
            </div>
            <div className="hidden md:flex items-center gap-4 text-white/40 text-[10px] uppercase tracking-widest font-bold">
              <span>{filteredVideos.length} {t('common.all_videos')}</span>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'tv-shelves',
      orderIndex: 20,
      component: (
        <section className="bg-black pt-16 pb-32">
          {activeCategory === 'Tous' ? (
            <>
              <VideoShelf 
                title={t('great_interviews')} 
                videos={videos.filter(v => v.category === 'Interview')} 
                onSelect={setSelectedVideo}
              />
              <VideoShelf 
                title={t('documentaries_stories')} 
                videos={videos.filter(v => v.category === 'Documentaire')} 
                onSelect={setSelectedVideo}
              />
              <VideoShelf 
                title={t('excellence_masterclasses')} 
                videos={videos.filter(v => v.category === 'Masterclass')} 
                onSelect={setSelectedVideo}
              />
              <VideoShelf 
                title={t('reports_immersion')} 
                videos={videos.filter(v => v.category === 'Reportage')} 
                onSelect={setSelectedVideo}
              />
              <VideoShelf 
                title={t('technology_innovation')} 
                videos={videos.filter(v => v.category === 'Technologie')} 
                onSelect={setSelectedVideo}
              />
              <VideoShelf 
                title={t('society_impact')} 
                videos={videos.filter(v => v.category === 'Société')} 
                onSelect={setSelectedVideo}
              />
            </>
          ) : (
            <div className="container-custom">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
                {filteredVideos.map((video, idx) => (
                  <motion.div 
                    key={video.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    onClick={() => setSelectedVideo(video)}
                    className="group cursor-pointer"
                  >
                    <div className="relative aspect-video overflow-hidden mb-6 rounded-sm shadow-xl">
                      <img src={video.thumbnail} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt={getLocalized(video, 'title')} referrerPolicy="no-referrer" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <div className="w-16 h-16 rounded-full border-2 border-white flex items-center justify-center">
                          <Play fill="white" size={24} />
                        </div>
                      </div>
                      <div className="absolute bottom-4 right-4 bg-black/80 px-2 py-1 text-[10px] tracking-widest text-white">{video.duration}</div>
                    </div>
                    <h3 className="font-serif text-2xl text-white mb-2 group-hover:text-gold transition-colors">{getLocalized(video, 'title')}</h3>
                    <p className="text-gray-500 text-xs uppercase tracking-widest">{getLocalized(video, 'category')}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </section>
      )
    }
  ];

  return (
    <div className="min-h-[100dvh] bg-black pb-12">
      <PageBuilder pageSlug="tv" nativeSections={nativeSections} />

      {/* Video Modal Overlay */}
      <AnimatePresence>
        {selectedVideo && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 p-4 md:p-10 backdrop-blur-2xl"
          >
            <div className="relative w-full max-w-6xl aspect-video bg-black shadow-2xl rounded-lg overflow-hidden ring-1 ring-white/10">
              <button 
                onClick={() => setSelectedVideo(null)}
                className="absolute top-6 right-6 z-10 text-white/50 hover:text-white transition-colors bg-black/50 p-2 rounded-full backdrop-blur-md"
              >
                <Share2 size={24} className="rotate-45" /> 
              </button>
              
              <iframe 
                width="100%" 
                height="100%" 
                src={`${selectedVideo.videoUrl}?autoplay=1`} 
                title={getLocalized(selectedVideo, 'title')}
                frameBorder="0" 
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                allowFullScreen
                className="w-full h-full"
              ></iframe>

              <div className="absolute bottom-0 left-0 w-full p-8 bg-gradient-to-t from-black via-black/80 to-transparent">
                <div className="flex items-center gap-4 mb-4">
                  <span className="text-gold text-[10px] font-bold uppercase tracking-[0.3em]">{getLocalized(selectedVideo, 'category')}</span>
                  <span className="text-white/40 text-[10px] uppercase tracking-widest">{selectedVideo.duration}</span>
                </div>
                <h2 className="text-3xl md:text-4xl font-serif text-white mb-4">{getLocalized(selectedVideo, 'title')}</h2>
                <div className="flex gap-6">
                  <button 
                    onClick={() => toggleWatchlist(selectedVideo.id)}
                    className={cn(
                      "flex items-center gap-2 transition-colors text-xs uppercase tracking-widest font-bold",
                      profile?.favorites?.includes(selectedVideo.id) ? "text-gold" : "text-white/60 hover:text-white"
                    )}
                  >
                    <Bookmark size={16} fill={profile?.favorites?.includes(selectedVideo.id) ? "currentColor" : "none"} /> 
                    {profile?.favorites?.includes(selectedVideo.id) ? t('remove_from_my_list') : t('common.save')}
                  </button>
                  <button className="flex items-center gap-2 text-white/60 hover:text-white transition-colors text-xs uppercase tracking-widest font-bold">
                    <Share2 size={16} /> {t('common.share')}
                  </button>
                </div>
              </div>
            </div>
            
            {/* Close click outside */}
            <div className="absolute inset-0 -z-10" onClick={() => setSelectedVideo(null)} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
