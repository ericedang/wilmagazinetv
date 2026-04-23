import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import * as fs from 'fs';

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function main() {
  const articlesSnap = await getDocs(collection(db, 'articles'));
  articlesSnap.forEach(doc => {
    console.log(doc.id, doc.data().title, doc.data().title_en ? '(Has EN)' : '(No EN)');
  });
}
main().catch(console.error);
