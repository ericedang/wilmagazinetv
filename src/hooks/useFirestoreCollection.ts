import { useState, useEffect } from 'react';
import { db, collection, query, orderBy, onSnapshot, OperationType, handleFirestoreError } from '../firebase';

export function useFirestoreCollection<T>(collectionName: string, orderField: string = 'createdAt', orderDirection: 'asc' | 'desc' = 'desc') {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, collectionName), orderBy(orderField, orderDirection));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as (T & { id: string })[];
      
      setData(items);
      setLoading(false);
    }, (err) => {
      console.error(`Error fetching ${collectionName}:`, err);
      setError(err.message);
      setLoading(false);
      handleFirestoreError(err, OperationType.LIST, collectionName);
    });

    return () => unsubscribe();
  }, [collectionName, orderField, orderDirection]);

  return { data, loading, error };
}
