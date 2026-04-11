import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { signInWithPopup, googleProvider, auth, signOut, db, doc, setDoc, updateDoc, deleteDoc, collection, addDoc, getDocs, query, limit, serverTimestamp, onSnapshot, where, orderBy, OperationType, handleFirestoreError } from '../firebase';
import { ARTICLES, VIDEOS, MAGAZINES, EVENTS } from '../constants';
import { Database, Loader2, Sparkles, FileText, Send, CheckCircle2, AlertCircle, Layout, Settings, Play, Image, Copy, Ticket, XCircle, Download, MessageSquare, Mail, Upload, X, Trash2 } from 'lucide-react';
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
import { arrayUnion, arrayRemove } from 'firebase/firestore';
import { toast } from 'react-hot-toast';

import { downloadFile } from '../lib/download';

export default function Dashboard() {
  const { user, profile, loading } = useAuth();
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = React.useState<string | null>(null);
  const [seeding, setSeeding] = React.useState(false);
  const [seedStatus, setSeedStatus] = React.useState<string | null>(null);
  const [activeTab, setActiveTab] = React.useState<string>('profile');
  const [aiInput, setAiInput] = React.useState('');
  const [isProcessing, setIsProcessing] = React.useState(false);
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
  const [selectedSection, setSelectedSection] = React.useState<any>(null);
  const [isPageBuilderEditing, setIsPageBuilderEditing] = React.useState(false);
  const [magazineData, setMagazineData] = React.useState({ title: '', issueDate: '', pdfUrl: '', coverImage: '' });
  const [aiMode, setAiMode] = React.useState<'text' | 'file'>('text');
  const [filesData, setFilesData] = React.useState<{ base64?: string, text?: string, name: string, mimeType: string }[]>([]);
  const [isPublishingMagazine, setIsPublishingMagazine] = React.useState(false);
  const [isDragging, setIsDragging] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [isVideoModalOpen, setIsVideoModalOpen] = React.useState(false);
  const [editingItem, setEditingItem] = React.useState<{ type: string, data: any, index: number } | null>(null);
  const [editingAnnouncement, setEditingAnnouncement] = React.useState<{ id: string, text: string } | null>(null);
  const [editingArticle, setEditingArticle] = React.useState<any>(null);
  const [editingVideo, setEditingVideo] = React.useState<any>(null);
  const [marqueeSettings, setMarqueeSettings] = React.useState({ speed: 40 });
  const [newVideoData, setNewVideoData] = React.useState({ title: '', category: '', duration: '', thumbnail: '', videoUrl: '', description: '' });
  const [statusMsg, setStatusMsg] = React.useState<{ text: string, type: 'success' | 'error' } | null>(null);
  const [confirmModal, setConfirmModal] = React.useState<{ isOpen: boolean, title: string, message: string, onConfirm: () => void } | null>(null);

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
        handleFirestoreError(error, OperationType.GET, 'comments?status=pending');
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
        handleFirestoreError(error, OperationType.GET, 'messages');
      });

      // Fetch users
      const qUsers = query(collection(db, 'users'), orderBy('createdAt', 'desc'), limit(50));
      const unsubUsers = onSnapshot(qUsers, (snap) => {
        setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      });

      // Fetch announcements
      const qAnn = query(collection(db, 'announcements'), orderBy('createdAt', 'desc'));
      const unsubAnn = onSnapshot(qAnn, (snap) => {
        setAnnouncements(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      });

      // Fetch media library
      const qMedia = query(collection(db, 'media'), orderBy('createdAt', 'desc'), limit(100));
      const unsubMedia = onSnapshot(qMedia, (snap) => {
        setMedia(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      });

      // Fetch reservations
      const qRes = query(collection(db, 'reservations'), orderBy('createdAt', 'desc'));
      const unsubRes = onSnapshot(qRes, (snap) => {
        setReservations(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      }, (error) => {
        console.error("Reservations snapshot error:", error);
        handleFirestoreError(error, OperationType.GET, 'reservations');
      });

      // Fetch articles
      const qArt = query(collection(db, 'articles'), orderBy('createdAt', 'desc'));
      const unsubArt = onSnapshot(qArt, (snap) => {
        setArticles(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      });

      // Fetch videos
      const qVid = query(collection(db, 'videos'), orderBy('createdAt', 'desc'));
      const unsubVid = onSnapshot(qVid, (snap) => {
        setVideos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      });

      // Fetch marquee settings
      const unsubMarquee = onSnapshot(doc(db, 'settings', 'marquee'), (snap) => {
        if (snap.exists()) {
          setMarqueeSettings(snap.data() as { speed: number });
        }
      });

      // Fetch magazines
      const qMag = query(collection(db, 'magazines'), orderBy('createdAt', 'desc'));
      const unsubMag = onSnapshot(qMag, (snap) => {
        setMagazines(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      });

      // Fetch events
      const qEve = query(collection(db, 'events'), orderBy('createdAt', 'desc'));
      const unsubEve = onSnapshot(qEve, (snap) => {
        setEvents(snap.docs.map(d => ({ id: d.id, ...d.data() })));
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

  const handleSaveArticle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingArticle) return;
    try {
      const { id, ...data } = editingArticle;
      await updateDoc(doc(db, 'articles', id), data);
      showStatus(t('update_success'));
      setIsArticleModalOpen(false);
      setEditingArticle(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `articles/${editingArticle.id}`);
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
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
      
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
        
        OUTPUT FORMAT:
        You MUST return a JSON object following this exact schema:
        {
          "articles": [
            {
              "title": "Titre accrocheur",
              "summary": "Résumé court et percutant",
              "content": "Corps de l'article développé (plusieurs paragraphes)",
              "category": "Leadership | Business | Inspiration | Society | Culture",
              "readTime": "X min",
              "image": "URL d'image descriptive (optionnel)"
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
              required: ["title", "summary", "content", "category"]
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
          model: "gemini-3-flash-preview",
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
          model: "gemini-3-flash-preview",
          contents: `${prompt}\n\nINPUT:\n${aiInput}`,
          config: {
            responseMimeType: "application/json",
            responseSchema: schema,
            temperature: 0.3,
          }
        });
      }

      if (!response.text) {
        throw new Error("L'IA n'a pas retourné de contenu. Le document est peut-être illisible ou trop court.");
      }

      const result = JSON.parse(response.text);
      
      if (!result.articles?.length && !result.quotes?.length) {
        throw new Error("Aucun contenu pertinent n'a pu être extrait. Essayez avec un autre document ou du texte plus explicite.");
      }

      setAiResult(result);
      showStatus("Traitement IA terminé avec succès !");
    } catch (err: any) {
      console.error("AI Processing Error:", err);
      setError(err.message || "Erreur lors du traitement IA. Veuillez réessayer.");
      showStatus(err.message || "Erreur IA", "error");
    } finally {
      setIsProcessing(false);
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
          showStatus(`${newFiles.length} fichier(s) ajouté(s)`);
        }
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };

    filesToProcess.forEach(file => {
      if (file.size > 20 * 1024 * 1024) {
        showStatus(`Fichier ${file.name} trop lourd (max 20Mo).`, "error");
        finalize();
        return;
      }

      const reader = new FileReader();
      
      reader.onerror = () => {
        console.error(`Error reading file ${file.name}`);
        showStatus(`Erreur de lecture : ${file.name}`, "error");
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
            showStatus(`Erreur sur ${file.name}`, "error");
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
            showStatus(`Erreur sur ${file.name}`, "error");
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
      else if (file.type.startsWith('image/') || file.type === 'application/pdf') {
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
          author: "WIL Editorial AI",
          date: new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }),
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
    } catch (err) {
      console.error("Injection Error:", err);
      setSeedStatus(t('dashboard_seed_error'));
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
      setSeedStatus("Seeding des nouvelles sections premium...");
      
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
        setError(t('dashboard_login_error') + (err.message || 'Erreur inconnue'));
      }
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
      showStatus("Annonce mise à jour !");
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
        toast.success("Retiré de vos favoris");
      } else {
        await updateDoc(userRef, {
          favorites: arrayUnion(itemId)
        });
        toast.success("Ajouté à vos favoris");
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
    }
  };

  const handleUpdateMarqueeSpeed = async (speed: number) => {
    try {
      const settingsRef = doc(db, 'settings', 'marquee');
      await setDoc(settingsRef, { speed }, { merge: true });
      showStatus(`Vitesse du bandeau mise à jour : ${speed}s`);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'settings/marquee');
    }
  };

  const handleDeleteMedia = async (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Supprimer le média",
      message: "Voulez-vous vraiment supprimer ce média définitivement ?",
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'media', id));
          showStatus("Média supprimé.");
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, `media/${id}`);
        }
        setConfirmModal(null);
      }
    });
  };

  const copyMediaUrl = (data: string) => {
    navigator.clipboard.writeText(data);
    showStatus("Lien copié dans le presse-papier !");
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
      showStatus("Annonce ajoutée !");
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'announcements');
    }
  };

  if (!user) {
    return (
      <div className="pt-32 pb-20 container-custom min-h-screen flex flex-col items-center justify-center text-center">
        <div className="max-w-md w-full bg-gray-50 p-12 border border-gray-100 shadow-sm">
          <h1 className="text-4xl font-serif mb-6">{t('dashboard_my_space')}</h1>
          <p className="text-gray-600 mb-10">{t('dashboard_login_desc')}</p>
          
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 text-xs text-center">
              {error}
            </div>
          )}

          <button 
            onClick={handleLogin}
            className="btn-premium w-full flex items-center justify-center gap-3"
          >
            {t('dashboard_login_google')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-32 pb-20 container-custom min-h-screen">
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
                          <Bookmark size={16} /> {t('dashboard_contacts')}
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
              <div className="max-w-2xl space-y-6">
                <div className="bg-white p-8 border border-gray-100 shadow-sm space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest font-bold">{t('dashboard_platform_name')}</label>
                    <input type="text" defaultValue="Women Impact - Excellence & Leadership Féminin" className="w-full p-3 border border-gray-100 text-sm" />
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
                <button 
                  onClick={() => setActiveTab('ai-editorial')}
                  className="btn-gold px-6 py-2 text-[10px]"
                >
                  {t('dashboard_new_article')}
                </button>
              </div>
              <div className="bg-white border border-gray-100 shadow-sm overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 border-b border-gray-100 uppercase tracking-widest font-bold text-gray-400">
                    <tr>
                      <th className="p-4">{t('dashboard_title')}</th>
                      <th className="p-4">{t('dashboard_category')}</th>
                      <th className="p-4">{t('dashboard_author')}</th>
                      <th className="p-4">{t('dashboard_actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {articles.map(article => (
                      <tr key={article.id} className="hover:bg-gray-50 transition-colors">
                        <td className="p-4 font-medium">{article.title}</td>
                        <td className="p-4">{article.category}</td>
                        <td className="p-4">{article.author}</td>
                        <td className="p-4 flex gap-2">
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
                            <History size={14} />
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
            </div>
          ) : activeTab === 'tv-mgmt' ? (
            <div className="space-y-8">
              {isArticleModalOpen && editingArticle && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white w-full max-w-4xl max-h-[90vh] overflow-y-auto"
                  >
                    <div className="p-8 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10">
                      <h3 className="text-2xl font-serif">{t('dashboard_edit_article')}</h3>
                      <button onClick={() => setIsArticleModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <XCircle size={24} />
                      </button>
                    </div>
                    
                    <form onSubmit={handleSaveArticle} className="p-8 space-y-6">
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase tracking-widest font-bold text-gray-400">{t('dashboard_title')}</label>
                        <input 
                          type="text" 
                          value={editingArticle.title}
                          onChange={(e) => setEditingArticle({...editingArticle, title: e.target.value})}
                          className="w-full p-4 bg-gray-50 border border-gray-100 focus:outline-none focus:border-gold"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] uppercase tracking-widest font-bold text-gray-400">{t('dashboard_category')}</label>
                          <select 
                            value={editingArticle.category}
                            onChange={(e) => setEditingArticle({...editingArticle, category: e.target.value})}
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
                            value={editingArticle.readTime}
                            onChange={(e) => setEditingArticle({...editingArticle, readTime: e.target.value})}
                            className="w-full p-4 bg-gray-50 border border-gray-100 focus:outline-none focus:border-gold"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase tracking-widest font-bold text-gray-400">{t('dashboard_summary')}</label>
                        <textarea 
                          value={editingArticle.summary}
                          onChange={(e) => setEditingArticle({...editingArticle, summary: e.target.value})}
                          className="w-full p-4 bg-gray-50 border border-gray-100 focus:outline-none focus:border-gold h-24"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase tracking-widest font-bold text-gray-400">{t('dashboard_content')}</label>
                        <textarea 
                          value={editingArticle.content}
                          onChange={(e) => setEditingArticle({...editingArticle, content: e.target.value})}
                          className="w-full p-4 bg-gray-50 border border-gray-100 focus:outline-none focus:border-gold h-64"
                        />
                      </div>
                      <ImageUploader 
                        label={t('dashboard_cover_image')}
                        currentUrl={editingArticle.image}
                        onUploadSuccess={(url) => setEditingArticle({...editingArticle, image: url})}
                      />
                      <div className="flex justify-end gap-4 pt-4">
                        <button type="button" onClick={() => setIsArticleModalOpen(false)} className="px-8 py-3 text-[10px] uppercase tracking-widest font-bold text-gray-400 hover:text-black-rich transition-colors">{t('dashboard_cancel')}</button>
                        <button type="submit" className="btn-gold px-12 py-3">{t('dashboard_save')}</button>
                      </div>
                    </form>
                  </motion.div>
                </div>
              )}

              <div className="flex justify-between items-center">
                <h2 className="text-3xl font-serif">{t('dashboard_tv_mgmt')}</h2>
                <button 
                  onClick={() => {
                    setEditingVideo(null);
                    setNewVideoData({ title: '', category: '', duration: '', thumbnail: '', videoUrl: '', description: '' });
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
                            onChange={(e) => setNewVideoData({...newVideoData, title: e.target.value})}
                            className="w-full p-4 bg-gray-50 border border-gray-100 focus:outline-none focus:border-gold"
                            placeholder={t('dashboard_video_title_placeholder')}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-[10px] uppercase tracking-widest font-bold text-gray-400">{t('dashboard_category')}</label>
                            <select 
                              value={newVideoData.category}
                              onChange={(e) => setNewVideoData({...newVideoData, category: e.target.value})}
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
                              onChange={(e) => setNewVideoData({...newVideoData, duration: e.target.value})}
                              className="w-full p-4 bg-gray-50 border border-gray-100 focus:outline-none focus:border-gold"
                              placeholder="Ex: 12:45"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] uppercase tracking-widest font-bold text-gray-400">{t('dashboard_description')}</label>
                          <textarea 
                            value={newVideoData.description}
                            onChange={(e) => setNewVideoData({...newVideoData, description: e.target.value})}
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
                                onChange={(e) => setNewVideoData({...newVideoData, videoUrl: e.target.value})}
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
                            onUploadSuccess={(url) => setNewVideoData({...newVideoData, thumbnail: url})}
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
              <div className="bg-white border border-gray-100 shadow-sm overflow-hidden">
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
              <div className="bg-white border border-gray-100 shadow-sm overflow-hidden">
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
                            <option value="user">User</option>
                            <option value="editor">Editor</option>
                            <option value="admin">Admin</option>
                            <option value="super-admin">Super Admin</option>
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
                          <History size={14} />
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
                    max="100" 
                    step="5"
                    value={marqueeSettings.speed} 
                    onChange={(e) => handleUpdateMarqueeSpeed(parseInt(e.target.value))}
                    className="w-48 accent-gold"
                  />
                  <span className="text-xs font-bold w-8">{marqueeSettings.speed}s</span>
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
              
              <div className="bg-white border border-gray-100 shadow-sm overflow-hidden">
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
                              <History size={14} />
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
                    <div className="absolute top-0 right-0 w-64 h-64 bg-gold/5 rounded-full -mr-32 -mt-32 blur-3xl" />
                    
                    <div className="flex items-center justify-between mb-8">
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
                        className="w-full h-80 bg-white/5 border border-white/10 p-6 text-gray-300 focus:outline-none focus:border-gold transition-all font-serif italic text-lg mb-8"
                      />
                    ) : (
                      <div className="space-y-6">
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
                        <button className="text-[10px] uppercase tracking-widest font-bold text-gold hover:underline">{t('dashboard_inject_all')}</button>
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
              <div className="bg-white border border-gray-100 shadow-sm overflow-hidden">
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
                              <History size={16} />
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
              <div className="bg-black-rich p-10 text-white shadow-2xl">
                <h3 className="text-2xl font-serif mb-6">{t('dashboard_add_new_issue')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">{t('dashboard_issue_title')}</label>
                    <input 
                      type="text" 
                      placeholder="Ex: WIL Magazine #12 - Leadership au Féminin" 
                      className="w-full bg-white/5 border border-white/10 p-4 text-white focus:border-gold outline-none" 
                      onChange={(e) => setMagazineData({ ...magazineData, title: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">{t('dashboard_issue_date')}</label>
                    <input 
                      type="text" 
                      placeholder={t('dashboard_issue_date_placeholder')} 
                      className="w-full bg-white/5 border border-white/10 p-4 text-white focus:border-gold outline-none" 
                      onChange={(e) => setMagazineData({ ...magazineData, issueDate: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  <FileUploader 
                    label={t('dashboard_pdf_file')} 
                    accept=".pdf" 
                    onUploadSuccess={(url) => setMagazineData({ ...magazineData, pdfUrl: url })} 
                  />
                  <ImageUploader 
                    label={t('dashboard_cover')} 
                    onUploadSuccess={(url) => setMagazineData({ ...magazineData, coverImage: url })} 
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
                      className="group bg-white border border-gray-100 shadow-sm overflow-hidden relative"
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
                      <p className="text-gray-400 font-serif italic">Votre bibliothèque est vide.</p>
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
                              src={article ? article.image : video.thumbnail} 
                              alt={item.title} 
                              className="w-full h-full object-cover" 
                              referrerPolicy="no-referrer"
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
                      <label className="text-[10px] uppercase tracking-widest font-bold text-gray-400">{t('dashboard_summary_content')}</label>
                      <textarea 
                        value={editingItem.data.content || editingItem.data.summary}
                        onChange={(e) => setEditingItem({...editingItem, data: {...editingItem.data, content: e.target.value, summary: e.target.value}})}
                        className="w-full p-3 border border-gray-100 focus:border-gold outline-none h-40 text-sm leading-relaxed"
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
