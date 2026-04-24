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
    console.warn("React-PDF failed to load, falling back to iframe:", error?.message || error);
    setIsPdfError(true);
  }

  const safePdfUrl = pdfUrl === '#' ? 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf' : pdfUrl;
  const googleDocsFallbackUrl = pdfUrl;

  const handleDownload = (e: React.MouseEvent) => {
    e.preventDefault();
    const link = document.createElement('a');
    link.href = safePdfUrl;
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

  const isCloudinaryPdf = pdfUrl.includes('cloudinary.com') && pdfUrl.toLowerCase().endsWith('.pdf');
  const [cloudPage, setCloudPage] = useState<number>(1);
  const [maxCloudPage, setMaxCloudPage] = useState<number | null>(null);
  const [cloudImgLoading, setCloudImgLoading] = useState(true);

  const getCloudinaryPageUrl = (url: string, page: number) => {
    const parts = url.split('/upload/');
    if (parts.length !== 2) return url;
    const suffix = parts[1].replace(/\.pdf$/i, '.jpg');
    return `${parts[0]}/upload/pg_${page}/${suffix}`;
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] bg-black/95 backdrop-blur-md flex flex-col"
    >
      {/*... header */}
      <div className="p-6 border-b border-white/10 flex justify-between items-center bg-black-rich">
        <div className="flex items-center gap-4">
          <FileText className="text-gold" />
          <h2 className="text-white font-serif text-xl">{title}</h2>
        </div>
        <div className="flex items-center gap-6">
          {isPremium && !isCloudinaryPdf && (
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
          drivePreviewUrl ? (
            <iframe 
              src={drivePreviewUrl} 
              className="w-full h-full border-none" 
              title={title}
              allow="autoplay"
            />
          ) : isCloudinaryPdf ? (
            <div className="h-full w-full flex flex-col overflow-hidden">
               <div className="flex-grow overflow-y-auto w-full flex justify-center p-4 custom-scrollbar relative">
                 {cloudImgLoading && (
                   <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-gold z-10 bg-gray-900/50 backdrop-blur-sm">
                     <Loader2 className="animate-spin" size={48} />
                   </div>
                 )}
                 <img 
                   src={getCloudinaryPageUrl(pdfUrl, cloudPage)} 
                   className="shadow-2xl shadow-black max-w-full h-auto object-contain"
                   style={{ width: Math.min(window.innerWidth * 0.9, 1000) }}
                   onLoad={() => setCloudImgLoading(false)}
                   onError={() => {
                     setCloudImgLoading(false);
                     if (cloudPage > 1) {
                        setMaxCloudPage(cloudPage - 1);
                        setCloudPage(cloudPage - 1);
                     } else {
                        // Error on page 1
                        setIsPdfError(true);
                     }
                   }}
                   alt={`Page ${cloudPage}`}
                   referrerPolicy="no-referrer"
                 />
               </div>
               <div className="h-20 bg-black-rich border-t border-white/5 flex items-center justify-between px-4 md:px-8 w-full flex-shrink-0">
                  <button 
                    onClick={() => { setCloudImgLoading(true); setCloudPage(prev => Math.max(prev - 1, 1)); }}
                    disabled={cloudPage <= 1}
                    className="p-3 text-white disabled:text-gray-700 hover:text-gold transition-colors flex items-center gap-2"
                  >
                    <ChevronLeft /> Précédent
                  </button>
                  
                  <div className="text-gray-400 text-sm font-mono bg-black/50 px-6 py-2 rounded-full border border-white/10">
                    <span className="text-white font-bold">{cloudPage}</span> {maxCloudPage ? ` / ${maxCloudPage}` : ''}
                  </div>

                  <button 
                    onClick={() => { setCloudImgLoading(true); setCloudPage(prev => prev + 1); }}
                    disabled={maxCloudPage !== null && cloudPage >= maxCloudPage}
                    className="p-3 text-white disabled:text-gray-700 hover:text-gold transition-colors flex items-center gap-2"
                  >
                    Suivant <ChevronRight />
                  </button>
                </div>
            </div>
          ) : isPdfError ? (
            <div className="flex flex-col items-center justify-center h-full w-full p-8 text-center text-white max-w-lg">
              <AlertCircle size={64} className="text-gold mb-6" />
              <p className="text-gray-200 mb-4 text-xl font-serif">Aperçu indisponible</p>
              <p className="text-gray-400 mb-6 text-sm leading-relaxed">
                Le navigateur ne permet pas l'affichage direct de ce fichier (sécurité ou limites de l'hébergeur).
                {pdfUrl.includes('cloudinary.com') && " L'hébergeur Cloudinary bloque notamment la lecture en ligne."}
              </p>
              <a 
                href={safePdfUrl} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="btn-gold flex items-center gap-2"
              >
                <ExternalLink size={20} />
                Ouvrir le magazine (Nouvel onglet)
              </a>
            </div>
          ) : (
            <div className="h-full w-full flex flex-col overflow-hidden">
              <div className="flex-grow overflow-y-auto w-full flex justify-center p-4 custom-scrollbar">
                <Document
                  file={safePdfUrl}
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
                <div className="h-20 bg-black-rich border-t border-white/5 flex items-center justify-between px-4 md:px-8 w-full flex-shrink-0">
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
