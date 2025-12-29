import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, push, onValue, remove } from "firebase/database";

// FIREBASE CONFIG - Unga details
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
  button: { width: '90%', padding: '14px', backgroundColor: '#f39c12', color: 'white', border: 'none', borderRadius: '10px', fontSize: '16px', cursor: 'pointer', fontWeight: 'bold' as 'bold' },
  adminSection: { backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: '10px', padding: '15px', marginTop: '15px', textAlign: 'left' as 'left' },
  listItem: { padding: '8px 0', borderBottom: '1px solid #444', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  delBtn: { backgroundColor: '#e74c3c', color: 'white', border: 'none', borderRadius: '4px', padding: '4px 8px', fontSize: '11px', cursor: 'pointer' }
};

function App() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [regNumber, setRegNumber] = useState('');
  const [message, setMessage] = useState('');
  const [authorizedStudents, setAuthorizedStudents] = useState<any>({});
  const [attendanceData, setAttendanceData] = useState<any>({});
  
  // State for Device Lock
  const [lockedReg, setLockedReg] = useState<string | null>(() => localStorage.getItem('kncet_locked_reg'));

  const today = new Date().toLocaleDateString();

  useEffect(() => {
    onValue(ref(db, 'students'), (snapshot) => { setAuthorizedStudents(snapshot.val() || {}); });
    onValue(ref(db, 'attendance'), (snapshot) => { setAttendanceData(snapshot.val() || {}); });
  }, []);

  const handleSubmit = () => {
    const trimmedReg = regNumber.trim().toUpperCase();
    if (!Object.values(authorizedStudents).includes(trimmedReg)) {
      setMessage("❌ Student Not Authorized!");
      return;
    }
    if (lockedReg && lockedReg !== trimmedReg) {
      setMessage(`❌ Device Locked to ${lockedReg}`);
      return;
    }
    push(ref(db, 'attendance'), { regNo: trimmedReg, time: new Date().toLocaleTimeString(), date: today })
      .then(() => {
        if (!lockedReg) {
          localStorage.setItem('kncet_locked_reg', trimmedReg);
          setLockedReg(trimmedReg);
        }
        setMessage(`✅ Success: ${trimmedReg}`);
        setRegNumber('');
        setTimeout(() => setMessage(''), 3000);
      });
  };

  const studentList = Object.keys(authorizedStudents).map(key => ({ id: key, val: authorizedStudents[key] }));
  const todayList = Object.keys(attendanceData)
    .map(key => ({ id: key, ...attendanceData[key] }))
    .filter(r => r.date === today);

  return (
    <div style={styles.container}>
      <div style={styles.overlay}></div>
      <div style={styles.card}>
        {!isAdmin ? (
          <div>
            <h2 style={{color: '#f39c12'}}>KNCET PORTAL</h2>
            {lockedReg && <p style={{fontSize: '12px', color: '#2ecc71'}}>Linked: {lockedReg}</p>}
            <input style={styles.input} type="text" placeholder="REGISTER NUMBER" value={regNumber} onChange={(e) => setRegNumber(e.target.value)} />
            <button style={styles.button} onClick={handleSubmit}>SUBMIT ATTENDANCE</button>
            <p onClick={() => { if(prompt("Password:") === "1234") setIsAdmin(true); }} style={{marginTop: '30px', cursor: 'pointer', fontSize: '11px', opacity: 0.5}}>Admin Login</p>
          </div>
        ) : (
          <div style={{width: '100%', maxHeight: '85vh', overflowY: 'auto'}}>
            <h3 style={{color: '#f39c12'}}>ADMIN PANEL</h3>
            
            {/* RESET DEVICE LOCK - Inga dhaan neenga keta fix irukku */}
            <div style={{...styles.adminSection, border: '1px solid #e67e22'}}>
              <h4 style={{marginTop: 0, color: '#e67e22'}}>Device Management</h4>
              <p style={{fontSize: '11px'}}>Ippo use panra mobile-la lock aagi irukkura number-ah release panna keezha irukkura button-ah click pannunga.</p>
              <button style={{...styles.button, backgroundColor: '#e67e22', padding: '10px', fontSize: '12px'}} onClick={() => {
                localStorage.removeItem('kncet_locked_reg');
                setLockedReg(null);
                alert("This device is now unlocked! Refresh the page.");
                window.location.reload();
              }}>RESET THIS DEVICE LOCK</button>
            </div>

            <div style={styles.adminSection}>
              <div style={{display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #27ae60', paddingBottom: '5px'}}>
                <span style={{color: '#27ae60'}}>Auth Students</span>
                <button style={{backgroundColor: '#27ae60', color: '#fff', border: 'none', borderRadius: '4px'}} onClick={() => {
                  const id = prompt("Register Number:");
                  if (id) set(ref(db, 'students/' + id.toUpperCase().trim()), id.toUpperCase().trim());
                }}>+ Add</button>
              </div>
              {studentList.map(s => (
                <div key={s.id} style={styles.listItem}>
                  <span>{s.val}</span>
                  <button style={styles.delBtn} onClick={() => remove(ref(db, 'students/' + s.id))}>Del</button>
                </div>
              ))}
            </div>

            <div style={styles.adminSection}>
              <div style={{color: '#f39c12', borderBottom: '1px solid #f39c12', paddingBottom: '5px'}}>Today Presented ({todayList.length})</div>
              {todayList.slice().reverse().map(r => (
                <div key={r.id} style={styles.listItem}>
                  <span>{r.regNo}</span>
                  <button style={styles.delBtn} onClick={() => remove(ref(db, 'attendance/' + r.id))}>X</button>
                </div>
              ))}
            </div>

            <button style={{...styles.button, backgroundColor: '#2980b9', marginTop: '15px'}} onClick={() => {
              const ws = XLSX.utils.json_to_sheet(todayList.map(({id, ...rest}) => rest));
              const wb = XLSX.utils.book_new();
              XLSX.utils.book_append_sheet(wb, ws, "Report");
              XLSX.writeFile(wb, `Report_${today}.xlsx`);
            }}>Excel</button>
            <button onClick={() => setIsAdmin(false)} style={{marginTop: '15px', color: '#fff', background: 'none', border: '1px solid #fff', padding: '5px 15px', borderRadius: '5px'}}>Back</button>
          </div>
        )}
        {message && <div style={{marginTop: '15px', color: '#fff', fontSize: '13px'}}>{message}</div>}
      </div>
    </div>
  );
}

export default App;