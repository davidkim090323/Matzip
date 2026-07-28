import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getDatabase } from 'firebase/database';

// Firebase 웹 설정. apiKey 등은 클라이언트에 공개되는 값이라 커밋해도 안전하다.
// (실제 접근 제어는 데이터베이스 보안 규칙이 담당한다.)
const firebaseConfig = {
  apiKey: 'AIzaSyAMC0zuJlif99ZYB7iPXnU-c9G-_-5GVfA',
  authDomain: 'matjip-conquest.firebaseapp.com',
  databaseURL: 'https://matjip-conquest-default-rtdb.asia-southeast1.firebasedatabase.app',
  projectId: 'matjip-conquest',
  storageBucket: 'matjip-conquest.firebasestorage.app',
  messagingSenderId: '986314323371',
  appId: '1:986314323371:web:9d017c6c816f6cc34d8eee',
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const rtdb = getDatabase(app);
export const googleProvider = new GoogleAuthProvider();
