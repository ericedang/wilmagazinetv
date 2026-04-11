import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Save, Plus, Trash2 } from 'lucide-react';
import { CustomSection, SectionType } from '../../types';
import { db, doc, setDoc, updateDoc, deleteDoc, collection, serverTimestamp } from '../../firebase';
import ImageUploader from './ImageUploader';

interface SectionEditorProps {
  section?: CustomSection | null;
  pageSlug: string;
  orderIndex: number;
  onClose: () => void;
}

export default function SectionEditor({ section, pageSlug, orderIndex, onClose }: SectionEditorProps) {
  const { t } = useTranslation();
  const [type, setType] = useState<SectionType>(section?.section_type || 'texte');
  const [title, setTitle] = useState(section?.title || '');
  const [content, setContent] = useState<any>(section?.content || {});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!section && !content.html) {
      // Set default content based on type
      if (type === 'texte') setContent({ html: `<p>${t('dashboard_section_placeholder_html_content')}</p>` });
      if (type === 'cta') setContent({ title: t('dashboard_section_placeholder_cta_title'), description: t('dashboard_section_placeholder_cta_desc'), buttonText: t('dashboard_section_placeholder_cta_btn'), bgColor: 'bg-burgundy' });
      if (type === 'stats') setContent({ items: [{ value: '100+', label: t('dashboard_section_placeholder_stats_label') }] });
      if (type === 'cartes') setContent({ columns: 3, items: [{ title: t('dashboard_section_placeholder_card_title'), description: t('dashboard_section_placeholder_card_desc'), image: '' }] });
      if (type === 'image_seule') setContent({ image: '', caption: '', fullWidth: false });
    }
  }, [type, section, t]);

  const handleSave = async () => {
    setLoading(true);
    try {
      if (section) {
        const docRef = doc(db, 'custom_sections', section.id);
        await updateDoc(docRef, {
          section_type: type,
          title,
          content,
          updatedAt: serverTimestamp()
        });
      } else {
        const newDocRef = doc(collection(db, 'custom_sections'));
        await setDoc(newDocRef, {
          page_slug: pageSlug,
          section_type: type,
          title,
          content,
          order_index: orderIndex,
          is_active: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }
      onClose();
    } catch (error) {
      console.error("Error saving section:", error);
      setError(t('error_occurred'));
    } finally {
      setLoading(false);
    }
  };

  const renderFields = () => {
    switch (type) {
      case 'texte':
        return (
          <div className="space-y-4">
            <label className="block text-xs uppercase tracking-widest font-bold text-gray-400">{t('dashboard_section_html')}</label>
            <textarea 
              value={content.html || ''} 
              onChange={(e) => setContent({ ...content, html: e.target.value })}
              className="w-full h-64 p-4 border border-gray-200 font-mono text-sm"
              placeholder={t('dashboard_section_placeholder_html')}
            />
          </div>
        );
      case 'cta':
        return (
          <div className="space-y-4">
             <input type="text" placeholder={t('dashboard_section_placeholder_title')} value={content.title || ''} onChange={(e) => setContent({ ...content, title: e.target.value })} className="w-full p-3 border border-gray-200" />
             <textarea placeholder={t('dashboard_section_placeholder_description')} value={content.description || ''} onChange={(e) => setContent({ ...content, description: e.target.value })} className="w-full p-3 border border-gray-200" />
             <input type="text" placeholder={t('dashboard_section_button_text')} value={content.buttonText || ''} onChange={(e) => setContent({ ...content, buttonText: e.target.value })} className="w-full p-3 border border-gray-200" />
             <select value={content.bgColor || 'bg-burgundy'} onChange={(e) => setContent({ ...content, bgColor: e.target.value })} className="w-full p-3 border border-gray-200">
                <option value="bg-burgundy">{t('dashboard_color_burgundy')}</option>
                <option value="bg-black-rich">{t('dashboard_color_black')}</option>
                <option value="bg-gold">{t('dashboard_color_gold')}</option>
             </select>
          </div>
        );
      case 'stats':
        return (
          <div className="space-y-4">
            {content.items?.map((item: any, idx: number) => (
              <div key={idx} className="flex gap-4 items-center p-4 bg-gray-50 border border-gray-100">
                <input type="text" placeholder={t('dashboard_section_value')} value={item.value} onChange={(e) => {
                  const newItems = [...content.items];
                  newItems[idx].value = e.target.value;
                  setContent({ ...content, items: newItems });
                }} className="w-1/3 p-2 border border-gray-200" />
                <input type="text" placeholder={t('dashboard_section_label')} value={item.label} onChange={(e) => {
                  const newItems = [...content.items];
                  newItems[idx].label = e.target.value;
                  setContent({ ...content, items: newItems });
                }} className="flex-grow p-2 border border-gray-200" />
                <button onClick={() => {
                  const newItems = content.items.filter((_: any, i: number) => i !== idx);
                  setContent({ ...content, items: newItems });
                }} className="text-red-500"><Trash2 size={16} /></button>
              </div>
            ))}
            <button onClick={() => setContent({ ...content, items: [...(content.items || []), { value: '', label: '' }] })} className="text-xs uppercase tracking-widest font-bold text-gold flex items-center gap-2">
              <Plus size={14} /> {t('dashboard_section_add_item')}
            </button>
          </div>
        );
      case 'cartes':
        return (
          <div className="space-y-4">
            <div className="flex gap-4 items-center">
              <label className="text-xs font-bold uppercase text-gray-400">{t('dashboard_section_columns')}</label>
              <input type="number" min="1" max="4" value={content.columns || 3} onChange={(e) => setContent({ ...content, columns: parseInt(e.target.value) })} className="w-20 p-2 border border-gray-200" />
            </div>
            {content.items?.map((item: any, idx: number) => (
              <div key={idx} className="p-4 bg-gray-50 border border-gray-100 space-y-4 relative">
                <button onClick={() => {
                  const newItems = content.items.filter((_: any, i: number) => i !== idx);
                  setContent({ ...content, items: newItems });
                }} className="absolute top-2 right-2 text-red-500"><Trash2 size={16} /></button>
                <input type="text" placeholder={t('dashboard_section_placeholder_title')} value={item.title} onChange={(e) => {
                  const newItems = [...content.items];
                  newItems[idx].title = e.target.value;
                  setContent({ ...content, items: newItems });
                }} className="w-full p-2 border border-gray-200" />
                <textarea placeholder={t('dashboard_section_placeholder_description')} value={item.description} onChange={(e) => {
                  const newItems = [...content.items];
                  newItems[idx].description = e.target.value;
                  setContent({ ...content, items: newItems });
                }} className="w-full p-2 border border-gray-200" />
                <ImageUploader 
                  currentUrl={item.image} 
                  onUploadSuccess={(url) => {
                    const newItems = [...content.items];
                    newItems[idx].image = url;
                    setContent({ ...content, items: newItems });
                  }} 
                />
              </div>
            ))}
            <button onClick={() => setContent({ ...content, items: [...(content.items || []), { title: '', description: '', image: '' }] })} className="text-xs uppercase tracking-widest font-bold text-gold flex items-center gap-2">
              <Plus size={14} /> {t('dashboard_section_add_item')}
            </button>
          </div>
        );
      case 'logos':
        return (
          <div className="space-y-4">
            <label className="block text-xs uppercase tracking-widest font-bold text-gray-400">{t('dashboard_section_placeholder_logos')}</label>
            <textarea 
              value={content.items?.join('\n') || ''} 
              onChange={(e) => setContent({ ...content, items: e.target.value.split('\n').filter(l => l.trim()) })}
              className="w-full h-32 p-4 border border-gray-200 font-mono text-sm"
              placeholder="https://example.com/logo1.png"
            />
          </div>
        );
      case 'temoignages':
        return (
          <div className="space-y-4">
            {content.items?.map((item: any, idx: number) => (
              <div key={idx} className="p-4 bg-gray-50 border border-gray-100 space-y-4 relative">
                <button onClick={() => {
                  const newItems = content.items.filter((_: any, i: number) => i !== idx);
                  setContent({ ...content, items: newItems });
                }} className="absolute top-2 right-2 text-red-500"><Trash2 size={16} /></button>
                <textarea placeholder={t('dashboard_section_placeholder_quote')} value={item.text} onChange={(e) => {
                  const newItems = [...content.items];
                  newItems[idx].text = e.target.value;
                  setContent({ ...content, items: newItems });
                }} className="w-full p-2 border border-gray-200" />
                <div className="grid grid-cols-2 gap-4">
                  <input type="text" placeholder={t('dashboard_section_name')} value={item.name} onChange={(e) => {
                    const newItems = [...content.items];
                    newItems[idx].name = e.target.value;
                    setContent({ ...content, items: newItems });
                  }} className="p-2 border border-gray-200" />
                  <input type="text" placeholder={t('dashboard_section_role')} value={item.role} onChange={(e) => {
                    const newItems = [...content.items];
                    newItems[idx].role = e.target.value;
                    setContent({ ...content, items: newItems });
                  }} className="p-2 border border-gray-200" />
                </div>
              </div>
            ))}
            <button onClick={() => setContent({ ...content, items: [...(content.items || []), { text: '', name: '', role: '' }] })} className="text-xs uppercase tracking-widest font-bold text-gold flex items-center gap-2">
              <Plus size={14} /> {t('dashboard_section_add_item')}
            </button>
          </div>
        );
      case 'deux_colonnes':
        return (
          <div className="space-y-4">
             <div className="flex items-center gap-4">
                <label className="text-xs font-bold uppercase text-gray-400">{t('dashboard_section_reverse')}</label>
                <input type="checkbox" checked={content.reverse} onChange={(e) => setContent({ ...content, reverse: e.target.checked })} />
             </div>
             <textarea placeholder={t('dashboard_section_placeholder_html')} value={content.html || ''} onChange={(e) => setContent({ ...content, html: e.target.value })} className="w-full h-32 p-3 border border-gray-200" />
             <ImageUploader 
                currentUrl={content.image} 
                onUploadSuccess={(url) => setContent({ ...content, image: url })} 
             />
             <input type="text" placeholder={t('dashboard_section_button_text')} value={content.buttonText || ''} onChange={(e) => setContent({ ...content, buttonText: e.target.value })} className="w-full p-3 border border-gray-200" />
          </div>
        );
      case 'image_seule':
        return (
          <div className="space-y-4">
             <ImageUploader 
                currentUrl={content.image} 
                onUploadSuccess={(url) => setContent({ ...content, image: url })} 
             />
             <input type="text" placeholder={t('dashboard_section_placeholder_caption')} value={content.caption || ''} onChange={(e) => setContent({ ...content, caption: e.target.value })} className="w-full p-3 border border-gray-200" />
             <div className="flex items-center gap-4">
                <label className="text-xs font-bold uppercase text-gray-400">{t('dashboard_section_full_width')}</label>
                <input type="checkbox" checked={content.fullWidth} onChange={(e) => setContent({ ...content, fullWidth: e.target.checked })} />
             </div>
          </div>
        );
      default:
        return <p className="text-gray-400 italic">{t('dashboard_section_config_in_progress', { type })}</p>;
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
          <h3 className="text-xl font-serif">{section ? t('dashboard_section_edit') : t('dashboard_section_new')}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-black"><X size={24} /></button>
        </div>

        <div className="p-8 space-y-8 flex-grow">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-[10px] uppercase tracking-widest font-bold text-gray-400">{t('dashboard_section_type')}</label>
              <select 
                value={type} 
                onChange={(e) => setType(e.target.value as SectionType)}
                className="w-full p-3 border border-gray-200 bg-white"
                disabled={!!section}
              >
                <option value="texte">{t('dashboard_section_text')}</option>
                <option value="cta">{t('dashboard_section_placeholder_cta')}</option>
                <option value="stats">{t('dashboard_stats')}</option>
                <option value="cartes">{t('dashboard_section_items')}</option>
                <option value="logos">{t('dashboard_section_logos_partners')}</option>
                <option value="temoignages">{t('testimonials')}</option>
                <option value="deux_colonnes">{t('dashboard_section_two_columns')}</option>
                <option value="image_seule">{t('dashboard_section_single_image')}</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="block text-[10px] uppercase tracking-widest font-bold text-gray-400">{t('dashboard_section_title')}</label>
              <input 
                type="text" 
                value={title} 
                onChange={(e) => setTitle(e.target.value)}
                className="w-full p-3 border border-gray-200"
                placeholder={t('dashboard_section_placeholder_title')}
              />
            </div>
          </div>

          <div className="border-t border-gray-100 pt-8">
            {renderFields()}
          </div>
        </div>

        <div className="p-6 border-t border-gray-100 flex justify-end gap-4 sticky bottom-0 bg-white z-10">
          {error && <span className="text-red-500 text-[10px] font-bold uppercase tracking-widest mr-auto flex items-center gap-2 bg-red-50 px-3 py-1 rounded"><X size={12} /> {error}</span>}
          <button onClick={onClose} className="px-6 py-2 text-xs uppercase tracking-widest font-bold text-gray-400 hover:text-black">{t('dashboard_cancel')}</button>
          <button 
            onClick={handleSave} 
            disabled={loading}
            className="btn-premium px-8 flex items-center gap-2"
          >
            <Save size={16} /> {loading ? t('dashboard_loading') : t('dashboard_save')}
          </button>
        </div>
      </div>
    </div>
  );
}
