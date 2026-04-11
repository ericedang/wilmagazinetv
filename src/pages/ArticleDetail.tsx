import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { db, doc, getDoc, updateDoc, arrayUnion, arrayRemove, OperationType, handleFirestoreError } from '../firebase';
import { Article } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { Loader2, ArrowLeft, Crown, Clock, User, Share2, Bookmark } from 'lucide-react';
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

  if (article.isPremium && !isPremium) {
    return (
      <div className="pt-32 min-h-screen container-custom text-center">
        <BackButton className="mx-auto mb-8" />
        <div className="max-w-2xl mx-auto bg-black-rich p-16 text-white shadow-2xl">
          <Crown size={48} className="mx-auto mb-8 text-gold" />
          <h1 className="text-4xl font-serif mb-6">{t('premium_content')}</h1>
          <p className="text-gray-400 mb-12 leading-relaxed">
            {t('premium_article_description')}
          </p>
          <Link to="/subscribe" className="btn-gold w-full py-4">{t('subscribe_now')}</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-32 pb-20 min-h-screen bg-white">
      <article className="container-custom max-w-4xl">
        <BackButton className="mb-12" />

        <header className="mb-16">
          <div className="flex items-center gap-3 text-[10px] uppercase tracking-widest text-gold mb-6 font-bold">
            <span>{getLocalized(article, 'category')}</span>
            <span className="w-1 h-1 bg-gray-300 rounded-full" />
            <span className="text-gray-400">{t('reading')} {article.date}</span>
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
              <button className="hover:text-gold transition-colors flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold">
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

        <div className="aspect-video mb-16 overflow-hidden shadow-2xl">
          <img src={article.image} alt={getLocalized(article, 'title')} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
        </div>

        <div className="prose prose-xl prose-burgundy max-w-none font-serif leading-relaxed text-gray-800 mb-20">
          <ReactMarkdown>{getLocalized(article, 'content')}</ReactMarkdown>
        </div>

        {/* Comment Section */}
        <CommentSection targetId={article.id} />
      </article>
    </div>
  );
}
