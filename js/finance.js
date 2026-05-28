// ==========================================================================
// CLINIC FINANCIAL CONTROL, BACKUP UTILITY & FILTER MODULE
// ==========================================================================

import { addTenantDoc, getTenantDocs, updateTenantDoc, deleteTenantDoc } from "./db.js";
import { showToast, showModal, hideModal } from "./utils.js";

let transactionsList = [];
let filteredTransactions = null;

/**
 * Renderiza a visualização do painel financeiro.
 */
export function renderFinance(container) {
  container.innerHTML = `
    <!-- Painel de Consolidação de Saldo -->
    <div class="metrics-grid fade-in">
      <div class="metric-card">
        <div class="metric-icon-box success">
          <i data-lucide="arrow-up-right"></i>
        </div>
        <div class="metric-data">
          <span class="metric-label">Total Receitas</span>
          <span id="fin-metric-income" class="metric-value" style="color: var(--color-success);">R$ 0,00</span>
        </div>
      </div>

      <div class="metric-card">
        <div class="metric-icon-box danger">
          <i data-lucide="arrow-down-left"></i>
        </div>
        <div class="metric-data">
          <span class="metric-label">Total Despesas</span>
          <span id="fin-metric-expenses" class="metric-value" style="color: var(--color-danger);">R$ 0,00</span>
        </div>
      </div>

      <div class="metric-card" id="fin-card-balance">
        <div class="metric-icon-box primary">
          <i data-lucide="wallet"></i>
        </div>
        <div class="metric-data">
          <span class="metric-label">Saldo Consolidado</span>
          <span id="fin-metric-balance" class="metric-value">R$ 0,00</span>
        </div>
      </div>
    </div>

    <!-- Botões de Ações e Registro -->
    <div class="card fade-in">
      <div class="card-header" style="flex-wrap: wrap; gap: 16px;">
        <h3 class="card-title"><i data-lucide="dollar-sign"></i> Extrato do Fluxo de Caixa</h3>
        <div style="display: flex; gap: 12px; margin-left: auto; flex-wrap: wrap;">
          <button id="btn-backup-data" class="btn btn-secondary"><i data-lucide="download-cloud"></i> Baixar Backup JSON</button>
          <button id="btn-export-csv" class="btn btn-secondary"><i data-lucide="file-spreadsheet"></i> Exportar CSV</button>
          <button id="btn-add-transaction" class="btn btn-primary"><i data-lucide="plus"></i> Lançar Transação</button>
        </div>
      </div>

      <!-- Filtros por Período -->
      <div style="background: var(--color-gray-50); padding: 16px; border-radius: var(--radius-md); margin-top: 16px; display: flex; gap: 16px; align-items: flex-end; flex-wrap: wrap;">
        <div class="form-group" style="margin-bottom: 0; flex: 1; min-width: 150px; text-align: left;">
          <label for="fin-filter-start" style="font-size: 12px; font-weight: 600; color: var(--color-gray-600);">Data Inicial</label>
          <input type="date" id="fin-filter-start" style="height: 38px; padding: 0 10px; border-radius: var(--radius-md); border: 1px solid var(--color-gray-200); width: 100%;">
        </div>
        <div class="form-group" style="margin-bottom: 0; flex: 1; min-width: 150px; text-align: left;">
          <label for="fin-filter-end" style="font-size: 12px; font-weight: 600; color: var(--color-gray-600);">Data Final</label>
          <input type="date" id="fin-filter-end" style="height: 38px; padding: 0 10px; border-radius: var(--radius-md); border: 1px solid var(--color-gray-200); width: 100%;">
        </div>
        <div style="display: flex; gap: 8px;">
          <button id="btn-fin-filter-apply" class="btn btn-secondary" style="height: 38px; padding: 0 16px; display: flex; align-items: center; gap: 6px;">
            <i data-lucide="filter" style="width: 16px; height: 16px;"></i> Filtrar
          </button>
          <button id="btn-fin-filter-clear" class="btn btn-ghost" style="height: 38px; padding: 0 16px; display: flex; align-items: center; gap: 6px;">
            <i data-lucide="x" style="width: 16px; height: 16px;"></i> Limpar
          </button>
        </div>
      </div>

      <!-- Tabela Financeira -->
      <div id="finance-table-container" style="margin-top: 24px;">
        <!-- Injetado dinamicamente -->
      </div>
    </div>
  `;
}

