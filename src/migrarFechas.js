import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, updateDoc, doc, Timestamp } from 'firebase/firestore';

// Configura tu Firebase (rellena con tus datos reales)
const firebaseConfig = {
  apiKey: "TU_API_KEY",
  authDomain: "TU_AUTH_DOMAIN",
  projectId: "TU_PROJECT_ID",
  storageBucket: "TU_STORAGE_BUCKET",
  messagingSenderId: "TU_SENDER_ID",
  appId: "TU_APP_ID"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function migrarFechasStringATimestamp(nombreColeccion) {
  const colRef = collection(db, nombreColeccion);
  const snapshot = await getDocs(colRef);

  for (const document of snapshot.docs) {
    const data = document.data();

    if (typeof data.fecha === 'string') {
      const fechaDate = new Date(data.fecha);
      if (!isNaN(fechaDate)) {
        const fechaTimestamp = Timestamp.fromDate(fechaDate);
        await updateDoc(doc(db, nombreColeccion, document.id), { fecha: fechaTimestamp });
        console.log(`Documento ${document.id} actualizado en ${nombreColeccion}`);
      } else {
        console.warn(`Documento ${document.id} tiene fecha inválida en ${nombreColeccion}:`, data.fecha);
      }
    }
  }
}

async function ejecutarMigracion() {
  await migrarFechasStringATimestamp('ventas');
  await migrarFechasStringATimestamp('ingresos');
  await migrarFechasStringATimestamp('comandas_pagadas');
  await migrarFechasStringATimestamp('egresos');
  console.log('Migración completada');
}

ejecutarMigracion().catch(console.error);