import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import { Download, FileText, X, ChevronLeft, ChevronRight, Loader2, ExternalLink, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface MagazineViewerProps {
  pdfUrl: string;
  title: string;
  onClose: () => void;
}

const MagazineViewer: React.FC<MagazineViewerProps> = ({ pdfUrl, title, onClose }) => {
  const { profile } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isPremium = profile?.subscriptionStatus === 'premium' || profile?.role === 'admin' || profile?.role === 'super-admin' || profile?.role === 'editor';

  const [numPages, setNumPages] = useState<number>();
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [isPdfError, setIsPdfError] = useState(false);
  const [isFallbackError, setIsFallbackError] = useState(false);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    setIsPdfError(false);
  }

  function onDocumentLoadError(error: any) {
    console.warn("React-PDF failed to load, falling back to iframe:", error);
    setIsPdfError(true);
  }

  const handleDownload = (e: React.MouseEvent) => {
    e.preventDefault();
    let downloadUrl = pdfUrl;
    // Add Cloudinary attachment flag to force download if it's a cloudinary URL
    if (downloadUrl.includes('cloudinary.com') && downloadUrl.includes('/upload/')) {
      downloadUrl = downloadUrl.replace('/upload/', '/upload/fl_attachment/');
    }
    
    // Instead of using the download script which may fail async, trigger direct download
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `${title}.pdf`;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Convert Google Drive view URLs to preview URLs for native robust embedding
  const getGoogleDrivePreviewUrl = (url: string) => {
    if (!url.includes('drive.google.com')) return null;
    const match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      return `https://drive.google.com/file/d/${match[1]}/preview`;
    }
    return url.replace(/\/view.*/, '/preview');
  };

  const drivePreviewUrl = getGoogleDrivePreviewUrl(pdfUrl);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] bg-black/95 backdrop-blur-md flex flex-col"
    >
      {/* Header */}
      <div className="p-6 border-b border-white/10 flex justify-between items-center bg-black-rich">
        <div className="flex items-center gap-4">
          <FileText className="text-gold" />
          <h2 className="text-white font-serif text-xl">{title}</h2>
        </div>
        <div className="flex items-center gap-6">
          {isPremium && (
            <button 
              onClick={handleDownload}
              className="flex items-center gap-2 text-gold text-xs uppercase tracking-widest font-bold hover:text-white transition-colors"
            >
              <Download size={16} /> {t('download_pdf', 'Télécharger le PDF')}
            </button>
          )}
          <button 
            onClick={onClose}
            className="text-white hover:text-gold transition-colors"
          >
            <X size={24} />
          </button>
        </div>
      </div>

      {/* Viewer */}
      <div className="flex-grow relative bg-gray-900 overflow-hidden flex flex-col items-center justify-center">
        {isPremium ? (
          pdfUrl.includes('cloudinary.com') ? (
            <div className="flex flex-col items-center justify-center p-8 text-center text-white max-w-lg h-full">
              <AlertCircle size={64} className="text-red-500 mb-6" />
              <h3 className="text-2xl font-bold mb-4">Ancien Fichier Non Supporté</h3>
              <p className="text-gray-400 mb-6 text-lg leading-relaxed">
                Ce fichier PDF est hébergé sur un ancien système (Cloudinary) qui bloque désormais la lecture par mesure de sécurité.
              </p>
              {profile?.role === 'admin' || profile?.role === 'super-admin' ? (
                <div className="bg-black/50 p-6 rounded-lg border border-red-500/30">
                  <p className="text-white font-medium mb-4">Action requise (Administrateur) :</p>
                  <ol className="text-left text-sm text-gray-300 list-decimal pl-5 space-y-2">
                    <li>Fermez cette fenêtre.</li>
                    <li>Allez dans le Dashboard &gt; Magazines.</li>
                    <li>Modifiez ce magazine.</li>
                    <li>Re-téléversez le fichier PDF.</li>
                  </ol>
                </div>
              ) : null}
            </div>
          ) : drivePreviewUrl ? (
            <iframe 
              src={drivePreviewUrl} 
              className="w-full h-full border-none" 
              title={title}
              allow="autoplay"
            />
          ) : isPdfError ? (
            <div className="flex flex-col items-center justify-center h-full w-full">
              {!isFallbackError ? (
                 <iframe 
                    src={pdfUrl} 
                    className="w-full h-full border-none bg-white" 
                    title={title}
                    onError={() => setIsFallbackError(true)}
                 />
              ) : (
                <div className="flex flex-col items-center justify-center p-8 text-center text-white max-w-lg">
                  <AlertCircle size={64} className="text-red-500 mb-6" />
                  <p className="text-gray-400 mb-6 text-lg leading-relaxed">
                    Le lecteur ne peut pas afficher directement certains liens externes pour des raisons de sécurité de votre navigateur ou de l'hébergeur.
                  </p>
                  <a 
                    href={pdfUrl} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="btn-gold flex items-center gap-2"
                  >
                    <ExternalLink size={20} />
                    {t('dashboard_open_new_tab', 'Ouvrir le document dans un nouvel onglet')}
                  </a>
                </div>
              )}
            </div>
          ) : (
            <div className="h-full w-full flex flex-col overflow-hidden">
              <div className="flex-grow overflow-y-auto w-full flex justify-center p-4 custom-scrollbar">
                <Document
                  file={pdfUrl}
                  onLoadSuccess={onDocumentLoadSuccess}
                  onLoadError={onDocumentLoadError}
                  loading={
                    <div className="flex flex-col items-center justify-center h-full gap-4 text-gold">
                      <Loader2 className="animate-spin" size={48} />
                      <p className="text-sm font-bold tracking-widest uppercase">Chargement du magazine...</p>
                    </div>
                  }
                  className="max-w-full flex justify-center"
                >
                  <Page 
                    pageNumber={pageNumber} 
                    renderTextLayer={false}
                    renderAnnotationLayer={false}
                    className="shadow-2xl shadow-black max-w-full"
                    width={Math.min(window.innerWidth * 0.9, 1000)}
                  />
                </Document>
              </div>

              {numPages && (
                <div className="h-20 bg-black-rich border-t border-white/5 flex items-center justify-between px-8 w-full flex-shrink-0">
                  <button 
                    onClick={() => setPageNumber(prev => Math.max(prev - 1, 1))}
                    disabled={pageNumber <= 1}
                    className="p-3 text-white disabled:text-gray-700 hover:text-gold transition-colors flex items-center gap-2"
                  >
                    <ChevronLeft /> Précédent
                  </button>
                  
                  <div className="text-gray-400 text-sm font-mono bg-black/50 px-6 py-2 rounded-full border border-white/10">
                    <span className="text-white font-bold">{pageNumber}</span> / {numPages}
                  </div>

                  <button 
                    onClick={() => setPageNumber(prev => Math.min(prev + 1, numPages))}
                    disabled={pageNumber >= numPages}
                    className="p-3 text-white disabled:text-gray-700 hover:text-gold transition-colors flex items-center gap-2"
                  >
                    Suivant <ChevronRight />
                  </button>
                </div>
              )}
            </div>
          )
        ) : (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center bg-gray-900">
            <div className="text-center p-12 bg-black-rich border border-gold/20 shadow-2xl max-w-md pointer-events-auto">
              <h3 className="text-white font-serif text-2xl mb-4">{t('limited_reading')}</h3>
              <p className="text-gray-400 text-sm mb-8 leading-relaxed">
                {t('premium_access_desc')}
              </p>
              <button 
                onClick={() => navigate('/subscribe')}
                className="btn-gold w-full"
              >
                {t('subscribe_now')}
              </button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default MagazineViewer;
