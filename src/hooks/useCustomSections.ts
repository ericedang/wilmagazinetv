import { useState, useEffect } from 'react';
import { db, collection, query, where, onSnapshot, orderBy } from '../firebase';
import { CustomSection } from '../types';

export function useCustomSections(pageSlug: string) {
  const [sections, setSections] = useState<CustomSection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, 'custom_sections'),
      where('page_slug', '==', pageSlug),
      where('is_active', '==', true),
      orderBy('order_index', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedSections = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as CustomSection[];
      setSections(fetchedSections);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching custom sections:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [pageSlug]);

  return { sections, loading };
}

// Admin version that fetches all sections (including inactive)
export function useAdminSections(pageSlug: string) {
  const [sections, setSections] = useState<CustomSection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, 'custom_sections'),
      where('page_slug', '==', pageSlug),
      orderBy('order_index', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedSections = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as CustomSection[];
      setSections(fetchedSections);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching admin sections:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [pageSlug]);

  return { sections, loading };
}
