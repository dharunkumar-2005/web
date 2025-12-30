import React, { useState, useEffect } from 'react';
import { db } from './firebase'; 
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

// INGA DHAN UNGA IP ADDRESS-AH POTTURUKKAEN
const MY_HOTSPOT_IP = "106.197.121.197"; 

const AdminDashboard = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isHotspotConnected, setIsHotspotConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [presentStudents, setPresentStudents] = useState<any[]>([]);
  const [allStudents, setAllStudents] = useState<any[]>([]);

  useEffect(() => {
    const checkAccess = async () => {
      // 1. IP Check Logic
      try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        
        if (data.ip === MY_HOTSPOT_IP) {
          setIsHotspotConnected(true);
        }
      } catch (err) {
        console.error("IP Check Failed");
      }

      // 2. Admin Check
      const adminStatus = localStorage.getItem('isAdmin');
      if (adminStatus === 'true') {
        setIsAdmin(true);
        
        // Data Sync
        const q = query(collection(db, "attendance"), orderBy("timestamp", "desc"));
        const unsubPresent = onSnapshot(q, (s) => setPresentStudents(s.docs.map(d => ({ id: d.id, ...d.data() }))));
        const unsubAll = onSnapshot(collection(db, "students"), (s) => setAllStudents(s.docs.map(d => ({ id: d.id, ...d.data() }))));

        setLoading(false);
        return () => { unsubPresent(); unsubAll(); };
      }
      setLoading(false);
    };

    checkAccess();
  }, []);

  if (loading) return <div style={{color:'white', textAlign:'center', marginTop:'50px'}}>Authenticating...</div>;

  // HOTSPOT CHECK
  if (!isHotspotConnected) {
    return (
      <div style={{ backgroundColor: '#0f172a', height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'white' }}>
        <h2 style={{textAlign:'center'}}>🚫 Access Restricted<br/><span style={{fontSize:'14px', color:'#94a3b8'}}>Please connect to authorized Hotspot</span></h2>
      </div>
    );
  }

  // ADMIN CHECK
  if (!isAdmin) {
    return (
      <div style={{ backgroundColor: '#0f172a', height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'white' }}>
        <h1>🚫 Admin Key Required</h1>
      </div>
    );
  }

  // MAIN DASHBOARD UI
  return (
    <div style={{ padding: '20px', backgroundColor: '#0f172a', minHeight: '100vh', color: 'white', fontFamily: 'sans-serif' }}>
      <h2 style={{ textAlign: 'center', color: '#38bdf8' }}>Admin Dashboard - Secure</h2>
      <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', margin: '30px 0' }}>
        <div style={cardStyle}>Total: {allStudents.length}</div>
        <div style={cardStyle}>Present: {presentStudents.length}</div>
      </div>
      <div style={{ maxWidth: '300px', margin: '0 auto', background:'#1e293b', padding:'20px', borderRadius:'15px' }}>
        <Pie data={{
          labels: ['Present', 'Absent'],
          datasets: [{
            data: [presentStudents.length, allStudents.length - presentStudents.length],
            backgroundColor: ['#22c55e', '#ef4444'],
          }]
        }} />
      </div>
    </div>
  );
};

const cardStyle = { background: '#1e293b', padding: '20px', borderRadius: '10px', minWidth: '120px', textAlign: 'center' as const };

export default AdminDashboard;