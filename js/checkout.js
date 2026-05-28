// ==========================================================================
// CASHIER & CHECKOUT MODULE (PDV)
// ==========================================================================

import { addTenantDoc, getTenantDocs, getTenantDoc, updateTenantDoc, getClinicConfig } from "./db.js";
import { showToast, showModal, hideModal } from "./utils.js";

let pendingRecords = [];
let petsList = [];
let clientsList = [];
let inventoryItems = [];
let clinicConsultationPrice = 150.00;

/**
 * Renderiza a casca da tela de Caixa (PDV).
 */
export function renderCheckout(container) {
  container.innerHTML = `
    <div class="card fade-in">
      <div class="card-header" style="flex-wrap: wrap; gap: 16px;">
        <div style="display: flex; gap: 12px; border-bottom: 2px solid var(--color-gray-100); margin-bottom: -16px;">
          <button id="tab-chk-pending" class="auth-tab active" style="padding: 12px 20px; font-size: 15px;">Atendimentos Pendentes</button>
          <button id="tab-chk-direct" class="auth-tab" style="padding: 12px 20px; font-size: 15px;">Venda Avulsa / Direta</button>
        </div>
      </div>

      <!-- Barra de Filtros (Apenas para pendentes) -->
      <div id="chk-filter-bar" style="margin: 24px 0 16px;">
        <div class="input-wrapper" style="max-width: 400px;">
          <i data-lucide="search" class="input-icon"></i>
          <input type="text" id="chk-search" placeholder="Buscar atendimento por pet ou tutor...">
        </div>
      </div>

      <!-- Área de Listagem -->
      <div id="chk-pending-container" class="fade-in">
        <!-- Tabela de pendentes -->
      </div>
      
      <div id="chk-direct-container" class="fade-in hidden" style="margin-top: 24px;">
        <!-- Formulário de venda avulsa -->
      </div>
    </div>
  `;
}

/**
 * Inicializa a tela de Caixa (PDV).
 */
export async function initCheckout() {
  bindTabs();
  await refreshData();

  // Ouvinte de pesquisa
  document.getElementById("chk-search").oninput = handleSearch;

  // Renders
  renderPendingTable();
  renderDirectForm();
}

function bindTabs() {
  const tabPending = document.getElementById("tab-chk-pending");
  const tabDirect = document.getElementById("tab-chk-direct");
  const conPending = document.getElementById("chk-pending-container");
  const conDirect = document.getElementById("chk-direct-container");
  const filterBar = document.getElementById("chk-filter-bar");

  tabPending.onclick = () => {
    tabPending.classList.add("active");
    tabDirect.classList.remove("active");
    conPending.classList.remove("hidden");
    filterBar.classList.remove("hidden");
    conDirect.classList.add("hidden");
    refreshData().then(() => renderPendingTable());
  };

  tabDirect.onclick = () => {
    tabDirect.classList.add("active");
    tabPending.classList.remove("active");
    conDirect.classList.remove("hidden");
    conPending.classList.add("hidden");
    filterBar.classList.add("hidden");
    renderDirectForm();
  };
}

async function refreshData() {
  try {
    const allRecords = await getTenantDocs("records");
    pendingRecords = allRecords.filter(r => r.paymentStatus === "pending");
    
    // Ordenar decrescente por data
    pendingRecords.sort((a, b) => new Date(b.date) - new Date(a.date));

    petsList = await getTenantDocs("pets");
    clientsList = await getTenantDocs("clients");
    inventoryItems = await getTenantDocs("inventory");

    const config = await getClinicConfig();
    clinicConsultationPrice = config && config.consultationPrice !== undefined ? parseFloat(config.consultationPrice) : 150.00;
  } catch (e) {
    showToast("Erro ao carregar dados do Caixa.", "error");
  }
}

function handleSearch(e) {
  const query = e.target.value.toLowerCase();
  const filtered = pendingRecords.filter(rec => {
    const pet = petsList.find(p => p.id === rec.petId);
    const owner = pet ? clientsList.find(c => c.id === pet.clientId) : null;
    
    const petName = pet ? pet.name.toLowerCase() : "";
    const ownerName = owner ? owner.name.toLowerCase() : "";
    
    return petName.includes(query) || ownerName.includes(query);
  });
  renderPendingTable(filtered);
}

