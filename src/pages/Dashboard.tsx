import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { signInWithPopup, googleProvider, auth, signOut, db, doc, setDoc, updateDoc, deleteDoc, collection, addDoc, getDocs, query, limit, serverTimestamp, onSnapshot, where, orderBy, OperationType, handleFirestoreError, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from '../firebase';
import { ARTICLES, VIDEOS, MAGAZINES, EVENTS } from '../constants';
import { Database, Loader2, Sparkles, FileText, Send, CheckCircle2, AlertCircle, Layout, Settings, Play, Image, Copy, Ticket, XCircle, Download, MessageSquare, Mail, Upload, X, Trash2, Calendar } from 'lucide-react';
import { useLocalizedField } from '../lib/i18n-utils';
import { ArrowRight, LogOut, User, CreditCard, Bookmark, History, ShieldCheck, ArrowLeft, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { GoogleGenAI, Type } from "@google/genai";
import * as mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import { cn } from '../lib/utils';
import ReactMarkdown from 'react-markdown';
import PageBuilder from '../components/sections/PageBuilder';
import ImageUploader from '../components/admin/ImageUploader';
import FileUploader from '../components/admin/FileUploader';
import RichTextEditor from '../components/admin/RichTextEditor';
import { arrayUnion, arrayRemove } from 'firebase/firestore';
import { toast } from 'react-hot-toast';

import { downloadFile } from '../lib/download';
import { useLocalStorage } from '../hooks/useLocalStorage';

import GaleriesAdmin from '../components/admin/GaleriesAdmin';

export default function Dashboard() {
  const { user, profile, loading } = useAuth();
  const { t } = useTranslation();
  const getLocalized = useLocalizedField();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = React.useState<string | null>(null);
  const [seeding, setSeeding] = React.useState(false);
  const [seedStatus, setSeedStatus] = React.useState<string | null>(null);
  const [activeTab, setActiveTab] = useLocalStorage<string>('dashboard_active_tab', 'ai-editorial');
  const [aiInput, setAiInput] = useLocalStorage<string>('draft_ai_input', '');
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [isTranslating, setIsTranslating] = React.useState(false);
  const [aiResult, setAiResult] = React.useState<any>(null);
  const [pendingComments, setPendingComments] = React.useState<any[]>([]);
  const [messages, setMessages] = React.useState<any[]>([]);
  const [users, setUsers] = React.useState<any[]>([]);
  const [announcements, setAnnouncements] = React.useState<any[]>([]);
  const [media, setMedia] = React.useState<any[]>([]);
  const [reservations, setReservations] = React.useState<any[]>([]);
  const [articles, setArticles] = React.useState<any[]>([]);
  const [videos, setVideos] = React.useState<any[]>([]);
  const [magazines, setMagazines] = React.useState<any[]>([]);
  const [events, setEvents] = React.useState<any[]>([]);
  const [newAnnouncement, setNewAnnouncement] = React.useState('');
  const [isAddingAnnouncement, setIsAddingAnnouncement] = React.useState(false);
  const [isArticleModalOpen, setIsArticleModalOpen] = React.useState(false);
  const [selectedArticles, setSelectedArticles] = React.useState<string[]>([]);
  const [selectedSection, setSelectedSection] = React.useState<any>(null);
  const [isPageBuilderEditing, setIsPageBuilderEditing] = React.useState(false);
  const [magazineData, setMagazineData] = useLocalStorage('draft_magazine', { title: '', issueDate: '', pdfUrl: '', coverImage: '' });
  const [aiMode, setAiMode] = React.useState<'text' | 'file'>('file');
  const [filesData, setFilesData] = React.useState<{ base64?: string, text?: string, name: string, mimeType: string }[]>([]);
  const [isPublishingMagazine, setIsPublishingMagazine] = React.useState(false);
  const [isDragging, setIsDragging] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [isVideoModalOpen, setIsVideoModalOpen] = React.useState(false);
  const [editingItem, setEditingItem] = React.useState<{ type: string, data: any, index: number } | null>(null);
  const [editingAnnouncement, setEditingAnnouncement] = React.useState<{ id: string, text: string } | null>(null);
  const [editingArticle, setEditingArticle] = useLocalStorage<any>('draft_article', null);
  const [imageUploadArticle, setImageUploadArticle] = React.useState<any>(null);
  const [magazineEditorial, setMagazineEditorial] = React.useState({ title: '', author: '', role: '', content: '', image: '' });
  const [isMediaLibraryOpen, setIsMediaLibraryOpen] = React.useState(false);
  const [editingVideo, setEditingVideo] = useLocalStorage<any>('draft_video', null);
  const [editingEvent, setEditingEvent] = useLocalStorage<any>('draft_event_edit', null);
  const [isEventModalOpen, setIsEventModalOpen] = React.useState(false);
  const [newEventData, setNewEventData] = useLocalStorage('draft_event_new', { title: '', category: '', date: '', location: '', price: '', image: '', attendees: 0, description: '' });
  const [marqueeSettings, setMarqueeSettings] = React.useState({ speed: 80 });
  const [newVideoData, setNewVideoData] = useLocalStorage('draft_video_new', { title: '', category: '', duration: '', thumbnail: '', videoUrl: '', description: '' });
  const [statusMsg, setStatusMsg] = React.useState<{ text: string, type: 'success' | 'error' } | null>(null);
  const [confirmModal, setConfirmModal] = React.useState<{ isOpen: boolean, title: string, message: string, onConfirm: () => void } | null>(null);

  // Email/Password Auth State
  const [authMode, setAuthMode] = React.useState<'choose' | 'login' | 'register'>('choose');
  const [authEmail, setAuthEmail] = React.useState('');
  const [authPassword, setAuthPassword] = React.useState('');
  const [authName, setAuthName] = React.useState('');

  useEffect(() => {
    const preventDefault = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };

    window.addEventListener('dragover', preventDefault);
    window.addEventListener('drop', preventDefault);

    return () => {
      window.removeEventListener('dragover', preventDefault);
      window.removeEventListener('drop', preventDefault);
    };
  }, []);

  const showStatus = (text: string, type: 'success' | 'error' = 'success') => {
    setStatusMsg({ text, type });
    setTimeout(() => setStatusMsg(null), 5000);
  };

  const handlePublishMagazine = async () => {
    if (!magazineData.title || !magazineData.pdfUrl || !magazineData.coverImage) {
      showStatus(t('fill_all_fields'), "error");
      return;
    }
    setIsPublishingMagazine(true);
    try {
      await addDoc(collection(db, 'magazines'), {
        ...magazineData,
        createdAt: serverTimestamp()
      });
      showStatus(t('publish_success'));
      setMagazineData({ title: '', issueDate: '', pdfUrl: '', coverImage: '' });
    } catch (err) {
      console.error("Error publishing magazine:", err);
      showStatus(t('error_occurred'), "error");
    } finally {
      setIsPublishingMagazine(false);
    }
  };

  useEffect(() => {
    if (profile?.role === 'admin' || profile?.role === 'editor') {
      const q = query(
        collection(db, 'comments'),
        where('status', '==', 'pending'),
        orderBy('createdAt', 'desc')
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const fetchedComments = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setPendingComments(fetchedComments);
      }, (error) => {
        try { handleFirestoreError(error, OperationType.GET, 'comments?status=pending'); } catch (e: any) { setError(JSON.parse(e.message)?.error || e.message); }
      });

      return () => unsubscribe();
    }
  }, [profile]);

  useEffect(() => {
    if (profile?.role === 'admin' || profile?.role === 'super-admin') {
      // Fetch messages
      const qMsg = query(collection(db, 'messages'), orderBy('createdAt', 'desc'));
      const unsubMsg = onSnapshot(qMsg, (snap) => {
        setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      }, (error) => {
        console.error("Messages snapshot error:", error);
        try { handleFirestoreError(error, OperationType.GET, 'messages'); } catch (e: any) { setError(JSON.parse(e.message)?.error || e.message); }
      });

      // Fetch users
      const qUsers = query(collection(db, 'users'), orderBy('createdAt', 'desc'), limit(50));
      const unsubUsers = onSnapshot(qUsers, (snap) => {
        setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      }, (e) => {
        try { handleFirestoreError(e, OperationType.GET, 'users'); } catch (err: any) { setError(JSON.parse(err.message)?.error || err.message); }
      });

      // Fetch announcements
      const qAnn = query(collection(db, 'announcements'), orderBy('createdAt', 'desc'));
      const unsubAnn = onSnapshot(qAnn, (snap) => {
        setAnnouncements(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      }, (e) => {
        try { handleFirestoreError(e, OperationType.GET, 'announcements'); } catch (err: any) { setError(JSON.parse(err.message)?.error || err.message); }
      });

      // Fetch media library
      const qMedia = query(collection(db, 'media'), orderBy('createdAt', 'desc'), limit(100));
      const unsubMedia = onSnapshot(qMedia, (snap) => {
        setMedia(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      }, (e) => {
        try { handleFirestoreError(e, OperationType.GET, 'media'); } catch (err: any) { setError(JSON.parse(err.message)?.error || err.message); }
      });

      // Fetch reservations
      const qRes = query(collection(db, 'reservations'), orderBy('createdAt', 'desc'));
      const unsubRes = onSnapshot(qRes, (snap) => {
        setReservations(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      }, (error) => {
        console.error("Reservations snapshot error:", error);
        try { handleFirestoreError(error, OperationType.GET, 'reservations'); } catch (e: any) { setError(JSON.parse(e.message)?.error || e.message); }
      });

      // Fetch articles
      const qArt = query(collection(db, 'articles'), orderBy('createdAt', 'desc'));
      const unsubArt = onSnapshot(qArt, (snap) => {
        setArticles(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      }, (e) => {
        try { handleFirestoreError(e, OperationType.GET, 'articles'); } catch (err: any) { setError(JSON.parse(err.message)?.error || err.message); }
      });

      // Fetch videos
      const qVid = query(collection(db, 'videos'), orderBy('createdAt', 'desc'));
      const unsubVid = onSnapshot(qVid, (snap) => {
        setVideos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      }, (e) => {
        try { handleFirestoreError(e, OperationType.GET, 'videos'); } catch (err: any) { setError(JSON.parse(err.message)?.error || err.message); }
      });

      // Fetch marquee settings
      const unsubMarquee = onSnapshot(doc(db, 'settings', 'marquee'), (snap) => {
        if (snap.exists()) {
          setMarqueeSettings(snap.data() as { speed: number });
        }
      }, (e) => {
        try { handleFirestoreError(e, OperationType.GET, 'settings/marquee'); } catch (err: any) { setError(JSON.parse(err.message)?.error || err.message); }
      });

      // Fetch magazine editorial
      const unsubMagEditorial = onSnapshot(doc(db, 'settings', 'magazineEditorial'), (snap) => {
        if (snap.exists()) {
          setMagazineEditorial(snap.data() as { title: string, author: string, role: string, content: string, image: string });
        }
      }, (e) => {
        try { handleFirestoreError(e, OperationType.GET, 'settings/magazineEditorial'); } catch (err: any) { setError(JSON.parse(err.message)?.error || err.message); }
      });

      // Fetch magazines
      const qMag = query(collection(db, 'magazines'), orderBy('createdAt', 'desc'));
      const unsubMag = onSnapshot(qMag, (snap) => {
        setMagazines(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      }, (e) => {
        try { handleFirestoreError(e, OperationType.GET, 'magazines'); } catch (err: any) { setError(JSON.parse(err.message)?.error || err.message); }
      });

      // Fetch events
      const qEve = query(collection(db, 'events'), orderBy('createdAt', 'desc'));
      const unsubEve = onSnapshot(qEve, (snap) => {
        setEvents(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      }, (e) => {
        try { handleFirestoreError(e, OperationType.GET, 'events'); } catch (err: any) { setError(JSON.parse(err.message)?.error || err.message); }
      });

      return () => {
        unsubMsg();
        unsubUsers();
        unsubAnn();
        unsubMedia();
        unsubRes();
        unsubArt();
        unsubVid();
        unsubMarquee();
        unsubMagEditorial();
        unsubMag();
        unsubEve();
      };
    }
  }, [profile]);

  const handleCommentAction = async (commentId: string, status: 'approved' | 'rejected') => {
    try {
      const commentRef = doc(db, 'comments', commentId);
      await updateDoc(commentRef, { status });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `comments/${commentId}`);
    }
  };

  const handleUpdateUserRole = async (userId: string, newRole: string) => {
    try {
      await updateDoc(doc(db, 'users', userId), { role: newRole });
      showStatus(`${t('dashboard_role')} ${t('update_success')} : ${newRole}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${userId}`);
    }
  };

  const handleEditArticle = (article: any) => {
    setEditingArticle(article);
    setIsArticleModalOpen(true);
  };

  const handleEditVideo = (video: any) => {
    setEditingVideo(video);
    setNewVideoData({
      title: video.title,
      category: video.category,
      duration: video.duration,
      thumbnail: video.thumbnail,
      videoUrl: video.videoUrl,
      description: video.description || ''
    });
    setIsVideoModalOpen(true);
  };

  const handleEditEvent = (event: any) => {
    setEditingEvent(event);
    setNewEventData({
      title: event.title,
      category: event.category || '',
      date: event.date,
      location: event.location,
      price: event.price || '',
      image: event.image,
      attendees: event.attendees || 0,
      description: event.description || ''
    });
    setIsEventModalOpen(true);
  };

  const handleSaveEvent = async () => {
    try {
      if (editingEvent) {
        await updateDoc(doc(db, 'events', editingEvent.id), newEventData);
      } else {
        await addDoc(collection(db, 'events'), { ...newEventData, createdAt: serverTimestamp() });
      }
      showStatus(t('update_success'));
      setIsEventModalOpen(false);
      setEditingEvent(null);
      setNewEventData({ title: '', category: '', date: '', location: '', price: '', image: '', attendees: 0, description: '' });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'events');
    }
  };

  const handleSaveArticle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingArticle) return;
    try {
      const { id, ...data } = editingArticle;
      if (id) {
        await updateDoc(doc(db, 'articles', id), data);
        showStatus(t('update_success'));
      } else {
        await addDoc(collection(db, 'articles'), {
          ...data,
          author: profile?.name || 'Admin',
          createdAt: serverTimestamp(),
          views: 0
        });
        showStatus('Article créé avec succès');
      }
      setIsArticleModalOpen(false);
      setEditingArticle(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `articles/${editingArticle?.id || 'new'}`);
    }
  };

  const handleQuickImageUpload = async (articleId: string, imageUrl: string) => {
    try {
      await updateDoc(doc(db, 'articles', articleId), { image: imageUrl });
      showStatus(t('update_success'));
      setImageUploadArticle(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `articles/${articleId}`);
    }
  };

  const handleSaveVideo = async () => {
    try {
      if (editingVideo) {
        await updateDoc(doc(db, 'videos', editingVideo.id), newVideoData);
        showStatus(t('update_success'));
      } else {
        await addDoc(collection(db, 'videos'), {
          ...newVideoData,
          createdAt: serverTimestamp()
        });
        showStatus(t('save_success'));
      }
      setIsVideoModalOpen(false);
      setEditingVideo(null);
      setNewVideoData({ title: '', category: '', duration: '', thumbnail: '', videoUrl: '', description: '' });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, editingVideo ? `videos/${editingVideo.id}` : 'videos');
    }
  };

  const handleMarkMessageRead = async (messageId: string) => {
    try {
      await updateDoc(doc(db, 'messages', messageId), { status: 'read' });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `messages/${messageId}`);
    }
  };

  const handleUpdateReservationStatus = async (id: string, status: 'confirmed' | 'cancelled') => {
    try {
      await updateDoc(doc(db, 'reservations', id), { status });
      showStatus(`${t('dashboard_reservations')} ${status === 'confirmed' ? t('dashboard_status_confirmed') : t('dashboard_status_cancelled')}.`);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `reservations/${id}`);
    }
  };

  const handleDeleteReservation = async (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: t('dashboard_confirm_delete'),
      message: t('dashboard_confirm_delete_msg'),
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'reservations', id));
          showStatus(t('delete_success'));
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, `reservations/${id}`);
        }
        setConfirmModal(null);
      }
    });
  };

  const handleDeleteMessage = async (messageId: string) => {
    setConfirmModal({
      isOpen: true,
      title: t('dashboard_confirm_delete'),
      message: t('dashboard_confirm_delete_msg'),
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'messages', messageId));
          showStatus(t('delete_success'));
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, `messages/${messageId}`);
        }
        setConfirmModal(null);
      }
    });
  };

  const handleDeleteItem = async (collectionName: string, id: string) => {
    setConfirmModal({
      isOpen: true,
      title: t('dashboard_confirm_delete'),
      message: t('dashboard_confirm_delete_msg'),
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, collectionName, id));
          showStatus(t('delete_success'));
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, `${collectionName}/${id}`);
        }
        setConfirmModal(null);
      }
    });
  };

  const handleBulkDelete = (collectionName: string, ids: string[]) => {
    if (ids.length === 0) return;
    setConfirmModal({
      isOpen: true,
      title: t('dashboard_confirm_delete'),
      message: `Êtes-vous sûr de vouloir supprimer ces ${ids.length} élément(s) ? Cette action est irréversible.`,
      onConfirm: async () => {
        try {
          // Note: using Promise.all for simplicity. Batches could be used for scale
          await Promise.all(ids.map(id => deleteDoc(doc(db, collectionName, id))));
          showStatus(`Suppression de ${ids.length} élément(s) réussie`);
          if (collectionName === 'articles') setSelectedArticles([]);
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, `${collectionName}/bulk`);
        }
        setConfirmModal(null);
      }
    });
  };

  const handleBulkVisibility = async (collectionName: string, ids: string[], isHidden: boolean) => {
    if (ids.length === 0) return;
    try {
      await Promise.all(ids.map(id => updateDoc(doc(db, collectionName, id), { isHidden })));
      showStatus(isHidden ? `${ids.length} élément(s) masqué(s)` : `${ids.length} élément(s) visible(s)`);
      if (collectionName === 'articles') setSelectedArticles([]);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `${collectionName}/bulk`);
    }
  };

  const handleUpdateSection = async () => {
    if (!selectedSection) return;
    try {
      await updateDoc(doc(db, 'custom_sections', selectedSection.id), {
        title: selectedSection.title,
        content: selectedSection.content
      });
      showStatus(t('update_success'));
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `custom_sections/${selectedSection.id}`);
    }
  };

  const allContacts = React.useMemo(() => {
    const contactsMap = new Map();

    // From users
    users.forEach(u => {
      if (u.email) {
        contactsMap.set(u.email, {
          name: u.displayName || t('dashboard_no_name'),
          email: u.email,
          phone: u.phone || '',
          source: t('dashboard_source_user'),
          id: u.id
        });
      }
    });

    // From reservations
    reservations.forEach(r => {
      if (r.userEmail) {
        const existing = contactsMap.get(r.userEmail);
        contactsMap.set(r.userEmail, {
          name: r.userName || existing?.name || t('dashboard_no_name'),
          email: r.userEmail,
          phone: r.userPhone || existing?.phone || '',
          source: existing ? `${existing.source}, ${t('dashboard_source_reservation')}` : t('dashboard_source_reservation'),
          id: r.id
        });
      }
    });

    // From messages
    messages.forEach(m => {
      if (m.email) {
        const existing = contactsMap.get(m.email);
        contactsMap.set(m.email, {
          name: m.name || existing?.name || t('dashboard_no_name'),
          email: m.email,
          phone: m.phone || existing?.phone || '',
          source: existing ? `${existing.source}, Message` : 'Message',
          id: m.id
        });
      }
    });

    return Array.from(contactsMap.values());
  }, [users, reservations, messages]);

  const handleAiProcess = async () => {
    if (aiMode === 'text' && !aiInput.trim()) return;
    if (aiMode === 'file' && filesData.length === 0) return;
    
    setIsProcessing(true);
    setAiResult(null);
    setError(null);
    
    try {
      const configRes = await fetch('/api/config');
      const { geminiApiKey } = await configRes.json();
      if (!geminiApiKey) {
        throw new Error("L'API key Gemini est manquante.");
      }
      const ai = new GoogleGenAI({ apiKey: geminiApiKey });
      
      const prompt = `You are a world-class AI editorial assistant for "Women In Leadership" (WIL), a premium African media platform.
        
        TASK:
        Deeply analyze the provided ${aiMode === 'file' ? 'files (documents, images, or media)' : 'text'} and extract high-quality, ready-to-publish content.
        
        INSTRUCTIONS:
        1. Identify the main themes and key messages from the input.
        2. Extract or generate compelling headlines and summaries.
        3. Identify powerful quotes that embody leadership, empowerment, and inspiration.
        4. Categorize content into: Leadership, Business, Inspiration, Society, Culture.
        5. Ensure the tone is sophisticated, professional, and tailored for an African audience.
        6. All output must be in FRENCH.
        7. CRITICAL: EVERY article MUST have a cover image. Use a relevant placeholder like "https://picsum.photos/seed/keyword/1600/900" where 'keyword' is related to the article.
        8. CRITICAL: EVERY article's 'content' MUST include at least one inline image using Markdown syntax (e.g., \`![description](https://picsum.photos/seed/another_keyword/800/400)\`) to illustrate the text.
        
        OUTPUT FORMAT:
        You MUST return a JSON object following this exact schema:
        {
          "articles": [
            {
              "title": "Titre accrocheur",
              "summary": "Résumé court et percutant",
              "content": "Corps de l'article développé (plusieurs paragraphes). DOIT inclure au moins une image en Markdown: ![alt](url)",
              "category": "Leadership | Business | Inspiration | Society | Culture",
              "readTime": "X min",
              "image": "URL d'image descriptive OBLIGATOIRE (ex: https://picsum.photos/seed/...)"
            }
          ],
          "quotes": [
            {
              "text": "La citation elle-même",
              "author": "Nom de l'auteur"
            }
          ]
        }
        
        If multiple files are provided, synthesize the information across all of them to create a coherent editorial output.`;

      const schema = {
        type: Type.OBJECT,
        properties: {
          articles: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                summary: { type: Type.STRING },
                content: { type: Type.STRING },
                category: { type: Type.STRING },
                readTime: { type: Type.STRING },
                image: { type: Type.STRING }
              },
              required: ["title", "summary", "content", "category", "image"]
            }
          },
          quotes: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                text: { type: Type.STRING },
                author: { type: Type.STRING }
              },
              required: ["text", "author"]
            }
          }
        },
        required: ["articles", "quotes"]
      };

      let response;
      if (aiMode === 'file' && filesData.length > 0) {
        const parts = [
          { text: prompt },
          ...filesData.map(f => {
            if (f.base64) {
              return { inlineData: { data: f.base64, mimeType: f.mimeType } };
            } else {
              return { text: `CONTENU DU FICHIER "${f.name}":\n${f.text}` };
            }
          })
        ];

        response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: {
            parts: parts
          },
          config: {
            responseMimeType: "application/json",
            responseSchema: schema,
            temperature: 0.2,
          }
        });
      } else {
        response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: `${prompt}\n\nINPUT:\n${aiInput}`,
          config: {
            responseMimeType: "application/json",
            responseSchema: schema,
            temperature: 0.3,
          }
        });
      }

      if (!response.text) {
        throw new Error(t('dashboard_ai_no_content'));
      }

      const result = JSON.parse(response.text);
      
      if (!result.articles?.length && !result.quotes?.length) {
        throw new Error(t('dashboard_ai_no_relevant_content'));
      }

      setAiResult(result);
      showStatus(t('dashboard_ai_process_success'));
    } catch (err: any) {
      console.error("AI Processing Error:", err);
      setError(err.message || t('dashboard_ai_process_error'));
      showStatus(err.message || t('dashboard_ai_error'), "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAutoTranslateAll = async () => {
    setIsTranslating(true);
    setSeedStatus('Traduction en cours...');
    try {
      const configRes = await fetch('/api/config');
      const { geminiApiKey } = await configRes.json();
      if (!geminiApiKey) {
        throw new Error("L'API key Gemini est manquante.");
      }
      const ai = new GoogleGenAI({ apiKey: geminiApiKey });
      
      const translateField = async (text: string) => {
        if (!text) return '';
        const res = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: `Translate the following French text into high-quality professional English. Retain any markdown formatting. DO NOT add any extra conversational text or quotes around the output, just provide the translation:\n\n${text}`
        });
        return res.text || text;
      };

      // Articles
      const articlesSnap = await getDocs(collection(db, 'articles'));
      for (const docSnap of articlesSnap.docs) {
        const data = docSnap.data();
        if (!data.title_en || !data.content_en) {
          try {
            setSeedStatus(`Traduction: ${data.title}...`);
            const title_en = await translateField(data.title || '');
            const excerpt_en = await translateField(data.excerpt || data.summary || '');
            const content_en = await translateField(data.content || '');
            const category_en = await translateField(data.category || '');
            await updateDoc(doc(db, 'articles', docSnap.id), { title_en, excerpt_en, content_en, category_en });
          } catch(e) {
             console.error("Translation failed for", data.title, e);
          }
        }
      }

      // Videos
      const videosSnap = await getDocs(collection(db, 'videos'));
      for (const docSnap of videosSnap.docs) {
        const data = docSnap.data();
        if (!data.title_en || !data.description_en) {
          try {
            setSeedStatus(`Traduction: ${data.title}...`);
            const title_en = await translateField(data.title || '');
            const description_en = await translateField(data.description || '');
            const category_en = await translateField(data.category || '');
            await updateDoc(doc(db, 'videos', docSnap.id), { title_en, description_en, category_en });
          } catch(e) {
            console.error("Translation failed for", data.title, e);
          }
        }
      }

      // Events
      const eventsSnap = await getDocs(collection(db, 'events'));
      for (const docSnap of eventsSnap.docs) {
        const data = docSnap.data();
        if (!data.title_en || !data.description_en) {
          try {
            setSeedStatus(`Traduction: ${data.title}...`);
            const title_en = await translateField(data.title || '');
            const description_en = await translateField(data.description || '');
            const location_en = await translateField(data.location || '');
            const date_en = await translateField(data.date || '');
            await updateDoc(doc(db, 'events', docSnap.id), { title_en, description_en, location_en, date_en });
          } catch(e) {
            console.error("Translation failed for", data.title, e);
          }
        }
      }

      showStatus('Toutes les traductions sont terminées !');
    } catch (err: any) {
      showStatus('Erreur de traduction : ' + err.message, 'error');
    } finally {
      setIsTranslating(false);
      setSeedStatus(null);
    }
  };

  const handleUpdateAiItem = () => {
    if (!editingItem || !aiResult) return;
    
    const newResult = { ...aiResult };
    if (editingItem.type === 'article') {
      newResult.articles[editingItem.index] = editingItem.data;
    } else if (editingItem.type === 'quote') {
      newResult.quotes[editingItem.index] = editingItem.data;
    }
    
    setAiResult(newResult);
    setEditingItem(null);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement> | React.DragEvent) => {
    let files: FileList | null = null;
    
    if ('dataTransfer' in e && e.dataTransfer && e.dataTransfer.files) {
      files = e.dataTransfer.files;
    } else if ('target' in e && 'files' in e.target && e.target.files) {
      files = e.target.files;
    }

    if (!files || files.length === 0) return;
    
    const filesToProcess = Array.from(files);
    const newFiles: { base64?: string, text?: string, name: string, mimeType: string }[] = [];
    let processedCount = 0;

    const finalize = () => {
      processedCount++;
      if (processedCount === filesToProcess.length) {
        if (newFiles.length > 0) {
          setFilesData(prev => [...prev, ...newFiles]);
          showStatus(t('dashboard_files_added', { count: newFiles.length }));
        }
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };

    filesToProcess.forEach(file => {
      if (file.size > 20 * 1024 * 1024) {
        showStatus(t('dashboard_file_too_heavy', { name: file.name }), "error");
        finalize();
        return;
      }

      const reader = new FileReader();
      
      reader.onerror = () => {
        console.error(`Error reading file ${file.name}`);
        showStatus(t('dashboard_file_read_error', { name: file.name }), "error");
        finalize();
      };

      const fileName = file.name.toLowerCase();

      if (fileName.endsWith('.docx')) {
        reader.onload = async (event) => {
          try {
            const arrayBuffer = event.target?.result as ArrayBuffer;
            const result = await mammoth.extractRawText({ arrayBuffer });
            newFiles.push({ 
              text: result.value, 
              name: file.name, 
              mimeType: 'text/plain' 
            });
          } catch (err) {
            console.error("Error reading Word file:", err);
            showStatus(t('dashboard_file_error', { name: file.name }), "error");
          } finally {
            finalize();
          }
        };
        reader.readAsArrayBuffer(file);
      } 
      else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
        reader.onload = (event) => {
          try {
            const data = new Uint8Array(event.target?.result as ArrayBuffer);
            const workbook = XLSX.read(data, { type: 'array' });
            let fullText = "";
            workbook.SheetNames.forEach(sheetName => {
              const worksheet = workbook.Sheets[sheetName];
              const csv = XLSX.utils.sheet_to_csv(worksheet);
              fullText += `--- Sheet: ${sheetName} ---\n${csv}\n\n`;
            });
            newFiles.push({ 
              text: fullText, 
              name: file.name, 
              mimeType: 'text/plain' 
            });
          } catch (err) {
            console.error("Error reading Excel file:", err);
            showStatus(t('dashboard_file_error', { name: file.name }), "error");
          } finally {
            finalize();
          }
        };
        reader.readAsArrayBuffer(file);
      }
      else if (file.type === 'text/plain' || file.type === 'text/csv' || fileName.endsWith('.csv')) {
        reader.onload = (event) => {
          newFiles.push({ 
            text: event.target?.result as string, 
            name: file.name, 
            mimeType: 'text/plain' 
          });
          finalize();
        };
        reader.readAsText(file);
      }
      else if (file.type.startsWith('image/') || file.type === 'application/pdf' || fileName.endsWith('.pdf')) {
        reader.onload = () => {
          const result = reader.result as string;
          if (result && result.includes(',')) {
            const base64 = result.split(',')[1];
            newFiles.push({ 
              base64, 
              name: file.name, 
              mimeType: file.type 
            });
          }
          finalize();
        };
        reader.readAsDataURL(file);
      }
      else {
        reader.onload = (event) => {
          newFiles.push({ 
            text: event.target?.result as string, 
            name: file.name, 
            mimeType: 'text/plain' 
          });
          finalize();
        };
        reader.readAsText(file);
      }
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    handleFileUpload(e);
  };

  const handleInjectAiData = async (type: string, data: any) => {
    if (!profile || (profile.role !== 'admin' && profile.role !== 'super-admin')) {
      setSeedStatus(t('dashboard_unauthorized_domain'));
      return;
    }
    
    setSeeding(true);
    setSeedStatus(t('dashboard_ai_processing'));
    try {
      if (type === 'article') {
        await addDoc(collection(db, 'articles'), {
          ...data,
          excerpt: data.summary || data.excerpt || "",
          image: data.image || `https://picsum.photos/seed/${encodeURIComponent(data.title || 'article')}/800/600`,
          author: "WIL Editorial AI",
          date: new Date().toLocaleDateString(t('date_locale') || 'fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }),
          createdAt: serverTimestamp()
        });
      } else if (type === 'section') {
        await addDoc(collection(db, 'custom_sections'), {
          ...data,
          page_slug: 'accueil',
          order_index: 100,
          is_active: true,
          createdAt: serverTimestamp()
        });
      } else if (type === 'quote') {
        const quoteText = data.text && data.author ? `"${data.text}" — ${data.author}` : (data.text || data.content?.text);
        await addDoc(collection(db, 'announcements'), {
          text: quoteText,
          isActive: true,
          createdAt: serverTimestamp()
        });
      }
      
      setSeedStatus(t('dashboard_seed_success'));
      showStatus(t('dashboard_ai_inject'));
    } catch (err: any) {
      console.error("Injection Error:", err);
      setSeedStatus(t('dashboard_seed_error'));
      showStatus(t('dashboard_inject_error', { error: err.message }), "error");
    } finally {
      setSeeding(false);
      setTimeout(() => setSeedStatus(null), 3000);
    }
  };

  const handleInjectAllAiData = async () => {
    if (!aiResult) return;
    
    if (!profile || (profile.role !== 'admin' && profile.role !== 'super-admin')) {
      setSeedStatus(t('dashboard_unauthorized_domain'));
      return;
    }
    
    setSeeding(true);
    setSeedStatus(t('dashboard_ai_processing'));
    try {
      let count = 0;
      if (aiResult.articles && aiResult.articles.length > 0) {
        for (const article of aiResult.articles) {
          await addDoc(collection(db, 'articles'), {
            ...article,
            excerpt: article.summary || article.excerpt || "",
            image: article.image || `https://picsum.photos/seed/${encodeURIComponent(article.title || 'article')}/800/600`,
            author: "WIL Editorial AI",
            date: new Date().toLocaleDateString(t('date_locale') || 'fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }),
            createdAt: serverTimestamp()
          });
          count++;
        }
      }
      
      if (aiResult.quotes && aiResult.quotes.length > 0) {
        for (const quote of aiResult.quotes) {
          const quoteText = quote.text && quote.author ? `"${quote.text}" — ${quote.author}` : (quote.text || quote.content?.text);
          await addDoc(collection(db, 'announcements'), {
            text: quoteText,
            isActive: true,
            createdAt: serverTimestamp()
          });
          count++;
        }
      }
      
      setSeedStatus(t('dashboard_seed_success'));
      showStatus(t('dashboard_items_injected_success', { count }));
    } catch (err: any) {
      console.error("Injection All Error:", err);
      setSeedStatus(t('dashboard_seed_error'));
      showStatus(t('dashboard_inject_multiple_error', { error: err.message }), "error");
    } finally {
      setSeeding(false);
      setTimeout(() => setSeedStatus(null), 3000);
    }
  };

  const handleSeedData = async (forceReset = false) => {
    console.log("handleSeedData called", { forceReset, profileRole: profile?.role });
    if (!profile || profile.role !== 'admin') {
      setSeedStatus(t('dashboard_unauthorized_domain'));
      return;
    }
    
    setSeeding(true);
    setSeedStatus(t('dashboard_loading'));
    try {
      if (forceReset) {
        setSeedStatus(t('dashboard_clear_all'));
        const collectionsToClear = ['articles', 'videos', 'magazines', 'events', 'custom_sections'];
        for (const collName of collectionsToClear) {
          const snap = await getDocs(collection(db, collName));
          for (const docSnap of snap.docs) {
            await deleteDoc(doc(db, collName, docSnap.id));
          }
        }
      } else {
        // Check if already seeded
        const articlesSnap = await getDocs(query(collection(db, 'articles'), limit(1)));
        if (!articlesSnap.empty) {
          setSeedStatus(t('dashboard_all_up_to_date'));
          setSeeding(false);
          return;
        }
      }

      setSeedStatus(t('dashboard_seeding_articles'));
      // Seed Articles
      for (const article of ARTICLES) {
        await addDoc(collection(db, 'articles'), { 
          ...article, 
          createdAt: serverTimestamp() 
        });
      }
      
      setSeedStatus(t('dashboard_seeding_videos'));
      // Seed Videos
      for (const video of VIDEOS) {
        await addDoc(collection(db, 'videos'), { 
          ...video, 
          createdAt: serverTimestamp() 
        });
      }
      
      setSeedStatus(t('dashboard_seeding_magazines'));
      // Seed Magazines
      for (const mag of MAGAZINES) {
        await addDoc(collection(db, 'magazines'), { 
          ...mag, 
          createdAt: serverTimestamp() 
        });
      }
      
      setSeedStatus(t('dashboard_seeding_events'));
      // Seed Events
      for (const event of EVENTS) {
        await addDoc(collection(db, 'events'), { 
          ...event, 
          createdAt: serverTimestamp() 
        });
      }

      setSeedStatus(t('dashboard_seeding_custom_sections'));
      // Seed Custom Sections for "Sous Rubriques"
      const subRubriquesSection = {
        page_slug: 'accueil',
        section_type: 'cartes',
        title: 'Nos Sous-Rubriques',
        content: {
          items: [
            {
              title: 'Mindset & Succès',
              description: 'Développez la psychologie des gagnants.',
              image: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&q=80&w=800',
              link: '/articles?category=Mindset%20%26%20Succès'
            },
            {
              title: 'Foi & Leadership',
              description: 'Diriger avec des valeurs et une vision transcendante.',
              image: 'https://images.unsplash.com/photo-1490730141103-6cac27aaab94?auto=format&fit=crop&q=80&w=800',
              link: '/articles?category=Foi%20%26%20Leadership'
            },
            {
              title: 'Success Stories',
              description: 'Les récits inspirants des leaders du continent.',
              image: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=800',
              link: '/articles?category=Leadership'
            },
            {
              title: 'Transformation',
              description: 'Le voyage intérieur vers l\'excellence.',
              image: 'https://images.unsplash.com/photo-1573164713988-8665fc963095?auto=format&fit=crop&q=80&w=800',
              link: '/articles?category=Transformation%20Personnelle'
            }
          ]
        },
        order_index: 25,
        is_active: true,
        createdAt: serverTimestamp()
      };
      await addDoc(collection(db, 'custom_sections'), subRubriquesSection);

      // Seed Citation Section
      const citationSection = {
        page_slug: 'accueil',
        section_type: 'citation',
        title: 'Citation Inspirante du Jour',
        content: {
          text: "Le véritable leadership consiste à ouvrir des portes là où d'autres ne voient que des murs. C'est un horizon de justice.",
          author: "Lucie S. MATSOUAKA",
          image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=1200"
        },
        order_index: 15,
        is_active: true,
        createdAt: serverTimestamp()
      };
      await addDoc(collection(db, 'custom_sections'), citationSection);

      // Seed Leadership Section
      const leadershipSection = {
        page_slug: 'accueil',
        section_type: 'leadership',
        title: 'Leçons de Leadership',
        content: {
          items: [
            {
              title: "L'intégrité avant tout",
              description: "Pourquoi les valeurs sont le socle de toute réussite durable.",
              icon: "ShieldCheck"
            },
            {
              title: "La vision stratégique",
              description: "Anticiper les changements pour rester en tête.",
              icon: "Search"
            },
            {
              title: "Le mentorat",
              description: "Transmettre pour pérenniser l'excellence.",
              icon: "User"
            }
          ]
        },
        order_index: 35,
        is_active: true,
        createdAt: serverTimestamp()
      };
      await addDoc(collection(db, 'custom_sections'), leadershipSection);

      // Seed Gallery Section
      const gallerySection = {
        page_slug: 'accueil',
        section_type: 'galerie',
        title: 'Instants Women Impact',
        content: {
          items: [
            'https://images.unsplash.com/photo-1573164713988-8665fc963095?auto=format&fit=crop&q=80&w=800',
            'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=800',
            'https://images.unsplash.com/photo-1589156280159-27698a70f29e?auto=format&fit=crop&q=80&w=800',
            'https://images.unsplash.com/photo-1544027993-37dbfe43562a?auto=format&fit=crop&q=80&w=800',
            'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&q=80&w=800',
            'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&q=80&w=1200'
          ]
        },
        order_index: 55,
        is_active: true,
        createdAt: serverTimestamp()
      };
      await addDoc(collection(db, 'custom_sections'), gallerySection);

      // NEW SECTIONS FROM USER REQUEST
      setSeedStatus(t('dashboard_seeding_premium_sections'));
      
      const premiumSections = [
        {
          page_slug: 'accueil',
          section_type: 'quote',
          title: 'Citation Inspirante',
          content: {
            text: "Confie-toi à Dieu, pas aux hommes, car leurs paroles sont souvent vaines, leurs promesses des fantômes.",
            author: "Women Impact",
            background: "luxury-dark-gradient"
          },
          order_index: 5,
          is_active: true,
          createdAt: serverTimestamp()
        },
        {
          page_slug: 'accueil',
          section_type: 'story',
          title: 'Derrière le succès',
          content: {
            headline: "Ce que personne ne voit derrière la réussite",
            text: "Lorsque tu réussiras, personne ne se souviendra que tu as souffert. Le chemin est souvent invisible, mais essentiel.",
            highlight_person: "Bovane",
            category: "Success Stories",
            image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=1200"
          },
          order_index: 6,
          is_active: true,
          createdAt: serverTimestamp()
        },
        {
          page_slug: 'accueil',
          section_type: 'mindset',
          title: 'Mentalité & Abondance',
          content: {
            headline: "Le manque est-il réel ou construit ?",
            text: "Le sentiment de manque vient souvent de notre éducation et de notre perception. L’abondance commence à l’intérieur.",
            points: [
              "La comparaison amplifie le manque",
              "L’abondance ne dépend pas des autres",
              "Le mindset conditionne la réussite"
            ]
          },
          order_index: 7,
          is_active: true,
          createdAt: serverTimestamp()
        },
        {
          page_slug: 'accueil',
          section_type: 'featured_video',
          title: 'Interview Exclusive',
          content: {
            label: "EXCLUSIF",
            description: "Découvrez les parcours inspirants de leaders africains qui transforment le continent par leur vision et leur foi.",
            style: "cinematic",
            thumbnail: "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&q=80&w=1200"
          },
          order_index: 2,
          is_active: true,
          createdAt: serverTimestamp()
        }
      ];

      for (const section of premiumSections) {
        await addDoc(collection(db, 'custom_sections'), section);
      }

      setSeedStatus(t('dashboard_seeding_announcements'));
      const defaultAnnouncements = [
        {
          text: "Women Impact Summit 2026 : Le 24 Avril à l'Hôtel Djeuga Palace de Yaoundé. Cérémonie de lancement de WIL magazine.",
          isActive: true,
          createdAt: serverTimestamp()
        },
        {
          text: "Bienvenue sur Women Impact TV • Le prochain magazine papier sera disponible le 15 mai • Suivez-nous sur nos réseaux sociaux pour ne rien manquer.",
          isActive: true,
          createdAt: serverTimestamp()
        }
      ];
      for (const ann of defaultAnnouncements) {
        await addDoc(collection(db, 'announcements'), ann);
      }

      setSeedStatus(t('dashboard_seed_success'));
    } catch (err) {
      console.error("Error seeding data:", err);
      setSeedStatus(t('dashboard_seed_error'));
    } finally {
      setSeeding(false);
      setTimeout(() => setSeedStatus(null), 5000);
    }
  };

  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    if (sessionId && user && profile && profile.subscriptionStatus !== 'premium') {
      const userRef = doc(db, 'users', user.uid);
      updateDoc(userRef, {
        subscriptionStatus: 'premium',
        updatedAt: serverTimestamp()
      }).then(() => {
        showStatus(t('dashboard_premium_activated'));
        // Remove session_id from URL
        navigate('/dashboard', { replace: true });
      }).catch(err => {
        console.error('Error updating subscription:', err);
        showStatus(t('dashboard_premium_activation_error'), "error");
      });
    }
  }, [searchParams, user, profile]);

  const handleLogin = async () => {
    setError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      console.error('Login error:', err);
      if (err.code === 'auth/unauthorized-domain') {
        setError(t('dashboard_unauthorized_domain'));
      } else if (err.code === 'auth/popup-blocked') {
        setError(t('dashboard_popup_blocked'));
      } else {
        setError(t('dashboard_login_error') + (err.message || t('dashboard_unknown_error')));
      }
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, authEmail, authPassword);
    } catch (err: any) {
      console.error('Email login error:', err);
      setError(err.message || t('dashboard_login_error'));
    }
  };

  const handleEmailRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!authName.trim()) {
      setError("Le nom est requis.");
      return;
    }
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, authEmail, authPassword);
      if (userCredential.user) {
        await updateProfile(userCredential.user, {
          displayName: authName
        });
        
        // Ensure to save the user to database directly here to avoid race condition 
        // with the AuthContext since it might create it without displayName 
        // before updateProfile finishes
      }
    } catch (err: any) {
      console.error('Email register error:', err);
      setError(err.message || t('dashboard_unknown_error'));
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleAnnounceAction = async (id: string, action: 'toggle' | 'delete' | 'edit') => {
    try {
      if (action === 'toggle') {
        const ann = announcements.find(a => a.id === id);
        await updateDoc(doc(db, 'announcements', id), { isActive: !ann.isActive });
      } else if (action === 'delete') {
        await deleteDoc(doc(db, 'announcements', id));
      } else if (action === 'edit') {
        const ann = announcements.find(a => a.id === id);
        setEditingAnnouncement({ id: ann.id, text: ann.text });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `announcements/${id}`);
    }
  };

  const handleUpdateAnnouncement = async () => {
    if (!editingAnnouncement) return;
    try {
      await updateDoc(doc(db, 'announcements', editingAnnouncement.id), {
        text: editingAnnouncement.text
      });
      setEditingAnnouncement(null);
      showStatus(t('dashboard_announcement_updated'));
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `announcements/${editingAnnouncement.id}`);
    }
  };

  const toggleFavorite = async (itemId: string) => {
    if (!user) return;
    const isFavorite = profile?.favorites?.includes(itemId);
    const userRef = doc(db, 'users', user.uid);

    try {
      if (isFavorite) {
        await updateDoc(userRef, {
          favorites: arrayRemove(itemId)
        });
        toast.success(t('dashboard_removed_from_favorites'));
      } else {
        await updateDoc(userRef, {
          favorites: arrayUnion(itemId)
        });
        toast.success(t('dashboard_added_to_favorites'));
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
    }
  };

  const handleUpdateMarqueeSpeed = async (speed: number) => {
    try {
      const settingsRef = doc(db, 'settings', 'marquee');
      await setDoc(settingsRef, { speed }, { merge: true });
      showStatus(t('dashboard_marquee_speed_updated', { speed }));
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'settings/marquee');
    }
  };

  const handleDeleteMedia = async (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: t('dashboard_delete_media'),
      message: t('dashboard_delete_media_confirm'),
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'media', id));
          showStatus(t('dashboard_media_deleted'));
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, `media/${id}`);
        }
        setConfirmModal(null);
      }
    });
  };

  const copyMediaUrl = (data: string) => {
    navigator.clipboard.writeText(data);
    showStatus(t('dashboard_link_copied'));
  };

  const handleAddAnnouncement = async () => {
    if (!newAnnouncement.trim()) return;
    try {
      await addDoc(collection(db, 'announcements'), {
        text: newAnnouncement,
        isActive: true,
        createdAt: serverTimestamp()
      });
      setNewAnnouncement('');
      setIsAddingAnnouncement(false);
      showStatus(t('dashboard_announcement_added'));
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'announcements');
    }
  };

  if (!user) {
    return (
      <div className="pt-32 pb-20 container-custom min-h-[100dvh] flex flex-col items-center justify-center text-center">
        <div className="max-w-md w-full bg-gray-50 p-12 border border-gray-100 shadow-sm relative">
          <h1 className="text-4xl font-serif mb-6">{t('dashboard_my_space')}</h1>
          <p className="text-gray-600 mb-10 text-sm leading-relaxed">{t('dashboard_login_desc')}</p>
          
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 text-xs text-center">
              {error}
            </div>
          )}

          {authMode === 'choose' && (
            <div className="space-y-4">
              <button 
                onClick={() => setAuthMode('login')}
                className="btn-premium w-full flex items-center justify-center gap-3"
              >
                <Mail size={18} /> {t('dashboard_login_email')}
              </button>
              <button 
                onClick={() => setAuthMode('register')}
                className="w-full bg-white border border-gray-200 text-black-rich px-6 py-3 text-[10px] uppercase tracking-widest font-bold hover:border-gold transition-colors"
              >
                {t('dashboard_register')}
              </button>

              <div className="relative py-4 flex items-center justify-center">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200"></div></div>
                <span className="relative bg-gray-50 px-4 text-[10px] text-gray-400 font-bold uppercase tracking-widest">{t('dashboard_or')}</span>
              </div>

              <button 
                onClick={handleLogin}
                className="w-full bg-white border border-gray-200 text-black-rich px-6 py-3 text-[10px] uppercase tracking-widest font-bold hover:border-gold transition-colors flex items-center justify-center gap-3"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                {t('dashboard_login_google')}
              </button>
            </div>
          )}

          {authMode === 'login' && (
            <form onSubmit={handleEmailLogin} className="space-y-4 text-left">
              <button type="button" onClick={() => setAuthMode('choose')} className="absolute top-4 left-4 p-2 text-gray-400 hover:text-gold"><ArrowLeft size={16} /></button>
              <div>
                <label className="block text-[10px] uppercase tracking-widest font-bold text-gray-500 mb-2">Email</label>
                <input 
                  type="email" 
                  required
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  className="w-full p-3 border border-gray-200 text-sm focus:border-gold focus:ring-1 focus:ring-gold outline-none"
                  placeholder="votre@email.com"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-widest font-bold text-gray-500 mb-2">{t('dashboard_password')}</label>
                <input 
                  type="password" 
                  required
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  className="w-full p-3 border border-gray-200 text-sm focus:border-gold focus:ring-1 focus:ring-gold outline-none"
                  placeholder="••••••••"
                />
              </div>
              <button type="submit" className="btn-premium w-full mt-4">{t('login', 'Login')}</button>
              <div className="text-[10px] text-center mt-4 text-gray-500">
                {t('dashboard_no_account_yet')} <button type="button" onClick={() => setAuthMode('register')} className="text-gold font-bold hover:underline">{t('dashboard_register')}</button>
              </div>
            </form>
          )}

          {authMode === 'register' && (
            <form onSubmit={handleEmailRegister} className="space-y-4 text-left">
              <button type="button" onClick={() => setAuthMode('choose')} className="absolute top-4 left-4 p-2 text-gray-400 hover:text-gold"><ArrowLeft size={16} /></button>
              <div>
                <label className="block text-[10px] uppercase tracking-widest font-bold text-gray-500 mb-2">{t('dashboard_full_name')}</label>
                <input 
                  type="text" 
                  required
                  value={authName}
                  onChange={(e) => setAuthName(e.target.value)}
                  className="w-full p-3 border border-gray-200 text-sm focus:border-gold focus:ring-1 focus:ring-gold outline-none"
                  placeholder="Votre Nom"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-widest font-bold text-gray-500 mb-2">Email</label>
                <input 
                  type="email" 
                  required
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  className="w-full p-3 border border-gray-200 text-sm focus:border-gold focus:ring-1 focus:ring-gold outline-none"
                  placeholder="votre@email.com"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-widest font-bold text-gray-500 mb-2">{t('dashboard_password')}</label>
                <input 
                  type="password" 
                  required
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  className="w-full p-3 border border-gray-200 text-sm focus:border-gold focus:ring-1 focus:ring-gold outline-none"
                  placeholder="••••••••"
                  minLength={6}
                />
              </div>
              <button type="submit" className="btn-premium w-full mt-4">{t('dashboard_create_account')}</button>
              <div className="text-[10px] text-center mt-4 text-gray-500">
                {t('dashboard_already_have_account')} <button type="button" onClick={() => setAuthMode('login')} className="text-gold font-bold hover:underline">{t('login', 'Login')}</button>
              </div>
            </form>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="pt-32 pb-20 container-custom min-h-[100dvh]">
      <div className="editorial-grid">
        {/* Sidebar */}
        <div className="md:col-span-3">
          <div className="bg-gray-50 p-8 space-y-8 sticky top-32">
            <button 
              onClick={() => navigate('/')}
              className="w-full flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold text-gray-400 hover:text-gold transition-colors mb-4"
            >
              <ArrowLeft size={14} /> {t('back_to_home')}
            </button>
            <div className="text-center">
              <div className="w-24 h-24 bg-burgundy rounded-full mx-auto mb-6 overflow-hidden border-4 border-white shadow-md">
                {profile?.photoURL ? (
                  <img src={profile.photoURL} alt={profile.displayName} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white text-3xl font-serif">
                    {profile?.displayName?.charAt(0) || 'U'}
                  </div>
                )}
              </div>
              <h3 className="font-serif text-2xl mb-1">{profile?.displayName}</h3>
              <div className="flex items-center justify-center gap-2 text-[10px] text-gold uppercase tracking-[0.2em] font-bold">
                {profile?.subscriptionStatus === 'premium' ? (
                  <>
                    <ShieldCheck size={12} />
                    <span>{t('dashboard_premium_member')}</span>
                  </>
                ) : (
                  <span>{t('dashboard_free_account')}</span>
                )}
              </div>
            </div>

            <nav className="flex flex-col space-y-2 text-xs uppercase tracking-widest font-bold pt-8 border-t border-gray-200">
              <button 
                onClick={() => setActiveTab('profile')}
                className={cn(
                  "flex items-center gap-3 p-3 transition-all",
                  activeTab === 'profile' ? "bg-white shadow-sm text-burgundy" : "hover:bg-white"
                )}
              >
                <User size={16} /> {t('dashboard_profile')}
              </button>
              <button 
                onClick={() => setActiveTab('favorites')}
                className={cn(
                  "flex items-center gap-3 p-3 transition-all",
                  activeTab === 'favorites' ? "bg-white shadow-sm text-burgundy" : "hover:bg-white"
                )}
              >
                <Bookmark size={16} /> {t('dashboard_favorites')}
              </button>
              <button 
                onClick={() => setActiveTab('subscription')}
                className={cn(
                  "flex items-center gap-3 p-3 transition-all",
                  activeTab === 'subscription' ? "bg-white shadow-sm text-burgundy" : "hover:bg-white"
                )}
              >
                <CreditCard size={16} /> {t('dashboard_subscription')}
              </button>

              {(profile?.role === 'admin' || profile?.role === 'editor' || profile?.role === 'super-admin') && (
                <>
                  <div className="pt-4 mt-4 border-t border-gray-200">
                    <span className="text-[10px] text-gray-400 mb-2 block">{t('dashboard_administration')}</span>
                    <button 
                      onClick={() => setActiveTab('dashboard-stats')}
                      className={cn(
                        "w-full flex items-center gap-3 p-3 transition-all",
                        activeTab === 'dashboard-stats' ? "bg-white shadow-sm text-burgundy" : "hover:bg-white"
                      )}
                    >
                      <Layout size={16} /> {t('dashboard_stats')}
                    </button>
                    <button 
                      onClick={() => setActiveTab('ai-editorial')}
                      className={cn(
                        "w-full flex items-center gap-3 p-3 transition-all",
                        activeTab === 'ai-editorial' ? "bg-gold text-black-rich" : "hover:bg-white"
                      )}
                    >
                      <Sparkles size={16} /> {t('dashboard_ai_editorial')}
                    </button>
                    <button 
                      onClick={() => setActiveTab('page-builder')}
                      className={cn(
                        "w-full flex items-center gap-3 p-3 transition-all",
                        activeTab === 'page-builder' ? "bg-white shadow-sm text-burgundy" : "hover:bg-white"
                      )}
                    >
                      <Database size={16} /> {t('dashboard_page_builder')}
                    </button>
                    <button 
                      onClick={() => setActiveTab('articles-mgmt')}
                      className={cn(
                        "w-full flex items-center gap-3 p-3 transition-all",
                        activeTab === 'articles-mgmt' ? "bg-white shadow-sm text-burgundy" : "hover:bg-white"
                      )}
                    >
                      <FileText size={16} /> {t('articles')}
                    </button>
                    <button 
                      onClick={() => setActiveTab('tv-mgmt')}
                      className={cn(
                        "w-full flex items-center gap-3 p-3 transition-all",
                        activeTab === 'tv-mgmt' ? "bg-white shadow-sm text-burgundy" : "hover:bg-white"
                      )}
                    >
                      <History size={16} /> {t('tv_videos')}
                    </button>
                    <button 
                      onClick={() => setActiveTab('magazine-mgmt')}
                      className={cn(
                        "w-full flex items-center gap-3 p-3 transition-all",
                        activeTab === 'magazine-mgmt' ? "bg-white shadow-sm text-burgundy" : "hover:bg-white"
                      )}
                    >
                      <Bookmark size={16} /> {t('magazines')}
                    </button>
                    <button 
                      onClick={() => setActiveTab('events-mgmt')}
                      className={cn(
                        "w-full flex items-center gap-3 p-3 transition-all",
                        activeTab === 'events-mgmt' ? "bg-white shadow-sm text-burgundy" : "hover:bg-white"
                      )}
                    >
                      <Calendar size={16} /> {t('events') || 'Évènements'}
                    </button>
                    <button 
                      onClick={() => setActiveTab('galeries-mgmt')}
                      className={cn(
                        "w-full flex items-center gap-3 p-3 transition-all",
                        activeTab === 'galeries-mgmt' ? "bg-white shadow-sm text-burgundy" : "hover:bg-white"
                      )}
                    >
                      <Image size={16} /> {t('galeries') || 'Galeries'}
                    </button>
                    <button 
                      onClick={() => setActiveTab('reservations-mgmt')}
                      className={cn(
                        "w-full flex items-center gap-3 p-3 transition-all",
                        activeTab === 'reservations-mgmt' ? "bg-white shadow-sm text-burgundy" : "hover:bg-white"
                      )}
                    >
                      <Ticket size={16} /> {t('dashboard_reservations')} ({reservations.filter(r => r.status === 'pending').length})
                    </button>
                    <button 
                      onClick={() => setActiveTab('moderation')}
                      className={cn(
                        "w-full flex items-center gap-3 p-3 transition-all",
                        activeTab === 'moderation' ? "bg-white shadow-sm text-burgundy" : "hover:bg-white"
                      )}
                    >
                      <ShieldCheck size={16} /> {t('dashboard_comments')} ({pendingComments.length})
                    </button>
                    {(profile?.role === 'admin' || profile?.role === 'super-admin') && (
                      <>
                        <button 
                          onClick={() => setActiveTab('users-mgmt')}
                          className={cn(
                            "w-full flex items-center gap-3 p-3 transition-all",
                            activeTab === 'users-mgmt' ? "bg-white shadow-sm text-burgundy" : "hover:bg-white"
                          )}
                        >
                          <User size={16} /> {t('dashboard_users')}
                        </button>
                        <button 
                          onClick={() => setActiveTab('contacts-mgmt')}
                          className={cn(
                            "w-full flex items-center gap-3 p-3 transition-all",
                            activeTab === 'contacts-mgmt' ? "bg-white shadow-sm text-burgundy" : "hover:bg-white"
                          )}
                        >
                          <Bookmark size={16} /> {t('dashboard_contacts_directory') || 'Contacts'}
                        </button>
                        <button 
                          onClick={() => setActiveTab('messages-mgmt')}
                          className={cn(
                            "w-full flex items-center gap-3 p-3 transition-all",
                            activeTab === 'messages-mgmt' ? "bg-white shadow-sm text-burgundy" : "hover:bg-white"
                          )}
                        >
                          <Send size={16} /> {t('dashboard_messages')} ({messages.filter(m => m.status === 'new').length})
                        </button>
                        <button 
                          onClick={() => setActiveTab('settings-mgmt')}
                          className={cn(
                            "w-full flex items-center gap-3 p-3 transition-all",
                            activeTab === 'settings-mgmt' ? "bg-white shadow-sm text-burgundy" : "hover:bg-white"
                          )}
                        >
                          <Settings size={16} /> {t('dashboard_settings')}
                        </button>
                        <button 
                          onClick={() => setActiveTab('announcements-mgmt')}
                          className={cn(
                            "w-full flex items-center gap-3 p-3 transition-all",
                            activeTab === 'announcements-mgmt' ? "bg-white shadow-sm text-burgundy" : "hover:bg-white"
                          )}
                        >
                          <AlertCircle size={16} /> {t('dashboard_announcements')}
                        </button>
                        <button 
                          onClick={() => setActiveTab('media-mgmt')}
                          className={cn(
                            "w-full flex items-center gap-3 p-3 transition-all",
                            activeTab === 'media-mgmt' ? "bg-white shadow-sm text-burgundy" : "hover:bg-white"
                          )}
                        >
                          <Image size={16} /> {t('dashboard_media')}
                        </button>
                      </>
                    )}
                  </div>
                  {(profile?.role === 'admin' || profile?.role === 'super-admin') && (
                    <div className="space-y-2 pt-4 border-t border-gray-200 mt-4">
                      <button 
                        onClick={() => handleAutoTranslateAll()}
                        disabled={isTranslating}
                        className="w-full flex items-center gap-3 p-3 text-gold hover:text-burgundy transition-all"
                      >
                        {isTranslating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                        Traduire Automatiquement Tout
                      </button>
                      <button 
                        onClick={() => handleSeedData(false)}
                        disabled={seeding}
                        className="w-full flex items-center gap-3 p-3 text-gold hover:text-burgundy transition-all"
                      >
                        {seeding ? <Loader2 size={16} className="animate-spin" /> : <Database size={16} />}
                        {t('dashboard_seed_data')}
                      </button>
                    </div>
                  )}
                </>
              )}

              <button 
                onClick={handleLogout}
                className="flex items-center gap-3 p-3 text-gray-400 hover:text-red-600 transition-all pt-8"
              >
                <LogOut size={16} /> {t('dashboard_logout')}
              </button>
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <div className={cn(
          "md:col-span-9",
          activeTab === 'page-builder' && "md:col-span-12 grid grid-cols-12 gap-0 -mx-8 -my-12 min-h-[calc(100vh-64px)]"
        )}>
          {activeTab === 'dashboard-stats' ? (
            <div className="space-y-8">
              <h2 className="text-3xl font-serif">{t('dashboard_global_overview')}</h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white p-6 border border-gray-100 shadow-sm">
                  <div className="text-gray-400 text-[10px] uppercase tracking-widest font-bold mb-2">{t('dashboard_users')}</div>
                  <div className="text-3xl font-serif">{users.length}</div>
                </div>
                <div className="bg-white p-6 border border-gray-100 shadow-sm">
                  <div className="text-gray-400 text-[10px] uppercase tracking-widest font-bold mb-2">{t('dashboard_messages')}</div>
                  <div className="text-3xl font-serif">{messages.length}</div>
                </div>
                <div className="bg-white p-6 border border-gray-100 shadow-sm">
                  <div className="text-gray-400 text-[10px] uppercase tracking-widest font-bold mb-2">{t('dashboard_comments')}</div>
                  <div className="text-3xl font-serif">{pendingComments.length}</div>
                </div>
                <div className="bg-white p-6 border border-gray-100 shadow-sm">
                  <div className="text-gray-400 text-[10px] uppercase tracking-widest font-bold mb-2">{t('dashboard_premium_subscribers')}</div>
                  <div className="text-3xl font-serif text-gold">{users.filter(u => u.subscriptionStatus === 'premium').length}</div>
                </div>
              </div>
            </div>
          ) : activeTab === 'settings-mgmt' ? (
            <div className="space-y-8">
              <h2 className="text-3xl font-serif">{t('dashboard_general_settings')}</h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* General Settings */}
                <div className="bg-white p-8 border border-gray-100 shadow-sm space-y-6 self-start">
                  <h3 className="font-serif text-2xl border-b border-gray-100 pb-4">Configuration Générale</h3>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest font-bold">{t('dashboard_platform_name')}</label>
                    <input type="text" defaultValue="Women In Leadership" className="w-full p-3 border border-gray-100 text-sm" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest font-bold">{t('dashboard_whatsapp_contact')}</label>
                    <input type="text" defaultValue="+237 6XX XXX XXX" className="w-full p-3 border border-gray-100 text-sm" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest font-bold">{t('dashboard_support_email')}</label>
                    <input type="email" defaultValue="contact@womenimpact.com" className="w-full p-3 border border-gray-100 text-sm" />
                  </div>
                  <button className="btn-gold px-8 py-3">{t('dashboard_save_settings')}</button>
                </div>

                {/* Magazine Editorial Settings */}
                <div className="bg-white p-8 border border-gray-100 shadow-sm space-y-6">
                  <h3 className="font-serif text-2xl border-b border-gray-100 pb-4">Éditorial du Magazine</h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest font-bold">{t('dashboard_title')}</label>
                      <input 
                        type="text" 
                        value={magazineEditorial.title}
                        onChange={(e) => setMagazineEditorial({...magazineEditorial, title: e.target.value})}
                        className="w-full p-3 border border-gray-100 text-sm focus:border-gold outline-none" 
                        placeholder="Ex: Le mot de la directrice"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase tracking-widest font-bold">{t('dashboard_author')}</label>
                        <input 
                          type="text" 
                          value={magazineEditorial.author}
                          onChange={(e) => setMagazineEditorial({...magazineEditorial, author: e.target.value})}
                          className="w-full p-3 border border-gray-100 text-sm focus:border-gold outline-none" 
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase tracking-widest font-bold">Rôle</label>
                        <input 
                          type="text" 
                          value={magazineEditorial.role}
                          onChange={(e) => setMagazineEditorial({...magazineEditorial, role: e.target.value})}
                          className="w-full p-3 border border-gray-100 text-sm focus:border-gold outline-none" 
                          placeholder="Ex: Directrice de Publication"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest font-bold">Image de l'auteur</label>
                      <ImageUploader 
                        label="Upload Image"
                        currentUrl={magazineEditorial.image}
                        onUploadSuccess={(url) => setMagazineEditorial({...magazineEditorial, image: url})}
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-end">
                        <label className="text-[10px] uppercase tracking-widest font-bold">{t('dashboard_content')}</label>
                      </div>
                      <RichTextEditor 
                        value={magazineEditorial.content}
                        onChange={(val) => setMagazineEditorial({...magazineEditorial, content: val})}
                      />
                    </div>
                    <button 
                      onClick={async () => {
                        try {
                          await setDoc(doc(db, 'settings', 'magazineEditorial'), magazineEditorial);
                          showStatus(t('update_success'));
                        } catch (e) {
                          handleFirestoreError(e, OperationType.WRITE, 'settings/magazineEditorial');
                        }
                      }}
                      className="btn-gold px-8 py-3 w-full"
                    >
                      Enregistrer l'éditorial
                    </button>
                  </div>
                </div>

              </div>
            </div>
          ) : activeTab === 'page-builder' ? (
            <>
              {/* Sidebar for Page Builder (Left) */}
              <div className="col-span-2 bg-gray-900 text-white p-4 border-r border-white/10">
                <h3 className="text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-6">{t('dashboard_elements')}</h3>
                <div className="space-y-2">
                  {['Hero', 'Articles', 'Vidéo', 'Magazine', 'Citation', 'Newsletter'].map(type => (
                    <div key={type} className="p-3 bg-white/5 border border-white/10 text-[10px] uppercase tracking-widest font-bold hover:bg-gold hover:text-black-rich transition-all cursor-move flex items-center gap-2">
                      <Database size={12} /> {type}
                    </div>
                  ))}
                </div>
              </div>

              {/* Canvas (Center) */}
              <div className="col-span-7 bg-gray-100 overflow-y-auto p-8">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex gap-4">
                    <button className="p-2 bg-white shadow-sm rounded border border-gray-200"><Layout size={14} /></button>
                    <button className="p-2 bg-white shadow-sm rounded border border-gray-200"><FileText size={14} /></button>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-[10px] uppercase tracking-widest font-bold text-gray-400">{t('dashboard_edit_mode')}</span>
                    <button 
                      onClick={() => setIsPageBuilderEditing(!isPageBuilderEditing)}
                      className={cn(
                        "w-12 h-6 rounded-full transition-all relative",
                        isPageBuilderEditing ? "bg-gold" : "bg-gray-300"
                      )}
                    >
                      <div className={cn(
                        "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                        isPageBuilderEditing ? "right-1" : "left-1"
                      )} />
                    </button>
                  </div>
                </div>
                <div className="bg-white shadow-2xl min-h-full max-w-4xl mx-auto">
                  <PageBuilder 
                    pageSlug="home" 
                    nativeSections={[]} 
                    onSelectSection={setSelectedSection}
                    externalIsEditing={isPageBuilderEditing}
                  />
                </div>
              </div>

              {/* Settings Panel (Right) */}
              <div className="col-span-3 bg-white border-l border-gray-200 p-6 overflow-y-auto">
                <h3 className="text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-6">{t('dashboard_block_settings')}</h3>
                {selectedSection ? (
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest font-bold">{t('dashboard_title')}</label>
                      <input 
                        type="text" 
                        value={selectedSection.title || ''} 
                        onChange={(e) => setSelectedSection({...selectedSection, title: e.target.value})}
                        className="w-full p-2 border border-gray-200 text-xs"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest font-bold">{t('dashboard_type')}</label>
                      <select className="w-full p-2 border border-gray-200 text-xs bg-white">
                        <option>{selectedSection.section_type}</option>
                      </select>
                    </div>
                    <button className="btn-gold w-full py-3 text-[10px]" onClick={handleUpdateSection}>{t('dashboard_save_changes')}</button>
                  </div>
                ) : (
                  <div className="text-center py-20 text-gray-400 italic text-xs">
                    {t('dashboard_select_block_hint')}
                  </div>
                )}
              </div>
            </>
          ) : activeTab === 'articles-mgmt' ? (
            <div className="space-y-8">
              <div className="flex justify-between items-center">
                <h2 className="text-3xl font-serif">{t('dashboard_articles_mgmt')}</h2>
                <div className="flex gap-2">
                  <button 
                    onClick={() => {
                      if (!editingArticle || editingArticle.id) {
                        setEditingArticle({
                          title: '',
                          category: 'Leadership',
                          readTime: '',
                          summary: '',
                          content: '',
                          image: ''
                        });
                      }
                      setIsArticleModalOpen(true);
                    }}
                    className="bg-white border border-gold text-gold hover:bg-gold/5 px-6 py-2 text-[10px] font-bold uppercase tracking-widest transition-colors"
                  >
                    Nouveau (Manuel)
                  </button>
                  <button 
                    onClick={() => setActiveTab('ai-editorial')}
                    className="btn-gold px-6 py-2 text-[10px]"
                  >
                    Nouveau (AI Éditorial)
                  </button>
                </div>
              </div>
              <div className="flex justify-between items-center bg-gray-50 p-4 border border-gray-100 rounded-t-sm shadow-sm">
                <div className="flex items-center gap-4">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                    {selectedArticles.length} sélectionné(s)
                  </span>
                  {selectedArticles.length > 0 && (
                    <div className="flex items-center gap-2">
                       <button
                        onClick={() => handleBulkDelete('articles', selectedArticles)}
                        className="bg-red-50 text-red-600 hover:bg-red-100 px-4 py-1.5 text-[10px] uppercase tracking-widest font-bold transition-colors flex items-center gap-2 rounded"
                      >
                        <Trash2 size={12} /> Tous Supprimer
                      </button>
                      <button
                        onClick={() => handleBulkVisibility('articles', selectedArticles, true)}
                        className="bg-gray-200 text-gray-700 hover:bg-gray-300 px-4 py-1.5 text-[10px] uppercase tracking-widest font-bold transition-colors flex items-center gap-2 rounded"
                      >
                        Masquer
                      </button>
                      <button
                        onClick={() => handleBulkVisibility('articles', selectedArticles, false)}
                        className="bg-green-50 text-green-700 hover:bg-green-100 px-4 py-1.5 text-[10px] uppercase tracking-widest font-bold transition-colors flex items-center gap-2 rounded"
                      >
                        Afficher
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <div className="bg-white border border-gray-100 shadow-sm overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 border-b border-gray-100 uppercase tracking-widest font-bold text-gray-400">
                    <tr>
                      <th className="p-4 w-12">
                        <input 
                          type="checkbox"
                          className="accent-gold w-4 h-4"
                          checked={selectedArticles.length === articles.length && articles.length > 0}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedArticles(articles.map(a => a.id));
                            } else {
                              setSelectedArticles([]);
                            }
                          }}
                        />
                      </th>
                      <th className="p-4">{t('dashboard_title')}</th>
                      <th className="p-4">Statut</th>
                      <th className="p-4">{t('dashboard_category')}</th>
                      <th className="p-4">{t('dashboard_author')}</th>
                      <th className="p-4">{t('dashboard_actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {articles.map(article => (
                      <tr key={article.id} className={cn("hover:bg-gray-50 transition-colors", article.isHidden ? "opacity-60 bg-gray-50" : "")}>
                        <td className="p-4">
                          <input 
                            type="checkbox"
                            className="accent-gold w-4 h-4"
                            checked={selectedArticles.includes(article.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedArticles([...selectedArticles, article.id]);
                              } else {
                                setSelectedArticles(selectedArticles.filter(id => id !== article.id));
                              }
                            }}
                          />
                        </td>
                        <td className="p-4 font-medium">
                          {article.title}
                          {article.isHidden && <span className="ml-2 text-[10px] bg-gray-200 text-gray-600 px-2 py-0.5 rounded uppercase tracking-widest">Masqué</span>}
                        </td>
                        <td className="p-4">
                            <span className={cn(
                                "text-[10px] uppercase tracking-widest font-bold px-2 py-1 rounded",
                                article.isHidden ? "bg-gray-200 text-gray-600" : "bg-green-100 text-green-700"
                            )}>
                                {article.isHidden ? 'Masqué' : 'Visible'}
                            </span>
                        </td>
                        <td className="p-4">{article.category}</td>
                        <td className="p-4">{article.author}</td>
                        <td className="p-4 flex gap-2">
                          <button 
                            onClick={() => setImageUploadArticle(article)}
                            className="p-2 hover:text-gold transition-colors"
                            title={t('dashboard_upload_image')}
                          >
                            <Image size={14} />
                          </button>
                          <button 
                            onClick={() => handleEditArticle(article)}
                            className="p-2 hover:text-gold transition-colors"
                          >
                            <FileText size={14} />
                          </button>
                          <button 
                            onClick={() => handleDeleteItem('articles', article.id)}
                            className="p-2 hover:text-red-500 transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {articles.length === 0 && (
                      <tr>
                        <td colSpan={4} className="p-8 text-center text-gray-400 italic">{t('dashboard_no_articles')}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {imageUploadArticle && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white w-full max-w-md p-8 relative"
                  >
                    <button onClick={() => setImageUploadArticle(null)} className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full transition-colors">
                      <XCircle size={24} />
                    </button>
                    <h3 className="text-2xl font-serif mb-6">{t('dashboard_upload_image')}</h3>
                    <p className="text-xs text-gray-500 mb-6">{imageUploadArticle.title}</p>
                    <ImageUploader 
                      label={t('dashboard_cover_image')}
                      currentUrl={imageUploadArticle.image}
                      onUploadSuccess={(url) => {
                        if (url) {
                          handleQuickImageUpload(imageUploadArticle.id, url);
                        }
                      }}
                    />
                  </motion.div>
                </div>
              )}

              {isArticleModalOpen && editingArticle && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white w-full max-w-4xl max-h-[90vh] overflow-y-auto"
                  >
                    <div className="p-8 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10">
                      <h3 className="text-2xl font-serif">{editingArticle.id ? t('dashboard_edit_article') : t('dashboard_new_article_manual', 'New Article (Manual)')}</h3>
                      <button onClick={() => setIsArticleModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <XCircle size={24} />
                      </button>
                    </div>
                    
                    <form onSubmit={handleSaveArticle} className="p-8 space-y-6">
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase tracking-widest font-bold text-gray-400">{t('dashboard_title')}</label>
                        <input 
                          type="text" 
                          value={editingArticle.title || ''}
                          onChange={(e) => setEditingArticle(prev => ({...prev, title: e.target.value}))}
                          className="w-full p-4 bg-gray-50 border border-gray-100 focus:outline-none focus:border-gold"
                          required
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] uppercase tracking-widest font-bold text-gray-400">{t('dashboard_category')}</label>
                          <select 
                            value={editingArticle.category || 'Leadership'}
                            onChange={(e) => setEditingArticle(prev => ({...prev, category: e.target.value}))}
                            className="w-full p-4 bg-gray-50 border border-gray-100 focus:outline-none focus:border-gold"
                          >
                            <option value="Leadership">Leadership</option>
                            <option value="Business">Business</option>
                            <option value="Culture">Culture</option>
                            <option value="Society">Society</option>
                            <option value="Inspiration">Inspiration</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] uppercase tracking-widest font-bold text-gray-400">{t('dashboard_read_time')}</label>
                          <input 
                            type="text" 
                            value={editingArticle.readTime || ''}
                            onChange={(e) => setEditingArticle(prev => ({...prev, readTime: e.target.value}))}
                            className="w-full p-4 bg-gray-50 border border-gray-100 focus:outline-none focus:border-gold"
                            placeholder={t('dashboard_read_time_placeholder', "ex: 5 min")}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase tracking-widest font-bold text-gray-400">{t('dashboard_summary')}</label>
                        <textarea 
                          value={editingArticle.summary || ''}
                          onChange={(e) => setEditingArticle(prev => ({...prev, summary: e.target.value}))}
                          className="w-full p-4 bg-gray-50 border border-gray-100 focus:outline-none focus:border-gold h-24"
                        />
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between items-end">
                          <label className="text-[10px] uppercase tracking-widest font-bold text-gray-400">{t('dashboard_content')}</label>
                          <div className="flex items-center gap-4">
                            <span className="text-[10px] text-gray-500">
                              {t('dashboard_media_library_tip')}<code className="bg-gray-100 px-1">![description](lien_image)</code>
                            </span>
                            <button
                                type="button"
                                onClick={() => setIsMediaLibraryOpen(true)}
                                className="text-[10px] uppercase tracking-widest font-bold text-gold hover:text-burgundy transition-colors underline"
                            >
                                {t('dashboard_open_media_library')}
                            </button>
                          </div>
                        </div>
                        <textarea 
                          value={editingArticle.content || ''}
                          onChange={(e) => setEditingArticle(prev => ({...prev, content: e.target.value}))}
                          className="w-full p-4 bg-gray-50 border border-gray-100 focus:outline-none focus:border-gold h-64 font-mono text-sm"
                          required
                        />
                      </div>
                      <ImageUploader 
                        label={t('dashboard_cover_image')}
                        currentUrl={editingArticle.image}
                        onUploadSuccess={(url) => setEditingArticle(prev => ({...prev, image: url}))}
                      />
                      <div className="flex justify-end gap-4 pt-4">
                        <button type="button" onClick={() => setIsArticleModalOpen(false)} className="px-8 py-3 text-[10px] uppercase tracking-widest font-bold text-gray-400 hover:text-black-rich transition-colors">{t('dashboard_cancel')}</button>
                        <button type="submit" className="btn-gold px-12 py-3">{t('dashboard_save')}</button>
                      </div>
                    </form>
                  </motion.div>
                </div>
              )}
            </div>
          ) : activeTab === 'tv-mgmt' ? (
            <div className="space-y-8">
              <div className="flex justify-between items-center">
                <h2 className="text-3xl font-serif">{t('dashboard_tv_mgmt')}</h2>
                <button 
                  onClick={() => {
                    if (editingVideo) {
                      setEditingVideo(null);
                      setNewVideoData({ title: '', category: '', duration: '', thumbnail: '', videoUrl: '', description: '' });
                    }
                    setIsVideoModalOpen(true);
                  }}
                  className="btn-gold px-6 py-2 text-[10px]"
                >
                  {t('dashboard_add_video')}
                </button>
              </div>

              {isVideoModalOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white w-full max-w-4xl max-h-[90vh] overflow-y-auto"
                  >
                    <div className="p-8 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10">
                      <h3 className="text-2xl font-serif">{editingVideo ? t('dashboard_edit_video') : t('dashboard_new_video')}</h3>
                      <button onClick={() => setIsVideoModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <XCircle size={24} />
                      </button>
                    </div>
                    
                    <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-12">
                      <div className="space-y-6">
                        <div className="space-y-2">
                          <label className="text-[10px] uppercase tracking-widest font-bold text-gray-400">{t('dashboard_video_title')}</label>
                          <input 
                            type="text" 
                            value={newVideoData.title}
                            onChange={(e) => setNewVideoData(prev => ({...prev, title: e.target.value}))}
                            className="w-full p-4 bg-gray-50 border border-gray-100 focus:outline-none focus:border-gold"
                            placeholder={t('dashboard_video_title_placeholder')}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-[10px] uppercase tracking-widest font-bold text-gray-400">{t('dashboard_category')}</label>
                            <select 
                              value={newVideoData.category}
                              onChange={(e) => setNewVideoData(prev => ({...prev, category: e.target.value}))}
                              className="w-full p-4 bg-gray-50 border border-gray-100 focus:outline-none focus:border-gold"
                            >
                              <option value="">{t('dashboard_select')}</option>
                              <option value="Leadership">Leadership</option>
                              <option value="Business">Business</option>
                              <option value="Culture">Culture</option>
                              <option value="Society">Society</option>
                            </select>
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] uppercase tracking-widest font-bold text-gray-400">{t('dashboard_duration')}</label>
                            <input 
                              type="text" 
                              value={newVideoData.duration}
                              onChange={(e) => setNewVideoData(prev => ({...prev, duration: e.target.value}))}
                              className="w-full p-4 bg-gray-50 border border-gray-100 focus:outline-none focus:border-gold"
                              placeholder="Ex: 12:45"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] uppercase tracking-widest font-bold text-gray-400">{t('dashboard_description')}</label>
                          <textarea 
                            value={newVideoData.description}
                            onChange={(e) => setNewVideoData(prev => ({...prev, description: e.target.value}))}
                            className="w-full p-4 bg-gray-50 border border-gray-100 focus:outline-none focus:border-gold h-32"
                            placeholder={t('dashboard_video_desc_placeholder')}
                          />
                        </div>
                      </div>

                      <div className="space-y-8">
                        <div className="space-y-4">
                          <h4 className="text-xs font-bold uppercase tracking-widest text-burgundy">{t('dashboard_media_thumbnail')}</h4>
                          
                          <div className="space-y-4">
                            <label className="text-[10px] uppercase tracking-widest font-bold text-gray-400">{t('dashboard_video_url_label')}</label>
                            <div className="flex gap-2">
                              <input 
                                type="text" 
                                value={newVideoData.videoUrl}
                                onChange={(e) => setNewVideoData(prev => ({...prev, videoUrl: e.target.value}))}
                                className="flex-grow p-4 bg-gray-50 border border-gray-100 focus:outline-none focus:border-gold text-xs"
                                placeholder={t('dashboard_video_url_placeholder')}
                              />
                              <button 
                                onClick={() => setActiveTab('media-mgmt')}
                                className="p-4 bg-gray-100 hover:bg-gray-200 transition-colors"
                                title={t('dashboard_open_media_library')}
                              >
                                <Layout size={20} />
                              </button>
                            </div>
                          </div>

                          <ImageUploader 
                            label={t('dashboard_thumbnail')}
                            currentUrl={newVideoData.thumbnail}
                            onUploadSuccess={(url) => setNewVideoData(prev => ({...prev, thumbnail: url}))}
                          />
                        </div>

                        <div className="p-6 bg-burgundy/5 border border-burgundy/10 rounded-xl">
                          <h5 className="text-[10px] font-bold uppercase tracking-widest mb-2">{t('dashboard_media_library_help')}</h5>
                          <p className="text-[10px] text-gray-500 leading-relaxed">
                            {t('dashboard_media_library_help_text')}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="p-8 border-t border-gray-100 flex justify-end gap-4 bg-gray-50">
                      <button onClick={() => setIsVideoModalOpen(false)} className="px-8 py-3 text-[10px] uppercase tracking-widest font-bold text-gray-400 hover:text-black-rich transition-colors">{t('dashboard_cancel')}</button>
                      <button onClick={handleSaveVideo} className="btn-gold px-12 py-3">{editingVideo ? t('dashboard_update') : t('dashboard_publish_video')}</button>
                    </div>
                  </motion.div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {videos.map(video => (
                  <div key={video.id} className="bg-white border border-gray-100 p-4 shadow-sm group">
                    <div className="aspect-video bg-gray-100 mb-4 relative overflow-hidden">
                      <img src={video.thumbnail} className="w-full h-full object-cover" alt={video.title} referrerPolicy="no-referrer" />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-all">
                        <Play className="text-white" size={32} />
                      </div>
                    </div>
                    <h3 className="font-bold text-sm mb-2 truncate">{video.title}</h3>
                    <div className="flex justify-between items-center text-[10px] text-gray-400">
                      <span>{video.duration}</span>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleEditVideo(video)}
                          className="hover:text-gold"
                        >
                          {t('dashboard_edit')}
                        </button>
                        <button 
                          onClick={() => handleDeleteItem('videos', video.id)}
                          className="hover:text-red-500"
                        >
                          {t('dashboard_delete')}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {videos.length === 0 && (
                  <div className="col-span-3 py-20 text-center text-gray-400 italic">{t('dashboard_no_videos')}</div>
                )}
              </div>
            </div>
          ) : activeTab === 'contacts-mgmt' ? (
            <div className="space-y-8">
              <h2 className="text-3xl font-serif">{t('dashboard_contacts_directory')}</h2>
              <div className="bg-white border border-gray-100 shadow-sm overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 border-b border-gray-100 uppercase tracking-widest font-bold text-gray-400">
                    <tr>
                      <th className="p-4">{t('dashboard_contact')}</th>
                      <th className="p-4">{t('dashboard_sources')}</th>
                      <th className="p-4">{t('dashboard_actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {allContacts.map((contact, idx) => (
                      <tr key={idx} className="hover:bg-gray-50 transition-colors">
                        <td className="p-4">
                          <div className="font-bold">{contact.name}</div>
                          <div className="text-gray-400">{contact.email}</div>
                          {contact.phone && <div className="text-gray-400">{contact.phone}</div>}
                        </td>
                        <td className="p-4">
                          <div className="flex flex-wrap gap-1">
                            {contact.source.split(', ').map((s: string, i: number) => (
                              <span key={i} className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded text-[8px] uppercase font-bold tracking-widest">
                                {s}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex gap-2">
                            <a 
                              href={`mailto:${contact.email}`}
                              className="p-2 hover:text-gold transition-colors"
                              title={t('dashboard_send_email')}
                            >
                              <Mail size={16} />
                            </a>
                            {contact.phone && (
                              <a 
                                href={`https://wa.me/${contact.phone.replace(/\s+/g, '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 hover:text-green-500 transition-colors"
                                title={t('dashboard_contact_whatsapp')}
                              >
                                <MessageSquare size={16} />
                              </a>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {allContacts.length === 0 && (
                      <tr>
                        <td colSpan={3} className="p-8 text-center text-gray-400 italic">{t('dashboard_no_contacts')}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : activeTab === 'users-mgmt' ? (
            <div className="space-y-8">
              <h2 className="text-3xl font-serif">{t('dashboard_users_mgmt')}</h2>
              <div className="bg-white border border-gray-100 shadow-sm overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 border-b border-gray-100 uppercase tracking-widest font-bold text-gray-400">
                    <tr>
                      <th className="p-4">{t('dashboard_user')}</th>
                      <th className="p-4">{t('dashboard_role')}</th>
                      <th className="p-4">{t('dashboard_subscription')}</th>
                      <th className="p-4">{t('dashboard_actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {users.map(u => (
                      <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-burgundy font-bold">
                              {u.displayName?.charAt(0) || u.email?.charAt(0)}
                            </div>
                            <div>
                              <div className="font-medium">{u.displayName || t('dashboard_no_name')}</div>
                              <div className="text-[10px] text-gray-400">{u.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <select 
                            value={u.role}
                            onChange={(e) => handleUpdateUserRole(u.id, e.target.value)}
                            className="bg-transparent border-none focus:ring-0 text-[10px] uppercase tracking-widest font-bold"
                          >
                            <option value="user">{t('dashboard_role_user', 'User')}</option>
                            <option value="editor">{t('dashboard_role_editor', 'Editor')}</option>
                            <option value="admin">{t('dashboard_role_admin', 'Admin')}</option>
                            <option value="super-admin">{t('dashboard_role_super_admin', 'Super Admin')}</option>
                          </select>
                        </td>
                        <td className="p-4">
                          <span className={cn(
                            "px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest",
                            u.subscriptionStatus === 'premium' ? "bg-gold/20 text-gold" : "bg-gray-100 text-gray-400"
                          )}>
                            {u.subscriptionStatus || 'free'}
                          </span>
                        </td>
                        <td className="p-4">
                          <button className="p-2 hover:text-gold transition-colors"><ShieldCheck size={14} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : activeTab === 'messages-mgmt' ? (
            <div className="space-y-8">
              <h2 className="text-3xl font-serif">{t('dashboard_messaging')}</h2>
              <div className="grid grid-cols-1 gap-4">
                {messages.map(m => (
                  <div key={m.id} className={cn(
                    "p-6 border transition-all",
                    m.status === 'unread' || m.status === 'new' ? "bg-burgundy/5 border-burgundy/20" : "bg-white border-gray-100"
                  )}>
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-sm">{m.name}</h3>
                          {(m.status === 'unread' || m.status === 'new') && <span className="px-2 py-0.5 bg-burgundy text-white text-[8px] uppercase tracking-widest font-bold">{t('dashboard_new')}</span>}
                        </div>
                        <div className="text-[10px] text-gray-400">
                          {m.email} {m.phone && `• ${m.phone}`} • {m.subject || t('dashboard_no_subject')} • {m.createdAt?.toDate?.().toLocaleString() || m.createdAt}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {(m.status === 'unread' || m.status === 'new') && (
                          <button 
                            onClick={() => handleMarkMessageRead(m.id)}
                            className="p-2 hover:text-gold transition-colors" 
                            title={t('dashboard_mark_as_read')}
                          >
                            <CheckCircle2 size={14} />
                          </button>
                        )}
                        <a 
                          href={`mailto:${m.email}?subject=Re: ${m.subject || 'Women Impact'}`}
                          className="p-2 hover:text-gold transition-colors"
                          title={t('dashboard_reply_email')}
                        >
                          <Mail size={14} />
                        </a>
                        {m.phone && (
                          <a 
                            href={`https://wa.me/${m.phone.replace(/\s+/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 hover:text-green-500 transition-colors"
                            title={t('dashboard_reply_whatsapp')}
                          >
                            <MessageSquare size={14} />
                          </a>
                        )}
                        <button 
                          onClick={() => handleDeleteMessage(m.id)}
                          className="p-2 hover:text-red-500 transition-colors"
                          title={t('dashboard_delete')}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    <p className="text-gray-600 text-sm leading-relaxed">{m.message}</p>
                  </div>
                ))}
                {messages.length === 0 && (
                  <div className="text-center py-20 bg-white border border-gray-100 text-gray-400 italic">
                    {t('dashboard_no_messages')}
                  </div>
                )}
              </div>
            </div>
          ) : activeTab === 'announcements-mgmt' ? (
            <div className="space-y-8">
              <div className="flex justify-between items-center">
                <h2 className="text-3xl font-serif">{t('dashboard_news_marquee')}</h2>
                <button 
                  onClick={() => setIsAddingAnnouncement(!isAddingAnnouncement)}
                  className="btn-gold px-6 py-2 text-[10px]"
                >
                  {isAddingAnnouncement ? t('dashboard_cancel') : t('dashboard_add_announcement')}
                </button>
              </div>

              {/* Marquee Settings */}
              <div className="bg-white p-6 border border-gray-100 shadow-sm flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-widest">{t('dashboard_scroll_speed')}</h3>
                  <p className="text-[10px] text-gray-400">{t('dashboard_scroll_speed_desc')}</p>
                </div>
                <div className="flex items-center gap-4">
                  <input 
                    type="range" 
                    min="10" 
                    max="300" 
                    step="5"
                    value={marqueeSettings.speed} 
                    onChange={(e) => handleUpdateMarqueeSpeed(parseInt(e.target.value))}
                    className="w-48 accent-gold"
                  />
                  <span className="text-xs font-bold w-10">{marqueeSettings.speed}s</span>
                </div>
              </div>

              {editingAnnouncement && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-burgundy p-8 text-white shadow-2xl space-y-6"
                >
                  <div className="flex justify-between items-center">
                    <h3 className="text-xl font-serif">{t('dashboard_edit_announcement')}</h3>
                    <button onClick={() => setEditingAnnouncement(null)}><X size={20} /></button>
                  </div>
                  <textarea 
                    value={editingAnnouncement.text}
                    onChange={(e) => setEditingAnnouncement({ ...editingAnnouncement, text: e.target.value })}
                    className="w-full bg-white/10 border border-white/20 p-4 text-white focus:border-gold outline-none text-sm"
                    rows={3}
                  />
                  <button 
                    onClick={handleUpdateAnnouncement}
                    className="btn-gold w-full py-3"
                  >
                    {t('dashboard_save_changes')}
                  </button>
                </motion.div>
              )}

              {isAddingAnnouncement && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white p-6 border border-gray-100 shadow-sm space-y-4"
                >
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest font-bold text-gray-400">{t('dashboard_announcement_text')}</label>
                    <textarea 
                      value={newAnnouncement}
                      onChange={(e) => setNewAnnouncement(e.target.value)}
                      className="w-full p-4 border border-gray-100 text-sm focus:border-gold outline-none"
                      placeholder={t('dashboard_announcement_placeholder')}
                      rows={2}
                    />
                  </div>
                  <button 
                    onClick={handleAddAnnouncement}
                    className="btn-premium px-8 py-3 text-[10px]"
                  >
                    {t('dashboard_save_announcement')}
                  </button>
                </motion.div>
              )}
              
              <div className="bg-white border border-gray-100 shadow-sm overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 border-b border-gray-100 uppercase tracking-widest font-bold text-gray-400">
                    <tr>
                      <th className="p-4">{t('dashboard_message')}</th>
                      <th className="p-4">{t('dashboard_status')}</th>
                      <th className="p-4">{t('dashboard_actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {announcements.map(a => (
                      <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                        <td className="p-4 font-medium">{a.text}</td>
                        <td className="p-4">
                          <button 
                            onClick={() => handleAnnounceAction(a.id, 'toggle')}
                            className={cn(
                              "px-2 py-1 rounded-full text-[8px] font-bold uppercase tracking-widest",
                              a.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-400"
                            )}
                          >
                            {a.isActive ? t('dashboard_active') : t('dashboard_inactive')}
                          </button>
                        </td>
                        <td className="p-4">
                          <div className="flex gap-2">
                            <button 
                              onClick={() => handleAnnounceAction(a.id, 'edit')}
                              className="p-2 hover:text-gold transition-colors"
                            >
                              <FileText size={14} />
                            </button>
                            <button 
                              onClick={() => handleAnnounceAction(a.id, 'delete')}
                              className="p-2 hover:text-red-500 transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : activeTab === 'ai-editorial' ? (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-12"
            >
              <div className="flex justify-between items-end mb-12">
                <h2 className="text-4xl font-serif">{t('dashboard_ai_editorial')}</h2>
                <div className="flex gap-4">
                  <button 
                    onClick={() => setAiResult(null)}
                    className="text-[10px] uppercase tracking-widest font-bold text-gray-400 hover:text-gold transition-colors"
                  >
                    {t('dashboard_reset')}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                {/* Input Section */}
                <div className="space-y-8">
                  <div className="bg-black-rich p-10 text-white shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-gold/5 rounded-full -mr-32 -mt-32 blur-3xl pointer-events-none" />
                    
                    <div className="flex items-center justify-between mb-8 relative z-10">
                      <h3 className="text-2xl font-serif flex items-center gap-3">
                        <FileText className="text-gold" />
                        {t('dashboard_source')}
                      </h3>
                      <div className="flex gap-2 bg-white/5 p-1 rounded">
                        <button 
                          onClick={() => setAiMode('text')}
                          className={cn(
                            "px-3 py-1 text-[8px] uppercase tracking-widest font-bold rounded transition-all",
                            aiMode === 'text' ? "bg-gold text-black-rich" : "text-gray-400 hover:text-white"
                          )}
                        >
                          {t('dashboard_text')}
                        </button>
                        <button 
                          onClick={() => setAiMode('file')}
                          className={cn(
                            "px-3 py-1 text-[8px] uppercase tracking-widest font-bold rounded transition-all",
                            aiMode === 'file' ? "bg-gold text-black-rich" : "text-gray-400 hover:text-white"
                          )}
                        >
                          {t('dashboard_file')}
                        </button>
                      </div>
                    </div>

                    {aiMode === 'text' ? (
                      <textarea 
                        value={aiInput}
                        onChange={(e) => setAiInput(e.target.value)}
                        placeholder={t('dashboard_ai_text_placeholder')}
                        className="w-full h-80 bg-white/5 border border-white/10 p-6 text-gray-300 focus:outline-none focus:border-gold transition-all font-serif italic text-lg mb-8 relative z-10"
                      />
                    ) : (
                      <div className="space-y-6 relative z-10">
                        <div 
                          onClick={() => fileInputRef.current?.click()}
                          onDragOver={handleDragOver}
                          onDragEnter={handleDragEnter}
                          onDragLeave={handleDragLeave}
                          onDrop={handleDrop}
                          className={cn(
                            "w-full h-48 bg-white/5 border p-6 flex flex-col items-center justify-center relative group rounded-xl border-dashed transition-all cursor-pointer",
                            isDragging ? "border-gold bg-gold/5" : "border-white/10 hover:border-gold/50"
                          )}
                        >
                          <input 
                            ref={fileInputRef}
                            type="file" 
                            multiple
                            accept="*/*" 
                            onChange={handleFileUpload}
                            className="hidden"
                          />
                          <div className="text-center space-y-3 pointer-events-none">
                            <div className={cn(
                              "w-12 h-12 rounded-full flex items-center justify-center mx-auto transition-transform",
                              isDragging ? "bg-gold text-black-rich scale-110" : "bg-gold/10 text-gold group-hover:scale-110"
                            )}>
                              <Upload size={24} />
                            </div>
                            <div>
                              <p className="text-xs font-bold uppercase tracking-widest text-white">
                                {isDragging ? t('dashboard_drop_files_here') : t('dashboard_add_files')}
                              </p>
                              <p className="text-[9px] text-gray-400 mt-1">
                                {t('dashboard_file_types_hint')}
                              </p>
                            </div>
                          </div>
                        </div>

                        {filesData.length > 0 && (
                          <div className="space-y-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                            <div className="flex justify-between items-center">
                              <span className="text-[10px] uppercase tracking-widest font-bold text-gray-400">
                                {filesData.length} {t('dashboard_files_selected')}
                              </span>
                              <button 
                                onClick={() => setFilesData([])}
                                className="text-[9px] uppercase tracking-widest font-bold text-red-400 hover:text-red-300 transition-colors"
                              >
                                {t('dashboard_clear_all')}
                              </button>
                            </div>
                            <div className="grid grid-cols-1 gap-2">
                              {filesData.map((file, idx) => (
                                <div key={idx} className="flex items-center justify-between bg-white/5 p-3 rounded-lg border border-white/5 group">
                                  <div className="flex items-center gap-3 overflow-hidden">
                                    <FileText size={14} className="text-gold flex-none" />
                                    <span className="text-[11px] text-gray-300 truncate font-medium">{file.name}</span>
                                  </div>
                                  <button 
                                    onClick={() => setFilesData(prev => prev.filter((_, i) => i !== idx))}
                                    className="text-gray-500 hover:text-red-400 transition-colors p-1"
                                  >
                                    <XCircle size={14} />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="mt-8">
                      <button 
                        onClick={handleAiProcess}
                        disabled={isProcessing || (aiMode === 'text' ? !aiInput.trim() : filesData.length === 0)}
                        className="btn-gold w-full flex items-center justify-center gap-3 py-5"
                      >
                        {isProcessing ? (
                          <>
                            <Loader2 size={20} className="animate-spin" />
                            {t('dashboard_ai_processing')}
                          </>
                        ) : (
                          <>
                            <Sparkles size={20} />
                            {t('dashboard_generate_editorial')}
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="bg-burgundy/5 p-8 border border-burgundy/10">
                    <h4 className="text-[10px] uppercase tracking-widest font-bold text-burgundy mb-6">{t('dashboard_ai_instructions')}</h4>
                    <ul className="text-[10px] text-gray-600 space-y-4 list-disc pl-4">
                      <li>{t('dashboard_ai_instruction_1')}</li>
                      <li>{t('dashboard_ai_instruction_2')}</li>
                      <li>{t('dashboard_ai_instruction_3')}</li>
                      <li>{t('dashboard_ai_instruction_4')}</li>
                    </ul>
                  </div>
                </div>

                {/* Result Section */}
                <div className="space-y-8">
                  {aiResult ? (
                    <div className="space-y-8">
                      <div className="p-4 bg-gold/10 border border-gold/20 flex items-center justify-between">
                        <span className="text-[10px] uppercase tracking-widest font-bold text-gold">{t('dashboard_analysis_results')}</span>
                        <button 
                          onClick={handleInjectAllAiData}
                          className="text-[10px] uppercase tracking-widest font-bold text-gold hover:underline"
                        >
                          {t('dashboard_inject_all')}
                        </button>
                      </div>

                      {aiResult.articles?.map((article: any, idx: number) => (
                        <motion.div 
                          key={idx}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.1 }}
                          className="bg-white p-8 border border-gray-100 shadow-sm group relative"
                        >
                          <div className="flex justify-between items-start mb-6">
                            <div className="flex gap-2">
                              <span className="px-2 py-1 bg-gold/10 text-gold text-[8px] uppercase tracking-widest font-bold rounded">{t('dashboard_article')}</span>
                              <button 
                                onClick={() => setEditingItem({ type: 'article', data: { ...article }, index: idx })}
                                className="px-2 py-1 bg-gray-100 text-gray-500 text-[8px] uppercase tracking-widest font-bold rounded hover:bg-gray-200 transition-colors"
                              >
                                {t('dashboard_edit')}
                              </button>
                            </div>
                            <button 
                              onClick={() => handleInjectAiData('article', article)}
                              className="text-[10px] uppercase tracking-widest font-bold text-burgundy hover:text-gold transition-colors flex items-center gap-2"
                            >
                              {t('dashboard_publish')} <ArrowRight size={12} />
                            </button>
                          </div>
                          <h4 className="font-serif text-2xl mb-4 leading-tight">{article.title}</h4>
                          <p className="text-gray-500 text-sm line-clamp-3 mb-6 leading-relaxed">{article.content || article.summary}</p>
                          <div className="flex items-center gap-4 text-[10px] uppercase tracking-widest font-bold text-gray-400">
                            <span>{article.category}</span>
                            <span className="w-1 h-1 bg-gray-300 rounded-full" />
                            <span>{article.author || t('dashboard_editorial_team')}</span>
                          </div>
                        </motion.div>
                      ))}

                      {aiResult.quotes?.map((quote: any, idx: number) => (
                        <motion.div 
                          key={idx}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.1 }}
                          className="bg-black-rich p-8 text-white shadow-xl relative overflow-hidden group"
                        >
                          <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                            <button 
                              onClick={() => setEditingItem({ type: 'quote', data: { ...quote }, index: idx })}
                              className="text-[8px] uppercase tracking-widest font-bold text-gray-400 hover:text-white transition-colors"
                            >
                              {t('dashboard_edit')}
                            </button>
                            <button 
                              onClick={() => handleInjectAiData('quote', quote)}
                              className="text-[8px] uppercase tracking-widest font-bold text-gold hover:text-white transition-colors"
                            >
                              {t('dashboard_inject_on_site')}
                            </button>
                          </div>
                          <div className="text-gold/20 text-6xl font-serif absolute -top-4 -left-2">"</div>
                          <blockquote className="font-serif text-xl mb-6 relative z-10 italic leading-relaxed">
                            {quote.text}
                          </blockquote>
                          <div className="flex items-center gap-4">
                            <div className="w-8 h-[1px] bg-gold" />
                            <cite className="text-[10px] uppercase tracking-widest font-bold text-gold not-italic">
                              {quote.author}
                            </cite>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-center p-12 bg-gray-50 border border-dashed border-gray-200 text-gray-400">
                      <Sparkles size={64} className="mb-6 opacity-10" />
                      <p className="text-lg font-serif italic mb-2">{t('dashboard_waiting_for_content')}</p>
                      <p className="text-xs uppercase tracking-widest font-bold opacity-60">{t('dashboard_ai_waiting_hint')}</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ) : activeTab === 'reservations-mgmt' ? (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8"
            >
              <h2 className="text-4xl font-serif mb-12">{t('dashboard_reservations_mgmt')}</h2>
              <div className="bg-white border border-gray-100 shadow-sm overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 border-b border-gray-100 uppercase tracking-widest font-bold text-gray-400">
                    <tr>
                      <th className="p-4">{t('dashboard_participant')}</th>
                      <th className="p-4">{t('dashboard_event_ticket')}</th>
                      <th className="p-4">{t('dashboard_status')}</th>
                      <th className="p-4">{t('dashboard_actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {reservations.map(res => (
                      <tr key={res.id} className="hover:bg-gray-50 transition-colors">
                        <td className="p-4">
                          <div className="font-bold">{res.userName}</div>
                          <div className="text-gray-400">{res.userEmail}</div>
                          <div className="text-gray-400">{res.userPhone}</div>
                        </td>
                        <td className="p-4">
                          <div className="font-medium">{res.eventTitle}</div>
                          <div className="inline-block px-2 py-0.5 bg-gray-100 text-gray-600 rounded mt-1 text-[8px] uppercase font-bold tracking-widest">
                            {res.ticketType}
                          </div>
                          <div className="text-[8px] text-gray-400 mt-1">
                            {res.createdAt?.toDate?.().toLocaleString() || t('dashboard_unknown_date')}
                          </div>
                        </td>
                        <td className="p-4">
                          <span className={cn(
                            "px-2 py-1 rounded-full text-[8px] font-bold uppercase tracking-widest",
                            res.status === 'confirmed' ? "bg-green-100 text-green-700" : 
                            res.status === 'cancelled' ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"
                          )}>
                            {res.status === 'pending' ? t('dashboard_pending') : 
                             res.status === 'confirmed' ? t('dashboard_confirmed') : t('dashboard_cancelled')}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex gap-2">
                            {res.status === 'pending' && (
                              <>
                                <button 
                                  onClick={() => handleUpdateReservationStatus(res.id, 'confirmed')}
                                  className="p-2 text-green-600 hover:bg-green-50 rounded transition-colors"
                                  title={t('dashboard_confirm')}
                                >
                                  <CheckCircle2 size={16} />
                                </button>
                                <button 
                                  onClick={() => handleUpdateReservationStatus(res.id, 'cancelled')}
                                  className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                                  title={t('dashboard_cancel')}
                                >
                                  <XCircle size={16} />
                                </button>
                              </>
                            )}
                            <button 
                              onClick={() => handleDeleteReservation(res.id)}
                              className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                              title={t('dashboard_delete')}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {reservations.length === 0 && (
                      <tr>
                        <td colSpan={4} className="p-12 text-center text-gray-400 italic">
                          {t('dashboard_no_reservations')}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>
          ) : activeTab === 'moderation' ? (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8"
            >
              <h2 className="text-4xl font-serif mb-12">{t('dashboard_comment_moderation')}</h2>
              {pendingComments.length > 0 ? (
                <div className="space-y-6">
                  {pendingComments.map((comment) => (
                    <div key={comment.id} className="bg-white p-6 border border-gray-100 shadow-sm">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center font-bold text-burgundy">
                            {comment.userName.charAt(0)}
                          </div>
                          <div>
                            <h4 className="font-bold text-sm">{comment.userName}</h4>
                            <span className="text-[10px] text-gray-400 uppercase tracking-widest">
                              {new Date(comment.createdAt?.seconds * 1000).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => handleCommentAction(comment.id, 'approved')}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-full transition-colors"
                            title={t('dashboard_approve')}
                          >
                            <CheckCircle2 size={20} />
                          </button>
                          <button 
                            onClick={() => handleCommentAction(comment.id, 'rejected')}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-full transition-colors"
                            title={t('dashboard_reject')}
                          >
                            <AlertCircle size={20} />
                          </button>
                        </div>
                      </div>
                      <p className="text-gray-600 italic font-serif">"{comment.content}"</p>
                      <div className="mt-4 pt-4 border-t border-gray-50 text-[9px] text-gray-400 uppercase tracking-widest">
                        {t('dashboard_target')}: {comment.targetId}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-20 bg-gray-50 border border-dashed border-gray-200">
                  <CheckCircle2 size={48} className="mx-auto text-green-200 mb-4" />
                  <p className="text-gray-500 font-serif text-xl">{t('dashboard_no_pending_comments')}</p>
                  <p className="text-gray-400 text-sm mt-2">{t('dashboard_all_up_to_date')}</p>
                </div>
              )}
            </motion.div>
          ) : activeTab === 'magazine-mgmt' ? (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8"
            >
              <h2 className="text-4xl font-serif mb-12">{t('dashboard_magazine_mgmt')}</h2>
              
              {/* Add New Magazine Section */}
              <div className="bg-black-rich p-10 text-white shadow-2xl">
                <h3 className="text-2xl font-serif mb-6">{t('dashboard_add_new_issue')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">{t('dashboard_issue_title')}</label>
                    <input 
                      type="text" 
                      value={magazineData.title}
                      placeholder="Ex: WIL Magazine #12 - Leadership au Féminin" 
                      className="w-full bg-white/5 border border-white/10 p-4 text-white focus:border-gold outline-none" 
                      onChange={(e) => setMagazineData(prev => ({ ...prev, title: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">{t('dashboard_issue_date')}</label>
                    <input 
                      type="text" 
                      value={magazineData.issueDate}
                      placeholder={t('dashboard_issue_date_placeholder')} 
                      className="w-full bg-white/5 border border-white/10 p-4 text-white focus:border-gold outline-none" 
                      onChange={(e) => setMagazineData(prev => ({ ...prev, issueDate: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  <FileUploader 
                    label={t('dashboard_pdf_file')} 
                    accept=".pdf" 
                    currentUrl={magazineData.pdfUrl}
                    onUploadSuccess={(url) => setMagazineData(prev => ({ ...prev, pdfUrl: url }))} 
                  />
                  <ImageUploader 
                    label={t('dashboard_cover')} 
                    currentUrl={magazineData.coverImage}
                    onUploadSuccess={(url) => setMagazineData(prev => ({ ...prev, coverImage: url }))} 
                  />
                </div>
                <button 
                  onClick={handlePublishMagazine}
                  disabled={isPublishingMagazine}
                  className="btn-gold w-full py-4"
                >
                  {isPublishingMagazine ? <Loader2 className="animate-spin mx-auto" /> : t('dashboard_publish_issue')}
                </button>
              </div>

              {/* Magazines List Section */}
              <div className="bg-white p-10 border border-gray-100 shadow-sm mt-8">
                <h3 className="text-2xl font-serif mb-6">{t('dashboard_existing_issues', 'Existing Issues')}</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-gray-100 text-[10px] uppercase tracking-widest text-gray-400">
                        <th className="p-4 font-bold">{t('dashboard_image', 'Image')}</th>
                        <th className="p-4 font-bold">{t('dashboard_magazine_title')}</th>
                        <th className="p-4 font-bold">{t('dashboard_magazine_date')}</th>
                        <th className="p-4 font-bold">{t('dashboard_actions', 'Actions')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {magazines.map((magazine) => (
                        <tr key={magazine.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                          <td className="p-4">
                            <div className="w-12 h-16 bg-gray-100">
                              <img src={magazine.coverImage} className="w-full h-full object-cover" alt="Cover" referrerPolicy="no-referrer" />
                            </div>
                          </td>
                          <td className="p-4 font-medium">{magazine.title}</td>
                          <td className="p-4">{magazine.issueDate}</td>
                          <td className="p-4 flex gap-2 items-center">
                            <a 
                              href={magazine.pdfUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 hover:text-gold transition-colors"
                              title="Voir le PDF"
                            >
                              <ExternalLink size={14} />
                            </a>
                            <button 
                              onClick={() => handleDeleteItem('magazines', magazine.id)}
                              className="p-2 hover:text-red-500 transition-colors"
                              title="Supprimer le magazine"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {magazines.length === 0 && (
                        <tr>
                          <td colSpan={4} className="p-8 text-center text-gray-400 italic">{t('dashboard_no_magazines')}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          ) : activeTab === 'galeries-mgmt' ? (
            <GaleriesAdmin />
          ) : activeTab === 'events-mgmt' ? (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8"
            >
              <div className="flex justify-between items-end mb-12">
                <h2 className="text-4xl font-serif">Gestion des Évènements</h2>
                <button 
                  onClick={() => {
                    if (editingEvent) {
                      setEditingEvent(null);
                      setNewEventData({ title: '', category: '', date: '', location: '', price: '', image: '', attendees: 0, description: '' });
                    }
                    setIsEventModalOpen(true);
                  }}
                  className="btn-gold flex items-center gap-2"
                >
                  <Calendar size={16} /> Ajouter un évènement
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {events.map((event) => (
                  <div key={event.id} className="bg-white border border-gray-100 p-4 shadow-sm group">
                    <div className="aspect-[4/3] bg-gray-100 mb-4 overflow-hidden relative">
                      <img src={event.image || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&q=80'} className="w-full h-full object-cover" alt={event.title} referrerPolicy="no-referrer" />
                      <div className="absolute top-2 left-2 bg-white px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-burgundy shadow-sm">
                        {event.date}
                      </div>
                    </div>
                    <h3 className="font-bold text-lg mb-2">{event.title}</h3>
                    <p className="text-xs text-gray-500 mb-4 truncate">{event.location}</p>
                    <div className="flex justify-between items-center text-[10px] text-gray-400">
                      <div className="flex items-center gap-2 text-gold">
                        <span className="font-bold">{event.price}</span>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleEditEvent(event)}
                          className="p-2 hover:text-gold transition-colors"
                        >
                          {t('dashboard_edit')}
                        </button>
                        <button 
                          onClick={() => handleDeleteItem('events', event.id)}
                          className="p-2 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {events.length === 0 && (
                  <div className="col-span-full py-20 text-center text-gray-400 italic">
                    Aucun évènement programmé.
                  </div>
                )}
              </div>
            </motion.div>
          ) : activeTab === 'media-mgmt' ? (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-12"
            >
              <div className="flex justify-between items-center">
                <h2 className="text-4xl font-serif">{t('dashboard_media_library')}</h2>
                <div className="text-[10px] uppercase tracking-widest font-bold text-gray-400">
                  {media.length} {t('dashboard_files_stored')}
                </div>
              </div>

              <div className="bg-white p-10 border border-gray-100 shadow-sm">
                <h3 className="text-xl font-serif mb-6">{t('dashboard_upload_new_file')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <ImageUploader 
                    label={t('dashboard_image_types')} 
                    onUploadSuccess={(url) => {
                      if (url) showStatus(t('dashboard_image_added_success'));
                    }} 
                  />
                  <FileUploader 
                    label={t('dashboard_document_types')} 
                    accept=".pdf,.doc,.docx"
                    onUploadSuccess={(url) => {
                      if (url) showStatus(t('dashboard_document_added_success'));
                    }} 
                  />
                </div>
              </div>

              <div className="space-y-6">
                <h3 className="text-xl font-serif">{t('dashboard_media_library_title')}</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                  {media.map((item) => (
                    <motion.div 
                      key={item.id}
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="group bg-white border border-gray-100 shadow-sm overflow-x-auto relative"
                    >
                      <div className="aspect-square bg-gray-50 relative overflow-hidden">
                        {item.type?.startsWith('image/') ? (
                          <img 
                            src={item.data} 
                            alt={item.name} 
                            className="w-full h-full object-cover transition-transform group-hover:scale-110" 
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gold/30">
                            <FileText size={48} />
                          </div>
                        )}
                        
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3 p-4">
                          <button 
                            onClick={() => copyMediaUrl(item.data)}
                            className="w-full py-2 bg-gold text-black-rich text-[8px] font-bold uppercase tracking-widest rounded flex items-center justify-center gap-2"
                          >
                            <Copy size={12} /> {t('dashboard_copy_link')}
                          </button>
                          <button 
                            onClick={() => downloadFile(item.data, item.name)}
                            className="w-full py-2 bg-white/10 text-white text-[8px] font-bold uppercase tracking-widest rounded border border-white/20 hover:bg-white/20 transition-colors flex items-center justify-center gap-2"
                          >
                            <Download size={12} /> {t('dashboard_download')}
                          </button>
                          <button 
                            onClick={() => handleDeleteMedia(item.id)}
                            className="w-full py-2 bg-red-500/20 text-red-500 text-[8px] font-bold uppercase tracking-widest rounded border border-red-500/30 hover:bg-red-500 hover:text-white transition-colors"
                          >
                            {t('dashboard_delete')}
                          </button>
                        </div>
                      </div>
                      <div className="p-3">
                        <p className="text-[10px] font-bold truncate text-gray-600" title={item.name}>{item.name}</p>
                        <p className="text-[8px] text-gray-400 uppercase tracking-widest mt-1">{item.type?.split('/')[1] || 'Fichier'}</p>
                      </div>
                    </motion.div>
                  ))}
                  {media.length === 0 && (
                    <div className="col-span-full py-20 text-center bg-gray-50 border border-dashed border-gray-200 rounded-lg">
                      <Image size={48} className="mx-auto text-gray-300 mb-4 opacity-20" />
                      <p className="text-gray-400 font-serif italic">{t('dashboard_empty_library')}</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ) : activeTab === 'favorites' ? (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8"
            >
              <h2 className="text-4xl font-serif mb-12">{t('dashboard_my_favorites')}</h2>
              {profile?.favorites && profile.favorites.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {profile.favorites.map((favId: string) => {
                    const article = articles.find(a => a.id === favId);
                    const video = videos.find(v => v.id === favId);
                    const item = article || video;

                    if (!item) return null;

                    return (
                      <div key={favId} className="bg-white p-6 border border-gray-100 shadow-sm flex items-center justify-between group">
                        <div className="flex items-center gap-4">
                          <div className="w-20 h-20 bg-gray-100 rounded-sm overflow-hidden">
                            <img 
                              src={article ? (article.image || `https://picsum.photos/seed/${article.id}/800/600`) : (video.thumbnail || `https://picsum.photos/seed/${video.id}/800/600`)} 
                              alt={item.title} 
                              className="w-full h-full object-cover" 
                              referrerPolicy="no-referrer"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${favId}/800/600`;
                              }}
                            />
                          </div>
                          <div>
                            <div className="text-[8px] uppercase tracking-widest font-bold text-gold mb-1">
                              {article ? t('dashboard_article_type') : t('dashboard_video_type')} • {item.category}
                            </div>
                            <h4 className="font-serif text-lg leading-tight mb-2">{item.title}</h4>
                            <Link 
                              to={article ? `/articles/${item.id}` : `/tv`} 
                              className="text-[10px] uppercase tracking-widest font-bold text-burgundy hover:text-gold transition-colors flex items-center gap-1"
                            >
                              {t('dashboard_view')} <ExternalLink size={10} />
                            </Link>
                          </div>
                        </div>
                        <button 
                          onClick={() => toggleFavorite(favId)}
                          className="text-burgundy hover:text-gold transition-colors p-2"
                        >
                          <Bookmark size={20} fill="currentColor" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-20 bg-gray-50 border border-dashed border-gray-200">
                  <Bookmark size={48} className="mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500 font-serif text-xl">{t('dashboard_no_favorites_yet')}</p>
                  <p className="text-gray-400 text-sm mt-2">{t('dashboard_no_favorites_hint')}</p>
                </div>
              )}
            </motion.div>
          ) : activeTab === 'subscription' ? (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8"
            >
              <h2 className="text-4xl font-serif mb-12">{t('dashboard_subscription')}</h2>
              <div className="bg-burgundy text-white p-12 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -mr-48 -mt-48 blur-3xl" />
                <div className="relative z-10">
                  <span className="text-[10px] uppercase tracking-[0.4em] font-bold opacity-70 mb-4 block">{t('dashboard_current_status')}</span>
                  <h3 className="text-5xl font-serif mb-6">
                    {profile?.subscriptionStatus === 'premium' ? t('dashboard_premium_member_title') : t('dashboard_free_account_title')}
                  </h3>
                  <p className="text-burgundy-light text-lg mb-10 max-w-md">
                    {profile?.subscriptionStatus === 'premium' 
                      ? t('dashboard_premium_access_desc') 
                      : t('dashboard_free_account_desc')}
                  </p>
                  <button className="bg-white text-burgundy px-10 py-4 font-bold uppercase tracking-widest text-xs hover:bg-gold hover:text-black-rich transition-all">
                    {profile?.subscriptionStatus === 'premium' ? t('dashboard_manage_subscription') : t('dashboard_become_premium')}
                  </button>
                </div>
              </div>

              {profile?.subscriptionStatus !== 'premium' && (
                <div className="bg-gray-50 p-8 border border-gray-100">
                  <h4 className="font-serif text-xl mb-6 flex items-center gap-3">
                    <CreditCard className="text-gold" />
                    {t('dashboard_local_payment')}
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button className="flex items-center justify-between p-4 bg-white border border-gray-200 hover:border-gold transition-all group">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-[#FFCC00] rounded-lg flex items-center justify-center font-bold text-black">MTN</div>
                        <div className="text-left">
                          <div className="text-xs font-bold uppercase tracking-widest">MTN Mobile Money</div>
                          <div className="text-[10px] text-gray-400">{t('dashboard_instant_payment')}</div>
                        </div>
                      </div>
                      <ArrowRight size={16} className="text-gray-300 group-hover:text-gold transition-colors" />
                    </button>
                    <button className="flex items-center justify-between p-4 bg-white border border-gray-200 hover:border-gold transition-all group">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-[#FF6600] rounded-lg flex items-center justify-center font-bold text-white">OM</div>
                        <div className="text-left">
                          <div className="text-xs font-bold uppercase tracking-widest">Orange Money</div>
                          <div className="text-[10px] text-gray-400">{t('dashboard_secure_fast')}</div>
                        </div>
                      </div>
                      <ArrowRight size={16} className="text-gray-300 group-hover:text-gold transition-colors" />
                    </button>
                  </div>
                  <p className="mt-4 text-[9px] text-gray-400 uppercase tracking-widest text-center">
                    {t('dashboard_partner_processing_hint')}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8">
                <div className="p-8 border border-gray-100 bg-white">
                  <h4 className="font-serif text-xl mb-4">{t('dashboard_premium_benefits')}</h4>
                  <ul className="space-y-4">
                    {[
                      t('dashboard_benefit_unlimited_articles'),
                      t('dashboard_benefit_exclusive_videos'),
                      t('dashboard_benefit_digital_magazine'),
                      t('dashboard_benefit_vip_invitations')
                    ].map((item, i) => (
                      <li key={i} className="flex items-center gap-3 text-sm text-gray-600">
                        <CheckCircle2 size={16} className="text-gold" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="p-8 border border-gray-100 bg-white">
                  <h4 className="font-serif text-xl mb-4">{t('dashboard_billing')}</h4>
                  <p className="text-sm text-gray-500 mb-6">{t('dashboard_billing_desc')}</p>
                  <button className="text-gold font-bold uppercase tracking-widest text-[10px] flex items-center gap-2 hover:text-burgundy transition-colors">
                    <CreditCard size={14} /> {t('dashboard_payment_history')}
                  </button>
                </div>
              </div>
            </motion.div>
          ) : (
            <>
              <div className="flex justify-between items-end mb-12">
                <h2 className="text-4xl font-serif">{t('dashboard_overview')}</h2>
                <div className="text-[10px] uppercase tracking-widest text-gray-400">
                  {t('dashboard_last_login')} : {new Date().toLocaleDateString()}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
                <div className="bg-burgundy text-white p-8 shadow-lg">
                  <div className="text-[10px] uppercase tracking-[0.3em] mb-4 opacity-70 font-bold">{t('dashboard_subscription')}</div>
                  <div className="text-2xl font-serif mb-2">
                    {profile?.subscriptionStatus === 'premium' ? t('dashboard_active') : t('dashboard_inactive')}
                  </div>
                  <p className="text-[10px] opacity-60">
                    {profile?.subscriptionStatus === 'premium' ? t('dashboard_auto_renewal') : t('dashboard_upgrade_hint')}
                  </p>
                </div>
                
                <div className="bg-gold text-black-rich p-8 shadow-lg">
                  <div className="text-[10px] uppercase tracking-[0.3em] mb-4 opacity-70 font-bold">{t('dashboard_favorites')}</div>
                  <div className="text-2xl font-serif mb-2">{profile?.favorites?.length || 0} {t('dashboard_articles')}</div>
                  <p className="text-[10px] opacity-60">{t('dashboard_saved_for_later')}</p>
                </div>

                <div className="bg-black-rich text-white p-8 shadow-lg">
                  <div className="text-[10px] uppercase tracking-[0.3em] mb-4 opacity-70 font-bold">{t('dashboard_magazine')}</div>
                  <div className="text-2xl font-serif mb-2">{t('dashboard_latest_issue')}</div>
                  <p className="text-[10px] opacity-60">{t('dashboard_digital_version_available')}</p>
                </div>
              </div>

              <section className="mb-16">
                <h3 className="text-2xl font-serif mb-8 border-b border-gray-100 pb-4 flex items-center justify-between">
                  {t('dashboard_continue_reading')}
                  <button className="text-[10px] uppercase tracking-widest text-gold hover:text-burgundy transition-colors">{t('dashboard_view_all')}</button>
                </h3>
                <div className="space-y-6">
                  {[1, 2].map(i => (
                    <motion.div 
                      key={i} 
                      whileHover={{ x: 10 }}
                      className="flex items-center justify-between p-6 bg-white border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-6">
                        <div className="w-24 h-16 bg-gray-200 overflow-hidden">
                          <img 
                            src={`https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200&sig=${i}`} 
                            alt={t('dashboard_article')} 
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div>
                          <h4 className="text-lg font-serif mb-1">{t('dashboard_sample_article_title')}</h4>
                          <div className="flex items-center gap-4 text-[9px] text-gray-400 uppercase tracking-widest">
                            <span>{t('dashboard_leadership')}</span>
                            <span className="w-1 h-1 bg-gold rounded-full" />
                            <span>{t('dashboard_read_percentage', { percent: 65 })}</span>
                          </div>
                        </div>
                      </div>
                      <ArrowRight size={20} className="text-gold" />
                    </motion.div>
                  ))}
                </div>
              </section>

              {profile?.subscriptionStatus !== 'premium' && (
                <div className="bg-gray-50 p-12 border border-dashed border-gold text-center">
                  <h3 className="text-2xl font-serif mb-4">{t('dashboard_unlock_unlimited')}</h3>
                  <p className="text-gray-600 mb-8 max-w-md mx-auto">{t('dashboard_unlock_unlimited_desc')}</p>
                  <button className="btn-gold">{t('dashboard_view_offers')}</button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      {/* Edit AI Item Modal */}
      <AnimatePresence>
        {editingItem && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-2xl overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                <h3 className="text-xl font-serif">{t('dashboard_edit_generated_content')}</h3>
                <button onClick={() => setEditingItem(null)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <XCircle size={20} />
                </button>
              </div>
              
              <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
                {editingItem.type === 'article' ? (
                  <>
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest font-bold text-gray-400">{t('dashboard_title')}</label>
                      <input 
                        type="text" 
                        value={editingItem.data.title}
                        onChange={(e) => setEditingItem({...editingItem, data: {...editingItem.data, title: e.target.value}})}
                        className="w-full p-3 border border-gray-100 focus:border-gold outline-none text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-end">
                        <label className="text-[10px] uppercase tracking-widest font-bold text-gray-400">{t('dashboard_summary_content')}</label>
                        <div className="flex items-center gap-4">
                            <span className="text-[10px] text-gray-500">
                                {t('dashboard_media_library_tip')}<code className="bg-gray-100 px-1">![description](lien_image)</code>
                            </span>
                            <button
                                type="button"
                                onClick={() => setIsMediaLibraryOpen(true)}
                                className="text-[10px] uppercase tracking-widest font-bold text-gold hover:text-burgundy transition-colors underline"
                            >
                                {t('dashboard_open_media_library') || 'Ouvrir la Médiathèque'}
                            </button>
                          </div>
                      </div>
                      <textarea 
                        value={editingItem.data.content || editingItem.data.summary}
                        onChange={(e) => setEditingItem({...editingItem, data: {...editingItem.data, content: e.target.value, summary: e.target.value}})}
                        className="w-full p-3 border border-gray-100 focus:border-gold outline-none h-40 font-mono text-sm leading-relaxed"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase tracking-widest font-bold text-gray-400">{t('dashboard_category')}</label>
                        <input 
                          type="text" 
                          value={editingItem.data.category}
                          onChange={(e) => setEditingItem({...editingItem, data: {...editingItem.data, category: e.target.value}})}
                          className="w-full p-3 border border-gray-100 focus:border-gold outline-none text-sm"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase tracking-widest font-bold text-gray-400">{t('dashboard_author')}</label>
                        <input 
                          type="text" 
                          value={editingItem.data.author || t('dashboard_editorial_team')}
                          onChange={(e) => setEditingItem({...editingItem, data: {...editingItem.data, author: e.target.value}})}
                          className="w-full p-3 border border-gray-100 focus:border-gold outline-none text-sm"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <ImageUploader 
                        label={t('dashboard_cover_image')}
                        currentUrl={editingItem.data.image}
                        onUploadSuccess={(url) => setEditingItem({...editingItem, data: {...editingItem.data, image: url}})}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest font-bold text-gray-400">{t('dashboard_quote_text')}</label>
                      <textarea 
                        value={editingItem.data.text}
                        onChange={(e) => setEditingItem({...editingItem, data: {...editingItem.data, text: e.target.value}})}
                        className="w-full p-3 border border-gray-100 focus:border-gold outline-none h-32 text-sm italic"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest font-bold text-gray-400">{t('dashboard_author')}</label>
                      <input 
                        type="text" 
                        value={editingItem.data.author}
                        onChange={(e) => setEditingItem({...editingItem, data: {...editingItem.data, author: e.target.value}})}
                        className="w-full p-3 border border-gray-100 focus:border-gold outline-none text-sm"
                      />
                    </div>
                  </>
                )}
              </div>

              <div className="p-6 border-t border-gray-100 flex justify-end gap-4 bg-gray-50">
                <button onClick={() => setEditingItem(null)} className="px-6 py-2 text-[10px] uppercase tracking-widest font-bold text-gray-400 hover:text-black-rich transition-colors">{t('dashboard_cancel')}</button>
                <button onClick={handleUpdateAiItem} className="btn-gold px-8 py-2">{t('dashboard_save_changes')}</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Event Modal */}
      <AnimatePresence>
        {isEventModalOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-gray-100 flex justify-between items-center relative z-10 bg-white">
                <h3 className="text-xl font-serif">
                  {editingEvent ? t('dashboard_edit_event', 'Edit Event') : t('dashboard_add_event', 'Add Event')}
                </h3>
                <button onClick={() => setIsEventModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <XCircle size={20} />
                </button>
              </div>
              
              <div className="p-8 space-y-6 overflow-y-auto flex-grow">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest font-bold text-gray-400">Titre de l'évènement</label>
                    <input 
                      type="text" 
                      value={newEventData.title}
                      onChange={(e) => setNewEventData(prev => ({...prev, title: e.target.value}))}
                      className="w-full p-3 border border-gray-100 focus:border-gold outline-none text-sm"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest font-bold text-gray-400">Catégorie</label>
                      <input 
                        type="text" 
                        value={newEventData.category}
                        onChange={(e) => setNewEventData(prev => ({...prev, category: e.target.value}))}
                        className="w-full p-3 border border-gray-100 focus:border-gold outline-none text-sm"
                        placeholder="Ex: Conférence, Gala..."
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest font-bold text-gray-400">Date</label>
                      <input 
                        type="text" 
                        value={newEventData.date}
                        onChange={(e) => setNewEventData(prev => ({...prev, date: e.target.value}))}
                        className="w-full p-3 border border-gray-100 focus:border-gold outline-none text-sm"
                        placeholder="Ex: 15 Octobre 2026"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest font-bold text-gray-400">Lieu</label>
                      <input 
                        type="text" 
                        value={newEventData.location}
                        onChange={(e) => setNewEventData(prev => ({...prev, location: e.target.value}))}
                        className="w-full p-3 border border-gray-100 focus:border-gold outline-none text-sm"
                        placeholder="Ex: Paris, France"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest font-bold text-gray-400">Prix</label>
                      <input 
                        type="text" 
                        value={newEventData.price}
                        onChange={(e) => setNewEventData(prev => ({...prev, price: e.target.value}))}
                        className="w-full p-3 border border-gray-100 focus:border-gold outline-none text-sm"
                        placeholder="Ex: 50€ ou Gratuit"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest font-bold text-gray-400">Description</label>
                    <textarea 
                      value={newEventData.description}
                      onChange={(e) => setNewEventData(prev => ({...prev, description: e.target.value}))}
                      className="w-full p-3 border border-gray-100 focus:border-gold outline-none h-32 text-sm leading-relaxed"
                      placeholder="Description détaillée de l'évènement..."
                    />
                  </div>

                  <div className="space-y-2">
                    <ImageUploader 
                      label="Image Principale"
                      currentUrl={newEventData.image}
                      onUploadSuccess={(url) => setNewEventData(prev => ({...prev, image: url}))}
                    />
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-gray-100 flex justify-end gap-4 bg-gray-50 relative z-10">
                <button onClick={() => setIsEventModalOpen(false)} className="px-6 py-2 text-[10px] uppercase tracking-widest font-bold text-gray-400 hover:text-black-rich transition-colors">{t('dashboard_cancel')}</button>
                <button onClick={handleSaveEvent} className="btn-gold px-8 py-2">
                  {editingEvent ? t('dashboard_save_changes') : 'Ajouter'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Media Library Modal */}
      <AnimatePresence>
        {isMediaLibraryOpen && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-5xl h-[80vh] shadow-2xl rounded-2xl flex flex-col overflow-hidden"
            >
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                <h3 className="text-2xl font-serif">Médiathèque</h3>
                <button onClick={() => setIsMediaLibraryOpen(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                  <XCircle size={24} className="text-gray-500" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-8 bg-gray-50">
                <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm mb-8">
                  <ImageUploader 
                    label="Ajouter une nouvelle image"
                    onUploadSuccess={(url) => {
                      navigator.clipboard.writeText(`![Image](${url})`);
                      toast.success('Image téléchargée et lien markdown copié !');
                    }}
                  />
                </div>
                
                <h4 className="text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-6">Images Précédentes</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {media.map((item) => (
                    <div key={item.id} className="relative group aspect-square bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                      {item.type === 'image' ? (
                        <img src={item.url} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50 text-gray-400 p-4 text-center">
                          <FileText size={32} className="mb-2" />
                          <span className="text-[10px] truncate w-full">{item.name}</span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-4 gap-3">
                        <button 
                          onClick={() => {
                            if (item.type === 'image') {
                              navigator.clipboard.writeText(`![${item.name}](${item.url})`);
                            } else {
                              navigator.clipboard.writeText(`[${item.name}](${item.url})`);
                            }
                            toast.success('Lien copié ! Vous pouvez le coller dans l\'article.');
                          }}
                          className="bg-gold text-white px-4 py-2 text-[10px] uppercase tracking-widest font-bold w-full rounded hover:bg-white hover:text-gold transition-colors text-center"
                        >
                          Copier Markdown
                        </button>
                        <button 
                          onClick={() => {
                            navigator.clipboard.writeText(item.url);
                            toast.success('Lien direct copié !');
                          }}
                          className="bg-white/20 text-white px-4 py-2 text-[10px] uppercase tracking-widest font-bold w-full rounded hover:bg-white/40 transition-colors text-center"
                        >
                          Copier URL
                        </button>
                      </div>
                    </div>
                  ))}
                  {media.length === 0 && (
                    <div className="col-span-full py-12 text-center text-gray-400 font-serif">
                      Aucun média disponible
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {confirmModal?.isOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white max-w-md w-full shadow-2xl rounded-2xl overflow-hidden"
            >
              <div className="p-8 text-center">
                <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                  <AlertCircle size={32} />
                </div>
                <h3 className="text-xl font-serif mb-4">{confirmModal.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed mb-8">
                  {confirmModal.message}
                </p>
                <div className="flex gap-4">
                  <button 
                    onClick={() => setConfirmModal(null)}
                    className="flex-1 px-6 py-3 text-[10px] uppercase tracking-widest font-bold text-gray-400 hover:text-black-rich transition-colors border border-gray-100 rounded-lg"
                  >
                    {t('dashboard_cancel')}
                  </button>
                  <button 
                    onClick={confirmModal.onConfirm}
                    className="flex-1 px-6 py-3 text-[10px] uppercase tracking-widest font-bold bg-red-500 text-white hover:bg-red-600 transition-colors rounded-lg shadow-lg shadow-red-500/20"
                  >
                    {t('dashboard_confirm')}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Status Notifications */}
      <AnimatePresence>
        {statusMsg && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className={cn(
              "fixed bottom-8 right-8 p-6 shadow-2xl flex items-center gap-4 z-[100] border-l-4",
              statusMsg.type === 'success' ? "bg-white border-green-500" : "bg-white border-red-500"
            )}
          >
            {statusMsg.type === 'success' ? (
              <CheckCircle2 className="text-green-500" size={24} />
            ) : (
              <AlertCircle className="text-red-500" size={24} />
            )}
            <div>
              <div className="text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-1">
                {statusMsg.type === 'success' ? t('dashboard_success') : t('dashboard_error')}
              </div>
              <div className="text-sm font-medium">{statusMsg.text}</div>
            </div>
            <button 
              onClick={() => setStatusMsg(null)}
              className="ml-4 p-1 hover:bg-gray-100 rounded-full transition-colors"
            >
              <XCircle size={16} className="text-gray-400" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
