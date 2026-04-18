import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FileText, Loader2, Check, X, Upload, Copy, Link, Search } from 'lucide-react';
import { db, auth } from '../../firebase';
import { collection, addDoc, serverTimestamp, getDocs, query, orderBy } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';

interface FileUploaderProps {
  onUploadSuccess: (url: string) => void;
  currentUrl?: string;
  label?: string;
  accept?: string;
}

export default function FileUploader({ onUploadSuccess, currentUrl, label, accept = ".pdf" }: FileUploaderProps) {
  const { t } = useTranslation();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(currentUrl ? t('dashboard_current_file') : null);
  const [fileUrl, setFileUrl] = useState<string | null>(currentUrl || null);
  const [copied, setCopied] = useState(false);
  
  // URL Input Fallback
  const [manualUrl, setManualUrl] = useState('');
  const [isManualInput, setIsManualInput] = useState(false);

  // Media Library states
  const [showMediaLibrary, setShowMediaLibrary] = useState(false);
  const [mediaItems, setMediaItems] = useState<any[]>([]);
  const [fetchingMedia, setFetchingMedia] = useState(false);

  const loadMediaLibrary = async () => {
    setFetchingMedia(true);
    try {
      const q = query(collection(db, 'media'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        .filter((item: any) => item.name?.toLowerCase().endsWith('.pdf') || item.type === 'application/pdf');
      setMediaItems(items);
    } catch (err) {
      console.error("Error fetching media library", err);
    }
    setFetchingMedia(false);
  };

  const handleOpenMediaLibrary = () => {
    setShowMediaLibrary(true);
    loadMediaLibrary();
  };

  const handleSelectFromMediaLibrary = (url: string, name: string) => {
    setFileUrl(url);
    setFileName(name);
    onUploadSuccess(url);
    setShowMediaLibrary(false);
  };

  const handleManualUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualUrl.trim()) {
      setFileUrl(manualUrl.trim());
      setFileName("Lien Externe PDF");
      onUploadSuccess(manualUrl.trim());
      setIsManualInput(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) { // Cloudinary free unsigned tier limit is 10MB
      setError('Fichier trop lourd (Limité à 10Mo). Utilisez un lien externe ou compressez le fichier.');
      return;
    }

    setUploading(true);
    setProgress(10);
    setError(null);

    try {
      // Cloudinary configuration
      const cloudName = 'dih0ch67r';
      const uploadPreset = 'ml_default';
      // Use 'raw' instead of 'auto' for PDFs so they aren't processed as images, avoiding the 401 Delivery error.
      const url = `https://api.cloudinary.com/v1_1/${cloudName}/${file.type === 'application/pdf' ? 'raw' : 'auto'}/upload`;

      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', uploadPreset);
      
      setProgress(30);
      
      // Upload to Cloudinary
      const response = await fetch(url, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Upload failed');
      }
      
      setProgress(70);
      
      const data = await response.json();
      const downloadURL = data.secure_url;
      
      setProgress(90);
      
      // Save metadata to Firestore for the media library
      await addDoc(collection(db, 'media'), {
        name: file.name,
        type: file.type || 'application/pdf',
        data: downloadURL,
        owner: auth.currentUser?.uid || 'anonymous',
        createdAt: serverTimestamp()
      });
      
      setFileName(file.name);
      setFileUrl(downloadURL);
      onUploadSuccess(downloadURL);
      setProgress(100);
      
      setTimeout(() => {
        setUploading(false);
        setProgress(0);
      }, 500);
    } catch (err: any) {
      console.error("Cloudinary upload error:", err);
      setError('Erreur Cloudinary: ' + (err.message || 'Hébergeur non disponible. Utilisez un lien externe.'));
      setUploading(false);
    }
  };

  const copyToClipboard = () => {
    if (fileUrl) {
      navigator.clipboard.writeText(fileUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-3 relative">
      <div className="flex justify-between items-center">
        <label className="block text-[10px] uppercase tracking-[0.2em] font-bold text-gray-400">{label || t('dashboard_file')}</label>
        <div className="flex gap-2">
          {!fileUrl && (
            <button 
              type="button"
              onClick={() => setIsManualInput(!isManualInput)}
              className="text-[10px] text-gray-400 hover:text-gold uppercase tracking-widest font-bold"
            >
              {isManualInput ? 'Uploader Fichier' : 'Lien Web'}
            </button>
          )}
          <button 
            type="button"
            onClick={handleOpenMediaLibrary}
            className="text-[10px] flex items-center gap-1 text-gray-400 hover:text-gold uppercase tracking-widest font-bold ml-2"
          >
            <Search size={10} /> Médiathèque
          </button>
        </div>
      </div>
      
      <div className="space-y-4">
        {/* Upload Area / Manual Link */}
        {isManualInput && !fileUrl ? (
          <form onSubmit={handleManualUrlSubmit} className="flex gap-2">
            <input 
              type="url" 
              value={manualUrl}
              onChange={(e) => setManualUrl(e.target.value)}
              placeholder="https://... (Lien Google Drive, etc.)"
              className="flex-grow p-3 border border-gray-200 focus:border-gold outline-none text-sm bg-white"
              required
            />
            <button type="submit" className="btn-gold px-4 py-2 whitespace-nowrap">
              Valider
            </button>
          </form>
        ) : (
          <div className={`
            relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-300
            ${fileUrl ? 'border-gold/50 bg-gold/5' : 'border-gray-200 bg-gray-50 hover:border-gold hover:bg-gold/5'}
          `}>
            <input 
              type="file" 
              className="absolute inset-0 opacity-0 cursor-pointer z-10" 
              onChange={handleFileChange} 
              accept={accept} 
              disabled={uploading || !!fileUrl} 
            />
            
            <div className="relative z-0">
              {uploading ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="relative w-16 h-16 flex items-center justify-center">
                    <Loader2 size={32} className="animate-spin text-gold" />
                    <span className="absolute text-[10px] font-bold text-gold">{Math.round(progress)}%</span>
                  </div>
                  <p className="text-[10px] uppercase tracking-widest font-bold text-gold">{t('dashboard_uploading_document')}</p>
                </div>
              ) : (
                <>
                  <div className={`w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center transition-transform duration-300 ${fileUrl ? 'bg-gold/20' : 'bg-gray-100 group-hover:scale-110'}`}>
                    {fileUrl ? <Check className="text-gold" size={32} /> : <Upload className="text-gray-400" size={32} />}
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-bold uppercase tracking-widest">
                      {fileName || t('dashboard_click_to_upload_file', { type: accept.replace('.', '').toUpperCase() })}
                    </p>
                    <p className="text-[10px] text-gray-400">Glissez & déposez (Max 10Mo)</p>
                  </div>
                </>
              )}
            </div>

            {uploading && (
              <div className="absolute bottom-0 left-0 h-1.5 bg-gold transition-all duration-300" style={{ width: `${progress}%` }} />
            )}
          </div>
        )}

        {/* URL & Copy */}
        {fileUrl && (
          <div className="flex items-center gap-2">
            <div className="relative flex-grow">
              <Link size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                type="text" 
                readOnly 
                value={fileUrl} 
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-100 text-[10px] text-gray-500 rounded-md focus:outline-none"
              />
            </div>
            <button 
              type="button"
              onClick={copyToClipboard}
              className={`p-3 rounded-md transition-all flex items-center gap-2 ${copied ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              title={t('dashboard_copy_url')}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              <span className="text-[10px] font-bold uppercase tracking-widest hidden md:block">
                {copied ? t('dashboard_copied') : t('dashboard_copy')}
              </span>
            </button>
            <button 
              type="button"
              onClick={() => { setFileUrl(null); setFileName(null); onUploadSuccess(''); }}
              className="p-3 bg-red-50 text-red-500 hover:bg-red-100 rounded-md transition-all"
              title={t('dashboard_delete')}
            >
              <X size={14} />
            </button>
          </div>
        )}

        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 text-red-500 text-[10px] font-bold uppercase tracking-widest bg-red-50 p-2 rounded"
          >
            <X size={12} /> {error}
          </motion.div>
        )}
      </div>

      {/* Media Library Modal */}
      <AnimatePresence>
        {showMediaLibrary && (
          <div className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[80vh] flex flex-col overflow-hidden"
            >
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/80 backdrop-blur-md">
                <div className="flex items-center gap-3 text-gold">
                  <FileText size={24} />
                  <h3 className="font-serif text-xl text-black-rich">Documents de la Médiathèque</h3>
                </div>
                <button 
                  onClick={() => setShowMediaLibrary(false)}
                  className="p-2 text-gray-400 hover:bg-white hover:text-black-rich hover:shadow-sm rounded-full transition-all"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 overflow-y-auto flex-grow bg-gray-50/30">
                {fetchingMedia ? (
                  <div className="flex flex-col items-center justify-center h-40 gap-4">
                    <Loader2 className="animate-spin text-gold" size={32} />
                    <p className="text-[10px] uppercase tracking-widest font-bold text-gray-400">Chargement...</p>
                  </div>
                ) : mediaItems.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {mediaItems.map((item) => (
                      <div 
                        key={item.id}
                        onClick={() => handleSelectFromMediaLibrary(item.data, item.name)}
                        className="group relative aspect-[3/4] bg-white border border-gray-100 rounded-lg overflow-hidden cursor-pointer hover:border-gold hover:shadow-md transition-all flex flex-col items-center justify-center p-4"
                      >
                        <FileText size={40} className="text-gray-300 group-hover:text-gold transition-colors mb-4" />
                        <span className="text-[10px] text-gray-500 font-bold truncate w-full text-center">{item.name}</span>
                        <div className="absolute inset-0 bg-gold/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <div className="bg-white text-gold text-[10px] uppercase tracking-widest font-bold px-3 py-1 rounded-full shadow-sm">
                            Sélectionner
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col flex-grow items-center justify-center text-gray-400 py-20 px-4 text-center">
                    <FileText size={48} className="mb-4 opacity-20" />
                    <p className="text-base font-serif mb-2">Aucun document PDF trouvé</p>
                    <p className="text-[10px] uppercase tracking-widest max-w-sm">
                      Uploadez des fichiers PDF pour les retrouver ici lors de vos prochaines publications.
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
