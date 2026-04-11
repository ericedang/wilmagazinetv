import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Upload, Loader2, Check, X, Link, Copy } from 'lucide-react';
import { storage, ref, uploadBytes, getDownloadURL, db, auth } from '../../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { motion } from 'motion/react';

interface ImageUploaderProps {
  onUploadSuccess: (url: string) => void;
  currentUrl?: string;
  label?: string;
}

export default function ImageUploader({ onUploadSuccess, currentUrl, label }: ImageUploaderProps) {
  const { t } = useTranslation();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(currentUrl || null);
  const [copied, setCopied] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Basic validation
    if (!file.type.startsWith('image/')) {
      setError(t('dashboard_file_must_be_image'));
      return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit for Storage
      setError(t('dashboard_image_too_large', { size: '10Mo' }));
      return;
    }

    setUploading(true);
    setProgress(10);
    setError(null);

    try {
      // Create a unique storage reference
      const storagePath = `media/${Date.now()}_${file.name}`;
      const storageRef = ref(storage, storagePath);
      
      setProgress(30);
      
      // Upload to Firebase Storage
      await uploadBytes(storageRef, file);
      
      setProgress(70);
      
      // Get the download URL
      const downloadURL = await getDownloadURL(storageRef);
      
      setProgress(90);
      
      // Save metadata to Firestore for the media library
      await addDoc(collection(db, 'media'), {
        name: file.name,
        type: file.type,
        data: downloadURL, // Store the URL instead of base64
        owner: auth.currentUser?.uid || 'anonymous',
        createdAt: serverTimestamp()
      });
      
      setPreview(downloadURL);
      onUploadSuccess(downloadURL);
      setProgress(100);
      
      setTimeout(() => {
        setUploading(false);
        setProgress(0);
      }, 500);
    } catch (err: any) {
      console.error("Storage upload error:", err);
      setError(t('dashboard_upload_error'));
      setUploading(false);
    }
  };

  const copyToClipboard = () => {
    if (preview) {
      navigator.clipboard.writeText(preview);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-3">
      <label className="block text-[10px] uppercase tracking-[0.2em] font-bold text-gray-400">{label || t('dashboard_image')}</label>
      
      <div className="grid grid-cols-1 gap-4">
        {/* Upload Area */}
        <div className="relative group">
          <div className={`
            relative aspect-video rounded-lg border-2 border-dashed transition-all duration-300 flex flex-col items-center justify-center overflow-hidden
            ${preview ? 'border-gold/50 bg-gold/5' : 'border-gray-200 bg-gray-50 hover:border-gold hover:bg-gold/5'}
          `}>
            {preview ? (
              <>
                <img src={preview} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center gap-4">
                  <label className="cursor-pointer p-3 bg-white/20 rounded-full hover:bg-white/40 transition-colors backdrop-blur-md">
                    <Upload size={20} className="text-white" />
                    <input type="file" className="hidden" onChange={handleFileChange} accept="image/*" disabled={uploading} />
                  </label>
                  <button 
                    onClick={() => { setPreview(null); onUploadSuccess(''); }}
                    className="p-3 bg-red-500/20 rounded-full hover:bg-red-500/40 transition-colors backdrop-blur-md"
                  >
                    <X size={20} className="text-white" />
                  </button>
                </div>
              </>
            ) : (
              <label className="cursor-pointer w-full h-full flex flex-col items-center justify-center gap-3 p-8">
                {uploading ? (
                  <div className="flex flex-col items-center gap-3">
                    <div className="relative w-16 h-16 flex items-center justify-center">
                      <Loader2 size={32} className="animate-spin text-gold" />
                      <span className="absolute text-[10px] font-bold text-gold">{Math.round(progress)}%</span>
                    </div>
                    <span className="text-[10px] uppercase tracking-widest font-bold text-gold">{t('dashboard_uploading')}</span>
                  </div>
                ) : (
                  <>
                    <div className="w-12 h-12 rounded-full bg-gold/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Upload size={24} className="text-gold" />
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-bold uppercase tracking-widest mb-1">{t('dashboard_click_to_upload')}</p>
                      <p className="text-[10px] text-gray-400">JPG, PNG, WebP (Max 10Mo)</p>
                    </div>
                  </>
                )}
                <input type="file" className="hidden" onChange={handleFileChange} accept="image/*" disabled={uploading} />
              </label>
            )}
            
            {uploading && (
              <div className="absolute bottom-0 left-0 h-1.5 bg-gold transition-all duration-300" style={{ width: `${progress}%` }} />
            )}
          </div>
        </div>

        {/* URL Input & Copy */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="relative flex-grow">
              <Link size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                type="text" 
                value={preview || ''} 
                onChange={(e) => {
                  setPreview(e.target.value);
                  onUploadSuccess(e.target.value);
                }}
                placeholder={t('dashboard_paste_image_url')}
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-100 text-xs focus:outline-none focus:border-gold focus:bg-white transition-all rounded-md"
              />
            </div>
            {preview && (
              <button 
                onClick={copyToClipboard}
                className={`p-3 rounded-md transition-all flex items-center gap-2 ${copied ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                title={t('dashboard_copy_url')}
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                <span className="text-[10px] font-bold uppercase tracking-widest hidden md:block">
                  {copied ? t('dashboard_copied') : t('dashboard_copy')}
                </span>
              </button>
            )}
          </div>
          
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
      </div>
    </div>
  );
}
