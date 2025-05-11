
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, getDoc, getDocs, deleteDoc, addDoc, updateDoc, writeBatch, serverTimestamp, Timestamp } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';
import type { SKU, ProductionOrder, Demand, generateIdType } from './types'; // Adicionado generateIdType

// =====================================================================================
// !! IMPORTANTE !! ATUALIZE COM SUAS CREDENCIAIS DO FIREBASE !! IMPORTANTE !!
// !! IMPORTANTE !! O ERRO "PERMISSION_DENIED" OCORRE SE ESTES VALORES NÃO FOREM OS CORRETOS DO SEU PROJETO !!
// =====================================================================================
const firebaseConfig = {
  apiKey: "YOUR_API_KEY", // SUBSTITUA PELO SEU API KEY
  authDomain: "YOUR_AUTH_DOMAIN", // SUBSTITUA PELO SEU AUTH DOMAIN
  projectId: "YOUR_PROJECT_ID", // SUBSTITUA PELO SEU PROJECT ID REAL
  storageBucket: "YOUR_STORAGE_BUCKET", // SUBSTITUA PELO SEU STORAGE BUCKET
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID", // SUBSTITUA PELO SEU MESSAGING SENDER ID
  appId: "YOUR_APP_ID" // SUBSTITUA PELO SEU APP ID
};

// =====================================================================================
// !! IMPORTANTE !! VERIFIQUE SUAS REGRAS DE SEGURANÇA DO FIRESTORE !! IMPORTANTE !!
// No console do Firebase -> Firestore Database -> Regras.
// Para desenvolvimento, você pode usar regras permissivas como:
// rules_version = '2';
// service cloud.firestore {
//   match /databases/{database}/documents {
//     match /{document=**} {
//       allow read, write: if true; // CUIDADO: MUDE PARA PRODUÇÃO!
//     }
//   }
// }
// =====================================================================================


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

// Funções Genéricas para CRUD no Firestore

/**
 * Lê todos os documentos de uma coleção.
 * @param collectionName Nome da coleção.
 * @returns Promise com um array de documentos.
 */
export async function readCollection<T extends { id: string }>(collectionName: string): Promise<T[]> {
  if (!firestoreDb) throw new Error("Firestore not initialized.");
  const querySnapshot = await getDocs(collection(firestoreDb, collectionName));
  return querySnapshot.docs.map(docSnap => ({
    id: docSnap.id,
    ...docSnap.data(),
    // Converte Timestamps para Dates, se existirem
    createdAt: docSnap.data().createdAt instanceof Timestamp ? docSnap.data().createdAt.toDate() : docSnap.data().createdAt,
    updatedAt: docSnap.data().updatedAt instanceof Timestamp ? docSnap.data().updatedAt.toDate() : docSnap.data().updatedAt,
  } as T));
}

/**
 * Lê um único documento de uma coleção pelo ID.
 * @param collectionName Nome da coleção.
 * @param id ID do documento.
 * @returns Promise com o documento ou undefined se não encontrado.
 */
export async function readDocument<T extends { id: string }>(collectionName: string, id: string): Promise<T | undefined> {
  if (!firestoreDb) throw new Error("Firestore not initialized.");
  const docRef = doc(firestoreDb, collectionName, id);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    const data = docSnap.data();
    return {
      id: docSnap.id,
      ...data,
      createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : data.createdAt,
      updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : data.updatedAt,
    } as T;
  }
  return undefined;
}


/**
 * Cria um novo documento em uma coleção.
 * O ID será gerado automaticamente pelo Firestore.
 * Adiciona campos createdAt e updatedAt.
 * @param collectionName Nome da coleção.
 * @param data Dados do documento (sem o ID).
 * @returns Promise com o documento criado (com ID, createdAt, updatedAt).
 */
export async function createDocument<T extends { id: string; createdAt: Date; updatedAt: Date }>(
  collectionName: string,
  data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>
): Promise<T> {
  if (!firestoreDb) throw new Error("Firestore not initialized.");
  const now = Timestamp.now();
  const docRef = await addDoc(collection(firestoreDb, collectionName), {
    ...data,
    createdAt: now,
    updatedAt: now,
  });
  return {
    id: docRef.id,
    ...data,
    createdAt: now.toDate(),
    updatedAt: now.toDate(),
  } as T;
}

/**
 * Atualiza um documento existente em uma coleção.
 * Atualiza o campo updatedAt.
 * @param collectionName Nome da coleção.
 * @param id ID do documento a ser atualizado.
 * @param data Dados a serem mesclados/atualizados.
 * @returns Promise resolvida quando a atualização for concluída.
 */
export async function updateDocument<T>(
  collectionName: string,
  id: string,
  data: Partial<Omit<T, 'id' | 'createdAt' | 'updatedAt'>> // Não permite atualizar id, createdAt
): Promise<void> {
  if (!firestoreDb) throw new Error("Firestore not initialized.");
  const docRef = doc(firestoreDb, collectionName, id);
  await updateDoc(docRef, {
    ...data,
    updatedAt: Timestamp.now(),
  });
}


/**
 * Exclui um documento de uma coleção.
 * @param collectionName Nome da coleção.
 * @param id ID do documento a ser excluído.
 * @returns Promise resolvida quando a exclusão for concluída.
 */
export async function deleteFirestoreDocument(collectionName: string, id: string): Promise<void> {
  if (!firestoreDb) throw new Error("Firestore not initialized.");
  const docRef = doc(firestoreDb, collectionName, id);
  await deleteDoc(docRef);
}

/**
 * Exclui múltiplos documentos de uma coleção usando um batch.
 * @param collectionName Nome da coleção.
 * @param ids Array de IDs dos documentos a serem excluídos.
 * @returns Promise resolvida quando a exclusão em lote for concluída.
 */
export async function deleteMultipleDocuments(collectionName: string, ids: string[]): Promise<void> {
  if (!firestoreDb) throw new Error("Firestore not initialized.");
  if (ids.length === 0) return;

  const batch = writeBatch(firestoreDb);
  ids.forEach(id => {
    const docRef = doc(firestoreDb, collectionName, id);
    batch.delete(docRef);
  });
  await batch.commit();
}

// Função para gerar ID (opcional, Firestore pode gerar IDs automaticamente com addDoc)
// Se for usar addDoc, esta função não é estritamente necessária para a criação.
export const generateId = (): string => {
  // Cria um DocumentReference temporário em uma coleção fictícia para obter um ID gerado pelo Firestore
  return doc(collection(firestoreDb, '_temp_id_generator_')).id;
};
