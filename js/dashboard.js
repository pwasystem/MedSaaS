// ==========================================================================
// CLINIC BUSINESS PERFORMANCE DASHBOARD
// ==========================================================================

import { getTenantDocs } from "./db.js";
import { showToast } from "./utils.js";

/**
 * Renderiza o layout básico da tela de Dashboard.
 */
export function renderDashboard(container) {
  container.innerHTML = `
    <!-- Grade de Indicadores Rápidos -->
    <div class="metrics-grid fade-in">
      <div class="metric-card">
        <div class="metric-icon-box primary">
          <i data-lucide="calendar"></i>
        </div>
        <div class="metric-data">
          <span class="metric-label">Consultas Hoje</span>
          <span id="dash-metric-appointments" class="metric-value">0</span>
        </div>
      </div>

      <div class="metric-card">
        <div class="metric-icon-box success">
          <i data-lucide="trending-up"></i>
        </div>
        <div class="metric-data">
          <span class="metric-label">Receita do Mês</span>
          <span id="dash-metric-revenue" class="metric-value">R$ 0,00</span>
        </div>
      </div>

      <div class="metric-card">
        <div class="metric-icon-box warning">
          <i data-lucide="package-open"></i>
        </div>
        <div class="metric-data">
          <span class="metric-label">Estoque Crítico</span>
          <span id="dash-metric-stock" class="metric-value">0</span>
        </div>
      </div>

      <div class="metric-card">
        <div class="metric-icon-box danger">
          <i data-lucide="shield-alert"></i>
        </div>
        <div class="metric-data">
          <span class="metric-label">Vacinas Vencidas</span>
          <span id="dash-metric-vaccines" class="metric-value">0</span>
        </div>
      </div>
    </div>

    <!-- Seção de Análise e Alertas -->
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); gap: 24px;" class="fade-in">
      <!-- Gráfico de Performance Financeira (SVG Puro) -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title"><i data-lucide="bar-chart-3"></i> Faturamento vs Despesas (Ano Corrente)</h3>
        </div>
        <div id="dashboard-chart-container" style="width: 100%; height: 260px; display: flex; align-items: center; justify-content: center;">
          <!-- SVG Gráfico Injetado Dinamicamente -->
        </div>
      </div>

      <!-- Feed de Alertas Críticos -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title" style="color: var(--color-danger);"><i data-lucide="alert-triangle"></i> Painel de Atenção Urgente</h3>
        </div>
        <ul id="dash-alerts-list" style="display: flex; flex-direction: column; gap: 12px; max-height: 260px; overflow-y: auto;">
          <li style="color: var(--color-gray-500); font-size: 14px; text-align: center; padding: 20px;">Carregando alertas...</li>
        </ul>
      </div>
    </div>
  `;
}

/**
 * Carrega os dados reais do Firestore, calcula as métricas e atualiza a interface.
 */
export async function initDashboard() {
  try {
    // 1. Carregar coleções para consolidar dados
    const appointments = await getTenantDocs("appointments").catch(() => []);
    const transactions = await getTenantDocs("finance").catch(() => []);
    const inventory = await getTenantDocs("inventory").catch(() => []);
    const pets = await getTenantDocs("pets").catch(() => []);

    // 2. Calcular Consultas de Hoje
    const todayStr = new Date().toISOString().split("T")[0];
    const todayAppointments = appointments.filter(apt => {
      if (!apt.start) return false;
      return apt.start.split("T")[0] === todayStr && apt.status !== "cancelled";
    });
    document.getElementById("dash-metric-appointments").textContent = todayAppointments.length;

    // 3. Calcular Receita Mensal
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    let monthlyIncome = 0;
    
    transactions.forEach(t => {
      if (!t.date) return;
      const tDate = new Date(t.date);
      if (tDate.getMonth() === currentMonth && tDate.getFullYear() === currentYear) {
        if (t.type === "income") {
          monthlyIncome += parseFloat(t.amount || 0);
        }
      }
    });
    
    document.getElementById("dash-metric-revenue").textContent = new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL"
    }).format(monthlyIncome);

    // 4. Calcular Itens de Estoque Crítico
    const criticalStockItems = inventory.filter(item => {
      const qty = parseFloat(item.quantity || 0);
      const min = parseFloat(item.minQuantity || 0);
      return qty <= min;
    });
    document.getElementById("dash-metric-stock").textContent = criticalStockItems.length;

    // 5. Calcular Pets com Vacinas Vencidas
    let expiredVaccinesCount = 0;
    const now = new Date();
    
    pets.forEach(pet => {
      if (pet.vaccines && Array.isArray(pet.vaccines)) {
        pet.vaccines.forEach(vac => {
          if (vac.dateExpiration && vac.status !== "applied") {
            const expDate = new Date(vac.dateExpiration);
            if (expDate < now) {
              expiredVaccinesCount++;
            }
          }
        });
      }
    });
    document.getElementById("dash-metric-vaccines").textContent = expiredVaccinesCount;

    // 6. Montar o Feed de Alertas Urgentes
    renderAlerts(criticalStockItems, pets, now);

    // 7. Desenhar Gráfico Financeiro
    renderPerformanceChart(transactions);

  } catch (error) {
    console.error("Falha ao inicializar o painel do dashboard:", error);
    showToast("Erro ao sincronizar dados do painel principal.", "error");
  }
}

