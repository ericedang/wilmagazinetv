import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FileText, Loader2, Check, X, Upload, Copy, Link } from 'lucide-react';
import { storage, ref, uploadBytes, getDownloadURL, db, auth } from '../../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { motion } from 'motion/react';

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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) { // 50MB limit for Storage
      setError(t('dashboard_file_too_large', { size: '50Mo' }));
      return;
    }

    setUploading(true);
    setProgress(10);
    setError(null);

    try {
      // Create a unique storage reference
      const storagePath = `documents/${Date.now()}_${file.name}`;
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
      
      setFileName(file.name);
      setFileUrl(downloadURL);
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
    if (fileUrl) {
      navigator.clipboard.writeText(fileUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-3">
      <label className="block text-[10px] uppercase tracking-[0.2em] font-bold text-gray-400">{label || t('dashboard_file')}</label>
      
      <div className="space-y-4">
        {/* Upload Area */}
        <div className={`
          relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-300
          ${fileUrl ? 'border-gold/50 bg-gold/5' : 'border-gray-200 bg-gray-50 hover:border-gold hover:bg-gold/5'}
        `}>
          <input 
            type="file" 
            className="absolute inset-0 opacity-0 cursor-pointer z-10" 
            onChange={handleFileChange} 
            accept={accept} 
            disabled={uploading} 
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
                  <p className="text-[10px] text-gray-400">{t('dashboard_drag_drop_files')}</p>
                </div>
              </>
            )}
          </div>

          {uploading && (
            <div className="absolute bottom-0 left-0 h-1.5 bg-gold transition-all duration-300" style={{ width: `${progress}%` }} />
          )}
        </div>

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
    </div>
  );
}
