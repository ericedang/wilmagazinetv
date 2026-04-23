import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import * as fs from 'fs';

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function main() {
  const articlesSnap = await getDocs(collection(db, 'articles'));
  const articles = [];
  articlesSnap.forEach(snap => {
    const data = snap.data();
    if (!data.title_en || !data.content_en) {
      articles.push({ id: snap.id, collection: 'articles', ...data });
    }
  });

  const videosSnap = await getDocs(collection(db, 'videos'));
  const videos = [];
  videosSnap.forEach(snap => {
    const data = snap.data();
    if (!data.title_en || !data.description_en) {
      videos.push({ id: snap.id, collection: 'videos', ...data });
    }
  });

  const eventsSnap = await getDocs(collection(db, 'events'));
  const events = [];
  eventsSnap.forEach(snap => {
    const data = snap.data();
    if (!data.title_en || !data.description_en) {
      events.push({ id: snap.id, collection: 'events', ...data });
    }
  });

  const data = { articles, videos, events };
  fs.writeFileSync('./needs-translation.json', JSON.stringify(data, null, 2));
  console.log("Dumped to needs-translation.json");
}
main().catch(console.error);
