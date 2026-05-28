> **Objetivo:** Desenvolver um sistema SaaS multitenant de gestão para clínicas veterinárias.
> **Escopo Técnico:**
> * **Frontend:** HTML5, CSS3, JS puro (arquitetura modular: um arquivo `.js` por funcionalidade). Layout desenvolvido no **Stitch** (focar em design responsivo, acessível e clean).
> * **Backend/Integrações:** Google Apps Script (GAS) como Web App (orquestração de Calendar e automações).
> * **Infraestrutura:** Firebase (Auth, Firestore para banco de dados isolado por `clinic_id`, Hosting).
> * **Multi-tenancy:** Garantir isolamento total de dados via Firestore Security Rules, onde cada `clinic_id` é o prefixo de acesso.
> 
> 
> **Requisitos Funcionais:**
> 1. **Autenticação:** Firebase Auth com controle de acesso baseado em roles (Admin, Veterinário/Funcionário, Cliente).
> 2. **Gestão:** Cadastro completo de Clientes e Pets (com histórico médico), Fornecedores, Estoque (baixa automática), Fluxo de Caixa e Despesas.
> 3. **Integração:** Agenda de consultas integrada ao Google Calendar via GAS.
> 4. **Recursos de Valor Agregado:** (Adicionar lista de novos recursos abaixo).
> 
> 
> **Diretrizes para IA:**
> * Utilize o MCP para conectar o design do Stitch ao código.
> * Priorize a performance e o uso do plano gratuito (otimização de queries no Firestore e uso inteligente de cache).
> * Estruture o código para ser extensível, tratando cada módulo como um componente independente.
> 
> 

---

### Recursos Adicionais Recomendados

Estes recursos transformarão um simples "cadastrador" em uma plataforma de gestão indispensável:

#### Para os Clientes (Experiência do Dono):

* **Carteirinha de Vacinação Digital (PDF/QR):** O sistema gera um QR Code que, quando lido, mostra o histórico de vacinas e vermífugos do pet.
* **Notificações de Lembrete:** Automação (via GAS) para enviar um e-mail ou notificação 2 dias antes da vacina vencer ou da consulta agendada.
* **Galeria de Saúde:** Espaço para anexar exames laboratoriais (PDFs ou fotos) aos perfis dos pets, organizando todo o histórico clínico em um só lugar.

#### Para os Veterinários (Eficiência Clínica):

* **Prontuário Eletrônico (SOAP):** Estruturar as anotações da consulta no formato **S**ubjetivo, **O**bjetivo, **A**nálise e **P**lano. Isso profissionaliza o atendimento.
* **Alertas de Estoque Crítico:** O sistema deve notificar o Admin quando o estoque de um medicamento atingir um nível mínimo (ex: "restam apenas 2 unidades de vacina X").
* **Dashboard de Performance:** Um gráfico simples na tela inicial do Admin mostrando: "Consultas hoje", "Receita do mês" e "Pets com vacina vencida".
* **Histórico de Atendimento:** Timeline visual do pet (consultas anteriores, medicamentos receitados, exames feitos).

#### Para a Gestão do SaaS (Oportunidade de Negócio):

* **Exportação Financeira (CSV/Excel):** O dono da clínica precisa exportar os dados financeiros para o contador.
* **Backup Simples:** Função para o Admin fazer download de um JSON com todos os seus dados caso queira migrar de plataforma (isso dá segurança ao cliente).

---

### Dica de implementação para o "SaaS"

Como você quer vender como SaaS, um desafio será o **onboarding** da clínica. Adicione no seu fluxo de desenvolvimento uma **"Página de Configuração da Clínica"** (apenas para o Admin). Lá, a clínica deve poder:

1. Subir o logo (armazenar no Firebase Storage).
2. Definir as cores da marca (CSS Variables).
3. Conectar a própria conta do Google Calendar via OAuth (para que o agendamento caia no calendário deles, e não no seu).

**Pergunta para a próxima etapa:** Você prefere que eu estruture agora como seriam as **"Security Rules" do Firestore** para garantir que uma clínica nunca veja os dados da outra, ou prefere focar em como estruturar a primeira tela do layout no Stitch?