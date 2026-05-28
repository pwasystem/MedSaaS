// ==========================================================================
// INVENTORY & SUPPLIERS MANAGEMENT MODULE
// ==========================================================================

import { addTenantDoc, getTenantDocs, updateTenantDoc, deleteTenantDoc } from "./db.js";
import { showToast, showModal, hideModal } from "./utils.js";

let inventoryItems = [];
let suppliersList = [];

/**
 * Renderiza o layout base da aba de estoque.
 */
export function renderInventory(container) {
  container.innerHTML = `
    <div class="card fade-in">
      <div class="card-header" style="flex-wrap: wrap; gap: 16px;">
        <div style="display: flex; gap: 12px; border-bottom: 2px solid var(--color-gray-100); margin-bottom: -16px;">
          <button id="tab-inv-items" class="auth-tab active" style="padding: 12px 20px; font-size: 15px;">Itens em Estoque</button>
          <button id="tab-inv-suppliers" class="auth-tab" style="padding: 12px 20px; font-size: 15px;">Fornecedores</button>
        </div>
        <div style="display: flex; gap: 12px; margin-left: auto;">
          <button id="btn-add-supplier" class="btn btn-secondary"><i data-lucide="truck"></i> Novo Fornecedor</button>
          <button id="btn-add-inv-item" class="btn btn-primary"><i data-lucide="plus"></i> Novo Item</button>
        </div>
      </div>

      <!-- Barra de Filtros -->
      <div style="margin: 24px 0 16px; display: flex; gap: 12px; align-items: center; flex-wrap: wrap;">
        <div class="input-wrapper" style="max-width: 320px; flex: 1;">
          <i data-lucide="search" class="input-icon"></i>
          <input type="text" id="inv-search" placeholder="Buscar medicamento ou insumo...">
        </div>
        
        <label style="display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 500; cursor: pointer; color: var(--color-gray-600);">
          <input type="checkbox" id="chk-critical-only" style="width: 16px; height: 16px; accent-color: var(--color-danger);">
          Apenas Estoque Crítico
        </label>
      </div>

      <!-- Áreas de Tabelas -->
      <div id="inv-items-container" class="fade-in"></div>
      <div id="inv-suppliers-container" class="fade-in hidden"></div>
    </div>
  `;
}

/**
 * Inicializa dados e eventos para estoque.
 */
export async function initInventory() {
  bindTabs();
  await refreshData();

  // Binds de cadastro
  document.getElementById("btn-add-supplier").onclick = openSupplierModal;
  document.getElementById("btn-add-inv-item").onclick = openInventoryItemModal;

  // Ouvintes de filtros
  document.getElementById("inv-search").oninput = handleFilter;
  document.getElementById("chk-critical-only").onchange = handleFilter;

  // Render inicial
  renderInventoryTable();
  renderSuppliersTable();
}

function bindTabs() {
  const tabItems = document.getElementById("tab-inv-items");
  const tabSuppliers = document.getElementById("tab-inv-suppliers");
  const conItems = document.getElementById("inv-items-container");
  const conSuppliers = document.getElementById("inv-suppliers-container");

  tabItems.onclick = () => {
    tabItems.classList.add("active");
    tabSuppliers.classList.remove("active");
    conItems.classList.remove("hidden");
    conSuppliers.classList.add("hidden");
  };

  tabSuppliers.onclick = () => {
    tabSuppliers.classList.add("active");
    tabItems.classList.remove("active");
    conSuppliers.classList.remove("hidden");
    conItems.classList.add("hidden");
  };
}

async function refreshData() {
  try {
    inventoryItems = await getTenantDocs("inventory");
    suppliersList = await getTenantDocs("suppliers");
  } catch (e) {
    showToast("Erro ao carregar dados do inventário.", "error");
  }
}

function handleFilter() {
  const query = document.getElementById("inv-search").value.toLowerCase();
  const criticalOnly = document.getElementById("chk-critical-only").checked;

  const filteredItems = inventoryItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(query);
    const isCritical = parseFloat(item.quantity || 0) <= parseFloat(item.minQuantity || 0);

    if (criticalOnly) {
      return matchesSearch && isCritical;
    }
    return matchesSearch;
  });

  renderInventoryTable(filteredItems);
}

// ==========================================================================
// RENDERS
// ==========================================================================

