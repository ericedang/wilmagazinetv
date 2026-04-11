import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import { Download, FileText, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { downloadFile } from '../lib/download';
import { useNavigate } from 'react-router-dom';

interface MagazineViewerProps {
  pdfUrl: string;
  title: string;
  onClose: () => void;
}

const MagazineViewer: React.FC<MagazineViewerProps> = ({ pdfUrl, title, onClose }) => {
  const { profile } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isPremium = profile?.subscriptionStatus === 'premium';

  const handleDownload = (e: React.MouseEvent) => {
    e.preventDefault();
    downloadFile(pdfUrl, `${title}.pdf`);
  };

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
          <button 
            onClick={handleDownload}
            className="flex items-center gap-2 text-gold text-xs uppercase tracking-widest font-bold hover:text-white transition-colors"
          >
            <Download size={16} /> {t('download_pdf')}
          </button>
          <button 
            onClick={onClose}
            className="text-white hover:text-gold transition-colors"
          >
            <X size={24} />
          </button>
        </div>
      </div>

      {/* Viewer */}
      <div className="flex-grow relative bg-gray-900 overflow-hidden">
        <iframe 
          src={`${pdfUrl}#toolbar=0`} 
          className="w-full h-full border-none"
          title={title}
        />
        
        {!isPremium && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="bg-black/40 backdrop-blur-[2px] w-full h-full flex items-center justify-center">
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
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default MagazineViewer;
