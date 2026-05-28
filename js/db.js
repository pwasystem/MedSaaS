// ==========================================================================
// TENANT-AWARE FIRESTORE DATABASE WRAPPERS (CRUD)
// ==========================================================================

import { 
  collection, 
  doc, 
  addDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

import { db } from "./firebase-config.js";
import { getCurrentUserProfile } from "./auth.js";

/**
 * Obtém o clinicId da sessão ativa do usuário.
 * Dispara erro se o usuário não estiver autenticado.
 */
function getActiveClinicId() {
  const profile = getCurrentUserProfile();
  if (!profile || !profile.clinicId) {
    throw new Error("Acesso não autorizado: clínica não identificada na sessão ativa.");
  }
  return profile.clinicId;
}

/**
 * Retorna uma referência a uma subcoleção da clínica ativa.
 * @param {string} subcollection Nome da subcoleção (ex: 'pets', 'clients', 'inventory')
 */
function getTenantCollectionRef(subcollection) {
  const clinicId = getActiveClinicId();
  return collection(db, "clinics", clinicId, subcollection);
}

/**
 * Adiciona um documento a uma subcoleção da clínica com ID gerado automaticamente.
 * @param {string} subcollection Nome da subcoleção
 * @param {object} data Objeto de dados a salvar
 */
async function addTenantDoc(subcollection, data) {
  try {
    const colRef = getTenantCollectionRef(subcollection);
    const docRef = await addDoc(colRef, {
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    // Atualizar o próprio documento com seu ID gerado
    await updateDoc(docRef, { id: docRef.id });
    return docRef.id;
  } catch (error) {
    console.error(`Erro ao adicionar documento em ${subcollection}:`, error);
    throw error;
  }
}

/**
 * Cria ou substitui um documento em uma subcoleção da clínica com ID específico.
 * @param {string} subcollection Nome da subcoleção
 * @param {string} docId ID do documento
 * @param {object} data Objeto de dados a salvar
 */
async function setTenantDoc(subcollection, docId, data) {
  try {
    const clinicId = getActiveClinicId();
    const docRef = doc(db, "clinics", clinicId, subcollection, docId);
    await setDoc(docRef, {
      ...data,
      id: docId,
      updatedAt: new Date().toISOString()
    });
    return docId;
  } catch (error) {
    console.error(`Erro ao setar documento em ${subcollection}/${docId}:`, error);
    throw error;
  }
}

/**
 * Atualiza campos específicos de um documento em uma subcoleção da clínica.
 * @param {string} subcollection Nome da subcoleção
 * @param {string} docId ID do documento
 * @param {object} data Campos a atualizar
 */
async function updateTenantDoc(subcollection, docId, data) {
  try {
    const clinicId = getActiveClinicId();
    const docRef = doc(db, "clinics", clinicId, subcollection, docId);
    await updateDoc(docRef, {
      ...data,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error(`Erro ao atualizar documento em ${subcollection}/${docId}:`, error);
    throw error;
  }
}

/**
 * Remove um documento de uma subcoleção da clínica.
 * @param {string} subcollection Nome da subcoleção
 * @param {string} docId ID do documento
 */
async function deleteTenantDoc(subcollection, docId) {
  try {
    const clinicId = getActiveClinicId();
    const docRef = doc(db, "clinics", clinicId, subcollection, docId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error(`Erro ao deletar documento em ${subcollection}/${docId}:`, error);
    throw error;
  }
}

/**
 * Obtém os dados de um documento específico da clínica.
 * @param {string} subcollection Nome da subcoleção
 * @param {string} docId ID do documento
 */
async function getTenantDoc(subcollection, docId) {
  try {
    const clinicId = getActiveClinicId();
    const docRef = doc(db, "clinics", clinicId, subcollection, docId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data();
    }
    return null;
  } catch (error) {
    console.error(`Erro ao buscar documento em ${subcollection}/${docId}:`, error);
    throw error;
  }
}

/**
 * Busca todos os documentos de uma subcoleção da clínica.
 * @param {string} subcollection Nome da subcoleção
 * @param {Array} queryConstraints Filtros, ordenações ou limites adicionais
 */
async function getTenantDocs(subcollection, queryConstraints = []) {
  try {
    const colRef = getTenantCollectionRef(subcollection);
    const q = query(colRef, ...queryConstraints);
    const snap = await getDocs(q);
    const docs = [];
    snap.forEach((doc) => {
      docs.push(doc.data());
    });
    return docs;
  } catch (error) {
    console.error(`Erro ao ler coleção ${subcollection}:`, error);
    throw error;
  }
}

/**
 * Obtém os dados gerais da clínica vinculada.
 */
async function getClinicConfig() {
  try {
    const clinicId = getActiveClinicId();
    const docRef = doc(db, "clinics", clinicId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data();
    }
    return null;
  } catch (error) {
    console.error("Erro ao carregar dados de configuração da clínica:", error);
    throw error;
  }
}

/**
 * Salva as configurações gerais da clínica vinculada (como cores e logo).
 * @param {object} config Dados de configuração
 */
async function updateClinicConfig(config) {
  try {
    const clinicId = getActiveClinicId();
    const docRef = doc(db, "clinics", clinicId);
    await updateDoc(docRef, config);
  } catch (error) {
    console.error("Erro ao salvar configuração da clínica:", error);
    throw error;
  }
}

/**
 * Busca todos os funcionários (usuários) vinculados à clínica ativa.
 */
async function getClinicEmployees() {
  try {
    const clinicId = getActiveClinicId();
    const colRef = collection(db, "users");
    const q = query(colRef, where("clinicId", "==", clinicId));
    const snap = await getDocs(q);
    const employees = [];
    snap.forEach((doc) => {
      employees.push(doc.data());
    });
    return employees;
  } catch (error) {
    console.error("Erro ao buscar funcionários:", error);
    throw error;
  }
}

/**
 * Cria o perfil de um funcionário na coleção global de usuários do Firestore.
 */
async function createEmployeeDoc(uid, data) {
  try {
    const docRef = doc(db, "users", uid);
    await setDoc(docRef, {
      ...data,
      id: uid,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error("Erro ao criar perfil de funcionário:", error);
    throw error;
  }
}

/**
 * Atualiza os dados de um funcionário na coleção global de usuários.
 */
async function updateEmployeeDoc(uid, data) {
  try {
    const docRef = doc(db, "users", uid);
    await updateDoc(docRef, {
      ...data,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error("Erro ao atualizar perfil de funcionário:", error);
    throw error;
  }
}

/**
 * Deleta o documento de um funcionário na coleção global de usuários.
 */
async function deleteEmployeeDoc(uid) {
  try {
    const docRef = doc(db, "users", uid);
    await deleteDoc(docRef);
  } catch (error) {
    console.error("Erro ao deletar perfil de funcionário:", error);
    throw error;
  }
}

export {
  addTenantDoc,
  setTenantDoc,
  updateTenantDoc,
  deleteTenantDoc,
  getTenantDoc,
  getTenantDocs,
  getClinicConfig,
  updateClinicConfig,
  getActiveClinicId,
  getClinicEmployees,
  createEmployeeDoc,
  updateEmployeeDoc,
  deleteEmployeeDoc
};
export { where, orderBy, limit };
