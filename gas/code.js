// ==========================================================================
// GOOGLE APPS SCRIPT (GAS) - ORCHESTRATION & AUTOMATION SERVICE
// ==========================================================================

/**
 * Endpoint principal da API Web App (HTTP POST).
 * Recebe e processa requisições de sincronização do aplicativo VetSaaS.
 */
function doPost(e) {
  try {
    const jsonString = e.postData.contents;
    const requestData = JSON.parse(jsonString);
    const action = requestData.action;

    let responseData = { success: false };

    if (action === "syncAppointment") {
      responseData = syncAppointmentToCalendar(requestData.calendarId, requestData.appointment);
    } else if (action === "sendEmail") {
      responseData = sendEmailNotification(requestData.recipient, requestData.subject, requestData.body);
    } else {
      responseData.error = "Ação desconhecida.";
    }

    return ContentService.createTextOutput(JSON.stringify(responseData))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    const errorResponse = { success: false, error: error.toString() };
    return ContentService.createTextOutput(JSON.stringify(errorResponse))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Cria ou atualiza um compromisso no Google Calendar correspondente.
 */
function syncAppointmentToCalendar(calendarId, appointment) {
  try {
    // Acessar calendário da clínica (ou o principal da conta executora)
    const calendar = CalendarApp.getCalendarById(calendarId || "primary");
    if (!calendar) {
      return { success: false, error: "Calendário não encontrado ou sem permissão de acesso." };
    }

    const startVar = new Date(appointment.start);
    const endVar = new Date(appointment.end);

    let event;
    // Se já possuir um ID de evento do Google Calendar associado, tentamos atualizar
    if (appointment.googleEventId) {
      event = calendar.getEventById(appointment.googleEventId);
      if (event) {
        event.setTitle(appointment.summary);
        event.setDescription(appointment.description);
        event.setTime(startVar, endVar);
      }
    }

    // Caso não exista ou não foi encontrado, cria um novo
    if (!event) {
      event = calendar.createEvent(
        appointment.summary,
        startVar,
        endVar,
        { description: appointment.description }
      );
    }

    return { 
      success: true, 
      googleEventId: event.getId() 
    };

  } catch (err) {
    return { success: false, error: err.toString() };
  }
}

/**
 * Dispara e-mails contendo informativos ou lembretes clínicos via GmailApp.
 */
function sendEmailNotification(recipient, subject, htmlBody) {
  try {
    GmailApp.sendEmail(recipient, subject, "", {
      htmlBody: htmlBody,
      name: "VetSaaS Lembrete Clínico"
    });
    return { success: true };
  } catch (err) {
    return { success: false, error: err.toString() };
  }
}

/**
 * Função cronometrada (Trigger diário).
 * Deve ser configurada nos 'Gatilhos do Projeto' no console do Google Apps Script
 * para rodar todas as manhãs (ex: entre 07:00 e 08:00).
 * 
 * NOTA: Esta função pode ser disparada por um webhook de backend ou integrada com
 * a biblioteca Firestore do GAS para automatizar a leitura diária de consultas/vacinas.
 */
function sendDailyRemindersTrigger() {
  Logger.log("Iniciando varredura de lembretes automáticos...");
  // Implementação de automação para ler do Firebase via REST API e disparar lembretes
  // de vacinas e consultas agendadas para +2 dias no futuro.
}
