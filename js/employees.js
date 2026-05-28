import { getClinicEmployees, createEmployeeDoc, updateEmployeeDoc, deleteEmployeeDoc, getActiveClinicId } from "./db.js";
import { showToast, showModal, hideModal } from "./utils.js";
import { firebaseConfig } from "./firebase-config.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

let employeesList = [];

/**
 * Renderiza a estrutura básica da página de funcionários.
 */
export function renderEmployees(container) {
  container.innerHTML = `
    <div class="card fade-in">
      <div class="card-header" style="flex-wrap: wrap; gap: 16px; align-items: center;">
        <div>
          <h3 class="card-title"><i data-lucide="shield-check"></i> Controle de Equipe & Níveis de Acesso</h3>
          <p style="font-size: 13px; color: var(--color-gray-500); margin-top: 4px; font-weight: normal;">
            Cadastre funcionários e defina quais ferramentas da clínica eles podem ler ou alterar no sistema.
          </p>
        </div>
        <button id="btn-add-employee" class="btn btn-primary" style="margin-left: auto;">
          <i data-lucide="user-plus"></i> Novo Integrante
        </button>
      </div>

      <!-- Tabela de Integrantes -->
      <div id="employees-list-container" class="fade-in" style="margin-top: 24px;">
        <div style="text-align: center; padding: 40px; color: var(--color-gray-400);">
          <i data-lucide="loader" class="animate-spin" style="width: 32px; height: 32px; margin-bottom: 12px;"></i>
          <p>Carregando equipe...</p>
        </div>
      </div>
    </div>
  `;
}

/**
 * Inicializa a escuta de eventos e carrega a listagem.
 */
export async function initEmployees() {
  await refreshEmployees();
  
  const btnAdd = document.getElementById("btn-add-employee");
  if (btnAdd) {
    btnAdd.addEventListener("click", openNewEmployeeModal);
  }

  renderEmployeesTable();
}

/**
 * Recarrega cache de funcionários.
 */
async function refreshEmployees() {
  try {
    employeesList = await getClinicEmployees();
  } catch (error) {
    showToast("Erro ao carregar lista de funcionários.", "error");
  }
}

/**
 * Renderiza a tabela de funcionários no container.
 */
function renderEmployeesTable() {
  const container = document.getElementById("employees-list-container");
  if (employeesList.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 40px; color: var(--color-gray-400);">
        <i data-lucide="users" style="width: 48px; height: 48px; margin-bottom: 12px;"></i>
        <p>Nenhum funcionário cadastrado.</p>
      </div>
    `;
    lucide.createIcons();
    return;
  }

  let html = `
    <div class="table-responsive">
      <table class="data-table">
        <thead>
          <tr>
            <th>Nome</th>
            <th>E-mail</th>
            <th>Nível de Acesso (Cargo)</th>
            <th>Data de Cadastro</th>
            <th class="text-right">Ações</th>
          </tr>
        </thead>
        <tbody>
  `;

  employeesList.forEach(emp => {
    const roleBadges = {
      admin: `<span class="status-badge status-badge-danger" style="font-size: 11px;">Administrador</span>`,
      vet: `<span class="status-badge status-badge-warning" style="font-size: 11px; background-color: var(--color-info-light); color: var(--color-info);">Veterinário</span>`,
      staff: `<span class="status-badge status-badge-success" style="font-size: 11px;">Funcionário (Apoio)</span>`,
      client: `<span class="status-badge" style="font-size: 11px; background-color: var(--color-gray-100); color: var(--color-gray-600);">Tutor</span>`
    };

    html += `
      <tr>
        <td><strong>${emp.name}</strong></td>
        <td>${emp.email || 'N/A'}</td>
        <td>${roleBadges[emp.role] || emp.role}</td>
        <td>${formatDate(emp.createdAt)}</td>
        <td class="text-right">
          <div style="display: inline-flex; gap: 6px;">
            <button class="btn btn-ghost btn-icon btn-edit-employee" data-id="${emp.id}" title="Alterar Cargo/Nome" style="width: 32px; height: 32px;">
              <i data-lucide="edit-3" style="width: 16px; height: 16px;"></i>
            </button>
            <button class="btn btn-ghost btn-icon btn-delete-employee" data-id="${emp.id}" data-name="${emp.name}" title="Excluir Acesso" style="width: 32px; height: 32px; color: var(--color-danger);">
              <i data-lucide="user-minus" style="width: 16px; height: 16px;"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  });

  html += `</tbody></table></div>`;
  container.innerHTML = html;
  lucide.createIcons();

  // Binds de Clique
  container.querySelectorAll(".btn-edit-employee").forEach(btn => {
    btn.onclick = () => {
      const empId = btn.getAttribute("data-id");
      const emp = employeesList.find(e => e.id === empId);
      if (emp) openEditEmployeeModal(emp);
    };
  });

  container.querySelectorAll(".btn-delete-employee").forEach(btn => {
    btn.onclick = () => {
      const empId = btn.getAttribute("data-id");
      const empName = btn.getAttribute("data-name");
      handleDeleteEmployee(empId, empName);
    };
  });
}

