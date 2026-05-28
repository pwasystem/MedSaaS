// ==========================================================================
// VETSAAS GLOBAL UI UTILITIES (TOASTS, MODALS, ETC)
// ==========================================================================

/**
 * Exibe um toast de notificação flutuante temporário.
 * @param {string} message Mensagem
 * @param {string} type Tipo: 'success' | 'error' | 'info'
 */
export function showToast(message, type = "info") {
  const container = document.getElementById("toast-container");
  if (!container) return;
  
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  
  const iconMap = {
    success: "check-circle",
    error: "alert-circle",
    info: "info"
  };
  
  toast.innerHTML = `
    <i data-lucide="${iconMap[type]}"></i>
    <span>${message}</span>
  `;
  
  container.appendChild(toast);
  if (window.lucide) {
    window.lucide.createIcons();
  }
  
  setTimeout(() => {
    toast.style.animation = "slideIn 0.3s ease reverse forwards";
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

/**
 * Abre o modal de diálogo genérico do sistema.
 * @param {string} title Título do modal
 * @param {string} bodyHTML Conteúdo HTML a ser injetado no corpo
 * @param {Function} onCloseCallback Callback opcional de fechamento
 */
export function showModal(title, bodyHTML, onCloseCallback = null) {
  const modal = document.getElementById("global-modal");
  const titleEl = document.getElementById("modal-title");
  const bodyEl = document.getElementById("modal-body");
  const closeBtn = document.getElementById("btn-close-modal");
  
  if (!modal || !titleEl || !bodyEl || !closeBtn) return;
  
  titleEl.textContent = title;
  bodyEl.innerHTML = bodyHTML;
  
  modal.classList.remove("hidden");
  if (window.lucide) {
    window.lucide.createIcons();
  }
  
  const closeModal = () => {
    modal.classList.add("hidden");
    if (onCloseCallback) onCloseCallback();
  };
  
  closeBtn.onclick = closeModal;
  modal.onclick = (e) => {
    if (e.target === modal) closeModal();
  };
}

/**
 * Fecha o modal global.
 */
export function hideModal() {
  const modal = document.getElementById("global-modal");
  if (modal) {
    modal.classList.add("hidden");
  }
}

/**
 * Redimensiona uma imagem utilizando o elemento <canvas> do HTML5.
 * @param {File} file Arquivo de imagem original
 * @param {number} maxWidth Largura máxima permitida
 * @param {number} maxHeight Altura máxima permitida
 * @param {number} quality Qualidade da compressão (0.0 a 1.0)
 * @returns {Promise<string>} String contendo a imagem em Base64 (DataURL)
 */
export function resizeImage(file, maxWidth = 400, maxHeight = 400, quality = 0.7) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("O arquivo fornecido não é uma imagem válida."));
      return;
    }

    const reader = new FileReader();
    reader.onload = function(event) {
      const img = new Image();
      img.onload = function() {
        let width = img.width;
        let height = img.height;

        // Calcular dimensões proporcionais
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        // Exporta como jpeg para máxima compressão
        const dataUrl = canvas.toDataURL("image/jpeg", quality);
        resolve(dataUrl);
      };

      img.onerror = function() {
        reject(new Error("Erro ao carregar a imagem para processamento."));
      };

      img.src = event.target.result;
    };

    reader.onerror = function() {
      reject(new Error("Erro ao ler o arquivo físico."));
    };

    reader.readAsDataURL(file);
  });
}

