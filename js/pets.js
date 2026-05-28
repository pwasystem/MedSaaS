// ==========================================================================
// CLIENTS & PETS MANAGEMENT MODULE
// ==========================================================================

import { 
  addTenantDoc, 
  setTenantDoc,
  getTenantDocs, 
  getTenantDoc, 
  updateTenantDoc, 
  deleteTenantDoc,
  getActiveClinicId
} from "./db.js";
import { showToast, showModal, hideModal, resizeImage } from "./utils.js";
import { openSoapRecordModal } from "./soap.js";

// Cache local de dados
let clientsList = [];
let petsList = [];

/**
 * Renderiza o layout de abas e a estrutura base da tela de Clientes e Pets.
 */
export function renderPets(container) {
  container.innerHTML = `
    <div class="card fade-in">
      <div class="card-header" style="flex-wrap: wrap; gap: 16px;">
        <div style="display: flex; gap: 12px; border-bottom: 2px solid var(--color-gray-100); margin-bottom: -16px;">
          <button id="tab-sub-pets" class="auth-tab active" style="padding: 12px 20px; font-size: 15px;">Pets (Animais)</button>
          <button id="tab-sub-clients" class="auth-tab" style="padding: 12px 20px; font-size: 15px;">Tutores (Clientes)</button>
        </div>
        <div style="display: flex; gap: 12px; margin-left: auto;">
          <button id="btn-add-client" class="btn btn-secondary"><i data-lucide="user-plus"></i> Novo Tutor</button>
          <button id="btn-add-pet" class="btn btn-primary"><i data-lucide="plus"></i> Novo Pet</button>
        </div>
      </div>

      <!-- Barra de Pesquisa -->
      <div style="margin: 24px 0 16px; position: relative;">
        <div class="input-wrapper" style="max-width: 400px;">
          <i data-lucide="search" class="input-icon"></i>
          <input type="text" id="pet-search" placeholder="Buscar tutor ou animal por nome..." style="padding-left: 42px;">
        </div>
      </div>

      <!-- Área de Listagem -->
      <div id="pets-list-container" class="fade-in">
        <!-- Lista de Pets -->
      </div>
      
      <div id="clients-list-container" class="fade-in hidden">
        <!-- Lista de Clientes -->
      </div>
    </div>
  `;
}

/**
 * Inicializa dados e eventos.
 */
export async function initPets() {
  bindTabs();
  await refreshData();
  
  // Registrar cliques de cadastro
  document.getElementById("btn-add-client").addEventListener("click", openClientModal);
  document.getElementById("btn-add-pet").addEventListener("click", openPetModal);
  
  // Barra de pesquisa
  document.getElementById("pet-search").addEventListener("input", handleSearch);

  // Iniciar render padrão
  renderPetsGrid();
  renderClientsTable();
}

/**
 * Vincula a troca de abas.
 */
function bindTabs() {
  const tabPets = document.getElementById("tab-sub-pets");
  const tabClients = document.getElementById("tab-sub-clients");
  const listPets = document.getElementById("pets-list-container");
  const listClients = document.getElementById("clients-list-container");

  tabPets.addEventListener("click", () => {
    tabPets.classList.add("active");
    tabClients.classList.remove("active");
    listPets.classList.remove("hidden");
    listClients.classList.add("hidden");
  });

  tabClients.addEventListener("click", () => {
    tabClients.classList.add("active");
    tabPets.classList.remove("active");
    listClients.classList.remove("hidden");
    listPets.classList.add("hidden");
  });
}

/**
 * Atualiza cache de dados buscando do Firestore.
 */
async function refreshData() {
  try {
    clientsList = await getTenantDocs("clients");
    petsList = await getTenantDocs("pets");
  } catch (error) {
    showToast("Erro ao carregar dados do banco.", "error");
  }
}

/**
 * Executa filtro da pesquisa em tempo real.
 */
function handleSearch(e) {
  const query = e.target.value.toLowerCase();
  
  // Filtrar grid de Pets
  const filteredPets = petsList.filter(pet => {
    const owner = clientsList.find(c => c.id === pet.clientId);
    return pet.name.toLowerCase().includes(query) || 
           pet.species.toLowerCase().includes(query) || 
           (owner && owner.name.toLowerCase().includes(query));
  });
  renderPetsGrid(filteredPets);

  // Filtrar tabela de Clientes
  const filteredClients = clientsList.filter(client => 
    client.name.toLowerCase().includes(query) || 
    client.phone.includes(query) || 
    client.email.toLowerCase().includes(query)
  );
  renderClientsTable(filteredClients);
}

// ==========================================================================
// RENDERS
// ==========================================================================

