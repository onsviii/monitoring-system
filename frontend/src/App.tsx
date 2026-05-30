/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { onIdTokenChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from './config/firebase';
import { STORAGE_KEYS } from './config/constants';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Report from './pages/Report';
import OperatorPanel from './pages/OperatorPanel';
import Landing from './pages/Landing';
import ProfileSetup from './pages/ProfileSetup';
import Footer from './components/Footer';

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname]);

  return null;
}

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onIdTokenChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        try {
          const idToken = await firebaseUser.getIdToken();
          localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, idToken);
          localStorage.setItem(STORAGE_KEYS.TOKEN, idToken);
        } catch (tokenErr) {
          console.error("Не вдалося отримати JWT токен:", tokenErr);
        }
        try {
          const path = `users/${firebaseUser.uid}`;
          let userDocSnap;
          try {
            userDocSnap = await getDoc(doc(db, 'users', firebaseUser.uid));
          } catch (firstErr) {
            handleFirestoreError(firstErr, OperationType.GET, path);
            throw firstErr; // keeps the flow expected downstream if they bypass handle error
          }
          if (userDocSnap.exists()) {
            const role = userDocSnap.data().role;
            setUserRole(role || 'owner');
            localStorage.setItem(STORAGE_KEYS.USER_ROLE, role || 'owner');
          } else {
            // Якщо документа немає, визначаємо на основі пошти і створюємо його в Firestore
            const determinedRole = firebaseUser.email?.toLowerCase().includes('operator')
              ? 'operator'
              : 'owner';
            setUserRole(determinedRole);
            localStorage.setItem(STORAGE_KEYS.USER_ROLE, determinedRole);
          }
        } catch (err) {
          console.error("Помилка завантаження ролі з Firestore:", err);
          const localRole = localStorage.getItem(STORAGE_KEYS.USER_ROLE);
          setUserRole(localRole || (firebaseUser.email?.toLowerCase().includes('operator') ? 'operator' : 'owner'));
        }
      } else {
        setUserRole(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const handleNavClick = (e: React.MouseEvent, path: string) => {
    if (!user) {
      e.preventDefault();
      setNotification('Будь ласка, авторизуйтесь у системі для доступу до цієї сторінки.');
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
      localStorage.removeItem(STORAGE_KEYS.TOKEN);
      localStorage.removeItem(STORAGE_KEYS.USER_ROLE);
      setUserRole(null);
    } catch (err) {
      console.error('Помилка при виході:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <ScrollToTop />
      <div id="app-root" className="flex min-h-screen flex-col font-sans text-gray-900 bg-gray-50 relative">
        {/* Красиве кастомне спливаюче сповіщення */}
        {notification && (
          <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 max-w-md w-full px-4 duration-300 ease-out">
            <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-lg shadow-xl flex items-start justify-between border border-amber-200">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-amber-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-amber-800">
                    {notification}
                  </p>
                </div>
              </div>
              <div className="ml-4 flex-shrink-0 flex">
                <button
                  type="button"
                  onClick={() => setNotification(null)}
                  className="bg-amber-50 rounded-md inline-flex text-amber-500 hover:text-amber-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 cursor-pointer"
                >
                  <span className="sr-only">Закрити</span>
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}
        <header id="main-nav" className="bg-white border-b border-gray-200 sticky top-0 z-40">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex h-16 justify-between items-center">
              <div className="flex items-center space-x-3">
                <Link to="/" className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent hover:opacity-90 transition-opacity">
                  SmartBiz
                </Link>
              </div>
               <div className="flex items-center space-x-6">
                <nav className="flex items-center space-x-6">
                  <Link 
                    to="/" 
                    className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
                  >
                    Головна
                  </Link>
                  {user && (
                    <>
                      <Link 
                        to="/dashboard" 
                        onClick={(e) => handleNavClick(e, '/dashboard')}
                        className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
                      >
                        Новий аналіз
                      </Link>
                      <Link 
                        to="/report" 
                        onClick={(e) => handleNavClick(e, '/report')}
                        className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
                      >
                        Результати
                      </Link>
                      <Link 
                        to="/setup-profile" 
                        onClick={(e) => handleNavClick(e, '/setup-profile')}
                        className="text-sm font-semibold text-blue-600 hover:text-blue-700 bg-blue-50/70 hover:bg-blue-100/75 px-3 py-1.5 rounded-lg transition-all"
                      >
                        Мій бізнес
                      </Link>
                      {userRole === 'operator' && (
                        <Link 
                          to="/operator" 
                          onClick={(e) => handleNavClick(e, '/operator')}
                          className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
                        >
                          Панель оператора
                        </Link>
                      )}
                    </>
                  )}
                </nav>
                
                {user ? (
                  <button
                    onClick={handleLogout}
                    className="text-sm font-medium text-rose-600 hover:text-rose-700 transition-colors cursor-pointer bg-none border-none py-1 px-3 rounded hover:bg-rose-50"
                  >
                    Вийти
                  </button>
                ) : (
                  <Link
                    to="/login"
                    className="text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors py-1.5 px-4 rounded-lg border border-blue-200 hover:bg-blue-50 cursor-pointer text-center"
                  >
                    Вхід
                  </Link>
                )}
              </div>
            </div>
          </div>
        </header>
 
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<Landing isAuthenticated={!!user} />} />
            <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />
            <Route path="/setup-profile" element={user ? <ProfileSetup /> : <Navigate to="/" replace />} />
            <Route path="/dashboard" element={user ? <Dashboard /> : <Navigate to="/" replace />} />
            <Route path="/report" element={user ? <Report /> : <Navigate to="/" replace />} />
            <Route path="/operator" element={user && userRole === 'operator' ? <OperatorPanel /> : (user ? <Navigate to="/dashboard" replace /> : <Navigate to="/" replace />)} />
            {/* Fallback route */}
            <Route path="*" element={<Navigate to={user ? "/dashboard" : "/"} replace />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </BrowserRouter>
  );
}