// ==========================================================================
// RENDER TABELA DE PENDENTES
// ==========================================================================

function renderPendingTable(items = pendingRecords) {
  const container = document.getElementById("chk-pending-container");
  if (items.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 40px; color: var(--color-gray-400);">
        <i data-lucide="smile" style="width: 48px; height: 48px; margin-bottom: 12px;"></i>
        <p>Não há atendimentos pendentes de pagamento no momento!</p>
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
            <th>Data</th>
            <th>Animal / Pet</th>
            <th>Tutor</th>
            <th>Materiais Utilizados</th>
            <th class="text-right">Ação</th>
          </tr>
        </thead>
        <tbody>
  `;

  items.forEach(rec => {
    const pet = petsList.find(p => p.id === rec.petId);
    const owner = pet ? clientsList.find(c => c.id === pet.clientId) : null;
    const petPhoto = pet && pet.photoUrl ? pet.photoUrl : "https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&q=80&w=200";

    const medsText = rec.usedItems && rec.usedItems.length > 0
      ? rec.usedItems.map(m => `<span class="status-badge status-badge-success" style="font-size: 10px; margin: 2px;">${m.name} (${m.quantity})</span>`).join(' ')
      : '<span style="color: var(--color-gray-400); font-size: 12px;">Nenhum</span>';

    html += `
      <tr>
        <td>${formatDate(rec.date)}</td>
        <td>
          <div style="display: flex; align-items: center; gap: 10px;">
            <img src="${petPhoto}" alt="${pet ? pet.name : 'Pet'}" style="width: 36px; height: 36px; border-radius: 50%; object-fit: cover;">
            <div>
              <strong>${pet ? pet.name : 'Desconhecido'}</strong>
              <div style="font-size: 11px; color: var(--color-gray-400);">${pet ? pet.species : ''}</div>
            </div>
          </div>
        </td>
        <td>${owner ? owner.name : 'N/A'}</td>
        <td>
          <div style="max-width: 250px; display: flex; flex-wrap: wrap;">
            ${medsText}
          </div>
        </td>
        <td class="text-right">
          <button class="btn btn-primary btn-sm btn-process-checkout" data-id="${rec.id}" style="padding: 6px 12px; font-size: 12px; height: auto;">
            <i data-lucide="credit-card" style="width: 14px; height: 14px; margin-right: 4px;"></i> Cobrar
          </button>
        </td>
      </tr>
    `;
  });

  html += `</tbody></table></div>`;
  container.innerHTML = html;
  lucide.createIcons();

  // Binds de Cobrança
  container.querySelectorAll(".btn-process-checkout").forEach(btn => {
    btn.onclick = () => {
      const rec = items.find(r => r.id === btn.getAttribute("data-id"));
      if (rec) openCheckoutModal(rec);
    };
  });
}

// ==========================================================================
// MODAL DE CHECKOUT (COBRANÇA DE CONSULTA)
// ==========================================================================

function openCheckoutModal(record) {
  const pet = petsList.find(p => p.id === record.petId);
  const owner = pet ? clientsList.find(c => c.id === pet.clientId) : null;

  // Itens do estoque para seletor de adicionais
  let inventoryOptions = `<option value="" disabled selected>Adicionar outro item avulso...</option>`;
  inventoryItems.forEach(item => {
    if (item.quantity > 0) {
      inventoryOptions += `<option value="${item.id}" data-unit="${item.unit || 'unid'}" data-price="${item.salePrice || 0}">${item.name} (${item.quantity} ${item.unit || 'unid'} disp. - R$ ${(item.salePrice || 0).toFixed(2)})</option>`;
    }
  });

  // Gerar linhas dos materiais já utilizados do prontuário
  let materialsRows = "";
  let materialsTotal = 0;
  if (record.usedItems && record.usedItems.length > 0) {
    record.usedItems.forEach((item, idx) => {
      const price = parseFloat(item.salePrice || 0);
      const qty = parseFloat(item.quantity || 0);
      const subtotal = price * qty;
      materialsTotal += subtotal;

      materialsRows += `
        <tr class="checkout-material-row" data-item-id="${item.itemId}" data-name="${item.name}" data-qty="${qty}" data-unit="${item.unit || 'unid'}" data-price="${price}">
          <td>${item.name}</td>
          <td>${qty} ${item.unit || 'unid'}</td>
          <td>R$ ${price.toFixed(2)}</td>
          <td class="checkout-subtotal" style="font-weight: 700;">R$ ${subtotal.toFixed(2)}</td>
        </tr>
      `;
    });
  } else {
    materialsRows = `<tr><td colspan="4" style="text-align: center; color: var(--color-gray-400); font-size: 12px;">Nenhum medicamento consumido na consulta.</td></tr>`;
  }

  const checkoutHTML = `
    <div style="text-align: left;">
      <h4 style="font-size: 14px; color: var(--color-gray-500); margin-bottom: 16px;">
        Cobrança para: <strong>${pet ? pet.name : 'Pet'}</strong> (Tutor: ${owner ? owner.name : 'N/A'})
      </h4>
      
      <div style="display: flex; flex-direction: column; gap: 20px;">
        
        <!-- Bloco 1: Valor da Consulta -->
        <div style="background: var(--color-gray-50); padding: 14px; border-radius: var(--radius-md); border: 1px solid var(--color-gray-200);">
          <h5 style="font-size: 13px; font-weight: 700; color: var(--brand-secondary); margin-bottom: 12px; display: flex; align-items: center; gap: 6px;">
            <i data-lucide="stethoscope" style="width: 16px; height: 16px;"></i> Consulta Médica
          </h5>
          <div class="form-group" style="margin-bottom: 0; max-width: 200px;">
            <label style="font-size: 11px;">Valor da Consulta (R$)</label>
            <div class="input-wrapper">
              <i data-lucide="dollar-sign" class="input-icon"></i>
              <input type="number" id="chk-consultation-val" required step="0.01" min="0" value="${clinicConsultationPrice.toFixed(2)}" style="padding-left: 42px;">
            </div>
          </div>
        </div>

        <!-- Bloco 2: Materiais Utilizados -->
        <div style="background: var(--color-gray-50); padding: 14px; border-radius: var(--radius-md); border: 1px solid var(--color-gray-200);">
          <h5 style="font-size: 13px; font-weight: 700; color: var(--brand-secondary); margin-bottom: 12px; display: flex; align-items: center; gap: 6px;">
            <i data-lucide="package" style="width: 16px; height: 16px;"></i> Materiais Utilizados (Prontuário)
          </h5>
          <div class="table-responsive" style="margin-bottom: 0;">
            <table class="data-table" style="font-size: 12px; margin-bottom: 0;">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Qtd.</th>
                  <th>Preço Un.</th>
                  <th>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                ${materialsRows}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Bloco 3: Itens Adicionais (Farmácia / Levar para Casa) -->
        <div style="background: var(--brand-primary-light); padding: 14px; border-radius: var(--radius-md); border: 1px solid var(--brand-primary);">
          <h5 style="font-size: 13px; font-weight: 700; color: var(--brand-primary); margin-bottom: 12px; display: flex; align-items: center; gap: 6px;">
            <i data-lucide="plus" style="width: 16px; height: 16px;"></i> Adicionar Itens de Farmácia / Avulsos
          </h5>
          <div style="display: grid; grid-template-columns: 2fr 1fr auto; gap: 10px; align-items: flex-end;">
            <div class="form-group" style="margin-bottom: 0;">
              <select id="chk-add-item-select" style="width: 100%; height: 38px; border-radius: var(--radius-md); border: 1px solid var(--color-gray-200); padding: 0 10px;">
                ${inventoryOptions}
              </select>
            </div>
            <div class="form-group" style="margin-bottom: 0;">
              <input type="number" id="chk-add-item-qty" min="1" value="1" style="width: 100%; height: 38px; border-radius: var(--radius-md); border: 1px solid var(--color-gray-200); padding: 0 10px;">
            </div>
            <button type="button" id="btn-chk-add-item" class="btn btn-primary" style="height: 38px; padding: 0 16px;">Inserir</button>
          </div>

          <!-- Tabela de Itens Adicionados -->
          <div class="table-responsive" style="margin-top: 12px; background: var(--color-white); border-radius: var(--radius-sm); border: 1px solid var(--color-gray-200);">
            <table class="data-table" style="font-size: 12px; margin-bottom: 0;" id="chk-added-items-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Qtd.</th>
                  <th>Preço</th>
                  <th>Subtotal</th>
                  <th class="text-right">Ação</th>
                </tr>
              </thead>
              <tbody id="chk-added-items-tbody">
                <tr><td colspan="5" style="text-align: center; color: var(--color-gray-400);">Nenhum item avulso adicionado.</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Bloco 4: Fechamento de Caixa -->
        <div style="background: var(--color-gray-50); padding: 16px; border-radius: var(--radius-md); border: 1px solid var(--color-gray-300); display: flex; flex-direction: column; gap: 16px;">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--color-gray-200); padding-bottom: 12px;">
            <span style="font-size: 16px; font-weight: 700; color: var(--color-gray-700);">Total a Pagar:</span>
            <span id="chk-grand-total" style="font-size: 22px; font-weight: 800; color: var(--color-success);">R$ 0,00</span>
          </div>

          <div class="form-row" style="grid-template-columns: 1fr 1fr;">
            <div class="form-group" style="margin-bottom: 0;">
              <label for="chk-payment-method">Forma de Pagamento</label>
              <div class="input-wrapper">
                <i data-lucide="credit-card" class="input-icon"></i>
                <select id="chk-payment-method" required style="padding-left: 42px;">
                  <option value="Dinheiro" selected>Dinheiro</option>
                  <option value="PIX">PIX</option>
                  <option value="Cartão de Crédito">Cartão de Crédito</option>
                  <option value="Cartão de Débito">Cartão de Débito</option>
                  <option value="Boleto">Boleto Bancário</option>
                </select>
              </div>
            </div>
            <div class="form-group" style="margin-bottom: 0;">
              <label for="chk-payment-date">Data do Recebimento</label>
              <div class="input-wrapper">
                <i data-lucide="calendar" class="input-icon"></i>
                <input type="date" id="chk-payment-date" required value="${new Date().toISOString().split('T')[0]}" style="padding-left: 42px;">
              </div>
            </div>
          </div>
        </div>

        <!-- Ações do rodapé -->
        <div style="display: flex; justify-content: flex-end; gap: 12px; margin-top: 10px;">
          <button type="button" id="btn-cancel-checkout" class="btn btn-secondary">Cancelar</button>
          <button type="button" id="btn-submit-checkout" class="btn btn-success" style="display: flex; align-items: center; gap: 6px;">
            <i data-lucide="check-circle"></i> Finalizar Recebimento
          </button>
        </div>

      </div>
    </div>
  `;

  showModal("Fechar Caixa e Cobrar Consulta", checkoutHTML);
  lucide.createIcons();

  const inputConsultation = document.getElementById("chk-consultation-val");
  const selectAddItem = document.getElementById("chk-add-item-select");
  const inputAddItemQty = document.getElementById("chk-add-item-qty");
  const btnAddItem = document.getElementById("btn-chk-add-item");
  const addedTbody = document.getElementById("chk-added-items-tbody");
  const txtGrandTotal = document.getElementById("chk-grand-total");

  const addedItemsList = []; // Itens adicionais
  let grandTotal = 0;

  // Função para recalcular o total geral
  function recalculateTotal() {
    const consultationVal = parseFloat(inputConsultation.value || 0);
    let itemsTotal = 0;

    // Adicionados
    addedItemsList.forEach(item => {
      itemsTotal += item.price * item.quantity;
    });

    grandTotal = consultationVal + materialsTotal + itemsTotal;
    txtGrandTotal.textContent = `R$ ${grandTotal.toFixed(2)}`;
  }

  // Monitorar alteração de valor de consulta
  inputConsultation.oninput = () => recalculateTotal();

  // Adicionar item de estoque avulso
  btnAddItem.onclick = async () => {
    const itemId = selectAddItem.value;
    const qty = parseFloat(inputAddItemQty.value || 0);

    if (!itemId) {
      showToast("Selecione um item do estoque.", "warning");
      return;
    }
    if (qty <= 0) {
      showToast("A quantidade deve ser maior que zero.", "warning");
      return;
    }

    const itemObj = inventoryItems.find(i => i.id === itemId);
    if (!itemObj) return;

    const availableQty = parseFloat(itemObj.quantity || 0);
    // Verificar se já tem na lista adicional
    const existing = addedItemsList.find(i => i.itemId === itemId);
    const neededQty = qty + (existing ? existing.quantity : 0);

    if (neededQty > availableQty) {
      showToast(`Quantidade indisponível no estoque (restam ${availableQty} ${itemObj.unit || 'unid'}).`, "error");
      return;
    }

    if (existing) {
      existing.quantity = neededQty;
    } else {
      addedItemsList.push({
        itemId: itemObj.id,
        name: itemObj.name,
        price: parseFloat(itemObj.salePrice || 0),
        quantity: qty,
        unit: itemObj.unit || "unid"
      });
    }

    // Renderizar tabela de adicionados
    renderAddedItemsTable();
    recalculateTotal();
    
    // Limpar select e qty
    selectAddItem.value = "";
    inputAddItemQty.value = "1";
  };

  function renderAddedItemsTable() {
    if (addedItemsList.length === 0) {
      addedTbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--color-gray-400);">Nenhum item avulso adicionado.</td></tr>`;
      return;
    }

    let html = "";
    addedItemsList.forEach((item, index) => {
      const sub = item.price * item.quantity;
      html += `
        <tr>
          <td>${item.name}</td>
          <td>${item.quantity} ${item.unit}</td>
          <td>R$ ${item.price.toFixed(2)}</td>
          <td style="font-weight: 700;">R$ ${sub.toFixed(2)}</td>
          <td class="text-right">
            <button type="button" class="btn btn-ghost btn-icon btn-remove-added-item" data-index="${index}" style="width: 24px; height: 24px; color: var(--color-danger); padding: 0;">
              <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i>
            </button>
          </td>
        </tr>
      `;
    });

    addedTbody.innerHTML = html;
    lucide.createIcons();

    addedTbody.querySelectorAll(".btn-remove-added-item").forEach(btn => {
      btn.onclick = () => {
        const idx = parseInt(btn.getAttribute("data-index"));
        addedItemsList.splice(idx, 1);
        renderAddedItemsTable();
        recalculateTotal();
      };
    });
  }

  // Inicial
  recalculateTotal();

  document.getElementById("btn-cancel-checkout").onclick = () => hideModal();

  // Finalizar cobrança e gerar transação
  document.getElementById("btn-submit-checkout").onclick = async () => {
    const paymentMethod = document.getElementById("chk-payment-method").value;
    const paymentDate = document.getElementById("chk-payment-date").value;
    const consultationVal = parseFloat(inputConsultation.value || 0);

    try {
      showToast("Finalizando cobrança...", "info");

      // 1. Dar baixa no estoque dos itens avulsos adicionados no Caixa
      for (const item of addedItemsList) {
        const invItem = inventoryItems.find(i => i.id === item.itemId);
        if (invItem) {
          const freshItem = await getTenantDoc("inventory", item.itemId);
          const freshQty = freshItem ? parseFloat(freshItem.quantity || 0) : parseFloat(invItem.quantity || 0);
          await updateTenantDoc("inventory", item.itemId, {
            quantity: Math.max(0, freshQty - item.quantity)
          });
        }
      }

      // 2. Registrar no Fluxo de Caixa a Receita consolidada
      const description = `Fechamento Caixa: Consulta + Materiais (Pet: ${pet ? pet.name : 'N/A'})`;
      const financeTransactionId = await addTenantDoc("finance", {
        type: "income",
        description: description,
        amount: grandTotal,
        date: paymentDate,
        paymentMethod: paymentMethod,
        category: "Consultas"
      });

      // 3. Atualizar o prontuário para status pago e guardar referências financeiras
      // Combinar os materiais do prontuário com os itens avulsos inseridos no caixa
      const allUsedItems = [...(record.usedItems || [])];
      addedItemsList.forEach(item => {
        allUsedItems.push({
          itemId: item.itemId,
          name: item.name,
          quantity: item.quantity,
          unit: item.unit,
          salePrice: item.price,
          isAvulso: true // Flag para controle
        });
      });

      await updateTenantDoc("records", record.id, {
        paymentStatus: "paid",
        financeTransactionId: financeTransactionId,
        paymentMethod: paymentMethod,
        paymentDate: paymentDate,
        paidAmount: grandTotal,
        usedItems: allUsedItems, // Salvar lista completa consolidada
        consultationPriceCharged: consultationVal
      });

      showToast("Recebimento concluído e integrado ao Fluxo de Caixa!", "success");
      hideModal();
      await refreshData();
      renderPendingTable();

    } catch (e) {
      console.error(e);
      showToast("Erro ao processar recebimento no caixa.", "error");
    }
  };
}