/**
 * Inicializa dados financeiros e eventos.
 */
export async function initFinance() {
  filteredTransactions = null;
  await refreshData();

  // Binds de cliques
  document.getElementById("btn-add-transaction").onclick = openTransactionModal;
  document.getElementById("btn-export-csv").onclick = handleCSVExport;
  document.getElementById("btn-backup-data").onclick = handleBackupJSON;

  // Binds de filtros
  document.getElementById("btn-fin-filter-apply").onclick = handleFilter;
  document.getElementById("btn-fin-filter-clear").onclick = clearFilter;

  // Render inicial
  renderTotals();
  renderFinanceTable();
  lucide.createIcons();
}

async function refreshData() {
  try {
    transactionsList = await getTenantDocs("finance");
    // Ordenar por data decrescente
    transactionsList.sort((a, b) => new Date(b.date) - new Date(a.date));
  } catch (e) {
    showToast("Erro ao carregar registros do fluxo de caixa.", "error");
  }
}

/**
 * Executa o filtro de período por datas
 */
function handleFilter() {
  const startVal = document.getElementById("fin-filter-start").value;
  const endVal = document.getElementById("fin-filter-end").value;

  if (!startVal && !endVal) {
    filteredTransactions = null;
    renderTotals();
    renderFinanceTable();
    return;
  }

  filteredTransactions = transactionsList.filter(t => {
    const tDate = new Date(t.date + "T12:00:00");
    let matches = true;

    if (startVal) {
      const startDate = new Date(startVal + "T00:00:00");
      matches = matches && (tDate >= startDate);
    }

    if (endVal) {
      const endDate = new Date(endVal + "T23:59:59");
      matches = matches && (tDate <= endDate);
    }

    return matches;
  });

  renderTotals(filteredTransactions);
  renderFinanceTable(filteredTransactions);
  showToast("Período filtrado com sucesso!", "success");
}

/**
 * Limpa os filtros de data
 */
function clearFilter() {
  document.getElementById("fin-filter-start").value = "";
  document.getElementById("fin-filter-end").value = "";
  filteredTransactions = null;
  renderTotals();
  renderFinanceTable();
}

/**
 * Consolida e renderiza os totais e a cor do cartão de saldo.
 */
function renderTotals(items = (filteredTransactions || transactionsList)) {
  let income = 0;
  let expenses = 0;

  items.forEach(t => {
    const val = parseFloat(t.amount || 0);
    if (t.type === "income") {
      income += val;
    } else {
      expenses += val;
    }
  });

  const balance = income - expenses;
  const formatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

  document.getElementById("fin-metric-income").textContent = formatter.format(income);
  document.getElementById("fin-metric-expenses").textContent = formatter.format(expenses);
  
  const balEl = document.getElementById("fin-metric-balance");
  balEl.textContent = formatter.format(balance);
  balEl.style.color = balance >= 0 ? "var(--color-success)" : "var(--color-danger)";
}

