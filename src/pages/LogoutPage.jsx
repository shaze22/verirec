import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { isCounselorSubdomain } from '../lib/subdomain.js';

export default function LogoutPage() {
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(5);
  const isCounselor = isCounselorSubdomain();

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) { clearInterval(timer); navigate('/'); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [navigate]);

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 ${isCounselor ? 'bg-gray-950' : 'bg-gradient-to-br from-blue-900 to-gray-900'}`}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 text-center">

        {/* Logo */}
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" className="w-10 h-10 mx-auto">
          <rect width="32" height="32" rx="8" fill={isCounselor ? '#8b5cf6' : '#2563eb'}/>
          <polyline points="4,16 7,11 10,21 13,9 16,23 19,11 22,18 25,14 28,16"
            stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
        </svg>

        <p className={`text-sm font-bold mt-2 mb-5 ${isCounselor ? 'text-violet-500' : 'text-blue-500'}`}>
          {isCounselor ? 'Kaunselor' : 'VeriRec'}
        </p>

        <div className="flex items-center justify-center mb-4">
          <div className="w-14 h-14 bg-green-50 border border-green-100 rounded-full flex items-center justify-center">
            <svg className="w-7 h-7 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>

        <h2 className="text-xl font-bold text-gray-900">Signed Out</h2>
        <p className="text-sm text-gray-400 mt-1 mb-7">Your session has been terminated safely.</p>

        <div className="space-y-2.5">
          <button onClick={() => navigate('/auth')}
            className={`w-full py-2.5 text-white text-sm font-semibold rounded-xl transition-colors ${isCounselor ? 'bg-violet-600 hover:bg-violet-700' : 'bg-blue-600 hover:bg-blue-700'}`}>
            Sign In Again
          </button>
          <button onClick={() => navigate('/')}
            className="w-full py-2.5 bg-gray-50 text-gray-500 text-sm font-medium rounded-xl hover:bg-gray-100 transition-colors">
            Home
          </button>
        </div>

        <p className="text-xs text-gray-300 mt-5">
          Redirecting in <span className="font-semibold text-gray-400">{countdown}</span>s...
        </p>
      </div>
    </div>
  );
}
