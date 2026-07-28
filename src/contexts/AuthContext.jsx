import { createContext, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
  signOut,
} from 'firebase/auth';
import { ref, update, serverTimestamp } from 'firebase/database';
import { auth, googleProvider, rtdb } from '../lib/firebase';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

/**
 * 로그인 상태를 앱 전역에 공급한다.
 * 계정은 Firebase Auth 가, 프로필은 Realtime Database(/users/{uid})가 들고 있다.
 * 게임 진행도 자체는 아직 기기별 localStorage 에 남아 있고, 로그인은 "초기 진입 관문"이다.
 */

// 로그인/DB 쓰기 시 프로필을 최신화 — 규칙에 막혀도 로그인은 실패하지 않게 조용히 무시한다
async function syncProfile(user, extra = {}) {
  try {
    await update(ref(rtdb, `users/${user.uid}`), {
      email: user.email ?? null,
      displayName: user.displayName ?? extra.displayName ?? null,
      lastLogin: serverTimestamp(),
      ...extra,
    });
  } catch {
    /* DB 규칙 미설정 등 — 로그인 흐름은 계속 진행 */
  }
}

// 계정별 "닉네임 설정 완료" 플래그(기기 localStorage). 이메일·구글 모두 최초 1회 모달을 띄우고,
// 한 번 정하면 다시 안 뜨게 한다.
const nickKey = (uid) => `matjip-nick-${uid}`;

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [nickDone, setNickDone] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setNickDone(u ? localStorage.getItem(nickKey(u.uid)) === '1' : false);
      setLoading(false);
    });
    return unsub;
  }, []);

  // 이메일 가입은 닉네임 없이 계정만 만든다. 닉네임은 메인 진입 후 모달에서 받는다.
  const signUpWithEmail = async (email, password) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await syncProfile(cred.user, { provider: 'password' });
    return cred.user;
  };

  // 닉네임 모달·설정탭에서 호출 — Auth displayName + RTDB 프로필 갱신 + 완료 플래그 저장
  const updateNickname = async (nickname) => {
    if (!auth.currentUser) return;
    await updateProfile(auth.currentUser, { displayName: nickname });
    await syncProfile(auth.currentUser, { displayName: nickname });
    localStorage.setItem(nickKey(auth.currentUser.uid), '1');
    setNickDone(true);
    setUser({ ...auth.currentUser }); // displayName 갱신 반영
  };

  const signInWithEmail = async (email, password) => {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    await syncProfile(cred.user);
    return cred.user;
  };

  const signInWithGoogle = async () => {
    const cred = await signInWithPopup(auth, googleProvider);
    await syncProfile(cred.user, { provider: 'google' });
    return cred.user;
  };

  const logout = () => signOut(auth);

  // 최초 진입(이메일·구글 공통)에 아직 닉네임을 확정하지 않았으면 모달을 띄운다
  const needsNickname = !!user && !nickDone;

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        needsNickname,
        signUpWithEmail,
        signInWithEmail,
        signInWithGoogle,
        updateNickname,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
