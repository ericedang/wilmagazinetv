import { initializeApp } from 'firebase/app';
import { getStorage, ref, uploadString } from 'firebase/storage';
import { getAuth } from 'firebase/auth';
import fs from 'fs';

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));

const app = initializeApp(firebaseConfig);
const storage = getStorage(app, `gs://${firebaseConfig.storageBucket}`);
const auth = getAuth(app);

async function test() {
  try {
    const storageRef = ref(storage, 'test.txt');
    await uploadString(storageRef, 'hello world');
    console.log('Upload successful');
  } catch (e) {
    console.error('Upload failed:', e);
  }
  process.exit(0);
}

test();
