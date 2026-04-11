import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { db, collection, query, where, onSnapshot, orderBy, doc } from '../firebase';
import { Announcement } from '../types';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';

const BreakingNewsBar = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [speed, setSpeed] = useState(40);
  const { t } = useTranslation();
  const location = useLocation();
  const allowedPaths = ['/tv', '/events', '/dashboard'];
  const isVisiblePage = allowedPaths.includes(location.pathname);

  useEffect(() => {
    const q = query(
      collection(db, 'announcements'),
      where('isActive', '==', true),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Announcement[];
      setAnnouncements(data);
    });

    const unsubSettings = onSnapshot(doc(db, 'settings', 'marquee'), (snap) => {
      if (snap.exists()) {
        setSpeed(snap.data().speed || 40);
      }
    });

    return () => {
      unsubscribe();
      unsubSettings();
    };
  }, []);

  if (announcements.length === 0 || !isVisiblePage) return null;

  return (
    <div className="fixed bottom-0 left-0 w-full z-[60] backdrop-blur-md bg-black/40 border-t border-white/10 pointer-events-none">
      <div className="overflow-hidden whitespace-nowrap py-3 flex items-center">
        <div 
          className="flex animate-marquee hover:[animation-play-state:paused] pointer-events-auto cursor-default"
          style={{ animationDuration: `${speed}s` }}
        >
          {/* Duplicate for seamless loop */}
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center">
              {announcements.map((announcement) => (
                <span key={`${i}-${announcement.id}`} className="mx-12 text-white text-[10px] uppercase tracking-[0.2em] font-bold flex items-center gap-3">
                  <span className="text-gold font-black">{t('breaking_news')}</span>
                  <span className="w-1.5 h-1.5 bg-gold rounded-full shadow-[0_0_8px_rgba(212,175,55,0.8)]" />
                  {announcement.text}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
      
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-25%); }
        }
        .animate-marquee {
          animation: marquee linear infinite;
        }
      `}</style>
    </div>
  );
};

export default BreakingNewsBar;
