import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db, onAuthStateChanged, doc, getDoc, setDoc, updateDoc, serverTimestamp, FirebaseUser, OperationType, handleFirestoreError, onSnapshot } from '../firebase';

interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  role: 'user' | 'editor' | 'admin' | 'super-admin';
  subscriptionStatus: 'free' | 'premium';
  favorites: string[];
  readingHistory: string[];
}

interface AuthContextType {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
  isAuthReady: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      
      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = null;
      }

      if (firebaseUser) {
        const userRef = doc(db, 'users', firebaseUser.uid);
        
        // Initial check and creation if needed
        try {
          const userDoc = await getDoc(userRef);
          if (!userDoc.exists()) {
            const isAdminEmail = firebaseUser.email === 'ericapple2021@gmail.com';
            const newProfile: UserProfile = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              displayName: firebaseUser.displayName || '',
              photoURL: firebaseUser.photoURL || '',
              role: isAdminEmail ? 'admin' : 'user',
              subscriptionStatus: isAdminEmail ? 'premium' : 'free',
              favorites: [],
              readingHistory: [],
            };
            await setDoc(userRef, {
              ...newProfile,
              createdAt: serverTimestamp(),
            });
          }
        } catch (error) {
          console.error("Error checking/creating user profile:", error);
        }

        // Real-time listener for profile
        unsubscribeProfile = onSnapshot(userRef, (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data() as UserProfile;
            const isAdminEmail = firebaseUser.email === 'ericapple2021@gmail.com';
            
            if (isAdminEmail && data.role !== 'admin') {
              updateDoc(userRef, { role: 'admin', subscriptionStatus: 'premium' });
              // The next snapshot will have the updated data
            } else {
              setProfile(data);
            }
          }
          setLoading(false);
          setIsAuthReady(true);
        }, (error) => {
          console.error("Profile listener error:", error);
          setLoading(false);
          setIsAuthReady(true);
        });
      } else {
        setProfile(null);
        setLoading(false);
        setIsAuthReady(true);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, loading, isAuthReady }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
