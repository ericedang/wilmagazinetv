import React, { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Upload, Loader2, Check, X, Link, Copy, Crop as CropIcon, Image as ImageIcon, Search } from 'lucide-react';
import { db, auth } from '../../firebase';
import { collection, addDoc, serverTimestamp, getDocs, query, orderBy } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import Cropper from 'react-easy-crop';
import getCroppedImg from '../../utils/cropImage';

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

  // Cropper states
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [aspect, setAspect] = useState<number | undefined>(16 / 9);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [showCropper, setShowCropper] = useState(false);
  const [selectedFilename, setSelectedFilename] = useState<string>('image.jpg');

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
        .filter((item: any) => item.type?.startsWith('image/'));
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

  const handleSelectFromMediaLibrary = (url: string) => {
    setPreview(url);
    onUploadSuccess(url);
    setShowMediaLibrary(false);
  };

  const onCropComplete = useCallback((croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const readFile = (file: File) => {
    return new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.addEventListener('load', () => resolve(reader.result as string), false);
      reader.readAsDataURL(file);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Basic validation
    if (!file.type.startsWith('image/')) {
      setError(t('dashboard_file_must_be_image') || 'File must be an image');
      return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit for Storage
      setError(t('dashboard_image_too_large', { size: '10Mo' }) || 'Image too large');
      return;
    }

    setSelectedFilename(file.name);
    setOriginalFile(file);

    try {
      const imageDataUrl = await readFile(file);
      setImageSrc(imageDataUrl);
      setShowCropper(true);
    } catch (e) {
      console.error(e);
      setError("Erreur de lecture de l'image");
    }
    
    // Reset file input so we can upload the same file again if needed
    e.target.value = '';
  };

  const performUpload = async (fileOrBlob: File | Blob, filename: string) => {
    setShowCropper(false);
    setUploading(true);
    setProgress(10);
    setError(null);

    try {
      const cloudName = 'dih0ch67r';
      const uploadPreset = 'ml_default';
      const url = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;

      const formData = new FormData();
      formData.append('file', fileOrBlob, filename);
      formData.append('upload_preset', uploadPreset);
      
      setProgress(50);
      
      // Upload to Cloudinary
      const response = await fetch(url, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }
      
      setProgress(70);
      
      const data = await response.json();
      const downloadURL = data.secure_url;
      
      setProgress(90);
      
      // Save metadata to Firestore for the media library
      await addDoc(collection(db, 'media'), {
        name: filename,
        type: fileOrBlob.type || 'image/jpeg',
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
        setImageSrc(null);
        setOriginalFile(null);
      }, 500);
    } catch (err: any) {
      console.error("Storage upload error:", err);
      setError(t('dashboard_upload_error') || "Erreur lors de l'upload");
      setUploading(false);
    }
  };

  const handleCropAndUpload = async () => {
    if (!imageSrc || !croppedAreaPixels) return;

    try {
      const croppedImageBlob = await getCroppedImg(
        imageSrc,
        croppedAreaPixels,
        0
      );

      if (!croppedImageBlob) {
        throw new Error("Failed to crop image");
      }

      await performUpload(croppedImageBlob, selectedFilename);
    } catch (err: any) {
      console.error("Crop error:", err);
      setError("Erreur lors du recadrage");
      setShowCropper(false);
    }
  };

  const handleUploadOriginal = async () => {
    if (!originalFile) return;
    await performUpload(originalFile, selectedFilename);
  };

  const copyToClipboard = () => {
    if (preview) {
      navigator.clipboard.writeText(preview);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-3 relative">
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
                      <p className="text-[10px] text-gray-400">JPG, PNG, WebP (Max 10MB)</p>
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
            <button
              onClick={(e) => { e.preventDefault(); handleOpenMediaLibrary(); }}
              className="p-3 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-md transition-all flex items-center gap-2"
              title={t('dashboard_media_library')}
            >
              <Search size={14} />
              <span className="text-[10px] font-bold uppercase tracking-widest hidden md:block">
                {t('dashboard_media_library')}
              </span>
            </button>
            {preview && (
              <button 
                onClick={(e) => { e.preventDefault(); copyToClipboard(); }}
                className={`p-3 rounded-md transition-all flex items-center gap-2 ${copied ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                title={t('dashboard_copy_url')}
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
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

      {/* Cropper Modal */}
      <AnimatePresence>
        {showCropper && imageSrc && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/95 flex flex-col items-center justify-center p-4 backdrop-blur-sm"
          >
            <div className="w-full max-w-4xl bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col">
              {/* Header */}
              <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-white">
                <h3 className="text-lg font-serif">Ajuster l'image</h3>
                <button 
                  onClick={() => {
                    setShowCropper(false);
                    setImageSrc(null);
                    setOriginalFile(null);
                  }}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500"
                >
                  <X size={20} />
                </button>
              </div>
              
              {/* Cropper Workspace */}
              <div className="relative w-full h-[50vh] bg-black">
                <Cropper
                  image={imageSrc}
                  crop={crop}
                  zoom={zoom}
                  aspect={aspect}
                  onCropChange={setCrop}
                  onCropComplete={onCropComplete}
                  onZoomChange={setZoom}
                />
              </div>

              {/* Controls */}
              <div className="p-6 bg-white flex flex-col gap-6">
                <div className="flex flex-col md:flex-row items-center gap-8">
                  <div className="flex-1 w-full flex items-center gap-4">
                    <span className="text-xs font-bold uppercase tracking-widest text-gray-400">Zoom</span>
                    <input
                      type="range"
                      value={zoom}
                      min={1}
                      max={3}
                      step={0.1}
                      aria-labelledby="Zoom"
                      onChange={(e) => setZoom(Number(e.target.value))}
                      className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-gold"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setAspect(16 / 9)} className={`px-3 py-1.5 text-xs font-bold rounded flex-1 whitespace-nowrap ${aspect === 16/9 ? 'bg-gold text-white' : 'bg-gray-100 text-gray-600'}`}>16:9</button>
                    <button onClick={() => setAspect(4 / 3)} className={`px-3 py-1.5 text-xs font-bold rounded flex-1 whitespace-nowrap ${aspect === 4/3 ? 'bg-gold text-white' : 'bg-gray-100 text-gray-600'}`}>4:3</button>
                    <button onClick={() => setAspect(1)} className={`px-3 py-1.5 text-xs font-bold rounded flex-1 whitespace-nowrap ${aspect === 1 ? 'bg-gold text-white' : 'bg-gray-100 text-gray-600'}`}>{t('dashboard_square', 'Square')}</button>
                    <button onClick={() => setAspect(undefined)} className={`px-3 py-1.5 text-xs font-bold rounded flex-1 whitespace-nowrap ${!aspect ? 'bg-gold text-white' : 'bg-gray-100 text-gray-600'}`}>{t('dashboard_free', 'Free')}</button>
                  </div>
                </div>
                
                <div className="flex flex-wrap justify-end items-center gap-3 border-t border-gray-100 pt-6">
                  <button 
                    onClick={() => {
                      setShowCropper(false);
                      setImageSrc(null);
                      setOriginalFile(null);
                    }}
                    className="px-4 py-2 text-[10px] font-bold text-gray-400 hover:text-red-500 uppercase tracking-widest transition-colors mr-auto"
                  >
                    {t('dashboard_cancel')}
                  </button>
                  <button 
                    onClick={handleUploadOriginal}
                    className="px-6 py-3 text-xs font-bold uppercase tracking-widest text-gold bg-gold/5 hover:bg-gold/15 rounded flex items-center gap-2 transition-colors"
                  >
                    <ImageIcon size={16} />
                    {t('dashboard_keep_original', 'Keep original')}
                  </button>
                  <button 
                    onClick={handleCropAndUpload}
                    className="btn-gold px-6 py-3 text-xs flex items-center gap-2"
                  >
                    <CropIcon size={16} />
                    {t('dashboard_crop_and_upload', 'Crop and upload')}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Media Library Modal */}
      <AnimatePresence>
        {showMediaLibrary && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] bg-black/95 flex flex-col items-center justify-center p-4 backdrop-blur-sm"
          >
            <div className="w-full max-w-5xl h-[80vh] bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col">
              <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10">
                <h3 className="text-lg font-serif">{t('dashboard_media_library')}</h3>
                <button 
                  onClick={() => setShowMediaLibrary(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 overflow-y-auto flex-grow bg-gray-50">
                {fetchingMedia ? (
                  <div className="flex justify-center items-center h-full">
                    <Loader2 className="animate-spin text-gold" size={48} />
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {mediaItems.map((item) => (
                      <div 
                        key={item.id} 
                        onClick={() => handleSelectFromMediaLibrary(item.data)}
                        className="group bg-white border border-gray-200 hover:border-gold cursor-pointer transition-all aspect-square relative overflow-hidden"
                      >
                        <img 
                          src={item.data} 
                          alt={item.name} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform" 
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Check size={32} className="text-white" />
                        </div>
                      </div>
                    ))}
                    {mediaItems.length === 0 && (
                      <div className="col-span-full py-12 text-center text-gray-400 italic">
                        {t('dashboard_empty_library', 'Your library is empty.')}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
