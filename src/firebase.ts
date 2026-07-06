import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  projectId: "southern-kite-r8gvj",
  appId: "1:82029997759:web:7352afccb971b76e7ba00a",
  apiKey: "AIzaSyCVVaJ5qphW-g6DuSG1h-TDjNqwxOWpGzg",
  authDomain: "southern-kite-r8gvj.firebaseapp.com",
  storageBucket: "southern-kite-r8gvj.firebasestorage.app",
  messagingSenderId: "82029997759"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, "ai-studio-ae12260e-4178-4242-9b7c-9ab86f096951");