function renderFinanceTable(items = (filteredTransactions || transactionsList)) {
  const container = document.getElementById("finance-table-container");
  if (items.length === 0) {
    container.innerHTML = `<div style="text-align: center; padding: 40px; color: var(--color-gray-400);"><p>Nenhuma transação financeira encontrada.</p></div>`;
    return;
  }

  let html = `
    <div class="table-responsive">
      <table class="data-table">
        <thead>
          <tr>
            <th>Data</th>
            <th>Descrição</th>
            <th>Categoria</th>
            <th>Forma de Pagamento</th>
            <th>Tipo</th>
            <th>Valor</th>
            <th class="text-right">Ações</th>
          </tr>
        </thead>
        <tbody>
  `;

  items.forEach(t => {
    const isIncome = t.type === "income";
    const formatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
    
    html += `
      <tr>
        <td>${formatDate(t.date)}</td>
        <td><strong>${t.description}</strong></td>
        <td>${t.category}</td>
        <td><span style="font-size: 13px; font-weight: 500; color: var(--color-gray-600);">${t.paymentMethod || 'N/A'}</span></td>
        <td>
          <span class="status-badge ${isIncome ? 'status-badge-success' : 'status-badge-danger'}">
            ${isIncome ? 'Receita' : 'Despesa'}
          </span>
        </td>
        <td style="font-weight: 700; color: ${isIncome ? 'var(--color-success)' : 'var(--color-danger)'};">
          ${isIncome ? '+' : '-'} ${formatter.format(t.amount)}
        </td>
        <td class="text-right">
          <button class="btn btn-ghost btn-icon btn-edit-transaction" data-id="${t.id}" title="Editar Transação" style="width: 32px; height: 32px; display: inline-flex; align-items: center; justify-content: center;">
            <i data-lucide="edit-3" style="width: 16px; height: 16px;"></i>
          </button>
        </td>
      </tr>
    `;
  });

  html += `</tbody></table></div>`;
  container.innerHTML = html;
  lucide.createIcons();

  // Binds de edição
  container.querySelectorAll(".btn-edit-transaction").forEach(btn => {
    btn.onclick = () => openEditTransactionModal(btn.getAttribute("data-id"));
  });
}

// ==========================================================================
// FORM DIALOGS (FINANCEIRO)
// ==========================================================================

function openTransactionModal() {
  showModal("Lançar Transação Financeira", `
    <form id="form-modal-transaction">
      <div class="form-group">
        <label for="t-type">Tipo de Lançamento</label>
        <div class="input-wrapper">
          <i data-lucide="arrow-left-right" class="input-icon"></i>
          <select id="t-type" required>
            <option value="income">Receita (Entrada)</option>
            <option value="expense">Despesa (Saída)</option>
          </select>
        </div>
      </div>
      <div class="form-group">
        <label for="t-desc">Descrição</label>
        <div class="input-wrapper">
          <i data-lucide="file-text" class="input-icon"></i>
          <input type="text" id="t-desc" required placeholder="Ex: Venda de medicamento, Pagamento de luz">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label for="t-amount">Valor (R$)</label>
          <div class="input-wrapper">
            <i data-lucide="dollar-sign" class="input-icon"></i>
            <input type="number" id="t-amount" required step="0.01" min="0.01" placeholder="0,00">
          </div>
        </div>
        <div class="form-group">
          <label for="t-date">Data da Transação</label>
          <div class="input-wrapper">
            <i data-lucide="calendar" class="input-icon"></i>
            <input type="date" id="t-date" required value="${new Date().toISOString().split('T')[0]}">
          </div>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label for="t-category">Categoria</label>
          <div class="input-wrapper">
            <i data-lucide="tag" class="input-icon"></i>
            <select id="t-category" required>
              <option value="Consultas">Consultas</option>
              <option value="Medicamentos">Medicamentos</option>
              <option value="Estoque">Estoque</option>
              <option value="Equipamentos">Equipamentos</option>
              <option value="Serviços Gerais">Serviços Gerais (Luz, Internet, etc)</option>
              <option value="Salários">Salários & Pessoal</option>
              <option value="Outros">Outros</option>
            </select>
          </div>
        </div>
        <div class="form-group">
          <label for="t-payment-method">Forma de Pagamento</label>
          <div class="input-wrapper">
            <i data-lucide="credit-card" class="input-icon"></i>
            <select id="t-payment-method" required>
              <option value="Dinheiro" selected>Dinheiro</option>
              <option value="PIX">PIX</option>
              <option value="Cartão de Crédito">Cartão de Crédito</option>
              <option value="Cartão de Débito">Cartão de Débito</option>
              <option value="Boleto">Boleto Bancário</option>
            </select>
          </div>
        </div>
      </div>
      <button type="submit" class="btn btn-primary btn-block">Confirmar Lançamento</button>
    </form>
  `);

  lucide.createIcons();

  document.getElementById("form-modal-transaction").onsubmit = async (e) => {
    e.preventDefault();
    const data = {
      type: document.getElementById("t-type").value,
      description: document.getElementById("t-desc").value,
      amount: parseFloat(document.getElementById("t-amount").value),
      date: document.getElementById("t-date").value,
      category: document.getElementById("t-category").value,
      paymentMethod: document.getElementById("t-payment-method").value
    };

    try {
      await addTenantDoc("finance", data);
      showToast("Transação registrada com sucesso!", "success");
      hideModal();
      await refreshData();
      renderTotals();
      renderFinanceTable();
    } catch (err) {
      showToast("Erro ao registrar lançamento financeiro.", "error");
    }
  };
}

