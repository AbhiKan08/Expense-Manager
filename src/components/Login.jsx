import { useEffect, useRef, useState } from 'react';
import { api } from '../api';

export default function Login({ onLogin }) {
  const btnRef     = useRef();
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    api.getConfig().then(({ googleClientId }) => {
      if (cancelled || !googleClientId) {
        setError('Google login is not configured yet. Please add GOOGLE_CLIENT_ID in Railway.');
        setLoading(false);
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.onload = () => {
        if (cancelled) return;
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: async (response) => {
            try {
              const data = await api.loginWithGoogle(response.credential);
              if (data.token) {
                localStorage.setItem('em_token', data.token);
                onLogin(data.token, data.user);
              } else {
                setError(data.error || 'Login failed');
              }
            } catch (err) {
              setError('Login failed. Please try again.');
            }
          },
        });
        window.google.accounts.id.renderButton(btnRef.current, {
          theme:    'outline',
          size:     'large',
          text:     'signin_with',
          shape:    'rectangular',
          width:    280,
        });
        setLoading(false);
      };
      document.head.appendChild(script);
    }).catch(() => {
      setError('Cannot connect to server.');
      setLoading(false);
    });

    return () => { cancelled = true; };
  }, [onLogin]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-white flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-10 w-full max-w-sm text-center">
        {/* Logo */}
        <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-md">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-1">Expense Manager</h1>
        <p className="text-sm text-gray-500 mb-8">Track every rupee across all your devices</p>

        {loading && !error && (
          <div className="flex justify-center mb-4">
            <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {error && (
          <div className="mb-4 px-4 py-3 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-lg">
            {error}
          </div>
        )}

        <div ref={btnRef} className="flex justify-center" />

        <p className="text-xs text-gray-400 mt-6">
          Your data is private and only accessible to you.
        </p>
      </div>
    </div>
  );
}
