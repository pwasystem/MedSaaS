import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, setDoc, getDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBlBfJaFzEQLIfbQ6JRq8XwNruvadoApSo",
  authDomain: "aulateste-e68ef.firebaseapp.com",
  projectId: "aulateste-e68ef",
  storageBucket: "aulateste-e68ef.firebasestorage.app",
  messagingSenderId: "175293517105",
  appId: "1:175293517105:web:143aba058894b7a169f410"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function runTest() {
  const email = `test-${Date.now()}@vetsaas.com`;
  const password = "password123";
  const clinicId = `clinic_test_${Date.now()}`;

  console.log(`1. Criando usuário temporário: ${email}...`);
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const uid = userCredential.user.uid;
    console.log(`   Usuário criado com sucesso. UID: ${uid}`);

    console.log(`2. Gravando documento da clínica /clinics/${clinicId}...`);
    await setDoc(doc(db, "clinics", clinicId), {
      id: clinicId,
      name: "Clínica de Teste Rules",
      createdAt: new Date().toISOString()
    });
    console.log("   Clínica gravada com sucesso.");

    console.log(`3. Gravando documento do usuário /users/${uid}...`);
    const userProfile = {
      uid: uid,
      name: "Test User",
      email: email,
      role: "admin",
      clinicId: clinicId,
      createdAt: new Date().toISOString()
    };
    await setDoc(doc(db, "users", uid), userProfile);
    console.log("   Perfil do usuário gravado com sucesso.");

    console.log(`4. Tentando ler o próprio perfil /users/${uid}...`);
    const userSnap = await getDoc(doc(db, "users", uid));
    if (userSnap.exists()) {
      console.log("   Leitura de perfil bem-sucedida! Dados:", userSnap.data());
    } else {
      console.log("   Leitura de perfil retornou documento vazio!");
    }

    console.log(`5. Tentando ler a própria clínica /clinics/${clinicId}...`);
    const clinicSnap = await getDoc(doc(db, "clinics", clinicId));
    if (clinicSnap.exists()) {
      console.log("   Leitura de clínica bem-sucedida! Dados:", clinicSnap.data());
    } else {
      console.log("   Leitura de clínica retornou documento vazio!");
    }

  } catch (error) {
    console.error("❌ ERRO CONSTATADO DURANTE O FLUXO:");
    console.error("Código do Erro:", error.code);
    console.error("Mensagem:", error.message);
    console.error(error.stack);
  }
}

runTest();
