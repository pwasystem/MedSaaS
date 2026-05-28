// ==========================================================================
// CLINIC ONBOARDING & CONFIGURATION MANAGEMENT
// ==========================================================================

import { getClinicConfig, updateClinicConfig, getActiveClinicId } from "./db.js";
import { showToast, resizeImage } from "./utils.js";
import { generateDemoData, clearClinicData } from "./demo-data.js";

/**
 * Renderiza a interface de configurações na casca SPA.
 */
export function renderSettings(container) {
  container.innerHTML = `
    <div class="card fade-in">
      <div class="card-header">
        <h3 class="card-title"><i data-lucide="settings"></i> Configurações e Identidade Visual</h3>
      </div>
      
      <form id="form-settings" class="fade-in">
        <div class="form-row">
          <!-- Nome e Configuração Geral -->
          <div style="flex: 1.5; display: flex; flex-direction: column; gap: 20px;">
            <div class="form-group">
              <label for="cfg-clinic-name">Nome da Clínica</label>
              <div class="input-wrapper">
                <i data-lucide="building" class="input-icon"></i>
                <input type="text" id="cfg-clinic-name" required placeholder="Nome corporativo">
              </div>
            </div>
            <div class="form-group">
              <label for="cfg-consultation-price">Valor Padrão da Consulta (R$)</label>
              <div class="input-wrapper">
                <i data-lucide="dollar-sign" class="input-icon"></i>
                <input type="number" id="cfg-consultation-price" required step="0.01" min="0" placeholder="Ex: 150.00" style="padding-left: 42px;">
              </div>
            </div>
          </div>

          <!-- Upload de Logo e Customização Visual -->
          <div style="flex: 1; display: flex; flex-direction: column; gap: 16px; align-items: center; border-left: 1px solid var(--color-gray-200); padding-left: 24px;">
            <label style="font-size: 13px; font-weight: 600; color: var(--color-gray-700); align-self: flex-start;">Logo da Clínica</label>
            <div class="logo-preview-box" style="width: 120px; height: 120px; border-radius: var(--radius-lg); border: 2px dashed var(--color-gray-300); display: flex; align-items: center; justify-content: center; overflow: hidden; background: var(--color-gray-50); position: relative;">
              <img id="cfg-logo-preview" src="" alt="Preview Logo" class="hidden" style="width: 100%; height: 100%; object-fit: cover;">
              <i id="cfg-logo-placeholder" data-lucide="image" style="width: 32px; height: 32px; color: var(--color-gray-400);"></i>
            </div>
            <input type="file" id="cfg-logo-upload" accept="image/*" class="hidden">
            <button type="button" id="btn-trigger-upload" class="btn btn-secondary btn-block">
              <i data-lucide="upload-cloud"></i> Selecionar Logo
            </button>

            <!-- Seletores de Cores da Marca -->
            <div style="width: 100%; margin-top: 10px;">
              <label style="font-size: 13px; font-weight: 600; color: var(--color-gray-700); display: block; margin-bottom: 8px;">Paleta de Cores (Marca)</label>
              <div style="display: flex; gap: 16px; justify-content: space-around;">
                <div class="form-group" style="align-items: center; margin-bottom: 0;">
                  <label for="cfg-color-primary" style="font-size: 11px;">Cor Primária</label>
                  <input type="color" id="cfg-color-primary" style="border: none; width: 44px; height: 44px; padding: 0; cursor: pointer; border-radius: 50%; overflow: hidden; background: none;">
                </div>
                <div class="form-group" style="align-items: center; margin-bottom: 0;">
                  <label for="cfg-color-secondary" style="font-size: 11px;">Cor Secundária</label>
                  <input type="color" id="cfg-color-secondary" style="border: none; width: 44px; height: 44px; padding: 0; cursor: pointer; border-radius: 50%; overflow: hidden; background: none;">
                </div>
                <div class="form-group" style="align-items: center; margin-bottom: 0;">
                  <label for="cfg-color-background" style="font-size: 11px;">Cor de Fundo</label>
                  <input type="color" id="cfg-color-background" style="border: none; width: 44px; height: 44px; padding: 0; cursor: pointer; border-radius: 50%; overflow: hidden; background: none;">
                </div>
              </div>
            </div>
          </div>
        </div>

        <div style="margin-top: 32px; display: flex; justify-content: flex-end;">
          <button type="submit" class="btn btn-primary" style="min-width: 150px;">
            <i data-lucide="save"></i> Salvar Alterações
          </button>
        </div>
      </form>
    </div>

    <!-- SEÇÃO DE DADOS DE EXEMPLO (DEMO) -->
    <div id="demo-data-card" class="card fade-in" style="border: 1px dashed var(--brand-primary); background: var(--brand-primary-light); margin-top: 24px;">
      <div class="card-header" style="border-bottom: 1px dashed var(--brand-primary);">
        <h3 class="card-title" style="color: var(--brand-primary);"><i data-lucide="database"></i> Ambiente de Demonstração (Dados de Exemplo)</h3>
      </div>
      <div style="margin-top: 16px; font-size: 14px; line-height: 1.6; color: var(--color-gray-700);">
        <p style="margin-bottom: 16px;">
          Use os botões abaixo para popular o VetSaaS com dados fictícios para experimentação ou para realizar uma limpeza completa de todos os dados cadastrados (reset de banco).
        </p>
        <div style="display: flex; gap: 12px; flex-wrap: wrap;">
          <button type="button" id="btn-generate-demo" class="btn btn-primary" style="background-color: var(--brand-primary); border-color: var(--brand-primary);">
            <i data-lucide="play"></i> Gerar Dados de Exemplo
          </button>
          <button type="button" id="btn-clear-demo" class="btn btn-danger">
            <i data-lucide="trash-2"></i> Limpar Todos os Dados
          </button>
        </div>
      </div>
    </div>
  `;
}

