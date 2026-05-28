// ==========================================================================
// FIREBASE CLIENT SDK INITIALIZATION (ES MODULES)
// ==========================================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

// Configuração padrão do Firebase.
// Substitua pelas credenciais reais da sua infraestrutura do Firebase no console do Firebase.
// Se as variáveis globais estiverem salvas no LocalStorage (para testes ou onboarding dinâmico), nós as usamos.
let savedConfig = localStorage.getItem("firebase_config");
if (savedConfig && (savedConfig.includes("DummyKey") || savedConfig.includes("vet-saas-system") || savedConfig.includes("ataricyber"))) {
  localStorage.removeItem("firebase_config");
  savedConfig = null;
}
const firebaseConfig = savedConfig ? JSON.parse(savedConfig) : {
  apiKey: "AIzaSyCbDFRdF9TYDTfkFpdhqERk6WGu_4M1RaQ",
  authDomain: "vetsaas-182392.firebaseapp.com",
  projectId: "vetsaas-182392",
  storageBucket: "vetsaas-182392.firebasestorage.app",
  messagingSenderId: "572281442021",
  appId: "1:572281442021:web:416e49404f847c89778e0c"
};

// Inicialização dos Serviços
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { auth, db, storage, firebaseConfig };
export default app;