/**
 * Desenha os alertas de atenção urgente no painel lateral.
 */
function renderAlerts(criticalStock, pets, now) {
  const alertsList = document.getElementById("dash-alerts-list");
  alertsList.innerHTML = "";

  const alerts = [];

  // Alertas de estoque
  criticalStock.forEach(item => {
    alerts.push({
      type: "danger",
      icon: "package",
      message: `Estoque crítico: <strong>${item.name}</strong> possui apenas ${item.quantity} ${item.unit || 'unidades'} restantes.`
    });
  });

  // Alertas de vacinas vencidas nos pets
  pets.forEach(pet => {
    if (pet.vaccines && Array.isArray(pet.vaccines)) {
      pet.vaccines.forEach(vac => {
        if (vac.dateExpiration && vac.status !== "applied") {
          const expDate = new Date(vac.dateExpiration);
          if (expDate < now) {
            const diffDays = Math.floor((now - expDate) / (1000 * 60 * 60 * 24));
            alerts.push({
              type: "warning",
              icon: "shield-alert",
              message: `Vacina <strong>${vac.name}</strong> do pet <strong>${pet.name}</strong> vencida há ${diffDays} dias.`
            });
          }
        }
      });
    }
  });

  if (alerts.length === 0) {
    alertsList.innerHTML = `
      <li style="color: var(--color-success); font-size: 14px; text-align: center; padding: 30px; display: flex; flex-direction: column; align-items: center; gap: 8px;">
        <i data-lucide="check-circle" style="width: 32px; height: 32px;"></i>
        <span>Tudo sob controle! Nenhum alerta crítico ativo.</span>
      </li>
    `;
    lucide.createIcons();
    return;
  }

  // Ordenar alertas: primeiro estoque crítico (danger), depois vacinas (warning)
  alerts.sort((a, b) => (a.type === "danger" ? -1 : 1));

  alerts.slice(0, 5).forEach(alert => {
    const li = document.createElement("li");
    li.style.cssText = "padding: 12px 14px; border-radius: var(--radius-md); font-size: 13px; display: flex; gap: 10px; align-items: flex-start;";
    
    if (alert.type === "danger") {
      li.style.backgroundColor = "var(--color-danger-light)";
      li.style.color = "var(--color-danger)";
      li.style.border = "1px solid rgba(239, 68, 68, 0.15)";
    } else {
      li.style.backgroundColor = "var(--color-warning-light)";
      li.style.color = "#d97706"; // Laranja escuro para texto
      li.style.border = "1px solid rgba(245, 158, 11, 0.15)";
    }

    li.innerHTML = `
      <i data-lucide="${alert.icon}" style="width: 18px; height: 18px; flex-shrink: 0; margin-top: 1px;"></i>
      <span>${alert.message}</span>
    `;
    alertsList.appendChild(li);
  });
  lucide.createIcons();
}

/**
 * Desenha um gráfico de barras financeiro anual utilizando SVG puro.
 */
