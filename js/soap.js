// ==========================================================================
// ELECTRONIC MEDICAL RECORDS MODULE (SOAP PATTERN & CONSULTATIONS LIST)
// ==========================================================================

import { addTenantDoc, getTenantDocs, getTenantDoc, updateTenantDoc, deleteTenantDoc } from "./db.js";
import { showToast, showModal, hideModal } from "./utils.js";

// Cache de dados locais da tela de Prontuários
let recordsList = [];
let petsList = [];
let clientsList = [];

/**
 * Abre o modal de prontuário eletrônico estruturado no padrão SOAP.
 * @param {string} petId ID do pet
 * @param {string} petName Nome do pet
 * @param {object} editRecord Objeto de prontuário existente se for edição
 */
export async function openSoapRecordModal(petId, petName, editRecord = null) {
  try {
    // Carregar itens do estoque para o seletor de baixa automática
    const inventory = await getTenantDocs("inventory").catch(() => []);
    
    let inventoryOptions = `<option value="" disabled selected>Selecione um insumo/medicamento...</option>`;
    inventory.forEach(item => {
      if (item.quantity > 0 || (editRecord && editRecord.usedItems && editRecord.usedItems.some(i => i.itemId === item.id))) {
        inventoryOptions += `<option value="${item.id}" data-unit="${item.unit || 'unid'}" data-price="${item.salePrice || 0}">${item.name} (${item.quantity} ${item.unit || 'unid'} disp. - R$ ${(item.salePrice || 0).toFixed(2)})</option>`;
      }
    });

    const isEdit = editRecord !== null;
    const subjectiveVal = isEdit ? editRecord.soap.subjective : "";
    const objectiveVal = isEdit ? editRecord.soap.objective : "";
    const analysisVal = isEdit ? editRecord.soap.analysis : "";
    const planVal = isEdit ? editRecord.soap.plan : "";
    const dateVal = isEdit ? editRecord.date.split("T")[0] : new Date().toISOString().split("T")[0];

    const soapHTML = `
      <form id="form-soap-record">
        <h4 style="font-size: 14px; color: var(--color-gray-500); margin-bottom: 16px;">
          ${isEdit ? "Editando" : "Registrando"} prontuário clínico para: <strong>${petName}</strong>
        </h4>
        
        <div style="display: flex; flex-direction: column; gap: 16px;">
          <!-- Data da Consulta -->
          <div class="form-group" style="margin-bottom: 0;">
            <label for="soap-date">Data da Consulta</label>
            <div class="input-wrapper">
              <i data-lucide="calendar" class="input-icon"></i>
              <input type="date" id="soap-date" required value="${dateVal}" style="padding-left: 42px;">
            </div>
          </div>

          <!-- S: Subjetivo -->
          <div class="soap-field">
            <h4 class="soap-s"><i data-lucide="help-circle"></i> S - Subjetivo</h4>
            <div class="input-wrapper">
              <textarea id="soap-subjective" required placeholder="Anamnese, queixas do tutor, comportamento do pet, sintomas relatados...">${subjectiveVal}</textarea>
            </div>
          </div>

          <!-- O: Objetivo -->
          <div class="soap-field">
            <h4 class="soap-o"><i data-lucide="activity"></i> O - Objetivo</h4>
            <div class="input-wrapper">
              <textarea id="soap-objective" placeholder="Sinais vitais (peso, temperatura, batimentos, mucosas), achados no exame físico geral e específico...">${objectiveVal}</textarea>
            </div>
          </div>

          <!-- A: Análise -->
          <div class="soap-field">
            <h4 class="soap-a"><i data-lucide="brain"></i> A - Análise</h4>
            <div class="input-wrapper">
              <textarea id="soap-analysis" placeholder="Suspeitas clínicas, diagnósticos diferenciais, estado geral do pet...">${analysisVal}</textarea>
            </div>
          </div>

          <!-- P: Plano -->
          <div class="soap-field">
            <h4 class="soap-p"><i data-lucide="clipboard-list"></i> P - Plano</h4>
            <div class="input-wrapper">
              <textarea id="soap-plan" placeholder="Tratamento receitado, exames complementares solicitados, recomendações de retorno...">${planVal}</textarea>
            </div>
          </div>

          <!-- Integração de Baixa Automática de Estoque -->
          <div style="background: var(--brand-primary-light); padding: 16px; border-radius: var(--radius-md); border: 1px solid var(--brand-primary); display: flex; flex-direction: column; gap: 12px;">
            <h4 style="font-size: 13px; font-weight: 700; color: var(--brand-primary); display: flex; align-items: center; gap: 6px; margin-bottom: 0;">
              <i data-lucide="package"></i> Consumo de Medicamentos (Baixa e Cobrança Automática)
            </h4>
            
            <div id="soap-medicines-list" style="display: flex; flex-direction: column; gap: 8px;">
              <!-- Linhas de medicamentos serão adicionadas aqui dinamicamente -->
            </div>
            
            <button type="button" id="btn-soap-add-med" class="btn btn-secondary" style="align-self: flex-start; padding: 6px 12px; font-size: 12px; display: flex; align-items: center; gap: 4px; height: auto;">
              <i data-lucide="plus" style="width: 14px; height: 14px;"></i> Adicionar Medicamento
            </button>
          </div>
        </div>

        <div style="margin-top: 24px; display: flex; justify-content: flex-end; gap: 12px;">
          <button type="button" id="btn-cancel-soap" class="btn btn-secondary">Cancelar</button>
          <button type="submit" class="btn btn-primary">${isEdit ? "Salvar Alterações" : "Salvar Prontuário"}</button>
        </div>
      </form>
    `;

    showModal(`${isEdit ? "Editar" : "Registrar"} Consulta (SOAP)`, soapHTML);
    lucide.createIcons();

    const medListContainer = document.getElementById("soap-medicines-list");
    const btnAddMed = document.getElementById("btn-soap-add-med");
    let rowCounter = 0;

    // Helper para gerar HTML de uma linha de medicamento
    function createMedicineRowHTML(rowId, selectedItemId = "", quantity = 1) {
      // Filtrar as opções e marcar a selecionada
      let optionsHTML = `<option value="" disabled ${!selectedItemId ? 'selected' : ''}>Selecione um insumo/medicamento...</option>`;
      inventory.forEach(item => {
        const isSelected = item.id === selectedItemId;
        if (item.quantity > 0 || isSelected) {
          optionsHTML += `<option value="${item.id}" data-unit="${item.unit || 'unid'}" data-price="${item.salePrice || 0}" ${isSelected ? 'selected' : ''}>${item.name} (${item.quantity} ${item.unit || 'unid'} disp. - R$ ${(item.salePrice || 0).toFixed(2)})</option>`;
        }
      });

      return `
        <div class="medicine-row" id="med-row-${rowId}" style="display: grid; grid-template-columns: 2fr 1fr auto; gap: 10px; align-items: flex-end; background: var(--color-white); padding: 10px; border-radius: var(--radius-sm); border: 1px solid var(--color-gray-200);">
          <div class="form-group" style="margin-bottom: 0;">
            <label style="font-size: 11px; color: var(--color-gray-500);">Item do Estoque</label>
            <div class="input-wrapper">
              <select class="soap-med-select" required style="width: 100%; height: 38px; border-radius: var(--radius-md); border: 1px solid var(--color-gray-200); padding: 0 10px;">
                ${optionsHTML}
              </select>
            </div>
          </div>
          <div class="form-group" style="margin-bottom: 0;">
            <label style="font-size: 11px; color: var(--color-gray-500);">Quantidade</label>
            <div class="input-wrapper">
              <input type="number" class="soap-med-qty" min="0.1" step="any" value="${quantity}" required style="width: 100%; height: 38px; border-radius: var(--radius-md); border: 1px solid var(--color-gray-200); padding: 0 10px;">
            </div>
          </div>
          <button type="button" class="btn btn-danger btn-icon btn-remove-med" data-row-id="${rowId}" style="height: 38px; width: 38px; padding: 0; display: inline-flex; align-items: center; justify-content: center;">
            <i data-lucide="trash-2" style="width: 16px; height: 16px;"></i>
          </button>
        </div>
      `;
    }

    function addMedRow(selectedItemId = "", quantity = 1) {
      rowCounter++;
      const div = document.createElement("div");
      div.innerHTML = createMedicineRowHTML(rowCounter, selectedItemId, quantity);
      const rowElement = div.firstElementChild;
      medListContainer.appendChild(rowElement);
      
      // Bind de remoção
      rowElement.querySelector(".btn-remove-med").onclick = () => {
        rowElement.remove();
      };
      
      lucide.createIcons();
    }

    btnAddMed.onclick = () => addMedRow();

    // Se for edição, carregar os medicamentos já utilizados
    if (isEdit && editRecord.usedItems && editRecord.usedItems.length > 0) {
      editRecord.usedItems.forEach(item => {
        addMedRow(item.itemId, item.quantity);
      });
    }

    document.getElementById("btn-cancel-soap").onclick = () => hideModal();

    document.getElementById("form-soap-record").addEventListener("submit", async (e) => {
      e.preventDefault();
      
      const subjective = document.getElementById("soap-subjective").value;
      const objective = document.getElementById("soap-objective").value;
      const analysis = document.getElementById("soap-analysis").value;
      const plan = document.getElementById("soap-plan").value;
      const dateInputVal = document.getElementById("soap-date").value;
      
      try {
        // Se for Edição, primeiro fazemos o estorno do consumo anterior e do financeiro consolidado
        if (isEdit) {
          await rollbackMedicineUsage(editRecord.usedItems);
          if (editRecord.paymentStatus === "paid" && editRecord.financeTransactionId) {
            await deleteTenantDoc("finance", editRecord.financeTransactionId);
          }
        }

        // Processar Baixa de Medicamentos no Estoque
        const usedItems = [];
        const medRows = document.querySelectorAll(".medicine-row");

        for (const row of medRows) {
          const selectEl = row.querySelector(".soap-med-select");
          const qtyEl = row.querySelector(".soap-med-qty");
          
          const itemId = selectEl.value;
          const qty = parseFloat(qtyEl.value || 0);

          if (itemId && qty > 0) {
            const selectedOption = selectEl.options[selectEl.selectedIndex];
            const unit = selectedOption.getAttribute("data-unit") || "unid";
            const salePrice = parseFloat(selectedOption.getAttribute("data-price") || 0);
            const name = selectedOption.text.split(" (Qtd:")[0];

            // 1. Dar baixa no estoque
            const invItem = inventory.find(i => i.id === itemId);
            if (invItem) {
              const currentQty = parseFloat(invItem.quantity || 0);
              const minQty = parseFloat(invItem.minQuantity || 0);
              const freshItem = await getTenantDoc("inventory", itemId);
              const freshQty = freshItem ? parseFloat(freshItem.quantity || 0) : currentQty;
              const newQty = Math.max(0, freshQty - qty);

              await updateTenantDoc("inventory", itemId, {
                quantity: newQty
              });

              if (newQty <= minQty) {
                showToast(`Atenção: O item "${name}" atingiu o estoque mínimo (${newQty} restando).`, "error");
              }
            }

            usedItems.push({
              itemId,
              name,
              quantity: qty,
              unit,
              salePrice
            });
          }
        }

        // Criar ou Atualizar Registro no Firestore
        const recordData = {
          petId: petId,
          date: new Date(dateInputVal + "T12:00:00").toISOString(), // Garantir persistência de fuso horário local
          soap: {
            subjective,
            objective,
            analysis,
            plan
          },
          usedItems,
          paymentStatus: "pending", // Sempre volta para pendente na edição/criação até ser cobrado no Caixa
          attachments: isEdit ? (editRecord.attachments || []) : []
        };

        if (isEdit) {
          await updateTenantDoc("records", editRecord.id, recordData);
          showToast("Prontuário clínico atualizado com sucesso!", "success");
        } else {
          await addTenantDoc("records", recordData);
          showToast("Consulta gravada com sucesso!", "success");
        }

        hideModal();

        // Recarregar visualização apropriada
        const currentHash = window.location.hash;
        if (currentHash === "#pets") {
          // Reabrir modal do pet
          setTimeout(() => {
            const btn = document.querySelector(`.btn-view-pet[data-id="${petId}"]`);
            if (btn) btn.click();
          }, 200);
        } else if (currentHash === "#records") {
          await refreshData();
          renderRecordsList();
        }

      } catch (err) {
        console.error(err);
        showToast("Erro ao processar e salvar o prontuário ou financeiro.", "error");
      }
    });

  } catch (error) {
    console.error(error);
    showToast("Erro ao inicializar formulário de consulta.", "error");
  }
}

/**
 * Estorna os medicamentos consumidos devolvendo-os ao estoque
 */
async function rollbackMedicineUsage(usedItems) {
  if (!usedItems || !Array.isArray(usedItems)) return;

  for (const item of usedItems) {
    try {
      // Devolver ao estoque
      const invItem = await getTenantDoc("inventory", item.itemId);
      if (invItem) {
        const currentQty = parseFloat(invItem.quantity || 0);
        const restoredQty = currentQty + parseFloat(item.quantity || 0);
        await updateTenantDoc("inventory", item.itemId, {
          quantity: restoredQty
        });
      }
    } catch (e) {
      console.error(`Erro ao restaurar item ${item.name}:`, e);
    }
  }
}

// ==========================================================================
// RENDER E INICIALIZAÇÃO DA PÁGINA DE PRONTUÁRIOS (VIEW RECORDS)
// ==========================================================================

/**
 * Renderiza o layout base da página de prontuários.
 */
export function renderRecords(container) {
  container.innerHTML = `
    <div class="card fade-in">
      <div class="card-header" style="flex-wrap: wrap; gap: 16px;">
        <h3 class="card-title"><i data-lucide="clipboard-list"></i> Prontuário Eletrônico & Histórico de Consultas</h3>
      </div>

      <!-- Barra de Filtros -->
      <div style="margin: 24px 0 16px; display: flex; gap: 12px; align-items: center; flex-wrap: wrap;">
        <div class="input-wrapper" style="max-width: 400px; flex: 1;">
          <i data-lucide="search" class="input-icon"></i>
          <input type="text" id="rec-search" placeholder="Buscar prontuário por pet, tutor ou sintoma...">
        </div>
      </div>

      <!-- Área de Listagem -->
      <div id="records-list-container" class="fade-in">
        <div style="text-align: center; padding: 40px; color: var(--color-gray-400);">
          <i data-lucide="loader" class="animate-spin" style="width: 32px; height: 32px; margin-bottom: 12px;"></i>
          <p>Carregando prontuários...</p>
        </div>
      </div>
    </div>
  `;
}

/**
 * Inicializa dados da página de prontuários.
 */
export async function initRecords() {
  await refreshData();
  
  // Bind de busca
  document.getElementById("rec-search").oninput = handleFilter;

  // Render inicial
  renderRecordsList();
}

/**
 * Recarrega cache de dados
 */
async function refreshData() {
  try {
    recordsList = await getTenantDocs("records");
    petsList = await getTenantDocs("pets");
    clientsList = await getTenantDocs("clients");

    // Ordenar decrescente por data
    recordsList.sort((a, b) => new Date(b.date) - new Date(a.date));
  } catch (error) {
    showToast("Erro ao carregar prontuários do banco.", "error");
  }
}

/**
 * Filtro de pesquisa em tempo real
 */
function handleFilter() {
  const query = document.getElementById("rec-search").value.toLowerCase();

  const filtered = recordsList.filter(rec => {
    const pet = petsList.find(p => p.id === rec.petId);
    const owner = pet ? clientsList.find(c => c.id === pet.clientId) : null;
    
    const petName = pet ? pet.name.toLowerCase() : "";
    const breed = pet ? pet.breed.toLowerCase() : "";
    const ownerName = owner ? owner.name.toLowerCase() : "";
    const subj = rec.soap.subjective.toLowerCase();
    const plan = rec.soap.plan.toLowerCase();
    
    return petName.includes(query) || 
           ownerName.includes(query) || 
           breed.includes(query) ||
           subj.includes(query) || 
           plan.includes(query);
  });

  renderRecordsList(filtered);
}

/**
 * Renderiza a lista de prontuários
 */
function renderRecordsList(items = recordsList) {
  const container = document.getElementById("records-list-container");
  
  if (items.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 40px; color: var(--color-gray-400);">
        <i data-lucide="file-text" style="width: 48px; height: 48px; margin-bottom: 12px;"></i>
        <p>Nenhum prontuário encontrado.</p>
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
            <th>Diagnóstico / Queixa (Resumo)</th>
            <th>Medicamentos</th>
            <th class="text-right">Ações</th>
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

    // Limitar texto do subjetivo
    let summary = rec.soap.subjective || "Sem anamnese.";
    if (summary.length > 80) {
      summary = summary.substring(0, 77) + "...";
    }

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
          <div style="max-width: 280px; font-size: 13px; line-height: 1.4;">
            ${summary}
          </div>
        </td>
        <td>
          <div style="max-width: 200px; display: flex; flex-wrap: wrap;">
            ${medsText}
          </div>
        </td>
        <td class="text-right">
          <div style="display: inline-flex; gap: 6px;">
            <button class="btn btn-ghost btn-icon btn-view-rec" data-id="${rec.id}" title="Visualizar ProntuárioCompleto" style="width: 32px; height: 32px;">
              <i data-lucide="eye" style="width: 16px; height: 16px;"></i>
            </button>
            <button class="btn btn-ghost btn-icon btn-edit-rec" data-id="${rec.id}" title="Editar Prontuário" style="width: 32px; height: 32px;">
              <i data-lucide="edit-3" style="width: 16px; height: 16px;"></i>
            </button>
            <button class="btn btn-ghost btn-icon btn-delete-rec" data-id="${rec.id}" title="Excluir Prontuário" style="width: 32px; height: 32px; color: var(--color-danger);">
              <i data-lucide="trash-2" style="width: 16px; height: 16px;"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  });

  html += `</tbody></table></div>`;
  container.innerHTML = html;
  lucide.createIcons();

  // Binds de cliques
  container.querySelectorAll(".btn-view-rec").forEach(btn => {
    btn.onclick = () => {
      const rec = items.find(r => r.id === btn.getAttribute("data-id"));
      if (rec) openViewRecordModalDirectly(rec);
    };
  });

  container.querySelectorAll(".btn-edit-rec").forEach(btn => {
    btn.onclick = () => {
      const rec = items.find(r => r.id === btn.getAttribute("data-id"));
      const pet = petsList.find(p => p.id === rec.petId);
      if (rec && pet) {
        openSoapRecordModal(rec.petId, pet.name, rec);
      }
    };
  });

  container.querySelectorAll(".btn-delete-rec").forEach(btn => {
    btn.onclick = async () => {
      const recId = btn.getAttribute("data-id");
      const rec = items.find(r => r.id === recId);
      const pet = petsList.find(p => p.id === rec.petId);
      const petName = pet ? pet.name : "o animal";
      
      if (confirm(`Tem certeza de que deseja excluir o prontuário de ${petName} em ${formatDate(rec.date)}? Isso irá estornar os estoques utilizados e apagar os respectivos lançamentos financeiros.`)) {
        try {
          showToast("Processando estorno de estoques e financeiro...", "info");
          // 1. Rollback do consumo do prontuário
          await rollbackMedicineUsage(rec.usedItems);
          
          // 2. Apagar transação consolidada se estivesse pago
          if (rec.paymentStatus === "paid" && rec.financeTransactionId) {
            await deleteTenantDoc("finance", rec.financeTransactionId);
          }

          // 3. Apagar documento
          await deleteTenantDoc("records", recId);
          showToast("Prontuário excluído e estoques estornados com sucesso!", "success");
          
          await refreshData();
          renderRecordsList();
        } catch (err) {
          console.error(err);
          showToast("Erro ao excluir prontuário.", "error");
        }
      }
    };
  });
}

