import React, { useState } from 'react';
import { ShieldCheck, AlertCircle, CheckCircle, Smartphone } from 'lucide-react';

interface StudentProps {
  onVerify: (num: string) => { success: boolean; msg: string };
}

const StudentPortal: React.FC<StudentProps> = ({ onVerify }) => {
  const [regNum, setRegNum] = useState('');
  const [status, setStatus] = useState<{ type: 'idle' | 'success' | 'error', message: string }>({
    type: 'idle',
    message: ''
  });

  const handleVerify = () => {
    if (!regNum.trim()) return;
    const result = onVerify(regNum.trim());
    if (result.success) {
      setStatus({ type: 'success', message: result.msg });
    } else {
      setStatus({ type: 'error', message: result.msg });
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-8 bg-white/90 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20">
      <div className="flex flex-col items-center mb-6">
        <div className="bg-indigo-100 p-3 rounded-full mb-3">
          <Smartphone className="text-indigo-600 w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800">Device Verification</h2>
        <p className="text-slate-500 text-sm text-center mt-1">Enter your Register Number to link this device</p>
      </div>
      
      <div className="space-y-5">
        <input 
          type="text" 
          value={regNum}
          onChange={(e) => {setRegNum(e.target.value); setStatus({ type: 'idle', message: '' });}}
          placeholder="Register Number (e.g. 16)"
          className="w-full p-4 border border-slate-200 rounded-xl text-center text-2xl font-mono focus:ring-4 focus:ring-indigo-100 outline-none transition-all"
        />
        
        <button 
          onClick={handleVerify} 
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-xl font-bold text-lg shadow-lg active:scale-95 transition-all"
        >
          Verify & Connect
        </button>

        {status.type === 'success' && (
          <div className="p-4 bg-green-50 border border-green-200 text-green-700 rounded-xl flex items-center gap-3 animate-bounce">
            <CheckCircle className="text-green-500 flex-shrink-0" />
            <p className="font-bold">{status.message}</p>
          </div>
        )}

        {status.type === 'error' && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-3">
            <AlertCircle className="text-red-500 flex-shrink-0" />
            <p className="font-bold">{status.message}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentPortal;