// ==========================================================================
// CENTRAL APPLICATION CONTROLLER & SPA ROUTER
// ==========================================================================

import { initAuthListener, logoutUser, getCurrentUserProfile, loginUser, registerClinic } from "./auth.js";
import { getClinicConfig } from "./db.js";
import { showToast, showModal, hideModal } from "./utils.js";

// Importação dos módulos das telas (views)
import { renderDashboard, initDashboard } from "./dashboard.js";
import { renderPets, initPets } from "./pets.js";
import { renderInventory, initInventory } from "./inventory.js";
import { renderFinance, initFinance } from "./finance.js";
import { renderSettings, initSettings } from "./onboarding.js";
import { renderSuperAdmin, initSuperAdmin } from "./superadmin.js";
import { renderAppointmentsView, initAppointmentsView } from "./appointments.js";
import { renderRecords, initRecords } from "./soap.js";
import { renderCheckout, initCheckout } from "./checkout.js";
import { renderEmployees, initEmployees } from "./employees.js";

// Cache do container principal
const viewContent = document.getElementById("view-content");
const appContainer = document.getElementById("app-container");
const authContainer = document.getElementById("auth-container");


// Controle da Sidebar Responsiva
const sidebar = document.querySelector(".app-sidebar");
const sidebarToggle = document.getElementById("sidebar-toggle");

if (sidebarToggle) {
  sidebarToggle.addEventListener("click", () => {
    sidebar.classList.toggle("active");
  });
}

// Fechar sidebar ao clicar nos links (em mobile)
document.querySelectorAll(".nav-link").forEach(link => {
  link.addEventListener("click", () => {
    if (window.innerWidth <= 992) {
      sidebar.classList.remove("active");
    }
  });
});

// ==========================================================================
// SPA ROUTING SYSTEM
// ==========================================================================

const routes = {
  dashboard: { title: "Dashboard", render: renderDashboard, init: initDashboard },
  appointments: { title: "Agenda de Consultas", render: renderAppointmentsView, init: initAppointmentsView },
  pets: { title: "Clientes & Pets", render: renderPets, init: initPets },
  records: { title: "Prontuários Clínicos", render: renderRecords, init: initRecords },
  checkout: { title: "Caixa (PDV)", render: renderCheckout, init: initCheckout },
  inventory: { title: "Gestão de Estoque", render: renderInventory, init: initInventory },
  finance: { title: "Fluxo de Caixa", render: renderFinance, init: initFinance },
  employees: { title: "Equipe e Níveis de Acesso", render: renderEmployees, init: initEmployees },
  settings: { title: "Configurações da Clínica", render: renderSettings, init: initSettings },
  superadmin: { title: "Painel SaaS (Super Admin)", render: renderSuperAdmin, init: initSuperAdmin }
};

/**
 * Navega para uma determinada rota com base no Hash da URL.
 */
async function handleRouting() {
  const user = getCurrentUserProfile();
  if (!user) {
    showAuthScreen();
    return;
  }

  let hash = window.location.hash.replace("#", "") || "dashboard";
  
  // Segurança de Rotas Baseada em Roles
  if (user.role === "superadmin" && hash !== "superadmin") {
    window.location.hash = "#superadmin";
    return;
  }

  if (hash === "superadmin" && user.role !== "superadmin") {
    showToast("Acesso negado: área exclusiva do administrador SaaS.", "error");
    window.location.hash = "#dashboard";
    return;
  }

  // Rotas restritas para tutores/clientes
  if (user.role === "client" && ["finance", "settings", "records", "checkout", "employees", "inventory", "pets"].includes(hash)) {
    showToast("Acesso negado: permissões insuficientes.", "error");
    window.location.hash = "#dashboard";
    return;
  }

  // Rotas restritas para staff (recepção/apoio)
  if (user.role === "staff" && ["finance", "settings", "records", "employees"].includes(hash)) {
    showToast("Acesso negado: permissões insuficientes.", "error");
    window.location.hash = "#dashboard";
    return;
  }

  // Rotas restritas para vet (veterinários)
  if (user.role === "vet" && ["finance", "settings", "employees"].includes(hash)) {
    showToast("Acesso negado: permissões insuficientes.", "error");
    window.location.hash = "#dashboard";
    return;
  }

  const route = routes[hash];
  if (route) {
    // Atualizar título da tela ativa
    document.getElementById("current-view-title").textContent = route.title;
    
    // Atualizar classe ativa nos links da sidebar
    document.querySelectorAll(".nav-link").forEach(link => {
      if (link.getAttribute("data-view") === hash) {
        link.classList.add("active");
      } else {
        link.classList.remove("active");
      }
    });

    // Renderizar HTML e executar inicializações específicas da tela
    viewContent.innerHTML = "";
    viewContent.classList.remove("fade-in");
    void viewContent.offsetWidth; // Trigger reflow para resetar animação CSS
    viewContent.classList.add("fade-in");
    
    await route.render(viewContent);
    await route.init();
  } else {
    // Rota padrão se desconhecido
    window.location.hash = "#dashboard";
  }
}

// Escuta mudanças de hash para roteamento
window.addEventListener("hashchange", handleRouting);

// ==========================================================================
// DYNAMIC CLINIC BRAND THEME LOADER
// ==========================================================================

/**
 * Carrega e aplica dinamicamente o tema visual customizado da clínica.
 */
async function loadClinicTheme() {
  try {
    const config = await getClinicConfig();
    if (config && config.brandColors) {
      const colors = config.brandColors;
      
      // Criar ou atualizar tag style para variáveis CSS customizadas
      let styleTag = document.getElementById("dynamic-clinic-theme");
      if (!styleTag) {
        styleTag = document.createElement("style");
        styleTag.id = "dynamic-clinic-theme";
        document.head.appendChild(styleTag);
      }
      
      // Aplicar cores no escopo root
      styleTag.textContent = `
        :root {
          --brand-primary: ${colors.primary || "#0d9488"};
          --brand-primary-hover: ${colors.primary}e0;
          --brand-primary-light: ${colors.primary}1a;
          --brand-secondary: ${colors.secondary || "#0f172a"};
          --brand-background: ${colors.background || "#f8fafc"};
        }
      `;
      
      // Atualizar logo na sidebar
      const logoImg = document.getElementById("sidebar-clinic-logo");
      const defaultLogoIcon = document.getElementById("sidebar-clinic-default-logo");
      const clinicTitle = document.getElementById("sidebar-clinic-name");
      
      clinicTitle.textContent = config.name || "Minha Clínica";
      
      if (config.logoUrl) {
        logoImg.src = config.logoUrl;
        logoImg.classList.remove("hidden");
        defaultLogoIcon.classList.add("hidden");
      } else {
        logoImg.classList.add("hidden");
        defaultLogoIcon.classList.remove("hidden");
      }
    }
  } catch (error) {
    console.error("Falha ao carregar tema da clínica:", error);
  }
}

// ==========================================================================
// STATE MANAGEMENT & USER INTERFACE TRIGGERS
// ==========================================================================

function showAuthScreen() {
  authContainer.classList.remove("hidden");
  appContainer.classList.add("hidden");
  window.location.hash = "";
}

async function showAppScreen(user) {
  // Resetar telas de overlay
  authContainer.classList.add("hidden");
  document.getElementById("suspension-overlay").classList.add("hidden");
  
  // Se for superadmin, pular verificação de suspensão de clínica
  if (user.role === "superadmin") {
    appContainer.classList.remove("hidden");
    
    // Atualizar cabeçalhos de perfil de usuário
    document.getElementById("user-display-name").textContent = user.name;
    document.getElementById("user-display-role").textContent = formatRole(user.role);
    
    // Configurar sidebar para Super Admin (mostrar apenas menu do superadmin e ocultar o resto)
    document.getElementById("nav-superadmin-item").classList.remove("hidden");
    
    // Ocultar links de clínica comuns para o superadmin
    document.querySelectorAll(".sidebar-nav ul li").forEach(li => {
      if (li.id !== "nav-superadmin-item") {
        li.classList.add("hidden");
      }
    });
    
    // Ajustar cabeçalho da sidebar
    document.getElementById("sidebar-clinic-name").textContent = "MedSaaS Admin";
    document.getElementById("sidebar-clinic-logo").classList.add("hidden");
    document.getElementById("sidebar-clinic-default-logo").classList.remove("hidden");
    
    // Forçar rota para superadmin
    window.location.hash = "#superadmin";
    handleRouting();
    return;
  }
  
  // Caso contrário, verificar se a clínica está suspensa
  try {
    const clinicData = await getClinicConfig();
    if (clinicData && clinicData.status === "suspended") {
      appContainer.classList.add("hidden");
      const suspensionOverlay = document.getElementById("suspension-overlay");
      suspensionOverlay.classList.remove("hidden");
      
      const logoutBtn = document.getElementById("btn-suspension-logout");
      // Remover ouvintes antigos substituindo o botão por um clone
      const newLogoutBtn = logoutBtn.cloneNode(true);
      logoutBtn.parentNode.replaceChild(newLogoutBtn, logoutBtn);
      
      newLogoutBtn.addEventListener("click", async () => {
        try {
          await logoutUser();
          showToast("Sessão encerrada.", "info");
        } catch (e) {
          showToast("Erro ao deslogar.", "error");
        }
      });
      return;
    }
  } catch (error) {
    console.error("Erro ao validar status da clínica:", error);
  }

  appContainer.classList.remove("hidden");
  
  // Atualizar cabeçalhos de perfil de usuário
  document.getElementById("user-display-name").textContent = user.name;
  document.getElementById("user-display-role").textContent = formatRole(user.role);
  
  // Garantir que os menus de clínica normais apareçam
  document.querySelectorAll(".sidebar-nav ul li").forEach(li => {
    if (li.id !== "nav-superadmin-item") {
      li.classList.remove("hidden");
    }
  });
  document.getElementById("nav-superadmin-item").classList.add("hidden");

  // Exibição e ocultação dinâmica dos links da sidebar baseado em Roles
  const allLinks = ["finance", "settings", "records", "checkout", "employees", "pets", "inventory", "appointments"];
  
  // Exibir todos primeiro (reset)
  allLinks.forEach(link => {
    const el = document.getElementById(`nav-${link}-link`);
    if (el) el.classList.remove("hidden");
  });

  // Ocultar conforme a role
  if (user.role === "client") {
    ["finance", "settings", "records", "checkout", "employees", "pets", "inventory"].forEach(link => {
      const el = document.getElementById(`nav-${link}-link`);
      if (el) el.classList.add("hidden");
    });
  } else if (user.role === "staff") {
    ["finance", "settings", "records", "employees"].forEach(link => {
      const el = document.getElementById(`nav-${link}-link`);
      if (el) el.classList.add("hidden");
    });
  } else if (user.role === "vet") {
    ["finance", "settings", "employees"].forEach(link => {
      const el = document.getElementById(`nav-${link}-link`);
      if (el) el.classList.add("hidden");
    });
  }

  // Carregar tema da clínica e iniciar roteamento
  loadClinicTheme();
  handleRouting();
}

function formatRole(role) {
  const roles = {
    superadmin: "Super Admin SaaS",
    admin: "Administrador",
    vet: "Veterinário",
    staff: "Funcionário",
    client: "Tutor/Cliente"
  };
  return roles[role] || role;
}

// Evento de logout
document.getElementById("btn-logout").addEventListener("click", async () => {
  try {
    await logoutUser();
    showToast("Sessão encerrada com sucesso.", "success");
  } catch (e) {
    showToast("Erro ao encerrar sessão.", "error");
  }
});

// ==========================================================================
// AUTHENTICATION UI EVENT HANDLERS (LOGIN & REGISTER)
// ==========================================================================