/**
 * Abre modal com visualização direta da consulta (idêntico ao do pets.js para compatibilidade).
 */
function openViewRecordModalDirectly(record) {
  const pet = petsList.find(p => p.id === record.petId);
  const modalHTML = `
    <div style="text-align: left; font-size: 14px; line-height: 1.6; display: flex; flex-direction: column; gap: 16px;">
      <p style="font-size: 13px; color: var(--color-gray-500); margin-bottom: 0;">
        Consulta de <strong>${pet ? pet.name : 'Pet'}</strong> realizada em <strong>${formatDate(record.date)}</strong>
      </p>
      
      <div style="background: var(--color-gray-50); padding: 12px; border-radius: var(--radius-md); border-left: 4px solid var(--brand-primary);">
        <strong style="color: var(--brand-primary); font-size: 12px;">S - Subjetivo</strong>
        <p style="margin: 4px 0 0 0; white-space: pre-wrap; font-size: 13px; color: var(--color-gray-700);">${record.soap.subjective || 'Sem registro.'}</p>
      </div>

      <div style="background: var(--color-gray-50); padding: 12px; border-radius: var(--radius-md); border-left: 4px solid var(--color-success);">
        <strong style="color: var(--color-success); font-size: 12px;">O - Objetivo</strong>
        <p style="margin: 4px 0 0 0; white-space: pre-wrap; font-size: 13px; color: var(--color-gray-700);">${record.soap.objective || 'Sem registro.'}</p>
      </div>

      <div style="background: var(--color-gray-50); padding: 12px; border-radius: var(--radius-md); border-left: 4px solid var(--color-warning);">
        <strong style="color: var(--color-warning); font-size: 12px;">A - Análise</strong>
        <p style="margin: 4px 0 0 0; white-space: pre-wrap; font-size: 13px; color: var(--color-gray-700);">${record.soap.analysis || 'Sem registro.'}</p>
      </div>

      <div style="background: var(--color-gray-50); padding: 12px; border-radius: var(--radius-md); border-left: 4px solid var(--brand-secondary);">
        <strong style="color: var(--brand-secondary); font-size: 12px;">P - Plano</strong>
        <p style="margin: 4px 0 0 0; white-space: pre-wrap; font-size: 13px; color: var(--color-gray-700);">${record.soap.plan || 'Sem registro.'}</p>
      </div>

      ${record.usedItems && record.usedItems.length > 0 ? `
        <div style="background: var(--brand-primary-light); padding: 12px; border-radius: var(--radius-md); border: 1px solid var(--brand-primary);">
          <strong style="color: var(--brand-primary); font-size: 13px; display: flex; align-items: center; gap: 6px;">
            <i data-lucide="package" style="width: 16px; height: 16px;"></i> Medicamentos Consumidos do Estoque
          </strong>
          <ul style="margin: 8px 0 0 16px; padding: 0; font-size: 13px; color: var(--color-gray-700);">
            ${record.usedItems.map(item => `<li><strong>${item.name}</strong> - ${item.quantity} ${item.unit || 'unid'}</li>`).join('')}
          </ul>
        </div>
      ` : ''}
      
      <button type="button" class="btn btn-secondary" id="btn-close-view-rec" style="align-self: flex-end; margin-top: 12px;">Fechar</button>
    </div>
  `;

  showModal("Visualizar Consulta", modalHTML);
  lucide.createIcons();
  document.getElementById("btn-close-view-rec").onclick = () => hideModal();
}

// ==========================================================================
// HELPERS
// ==========================================================================

function formatDate(dateStr) {
  if (!dateStr) return "N/A";
  const d = new Date(dateStr);
  return d.toLocaleDateString("pt-BR");
}
