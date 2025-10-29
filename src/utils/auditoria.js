// Importa las funciones necesarias de Firebase Firestore
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebaseConfig'; // Asegúrate de que la configuración de Firestore esté correcta

export const registrarEventoAuditoria = async (evento) => {
  try {
    // Asignar 'Sin rol' si 'rol' es undefined
    const rolUsuario = evento.rol || 'Sin rol'; // Usamos 'Sin rol' como valor predeterminado

    const auditoriaCollectionRef = collection(db, 'auditoria_movimientos');
    const nuevoEvento = {
      ...evento,
      rol: rolUsuario, // Asegúrate de que el campo 'rol' tiene un valor válido
      timestamp: serverTimestamp(), // Establecer la fecha y hora actual
    };

    await addDoc(auditoriaCollectionRef, nuevoEvento); // Agregar el evento a Firestore
    console.log('Evento de auditoría registrado exitosamente.');
  } catch (error) {
    console.error('Error al registrar evento de auditoría:', error);
  }
};