/**
 * Abre o modal de cadastro de novo funcionário.
 */
function openNewEmployeeModal() {
  const modalHTML = `
    <form id="form-modal-employee">
      <div class="form-group">
        <label for="emp-name">Nome Completo</label>
        <div class="input-wrapper">
          <i data-lucide="user" class="input-icon"></i>
          <input type="text" id="emp-name" required placeholder="Nome do Funcionário">
        </div>
      </div>
      <div class="form-group">
        <label for="emp-email">E-mail Corporativo</label>
        <div class="input-wrapper">
          <i data-lucide="mail" class="input-icon"></i>
          <input type="email" id="emp-email" required placeholder="exemplo@clinica.com">
        </div>
      </div>
      <div class="form-group">
        <label for="emp-password">Senha Provisória</label>
        <div class="input-wrapper">
          <i data-lucide="lock" class="input-icon"></i>
          <input type="password" id="emp-password" required minlength="6" placeholder="Mínimo 6 caracteres">
        </div>
      </div>
      <div class="form-group">
        <label for="emp-role">Nível de Acesso (Cargo)</label>
        <div class="input-wrapper">
          <i data-lucide="shield" class="input-icon"></i>
          <select id="emp-role" required style="width: 100%; height: 38px; border-radius: var(--radius-md); border: 1px solid var(--color-gray-200); padding-left: 42px;">
            <option value="vet">Veterinário (Acesso a prontuários, sem financeiro)</option>
            <option value="staff">Funcionário/Apoio (Recepção, caixa, sem prontuários e financeiro)</option>
            <option value="admin">Administrador (Acesso total)</option>
          </select>
        </div>
      </div>
      <button type="submit" class="btn btn-primary btn-block">Cadastrar Integrante</button>
    </form>
  `;

  showModal("Cadastrar Novo Funcionário", modalHTML);
  lucide.createIcons();

  document.getElementById("form-modal-employee").addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = document.getElementById("emp-name").value;
    const email = document.getElementById("emp-email").value;
    const password = document.getElementById("emp-password").value;
    const role = document.getElementById("emp-role").value;
    
    const submitBtn = e.target.querySelector("button[type='submit']");
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<span>Criando credenciais...</span> <i class="animate-spin" data-lucide="loader"></i>`;
    lucide.createIcons();

    let secondaryApp;
    try {
      // 1. Criar o login no Firebase Auth secundário sem deslogar o admin logado
      secondaryApp = initializeApp(firebaseConfig, "EmployeeCreatorApp");
      const secondaryAuth = getAuth(secondaryApp);
      
      const userCred = await createUserWithEmailAndPassword(secondaryAuth, email, password);
      const newUid = userCred.user.uid;

      // 2. Gravar o documento do perfil na coleção de usuários do Firestore
      const activeClinicId = getActiveClinicId();
      await createEmployeeDoc(newUid, {
        name,
        email,
        role,
        clinicId: activeClinicId,
        status: "active"
      });

      showToast("Funcionário cadastrado com sucesso!", "success");
      hideModal();
      await refreshEmployees();
      renderEmployeesTable();

    } catch (err) {
      console.error(err);
      let errMsg = "Erro ao cadastrar funcionário.";
      if (err.code === "auth/email-already-in-use") {
        errMsg = "Este endereço de e-mail já está em uso.";
      }
      showToast(errMsg, "error");
    } finally {
      if (secondaryApp) {
        await secondaryApp.delete().catch(() => {});
      }
      submitBtn.disabled = false;
      submitBtn.innerHTML = "Cadastrar Integrante";
      lucide.createIcons();
    }
  });
}

/**
 * Abre modal para editar dados básicos do funcionário.
 */
function openEditEmployeeModal(emp) {
  const modalHTML = `
    <form id="form-modal-edit-employee">
      <div class="form-group">
        <label for="emp-edit-name">Nome Completo</label>
        <div class="input-wrapper">
          <i data-lucide="user" class="input-icon"></i>
          <input type="text" id="emp-edit-name" required value="${emp.name}" placeholder="Nome do Funcionário">
        </div>
      </div>
      <div class="form-group">
        <label for="emp-edit-role">Nível de Acesso (Cargo)</label>
        <div class="input-wrapper">
          <i data-lucide="shield" class="input-icon"></i>
          <select id="emp-edit-role" required style="width: 100%; height: 38px; border-radius: var(--radius-md); border: 1px solid var(--color-gray-200); padding-left: 42px;">
            <option value="vet" ${emp.role === 'vet' ? 'selected' : ''}>Veterinário (Acesso a prontuários, sem financeiro)</option>
            <option value="staff" ${emp.role === 'staff' ? 'selected' : ''}>Funcionário/Apoio (Recepção, caixa, sem prontuários e financeiro)</option>
            <option value="admin" ${emp.role === 'admin' ? 'selected' : ''}>Administrador (Acesso total)</option>
          </select>
        </div>
      </div>
      <button type="submit" class="btn btn-primary btn-block">Salvar Alterações</button>
    </form>
  `;

  showModal(`Editar Integrante: ${emp.name}`, modalHTML);
  lucide.createIcons();

  document.getElementById("form-modal-edit-employee").addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = document.getElementById("emp-edit-name").value;
    const role = document.getElementById("emp-edit-role").value;

    try {
      await updateEmployeeDoc(emp.id, {
        name,
        role
      });
      showToast("Cadastro de funcionário atualizado!", "success");
      hideModal();
      await refreshEmployees();
      renderEmployeesTable();
    } catch (err) {
      showToast("Erro ao salvar alterações.", "error");
    }
  });
}

/**
 * Remove o funcionário no Firestore.
 */
async function handleDeleteEmployee(empId, empName) {
  const confirmDel = confirm(`Tem certeza de que deseja remover o funcionário ${empName}? Ele perderá imediatamente o acesso ao sistema da clínica.`);
  if (confirmDel) {
    try {
      await deleteEmployeeDoc(empId);
      showToast("Funcionário removido com sucesso!", "success");
      await refreshEmployees();
      renderEmployeesTable();
    } catch (err) {
      showToast("Erro ao remover funcionário.", "error");
    }
  }
}

// Helpers
function formatDate(dateStr) {
  if (!dateStr) return "N/A";
  const d = new Date(dateStr);
  return d.toLocaleDateString("pt-BR") + " " + d.toLocaleTimeString("pt-BR", { hour: '2-digit', minute: '2-digit' });
}