/**
 * Inicializa os ouvintes de eventos e carrega as configurações correntes da clínica.
 */
export async function initSettings() {
  const form = document.getElementById("form-settings");
  const logoUpload = document.getElementById("cfg-logo-upload");
  const btnTrigger = document.getElementById("btn-trigger-upload");
  const logoPreview = document.getElementById("cfg-logo-preview");
  const logoPlaceholder = document.getElementById("cfg-logo-placeholder");
  
  // Elementos de cor
  const colorPrimary = document.getElementById("cfg-color-primary");
  const colorSecondary = document.getElementById("cfg-color-secondary");
  const colorBackground = document.getElementById("cfg-color-background");

  let activeLogoUrl = "";
  let allowDemoData = true;

  // 1. Carregar valores salvos no Firestore
  try {
    const config = await getClinicConfig();
    if (config) {
      document.getElementById("cfg-clinic-name").value = config.name || "";
      document.getElementById("cfg-consultation-price").value = config.consultationPrice !== undefined ? config.consultationPrice : 150.00;
      
      if (config.logoUrl) {
        activeLogoUrl = config.logoUrl;
        logoPreview.src = config.logoUrl;
        logoPreview.classList.remove("hidden");
        logoPlaceholder.classList.add("hidden");
      }
      
      if (config.brandColors) {
        colorPrimary.value = config.brandColors.primary || "#0d9488";
        colorSecondary.value = config.brandColors.secondary || "#0f172a";
        colorBackground.value = config.brandColors.background || "#f8fafc";
      }

      if (config.allowDemoData === false) {
        allowDemoData = false;
        const demoDataCard = document.getElementById("demo-data-card");
        if (demoDataCard) {
          demoDataCard.classList.add("hidden");
        }
      }
    }
  } catch (error) {
    showToast("Erro ao carregar configurações da clínica.", "error");
  }

  // 2. Evento para disparar seletor de arquivos ao clicar no botão
  btnTrigger.addEventListener("click", () => logoUpload.click());

  // 3. Processar logotipo da clínica e converter para Base64 com redimensionamento automático (Canvas)
  logoUpload.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      showToast("Redimensionando imagem...", "info");
      // Padroniza em até 300x300 px
      const base64Data = await resizeImage(file, 300, 300, 0.75);
      
      activeLogoUrl = base64Data;
      logoPreview.src = base64Data;
      logoPreview.classList.remove("hidden");
      logoPlaceholder.classList.add("hidden");
      
      showToast("Logotipo processado! Clique em Salvar para aplicar.", "success");
    } catch (error) {
      console.error("Erro ao redimensionar imagem:", error);
      showToast("Erro ao processar imagem do logotipo.", "error");
    }
  });

  // 4. Salvar configurações no Firestore
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    
    const name = document.getElementById("cfg-clinic-name").value;
    const consultationPrice = parseFloat(document.getElementById("cfg-consultation-price").value || 0);
    
    const brandColors = {
      primary: colorPrimary.value,
      secondary: colorSecondary.value,
      background: colorBackground.value
    };

    try {
      await updateClinicConfig({
        name,
        logoUrl: activeLogoUrl,
        brandColors,
        consultationPrice
      });

      // Aplicar estilos localmente e atualizar UI
      applyStylesLocally(brandColors, name, activeLogoUrl);
      showToast("Configurações salvas com sucesso!", "success");
    } catch (error) {
      showToast("Erro ao salvar configurações no banco de dados.", "error");
    }
  });

  // 5. Vincular geração de dados de exemplo
  const btnDemo = document.getElementById("btn-generate-demo");
  if (btnDemo && allowDemoData) {
    btnDemo.addEventListener("click", async () => {
      const confirmGen = confirm(
        "Deseja mesmo gerar os dados de exemplo? Isso irá cadastrar clientes, pets, estoque, agendamentos, prontuários e transações financeiras fictícias na sua clínica corrente para fins de demonstração."
      );
      if (confirmGen) {
        btnDemo.disabled = true;
        btnDemo.innerHTML = `<i data-lucide="loader" class="animate-spin" style="width: 16px; height: 16px;"></i> Gerando dados...`;
        lucide.createIcons();
        try {
          await generateDemoData();
          showToast("Dados de exemplo cadastrados com sucesso!", "success");
          setTimeout(() => {
            window.location.reload();
          }, 1500);
        } catch (err) {
          console.error(err);
          showToast("Erro ao gerar dados de exemplo.", "error");
          btnDemo.disabled = false;
          btnDemo.innerHTML = `<i data-lucide="play"></i> Gerar Dados de Exemplo`;
          lucide.createIcons();
        }
      }
    });
  }

  // 6. Vincular limpeza de dados do sistema
  const btnClear = document.getElementById("btn-clear-demo");
  if (btnClear && allowDemoData) {
    btnClear.addEventListener("click", async () => {
      const confirmClear = confirm(
        "ATENÇÃO MÁXIMA!\n\nEsta ação irá apagar DEFINITIVAMENTE todos os clientes, pets, prontuários, produtos em estoque, fornecedores, transações financeiras e agendamentos cadastrados nesta clínica.\n\nEsta operação NÃO PODE SER DESFEITA.\n\nDeseja continuar com a limpeza completa do sistema?"
      );
      if (confirmClear) {
        const confirmDouble = confirm("Confirme mais uma vez: Tem certeza absoluta de que deseja apagar TODOS os dados da clínica?");
        if (confirmDouble) {
          btnClear.disabled = true;
          btnClear.innerHTML = `<i data-lucide="loader" class="animate-spin" style="width: 16px; height: 16px;"></i> Limpando sistema...`;
          lucide.createIcons();
          try {
            await clearClinicData();
            showToast("Banco de dados da clínica limpo com sucesso!", "success");
            setTimeout(() => {
              window.location.reload();
            }, 1500);
          } catch (err) {
            console.error(err);
            showToast("Erro ao realizar limpeza dos dados.", "error");
            btnClear.disabled = false;
            btnClear.innerHTML = `<i data-lucide="trash-2"></i> Limpar Todos os Dados`;
            lucide.createIcons();
          }
        }
      }
    });
  }
}

/**
 * Atualiza os estilos e logotipo do DOM imediatamente após a gravação
 */
function applyStylesLocally(colors, name, logoUrl) {
  let styleTag = document.getElementById("dynamic-clinic-theme");
  if (!styleTag) {
    styleTag = document.createElement("style");
    styleTag.id = "dynamic-clinic-theme";
    document.head.appendChild(styleTag);
  }
  
  styleTag.textContent = `
    :root {
      --brand-primary: ${colors.primary};
      --brand-primary-hover: ${colors.primary}e0;
      --brand-primary-light: ${colors.primary}1a;
      --brand-secondary: ${colors.secondary};
      --brand-background: ${colors.background};
    }
  `;
  
  document.getElementById("sidebar-clinic-name").textContent = name;
  const sidebarLogo = document.getElementById("sidebar-clinic-logo");
  const sidebarDefaultLogo = document.getElementById("sidebar-clinic-default-logo");

  if (logoUrl) {
    sidebarLogo.src = logoUrl;
    sidebarLogo.classList.remove("hidden");
    sidebarDefaultLogo.classList.add("hidden");
  } else {
    sidebarLogo.classList.add("hidden");
    sidebarDefaultLogo.classList.remove("hidden");
  }
}
