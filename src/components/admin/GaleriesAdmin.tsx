import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, doc, deleteDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { Loader2, Plus, Trash2, X, Image as ImageIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import ImageUploader from './ImageUploader';
import { motion, AnimatePresence } from 'motion/react';
import { handleFirestoreError, OperationType } from '../../firebase';
import { toast } from 'react-hot-toast';

export default function GaleriesAdmin() {
  const { t } = useTranslation();
  const [galeries, setGaleries] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [location, setLocation] = useState('');
  const [category, setCategory] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [coverImage, setCoverImage] = useState<string>('');

  useEffect(() => {
    const q = query(collection(db, 'galeries'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setGaleries(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setIsLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'galeries');
      setIsLoading(false);
    });
    return () => unsub();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !date || !location || images.length === 0) {
      toast.error(t('dashboard_fill_all_fields', 'Veuillez remplir tous les champs obligatoires et ajouter au moins une image.'));
      return;
    }

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'galeries'), {
        title,
        date,
        location,
        category: category || 'General',
        images,
        coverImage: images[0],
        createdAt: serverTimestamp()
      });
      toast.success(t('dashboard_success', 'Opération réussie.'));
      resetForm();
    } catch (error) {
      console.error(error);
      handleFirestoreError(error, OperationType.CREATE, 'galeries');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm(t('delete_confirm', 'Êtes-vous sûr de vouloir supprimer cet élément ?'))) {
      try {
        await deleteDoc(doc(db, 'galeries', id));
        toast.success(t('dashboard_success', 'Supprimé avec succès.'));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, 'galeries');
      }
    }
  };

  const resetForm = () => {
    setTitle('');
    setDate('');
    setLocation('');
    setCategory('');
    setImages([]);
    setIsAdding(false);
  };

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="animate-spin text-gold w-8 h-8" /></div>;
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 shadow-sm border border-gray-100">
        <div>
          <h2 className="text-2xl font-serif text-black-rich">Gestion des Galeries</h2>
          <p className="text-gray-500 text-sm mt-1">Gérez les albums photos de vos événements</p>
        </div>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className="btn-gold flex items-center gap-2"
        >
          {isAdding ? <X size={18} /> : <Plus size={18} />}
          {isAdding ? t('cancel') : 'Nouvelle Galerie'}
        </button>
      </div>

      <AnimatePresence>
        {isAdding && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <form onSubmit={handleSubmit} className="bg-white p-6 shadow-sm border border-gray-100 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs uppercase tracking-widest font-bold text-gray-500 mb-2">Titre de l'événement *</label>
                  <input type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full p-3 border border-gray-200 text-sm" required />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-widest font-bold text-gray-500 mb-2">Lieu *</label>
                  <input type="text" value={location} onChange={e => setLocation(e.target.value)} className="w-full p-3 border border-gray-200 text-sm" required />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-widest font-bold text-gray-500 mb-2">Date (ex: 15 Décembre 2025) *</label>
                  <input type="text" value={date} onChange={e => setDate(e.target.value)} className="w-full p-3 border border-gray-200 text-sm" required />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-widest font-bold text-gray-500 mb-2">Catégorie</label>
                  <input type="text" value={category} onChange={e => setCategory(e.target.value)} placeholder="Ex: Masterclass, Gala..." className="w-full p-3 border border-gray-200 text-sm" />
                </div>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-widest font-bold text-gray-500 mb-2">Ajouter des images *</label>
                <div className="p-4 border border-dashed border-gray-300 bg-gray-50 flex items-center justify-center min-h-[150px]">
                  <ImageUploader 
                    label="Cliquez pour envoyer une image"
                    currentUrl=""
                    onUploadSuccess={(url) => setImages(prev => [...prev, url])}
                  />
                </div>
                {images.length > 0 && (
                  <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                    {images.map((img, i) => (
                      <div key={i} className="relative aspect-square group">
                        <img src={img} className="w-full h-full object-cover rounded-sm border border-gray-200" alt="" />
                        <button 
                          type="button"
                          onClick={() => setImages(images.filter((_, idx) => idx !== i))}
                          className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-4 border-t border-gray-100">
                <button type="submit" disabled={isSubmitting} className="btn-gold flex items-center gap-2">
                  {isSubmitting && <Loader2 size={16} className="animate-spin" />}
                  Enregistrer la galerie
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-white shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50/50 text-gray-500 text-xs uppercase tracking-widest font-bold">
            <tr>
              <th className="p-4 font-normal">Galerie</th>
              <th className="p-4 font-normal">Catégorie</th>
              <th className="p-4 font-normal">Date / Lieu</th>
              <th className="p-4 font-normal">Images</th>
              <th className="p-4 font-normal text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {galeries.map((galerie) => (
              <tr key={galerie.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <img src={galerie.coverImage} alt="" className="w-12 h-12 object-cover rounded bg-gray-100" />
                    <span className="font-medium">{galerie.title}</span>
                  </div>
                </td>
                <td className="p-4">
                  <span className="px-2 py-1 bg-gray-100 text-[10px] uppercase font-bold text-gray-600 rounded">
                    {galerie.category}
                  </span>
                </td>
                <td className="p-4 text-gray-500">
                  {galerie.date} <br />
                  <span className="text-xs">{galerie.location}</span>
                </td>
                <td className="p-4">
                  <span className="flex items-center gap-1 text-gray-500">
                    <ImageIcon size={14} /> {galerie.images?.length || 0}
                  </span>
                </td>
                <td className="p-4 text-right space-x-2">
                  <button 
                    onClick={() => handleDelete(galerie.id)}
                    className="p-2 text-red-500 hover:bg-red-50 hover:text-red-600 rounded transition-colors"
                    title="Supprimer"
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
            {galeries.length === 0 && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-gray-400">
                  Aucune galerie pour le moment
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}