function renderPerformanceChart(transactions) {
  const container = document.getElementById("dashboard-chart-container");
  
  // Calcular fluxo mensal consolidado do ano atual
  const currentYear = new Date().getFullYear();
  const monthsData = Array.from({ length: 12 }, () => ({ income: 0, expense: 0 }));

  transactions.forEach(t => {
    if (!t.date) return;
    const date = new Date(t.date);
    if (date.getFullYear() === currentYear) {
      const month = date.getMonth();
      if (t.type === "income") {
        monthsData[month].income += parseFloat(t.amount || 0);
      } else if (t.type === "expense") {
        monthsData[month].expense += parseFloat(t.amount || 0);
      }
    }
  });

  const monthLabels = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

  // Achar o valor máximo para escalonar o gráfico
  let maxAmount = 1000; // Mínimo de escala para visualização limpa
  monthsData.forEach(m => {
    if (m.income > maxAmount) maxAmount = m.income;
    if (m.expense > maxAmount) maxAmount = m.expense;
  });
  // Adiciona 20% de margem no topo do gráfico
  maxAmount *= 1.2;

  // Parâmetros do SVG
  const width = 500;
  const height = 220;
  const paddingX = 40;
  const paddingY = 20;
  const graphHeight = height - paddingY * 2;
  const graphWidth = width - paddingX * 2;

  const barWidth = 10;
  const spacing = graphWidth / 12;

  let svgContent = `<svg viewBox="0 0 ${width} ${height}" style="width: 100%; height: 100%;">`;

  // Desenhar linhas horizontais de grade (Grid Lines)
  for (let i = 0; i <= 4; i++) {
    const yVal = height - paddingY - (graphHeight / 4) * i;
    const labelVal = Math.round((maxAmount / 4) * i);
    
    // Linha de grade
    svgContent += `<line x1="${paddingX}" y1="${yVal}" x2="${width - paddingX}" y2="${yVal}" stroke="var(--color-gray-200)" stroke-dasharray="3,3" stroke-width="1" />`;
    
    // Label no eixo Y
    svgContent += `<text x="${paddingX - 8}" y="${yVal + 4}" fill="var(--color-gray-400)" font-size="9" text-anchor="end" font-weight="500">${labelVal >= 1000 ? (labelVal / 1000) + 'k' : labelVal}</text>`;
  }

  // Desenhar Barras de Receita e Despesa para cada mês
  monthsData.forEach((data, index) => {
    const xPos = paddingX + spacing * index + (spacing - barWidth * 2) / 2;
    
    // Alturas calculadas proporcionalmente
    const incomeBarHeight = (data.income / maxAmount) * graphHeight;
    const expenseBarHeight = (data.expense / maxAmount) * graphHeight;
    
    const yIncome = height - paddingY - incomeBarHeight;
    const yExpense = height - paddingY - expenseBarHeight;

    // Barra de Receita (Primária / Verde)
    if (data.income > 0) {
      svgContent += `
        <rect x="${xPos}" y="${yIncome}" width="${barWidth}" height="${incomeBarHeight}" fill="var(--brand-primary)" rx="2" style="transition: height 0.5s ease;">
          <title>Receita ${monthLabels[index]}: R$ ${data.income.toFixed(2)}</title>
        </rect>`;
    } else {
      // Pequeno traço se for zero
      svgContent += `<rect x="${xPos}" y="${height - paddingY - 2}" width="${barWidth}" height="2" fill="var(--color-gray-200)" rx="1"/>`;
    }

    // Barra de Despesa (Vermelha)
    const xPosExpense = xPos + barWidth + 3;
    if (data.expense > 0) {
      svgContent += `
        <rect x="${xPosExpense}" y="${yExpense}" width="${barWidth}" height="${expenseBarHeight}" fill="var(--color-danger)" rx="2">
          <title>Despesa ${monthLabels[index]}: R$ ${data.expense.toFixed(2)}</title>
        </rect>`;
    } else {
      svgContent += `<rect x="${xPosExpense}" y="${height - paddingY - 2}" width="${barWidth}" height="2" fill="var(--color-gray-200)" rx="1"/>`;
    }

    // Label do mês no Eixo X
    svgContent += `
      <text x="${xPos + barWidth}" y="${height - paddingY + 14}" fill="var(--color-gray-500)" font-size="10" font-weight="600" text-anchor="middle">
        ${monthLabels[index]}
      </text>`;
  });

  // Linha de base do gráfico
  svgContent += `<line x1="${paddingX}" y1="${height - paddingY}" x2="${width - paddingX}" y2="${height - paddingY}" stroke="var(--color-gray-300)" stroke-width="1.5" />`;
  svgContent += `</svg>`;

  container.innerHTML = svgContent;
}
