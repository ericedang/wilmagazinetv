import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '../lib/utils';

interface BackButtonProps {
  className?: string;
}

export default function BackButton({ className }: BackButtonProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <button
      onClick={() => navigate(-1)}
      className={cn(
        "flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold text-gray-400 hover:text-gold transition-all group",
        className
      )}
    >
      <div className="w-8 h-8 rounded-full border border-gray-100 flex items-center justify-center group-hover:border-gold group-hover:bg-gold/5 transition-all">
        <ArrowLeft size={14} />
      </div>
      <span>{t('back')}</span>
    </button>
  );
}