function renderPetsGrid(items = petsList) {
  const container = document.getElementById("pets-list-container");
  if (items.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 40px; color: var(--color-gray-400);">
        <i data-lucide="paw-print" style="width: 48px; height: 48px; margin-bottom: 12px;"></i>
        <p>Nenhum pet encontrado.</p>
      </div>
    `;
    lucide.createIcons();
    return;
  }

  let html = `<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 24px;">`;
  
  items.forEach(pet => {
    const owner = clientsList.find(c => c.id === pet.clientId);
    const photoUrl = pet.photoUrl || "https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&q=80&w=200";
    
    html += `
      <div class="card" style="margin-bottom: 0; padding: 20px; display: flex; flex-direction: column; gap: 12px; transition: transform var(--transition-fast);" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='none'">
        <div style="display: flex; gap: 16px; align-items: center;">
          <img src="${photoUrl}" alt="${pet.name}" style="width: 64px; height: 64px; border-radius: var(--radius-md); object-fit: cover; border: 2px solid var(--color-gray-100);">
          <div style="min-width: 0;">
            <h4 style="font-size: 16px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${pet.name}</h4>
            <span class="status-badge status-badge-success" style="font-size: 10px; margin-top: 4px;">
              ${pet.species} • ${pet.breed || 'SRD'}
            </span>
          </div>
        </div>
        <div style="border-top: 1px solid var(--color-gray-100); padding-top: 12px; font-size: 13px; color: var(--color-gray-600); display: flex; flex-direction: column; gap: 4px;">
          <span><strong>Tutor:</strong> ${owner ? owner.name : 'Desconhecido'}</span>
          <span><strong>Idade:</strong> ${calculateAge(pet.birthDate)}</span>
        </div>
        <button class="btn btn-primary btn-block btn-view-pet" data-id="${pet.id}" style="margin-top: auto; padding: 8px;">
          <i data-lucide="eye" style="width: 16px; height: 16px;"></i> Prontuário & Detalhes
        </button>
      </div>
    `;
  });

  html += `</div>`;
  container.innerHTML = html;
  lucide.createIcons();

  // Binds de visualização do prontuário do pet
  container.querySelectorAll(".btn-view-pet").forEach(btn => {
    btn.addEventListener("click", () => showPetDetails(btn.getAttribute("data-id")));
  });
}

function renderClientsTable(items = clientsList) {
  const container = document.getElementById("clients-list-container");
  if (items.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 40px; color: var(--color-gray-400);">
        <i data-lucide="users" style="width: 48px; height: 48px; margin-bottom: 12px;"></i>
        <p>Nenhum tutor encontrado.</p>
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
            <th>Telefone</th>
            <th>CPF</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
  `;

  items.forEach(client => {
    html += `
      <tr>
        <td><strong>${client.name}</strong></td>
        <td>${client.email || 'N/A'}</td>
        <td>${client.phone || 'N/A'}</td>
        <td>${client.cpf || 'N/A'}</td>
        <td>
          <button class="btn btn-ghost btn-icon btn-edit-client" data-id="${client.id}">
            <i data-lucide="edit-3" style="width: 16px; height: 16px;"></i>
          </button>
        </td>
      </tr>
    `;
  });

  html += `</tbody></table></div>`;
  container.innerHTML = html;
  lucide.createIcons();

  // Vincular eventos de edição de tutor
  container.querySelectorAll(".btn-edit-client").forEach(btn => {
    btn.addEventListener("click", () => openEditClientModal(btn.getAttribute("data-id")));
  });
}

// ==========================================================================
// FORM DIALOGS (CADASTRO)
// ==========================================================================

function openClientModal() {
  showModal("Novo Tutor (Cliente)", `
    <form id="form-modal-client">
      <div class="form-group">
        <label for="c-name">Nome Completo</label>
        <div class="input-wrapper">
          <i data-lucide="user" class="input-icon"></i>
          <input type="text" id="c-name" required placeholder="Nome do Tutor">
        </div>
      </div>
      <div class="form-group">
        <label for="c-email">E-mail</label>
        <div class="input-wrapper">
          <i data-lucide="mail" class="input-icon"></i>
          <input type="email" id="c-email" placeholder="email@exemplo.com">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label for="c-phone">Telefone / WhatsApp</label>
          <div class="input-wrapper">
            <i data-lucide="phone" class="input-icon"></i>
            <input type="tel" id="c-phone" required placeholder="(11) 99999-9999">
          </div>
        </div>
        <div class="form-group">
          <label for="c-cpf">CPF</label>
          <div class="input-wrapper">
            <i data-lucide="file-text" class="input-icon"></i>
            <input type="text" id="c-cpf" placeholder="000.000.000-00">
          </div>
        </div>
      </div>
      <div class="form-group">
        <label for="c-address">Endereço Completo</label>
        <div class="input-wrapper">
          <i data-lucide="map-pin" class="input-icon"></i>
          <input type="text" id="c-address" placeholder="Rua, Número, Bairro, Cidade">
        </div>
      </div>
      <button type="submit" class="btn btn-primary btn-block">Cadastrar Tutor</button>
    </form>
  `);

  document.getElementById("form-modal-client").addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = {
      name: document.getElementById("c-name").value,
      email: document.getElementById("c-email").value,
      phone: document.getElementById("c-phone").value,
      cpf: document.getElementById("c-cpf").value,
      address: document.getElementById("c-address").value
    };

    try {
      await addTenantDoc("clients", data);
      showToast("Tutor cadastrado com sucesso!", "success");
      hideModal();
      await refreshData();
      renderClientsTable();
    } catch (err) {
      showToast("Erro ao salvar cadastro do tutor.", "error");
    }
  });
}

function openPetModal() {
  if (clientsList.length === 0) {
    showToast("Por favor, cadastre pelo menos um tutor antes de cadastrar um pet.", "warning");
    return;
  }
  // Criar dropdown dinâmico com donos cadastrados
  let ownerOptions = `<option value="" disabled selected>Selecione um tutor...</option>`;
  clientsList.forEach(c => {
    ownerOptions += `<option value="${c.id}">${c.name}</option>`;
  });

  showModal("Novo Pet (Animal)", `
    <form id="form-modal-pet">
      <div class="form-row">
        <div class="form-group">
          <label for="p-name">Nome do Pet</label>
          <div class="input-wrapper">
            <i data-lucide="paw-print" class="input-icon"></i>
            <input type="text" id="p-name" required placeholder="Ex: Mel, Thor">
          </div>
        </div>
        <div class="form-group">
          <label for="p-birth">Data de Nascimento</label>
          <div class="input-wrapper">
            <i data-lucide="calendar" class="input-icon"></i>
            <input type="date" id="p-birth" required>
          </div>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label for="p-species">Espécie</label>
          <div class="input-wrapper">
            <i data-lucide="dog" class="input-icon"></i>
            <select id="p-species" required>
              <option value="Cão">Cão (Cachorro)</option>
              <option value="Gato">Gato</option>
              <option value="Ave">Ave</option>
              <option value="Outro">Outro</option>
            </select>
          </div>
        </div>
        <div class="form-group">
          <label for="p-breed">Raça</label>
          <div class="input-wrapper">
            <i data-lucide="hash" class="input-icon"></i>
            <input type="text" id="p-breed" placeholder="Ex: Poodle, Persa, SRD">
          </div>
        </div>
      </div>
      <div class="form-group">
        <label for="p-owner">Tutor Responsável</label>
        <div class="input-wrapper">
          <i data-lucide="users" class="input-icon"></i>
          <select id="p-owner" required>
            ${ownerOptions}
          </select>
        </div>
      </div>
      <div class="form-group">
        <label>Foto do Pet</label>
        <div style="display: flex; gap: 16px; align-items: center; margin-top: 4px;">
          <input type="file" id="p-photo-upload" accept="image/*" class="hidden">
          <button type="button" id="btn-pet-upload" class="btn btn-secondary"><i data-lucide="image"></i> Enviar Foto</button>
          <span id="p-upload-status" style="font-size: 13px; color: var(--color-gray-500);">Nenhuma imagem selecionada.</span>
        </div>
      </div>
      <button type="submit" class="btn btn-primary btn-block">Salvar Cadastro do Pet</button>
    </form>
  `);

  const fileInput = document.getElementById("p-photo-upload");
  const uploadBtn = document.getElementById("btn-pet-upload");
  const statusSpan = document.getElementById("p-upload-status");
  let activePetPhotoUrl = "";

  uploadBtn.addEventListener("click", () => fileInput.click());

  fileInput.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      statusSpan.textContent = "Redimensionando...";
      statusSpan.style.color = "var(--color-gray-500)";
      
      // Padroniza em até 300x300 px
      const base64Data = await resizeImage(file, 300, 300, 0.75);
      activePetPhotoUrl = base64Data;
      
      statusSpan.textContent = "Foto processada!";
      statusSpan.style.color = "var(--color-success)";
    } catch (err) {
      console.error(err);
      statusSpan.textContent = "Erro ao processar.";
      statusSpan.style.color = "var(--color-danger)";
    }
  });

  document.getElementById("form-modal-pet").addEventListener("submit", async (e) => {
    e.preventDefault();
    const clientId = document.getElementById("p-owner").value;
    if (!clientId) {
      showToast("Por favor, selecione um tutor responsável.", "warning");
      return;
    }
    const data = {
      name: document.getElementById("p-name").value,
      birthDate: document.getElementById("p-birth").value,
      species: document.getElementById("p-species").value,
      breed: document.getElementById("p-breed").value,
      clientId: clientId,
      photoUrl: activePetPhotoUrl,
      vaccines: []
    };

    try {
      await addTenantDoc("pets", data);
      showToast("Pet cadastrado com sucesso!", "success");
      hideModal();
      await refreshData();
      renderPetsGrid();
    } catch (err) {
      showToast("Erro ao cadastrar animal.", "error");
    }
  });
}

// ==========================================================================
// PET MEDICAL RECORD VIEW (DETALHES COMPLETOS)
// ==========================================================================

export async function showPetDetails(petId) {
  try {
    const pet = await getTenantDoc("pets", petId);
    const owner = clientsList.find(c => c.id === pet.clientId);
    const photoUrl = pet.photoUrl || "https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&q=80&w=200";
    
    // Buscar registros SOAP e exames deste pet
    const allRecords = await getTenantDocs("records");
    let petRecords = allRecords.filter(r => r.petId === petId);

    // Migração automática de exames legados (da coleção 'records' com campo 'attachments' para 'pets.exams')
    let examsUpdated = false;
    const examsList = pet.exams || [];

    for (const record of petRecords) {
      if (record.attachments && record.attachments.length > 0) {
        for (const attach of record.attachments) {
          const exists = examsList.some(e => e.url === attach.url || e.name === attach.name);
          if (!exists) {
            examsList.push({
              name: attach.name || "Exame Legado",
              url: attach.url,
              type: attach.type || (attach.url.startsWith("data:application/pdf") ? "application/pdf" : "image/jpeg"),
              date: attach.date || record.date || new Date().toISOString()
            });
            examsUpdated = true;
          }
        }

        // Se o prontuário SOAP estiver vazio (só continha anexos), deletamos ele.
        // Se continha anotações, limpamos apenas o campo attachments.
        const hasSoapContent = record.soap && (
          (record.soap.subjective && typeof record.soap.subjective === 'string' && record.soap.subjective.trim() !== "") ||
          (record.soap.objective && typeof record.soap.objective === 'string' && record.soap.objective.trim() !== "") ||
          (record.soap.analysis && typeof record.soap.analysis === 'string' && record.soap.analysis.trim() !== "") ||
          (record.soap.plan && typeof record.soap.plan === 'string' && record.soap.plan.trim() !== "")
        );
        const hasMeds = record.usedItems && record.usedItems.length > 0;

        if (!hasSoapContent && !hasMeds) {
          await deleteTenantDoc("records", record.id);
        } else {
          await updateTenantDoc("records", record.id, { attachments: [] });
        }
        examsUpdated = true;
      }
    }

    if (examsUpdated) {
      pet.exams = examsList;
      await updateTenantDoc("pets", petId, { exams: examsList });
      // Recarregar os registros de prontuários após migração
      const refreshedRecords = await getTenantDocs("records");
      petRecords = refreshedRecords.filter(r => r.petId === petId);
      showToast("Exames antigos migrados para a galeria do Pet!", "info");
    }

    // Gerar URL do QR Code de Vacinas
    const clinicId = getActiveClinicId();
    // Exemplo de URL pública (usará o host atual ou localhost em dev)
    const publicUrl = `${window.location.origin}/public-pet.html?clinicId=${clinicId}&petId=${petId}`;
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(publicUrl)}`;

    const detailsHTML = `
      <div style="display: grid; grid-template-columns: 1fr 2fr; gap: 24px; max-height: 75vh; text-align: left;">
        
        <!-- Coluna da Esquerda: Ficha Rápida e QR Code -->
        <div style="border-right: 1px solid var(--color-gray-200); padding-right: 20px; display: flex; flex-direction: column; gap: 20px;">
          <div style="text-align: center;">
            <img src="${photoUrl}" alt="${pet.name}" style="width: 100px; height: 100px; border-radius: var(--radius-lg); object-fit: cover; margin: 0 auto 12px; border: 3px solid var(--brand-primary-light);">
            <h3 style="font-size: 20px; font-weight: 700;">${pet.name}</h3>
            <span class="status-badge status-badge-success" style="margin-top: 4px;">${pet.species} • ${pet.breed}</span>
            <div style="display: flex; gap: 8px; justify-content: center; margin-top: 12px;">
              <button id="btn-edit-pet" class="btn btn-secondary" style="padding: 4px 8px; font-size: 11px; height: auto;">
                <i data-lucide="edit-3" style="width: 12px; height: 12px;"></i> Editar
              </button>
              <button id="btn-delete-pet" class="btn btn-danger" style="padding: 4px 8px; font-size: 11px; height: auto;">
                <i data-lucide="trash-2" style="width: 12px; height: 12px;"></i> Excluir
              </button>
            </div>
          </div>

          <div style="background: var(--color-gray-50); padding: 14px; border-radius: var(--radius-md); font-size: 13px; line-height: 1.5;">
            <p><strong>Nascimento:</strong> ${formatDate(pet.birthDate)}</p>
            <p><strong>Idade:</strong> ${calculateAge(pet.birthDate)}</p>
            <p><strong>Tutor:</strong> ${owner ? owner.name : 'N/A'}</p>
            <p><strong>Contato:</strong> ${owner ? owner.phone : 'N/A'}</p>
          </div>

          <!-- QR Code Carteirinha Digital -->
          <div style="text-align: center; background: var(--color-gray-50); padding: 14px; border-radius: var(--radius-md);">
            <h4 style="font-size: 12px; font-weight: 700; margin-bottom: 8px;">Carteirinha de Vacina Digital</h4>
            <img src="${qrCodeUrl}" alt="QR Code Vacinas" style="width: 120px; height: 120px; margin: 0 auto 8px; border: 1px solid var(--color-gray-200);">
            <a href="${publicUrl}" target="_blank" class="btn btn-ghost" style="font-size: 11px; padding: 4px 8px; height: auto;"><i data-lucide="external-link" style="width: 12px; height: 12px;"></i> Visualizar Link</a>
          </div>
        </div>

        <!-- Coluna da Direita: Timeline de Prontuários e Vacinas -->
        <div style="overflow-y: auto; padding-right: 8px; display: flex; flex-direction: column; gap: 20px;">
          
          <!-- Seção de Ações Clínicas -->
          <div style="display: flex; gap: 12px;">
            <button id="btn-add-soap" class="btn btn-primary" style="flex: 1;"><i data-lucide="stethoscope"></i> Novo Prontuário (SOAP)</button>
            <button id="btn-add-vaccine-modal" class="btn btn-secondary" style="flex: 1;"><i data-lucide="shield-plus"></i> Aplicar Vacina</button>
          </div>

          <!-- Abas internas de Histórico e Galeria -->
          <div style="border-bottom: 1px solid var(--color-gray-200); display: flex; gap: 16px;">
            <button id="tab-det-timeline" class="btn btn-ghost active" style="border-bottom: 2px solid var(--brand-primary); border-radius: 0; padding: 8px 16px;">Linha do Tempo</button>
            <button id="tab-det-gallery" class="btn btn-ghost" style="border-radius: 0; padding: 8px 16px;">Galeria de Exames</button>
          </div>

          <!-- Painel Linha do Tempo -->
          <div id="det-panel-timeline">
            <!-- Vacinas Aplicadas / Agendadas -->
            <div style="margin-bottom: 20px;">
              <h4 style="font-size: 14px; font-weight: 700; color: var(--color-gray-600); margin-bottom: 10px;">Status de Vacinas</h4>
              <div id="pet-vaccines-list" style="display: flex; flex-wrap: wrap; gap: 8px;">
                <!-- Lista de Chips de vacina -->
              </div>
            </div>

            <!-- Timeline SOAP -->
            <h4 style="font-size: 14px; font-weight: 700; color: var(--color-gray-600); margin-bottom: 8px;">Histórico Clínico</h4>
            <div class="timeline" id="pet-records-timeline">
              <!-- Prontuários Injetados -->
            </div>
          </div>

          <!-- Painel Galeria de Exames -->
          <div id="det-panel-gallery" class="hidden">
            <div style="margin-bottom: 16px; border: 1px dashed var(--color-gray-300); padding: 14px; border-radius: var(--radius-md); text-align: center;">
              <input type="file" id="exam-file-upload" accept="image/*,application/pdf" class="hidden">
              <button type="button" id="btn-trigger-exam-upload" class="btn btn-secondary btn-block"><i data-lucide="upload"></i> Subir PDF / Foto de Exame</button>
            </div>
            <div id="exams-grid" style="display: flex; flex-direction: column; gap: 12px;">
              <!-- Cards de arquivos anexos -->
            </div>
          </div>

        </div>

      </div>
    `;

    showModal(`Ficha do Pet: ${pet.name}`, detailsHTML);
    
    // Renderizações Internas
    renderPetVaccines(pet);
    renderTimeline(petRecords);
    renderExamsGallery(pet);

    // Eventos de Ações Rápidas do Pet
    document.getElementById("btn-edit-pet").onclick = () => openEditPetModal(petId, pet);
    document.getElementById("btn-delete-pet").onclick = () => handleDeletePet(petId, pet.name);

    // Eventos do Prontuário SOAP
    document.getElementById("btn-add-soap").onclick = () => {
      hideModal();
      openSoapRecordModal(petId, pet.name);
    };

    // Eventos da Galeria de Exames / Upload
    document.getElementById("btn-trigger-exam-upload").onclick = () => document.getElementById("exam-file-upload").click();
    document.getElementById("exam-file-upload").onchange = (e) => handleExamUpload(e, petId);

    // Eventos de Aplicar Vacina
    document.getElementById("btn-add-vaccine-modal").onclick = () => openAddVaccineForm(petId, pet);

    // Toggle de Abas Internas
    const tabTime = document.getElementById("tab-det-timeline");
    const tabGall = document.getElementById("tab-det-gallery");
    const panelTime = document.getElementById("det-panel-timeline");
    const panelGall = document.getElementById("det-panel-gallery");

    tabTime.onclick = () => {
      tabTime.classList.add("active");
      tabTime.style.borderBottom = "2px solid var(--brand-primary)";
      tabGall.classList.remove("active");
      tabGall.style.borderBottom = "none";
      panelTime.classList.remove("hidden");
      panelGall.classList.add("hidden");
    };

    tabGall.onclick = () => {
      tabGall.classList.add("active");
      tabGall.style.borderBottom = "2px solid var(--brand-primary)";
      tabTime.classList.remove("active");
      tabTime.style.borderBottom = "none";
      panelGall.classList.remove("hidden");
      panelTime.classList.add("hidden");
    };

  } catch (err) {
    console.error(err);
    showToast("Erro ao abrir ficha do pet.", "error");
  }
}

/**
 * Renderiza os chips com vacinas aplicadas e alertas.
 */
function renderPetVaccines(pet) {
  const container = document.getElementById("pet-vaccines-list");
  if (!pet.vaccines || pet.vaccines.length === 0) {
    container.innerHTML = `<span style="font-size: 13px; color: var(--color-gray-400);">Nenhuma vacina registrada.</span>`;
    return;
  }

  let html = "";
  const now = new Date();
  
  pet.vaccines.forEach(vac => {
    const expDate = new Date(vac.dateExpiration);
    let badgeClass = "status-badge-success";
    let statusText = "Em dia";
    
    if (expDate < now) {
      badgeClass = "status-badge-danger";
      statusText = "Vencida";
    }

    html += `
      <div style="border: 1px solid var(--color-gray-200); padding: 8px 12px; border-radius: var(--radius-md); background: var(--color-white); display: flex; flex-direction: column; gap: 4px;">
        <span style="font-size: 13px; font-weight: 600;">${vac.name}</span>
        <span class="status-badge ${badgeClass}" style="font-size: 9px; align-self: flex-start; padding: 2px 6px;">
          ${statusText} (Exp: ${formatDate(vac.dateExpiration)})
        </span>
      </div>
    `;
  });

  container.innerHTML = html;
}

/**
 * Renderiza a linha do tempo de consultas e anotações SOAP.
 */
/**
 * Renderiza a linha do tempo de consultas e anotações SOAP (última detalhada e anteriores simplificadas).
 */
function renderTimeline(records) {
  const timeline = document.getElementById("pet-records-timeline");
  if (records.length === 0) {
    timeline.innerHTML = `<p style="font-size: 13px; color: var(--color-gray-400); margin-left: -32px;">Nenhum histórico clínico cadastrado.</p>`;
    return;
  }

  // Ordenar decrescente por data
  records.sort((a, b) => new Date(b.date) - new Date(a.date));

  // Último atendimento (mais recente)
  const latestRecord = records[0];
  const otherRecords = records.slice(1);

  let html = `
    <!-- ÚLTIMO ATENDIMENTO -->
    <div style="background: var(--brand-primary-light); border: 1px solid var(--brand-primary); padding: 16px; border-radius: var(--radius-md); margin-bottom: 20px; text-align: left;">
      <h5 style="font-size: 14px; font-weight: 700; color: var(--brand-primary); margin-bottom: 12px; display: flex; align-items: center; gap: 6px;">
        <i data-lucide="stethoscope"></i> Último Atendimento (${formatDate(latestRecord.date)})
      </h5>
      <div class="soap-grid" style="font-size: 13px; line-height: 1.6; color: var(--color-gray-700); display: flex; flex-direction: column; gap: 8px;">
        <div><strong>S - Subjetivo:</strong> ${latestRecord.soap.subjective || '-'}</div>
        <div><strong>O - Objetivo:</strong> ${latestRecord.soap.objective || '-'}</div>
        <div><strong>A - Análise:</strong> ${latestRecord.soap.analysis || '-'}</div>
        <div><strong>P - Plano:</strong> ${latestRecord.soap.plan || '-'}</div>
        ${latestRecord.usedItems && latestRecord.usedItems.length > 0 ? `
          <div style="margin-top: 8px; border-top: 1px dashed var(--brand-primary); padding-top: 8px;">
            <strong>Medicamentos Utilizados:</strong>
            <ul style="margin: 4px 0 0 16px; padding: 0;">
              ${latestRecord.usedItems.map(item => `<li>${item.name} (${item.quantity} ${item.unit || 'unid'})</li>`).join('')}
            </ul>
          </div>
        ` : ''}
      </div>
      <button class="btn btn-ghost btn-view-single-record" data-id="${latestRecord.id}" style="font-size: 11px; padding: 4px 8px; height: auto; margin-top: 12px; display: flex; align-items: center; gap: 4px;">
        <i data-lucide="eye" style="width: 12px; height: 12px;"></i> Visualizar Detalhes
      </button>
    </div>
  `;

  // OUTRAS CONSULTAS
  if (otherRecords.length > 0) {
    html += `
      <h5 style="font-size: 13px; font-weight: 700; color: var(--color-gray-500); margin-bottom: 10px; margin-top: 16px;">Consultas Anteriores</h5>
      <div style="display: flex; flex-direction: column; gap: 8px;">
    `;

    otherRecords.forEach(rec => {
      html += `
        <div style="background: var(--color-gray-50); border: 1px solid var(--color-gray-200); padding: 10px 14px; border-radius: var(--radius-md); display: flex; justify-content: space-between; align-items: center; text-align: left;">
          <span style="font-size: 13px; font-weight: 600; color: var(--color-gray-700);">Consulta em ${formatDate(rec.date)}</span>
          <button class="btn btn-ghost btn-view-single-record" data-id="${rec.id}" style="font-size: 11px; padding: 4px 8px; height: auto; display: flex; align-items: center; gap: 4px;">
            <i data-lucide="eye" style="width: 12px; height: 12px;"></i> Visualizar
          </button>
        </div>
      `;
    });

    html += `</div>`;
  }

  timeline.innerHTML = html;
  lucide.createIcons();

  // Binds para visualizar consulta
  timeline.querySelectorAll(".btn-view-single-record").forEach(btn => {
    btn.onclick = () => {
      const recId = btn.getAttribute("data-id");
      const record = records.find(r => r.id === recId);
      if (record) {
        openViewRecordModalDirectly(record);
      }
    };
  });
}

/**
 * Abre o modal com os dados completos de uma consulta de forma amigável.
 */
function openViewRecordModalDirectly(record) {
  const modalHTML = `
    <div style="text-align: left; font-size: 14px; line-height: 1.6; display: flex; flex-direction: column; gap: 16px;">
      <p style="font-size: 13px; color: var(--color-gray-500); margin-bottom: 0;">Consulta realizada em <strong>${formatDate(record.date)}</strong></p>
      
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

/**
 * Renderiza a aba de exames laboratoriais anexados (exames gravados diretamente no Pet).
 */
function renderExamsGallery(pet) {
  const grid = document.getElementById("exams-grid");
  const exams = pet.exams || [];

  if (exams.length === 0) {
    grid.innerHTML = `
      <div style="text-align: center; padding: 24px; color: var(--color-gray-400); font-size: 13px; width: 100%;">
        Nenhum exame anexado.
      </div>
    `;
    return;
  }

  let html = "";
  exams.forEach((file, index) => {
    const isPdf = file.url.includes(".pdf") || file.name.endsWith(".pdf");
    const icon = isPdf ? "file-text" : "image";
    
    html += `
      <div style="background: var(--color-gray-50); border: 1px solid var(--color-gray-200); padding: 12px; border-radius: var(--radius-md); display: flex; align-items: center; gap: 12px; width: 100%;">
        <i data-lucide="${icon}" style="width: 28px; height: 28px; color: var(--brand-primary); flex-shrink: 0;"></i>
        <div style="min-width: 0; flex: 1;">
          <h5 style="font-size: 12px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${file.name}</h5>
          <span style="font-size: 10px; color: var(--color-gray-400);">${formatDate(file.date)}</span>
        </div>
        <div style="display: flex; gap: 4px; flex-shrink: 0;">
          <button type="button" class="btn btn-ghost btn-icon btn-view-exam" data-index="${index}" style="width: 32px; height: 32px; padding: 0;" title="Visualizar/Baixar Exame">
            <i data-lucide="download" style="width: 14px; height: 14px;"></i>
          </button>
          <button type="button" class="btn btn-ghost btn-icon btn-delete-exam" data-index="${index}" style="width: 32px; height: 32px; padding: 0; color: var(--color-danger);" title="Excluir Exame">
            <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i>
          </button>
        </div>
      </div>
    `;
  });

  grid.innerHTML = html;
  lucide.createIcons();

  // Binds de visualização/download do exame
  grid.querySelectorAll(".btn-view-exam").forEach(btn => {
    btn.onclick = () => {
      const idx = parseInt(btn.getAttribute("data-index"));
      const exam = exams[idx];
      if (exam) {
        openOrDownloadFile(exam.url, exam.name);
      }
    };
  });

  // Binds de exclusão de exame
  grid.querySelectorAll(".btn-delete-exam").forEach(btn => {
    btn.onclick = async () => {
      const idx = parseInt(btn.getAttribute("data-index"));
      if (confirm(`Tem certeza de que deseja excluir este exame?`)) {
        try {
          const updatedExams = [...exams];
          updatedExams.splice(idx, 1);
          await updateTenantDoc("pets", pet.id, { exams: updatedExams });
          showToast("Exame excluído com sucesso!", "success");
          hideModal();
          setTimeout(() => showPetDetails(pet.id), 200);
        } catch (e) {
          showToast("Erro ao excluir exame.", "error");
        }
      }
    };
  });
}

/**
 * Realiza upload do arquivo de exame laboratorial e o anexa diretamente no array 'exams' do documento do Pet no Firestore.
 */
async function handleExamUpload(e, petId) {
  const file = e.target.files[0];
  if (!file) return;

  try {
    let base64Data = "";
    
    if (file.type.startsWith("image/")) {
      showToast("Redimensionando imagem do exame...", "info");
      // Padroniza em até 800x800 px para manter legibilidade de laudos
      base64Data = await resizeImage(file, 800, 800, 0.7);
    } else {
      if (file.size > 800 * 1024) {
        showToast("PDF muito grande! Escolha um arquivo de até 800KB.", "error");
        return;
      }
      showToast("Processando documento...", "info");
      base64Data = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (ev) => resolve(ev.target.result);
        reader.onerror = () => reject(new Error("Erro ao ler arquivo."));
        reader.readAsDataURL(file);
      });
    }

    // Buscar o pet para ler a lista de exames atual
    const pet = await getTenantDoc("pets", petId);
    if (!pet) {
      showToast("Pet não encontrado para anexar exame.", "error");
      return;
    }

    const newExam = {
      name: file.name,
      url: base64Data,
      type: file.type,
      date: new Date().toISOString()
    };

    const examsList = pet.exams || [];
    examsList.push(newExam);

    // Salvar o array de exames diretamente no documento do Pet
    await updateTenantDoc("pets", petId, { exams: examsList });
    showToast("Exame anexado com sucesso!", "success");
    hideModal();
    // Reabrir o modal para atualizar a visualização
    setTimeout(() => showPetDetails(petId), 200);

  } catch (err) {
    console.error(err);
    showToast("Erro ao anexar arquivo de exame.", "error");
  }
}

/**
 * Exibe o formulário de aplicação de vacinas para o Pet.
 */
async function openAddVaccineForm(petId, pet) {
  try {
    const inventory = await getTenantDocs("inventory");
    const vaccinesInStock = inventory.filter(item => item.name.toLowerCase().includes("vacina"));
    
    if (vaccinesInStock.length === 0) {
      showToast("Nenhuma vacina cadastrada no estoque. Cadastre um item com 'Vacina' no nome em 'Estoque' primeiro.", "warning");
      return;
    }

    let selectOptions = `<option value="" disabled selected>Selecione uma vacina do estoque...</option>`;
    vaccinesInStock.forEach(vac => {
      selectOptions += `<option value="${vac.id}" data-qty="${vac.quantity}" data-price="${vac.salePrice || 0}">${vac.name} (Qtd: ${vac.quantity} ${vac.unit || 'unid'})</option>`;
    });

    showModal("Aplicar Nova Vacina", `
      <form id="form-modal-vaccine">
        <div class="form-group">
          <label for="vac-select">Vacina em Estoque</label>
          <div class="input-wrapper">
            <i data-lucide="shield" class="input-icon"></i>
            <select id="vac-select" required style="width: 100%; height: 38px; border-radius: var(--radius-md); border: 1px solid var(--color-gray-200); padding: 0 12px 0 42px;">
              ${selectOptions}
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label for="vac-admin">Data de Aplicação</label>
            <div class="input-wrapper">
              <i data-lucide="calendar" class="input-icon"></i>
              <input type="date" id="vac-admin" required value="${new Date().toISOString().split('T')[0]}">
            </div>
          </div>
          <div class="form-group">
            <label for="vac-exp">Data de Vencimento</label>
            <div class="input-wrapper">
              <i data-lucide="calendar" class="input-icon"></i>
              <input type="date" id="vac-exp" required>
            </div>
          </div>
        </div>
        <button type="submit" class="btn btn-primary btn-block">Registrar Vacinação</button>
      </form>
    `);

    lucide.createIcons();

    document.getElementById("form-modal-vaccine").addEventListener("submit", async (e) => {
      e.preventDefault();
      
      const selectVac = document.getElementById("vac-select");
      const selectedOption = selectVac.options[selectVac.selectedIndex];
      const itemId = selectVac.value;
      const currentQty = parseFloat(selectedOption.getAttribute("data-qty") || 0);
      const salePrice = parseFloat(selectedOption.getAttribute("data-price") || 0);
      const vacName = selectedOption.text.split(" (Qtd:")[0];

      if (currentQty <= 0) {
        showToast(`A vacina ${vacName} está esgotada no estoque!`, "warning");
        return;
      }

      const newVaccine = {
        name: vacName,
        dateAdministered: document.getElementById("vac-admin").value,
        dateExpiration: document.getElementById("vac-exp").value,
        status: "applied"
      };

      const currentVaccines = pet.vaccines || [];
      currentVaccines.push(newVaccine);

      try {
        // 1. Reduzir estoque da vacina em 1 unidade
        await updateTenantDoc("inventory", itemId, {
          quantity: currentQty - 1
        });

        // 2. Registrar Receita no Fluxo de Caixa se preço de venda > 0
        if (salePrice > 0) {
          await addTenantDoc("finance", {
            type: "income",
            description: `Aplicação de vacina: ${vacName} no pet ${pet.name}`,
            amount: salePrice,
            date: document.getElementById("vac-admin").value || new Date().toISOString().split('T')[0],
            category: "Medicamentos"
          });
        }

        // 3. Atualizar documento principal do Pet
        await updateTenantDoc("pets", petId, {
          vaccines: currentVaccines
        });

        // 4. Atualizar o Perfil de Vacinas Público (para leitura livre do QR Code)
        await setTenantDoc("pets", `${petId}/publicProfile/vaccines`, {
          petName: pet.name,
          species: pet.species,
          breed: pet.breed,
          photoUrl: pet.photoUrl || "",
          vaccines: currentVaccines
        });

        showToast("Vacinação registrada e estoque atualizado!", "success");
        hideModal();
        // Reabrir a ficha do pet atualizada
        setTimeout(() => showPetDetails(petId), 200);
        
      } catch (err) {
        console.error(err);
        showToast("Erro ao registrar vacina.", "error");
      }
    });
  } catch (err) {
    console.error(err);
    showToast("Erro ao processar formulário de vacinas.", "error");
  }
}

// ==========================================================================
// HELPERS
// ==========================================================================

function calculateAge(birthDateStr) {
  if (!birthDateStr) return "N/A";
  const birthDate = new Date(birthDateStr);
  const now = new Date();
  
  let years = now.getFullYear() - birthDate.getFullYear();
  let months = now.getMonth() - birthDate.getMonth();
  
  if (months < 0 || (months === 0 && now.getDate() < birthDate.getDate())) {
    years--;
    months += 12;
  }

  if (years > 0) {
    return `${years} ano(s) ${months > 0 ? `e ${months} mês(es)` : ''}`;
  }
  return `${months} mês(es)`;
}

function formatDate(dateStr) {
  if (!dateStr) return "N/A";
  const d = new Date(dateStr);
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

function openEditClientModal(clientId) {
  const client = clientsList.find(c => c.id === clientId);
  if (!client) return;

  showModal("Editar Tutor (Cliente)", `
    <form id="form-modal-edit-client">
      <div class="form-group">
        <label for="ec-name">Nome Completo</label>
        <div class="input-wrapper">
          <i data-lucide="user" class="input-icon"></i>
          <input type="text" id="ec-name" required value="${escapeHTML(client.name)}" placeholder="Nome do Tutor">
        </div>
      </div>
      <div class="form-group">
        <label for="ec-email">E-mail</label>
        <div class="input-wrapper">
          <i data-lucide="mail" class="input-icon"></i>
          <input type="email" id="ec-email" value="${escapeHTML(client.email || '')}" placeholder="email@exemplo.com">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label for="ec-phone">Telefone / WhatsApp</label>
          <div class="input-wrapper">
            <i data-lucide="phone" class="input-icon"></i>
            <input type="tel" id="ec-phone" required value="${escapeHTML(client.phone)}" placeholder="(11) 99999-9999">
          </div>
        </div>
        <div class="form-group">
          <label for="ec-cpf">CPF</label>
          <div class="input-wrapper">
            <i data-lucide="file-text" class="input-icon"></i>
            <input type="text" id="ec-cpf" value="${escapeHTML(client.cpf || '')}" placeholder="000.000.000-00">
          </div>
        </div>
      </div>
      <div class="form-group">
        <label for="ec-address">Endereço Completo</label>
        <div class="input-wrapper">
          <i data-lucide="map-pin" class="input-icon"></i>
          <input type="text" id="ec-address" value="${escapeHTML(client.address || '')}" placeholder="Rua, Número, Bairro, Cidade">
        </div>
      </div>
      
      <div style="display: flex; gap: 12px; margin-top: 10px;">
        <button type="button" id="btn-delete-client" class="btn btn-danger" style="flex: 1;">Excluir Tutor</button>
        <button type="submit" class="btn btn-primary" style="flex: 2;">Salvar Alterações</button>
      </div>
    </form>
  `);

  lucide.createIcons();

  document.getElementById("form-modal-edit-client").addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = {
      name: document.getElementById("ec-name").value,
      email: document.getElementById("ec-email").value,
      phone: document.getElementById("ec-phone").value,
      cpf: document.getElementById("ec-cpf").value,
      address: document.getElementById("ec-address").value
    };

    try {
      await updateTenantDoc("clients", clientId, data);
      showToast("Cadastro do tutor atualizado!", "success");
      hideModal();
      await refreshData();
      renderClientsTable();
    } catch (err) {
      showToast("Erro ao atualizar cadastro.", "error");
    }
  });

  document.getElementById("btn-delete-client").addEventListener("click", async () => {
    const tutorPets = petsList.filter(p => p.clientId === clientId);
    if (tutorPets.length > 0) {
      showToast(`Não é possível excluir o tutor ${client.name} porque ele possui pets vinculados (${tutorPets.map(p => p.name).join(", ")}). Exclua ou transfira os pets primeiro.`, "error");
      return;
    }

    if (confirm(`Tem certeza que deseja excluir o tutor ${client.name}?`)) {
      try {
        await deleteTenantDoc("clients", clientId);
        showToast("Tutor excluído com sucesso!", "success");
        hideModal();
        await refreshData();
        renderClientsTable();
      } catch (err) {
        showToast("Erro ao excluir tutor.", "error");
      }
    }
  });
}

function openEditPetModal(petId, pet) {
  let ownerOptions = `<option value="" disabled>Selecione um tutor...</option>`;
  clientsList.forEach(c => {
    ownerOptions += `<option value="${c.id}" ${c.id === pet.clientId ? 'selected' : ''}>${c.name}</option>`;
  });

  showModal("Editar Pet", `
    <form id="form-modal-edit-pet">
      <div class="form-row">
        <div class="form-group">
          <label for="ep-name">Nome do Pet</label>
          <div class="input-wrapper">
            <i data-lucide="paw-print" class="input-icon"></i>
            <input type="text" id="ep-name" required value="${escapeHTML(pet.name)}" placeholder="Ex: Rex">
          </div>
        </div>
        <div class="form-group">
          <label for="ep-birth">Data de Nascimento</label>
          <div class="input-wrapper">
            <i data-lucide="calendar" class="input-icon"></i>
            <input type="date" id="ep-birth" required value="${pet.birthDate}">
          </div>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label for="ep-species">Espécie</label>
          <div class="input-wrapper">
            <i data-lucide="dog" class="input-icon"></i>
            <select id="ep-species" required>
              <option value="Cão" ${pet.species === 'Cão' ? 'selected' : ''}>Cão (Cachorro)</option>
              <option value="Gato" ${pet.species === 'Gato' ? 'selected' : ''}>Gato</option>
              <option value="Ave" ${pet.species === 'Ave' ? 'selected' : ''}>Ave</option>
              <option value="Outro" ${pet.species === 'Outro' ? 'selected' : ''}>Outro</option>
            </select>
          </div>
        </div>
        <div class="form-group">
          <label for="ep-breed">Raça</label>
          <div class="input-wrapper">
            <i data-lucide="hash" class="input-icon"></i>
            <input type="text" id="ep-breed" value="${escapeHTML(pet.breed || '')}" placeholder="Ex: Poodle, Persa, SRD">
          </div>
        </div>
      </div>
      <div class="form-group">
        <label for="ep-owner">Tutor Responsável</label>
        <div class="input-wrapper">
          <i data-lucide="users" class="input-icon"></i>
          <select id="ep-owner" required>
            ${ownerOptions}
          </select>
        </div>
      </div>
      <div class="form-group">
        <label>Foto do Pet</label>
        <div style="display: flex; gap: 16px; align-items: center; margin-top: 4px;">
          <input type="file" id="ep-photo-upload" accept="image/*" class="hidden">
          <button type="button" id="btn-ep-upload" class="btn btn-secondary"><i data-lucide="image"></i> Alterar Foto</button>
          <span id="ep-upload-status" style="font-size: 13px; color: var(--color-gray-500);">Manter foto atual.</span>
        </div>
      </div>
      <button type="submit" class="btn btn-primary btn-block">Salvar Alterações</button>
    </form>
  `);

  lucide.createIcons();

  const fileInput = document.getElementById("ep-photo-upload");
  const uploadBtn = document.getElementById("btn-ep-upload");
  const statusSpan = document.getElementById("ep-upload-status");
  let activePetPhotoUrl = pet.photoUrl || "";

  uploadBtn.addEventListener("click", () => fileInput.click());

  fileInput.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      statusSpan.textContent = "Redimensionando...";
      statusSpan.style.color = "var(--color-gray-500)";
      
      const base64Data = await resizeImage(file, 300, 300, 0.75);
      activePetPhotoUrl = base64Data;
      
      statusSpan.textContent = "Nova foto processada!";
      statusSpan.style.color = "var(--color-success)";
    } catch (err) {
      console.error(err);
      statusSpan.textContent = "Erro ao processar.";
      statusSpan.style.color = "var(--color-danger)";
    }
  });

  document.getElementById("form-modal-edit-pet").addEventListener("submit", async (e) => {
    e.preventDefault();
    const clientId = document.getElementById("ep-owner").value;
    if (!clientId) {
      showToast("Por favor, selecione um tutor responsável.", "warning");
      return;
    }
    const data = {
      name: document.getElementById("ep-name").value,
      birthDate: document.getElementById("ep-birth").value,
      species: document.getElementById("ep-species").value,
      breed: document.getElementById("ep-breed").value,
      clientId: clientId,
      photoUrl: activePetPhotoUrl
    };

    try {
      await updateTenantDoc("pets", petId, data);
      showToast("Cadastro do pet atualizado!", "success");
      hideModal();
      await refreshData();
      renderPetsGrid();
    } catch (err) {
      showToast("Erro ao salvar alterações do pet.", "error");
    }
  });
}

async function handleDeletePet(petId, petName) {
  if (confirm(`ATENÇÃO! Tem certeza que deseja excluir o pet ${petName}? Todos os prontuários e histórico de vacinas dele serão perdidos definitivamente.`)) {
    try {
      await deleteTenantDoc("pets", petId);
      showToast("Pet excluído com sucesso!", "success");
      hideModal();
      await refreshData();
      renderPetsGrid();
    } catch (err) {
      showToast("Erro ao excluir pet.", "error");
    }
  }
}

/**
 * Converte uma string codificada em Base64 para um objeto Blob.
 */
function base64ToBlob(base64, type = "application/pdf") {
  const parts = base64.split(";base64,");
  const contentType = parts[0].split(":")[1] || type;
  const raw = window.atob(parts[1] || parts[0]);
  const rawLength = raw.length;
  const uInt8Array = new Uint8Array(rawLength);

  for (let i = 0; i < rawLength; ++i) {
    uInt8Array[i] = raw.charCodeAt(i);
  }

  return new Blob([uInt8Array], { type: contentType });
}

/**
 * Abre o arquivo Base64 em uma nova aba usando Object URL (Blob) ou força o download.
 */
function openOrDownloadFile(fileUrl, fileName) {
  try {
    const isPdf = fileUrl.includes("application/pdf") || fileName.endsWith(".pdf");
    const blob = base64ToBlob(fileUrl, isPdf ? "application/pdf" : "image/jpeg");
    const blobUrl = URL.createObjectURL(blob);
    
    if (isPdf) {
      const newWindow = window.open(blobUrl, "_blank");
      if (!newWindow) {
        // Se popups forem bloqueados, força download
        const link = document.createElement("a");
        link.href = blobUrl;
        link.download = fileName;
        link.click();
      }
    } else {
      // Força download para imagens/outros
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = fileName;
      link.click();
    }
  } catch (e) {
    console.error("Erro ao abrir/baixar arquivo:", e);
    // Fallback: abre direto em nova janela
    window.open(fileUrl, "_blank");
  }
}