// ==========================================================================
// EXPORTS & BACKUP FUNCTIONS
// ==========================================================================

function handleCSVExport() {
  const items = filteredTransactions || transactionsList;
  if (items.length === 0) {
    showToast("Sem dados para exportar.", "info");
    return;
  }

  // Cabeçalhos
  let csvContent = "data:text/csv;charset=utf-8,";
  csvContent += "Data,Descricao,Categoria,FormaPagamento,Tipo,Valor\n";

  items.forEach(t => {
    const row = [
      t.date,
      `"${t.description.replace(/"/g, '""')}"`,
      t.category,
      t.paymentMethod || "N/A",
      t.type === "income" ? "Receita" : "Despesa",
      t.amount
    ].join(",");
    csvContent += row + "\n";
  });

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `financeiro_clinica_${Date.now()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showToast("Relatório financeiro CSV baixado!", "success");
}

async function handleBackupJSON() {
  try {
    showToast("Compilando dados de backup da clínica...", "info");
    
    // Obter todas as tabelas em paralelo
    const [clients, pets, records, inventory, suppliers, appointments] = await Promise.all([
      getTenantDocs("clients").catch(() => []),
      getTenantDocs("pets").catch(() => []),
      getTenantDocs("records").catch(() => []),
      getTenantDocs("inventory").catch(() => []),
      getTenantDocs("suppliers").catch(() => []),
      getTenantDocs("appointments").catch(() => [])
    ]);

    const backupPayload = {
      backupDate: new Date().toISOString(),
      system: "MedSaaS SaaS Management",
      data: {
        clients,
        pets,
        records,
        inventory,
        suppliers,
        appointments,
        finance: transactionsList
      }
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupPayload, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `backup_med_saas_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    document.body.removeChild(downloadAnchor);

    showToast("Backup JSON compilado e baixado com sucesso!", "success");

  } catch (error) {
    console.error(error);
    showToast("Erro crítico ao tentar compilar os dados para backup.", "error");
  }
}

// ==========================================================================
// HELPERS
// ==========================================================================

