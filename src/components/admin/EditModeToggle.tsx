import React from 'react';
import { useTranslation } from 'react-i18next';
import { Edit2, Save, X, Plus, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface EditModeToggleProps {
  isEditing: boolean;
  onToggle: () => void;
}

export default function EditModeToggle({ isEditing, onToggle }: EditModeToggleProps) {
  const { profile } = useAuth();
  const { t } = useTranslation();

  if (profile?.role !== 'admin') return null;

  return (
    <div className="fixed bottom-8 right-8 z-50 flex flex-col gap-4">
      <button 
        onClick={onToggle}
        className={`w-16 h-16 rounded-full shadow-2xl flex items-center justify-center transition-all duration-500 group ${
          isEditing ? 'bg-burgundy text-white' : 'bg-gold text-black-rich'
        }`}
      >
        {isEditing ? (
          <div className="relative">
             <X size={24} className="group-hover:rotate-90 transition-transform" />
             <span className="absolute -top-12 left-1/2 -translate-x-1/2 bg-black text-white text-[10px] px-2 py-1 uppercase tracking-widest whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">{t('dashboard_exit_edit')}</span>
          </div>
        ) : (
          <div className="relative">
             <Edit2 size={24} className="group-hover:scale-110 transition-transform" />
             <span className="absolute -top-12 left-1/2 -translate-x-1/2 bg-black text-white text-[10px] px-2 py-1 uppercase tracking-widest whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">{t('dashboard_edit_page')}</span>
          </div>
        )}
      </button>
    </div>
  );
}

export function AdminSectionControls({ 
  onEdit, 
  onDelete, 
  onMoveUp, 
  onMoveDown, 
  isFirst, 
  isLast 
}: { 
  onEdit: () => void; 
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
}) {
  const { t } = useTranslation();
  return (
    <div className="absolute top-4 right-4 flex gap-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
      <button onClick={onMoveUp} disabled={isFirst} className="p-2 bg-white border border-gray-200 text-gray-600 hover:text-gold disabled:opacity-30" title={t('dashboard_move_up')}><ArrowUp size={14} /></button>
      <button onClick={onMoveDown} disabled={isLast} className="p-2 bg-white border border-gray-200 text-gray-600 hover:text-gold disabled:opacity-30" title={t('dashboard_move_down')}><ArrowDown size={14} /></button>
      <button onClick={onEdit} className="p-2 bg-white border border-gray-200 text-gray-600 hover:text-gold" title={t('dashboard_edit')}><Edit2 size={14} /></button>
      <button onClick={onDelete} className="p-2 bg-white border border-gray-200 text-red-600 hover:bg-red-50" title={t('dashboard_delete')}><Trash2 size={14} /></button>
    </div>
  );
}

export function AddSectionButton({ onClick }: { onClick: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="py-8 flex items-center justify-center group relative">
       <div className="absolute inset-x-0 h-[1px] bg-dashed bg-gray-200 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity" />
       <button 
         onClick={onClick}
         className="relative z-10 bg-white border border-dashed border-gray-300 text-gray-400 hover:text-gold hover:border-gold p-4 rounded-full flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold transition-all hover:scale-105"
       >
         <Plus size={16} /> {t('dashboard_add_section')}
       </button>
    </div>
  );
}