const tabLogin = document.getElementById("tab-login");
const tabRegister = document.getElementById("tab-register");
const formLogin = document.getElementById("form-login");
const formRegister = document.getElementById("form-register");
const authError = document.getElementById("auth-error");
const authErrorMsg = document.getElementById("auth-error-msg");

if (tabLogin && tabRegister && formLogin && formRegister) {
  // Alternar para aba de Login
  tabLogin.addEventListener("click", () => {
    tabLogin.classList.add("active");
    tabRegister.classList.remove("active");
    formLogin.classList.add("active");
    formRegister.classList.remove("active");
    if (authError) authError.classList.add("hidden");
  });

  // Alternar para aba de Registro
  tabRegister.addEventListener("click", () => {
    tabRegister.classList.add("active");
    tabLogin.classList.remove("active");
    formRegister.classList.add("active");
    formLogin.classList.remove("active");
    if (authError) authError.classList.add("hidden");
  });
}

// Submissão do Formulário de Login
if (formLogin) {
  formLogin.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (authError) authError.classList.add("hidden");

    const email = document.getElementById("login-email").value;
    const password = document.getElementById("login-password").value;
    const submitBtn = formLogin.querySelector("button[type='submit']");
    const originalText = submitBtn.innerHTML;

    try {
      submitBtn.disabled = true;
      submitBtn.innerHTML = `<span>Autenticando...</span> <i class="animate-spin" data-lucide="loader"></i>`;
      lucide.createIcons();

      await loginUser(email, password);
      showToast("Autenticado com sucesso!", "success");
    } catch (error) {
      console.error("Erro ao autenticar:", error);
      if (authError && authErrorMsg) {
        let msg = "Erro ao autenticar. Verifique os dados.";
        if (error.code === "auth/user-not-found" || error.code === "auth/wrong-password" || error.code === "auth/invalid-credential") {
          msg = "E-mail ou senha incorretos.";
        } else if (error.code === "auth/invalid-email") {
          msg = "Formato de e-mail inválido.";
        }
        authErrorMsg.textContent = msg;
        authError.classList.remove("hidden");
      }
      showToast("Falha na autenticação.", "error");
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalText;
      lucide.createIcons();
    }
  });
}

// Submissão do Formulário de Registro (Onboarding da Clínica)
if (formRegister) {
  formRegister.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (authError) authError.classList.add("hidden");

    const clinicName = document.getElementById("reg-clinic-name").value;
    const adminName = document.getElementById("reg-admin-name").value;
    const email = document.getElementById("reg-email").value;
    const password = document.getElementById("reg-password").value;
    const submitBtn = formRegister.querySelector("button[type='submit']");
    const originalText = submitBtn.innerHTML;

    try {
      submitBtn.disabled = true;
      submitBtn.innerHTML = `<span>Criando clínica...</span> <i class="animate-spin" data-lucide="loader"></i>`;
      lucide.createIcons();

      const userProfile = await registerClinic(clinicName, adminName, email, password);
      showToast("Clínica registrada e configurada!", "success");
      showAppScreen(userProfile);
    } catch (error) {
      console.error("Erro ao registrar clínica:", error);
      if (authError && authErrorMsg) {
        let msg = "Erro ao realizar cadastro.";
        if (error.code === "auth/email-already-in-use") {
          msg = "Este endereço de e-mail já está em uso.";
        } else if (error.code === "auth/weak-password") {
          msg = "A senha deve ter no mínimo 6 caracteres.";
        }
        authErrorMsg.textContent = msg;
        authError.classList.remove("hidden");
      }
      showToast("Falha no cadastro da clínica.", "error");
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalText;
      lucide.createIcons();
    }
  });
}

// Inicializador principal da autenticação global
initAuthListener((user) => {
  if (user) {
    showAppScreen(user);
  } else {
    showAuthScreen();
  }
  lucide.createIcons();
});

// ==========================================================================
// ==========================================================================
// TOAST & MODAL GLOBAL UTILITIES (MOVED TO UTILS.JS)
// ==========================================================================


export { loadClinicTheme };