function formatDate(dateStr) {
  if (!dateStr) return "N/A";
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("pt-BR");
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

function openEditTransactionModal(transactionId) {
  const t = transactionsList.find(item => item.id === transactionId);
  if (!t) return;

  showModal("Editar Transação Financeira", `
    <form id="form-modal-edit-transaction">
      <div class="form-group">
        <label for="et-type">Tipo de Lançamento</label>
        <div class="input-wrapper">
          <i data-lucide="arrow-left-right" class="input-icon"></i>
          <select id="et-type" required>
            <option value="income" ${t.type === 'income' ? 'selected' : ''}>Receita (Entrada)</option>
            <option value="expense" ${t.type === 'expense' ? 'selected' : ''}>Despesa (Saída)</option>
          </select>
        </div>
      </div>
      <div class="form-group">
        <label for="et-desc">Descrição</label>
        <div class="input-wrapper">
          <i data-lucide="file-text" class="input-icon"></i>
          <input type="text" id="et-desc" required value="${escapeHTML(t.description)}" placeholder="Ex: Venda de medicamento">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label for="et-amount">Valor (R$)</label>
          <div class="input-wrapper">
            <i data-lucide="dollar-sign" class="input-icon"></i>
            <input type="number" id="et-amount" required step="0.01" min="0.01" value="${t.amount}" placeholder="0,00">
          </div>
        </div>
        <div class="form-group">
          <label for="et-date">Data da Transação</label>
          <div class="input-wrapper">
            <i data-lucide="calendar" class="input-icon"></i>
            <input type="date" id="et-date" required value="${t.date}">
          </div>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label for="et-category">Categoria</label>
          <div class="input-wrapper">
            <i data-lucide="tag" class="input-icon"></i>
            <select id="et-category" required>
              <option value="Consultas" ${t.category === 'Consultas' ? 'selected' : ''}>Consultas</option>
              <option value="Medicamentos" ${t.category === 'Medicamentos' ? 'selected' : ''}>Medicamentos</option>
              <option value="Estoque" ${t.category === 'Estoque' ? 'selected' : ''}>Estoque</option>
              <option value="Equipamentos" ${t.category === 'Equipamentos' ? 'selected' : ''}>Equipamentos</option>
              <option value="Serviços Gerais" ${t.category === 'Serviços Gerais' ? 'selected' : ''}>Serviços Gerais (Luz, Internet, etc)</option>
              <option value="Salários" ${t.category === 'Salários' ? 'selected' : ''}>Salários & Pessoal</option>
              <option value="Outros" ${t.category === 'Outros' ? 'selected' : ''}>Outros</option>
            </select>
          </div>
        </div>
        <div class="form-group">
          <label for="et-payment-method">Forma de Pagamento</label>
          <div class="input-wrapper">
            <i data-lucide="credit-card" class="input-icon"></i>
            <select id="et-payment-method" required>
              <option value="Dinheiro" ${t.paymentMethod === 'Dinheiro' ? 'selected' : ''}>Dinheiro</option>
              <option value="PIX" ${t.paymentMethod === 'PIX' ? 'selected' : ''}>PIX</option>
              <option value="Cartão de Crédito" ${t.paymentMethod === 'Cartão de Crédito' ? 'selected' : ''}>Cartão de Crédito</option>
              <option value="Cartão de Débito" ${t.paymentMethod === 'Cartão de Débito' ? 'selected' : ''}>Cartão de Débito</option>
              <option value="Boleto" ${t.paymentMethod === 'Boleto' ? 'selected' : ''}>Boleto Bancário</option>
            </select>
          </div>
        </div>
      </div>
      
      <div style="display: flex; gap: 12px; margin-top: 10px;">
        <button type="button" id="btn-delete-transaction" class="btn btn-danger" style="flex: 1;">Excluir Registro</button>
        <button type="submit" class="btn btn-primary" style="flex: 2;">Salvar Alterações</button>
      </div>
    </form>
  `);

  lucide.createIcons();

  document.getElementById("form-modal-edit-transaction").onsubmit = async (e) => {
    e.preventDefault();
    const data = {
      type: document.getElementById("et-type").value,
      description: document.getElementById("et-desc").value,
      amount: parseFloat(document.getElementById("et-amount").value),
      date: document.getElementById("et-date").value,
      category: document.getElementById("et-category").value,
      paymentMethod: document.getElementById("et-payment-method").value
    };

    try {
      await updateTenantDoc("finance", transactionId, data);
      showToast("Lançamento financeiro atualizado!", "success");
      hideModal();
      await refreshData();
      renderTotals();
      renderFinanceTable();
    } catch (err) {
      showToast("Erro ao atualizar lançamento.", "error");
    }
  };

  document.getElementById("btn-delete-transaction").onclick = async () => {
    if (confirm("Tem certeza que deseja excluir esta transação? Isso afetará os saldos consolidados imediatamente.")) {
      try {
        await deleteTenantDoc("finance", transactionId);
        showToast("Transação excluída com sucesso!", "success");
        hideModal();
        await refreshData();
        renderTotals();
        renderFinanceTable();
      } catch (err) {
        showToast("Erro ao excluir transação.", "error");
      }
    }
  };
}
