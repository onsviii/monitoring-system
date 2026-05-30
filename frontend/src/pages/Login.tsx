/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { STORAGE_KEYS, USER_ROLES } from '../config/constants';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider 
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../config/firebase';
import { createProfile } from '../api/profileService';

// Helper to encode Unicode strings with btoa safely
const safeBtoa = (str: string) => {
  return btoa(unescape(encodeURIComponent(str)));
};

export default function Login() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      setErrorMessage('Будь ласка, заповніть всі обов’язкові поля.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    // Автоматично визначаємо роль: якщо в email є слово "operator", то роль 'operator' (тех. оператор).
    // Інакше роль 'owner' (власник бізнесу).
    const determinedRole = email.toLowerCase().includes('operator') 
      ? USER_ROLES.TECHNICAL_OPERATOR 
      : USER_ROLES.BUSINESS_OWNER;

    try {
      let userCredential;
      if (activeTab === 'login') {
        userCredential = await signInWithEmailAndPassword(auth, email, password);
      } else {
        userCredential = await createUserWithEmailAndPassword(auth, email, password);
      }
      
      const user = userCredential.user;
      const idToken = await user.getIdToken();

      // Отримуємо або створюємо роль у Firestore
      const userDocRef = doc(db, 'users', user.uid);
      let userRole = determinedRole;

      if (activeTab === 'login') {
        let userDocSnap;
        try {
          userDocSnap = await getDoc(userDocRef);
        } catch (getErr) {
          handleFirestoreError(getErr, OperationType.GET, `users/${user.uid}`);
          throw getErr;
        }
        if (userDocSnap.exists()) {
          userRole = userDocSnap.data().role || 'owner';
        } else {
          // Якщо документа ще не існує в Firestore, записуємо визначену роль
          try {
            await setDoc(userDocRef, {
              role: determinedRole,
              email: user.email
            });
          } catch (setErr) {
            handleFirestoreError(setErr, OperationType.CREATE, `users/${user.uid}`);
            throw setErr;
          }
        }
      } else {
        // При реєстрації записуємо лише базову роль
        try {
          await setDoc(userDocRef, {
            role: determinedRole,
            email: user.email,
            createdAt: new Date().toISOString()
          });
        } catch (setErr) {
          handleFirestoreError(setErr, OperationType.CREATE, `users/${user.uid}`);
          throw setErr;
        }
      }

      // Записуємо токен та роль у localStorage
      localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, idToken);
      localStorage.setItem(STORAGE_KEYS.TOKEN, idToken); // Для повної сумісності
      localStorage.setItem(STORAGE_KEYS.USER_ROLE, userRole);

      setIsSubmitting(false);

      // Перенаправляємо відповідно до ролі чи флоу реєстрації
      if (activeTab === 'register') {
        navigate('/setup-profile');
      } else if (userRole === USER_ROLES.TECHNICAL_OPERATOR) {
        navigate('/operator');
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      setIsSubmitting(false);
      console.error(err);
      
      let friendlyMessage = 'Сталася помилка автентифікації. Спробуйте ще раз.';
      if (err?.code === 'auth/user-not-found' || err?.code === 'auth/wrong-password' || err?.code === 'auth/invalid-credential') {
        friendlyMessage = 'Невірний логін або пароль.';
      } else if (err?.code === 'auth/email-already-in-use') {
        friendlyMessage = 'Ця електронна адреса вже зареєстрована.';
      } else if (err?.code === 'auth/weak-password') {
        friendlyMessage = 'Пароль має містити щонайменше 6 символів.';
      } else if (err?.code === 'auth/invalid-email') {
        friendlyMessage = 'Некоректний формат електронної пошти.';
      } else if (err?.message) {
        friendlyMessage = `Помилка: ${err.message}`;
      }
      setErrorMessage(friendlyMessage);
    }
  };

  const handleGoogleLogin = async () => {
    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);

      const user = userCredential.user;
      const idToken = await user.getIdToken();

      const determinedRole = USER_ROLES.BUSINESS_OWNER;

      const userDocRef = doc(db, 'users', user.uid);
      let userDocSnap;
      try {
        userDocSnap = await getDoc(userDocRef);
      } catch (getErr) {
        handleFirestoreError(getErr, OperationType.GET, `users/${user.uid}`);
        throw getErr;
      }

      let userRole = determinedRole;
      let isNewUser = false;

      if (userDocSnap.exists()) {
        userRole = userDocSnap.data().role || 'owner';
      } else {
        isNewUser = true;
        try {
          await setDoc(userDocRef, {
            role: determinedRole,
            email: user.email,
            createdAt: new Date().toISOString()
          });

        } catch (setErr) {
          handleFirestoreError(setErr, OperationType.CREATE, `users/${user.uid}`);
          throw setErr;
        }
      }

      localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, idToken);
      localStorage.setItem(STORAGE_KEYS.TOKEN, idToken);
      localStorage.setItem(STORAGE_KEYS.USER_ROLE, userRole);

      setIsSubmitting(false);

      if (isNewUser) {
        navigate('/setup-profile');
      } else if (userRole === USER_ROLES.TECHNICAL_OPERATOR) {
        navigate('/operator');
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      setIsSubmitting(false);
      console.warn("Вхід через Google скасовано або завершився помилкою:", err);
      if (err?.code === 'auth/popup-closed-by-user' || err?.code === 'auth/cancelled-popup-request') {
        setErrorMessage('Вхід через Google було скасовано.');
      } else if (err?.code === 'auth/popup-blocked') {
        setErrorMessage('Браузер заблокував спливаюче вікно Google. Спробуйте увійти за допомогою Email/Пароля або дозвольте спливаючі вікна для цього сайту.');
      } else {
        setErrorMessage('Сталася помилка входу через Google (можливо, доступ заблоковано вбудованим фреймом). Будь ласка, скористайтеся входом за Email/Паролем.');
      }
    }
  };
  return (
    <div id="login-page" className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-gray-50/50 px-4 py-12">
      <div className="w-full max-w-[400px]">
        <div className="bg-white border border-gray-200 rounded-xl p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex flex-col items-center text-center space-y-2">
            <h2 className="text-xl font-extrabold tracking-tight text-gray-900">
              SmartBiz Monitor
            </h2>
            <p className="text-xs text-gray-500">
              Аналіз ринку та підтримка стратегічних рішень
            </p>
          </div>
          
          {/* Вкладки: Вхід / Реєстрація */}
          <div className="flex border-b border-gray-200">
            <div 
              onClick={() => {
                setActiveTab('login');
                setErrorMessage('');
              }}
              className={`flex-1 text-center pb-3 text-xs transition-colors cursor-pointer select-none font-semibold ${
                activeTab === 'login' 
                  ? 'text-blue-600 border-b-2 border-blue-600' 
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Вхід
            </div>
            <div 
              onClick={() => {
                setActiveTab('register');
                setErrorMessage('');
              }}
              className={`flex-1 text-center pb-3 text-xs transition-colors cursor-pointer select-none font-semibold ${
                activeTab === 'register' 
                  ? 'text-blue-600 border-b-2 border-blue-600' 
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Реєстрація
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMessage && (
              <div className="bg-rose-50 border border-rose-150 rounded-lg p-2.5 text-xs font-semibold text-rose-700 text-center">
                {errorMessage}
              </div>
            )}

            <div>
              <span className="text-xs font-semibold text-gray-600 mb-1.5 block">Електронна пошта</span>
              <input 
                type="email" 
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setErrorMessage('');
                }}
                placeholder="name@company.com"
                className="w-full bg-gray-50 border border-gray-200 focus:bg-white focus:border-blue-500 rounded-lg h-10 px-3 text-xs text-gray-800 font-medium outline-none transition-all duration-200"
              />
            </div>

            <div>
              <span className="text-xs font-semibold text-gray-600 mb-1.5 block">Пароль</span>
              <input 
                type="password" 
                required
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setErrorMessage('');
                }}
                placeholder="••••••••"
                className="w-full bg-gray-50 border border-gray-200 focus:bg-white focus:border-blue-500 rounded-lg h-10 px-3 text-xs text-gray-800 font-medium outline-none transition-all duration-200"
              />
            </div>

            <button 
              type="submit"
              disabled={isSubmitting}
              className="bg-blue-600 hover:bg-blue-700 border-none rounded-lg h-10 w-full text-white text-xs font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75 focus:outline-none"
            >
              {isSubmitting 
                ? 'Завантаження...' 
                : activeTab === 'login' ? 'Увійти до акаунту' : 'Зареєструватись'
              }
            </button>
          </form>

          <div className="flex items-center gap-2">
            <div className="flex-1 h-[1px] bg-gray-200"></div>
            <span className="text-xs font-medium text-gray-400 select-none px-1">або</span>
            <div className="flex-1 h-[1px] bg-gray-200"></div>
          </div>

          {/* Google Button */}
          <button 
            type="button"
            onClick={handleGoogleLogin}
            className="bg-white hover:bg-gray-50 border border-gray-200 rounded-lg h-10 w-full text-xs font-semibold text-gray-700 flex items-center justify-center gap-2 transition-colors cursor-pointer focus:outline-none"
          >
            {/* Проста іконка Google у SVG форматі */}
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
            </svg>
            Продовжити через Google
          </button>

          {/* Toggle link */}
          <p className="text-xs text-gray-500 text-center select-none font-medium">
            {activeTab === 'login' ? (
              <>
                Немає акаунту? <span onClick={() => { setActiveTab('register'); setErrorMessage(''); }} className="text-blue-600 font-semibold cursor-pointer hover:underline">Зареєструватись</span>
              </>
            ) : (
              <>
                Вже є акаунт? <span onClick={() => { setActiveTab('login'); setErrorMessage(''); }} className="text-blue-600 font-semibold cursor-pointer hover:underline">Увійти</span>
              </>
            )}
          </p>

          <p className="text-[11px] text-gray-400 text-center select-none pt-4 border-t border-gray-100">
            © 2026 SmartBiz Competitive Intelligence. Усі права захищено.
          </p>


        </div>
      </div>
    </div>
  );
}
