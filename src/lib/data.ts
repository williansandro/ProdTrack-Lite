
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, getDoc, getDocs, deleteDoc, addDoc, updateDoc, writeBatch, serverTimestamp, Timestamp } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';

// SUAS CONFIGURAÇÕES DO FIREBASE AQUI
// Substitua pelos valores do seu projeto Firebase
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID", // Certifique-se que este é o ID correto do seu projeto
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Inicializa o Firebase
let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

export const firestoreDb: Firestore = getFirestore(app);

// Nomes das coleções
export const SKUS_COLLECTION = 'skus';
export const PRODUCTION_ORDERS_COLLECTION = 'productionOrders';
export const DEMANDS_COLLECTION = 'demands';

// Função para gerar ID (opcional, Firestore pode gerar IDs automaticamente com addDoc)
export const generateId = (): string => {
  // Cria um DocumentReference temporário em uma coleção fictícia para obter um ID gerado pelo Firestore
  return doc(collection(firestoreDb, '_temp_id_generator_')).id;
};
