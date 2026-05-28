// ==========================================================================
// GOOGLE APS SCRIPT (GAS) INTEGRATION CLIENT
// ==========================================================================

import { showToast } from "./utils.js";

// A URL do Apps Script Web App pode ser salva dinamicamente nas Configurações.
// Caso contrário, usa um placeholder padrão.
function getGasWebAppUrl() {
  return localStorage.getItem("gas_webapp_url") || "https://script.google.com/macros/s/AKfycbz_DummyGASEndpointURL12345/exec";
}

/**
 * Cria ou atualiza um compromisso no Google Calendar correspondente à clínica.
 * @param {object} appointment Objeto com detalhes da consulta
 */
export async function syncAppointmentToCalendar(appointment) {
  const url = getGasWebAppUrl();
  try {
    const payload = {
      action: "syncAppointment",
      calendarId: localStorage.getItem("gas_calendar_id") || "primary",
      appointment: {
        id: appointment.id,
        summary: `Consulta Vet: ${appointment.petName}`,
        description: appointment.description || "Consulta geral agendada pelo sistema VetSaaS.",
        start: appointment.start, // Formato ISO8601
        end: appointment.end || new Date(new Date(appointment.start).getTime() + 60*60*1000).toISOString() // Padrão 1h dur.
      }
    };

    const response = await fetch(url, {
      method: "POST",
      mode: "no-cors", // Necessário para contornar restrições CORS do GAS em certas requisições simples
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    // Se o mode for "no-cors", a resposta será opaca (status 0).
    // Tratamos com sucesso assumido se não disparar erro de rede.
    showToast("Consulta enviada para sincronização com Google Calendar!", "success");
    return true;
  } catch (error) {
    console.error("Falha ao sincronizar agenda com GAS:", error);
    showToast("Erro ao sincronizar consulta com Google Calendar.", "error");
    return false;
  }
}

/**
 * Dispara um lembrete de e-mail avulso (para vacinas/consultas) através do GAS.
 * @param {string} email Destinatário
 * @param {string} subject Assunto do e-mail
 * @param {string} htmlBody Corpo formatado em HTML
 */
export async function sendEmailNotification(email, subject, htmlBody) {
  const url = getGasWebAppUrl();
  try {
    const payload = {
      action: "sendEmail",
      recipient: email,
      subject: subject,
      body: htmlBody
    };

    await fetch(url, {
      method: "POST",
      mode: "no-cors",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    showToast(`Lembrete de e-mail enviado para: ${email}`, "success");
    return true;
  } catch (error) {
    console.error("Falha ao disparar e-mail via GAS:", error);
    showToast("Falha ao enviar e-mail de lembrete.", "error");
    return false;
  }
}
