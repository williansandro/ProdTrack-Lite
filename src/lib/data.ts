
import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  deleteDoc, 
  addDoc, 
  updateDoc as updateFirestoreDoc, // Renamed to avoid conflict
  writeBatch, 
  Timestamp, 
  serverTimestamp,
  query,
  where
} from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';
import type { SKU, ProductionOrder, Demand, generateIdType } from './types';

// =====================================================================================
// !! IMPORTANTE !! ATUALIZE COM SUAS CREDENCIAIS DO FIREBASE !! IMPORTANTE !!
// !! SE ESTES VALORES NÃO FOREM OS CORRETOS DO SEU PROJETO FIREBASE, OS DADOS NÃO SERÃO SALVOS! !!
// !! O ERRO "PERMISSION_DENIED" OU "Could not reach Cloud Firestore backend" OCORRE SE ESTES VALORES ESTIVEREM INCORRETOS !!
// !!            >>>>>  SUBSTITUA "YOUR_PROJECT_ID" E OUTROS PLACEHOLDERS ABAIXO <<<<<
// =====================================================================================
const firebaseConfig = {
  apiKey: "YOUR_API_KEY", // SUBSTITUA PELO SEU API KEY REAL
  authDomain: "YOUR_AUTH_DOMAIN", // SUBSTITUA PELO SEU AUTH DOMAIN REAL
  projectId: "YOUR_PROJECT_ID", // SUBSTITUA PELO SEU PROJECT ID REAL
  storageBucket: "YOUR_STORAGE_BUCKET", // SUBSTITUA PELO SEU STORAGE BUCKET REAL
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID", // SUBSTITUA PELO SEU MESSAGING SENDER ID REAL
  appId: "YOUR_APP_ID" // SUBSTITUA PELO SEU APP ID REAL
};
// =====================================================================================
// !! IMPORTANTE !! VERIFIQUE SUAS REGRAS DE SEGURANÇA DO FIRESTORE !! IMPORTANTE !!
// No console do Firebase -> Firestore Database -> Regras.
// Para desenvolvimento, você pode usar regras permissivas como:
//
// rules_version = '2';
// service cloud.firestore {
//   match /databases/{database}/documents {
//     match /{document=**} {
//       allow read, write: if true; // CUIDADO: MUDE PARA PRODUÇÃO! PERMITE QUALQUER UM LER E ESCREVER.
//     }
//   }
// }
//
// Se você implementou autenticação, suas regras devem ser mais específicas, por exemplo:
// rules_version = '2';
// service cloud.firestore {
//   match /databases/{database}/documents {
//     // Permite acesso apenas para usuários autenticados aos seus próprios dados
//     // match /users/{userId}/{document=**} {
//     //   allow read, write: if request.auth != null && request.auth.uid == userId;
//     // }
//     // Exemplo para coleções públicas se necessário, ou mais granular
//     match /{document=**} { // Regra geral para outras coleções se não especificadas acima
//       allow read, write: if request.auth != null; // Exemplo: permite acesso se autenticado
//     }
//   }
// }
// =====================================================================================
// !! IMPORTANTE !! VERIFIQUE SE O FATURAMENTO ESTÁ ATIVADO NO SEU PROJETO GOOGLE CLOUD !!
// Alguns serviços ou limites de uso do Firebase podem exigir que o faturamento esteja habilitado.
// Se o faturamento não estiver ativo, o Firestore pode não funcionar.
// =====================================================================================


// Inicializa o Firebase
let app;
let firestoreDb: Firestore;

try {
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApp();
  }
  firestoreDb = getFirestore(app);
} catch (error) {
  console.error("Erro ao inicializar o Firebase. Verifique sua configuração 'firebaseConfig':", error);
  // @ts-ignore
  firestoreDb = undefined; // Define como undefined para que as operações falhem controladamente
}


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
  if (!firestoreDb) {
    console.error("Firestore não inicializado. Verifique a configuração e a conexão.");
    return []; // Retorna array vazio para evitar que a aplicação quebre completamente
  }
  const q = query(collection(firestoreDb, collectionName));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(docSnap => {
    const data = docSnap.data();
    return {
        id: docSnap.id,
        ...data,
        // Converte Timestamps para Dates, se existirem e forem válidos
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : (data.createdAt && typeof data.createdAt.seconds === 'number' ? new Date(data.createdAt.seconds * 1000) : new Date()),
        updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : (data.updatedAt && typeof data.updatedAt.seconds === 'number' ? new Date(data.updatedAt.seconds * 1000) : new Date()),
    } as T;
  });
}

/**
 * Lê um único documento de uma coleção pelo ID.
 * @param collectionName Nome da coleção.
 * @param id ID do documento.
 * @returns Promise com o documento ou undefined se não encontrado.
 */
export async function readDocument<T extends { id: string }>(collectionName: string, id: string): Promise<T | undefined> {
  if (!firestoreDb) {
    console.error("Firestore não inicializado. Verifique a configuração e a conexão.");
    return undefined;
  }
  const docRef = doc(firestoreDb, collectionName, id);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    const data = docSnap.data();
    return {
      id: docSnap.id,
      ...data,
      createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : (data.createdAt && typeof data.createdAt.seconds === 'number' ? new Date(data.createdAt.seconds * 1000) : new Date()),
      updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : (data.updatedAt && typeof data.updatedAt.seconds === 'number' ? new Date(data.updatedAt.seconds * 1000) : new Date()),
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
  data: Omit<T, 'id' | 'createdAt' | 'updatedAt'> & Partial<Pick<T, 'createdAt' | 'updatedAt'>>
): Promise<T> {
  if (!firestoreDb) {
    throw new Error("Firestore não inicializado. Verifique a configuração e a conexão.");
  }
  const now = Timestamp.now();
  
  const docDataForFirebase = {
    ...data,
    createdAt: data.createdAt instanceof Date ? Timestamp.fromDate(data.createdAt) : (data.createdAt || now),
    updatedAt: data.updatedAt instanceof Date ? Timestamp.fromDate(data.updatedAt) : (data.updatedAt || now),
  };
  
  const docRef = await addDoc(collection(firestoreDb, collectionName), docDataForFirebase);

  return {
    id: docRef.id, 
    ...data,
    createdAt: (docDataForFirebase.createdAt as Timestamp).toDate(),
    updatedAt: (docDataForFirebase.updatedAt as Timestamp).toDate(),
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
  data: Partial<Omit<T, 'id' | 'createdAt'>> 
): Promise<void> {
  if (!firestoreDb) {
    throw new Error("Firestore não inicializado. Verifique a configuração e a conexão.");
  }
  const docRef = doc(firestoreDb, collectionName, id);
  await updateFirestoreDoc(docRef, { 
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
  if (!firestoreDb) {
    throw new Error("Firestore não inicializado. Verifique a configuração e a conexão.");
  }
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
  if (!firestoreDb) {
    throw new Error("Firestore não inicializado. Verifique a configuração e a conexão.");
  }
  if (ids.length === 0) return;

  const batch = writeBatch(firestoreDb);
  ids.forEach(id => {
    const docRef = doc(firestoreDb, collectionName, id);
    batch.delete(docRef);
  });
  await batch.commit();
}


export const generateId = (): string => {
  if (!firestoreDb) throw new Error("Firestore not initialized when generating ID.");
  return doc(collection(firestoreDb, '_temp_id_generator_')).id;
};


export { serverTimestamp, Timestamp, firestoreDb };
