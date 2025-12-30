import React, { useState, useEffect } from 'react';
import { db } from './firebase'; 
import { collection, onSnapshot, doc, deleteDoc, addDoc, query, orderBy } from 'firebase/firestore';

const AdminDashboard = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [presentStudents, setPresentStudents] = useState<any[]>([]);
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [newRegNo, setNewRegNo] = useState("");
  const [newName, setNewName] = useState("");

  useEffect(() => {
    // 1. Immediate Check for Admin
    const adminStatus = localStorage.getItem('isAdmin');
    if (adminStatus === 'true') {
      setIsAdmin(true);
      
      // 2. Data Fetching
      const qPresent = query(collection(db, "attendance"), orderBy("timestamp", "desc"));
      const unsubPresent = onSnapshot(qPresent, (snapshot) => {
        setPresentStudents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });

      const unsubAll = onSnapshot(collection(db, "students"), (snapshot) => {
        setAllStudents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });

      return () => {
        unsubPresent();
        unsubAll();
      };
    }
  }, []);

  // Logic to find Absent Students
  const absentStudents = allStudents.filter(student => 
    !presentStudents.some(present => present.regNo === student.regNo)
  );

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newRegNo && newName) {
      try {
        await addDoc(collection(db, "students"), { regNo: newRegNo, name: newName, createdAt: new Date() });
        setNewRegNo(""); setNewName("");
      } catch (err) { alert("Check Firebase Permissions!"); }
    }
  };

  const handleRemoveStudent = async (id: string) => {
    if(window.confirm("Remove student?")) await deleteDoc(doc(db, "students", id));
  };

  // IF NOT ADMIN - SHOW THIS
  if (!isAdmin) {
    return (
      <div style={{ backgroundColor: '#0f172a', height: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: 'white', fontFamily: 'sans-serif' }}>
        <h1 style={{fontSize: '50px'}}>🚫 Access Denied</h1>
        <p>Please authorize this laptop to view the Admin Dashboard.</p>
        <div style={{background: '#1e293b', padding: '15px', borderRadius: '8px', marginTop: '20px', border: '1px solid #334155'}}>
          <p style={{margin: '0', color: '#38bdf8'}}>1. Press <b>F12</b></p>
          <p style={{margin: '5px 0', color: '#38bdf8'}}>2. Go to <b>Application</b> Tab</p>
          <p style={{margin: '0', color: '#38bdf8'}}>3. Set <b>isAdmin</b> to <b>true</b> in Local Storage</p>
        </div>
      </div>
    );
  }

  // IF ADMIN - SHOW THIS
  return (
    <div style={{ padding: '20px', backgroundColor: '#0f172a', color: '#f8fafc', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      <h1 style={{ textAlign: 'center', color: '#38bdf8' }}>Admin Control Center</h1>
      
      <div style={{ maxWidth: '800px', margin: '0 auto', background: '#1e293b', padding: '20px', borderRadius: '12px', marginBottom: '30px' }}>
        <h3>Add New Student</h3>
        <form onSubmit={handleAddStudent} style={{ display: 'flex', gap: '10px' }}>
          <input type="text" placeholder="Reg No" value={newRegNo} onChange={e => setNewRegNo(e.target.value)} style={inputStyle} />
          <input type="text" placeholder="Name" value={newName} onChange={e => setNewName(e.target.value)} style={inputStyle} />
          <button type="submit" style={btnStyle}>Add</button>
        </form>
      </div>

      <div style={{ display: 'flex', gap: '20px' }}>
        <div style={tableStyle}>
          <h2 style={{color:'#22c55e'}}>Present ({presentStudents.length})</h2>
          {presentStudents.map(s => <div key={s.id} style={rowStyle}>{s.regNo}</div>)}
        </div>
        <div style={tableStyle}>
          <h2 style={{color:'#ef4444'}}>Absent ({absentStudents.length})</h2>
          {absentStudents.map(s => (
            <div key={s.id} style={rowStyle}>
              {s.regNo} - {s.name}
              <button onClick={() => handleRemoveStudent(s.id)} style={{color:'#ef4444', border:'none', background:'none', cursor:'pointer'}}>X</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const inputStyle = { flex: 1, padding: '10px', borderRadius: '5px', border: 'none', background: '#0f172a', color: 'white' };
const btnStyle = { padding: '10px 20px', background: '#0ea5e9', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' };
const tableStyle = { flex: 1, background: '#1e293b', padding: '20px', borderRadius: '12px' };
const rowStyle = { padding: '10px', borderBottom: '1px solid #334155', display: 'flex', justifyContent: 'space-between' };

export default AdminDashboard;