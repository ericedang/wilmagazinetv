import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { db, auth, collection, addDoc, query, where, orderBy, onSnapshot, serverTimestamp, OperationType, handleFirestoreError } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { Comment } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Send, MessageSquare, ShieldAlert, CheckCircle2, Clock } from 'lucide-react';

interface CommentSectionProps {
  targetId: string;
}

const CommentSection: React.FC<CommentSectionProps> = ({ targetId }) => {
  const { profile } = useAuth();
  const { t } = useTranslation();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    const q = query(
      collection(db, 'comments'),
      where('targetId', '==', targetId),
      where('status', '==', 'approved'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedComments = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Comment[];
      setComments(fetchedComments);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `comments?targetId=${targetId}`);
    });

    return () => unsubscribe();
  }, [targetId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !newComment.trim()) return;

    setIsSubmitting(true);
    setMessage(null);

    try {
      await addDoc(collection(db, 'comments'), {
        content: newComment.trim(),
        userId: profile.uid,
        userName: profile.displayName || t('anonymous_user'),
        userPhoto: profile.photoURL || '',
        targetId,
        status: 'pending',
        createdAt: serverTimestamp()
      });

      setNewComment('');
      setMessage({ type: 'success', text: t('comment_pending_approval') });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'comments');
      setMessage({ type: 'error', text: t('comment_error') });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mt-16 space-y-12">
      <div className="border-t border-gray-100 pt-12">
        <h3 className="text-2xl font-serif mb-8 flex items-center gap-3">
          <MessageSquare className="text-gold" />
          {t('comments')} ({comments.length})
        </h3>

        {profile ? (
          <form onSubmit={handleSubmit} className="space-y-4 mb-12">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder={t('comment_placeholder')}
              className="w-full p-6 bg-gray-50 border border-gray-100 focus:border-gold focus:outline-none transition-all font-serif italic text-lg min-h-[120px]"
              maxLength={500}
            />
            <div className="flex justify-between items-center">
              <span className="text-[10px] text-gray-400 uppercase tracking-widest">
                {newComment.length}/500 {t('characters')}
              </span>
              <button
                type="submit"
                disabled={isSubmitting || !newComment.trim()}
                className="btn-gold flex items-center gap-2"
              >
                {isSubmitting ? t('sending') : <><Send size={16} /> {t('publish')}</>}
              </button>
            </div>
            {message && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-4 text-xs font-bold uppercase tracking-widest flex items-center gap-3 ${
                  message.type === 'success' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
                }`}
              >
                {message.type === 'success' ? <CheckCircle2 size={16} /> : <ShieldAlert size={16} />}
                {message.text}
              </motion.div>
            )}
          </form>
        ) : (
          <div className="bg-gray-50 p-8 text-center border border-dashed border-gray-200 mb-12">
            <p className="text-gray-500 font-serif mb-4">{t('login_to_comment')}</p>
            <button className="text-gold font-bold uppercase tracking-widest text-xs hover:text-burgundy transition-colors">
              {t('login')}
            </button>
          </div>
        )}

        <div className="space-y-8">
          <AnimatePresence>
            {comments.map((comment) => (
              <motion.div
                key={comment.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-6 pb-8 border-b border-gray-50 last:border-0"
              >
                <div className="w-12 h-12 bg-gray-100 overflow-hidden flex-shrink-0">
                  {comment.userPhoto ? (
                    <img src={comment.userPhoto} alt={comment.userName} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gold/10 text-gold font-bold">
                      {comment.userName.charAt(0)}
                    </div>
                  )}
                </div>
                <div className="flex-grow">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-bold text-sm uppercase tracking-widest">{comment.userName}</h4>
                    <span className="text-[10px] text-gray-400 flex items-center gap-1">
                      <Clock size={10} />
                      {(comment.createdAt as any)?.toDate ? (comment.createdAt as any).toDate().toLocaleDateString() : new Date(comment.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-gray-600 leading-relaxed font-serif italic text-lg">
                    "{comment.content}"
                  </p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {comments.length === 0 && (
            <div className="text-center py-12 text-gray-400 italic font-serif">
              {t('be_first_to_comment')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CommentSection;
