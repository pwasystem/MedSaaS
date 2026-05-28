import { addTenantDoc, setTenantDoc, getTenantDocs, deleteTenantDoc } from "./db.js";

/**
 * Gera massa de dados de exemplo realista para demonstração do sistema MedSaaS.
 */
export async function generateDemoData() {
  // 1. Cadastrar Fornecedores de Insumos Médicos
  const supplierId1 = await addTenantDoc("suppliers", {
    name: "Distribuidora Farmacêutica Brasil Ltda",
    contactName: "João Silva",
    phone: "(11) 98888-1111",
    email: "contato@difarmabrasil.com",
    address: "Rua das Flores, 123 - São Paulo - SP"
  });

  const supplierId2 = await addTenantDoc("suppliers", {
    name: "MedVacinas Distribuidora S.A.",
    contactName: "Mariana Souza",
    phone: "(11) 97777-2222",
    email: "vendas@medvacinas.com.br",
    address: "Av. Industrial, 456 - São Paulo - SP"
  });

  // 2. Cadastrar Itens no Estoque (Inventory)
  const itemId1 = await addTenantDoc("inventory", {
    name: "Vacina Influenza Tripartida",
    purchasePrice: 25.00,
    salePrice: 80.00,
    quantity: 15,
    minQuantity: 5,
    unit: "dose",
    supplierId: supplierId2,
    location: "Geladeira de Vacinas 1"
  });

  const itemId2 = await addTenantDoc("inventory", {
    name: "Vacina Hepatite B Recombinante",
    purchasePrice: 15.00,
    salePrice: 50.00,
    quantity: 20,
    minQuantity: 5,
    unit: "dose",
    supplierId: supplierId2,
    location: "Geladeira de Vacinas 1"
  });

  const itemId3 = await addTenantDoc("inventory", {
    name: "Shampoo Cetoconazol 2% 200ml",
    purchasePrice: 18.00,
    salePrice: 45.00,
    quantity: 8,
    minQuantity: 3,
    unit: "frasco",
    supplierId: supplierId1,
    location: "Prateleira A2"
  });

  const itemId4 = await addTenantDoc("inventory", {
    name: "Soro Ringer Lactato 500ml",
    purchasePrice: 6.50,
    salePrice: 25.00,
    quantity: 30,
    minQuantity: 10,
    unit: "bolsa",
    supplierId: supplierId1,
    location: "Armário de Insumos"
  });

  const itemId5 = await addTenantDoc("inventory", {
    name: "Amoxicilina + Clavulanato 500mg/125mg (14 cpr)",
    purchasePrice: 32.00,
    salePrice: 85.00,
    quantity: 12,
    minQuantity: 4,
    unit: "caixa",
    supplierId: supplierId1,
    location: "Armário de Insumos"
  });

  // 3. Cadastrar Pacientes Humanos (na coleção 'pets' para compatibilidade do banco)
  const pet1Id = await addTenantDoc("pets", {
    name: "Carlos Alberto Silva",
    birthDate: "1982-04-12",
    gender: "Masculino",
    cpf: "123.456.789-00",
    phone: "(11) 98888-7777",
    email: "carlos@exemplo.com",
    allergies: "Nenhuma conhecida",
    photoUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200",
    vaccines: [
      {
        name: "Vacina Influenza Tripartida",
        dateAdministered: "2025-05-10",
        dateExpiration: "2026-05-10",
        status: "applied"
      }
    ],
    exams: [
      {
        name: "hemograma_carlos.pdf",
        url: "data:application/pdf;base64,JVBERi0xLjQKJWRlZg==",
        type: "application/pdf",
        date: "2026-03-15T10:00:00.000Z"
      }
    ]
  });

  const pet2Id = await addTenantDoc("pets", {
    name: "Mariana Medeiros Costa",
    birthDate: "1995-09-18",
    gender: "Feminino",
    cpf: "987.654.321-11",
    phone: "(11) 97777-6666",
    email: "mariana@exemplo.com",
    allergies: "Alergia a Dipirona",
    photoUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200",
    vaccines: [
      {
        name: "Vacina Influenza Tripartida",
        dateAdministered: "2025-09-18",
        dateExpiration: "2026-09-18",
        status: "applied"
      },
      {
        name: "Vacina Hepatite B Recombinante",
        dateAdministered: "2025-09-18",
        dateExpiration: "2035-09-18",
        status: "applied"
      }
    ],
    exams: []
  });

  const pet3Id = await addTenantDoc("pets", {
    name: "Luna de Souza",
    birthDate: "2013-01-05",
    gender: "Feminino",
    cpf: "456.789.123-22",
    phone: "(21) 99999-8888",
    email: "luna@exemplo.com",
    allergies: "Nenhuma conhecida",
    photoUrl: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=200",
    vaccines: [],
    exams: []
  });

  const pet4Id = await addTenantDoc("pets", {
    name: "Fred Ferreira",
    birthDate: "1988-11-20",
    gender: "Masculino",
    cpf: "321.654.987-33",
    phone: "(11) 96666-5555",
    email: "fred@exemplo.com",
    allergies: "Alergia a Penicilina",
    photoUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200",
    vaccines: [
      {
        name: "Vacina Hepatite B Recombinante",
        dateAdministered: "2025-11-20",
        dateExpiration: "2035-11-20",
        status: "applied"
      }
    ],
    exams: []
  });

  // Criar perfis de vacina públicos correspondentes (para o QR Code da Carteira Digital)
  await setTenantDoc("pets", `${pet1Id}/publicProfile/vaccines`, {
    petName: "Carlos Alberto Silva",
    patientName: "Carlos Alberto Silva",
    cpf: "123.456.789-00",
    gender: "Masculino",
    photoUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200",
    vaccines: [
      {
        name: "Vacina Influenza Tripartida",
        dateAdministered: "2025-05-10",
        dateExpiration: "2026-05-10",
        status: "applied"
      }
    ]
  });

  await setTenantDoc("pets", `${pet2Id}/publicProfile/vaccines`, {
    petName: "Mariana Medeiros Costa",
    patientName: "Mariana Medeiros Costa",
    cpf: "987.654.321-11",
    gender: "Feminino",
    photoUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200",
    vaccines: [
      {
        name: "Vacina Influenza Tripartida",
        dateAdministered: "2025-09-18",
        dateExpiration: "2026-09-18",
        status: "applied"
      },
      {
        name: "Vacina Hepatite B Recombinante",
        dateAdministered: "2025-09-18",
        dateExpiration: "2035-09-18",
        status: "applied"
      }
    ]
  });

  await setTenantDoc("pets", `${pet4Id}/publicProfile/vaccines`, {
    petName: "Fred Ferreira",
    patientName: "Fred Ferreira",
    cpf: "321.654.987-33",
    gender: "Masculino",
    photoUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200",
    vaccines: [
      {
        name: "Vacina Hepatite B Recombinante",
        dateAdministered: "2025-11-20",
        dateExpiration: "2035-11-20",
        status: "applied"
      }
    ]
  });

  // 4. Lançar Transações Financeiras Históricas
  // Lançar algumas despesas (saídas)
  await addTenantDoc("finance", {
    type: "expense",
    description: "Pagamento fornecedor - MedVacinas Distribuidora (Lote de Vacinas)",
    amount: 525.00,
    date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    category: "Estoque",
    paymentMethod: "Boleto"
  });

  await addTenantDoc("finance", {
    type: "expense",
    description: "Aluguel do consultório médico",
    amount: 1500.00,
    date: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    category: "Infraestrutura",
    paymentMethod: "Boleto"
  });

  await addTenantDoc("finance", {
    type: "expense",
    description: "Conta de Energia Elétrica",
    amount: 245.80,
    date: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    category: "Infraestrutura",
    paymentMethod: "PIX"
  });

  // Lançar algumas receitas (entradas)
  const transId1 = await addTenantDoc("finance", {
    type: "income",
    description: "Consulta médica e antibioticoterapia de Carlos",
    amount: 235.00,
    date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    category: "Consultas",
    paymentMethod: "PIX"
  });

  const transId2 = await addTenantDoc("finance", {
    type: "income",
    description: "Atendimento preventivo e vacinação de Mariana",
    amount: 280.00,
    date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    category: "Consultas",
    paymentMethod: "Dinheiro"
  });

  await addTenantDoc("finance", {
    type: "income",
    description: "Venda avulsa: Shampoo Cetoconazol e Amoxicilina",
    amount: 130.00,
    date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    category: "Medicamentos",
    paymentMethod: "Cartão"
  });

  // 5. Cadastrar Prontuários Médicos (Records)
  // Prontuário 1 (Carlos) - Já pago
  await addTenantDoc("records", {
    petId: pet1Id,
    date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    soap: {
      subjective: "Carlos compareceu com queixa de dor intensa e secreção no ouvido esquerdo há 3 dias. Refere prurido ocasional e sensação de ouvido abafado.",
      objective: "PA: 120/80 mmHg, Peso: 78kg, Temperatura: 37.8°C. Otoscopia revelou hiperemia e edema importantes do conduto auditivo externo esquerdo, com secreção ceruminosa espessa.",
      analysis: "Otite externa aguda no ouvido esquerdo, provável etiologia bacteriana.",
      plan: "Limpeza local do conduto e prescrição de Amoxicilina + Clavulanato 500mg de 12h/12h por 7 dias. Retorno se não houver melhora em 5 dias."
    },
    usedItems: [
      {
        itemId: itemId5,
        name: "Amoxicilina + Clavulanato 500mg/125mg (14 cpr)",
        quantity: 1,
        unit: "caixa",
        salePrice: 85.00
      }
    ],
    paymentStatus: "paid",
    financeTransactionId: transId1
  });

  // Prontuário 2 (Mariana) - Já pago
  await addTenantDoc("records", {
    petId: pet2Id,
    date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    soap: {
      subjective: "Mariana compareceu para consulta preventiva de rotina e atualização de imunizações (reforço anual da Influenza e início do esquema de Hepatite B).",
      objective: "PA: 110/70 mmHg, Peso: 62kg, Temp: 36.5°C. Ritmo cardíaco regular, pulmões limpos. Sem alterações clínicas dignas de nota.",
      analysis: "Paciente saudável. Apta para imunização.",
      plan: "Administrada 1 dose de Vacina Influenza Tripartida e 1 dose de Vacina Hepatite B Recombinante. Orientada sobre possíveis reações vacinais leves."
    },
    usedItems: [
      {
        itemId: itemId1,
        name: "Vacina Influenza Tripartida",
        quantity: 1,
        unit: "dose",
        salePrice: 80.00
      },
      {
        itemId: itemId2,
        name: "Vacina Hepatite B Recombinante",
        quantity: 1,
        unit: "dose",
        salePrice: 50.00
      }
    ],
    paymentStatus: "paid",
    financeTransactionId: transId2
  });

  // Prontuário 3 (Fred) - PENDENTE DE PAGAMENTO (para ser cobrado no Caixa/PDV)
  await addTenantDoc("records", {
    petId: pet4Id,
    date: new Date().toISOString(),
    soap: {
      subjective: "Fred compareceu ao consultório relatando lesão avermelhada descamativa e coceira no couro cabeludo há cerca de 1 semana.",
      objective: "PA: 130/85 mmHg, Peso: 80kg, Temp: 36.6°C. Presença de placas eritemato-descamativas bem delimitadas na região occipital do couro cabeludo.",
      analysis: "Dermatite seborreica grave ou dermatofitose capilar leve.",
      plan: "Uso de Shampoo Cetoconazol 2% em banhos capilares 3x por semana. Prescrito soro fisiológico para higienização das crostas. Retorno em 15 dias."
    },
    usedItems: [
      {
        itemId: itemId3,
        name: "Shampoo Cetoconazol 2% 200ml",
        quantity: 1,
        unit: "frasco",
        salePrice: 45.00
      },
      {
        itemId: itemId4,
        name: "Soro Ringer Lactato 500ml",
        quantity: 1,
        unit: "bolsa",
        salePrice: 25.00
      }
    ],
    paymentStatus: "pending"
  });

  // 6. Agendamentos Clínicos (Appointments)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowDateStr = tomorrow.toISOString().split("T")[0];

  await addTenantDoc("appointments", {
    petId: pet2Id,
    clientName: "",
    petName: "Mariana Medeiros Costa",
    vetName: "Dr. Roberto Nogueira",
    date: tomorrowDateStr + "T10:00",
    description: "Avaliação pós-vacinal",
    status: "scheduled"
  });

  const dayAfter = new Date();
  dayAfter.setDate(dayAfter.getDate() + 2);
  const dayAfterDateStr = dayAfter.toISOString().split("T")[0];

  await addTenantDoc("appointments", {
    petId: pet1Id,
    clientName: "",
    petName: "Carlos Alberto Silva",
    vetName: "Dr. Roberto Nogueira",
    date: dayAfterDateStr + "T14:00",
    description: "Retorno da consulta de otite - Avaliação de conduto",
    status: "scheduled"
  });
}

/**
 * Limpa todos os dados cadastrados na clínica ativa (pacientes, estoque, agendamentos, prontuários, financeiro, fornecedores).
 */
export async function clearClinicData() {
  const collectionsToClear = [
    "appointments",
    "records",
    "finance",
    "inventory",
    "suppliers",
    "pets",
    "clients"
  ];

  for (const col of collectionsToClear) {
    try {
      const docs = await getTenantDocs(col);
      for (const d of docs) {
        if (d.id) {
          await deleteTenantDoc(col, d.id);
        }
      }
    } catch (e) {
      console.error(`Erro ao limpar coleção ${col}:`, e);
    }
  }
}
