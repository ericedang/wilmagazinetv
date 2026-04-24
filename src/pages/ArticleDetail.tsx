import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { db, doc, getDoc, updateDoc, arrayUnion, arrayRemove, OperationType, handleFirestoreError } from '../firebase';
import { Article } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { Loader2, ArrowLeft, Crown, Clock, User, Share2, Bookmark, Linkedin, Facebook, Twitter, Link as LinkIcon } from 'lucide-react';
import { motion } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import CommentSection from '../components/CommentSection';
import { toast } from 'react-hot-toast';
import { cn } from '../lib/utils';
import { useTranslation } from 'react-i18next';
import { useLocalizedField } from '../lib/i18n-utils';
import BackButton from '../components/BackButton';

export default function ArticleDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const getLocalized = useLocalizedField();
  const { profile, user } = useAuth();
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const isPremium = profile?.subscriptionStatus === 'premium';

  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
  const shareTitle = article ? getLocalized(article, 'title') : '';

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          url: shareUrl
        });
      } catch (err) {
        console.log('Error sharing:', err);
      }
    } else {
      // Fallback: scroll to social buttons or copy link
      navigator.clipboard.writeText(shareUrl);
      toast.success(t('link_copied'));
    }
  };

  const toggleFavorite = async () => {
    if (!user || !article) {
      toast.error(t('login_to_save_article'));
      return;
    }

    const isFavorite = profile?.favorites?.includes(article.id);
    const userRef = doc(db, 'users', user.uid);

    try {
      if (isFavorite) {
        await updateDoc(userRef, {
          favorites: arrayRemove(article.id)
        });
        toast.success(t('removed_from_favorites'));
      } else {
        await updateDoc(userRef, {
          favorites: arrayUnion(article.id)
        });
        toast.success(t('added_to_favorites'));
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
    }
  };

  useEffect(() => {
    const fetchArticle = async () => {
      if (!id) return;
      try {
        const docRef = doc(db, 'articles', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setArticle({ id: docSnap.id, ...docSnap.data() } as Article);
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `articles/${id}`);
      } finally {
        setLoading(false);
      }
    };

    fetchArticle();
  }, [id]);

  if (loading) {
    return (
      <div className="pt-32 min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-gold" size={48} />
      </div>
    );
  }

  if (!article) {
    return (
      <div className="pt-32 min-h-screen container-custom text-center">
        <BackButton className="mx-auto mb-8" />
        <h1 className="text-4xl font-serif mb-8">{t('article_not_found')}</h1>
        <Link to="/articles" className="btn-gold">{t('back_to_articles')}</Link>
      </div>
    );
  }

  // Remove the early return block for article.isPremium to allow viewing the header/image

  const isPremiumRestriction = !isPremium; // Applicable to all non-subscribers for all articles

  const getTruncatedContent = (content: string) => {
    const paragraphs = content.split('\n\n');
    if (paragraphs.length <= 2) return content.substring(0, 300) + '...';
    return paragraphs.slice(0, 2).join('\n\n') + '\n\n...';
  };

  return (
    <div className="pt-32 pb-20 min-h-screen bg-white">
      <article className="container-custom max-w-4xl">
        <BackButton className="mb-12" />

        <header className="mb-16">
          <div className="flex items-center gap-3 text-[10px] uppercase tracking-widest text-gold mb-6 font-bold">
            <span>{getLocalized(article, 'category')}</span>
            <span className="w-1 h-1 bg-gray-300 rounded-full" />
            <span className="text-gray-400">{t('reading')} {getLocalized(article, 'date')}</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-serif mb-12 leading-tight">
            {getLocalized(article, 'title')}
          </h1>
          <div className="flex flex-wrap items-center justify-between gap-8 py-8 border-y border-gray-100">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-burgundy font-bold">
                {article.author.charAt(0)}
              </div>
              <div>
                <div className="text-xs font-bold uppercase tracking-widest">{article.author}</div>
                <div className="text-[10px] text-gray-400 uppercase tracking-widest">{t('wil_editor')}</div>
              </div>
            </div>
            <div className="flex items-center gap-6 text-gray-400">
              <button onClick={handleShare} className="hover:text-gold transition-colors flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold">
                <Share2 size={16} /> {t('share')}
              </button>
              <button 
                onClick={toggleFavorite}
                className={cn(
                  "transition-colors flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold",
                  profile?.favorites?.includes(article.id) ? "text-gold" : "hover:text-gold"
                )}
              >
                <Bookmark size={16} fill={profile?.favorites?.includes(article.id) ? "currentColor" : "none"} /> 
                {profile?.favorites?.includes(article.id) ? t('saved') : t('save')}
              </button>
            </div>
          </div>
        </header>

        <div className="aspect-video mb-16 overflow-hidden shadow-2xl bg-gray-100">
          <img 
            src={article.image || `https://picsum.photos/seed/${article.id}/1600/900`} 
            alt={getLocalized(article, 'title')} 
            className="w-full h-full object-cover" 
            referrerPolicy="no-referrer" 
            onError={(e) => {
              (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${article.id}/1600/900`;
            }}
          />
        </div>

        <div className="relative mb-16">
          <div className="prose prose-xl prose-burgundy max-w-none font-serif leading-relaxed text-gray-800">
            <ReactMarkdown>
              {isPremiumRestriction ? getTruncatedContent(getLocalized(article, 'content')) : getLocalized(article, 'content')}
            </ReactMarkdown>
          </div>
          {isPremiumRestriction && (
            <div className="absolute bottom-0 left-0 right-0 h-64 bg-gradient-to-t from-white via-white/80 to-transparent pointer-events-none flex items-end justify-center pb-8" />
          )}
        </div>

        {isPremiumRestriction ? (
          <div className="max-w-3xl mx-auto bg-black-rich p-12 text-white shadow-2xl text-center mb-16 relative z-10 border border-gold/20">
            <Crown size={48} className="mx-auto mb-6 text-gold" />
            <h2 className="text-3xl font-serif mb-4">{t('read_rest_article_title')}</h2>
            <p className="text-gray-400 mb-8 max-w-xl mx-auto">
              {t('read_rest_article_description')}
            </p>
            <Link to="/subscription" className="btn-gold inline-block px-12 py-4 shadow-xl shadow-gold/20">{t('subscribe_to_continue')}</Link>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 border-t border-gray-100 mb-12">
            <h3 className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-6">{t('share_this_article')}</h3>
            <div className="flex items-center gap-4">
              <a 
                href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center text-gray-600 hover:bg-[#0077b5] hover:text-white transition-colors"
                title={t('share_on_linkedin')}
              >
                <Linkedin size={20} />
              </a>
              <a 
                href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center text-gray-600 hover:bg-[#1877f2] hover:text-white transition-colors"
                title={t('share_on_facebook')}
              >
                <Facebook size={20} />
              </a>
              <a 
                href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareTitle)}`} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center text-gray-600 hover:bg-[#1da1f2] hover:text-white transition-colors"
                title={t('share_on_twitter')}
              >
                <Twitter size={20} />
              </a>
              <button 
                onClick={() => { navigator.clipboard.writeText(shareUrl); toast.success(t('link_copied')); }} 
                className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center text-gray-600 hover:bg-gold hover:text-white transition-colors"
                title={t('copy_link')}
              >
                <LinkIcon size={20} />
              </button>
            </div>
          </div>
        )}

        {/* Comment Section (only for premium to encourage subscribing, or for everybody?) */}
        {!isPremiumRestriction && <CommentSection targetId={article.id} />}
      </article>
    </div>
  );
}
