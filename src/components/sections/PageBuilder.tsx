import React, { useState } from 'react';
import { useCustomSections, useAdminSections } from '../../hooks/useCustomSections';
import DynamicSection from './DynamicSection';
import EditModeToggle, { AdminSectionControls, AddSectionButton } from '../admin/EditModeToggle';
import SectionEditor from '../admin/SectionEditor';
import { db, doc, deleteDoc, updateDoc } from '../../firebase';
import { CustomSection } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';

interface PageBuilderProps {
  pageSlug: string;
  nativeSections: {
    id: string;
    component: React.ReactNode;
    orderIndex: number;
  }[];
  onSelectSection?: (section: any) => void;
  externalIsEditing?: boolean;
}

export default function PageBuilder({ pageSlug, nativeSections, onSelectSection, externalIsEditing }: PageBuilderProps) {
  const { profile } = useAuth();
  const { t } = useTranslation();
  const isAdmin = profile?.role === 'admin' || profile?.role === 'super-admin';
  
  const { sections: publicSections, loading: publicLoading } = useCustomSections(pageSlug);
  const { sections: adminSections, loading: adminLoading } = useAdminSections(pageSlug);
  
  const [internalIsEditing, setInternalIsEditing] = useState(false);
  const isEditing = externalIsEditing !== undefined ? externalIsEditing : internalIsEditing;
  const setIsEditing = externalIsEditing !== undefined ? () => {} : setInternalIsEditing;
  const [editingSection, setEditingSection] = useState<CustomSection | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [targetOrderIndex, setTargetOrderIndex] = useState(0);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const sections = isEditing ? adminSections : publicSections;
  const loading = isEditing ? adminLoading : publicLoading;

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'custom_sections', id));
      setConfirmDeleteId(null);
    } catch (error) {
      console.error("Error deleting section:", error);
    }
  };

  const handleMove = async (section: CustomSection, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? section.order_index - 1 : section.order_index + 1;
    try {
      await updateDoc(doc(db, 'custom_sections', section.id), {
        order_index: newIndex
      });
    } catch (error) {
      console.error("Error moving section:", error);
    }
  };

  // Combine and sort sections
  const allSections = [
    ...nativeSections.map(s => ({ ...s, isNative: true, sortIndex: s.orderIndex })),
    ...sections.map(s => ({ ...s, isNative: false, sortIndex: s.order_index }))
  ].sort((a, b) => a.sortIndex - b.sortIndex);

  const handleUpdateSection = async (id: string, updates: Partial<CustomSection>) => {
    try {
      await updateDoc(doc(db, 'custom_sections', id), updates);
    } catch (error) {
      console.error("Error updating section:", error);
    }
  };

  return (
    <div className={`relative ${isEditing ? 'pb-32' : ''}`}>
      {allSections.map((section: any, idx: number) => (
        <div 
          key={section.id} 
          id={section.id}
          className={`relative group ${isEditing ? 'border border-dashed border-gray-200' : ''}`}
        >
          {isEditing && (
            <div className="absolute -top-3 left-4 bg-gray-100 text-[8px] uppercase tracking-widest px-2 py-0.5 z-20 font-bold text-gray-400">
              {section.isNative ? t('dashboard_section_native') : `${t('dashboard_section_custom')} (${section.section_type})`}
            </div>
          )}
          
          {section.isNative ? (
            section.component
          ) : (
            <div className="relative" onClick={() => onSelectSection?.(section)}>
              <DynamicSection 
                section={section} 
                isEditing={isEditing} 
                selectedId={editingSection?.id}
                onUpdate={(updates) => handleUpdateSection(section.id, updates)}
              />
              {isEditing && (
                <AdminSectionControls 
                  onEdit={() => setEditingSection(section)}
                  onDelete={() => setConfirmDeleteId(section.id)}
                  onMoveUp={() => handleMove(section, 'up')}
                  onMoveDown={() => handleMove(section, 'down')}
                  isFirst={idx === 0}
                  isLast={idx === allSections.length - 1}
                />
              )}
            </div>
          )}

          {isEditing && (
            <AddSectionButton onClick={() => {
              setTargetOrderIndex(section.sortIndex + 1);
              setIsAdding(true);
            }} />
          )}
        </div>
      ))}

      <EditModeToggle isEditing={isEditing} onToggle={() => setIsEditing(!isEditing)} />

      {(isAdding || editingSection) && (
        <SectionEditor 
          section={editingSection}
          pageSlug={pageSlug}
          orderIndex={targetOrderIndex}
          onClose={() => {
            setIsAdding(false);
            setEditingSection(null);
          }}
        />
      )}

      {/* Confirmation Modal for Deletion */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white max-w-md w-full p-8 rounded-2xl shadow-2xl text-center">
            <h3 className="text-xl font-serif mb-4">{t('delete_section_confirm')}</h3>
            <p className="text-gray-500 text-sm mb-8">{t('irreversible_action')}</p>
            <div className="flex gap-4">
              <button onClick={() => setConfirmDeleteId(null)} className="flex-1 px-6 py-3 text-[10px] uppercase tracking-widest font-bold text-gray-400 border border-gray-100 rounded-lg">{t('cancel')}</button>
              <button onClick={() => handleDelete(confirmDeleteId)} className="flex-1 px-6 py-3 text-[10px] uppercase tracking-widest font-bold bg-red-500 text-white rounded-lg">{t('delete')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