function renderInventoryTable(items = inventoryItems) {
  const container = document.getElementById("inv-items-container");
  if (items.length === 0) {
    container.innerHTML = `<div style="text-align: center; padding: 40px; color: var(--color-gray-400);"><p>Nenhum item em estoque.</p></div>`;
    return;
  }

  let html = `
    <div class="table-responsive">
      <table class="data-table">
        <thead>
          <tr>
            <th>Nome do Insumo</th>
            <th>Qtd. Atual</th>
            <th>Mín. Crítico</th>
            <th>Unidade</th>
            <th>Fornecedor</th>
            <th>Status</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
  `;

  items.forEach(item => {
    const isCritical = parseFloat(item.quantity || 0) <= parseFloat(item.minQuantity || 0);
    const supplier = suppliersList.find(s => s.id === item.supplierId);

    html += `
      <tr class="${isCritical ? 'stock-warning-row' : ''}">
        <td><strong>${item.name}</strong></td>
        <td><strong>${item.quantity}</strong></td>
        <td>${item.minQuantity}</td>
        <td>${item.unit || 'unid'}</td>
        <td>${supplier ? supplier.name : 'N/A'}</td>
        <td>
          <span class="status-badge ${isCritical ? 'status-badge-danger' : 'status-badge-success'}">
            ${isCritical ? 'Reposição Urgente' : 'Ok'}
          </span>
        </td>
        <td>
          <div style="display: flex; gap: 6px;">
            <button class="btn btn-ghost btn-icon btn-edit-qty" data-id="${item.id}" data-qty="${item.quantity}" title="Ajustar Estoque" style="width: 32px; height: 32px;">
              <i data-lucide="plus-circle" style="width: 16px; height: 16px;"></i>
            </button>
            <button class="btn btn-ghost btn-icon btn-edit-item" data-id="${item.id}" title="Editar Item" style="width: 32px; height: 32px;">
              <i data-lucide="edit-3" style="width: 16px; height: 16px;"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  });

  html += `</tbody></table></div>`;
  container.innerHTML = html;
  lucide.createIcons();

  // Ações de ajuste rápido de quantidade
  container.querySelectorAll(".btn-edit-qty").forEach(btn => {
    btn.onclick = () => openAdjustQtyModal(btn.getAttribute("data-id"), btn.getAttribute("data-qty"));
  });

  // Evento de edição completa do item
  container.querySelectorAll(".btn-edit-item").forEach(btn => {
    btn.onclick = () => openEditInventoryItemModal(btn.getAttribute("data-id"));
  });
}

function renderSuppliersTable() {
  const container = document.getElementById("inv-suppliers-container");
  if (suppliersList.length === 0) {
    container.innerHTML = `<div style="text-align: center; padding: 40px; color: var(--color-gray-400);"><p>Nenhum fornecedor cadastrado.</p></div>`;
    return;
  }

  let html = `
    <div class="table-responsive">
      <table class="data-table">
        <thead>
          <tr>
            <th>Nome Fornecedor</th>
            <th>Contato</th>
            <th>Telefone</th>
            <th>E-mail</th>
            <th class="text-right">Ações</th>
          </tr>
        </thead>
        <tbody>
  `;

  suppliersList.forEach(sup => {
    html += `
      <tr>
        <td><strong>${sup.name}</strong></td>
        <td>${sup.contact || 'N/A'}</td>
        <td>${sup.phone || 'N/A'}</td>
        <td>${sup.email || 'N/A'}</td>
        <td class="text-right">
          <button class="btn btn-ghost btn-icon btn-edit-supplier" data-id="${sup.id}" title="Editar Fornecedor" style="width: 32px; height: 32px; display: inline-flex;">
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
  container.querySelectorAll(".btn-edit-supplier").forEach(btn => {
    btn.onclick = () => openEditSupplierModal(btn.getAttribute("data-id"));
  });
}

// ==========================================================================
// FORM DIALOGS (ESTOQUE)
// ==========================================================================

function openSupplierModal() {
  showModal("Novo Fornecedor", `
    <form id="form-modal-supplier">
      <div class="form-group">
        <label for="s-name">Razão Social / Nome</label>
        <div class="input-wrapper">
          <i data-lucide="building" class="input-icon"></i>
          <input type="text" id="s-name" required placeholder="Nome do fornecedor">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label for="s-contact">Nome do Contato</label>
          <div class="input-wrapper">
            <i data-lucide="user" class="input-icon"></i>
            <input type="text" id="s-contact" placeholder="Representante">
          </div>
        </div>
        <div class="form-group">
          <label for="s-phone">Telefone</label>
          <div class="input-wrapper">
            <i data-lucide="phone" class="input-icon"></i>
            <input type="tel" id="s-phone" required placeholder="Telefone comercial">
          </div>
        </div>
      </div>
      <div class="form-group">
        <label for="s-email">E-mail</label>
        <div class="input-wrapper">
          <i data-lucide="mail" class="input-icon"></i>
          <input type="email" id="s-email" placeholder="fornecedor@email.com">
        </div>
      </div>
      <button type="submit" class="btn btn-primary btn-block">Registrar Fornecedor</button>
    </form>
  `);

  document.getElementById("form-modal-supplier").onsubmit = async (e) => {
    e.preventDefault();
    const data = {
      name: document.getElementById("s-name").value,
      contact: document.getElementById("s-contact").value,
      phone: document.getElementById("s-phone").value,
      email: document.getElementById("s-email").value
    };

    try {
      await addTenantDoc("suppliers", data);
      showToast("Fornecedor cadastrado com sucesso!", "success");
      hideModal();
      await refreshData();
      renderSuppliersTable();
    } catch (err) {
      showToast("Erro ao cadastrar fornecedor.", "error");
    }
  };
}

function openInventoryItemModal() {
  let supplierOptions = `<option value="" selected disabled>Selecione um fornecedor...</option>`;
  suppliersList.forEach(s => {
    supplierOptions += `<option value="${s.id}">${s.name}</option>`;
  });

  showModal("Cadastrar Item no Estoque", `
    <form id="form-modal-item">
      <div class="form-group">
        <label for="i-name">Nome do Insumo / Medicamento</label>
        <div class="input-wrapper">
          <i data-lucide="package" class="input-icon"></i>
          <input type="text" id="i-name" required placeholder="Ex: Vacina V10, Dipirona Gotas">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label for="i-qty">Quantidade Inicial</label>
          <div class="input-wrapper">
            <i data-lucide="hash" class="input-icon"></i>
            <input type="number" id="i-qty" required min="0" value="0">
          </div>
        </div>
        <div class="form-group">
          <label for="i-min">Alerta Estoque Crítico (Mínimo)</label>
          <div class="input-wrapper">
            <i data-lucide="alert-triangle" class="input-icon"></i>
            <input type="number" id="i-min" required min="0" value="5">
          </div>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label for="i-unit">Unidade de Medida</label>
          <div class="input-wrapper">
            <i data-lucide="ruler" class="input-icon"></i>
            <select id="i-unit" required>
              <option value="Frasco">Frasco</option>
              <option value="Ampola">Ampola</option>
              <option value="Comprimido">Comprimido</option>
              <option value="ml">Mililitros (ml)</option>
              <option value="Caixa">Caixa</option>
              <option value="Unidades">Unidades</option>
            </select>
          </div>
        </div>
        <div class="form-group">
          <label for="i-supplier">Fornecedor Preferencial</label>
          <div class="input-wrapper">
            <i data-lucide="truck" class="input-icon"></i>
            <select id="i-supplier" required>
              ${supplierOptions}
            </select>
          </div>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label for="i-purchase-price">Preço de Compra (R$)</label>
          <div class="input-wrapper">
            <i data-lucide="dollar-sign" class="input-icon"></i>
            <input type="number" id="i-purchase-price" required step="0.01" min="0" value="0.00" placeholder="0,00">
          </div>
        </div>
        <div class="form-group">
          <label for="i-sale-price">Preço de Venda (R$)</label>
          <div class="input-wrapper">
            <i data-lucide="dollar-sign" class="input-icon"></i>
            <input type="number" id="i-sale-price" required step="0.01" min="0" value="0.00" placeholder="0,00">
          </div>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label for="i-payment-date">Data de Pagamento (Fornecedor)</label>
          <div class="input-wrapper">
            <i data-lucide="calendar" class="input-icon"></i>
            <input type="date" id="i-payment-date" value="${new Date().toISOString().split('T')[0]}" style="padding-left: 42px;">
          </div>
        </div>
        <div class="form-group">
          <label for="i-payment-method">Forma de Pagamento</label>
          <div class="input-wrapper">
            <i data-lucide="credit-card" class="input-icon"></i>
            <select id="i-payment-method" style="padding-left: 42px;">
              <option value="Dinheiro" selected>Dinheiro</option>
              <option value="PIX">PIX</option>
              <option value="Cartão de Crédito">Cartão de Crédito</option>
              <option value="Cartão de Débito">Cartão de Débito</option>
              <option value="Boleto">Boleto Bancário</option>
            </select>
          </div>
        </div>
      </div>
      <button type="submit" class="btn btn-primary btn-block">Salvar Item</button>
    </form>
  `);

  document.getElementById("form-modal-item").onsubmit = async (e) => {
    e.preventDefault();
    const qty = parseFloat(document.getElementById("i-qty").value || 0);
    const purchasePrice = parseFloat(document.getElementById("i-purchase-price").value || 0);

    const data = {
      name: document.getElementById("i-name").value,
      quantity: qty,
      minQuantity: parseFloat(document.getElementById("i-min").value),
      unit: document.getElementById("i-unit").value,
      supplierId: document.getElementById("i-supplier").value,
      purchasePrice: purchasePrice,
      salePrice: parseFloat(document.getElementById("i-sale-price").value || 0)
    };

    try {
      await addTenantDoc("inventory", data);
      
      // Se estoque inicial > 0 e preço de compra > 0, lança despesa no fluxo de caixa
      if (qty > 0 && purchasePrice > 0) {
        const paymentDate = document.getElementById("i-payment-date").value || new Date().toISOString().split('T')[0];
        const paymentMethod = document.getElementById("i-payment-method").value;
        const totalCost = qty * purchasePrice;
        
        await addTenantDoc("finance", {
          type: "expense",
          description: `Compra estoque inicial: ${qty} ${data.unit || 'unid'} de ${data.name}`,
          amount: totalCost,
          date: paymentDate,
          paymentMethod: paymentMethod,
          category: "Estoque"
        });
      }

      showToast("Item de estoque cadastrado e integrado ao caixa!", "success");
      hideModal();
      await refreshData();
      renderInventoryTable();
    } catch (err) {
      showToast("Erro ao adicionar item.", "error");
    }
  };
}

function openAdjustQtyModal(itemId, currentQty) {
  const item = inventoryItems.find(i => i.id === itemId);
  if (!item) {
    showToast("Erro ao buscar item do estoque.", "error");
    return;
  }

  const purchasePrice = parseFloat(item.purchasePrice || 0);
  const initialQty = 10;
  const initialTotal = (initialQty * purchasePrice).toFixed(2);

  showModal("Adicionar Lote / Ajustar Quantidade", `
    <form id="form-adjust-qty">
      <div class="form-group">
        <label>Item: <strong>${item.name}</strong></label>
      </div>
      <div class="form-group">
        <label>Quantidade Atual: <strong>${currentQty} ${item.unit || 'unid'}</strong></label>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label for="adj-qty">Quantidade a Adicionar (+)</label>
          <div class="input-wrapper">
            <i data-lucide="plus" class="input-icon"></i>
            <input type="number" id="adj-qty" required min="1" placeholder="Ex: 10, 50" value="${initialQty}">
          </div>
        </div>
        <div class="form-group">
          <label for="adj-total-price">Valor Total Pago (R$)</label>
          <div class="input-wrapper">
            <i data-lucide="dollar-sign" class="input-icon"></i>
            <input type="number" id="adj-total-price" required step="0.01" min="0" value="${initialTotal}" placeholder="0,00">
          </div>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label for="adj-payment-date">Data de Pagamento</label>
          <div class="input-wrapper">
            <i data-lucide="calendar" class="input-icon"></i>
            <input type="date" id="adj-payment-date" value="${new Date().toISOString().split('T')[0]}" style="padding-left: 42px;">
          </div>
        </div>
        <div class="form-group">
          <label for="adj-payment-method">Forma de Pagamento</label>
          <div class="input-wrapper">
            <i data-lucide="credit-card" class="input-icon"></i>
            <select id="adj-payment-method" style="padding-left: 42px;">
              <option value="Dinheiro" selected>Dinheiro</option>
              <option value="PIX">PIX</option>
              <option value="Cartão de Crédito">Cartão de Crédito</option>
              <option value="Cartão de Débito">Cartão de Débito</option>
              <option value="Boleto">Boleto Bancário</option>
            </select>
          </div>
        </div>
      </div>
      <button type="submit" class="btn btn-primary btn-block">Aplicar Ajuste & Registrar Caixa</button>
    </form>
  `);

  lucide.createIcons();

  const inputQty = document.getElementById("adj-qty");
  const inputTotal = document.getElementById("adj-total-price");

  inputQty.addEventListener("input", () => {
    const qty = parseFloat(inputQty.value || 0);
    inputTotal.value = (qty * purchasePrice).toFixed(2);
  });

  document.getElementById("form-adjust-qty").onsubmit = async (e) => {
    e.preventDefault();
    const addVal = parseFloat(inputQty.value || 0);
    const totalPrice = parseFloat(inputTotal.value || 0);
    const newQty = parseFloat(currentQty) + addVal;
    
    const paymentDate = document.getElementById("adj-payment-date").value || new Date().toISOString().split('T')[0];
    const paymentMethod = document.getElementById("adj-payment-method").value;

    try {
      // 1. Atualizar quantidade no estoque
      await updateTenantDoc("inventory", itemId, {
        quantity: newQty
      });

      // 2. Registrar despesa no fluxo de caixa se o preço for maior que zero
      if (totalPrice > 0) {
        await addTenantDoc("finance", {
          type: "expense",
          description: `Reposição: +${addVal} ${item.unit || 'unid'} de ${item.name}`,
          amount: totalPrice,
          date: paymentDate,
          paymentMethod: paymentMethod,
          category: "Estoque"
        });
      }

      showToast("Quantidade ajustada e fluxo de caixa atualizado!", "success");
      hideModal();
      await refreshData();
      renderInventoryTable();
    } catch (err) {
      showToast("Erro ao ajustar quantidade ou lançar financeiro.", "error");
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

function openEditSupplierModal(supplierId) {
  const sup = suppliersList.find(s => s.id === supplierId);
  if (!sup) return;

  showModal("Editar Fornecedor", `
    <form id="form-modal-edit-supplier">
      <div class="form-group">
        <label for="es-name">Razão Social / Nome</label>
        <div class="input-wrapper">
          <i data-lucide="building" class="input-icon"></i>
          <input type="text" id="es-name" required value="${escapeHTML(sup.name)}" placeholder="Nome do fornecedor">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label for="es-contact">Nome do Contato</label>
          <div class="input-wrapper">
            <i data-lucide="user" class="input-icon"></i>
            <input type="text" id="es-contact" value="${escapeHTML(sup.contact || '')}" placeholder="Representante">
          </div>
        </div>
        <div class="form-group">
          <label for="es-phone">Telefone</label>
          <div class="input-wrapper">
            <i data-lucide="phone" class="input-icon"></i>
            <input type="tel" id="es-phone" required value="${escapeHTML(sup.phone)}" placeholder="Telefone comercial">
          </div>
        </div>
      </div>
      <div class="form-group">
        <label for="es-email">E-mail</label>
        <div class="input-wrapper">
          <i data-lucide="mail" class="input-icon"></i>
          <input type="email" id="es-email" value="${escapeHTML(sup.email || '')}" placeholder="fornecedor@email.com">
        </div>
      </div>
      
      <div style="display: flex; gap: 12px; margin-top: 10px;">
        <button type="button" id="btn-delete-supplier" class="btn btn-danger" style="flex: 1;">Excluir Fornecedor</button>
        <button type="submit" class="btn btn-primary" style="flex: 2;">Salvar Alterações</button>
      </div>
    </form>
  `);

  lucide.createIcons();

  document.getElementById("form-modal-edit-supplier").onsubmit = async (e) => {
    e.preventDefault();
    const data = {
      name: document.getElementById("es-name").value,
      contact: document.getElementById("es-contact").value,
      phone: document.getElementById("es-phone").value,
      email: document.getElementById("es-email").value
    };

    try {
      await updateTenantDoc("suppliers", supplierId, data);
      showToast("Cadastro de fornecedor atualizado!", "success");
      hideModal();
      await refreshData();
      renderSuppliersTable();
    } catch (err) {
      showToast("Erro ao atualizar fornecedor.", "error");
    }
  };

  document.getElementById("btn-delete-supplier").onclick = async () => {
    if (confirm(`Tem certeza que deseja excluir o fornecedor ${sup.name}?`)) {
      try {
        await deleteTenantDoc("suppliers", supplierId);
        showToast("Fornecedor excluído!", "success");
        hideModal();
        await refreshData();
        renderSuppliersTable();
      } catch (err) {
        showToast("Erro ao excluir fornecedor.", "error");
      }
    }
  };
}

function openEditInventoryItemModal(itemId) {
  const item = inventoryItems.find(i => i.id === itemId);
  if (!item) return;

  let supplierOptions = `<option value="" disabled>Selecione um fornecedor...</option>`;
  suppliersList.forEach(s => {
    supplierOptions += `<option value="${s.id}" ${s.id === item.supplierId ? 'selected' : ''}>${s.name}</option>`;
  });

  showModal("Editar Item do Estoque", `
    <form id="form-modal-edit-item">
      <div class="form-group">
        <label for="ei-name">Nome do Insumo / Medicamento</label>
        <div class="input-wrapper">
          <i data-lucide="package" class="input-icon"></i>
          <input type="text" id="ei-name" required value="${escapeHTML(item.name)}" placeholder="Ex: Vacina V10">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label for="ei-qty">Quantidade Atual</label>
          <div class="input-wrapper">
            <i data-lucide="hash" class="input-icon"></i>
            <input type="number" id="ei-qty" required value="${item.quantity}" min="0">
          </div>
        </div>
        <div class="form-group">
          <label for="ei-min">Alerta Estoque Crítico (Mínimo)</label>
          <div class="input-wrapper">
            <i data-lucide="alert-triangle" class="input-icon"></i>
            <input type="number" id="ei-min" required value="${item.minQuantity}" min="0">
          </div>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label for="ei-unit">Unidade de Medida</label>
          <div class="input-wrapper">
            <i data-lucide="ruler" class="input-icon"></i>
            <select id="ei-unit" required>
              <option value="Frasco" ${item.unit === 'Frasco' ? 'selected' : ''}>Frasco</option>
              <option value="Ampola" ${item.unit === 'Ampola' ? 'selected' : ''}>Ampola</option>
              <option value="Comprimido" ${item.unit === 'Comprimido' ? 'selected' : ''}>Comprimido</option>
              <option value="ml" ${item.unit === 'ml' ? 'selected' : ''}>Mililitros (ml)</option>
              <option value="Caixa" ${item.unit === 'Caixa' ? 'selected' : ''}>Caixa</option>
            </select>
          </div>
        </div>
        <div class="form-group">
          <label for="ei-supplier">Fornecedor Preferencial</label>
          <div class="input-wrapper">
            <i data-lucide="truck" class="input-icon"></i>
            <select id="ei-supplier" required>
              ${supplierOptions}
            </select>
          </div>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label for="ei-purchase-price">Preço de Compra (R$)</label>
          <div class="input-wrapper">
            <i data-lucide="dollar-sign" class="input-icon"></i>
            <input type="number" id="ei-purchase-price" required step="0.01" min="0" value="${item.purchasePrice || 0}" placeholder="0,00">
          </div>
        </div>
        <div class="form-group">
          <label for="ei-sale-price">Preço de Venda (R$)</label>
          <div class="input-wrapper">
            <i data-lucide="dollar-sign" class="input-icon"></i>
            <input type="number" id="ei-sale-price" required step="0.01" min="0" value="${item.salePrice || 0}" placeholder="0,00">
          </div>
        </div>
      </div>
      
      <div style="display: flex; gap: 12px; margin-top: 10px;">
        <button type="button" id="btn-delete-item" class="btn btn-danger" style="flex: 1;">Excluir Item</button>
        <button type="submit" class="btn btn-primary" style="flex: 2;">Salvar Alterações</button>
      </div>
    </form>
  `);

  lucide.createIcons();

  document.getElementById("form-modal-edit-item").onsubmit = async (e) => {
    e.preventDefault();
    const data = {
      name: document.getElementById("ei-name").value,
      quantity: parseFloat(document.getElementById("ei-qty").value),
      minQuantity: parseFloat(document.getElementById("ei-min").value),
      unit: document.getElementById("ei-unit").value,
      supplierId: document.getElementById("ei-supplier").value,
      purchasePrice: parseFloat(document.getElementById("ei-purchase-price").value || 0),
      salePrice: parseFloat(document.getElementById("ei-sale-price").value || 0)
    };

    try {
      await updateTenantDoc("inventory", itemId, data);
      showToast("Cadastro de insumo atualizado!", "success");
      hideModal();
      await refreshData();
      renderInventoryTable();
    } catch (err) {
      showToast("Erro ao atualizar item.", "error");
    }
  };

  document.getElementById("btn-delete-item").onclick = async () => {
    if (confirm(`Tem certeza que deseja excluir o item ${item.name} do estoque?`)) {
      try {
        await deleteTenantDoc("inventory", itemId);
        showToast("Item excluído com sucesso!", "success");
        hideModal();
        await refreshData();
        renderInventoryTable();
      } catch (err) {
        showToast("Erro ao excluir item.", "error");
      }
    }
  };
}
