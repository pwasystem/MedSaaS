// ==========================================================================
// VETSAAS SAAS SUPER ADMINISTRATOR PANEL MODULE
// ==========================================================================

import { 
  collection, 
  doc, 
  getDocs, 
  getDoc,
  updateDoc, 
  addDoc, 
  query, 
  orderBy 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

import { db } from "./firebase-config.js";
import { showToast, showModal, hideModal } from "./utils.js";

// Cache local de clínicas carregadas
let clinicsCache = [];

/**
 * Renderiza o layout básico da tela de Super Admin no container.
 */
function renderSuperAdmin(container) {
  container.innerHTML = `
    <div class="fade-in">
      <!-- Grid de Métricas Globais do SaaS -->
      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-icon-box primary">
            <i data-lucide="building-2"></i>
          </div>
          <div class="metric-data">
            <span class="metric-label">Total de Clínicas</span>
            <span id="saas-total-clinics" class="metric-value">0</span>
          </div>
        </div>
        
        <div class="metric-card">
          <div class="metric-icon-box success">
            <i data-lucide="check-circle-2"></i>
          </div>
          <div class="metric-data">
            <span class="metric-label">Clínicas Ativas</span>
            <span id="saas-active-clinics" class="metric-value">0</span>
          </div>
        </div>

        <div class="metric-card">
          <div class="metric-icon-box danger">
            <i data-lucide="alert-triangle"></i>
          </div>
          <div class="metric-data">
            <span class="metric-label">Acessos Suspensos</span>
            <span id="saas-suspended-clinics" class="metric-value">0</span>
          </div>
        </div>

        <div class="metric-card">
          <div class="metric-icon-box warning">
            <i data-lucide="wallet"></i>
          </div>
          <div class="metric-data">
            <span class="metric-label">MRR (Faturamento Est.)</span>
            <span id="saas-mrr" class="metric-value">R$ 0,00</span>
          </div>
        </div>
      </div>

      <!-- Container de Controle e Listagem -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">
            <i data-lucide="shield-check" class="text-primary"></i> 
            Clínicas Cadastradas na Plataforma
          </h3>
          <div class="flex-space" style="width: auto;">
            <div class="input-wrapper" style="width: 250px;">
              <i data-lucide="search" class="input-icon"></i>
              <input type="text" id="saas-search-clinic" placeholder="Buscar clínica por nome..." style="padding-top: 8px; padding-bottom: 8px;">
            </div>
            <select id="saas-filter-status" class="btn btn-secondary" style="height: 38px; padding: 0 16px;">
              <option value="all">Todos os Status</option>
              <option value="active">Ativo</option>
              <option value="suspended">Suspenso</option>
            </select>
          </div>
        </div>

        <!-- Tabela Responsiva de Clínicas -->
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Nome da Clínica</th>
                <th>Data de Cadastro</th>
                <th>Plano</th>
                <th>Mensalidade</th>
                <th>Dia Venc.</th>
                <th>Status</th>
                <th class="text-right">Ações</th>
              </tr>
            </thead>
            <tbody id="saas-clinics-list">
              <tr>
                <td colspan="7" class="text-center" style="padding: 40px; color: var(--color-gray-400);">
                  <i data-lucide="loader" class="animate-spin" style="width: 24px; height: 24px; margin-bottom: 8px;"></i>
                  <p>Carregando dados das clínicas...</p>
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
 * Inicializa a tela de Super Admin, carrega os dados e vincula os eventos.
 */
async function initSuperAdmin() {
  await loadSaaSDashboard();
  
  // Registrar eventos de filtro e busca
  document.getElementById("saas-search-clinic")?.addEventListener("input", filterClinicsList);
  document.getElementById("saas-filter-status")?.addEventListener("change", filterClinicsList);
}

/**
 * Carrega a lista completa de clínicas e calcula as métricas do painel SaaS.
 */
async function loadSaaSDashboard() {
  try {
    const clinicsSnap = await getDocs(collection(db, "clinics"));
    clinicsCache = [];
    
    let totalClinics = 0;
    let activeClinics = 0;
    let suspendedClinics = 0;
    let mrr = 0;

    for (const d of clinicsSnap.docs) {
      const clinic = d.data();
      // Garantir campos básicos caso não existam
      const clinicItem = {
        id: d.id,
        name: clinic.name || "Sem Nome",
        createdAt: clinic.createdAt || new Date().toISOString(),
        status: clinic.status || "active",
        monthlyFee: clinic.monthlyFee !== undefined ? Number(clinic.monthlyFee) : 0,
        dueDate: clinic.dueDate !== undefined ? Number(clinic.dueDate) : 10,
        plan: clinic.plan || "Básico",
        logoUrl: clinic.logoUrl || "",
        allowDemoData: clinic.allowDemoData !== false
      };
      
      clinicsCache.push(clinicItem);
      
      totalClinics++;
      if (clinicItem.status === "suspended") {
        suspendedClinics++;
      } else {
        activeClinics++;
        mrr += clinicItem.monthlyFee;
      }
    }

    // Atualizar métricas no DOM
    document.getElementById("saas-total-clinics").textContent = totalClinics;
    document.getElementById("saas-active-clinics").textContent = activeClinics;
    document.getElementById("saas-suspended-clinics").textContent = suspendedClinics;
    document.getElementById("saas-mrr").textContent = formatCurrency(mrr);

    renderClinicsTable(clinicsCache);

  } catch (error) {
    console.error("Erro ao carregar painel SaaS:", error);
    showToast("Erro ao carregar dados do servidor.", "error");
  }
}

/**
 * Renderiza a lista de clínicas na tabela.
 * @param {Array} list Lista de clínicas a exibir
 */
function renderClinicsTable(list) {
  const tbody = document.getElementById("saas-clinics-list");
  if (!tbody) return;

  if (list.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center" style="padding: 40px; color: var(--color-gray-400);">
          <i data-lucide="folder-open" style="width: 24px; height: 24px; margin-bottom: 8px;"></i>
          <p>Nenhuma clínica encontrada.</p>
        </td>
      </tr>
    `;
    lucide.createIcons();
    return;
  }

  tbody.innerHTML = list.map(clinic => {
    const statusClass = clinic.status === "suspended" ? "status-badge-danger" : "status-badge-success";
    const statusText = clinic.status === "suspended" ? "Suspenso" : "Ativo";
    const dateFormatted = new Date(clinic.createdAt).toLocaleDateString("pt-BR");
    
    return `
      <tr class="${clinic.status === "suspended" ? "stock-warning-row" : ""}">
        <td style="font-weight: 600;">${escapeHTML(clinic.name)}</td>
        <td>${dateFormatted}</td>
        <td><span class="status-badge" style="background-color: var(--color-gray-100); color: var(--color-gray-700);">${escapeHTML(clinic.plan)}</span></td>
        <td>${formatCurrency(clinic.monthlyFee)}</td>
        <td>Dia ${clinic.dueDate}</td>
        <td><span class="status-badge ${statusClass}">${statusText}</span></td>
        <td class="text-right">
          <div style="display: inline-flex; gap: 6px;">
            <button class="btn btn-secondary btn-icon btn-action-billing" data-id="${clinic.id}" title="Configurar Faturamento" style="width: 32px; height: 32px;">
              <i data-lucide="sliders" style="width: 14px; height: 14px;"></i>
            </button>
            <button class="btn btn-secondary btn-icon btn-action-payment" data-id="${clinic.id}" title="Registrar Recebimento" style="width: 32px; height: 32px;">
              <i data-lucide="plus-circle" style="width: 14px; height: 14px;"></i>
            </button>
            <button class="btn btn-secondary btn-icon btn-action-history" data-id="${clinic.id}" title="Histórico Financeiro" style="width: 32px; height: 32px;">
              <i data-lucide="history" style="width: 14px; height: 14px;"></i>
            </button>
            ${clinic.status === "suspended" 
              ? `<button class="btn btn-primary btn-icon btn-action-toggle" data-id="${clinic.id}" data-action="activate" title="Habilitar Acesso" style="width: 32px; height: 32px; background-color: var(--color-success);">
                   <i data-lucide="unlock" style="width: 14px; height: 14px; color: white;"></i>
                 </button>`
              : `<button class="btn btn-danger btn-icon btn-action-toggle" data-id="${clinic.id}" data-action="suspend" title="Suspender Acesso" style="width: 32px; height: 32px;">
                   <i data-lucide="lock" style="width: 14px; height: 14px; color: white;"></i>
                 </button>`
            }
          </div>
        </td>
      </tr>
    `;
  }).join("");

  lucide.createIcons();
  bindTableActionEvents();
}

