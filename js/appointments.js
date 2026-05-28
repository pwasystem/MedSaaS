// ==========================================================================
// CLINIC LOCAL APPOINTMENTS MANAGEMENT MODULE
// ==========================================================================

import { 
  addTenantDoc, 
  getTenantDocs, 
  updateTenantDoc, 
  deleteTenantDoc 
} from "./db.js";
import { showToast, showModal, hideModal } from "./utils.js";
import { showPetDetails } from "./pets.js";

let appointmentsList = [];
let petsList = [];
let clientsList = [];

/**
 * Renderiza o layout da tela de agendamento local.
 */
export function renderAppointmentsView(container) {
  container.innerHTML = `
    <div class="fade-in">
      <!-- Grid de Métricas de Agendamentos -->
      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-icon-box primary">
            <i data-lucide="calendar"></i>
          </div>
          <div class="metric-data">
            <span class="metric-label">Consultas Hoje</span>
            <span id="apt-metric-today" class="metric-value">0</span>
          </div>
        </div>
        
        <div class="metric-card">
          <div class="metric-icon-box success">
            <i data-lucide="calendar-check"></i>
          </div>
          <div class="metric-data">
            <span class="metric-label">Próximos Compromissos</span>
            <span id="apt-metric-upcoming" class="metric-value">0</span>
          </div>
        </div>

        <div class="metric-card">
          <div class="metric-icon-box info">
            <i data-lucide="check-circle-2"></i>
          </div>
          <div class="metric-data">
            <span class="metric-label">Concluídos este Mês</span>
            <span id="apt-metric-completed" class="metric-value">0</span>
          </div>
        </div>
      </div>

      <!-- Tabela e Ações de Agenda -->
      <div class="card">
        <div class="card-header" style="flex-wrap: wrap; gap: 16px;">
          <h3 class="card-title"><i data-lucide="clock"></i> Agenda de Consultas</h3>
          <div style="display: flex; gap: 12px; margin-left: auto;">
            <select id="apt-filter-status" class="btn btn-secondary" style="height: 38px; padding: 0 16px;">
              <option value="all">Todos os Status</option>
              <option value="scheduled">Agendados</option>
              <option value="completed">Concluídos</option>
              <option value="cancelled">Cancelados</option>
            </select>
            <button id="btn-new-appointment" class="btn btn-primary"><i data-lucide="plus"></i> Novo Agendamento</button>
          </div>
        </div>

        <!-- Tabela de Consultas -->
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Data e Hora</th>
                <th>Paciente</th>
                <th>Médico / Profissional</th>
                <th>Descrição / Sintomas</th>
                <th>Status</th>
                <th class="text-right">Ações</th>
              </tr>
            </thead>
            <tbody id="appointments-list-body">
              <tr>
                <td colspan="6" class="text-center" style="padding: 40px; color: var(--color-gray-400);">
                  <i data-lucide="loader" class="animate-spin" style="width: 24px; height: 24px; margin-bottom: 8px;"></i>
                  <p>Carregando agenda...</p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
  lucide.createIcons();
}

/**
 * Inicializa a tela da agenda e seus ouvintes de eventos.
 */
export async function initAppointmentsView() {
  await refreshData();
  
  // Vincular eventos
  document.getElementById("btn-new-appointment").onclick = openNewAppointmentModal;
  document.getElementById("apt-filter-status").onchange = filterAppointments;

  // Render inicial
  renderMetrics();
  renderAppointmentsTable();
}

/**
 * Carrega a lista do Firestore
 */
async function refreshData() {
  try {
    appointmentsList = await getTenantDocs("appointments");
    petsList = await getTenantDocs("pets");
    clientsList = await getTenantDocs("clients");
    
    // Ordenar por data crescente (próximos compromissos no topo)
    appointmentsList.sort((a, b) => new Date(a.date) - new Date(b.date));
  } catch (error) {
    showToast("Erro ao carregar dados da agenda.", "error");
  }
}

/**
 * Calcula e renderiza as estatísticas da tela.
 */
function renderMetrics() {
  const todayStr = new Date().toISOString().substring(0, 10);
  
  let todayCount = 0;
  let upcomingCount = 0;
  let completedCount = 0;

  appointmentsList.forEach(apt => {
    const aptDateStr = apt.date.substring(0, 10);
    const isToday = aptDateStr === todayStr;
    const isFuture = new Date(apt.date) > new Date();

    if (isToday && apt.status === "scheduled") {
      todayCount++;
    }
    if (isFuture && apt.status === "scheduled") {
      upcomingCount++;
    }
    if (apt.status === "completed") {
      completedCount++;
    }
  });

  document.getElementById("apt-metric-today").textContent = todayCount;
  document.getElementById("apt-metric-upcoming").textContent = upcomingCount;
  document.getElementById("apt-metric-completed").textContent = completedCount;
}

/**
 * Renderiza a lista de consultas na tabela.
 * @param {Array} list Lista de agendamentos a exibir
 */
function renderAppointmentsTable(list = appointmentsList) {
  const tbody = document.getElementById("appointments-list-body");
  if (!tbody) return;

  if (list.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center" style="padding: 40px; color: var(--color-gray-400);">
          <i data-lucide="calendar" style="width: 24px; height: 24px; margin-bottom: 8px;"></i>
          <p>Nenhuma consulta agendada.</p>
        </td>
      </tr>
    `;
    lucide.createIcons();
    return;
  }

  tbody.innerHTML = list.map(apt => {
    const isCompleted = apt.status === "completed";
    const isCancelled = apt.status === "cancelled";
    
    let statusClass = "status-badge-warning";
    let statusText = "Agendado";
    if (isCompleted) {
      statusClass = "status-badge-success";
      statusText = "Concluído";
    } else if (isCancelled) {
      statusClass = "status-badge-danger";
      statusText = "Cancelado";
    }

    const dateFormatted = new Date(apt.date).toLocaleString("pt-BR", {
      dateStyle: "short",
      timeStyle: "short"
    });

    return `
      <tr style="${isCancelled ? 'opacity: 0.6; background-color: var(--color-gray-50);' : ''}">
        <td style="font-weight: 600;">${dateFormatted}</td>
        <td><strong>${escapeHTML(apt.petName)}</strong></td>
        <td>${escapeHTML(apt.vetName)}</td>
        <td style="max-width: 250px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
          ${escapeHTML(apt.description || 'N/A')}
        </td>
        <td><span class="status-badge ${statusClass}">${statusText}</span></td>
        <td class="text-right">
          <div style="display: inline-flex; gap: 6px;">
            ${!isCompleted && !isCancelled ? `
              <button class="btn btn-ghost btn-icon btn-complete-apt" data-id="${apt.id}" title="Marcar como Concluído" style="width: 32px; height: 32px; color: var(--color-success);">
                <i data-lucide="check-circle" style="width: 16px; height: 16px;"></i>
              </button>
              <button class="btn btn-ghost btn-icon btn-cancel-apt" data-id="${apt.id}" title="Cancelar Agendamento" style="width: 32px; height: 32px; color: var(--color-danger);">
                <i data-lucide="x-circle" style="width: 16px; height: 16px;"></i>
              </button>
            ` : ''}
            <button class="btn btn-ghost btn-icon btn-view-pet-record" data-petid="${apt.petId}" title="Ver Prontuário" style="width: 32px; height: 32px; color: var(--brand-primary);">
              <i data-lucide="stethoscope" style="width: 16px; height: 16px;"></i>
            </button>
            <button class="btn btn-ghost btn-icon btn-edit-apt" data-id="${apt.id}" title="Editar Consulta" style="width: 32px; height: 32px;">
              <i data-lucide="edit-3" style="width: 16px; height: 16px;"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join("");

  lucide.createIcons();
  bindTableActions();
}

/**
 * Vincula eventos nos botões de ação na tabela de agendamentos.
 */
function bindTableActions() {
  // Concluir agendamento
  document.querySelectorAll(".btn-complete-apt").forEach(btn => {
    btn.onclick = async (e) => {
      const id = e.currentTarget.getAttribute("data-id");
      try {
        await updateTenantDoc("appointments", id, { status: "completed" });
        showToast("Consulta concluída com sucesso!", "success");
        await refreshData();
        renderMetrics();
        renderAppointmentsTable();
      } catch (err) {
        showToast("Erro ao atualizar agendamento.", "error");
      }
    };
  });

  // Cancelar agendamento
  document.querySelectorAll(".btn-cancel-apt").forEach(btn => {
    btn.onclick = async (e) => {
      const id = e.currentTarget.getAttribute("data-id");
      if (confirm("Deseja marcar este agendamento como cancelado?")) {
        try {
          await updateTenantDoc("appointments", id, { status: "cancelled" });
          showToast("Consulta cancelada.", "info");
          await refreshData();
          renderMetrics();
          renderAppointmentsTable();
        } catch (err) {
          showToast("Erro ao cancelar agendamento.", "error");
        }
      }
    };
  });

  // Editar agendamento
  document.querySelectorAll(".btn-edit-apt").forEach(btn => {
    btn.onclick = (e) => {
      const id = e.currentTarget.getAttribute("data-id");
      openEditAppointmentModal(id);
    };
  });

  // Abrir prontuário do paciente
  document.querySelectorAll(".btn-view-pet-record").forEach(btn => {
    btn.onclick = (e) => {
      const petId = e.currentTarget.getAttribute("data-petid");
      if (petId) {
        showPetDetails(petId);
      } else {
        showToast("Paciente não encontrado para este agendamento.", "warning");
      }
    };
  });
}

/**
 * Filtra agendamentos baseado no status selecionado.
 */
function filterAppointments() {
  const status = document.getElementById("apt-filter-status").value;
  if (status === "all") {
    renderAppointmentsTable(appointmentsList);
  } else {
    const filtered = appointmentsList.filter(apt => apt.status === status);
    renderAppointmentsTable(filtered);
  }
}

/**
 * Modal para criação de agendamento local.
 */
function openNewAppointmentModal() {
  if (petsList.length === 0) {
    showToast("É necessário ter pelo menos um paciente cadastrado antes de agendar.", "warning");
    return;
  }

  let petOptions = `<option value="" disabled selected>Selecione o paciente...</option>`;
  petsList.forEach(pet => {
    petOptions += `<option value="${pet.id}" data-petname="${pet.name}">${pet.name} (CPF: ${pet.cpf || 'Não Informado'})</option>`;
  });

  showModal("Novo Agendamento", `
    <form id="form-modal-new-apt">
      <div class="form-group">
        <label for="na-pet">Paciente</label>
        <div class="input-wrapper">
          <i data-lucide="user" class="input-icon"></i>
          <select id="na-pet" required>
            ${petOptions}
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label for="na-vet">Médico / Profissional</label>
          <div class="input-wrapper">
            <i data-lucide="stethoscope" class="input-icon"></i>
            <input type="text" id="na-vet" required placeholder="Nome do Profissional">
          </div>
        </div>
        <div class="form-group">
          <label for="na-date">Data e Hora</label>
          <div class="input-wrapper">
            <i data-lucide="calendar" class="input-icon"></i>
            <input type="datetime-local" id="na-date" required>
          </div>
        </div>
      </div>
      <div class="form-group">
        <label for="na-desc">Descrição do Procedimento / Sintomas</label>
        <div class="input-wrapper">
          <i data-lucide="file-text" class="input-icon"></i>
          <textarea id="na-desc" placeholder="Ex: Consulta de rotina, exames, queixas..."></textarea>
        </div>
      </div>
      <button type="submit" class="btn btn-primary btn-block">Confirmar Agendamento</button>
    </form>
  `);

  lucide.createIcons();

  document.getElementById("form-modal-new-apt").addEventListener("submit", async (e) => {
    e.preventDefault();
    
    const petSelect = document.getElementById("na-pet");
    const selectedOption = petSelect.options[petSelect.selectedIndex];
    
    const petId = petSelect.value;
    const petName = selectedOption.getAttribute("data-petname");
    const clientName = "";
    const vetName = document.getElementById("na-vet").value;
    const date = document.getElementById("na-date").value;
    const description = document.getElementById("na-desc").value;

    const data = {
      petId,
      petName,
      clientName,
      vetName,
      date,
      description,
      status: "scheduled"
    };

    try {
      await addTenantDoc("appointments", data);
      showToast("Consulta agendada no sistema com sucesso!", "success");
      hideModal();
      await refreshData();
      renderMetrics();
      renderAppointmentsTable();
    } catch (err) {
      showToast("Erro ao salvar agendamento.", "error");
    }
  });
}

/**
 * Modal para edição de agendamento local.
 */
function openEditAppointmentModal(aptId) {
  const apt = appointmentsList.find(a => a.id === aptId);
  if (!apt) return;

  let petOptions = ``;
  petsList.forEach(pet => {
    petOptions += `<option value="${pet.id}" data-petname="${pet.name}" ${pet.id === apt.petId ? 'selected' : ''}>${pet.name} (CPF: ${pet.cpf || 'Não Informado'})</option>`;
  });

  showModal("Editar Consulta", `
    <form id="form-modal-edit-apt">
      <div class="form-group">
        <label for="ea-pet">Paciente</label>
        <div class="input-wrapper">
          <i data-lucide="user" class="input-icon"></i>
          <select id="ea-pet" required>
            ${petOptions}
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label for="ea-vet">Médico / Profissional</label>
          <div class="input-wrapper">
            <i data-lucide="stethoscope" class="input-icon"></i>
            <input type="text" id="ea-vet" required value="${escapeHTML(apt.vetName)}" placeholder="Nome do Profissional">
          </div>
        </div>
        <div class="form-group">
          <label for="ea-date">Data e Hora</label>
          <div class="input-wrapper">
            <i data-lucide="calendar" class="input-icon"></i>
            <input type="datetime-local" id="ea-date" required value="${apt.date}">
          </div>
        </div>
      </div>
      <div class="form-group">
        <label for="ea-status">Status do Agendamento</label>
        <div class="input-wrapper">
          <i data-lucide="check-square" class="input-icon"></i>
          <select id="ea-status" required>
            <option value="scheduled" ${apt.status === 'scheduled' ? 'selected' : ''}>Agendado</option>
            <option value="completed" ${apt.status === 'completed' ? 'selected' : ''}>Concluído</option>
            <option value="cancelled" ${apt.status === 'cancelled' ? 'selected' : ''}>Cancelado</option>
          </select>
        </div>
      </div>
      <div class="form-group">
        <label for="ea-desc">Descrição do Procedimento / Sintomas</label>
        <div class="input-wrapper">
          <i data-lucide="file-text" class="input-icon"></i>
          <textarea id="ea-desc" placeholder="Ex: Sintomas do paciente...">${escapeHTML(apt.description || '')}</textarea>
        </div>
      </div>
      
      <div style="display: flex; gap: 12px; margin-top: 10px;">
        <button type="button" id="btn-delete-apt-def" class="btn btn-danger" style="flex: 1;">Excluir Consulta</button>
        <button type="submit" class="btn btn-primary" style="flex: 2;">Salvar Alterações</button>
      </div>
    </form>
  `);

  lucide.createIcons();

  document.getElementById("form-modal-edit-apt").addEventListener("submit", async (e) => {
    e.preventDefault();
    
    const petSelect = document.getElementById("ea-pet");
    const selectedOption = petSelect.options[petSelect.selectedIndex];
    
    const petId = petSelect.value;
    const petName = selectedOption.getAttribute("data-petname");
    const clientName = "";
    const vetName = document.getElementById("ea-vet").value;
    const date = document.getElementById("ea-date").value;
    const status = document.getElementById("ea-status").value;
    const description = document.getElementById("ea-desc").value;

    const data = {
      petId,
      petName,
      clientName,
      vetName,
      date,
      status,
      description
    };

    try {
      await updateTenantDoc("appointments", aptId, data);
      showToast("Agendamento atualizado com sucesso!", "success");
      hideModal();
      await refreshData();
      renderMetrics();
      renderAppointmentsTable();
    } catch (err) {
      showToast("Erro ao atualizar agendamento.", "error");
    }
  });

  document.getElementById("btn-delete-apt-def").onclick = async () => {
    if (confirm("Deseja excluir definitivamente este agendamento do banco de dados?")) {
      try {
        await deleteTenantDoc("appointments", aptId);
        showToast("Agendamento excluído definitivamente.", "success");
        hideModal();
        await refreshData();
        renderMetrics();
        renderAppointmentsTable();
      } catch (err) {
        showToast("Erro ao excluir agendamento.", "error");
      }
    }
  };
}

function escapeHTML(str) {
  if (!str) return "";
  return str.replace(/[&<>'"]/g, 
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag)
  );
}
