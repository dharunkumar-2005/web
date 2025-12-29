import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, push, onValue } from "firebase/database";

// FIREBASE CONFIG (Unga screenshot details)
const firebaseConfig = {
  apiKey: "AIzaSyCypMJilnNAD3KkM01tIh5AR7OXir4Hd0M",
  authDomain: "kncet-attendance.firebaseapp.com",
  databaseURL: "https://kncet-attendance-default-rtdb.firebaseio.com",
  projectId: "kncet-attendance",
  storageBucket: "kncet-attendance.firebasestorage.app",
  messagingSenderId: "417435764172",
  appId: "1:417435764172:web:337429ee15a1ce3476c969",
  measurementId: "G-WF67LMBG9Z"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const styles = {
  container: { minHeight: '100vh', display: 'flex', flexDirection: 'column' as 'column', alignItems: 'center', justifyContent: 'center', backgroundImage: 'url("https://universitykart.com/Content/upload/admin/yy2kmbie.0xm.jpg")', backgroundSize: 'cover', backgroundPosition: 'center', fontFamily: "'Poppins', sans-serif", padding: '20px', position: 'relative' as 'relative' },
  overlay: { position: 'absolute' as 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.85)', zIndex: 1 },
  card: { backgroundColor: 'rgba(255, 255, 255, 0.15)', padding: '25px', borderRadius: '24px', backdropFilter: 'blur(15px)', width: '100%', maxWidth: '500px', textAlign: 'center' as 'center', zIndex: 2, color: '#fff', border: '1px solid rgba(255,255,255,0.2)' },
  input: { width: '90%', padding: '14px', margin: '15px 0', borderRadius: '10px', border: 'none', fontSize: '18px', fontWeight: 'bold' as 'bold', textAlign: 'center' as 'center', color: '#333' },
  button: { width: '90%', padding: '14px', backgroundColor: '#f39c12', color: 'white', border: 'none', borderRadius: '10px', fontSize: '16px', cursor: 'pointer', fontWeight: 'bold' as 'bold', textTransform: 'uppercase' as 'uppercase' },
  adminSection: { backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: '15px', padding: '15px', marginTop: '20px', textAlign: 'left' as 'left' },
  listItem: { borderBottom: '1px solid #444', padding: '10px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }
};

function App() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [regNumber, setRegNumber] = useState('');
  const [message, setMessage] = useState('');
  const [students, setStudents] = useState<string[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);

  const todayDate = new Date().toLocaleDateString();

  useEffect(() => {
    // 1. Sync Authorized Students
    onValue(ref(db, 'students'), (snapshot) => {
      const data = snapshot.val();
      if (data) setStudents(Object.values(data));
    });

    // 2. Sync Attendance Records
    onValue(ref(db, 'attendance'), (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.keys(data).map(key => ({ id: key, ...data[key] }));
        setAttendanceRecords(list);
      }
    });
  }, []);

  const handleSubmit = () => {
    const trimmedReg = regNumber.trim().toUpperCase();
    if (!students.includes(trimmedReg)) {
      setMessage("❌ Error: Student Not Authorized by Admin!");
      return;
    }
    push(ref(db, 'attendance'), { 
      regNo: trimmedReg, 
      time: new Date().toLocaleTimeString(),
      date: todayDate
    }).then(() => {
      setMessage(`✅ Attendance Success: ${trimmedReg}`);
      setRegNumber('');
      setTimeout(() => setMessage(''), 3000);
    });
  };

  const todayPresented = attendanceRecords.filter(r => r.date === todayDate);

  return (
    <div style={styles.container}>
      <div style={styles.overlay}></div>
      <div style={styles.card}>
        {!isAdmin ? (
          <div>
            <h2 style={{color: '#f39c12', letterSpacing: '2px'}}>KNCET PORTAL</h2>
            <input style={styles.input} type="text" placeholder="ENTER REGISTER NUMBER" value={regNumber} onChange={(e) => setRegNumber(e.target.value)} />
            <button style={styles.button} onClick={handleSubmit}>SUBMIT ATTENDANCE</button>
            <p onClick={() => { if(prompt("Password:") === "1234") setIsAdmin(true); }} style={{marginTop: '40px', cursor: 'pointer', fontSize: '11px', opacity: 0.5}}>Admin Login</p>
          </div>
        ) : (
          <div style={{width: '100%'}}>
            <h3 style={{color: '#f39c12'}}>ADMIN DASHBOARD</h3>
            
            {/* 1. REGISTER NEW STUDENT SECTION */}
            <div style={{...styles.adminSection, border: '1px solid #27ae60'}}>
              <h4 style={{marginTop: 0, color: '#27ae60'}}>Step 1: Authorize Student</h4>
              <button style={{...styles.button, backgroundColor: '#27ae60', padding: '10px'}} onClick={() => {
                const id = prompt("Enter Student Register Number to Authorize:");
                if (id) {
                  const upperId = id.toUpperCase().trim();
                  set(ref(db, 'students/' + upperId), upperId);
                  alert(`Success: ${upperId} added to Database!`);
                }
              }}>+ REGISTER NEW NUMBER</button>
            </div>

            {/* 2. TODAY'S PRESENTED LIST SECTION */}
            <div style={styles.adminSection}>
              <h4 style={{marginTop: 0, color: '#f39c12'}}>Step 2: Today Presented ({todayPresented.length})</h4>
              <div style={{maxHeight: '200px', overflowY: 'auto'}}>
                {todayPresented.length === 0 ? <p style={{fontSize: '12px'}}>Waiting for attendance...</p> : 
                  todayPresented.slice().reverse().map((r, i) => (
                    <div key={i} style={styles.listItem}>
                      <span style={{fontWeight: 'bold'}}>{r.regNo}</span>
                      <span style={{fontSize: '11px', color: '#ccc'}}>{r.time}</span>
                    </div>
                  ))
                }
              </div>
            </div>

            <button style={{...styles.button, backgroundColor: '#2980b9', marginTop: '20px'}} onClick={() => {
              const exportData = todayPresented.map(({id, ...rest}) => rest);
              const ws = XLSX.utils.json_to_sheet(exportData);
              const wb = XLSX.utils.book_new();
              XLSX.utils.book_append_sheet(wb, ws, "Today_Report");
              XLSX.writeFile(wb, `Attendance_${todayDate}.xlsx`);
            }}>Download Excel</button>

            <button onClick={() => setIsAdmin(false)} style={{marginTop: '15px', color: '#fff', background: 'none', border: '1px solid #fff', padding: '5px 20px', borderRadius: '8px', fontSize: '12px'}}>Logout</button>
          </div>
        )}
        {message && <div style={{marginTop: '15px', padding: '10px', backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: '8px'}}>{message}</div>}
      </div>
    </div>
  );
}

export default App;