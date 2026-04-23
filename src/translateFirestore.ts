import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import { GoogleGenAI } from '@google/genai';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
dotenv.config();

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function translateText(text: string): Promise<string> {
  if (!text) return '';
  const prompt = `Translate the following French text into high-quality professional English. 
Retain any markdown formatting (like ###, **, etc.). DO NOT add any extra conversational text or quotes around the output, just provide the translation:

${text}`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
  });
  return response.text || '';
}

async function translateArticles() {
  const articlesSnap = await getDocs(collection(db, 'articles'));
  for (const docSnap of articlesSnap.docs) {
    const data = docSnap.data();
    if (!data.title_en || !data.content_en) {
      console.log(`Translating article: ${data.title}`);
      
      const title_en = await translateText(data.title || '');
      const excerpt_en = await translateText(data.excerpt || data.summary || '');
      const content_en = await translateText(data.content || '');
      const category_en = await translateText(data.category || '');

      await updateDoc(doc(db, 'articles', docSnap.id), {
        title_en,
        excerpt_en,
        content_en,
        category_en
      });
      console.log(` -> Done ${docSnap.id}`);
    }
  }
}

async function translateEvents() {
  const snap = await getDocs(collection(db, 'events'));
  for (const docSnap of snap.docs) {
    const data = docSnap.data();
    if (!data.title_en || !data.description_en) {
      console.log(`Translating event: ${data.title}`);
      
      const title_en = await translateText(data.title || '');
      const description_en = await translateText(data.description || '');
      const location_en = await translateText(data.location || '');
      const date_en = await translateText(data.date || '');

      await updateDoc(doc(db, 'events', docSnap.id), {
        title_en,
        description_en,
        location_en,
        date_en
      });
      console.log(` -> Done ${docSnap.id}`);
    }
  }
}

async function translateVideos() {
  const snap = await getDocs(collection(db, 'videos'));
  for (const docSnap of snap.docs) {
    const data = docSnap.data();
    if (!data.title_en || !data.description_en) {
      console.log(`Translating video: ${data.title}`);
      
      const title_en = await translateText(data.title || '');
      const description_en = await translateText(data.description || '');
      const category_en = await translateText(data.category || '');

      await updateDoc(doc(db, 'videos', docSnap.id), {
        title_en,
        description_en,
        category_en
      });
      console.log(` -> Done ${docSnap.id}`);
    }
  }
}

async function main() {
  await translateArticles();
  await translateEvents();
  await translateVideos();
  console.log("All translations complete.");
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