// ==========================================================================
// RENDER TABELA E FORMULÁRIO DE VENDA AVULSA / DIRETA
// ==========================================================================

function renderDirectForm() {
  const container = document.getElementById("chk-direct-container");

  let clientOptions = `<option value="" disabled selected>Selecione um tutor...</option>`;
  clientsList.forEach(c => {
    clientOptions += `<option value="${c.id}">${c.name} (${c.phone})</option>`;
  });

  let inventoryOptions = `<option value="" disabled selected>Selecione um item...</option>`;
  inventoryItems.forEach(item => {
    if (item.quantity > 0) {
      inventoryOptions += `<option value="${item.id}" data-unit="${item.unit || 'unid'}" data-price="${item.salePrice || 0}">${item.name} (${item.quantity} ${item.unit || 'unid'} disp. - R$ ${(item.salePrice || 0).toFixed(2)})</option>`;
    }
  });

  container.innerHTML = `
    <div style="max-width: 700px; margin: 0 auto; text-align: left;">
      <h3 style="font-size: 16px; font-weight: 700; margin-bottom: 20px; color: var(--brand-secondary);"><i data-lucide="shopping-bag" style="display: inline-block; vertical-align: middle; margin-right: 6px;"></i> Registrar Venda ou Cobrança Direta</h3>
      
      <form id="form-chk-direct" style="display: flex; flex-direction: column; gap: 20px;">
        
        <!-- Cliente -->
        <div class="form-group">
          <label for="direct-client">Cliente (Tutor)</label>
          <div class="input-wrapper">
            <i data-lucide="user" class="input-icon"></i>
            <select id="direct-client" required style="padding-left: 42px;">
              ${clientOptions}
            </select>
          </div>
        </div>

        <!-- Consulta Inclusa? -->
        <div style="background: var(--color-gray-50); padding: 14px; border-radius: var(--radius-md); border: 1px solid var(--color-gray-200); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
          <label style="display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; cursor: pointer; margin-bottom: 0;">
            <input type="checkbox" id="direct-chk-consultation" style="width: 18px; height: 18px; accent-color: var(--brand-primary);">
            Incluir Valor de Consulta Médica
          </label>
          
          <div class="form-group hidden" id="direct-grp-price" style="margin-bottom: 0; width: 160px;">
            <div class="input-wrapper">
              <i data-lucide="dollar-sign" class="input-icon"></i>
              <input type="number" id="direct-consultation-price" step="0.01" min="0" value="${clinicConsultationPrice.toFixed(2)}" style="padding-left: 42px;">
            </div>
          </div>
        </div>

        <!-- Seleção de Itens do Estoque -->
        <div style="background: var(--brand-primary-light); padding: 14px; border-radius: var(--radius-md); border: 1px solid var(--brand-primary);">
          <h5 style="font-size: 13px; font-weight: 700; color: var(--brand-primary); margin-bottom: 12px; display: flex; align-items: center; gap: 6px;">
            <i data-lucide="package" style="width: 16px; height: 16px;"></i> Insumos e Medicamentos Vendidos
          </h5>
          <div style="display: grid; grid-template-columns: 2fr 1fr auto; gap: 10px; align-items: flex-end;">
            <div class="form-group" style="margin-bottom: 0;">
              <select id="direct-add-item-select" style="width: 100%; height: 38px; border-radius: var(--radius-md); border: 1px solid var(--color-gray-200); padding: 0 10px;">
                ${inventoryOptions}
              </select>
            </div>
            <div class="form-group" style="margin-bottom: 0;">
              <input type="number" id="direct-add-item-qty" min="1" value="1" style="width: 100%; height: 38px; border-radius: var(--radius-md); border: 1px solid var(--color-gray-200); padding: 0 10px;">
            </div>
            <button type="button" id="btn-direct-add-item" class="btn btn-primary" style="height: 38px; padding: 0 16px;">Inserir</button>
          </div>

          <!-- Tabela de Itens Adicionados -->
          <div class="table-responsive" style="margin-top: 12px; background: var(--color-white); border-radius: var(--radius-sm); border: 1px solid var(--color-gray-200);">
            <table class="data-table" style="font-size: 12px; margin-bottom: 0;">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Qtd.</th>
                  <th>Preço</th>
                  <th>Subtotal</th>
                  <th class="text-right">Ação</th>
                </tr>
              </thead>
              <tbody id="direct-added-items-tbody">
                <tr><td colspan="5" style="text-align: center; color: var(--color-gray-400);">Nenhum item adicionado.</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Forma de Pagamento e Fechamento -->
        <div style="background: var(--color-gray-50); padding: 16px; border-radius: var(--radius-md); border: 1px solid var(--color-gray-300); display: flex; flex-direction: column; gap: 16px;">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--color-gray-200); padding-bottom: 12px;">
            <span style="font-size: 16px; font-weight: 700; color: var(--color-gray-700);">Valor Total:</span>
            <span id="direct-grand-total" style="font-size: 22px; font-weight: 800; color: var(--color-success);">R$ 0,00</span>
          </div>

          <div class="form-row" style="grid-template-columns: 1fr 1fr;">
            <div class="form-group" style="margin-bottom: 0;">
              <label for="direct-payment-method">Forma de Pagamento</label>
              <div class="input-wrapper">
                <i data-lucide="credit-card" class="input-icon"></i>
                <select id="direct-payment-method" required style="padding-left: 42px;">
                  <option value="Dinheiro" selected>Dinheiro</option>
                  <option value="PIX">PIX</option>
                  <option value="Cartão de Crédito">Cartão de Crédito</option>
                  <option value="Cartão de Débito">Cartão de Débito</option>
                  <option value="Boleto">Boleto Bancário</option>
                </select>
              </div>
            </div>
            <div class="form-group" style="margin-bottom: 0;">
              <label for="direct-payment-date">Data do Recebimento</label>
              <div class="input-wrapper">
                <i data-lucide="calendar" class="input-icon"></i>
                <input type="date" id="direct-payment-date" required value="${new Date().toISOString().split('T')[0]}" style="padding-left: 42px;">
              </div>
            </div>
          </div>
        </div>

        <button type="submit" class="btn btn-success btn-block" style="padding: 12px; font-size: 15px; display: flex; align-items: center; justify-content: center; gap: 8px;">
          <i data-lucide="check-circle"></i> Confirmar Venda & Lançar Caixa
        </button>

      </form>
    </div>
  `;

  lucide.createIcons();

  const chkConsultation = document.getElementById("direct-chk-consultation");
  const grpPrice = document.getElementById("direct-grp-price");
  const inputPrice = document.getElementById("direct-consultation-price");
  const selectItem = document.getElementById("direct-add-item-select");
  const inputQty = document.getElementById("direct-add-item-qty");
  const btnAddItem = document.getElementById("btn-direct-add-item");
  const tbody = document.getElementById("direct-added-items-tbody");
  const txtTotal = document.getElementById("direct-grand-total");

  const itemsList = [];
  let totalDirect = 0;

  // Toggle input de consulta
  chkConsultation.onchange = () => {
    if (chkConsultation.checked) {
      grpPrice.classList.remove("hidden");
    } else {
      grpPrice.classList.add("hidden");
    }
    recalculateDirectTotal();
  };

  inputPrice.oninput = () => recalculateDirectTotal();

  function recalculateDirectTotal() {
    const consultationVal = chkConsultation.checked ? parseFloat(inputPrice.value || 0) : 0;
    let itemsTotal = 0;
    
    itemsList.forEach(item => {
      itemsTotal += item.price * item.quantity;
    });

    totalDirect = consultationVal + itemsTotal;
    txtTotal.textContent = `R$ ${totalDirect.toFixed(2)}`;
  }

  // Adicionar item na listagem local
  btnAddItem.onclick = () => {
    const itemId = selectItem.value;
    const qty = parseFloat(inputQty.value || 0);

    if (!itemId) {
      showToast("Selecione um item do estoque.", "warning");
      return;
    }
    if (qty <= 0) {
      showToast("A quantidade deve ser maior que zero.", "warning");
      return;
    }

    const itemObj = inventoryItems.find(i => i.id === itemId);
    if (!itemObj) return;

    const availableQty = parseFloat(itemObj.quantity || 0);
    const existing = itemsList.find(i => i.itemId === itemId);
    const neededQty = qty + (existing ? existing.quantity : 0);

    if (neededQty > availableQty) {
      showToast(`Quantidade indisponível no estoque (restam ${availableQty} ${itemObj.unit || 'unid'}).`, "error");
      return;
    }

    if (existing) {
      existing.quantity = neededQty;
    } else {
      itemsList.push({
        itemId: itemObj.id,
        name: itemObj.name,
        price: parseFloat(itemObj.salePrice || 0),
        quantity: qty,
        unit: itemObj.unit || "unid"
      });
    }

    renderAddedItems();
    recalculateDirectTotal();

    selectItem.value = "";
    inputQty.value = "1";
  };

  function renderAddedItems() {
    if (itemsList.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--color-gray-400);">Nenhum item adicionado.</td></tr>`;
      return;
    }

    let html = "";
    itemsList.forEach((item, index) => {
      const sub = item.price * item.quantity;
      html += `
        <tr>
          <td>${item.name}</td>
          <td>${item.quantity} ${item.unit}</td>
          <td>R$ ${item.price.toFixed(2)}</td>
          <td style="font-weight: 700;">R$ ${sub.toFixed(2)}</td>
          <td class="text-right">
            <button type="button" class="btn btn-ghost btn-icon btn-remove-direct-item" data-index="${index}" style="width: 24px; height: 24px; color: var(--color-danger); padding: 0;">
              <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i>
            </button>
          </td>
        </tr>
      `;
    });

    tbody.innerHTML = html;
    lucide.createIcons();

    tbody.querySelectorAll(".btn-remove-direct-item").forEach(btn => {
      btn.onclick = () => {
        const idx = parseInt(btn.getAttribute("data-index"));
        itemsList.splice(idx, 1);
        renderAddedItems();
        recalculateDirectTotal();
      };
    });
  }

  // Submissão da venda direta
  document.getElementById("form-chk-direct").onsubmit = async (e) => {
    e.preventDefault();
    const clientId = document.getElementById("direct-client").value;
    const paymentMethod = document.getElementById("direct-payment-method").value;
    const paymentDate = document.getElementById("direct-payment-date").value;
    const clientObj = clientsList.find(c => c.id === clientId);

    if (totalDirect <= 0) {
      showToast("O valor total da venda deve ser maior que zero.", "warning");
      return;
    }

    try {
      showToast("Registrando venda direta...", "info");

      // 1. Dar baixa no estoque
      for (const item of itemsList) {
        const freshItem = await getTenantDoc("inventory", item.itemId);
        const currentQty = freshItem ? parseFloat(freshItem.quantity || 0) : 0;
        await updateTenantDoc("inventory", item.itemId, {
          quantity: Math.max(0, currentQty - item.quantity)
        });
      }

      // 2. Registrar no Fluxo de Caixa a receita
      const description = `Venda Direta: ${clientObj ? clientObj.name : 'Cliente'}`;
      await addTenantDoc("finance", {
        type: "income",
        description: description,
        amount: totalDirect,
        date: paymentDate,
        paymentMethod: paymentMethod,
        category: chkConsultation.checked ? "Consultas" : "Medicamentos"
      });

      showToast("Venda registrada e integrada ao Fluxo de Caixa!", "success");
      
      // Limpar form
      chkConsultation.checked = false;
      grpPrice.classList.add("hidden");
      document.getElementById("direct-client").value = "";
      itemsList.length = 0;
      renderAddedItems();
      recalculateDirectTotal();

      // Recarregar dados locais
      await refreshData();

    } catch (err) {
      console.error(err);
      showToast("Erro ao processar venda direta.", "error");
    }
  };
}

// ==========================================================================
// HELPERS
// ==========================================================================

function formatDate(dateStr) {
  if (!dateStr) return "N/A";
  const d = new Date(dateStr);
  return d.toLocaleDateString("pt-BR");
}
