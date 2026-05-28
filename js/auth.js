// ==========================================================================
// VETSAAS MULTITENANT AUTHENTICATION MANAGEMENT
// ==========================================================================

import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

import { 
  doc, 
  setDoc, 
  getDoc 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

import { auth, db } from "./firebase-config.js";

// Estado global da sessão de autenticação ativa
let currentUserProfile = null;
let isRegistering = false;

/**
 * Registra uma nova clínica (inquilino) e seu usuário administrador inicial.
 * @param {string} clinicName Nome da clínica veterinária
 * @param {string} adminName Nome completo do administrador
 * @param {string} email E-mail corporativo
 * @param {string} password Senha de acesso
 */
async function registerClinic(clinicName, adminName, email, password) {
  isRegistering = true;
  // 1. Gerar IDs
  const clinicId = "clinic_" + Math.random().toString(36).substr(2, 9);
  
  try {
    // 2. Criar a conta do usuário no Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // 3. Criar registro da Clínica no Firestore
    const clinicRef = doc(db, "clinics", clinicId);
    await setDoc(clinicRef, {
      id: clinicId,
      name: clinicName,
      logoUrl: "",
      brandColors: {
        primary: "#0d9488",
        secondary: "#0f172a",
        background: "#f8fafc"
      },
      googleCalendarId: "",
      createdAt: new Date().toISOString()
    });
    
    // 4. Criar registro do Usuário Admin no Firestore vinculado à clínica
    const userRef = doc(db, "users", user.uid);
    const userProfile = {
      uid: user.uid,
      name: adminName,
      email: email,
      role: "admin",
      clinicId: clinicId,
      createdAt: new Date().toISOString()
    };
    await setDoc(userRef, userProfile);
    
    currentUserProfile = userProfile;
    return userProfile;
  } catch (error) {
    console.error("Erro no registro do inquilino:", error);
    throw error;
  } finally {
    isRegistering = false;
  }
}

/**
 * Autentica um usuário existente e valida seu vínculo de clínica.
 * @param {string} email 
 * @param {string} password 
 */
async function loginUser(email, password) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Buscar perfil no Firestore para obter clinicId e role
    const userProfile = await fetchUserProfile(user.uid);
    if (!userProfile) {
      throw new Error("Perfil de usuário não encontrado no banco de dados.");
    }
    
    currentUserProfile = userProfile;
    return userProfile;
  } catch (error) {
    console.error("Erro no login:", error);
    throw error;
  }
}

/**
 * Desconecta o usuário ativo da sessão.
 */
async function logoutUser() {
  try {
    await signOut(auth);
    currentUserProfile = null;
  } catch (error) {
    console.error("Erro ao deslogar:", error);
    throw error;
  }
}

/**
 * Recupera o perfil completo de um usuário do Firestore.
 * @param {string} uid User ID do Firebase Auth
 */
async function fetchUserProfile(uid) {
  const userDocRef = doc(db, "users", uid);
  const userDoc = await getDoc(userDocRef);
  if (userDoc.exists()) {
    return userDoc.data();
  }
  return null;
}

/**
 * Escuta as mudanças de autenticação e repassa ao callback da aplicação.
 * @param {Function} callback Callback executado ao mudar estado de auth
 */
function initAuthListener(callback) {
  onAuthStateChanged(auth, async (user) => {
    if (isRegistering) {
      return;
    }
    if (user) {
      try {
        const profile = await fetchUserProfile(user.uid);
        currentUserProfile = profile;
        callback(profile);
      } catch (error) {
        console.error("Erro ao carregar sessão ativa:", error);
        callback(null);
      }
    } else {
      currentUserProfile = null;
      callback(null);
    }
  });
}

/**
 * Retorna o perfil carregado na sessão ativa.
 */
function getCurrentUserProfile() {
  return currentUserProfile;
}

export {
  registerClinic,
  loginUser,
  logoutUser,
  initAuthListener,
  getCurrentUserProfile
};