/**
 * Filtra a lista local de clínicas baseando-se no texto de busca e status.
 */
function filterClinicsList() {
  const searchQuery = document.getElementById("saas-search-clinic").value.toLowerCase();
  const filterStatus = document.getElementById("saas-filter-status").value;

  const filtered = clinicsCache.filter(clinic => {
    const matchesSearch = clinic.name.toLowerCase().includes(searchQuery);
    const matchesStatus = filterStatus === "all" || clinic.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  renderClinicsTable(filtered);
}

/**
 * Vincula os eventos de clique das ações em cada linha da tabela.
 */
function bindTableActionEvents() {
  // Alterar Status (Ativar / Suspender)
  document.querySelectorAll(".btn-action-toggle").forEach(btn => {
    btn.addEventListener("click", async (e) => {
      const btnEl = e.currentTarget;
      const clinicId = btnEl.getAttribute("data-id");
      const action = btnEl.getAttribute("data-action");
      
      const newStatus = action === "activate" ? "active" : "suspended";
      const confirmMsg = action === "activate" 
        ? "Deseja reestabelecer o acesso desta clínica ao sistema?" 
        : "ATENÇÃO! Deseja suspender o acesso desta clínica? Todos os usuários vinculados serão bloqueados imediatamente.";
      
      if (confirm(confirmMsg)) {
        try {
          btnEl.disabled = true;
          await updateDoc(doc(db, "clinics", clinicId), { status: newStatus });
          showToast(`Clínica ${newStatus === "active" ? "habilitada" : "suspensa"} com sucesso!`, "success");
          await loadSaaSDashboard();
        } catch (error) {
          console.error("Erro ao alterar status da clínica:", error);
          showToast("Erro ao atualizar status da clínica.", "error");
        } finally {
          btnEl.disabled = false;
        }
      }
    });
  });

  // Configurar Faturamento (Plano, Valor, Vencimento)
  document.querySelectorAll(".btn-action-billing").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const clinicId = e.currentTarget.getAttribute("data-id");
      const clinic = clinicsCache.find(c => c.id === clinicId);
      if (!clinic) return;

      showModal("Configurar Faturamento da Clínica", `
        <form id="form-saas-billing-config">
          <input type="hidden" id="billing-clinic-id" value="${clinic.id}">
          <div class="form-group">
            <label>Nome da Clínica</label>
            <input type="text" value="${escapeHTML(clinic.name)}" disabled class="input-wrapper" style="background-color: var(--color-gray-100); padding: 12px;">
          </div>
          <div class="form-row">
            <div class="form-group">
              <label for="billing-plan">Plano do SaaS</label>
              <div class="input-wrapper">
                <i data-lucide="award" class="input-icon"></i>
                <select id="billing-plan" required>
                  <option value="Básico" ${clinic.plan === "Básico" ? "selected" : ""}>Básico</option>
                  <option value="Profissional" ${clinic.plan === "Profissional" ? "selected" : ""}>Profissional</option>
                  <option value="Premium" ${clinic.plan === "Premium" ? "selected" : ""}>Premium</option>
                </select>
              </div>
            </div>
            <div class="form-group">
              <label for="billing-due-date">Dia do Vencimento</label>
              <div class="input-wrapper">
                <i data-lucide="calendar-days" class="input-icon"></i>
                <input type="number" id="billing-due-date" min="1" max="28" value="${clinic.dueDate}" required>
              </div>
            </div>
          </div>
          <div class="form-group">
            <label for="billing-fee">Valor da Mensalidade (R$)</label>
            <div class="input-wrapper">
              <i data-lucide="dollar-sign" class="input-icon"></i>
              <input type="number" id="billing-fee" step="0.01" min="0" value="${clinic.monthlyFee}" required placeholder="Ex: 149.90">
            </div>
          </div>
          <div class="form-group" style="margin-top: 12px; display: flex; align-items: center; gap: 8px;">
            <input type="checkbox" id="billing-allow-demo" ${clinic.allowDemoData !== false ? "checked" : ""} style="width: auto; margin-bottom: 0;">
            <label for="billing-allow-demo" style="margin-bottom: 0; cursor: pointer; font-weight: 500;">Permitir Geração de Dados de Exemplo</label>
          </div>
          <button type="submit" class="btn btn-primary btn-block" style="margin-top: 10px;">Salvar Configurações</button>
        </form>
      `);

      lucide.createIcons();

      document.getElementById("form-saas-billing-config")?.addEventListener("submit", async (ev) => {
        ev.preventDefault();
        const id = document.getElementById("billing-clinic-id").value;
        const plan = document.getElementById("billing-plan").value;
        const dueDate = Number(document.getElementById("billing-due-date").value);
        const monthlyFee = Number(document.getElementById("billing-fee").value);
        const allowDemoData = document.getElementById("billing-allow-demo").checked;
        const submitBtn = ev.target.querySelector("button[type='submit']");

        try {
          submitBtn.disabled = true;
          submitBtn.textContent = "Salvando...";
          await updateDoc(doc(db, "clinics", id), {
            plan,
            dueDate,
            monthlyFee,
            allowDemoData
          });
          showToast("Faturamento configurado com sucesso!", "success");
          hideModal();
          await loadSaaSDashboard();
        } catch (err) {
          console.error("Erro ao salvar faturamento:", err);
          showToast("Erro ao salvar faturamento.", "error");
        } finally {
          submitBtn.disabled = false;
        }
      });
    });
  });

  // Registrar Recebimento
  document.querySelectorAll(".btn-action-payment").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const clinicId = e.currentTarget.getAttribute("data-id");
      const clinic = clinicsCache.find(c => c.id === clinicId);
      if (!clinic) return;

      const todayStr = new Date().toISOString().substring(0, 10);

      showModal("Registrar Recebimento Financeiro", `
        <form id="form-saas-payment">
          <input type="hidden" id="pay-clinic-id" value="${clinic.id}">
          <div class="form-group">
            <label>Clínica Inquilina</label>
            <input type="text" value="${escapeHTML(clinic.name)}" disabled style="background-color: var(--color-gray-100); padding: 12px; border-radius: var(--radius-md); border: 1px solid var(--color-gray-200); width:100%;">
          </div>
          <div class="form-row">
            <div class="form-group">
              <label for="pay-amount">Valor Pago (R$)</label>
              <div class="input-wrapper">
                <i data-lucide="dollar-sign" class="input-icon"></i>
                <input type="number" id="pay-amount" step="0.01" min="0" value="${clinic.monthlyFee}" required>
              </div>
            </div>
            <div class="form-group">
              <label for="pay-date">Data do Pagamento</label>
              <div class="input-wrapper">
                <i data-lucide="calendar" class="input-icon"></i>
                <input type="date" id="pay-date" value="${todayStr}" required>
              </div>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label for="pay-ref-month">Vencimento de Referência</label>
              <div class="input-wrapper">
                <i data-lucide="clock" class="input-icon"></i>
                <input type="date" id="pay-ref-month" required>
              </div>
            </div>
            <div class="form-group">
              <label for="pay-method">Método de Pagamento</label>
              <div class="input-wrapper">
                <i data-lucide="wallet" class="input-icon"></i>
                <select id="pay-method" required>
                  <option value="PIX">PIX</option>
                  <option value="Boleto">Boleto Bancário</option>
                  <option value="Cartão de Crédito">Cartão de Crédito</option>
                  <option value="Transferência">TED / DOC</option>
                </select>
              </div>
            </div>
          </div>
          <button type="submit" class="btn btn-primary btn-block" style="margin-top: 10px;">Confirmar Recebimento</button>
        </form>
      `);

      lucide.createIcons();

      // Definir data de referência inicial baseada no vencimento padrão
      const currentYear = new Date().getFullYear();
      const currentMonth = String(new Date().getMonth() + 1).padStart(2, "0");
      const refDay = String(clinic.dueDate).padStart(2, "0");
      document.getElementById("pay-ref-month").value = `${currentYear}-${currentMonth}-${refDay}`;

      document.getElementById("form-saas-payment")?.addEventListener("submit", async (ev) => {
        ev.preventDefault();
        const id = document.getElementById("pay-clinic-id").value;
        const amount = Number(document.getElementById("pay-amount").value);
        const paymentDate = document.getElementById("pay-date").value;
        const dueDate = document.getElementById("pay-ref-month").value;
        const method = document.getElementById("pay-method").value;
        const submitBtn = ev.target.querySelector("button[type='submit']");

        try {
          submitBtn.disabled = true;
          submitBtn.textContent = "Registrando...";
          
          const billingRef = collection(db, "clinics", id, "billing_history");
          await addDoc(billingRef, {
            amount,
            paymentDate,
            dueDate,
            method,
            createdAt: new Date().toISOString()
          });

          showToast("Recebimento registrado com sucesso!", "success");
          hideModal();
          await loadSaaSDashboard();
        } catch (err) {
          console.error("Erro ao registrar pagamento:", err);
          showToast("Erro ao registrar pagamento.", "error");
        } finally {
          submitBtn.disabled = false;
        }
      });
    });
  });

  // Histórico de Recebimentos
  document.querySelectorAll(".btn-action-history").forEach(btn => {
    btn.addEventListener("click", async (e) => {
      const clinicId = e.currentTarget.getAttribute("data-id");
      const clinic = clinicsCache.find(c => c.id === clinicId);
      if (!clinic) return;

      showModal("Histórico de Faturamento - " + escapeHTML(clinic.name), `
        <div class="table-responsive" style="max-height: 350px; overflow-y: auto;">
          <table class="data-table">
            <thead>
              <tr>
                <th>Data Ref. Venc.</th>
                <th>Data Pagamento</th>
                <th>Forma de Pagto.</th>
                <th>Valor Recebido</th>
              </tr>
            </thead>
            <tbody id="saas-billing-history-body">
              <tr>
                <td colspan="4" class="text-center" style="padding: 20px; color: var(--color-gray-400);">
                  <i data-lucide="loader" class="animate-spin" style="width: 18px; height: 18px;"></i>
                  <span>Buscando lançamentos...</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      `);

      lucide.createIcons();

      try {
        const billingRef = collection(db, "clinics", clinic.id, "billing_history");
        const q = query(billingRef, orderBy("paymentDate", "desc"));
        const snap = await getDocs(q);
        const tbody = document.getElementById("saas-billing-history-body");

        if (snap.empty) {
          tbody.innerHTML = `
            <tr>
              <td colspan="4" class="text-center" style="padding: 30px; color: var(--color-gray-500);">
                Nenhum pagamento registrado no histórico.
              </td>
            </tr>
          `;
          return;
        }

        tbody.innerHTML = snap.docs.map(docSnap => {
          const item = docSnap.data();
          const datePay = new Date(item.paymentDate + "T12:00:00").toLocaleDateString("pt-BR");
          const dateDue = new Date(item.dueDate + "T12:00:00").toLocaleDateString("pt-BR");
          return `
            <tr>
              <td style="font-weight: 500;">${dateDue}</td>
              <td>${datePay}</td>
              <td><span class="status-badge" style="background-color: var(--color-gray-100); color: var(--color-gray-700); font-size: 11px;">${escapeHTML(item.method || "PIX")}</span></td>
              <td style="font-weight: 600; color: var(--color-success);">${formatCurrency(item.amount)}</td>
            </tr>
          `;
        }).join("");

      } catch (err) {
        console.error("Erro ao carregar histórico de pagamentos:", err);
        const tbody = document.getElementById("saas-billing-history-body");
        if (tbody) {
          tbody.innerHTML = `
            <tr>
              <td colspan="4" class="text-center" style="color: var(--color-danger); padding: 20px;">
                Falha ao ler dados do Firestore. Verifique as regras de segurança.
              </td>
            </tr>
          `;
        }
      }
    });
  });
}

/**
 * Auxiliar: Formatação de moeda BRL.
 */
function formatCurrency(val) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);
}

/**
 * Auxiliar: Evita Injeção HTML.
 */
function escapeHTML(str) {
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

export { renderSuperAdmin, initSuperAdmin };
