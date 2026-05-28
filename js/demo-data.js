import { addTenantDoc, setTenantDoc, getTenantDocs, deleteTenantDoc } from "./db.js";

/**
 * Gera massa de dados de exemplo realista para demonstração do sistema VetSaaS.
 */
export async function generateDemoData() {
  // 1. Cadastrar Fornecedores
  const supplierId1 = await addTenantDoc("suppliers", {
    name: "PetDistribuição Ltda",
    contactName: "João Silva",
    phone: "(11) 98888-1111",
    email: "contato@petdistribuicao.com",
    address: "Rua das Flores, 123 - São Paulo - SP"
  });

  const supplierId2 = await addTenantDoc("suppliers", {
    name: "VetDistribuidora S.A.",
    contactName: "Mariana Souza",
    phone: "(11) 97777-2222",
    email: "vendas@vetdistribuidora.com.br",
    address: "Av. Industrial, 456 - São Paulo - SP"
  });

  // 2. Cadastrar Itens no Estoque (Inventory)
  const itemId1 = await addTenantDoc("inventory", {
    name: "Vacina V10 Importada",
    purchasePrice: 35.00,
    salePrice: 90.00,
    quantity: 15,
    minQuantity: 5,
    unit: "dose",
    supplierId: supplierId2,
    location: "Geladeira 1"
  });

  const itemId2 = await addTenantDoc("inventory", {
    name: "Vacina Antirrábica",
    purchasePrice: 15.00,
    salePrice: 45.00,
    quantity: 20,
    minQuantity: 5,
    unit: "dose",
    supplierId: supplierId2,
    location: "Geladeira 1"
  });

  const itemId3 = await addTenantDoc("inventory", {
    name: "Shampoo Dermatológico 250ml",
    purchasePrice: 22.00,
    salePrice: 60.00,
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
    location: "Armário Clínico"
  });

  const itemId5 = await addTenantDoc("inventory", {
    name: "Antibiótico Synulox 50mg (10 cpr)",
    purchasePrice: 45.00,
    salePrice: 110.00,
    quantity: 12,
    minQuantity: 4,
    unit: "caixa",
    supplierId: supplierId2,
    location: "Armário Clínico"
  });

  // 3. Cadastrar Clientes (Tutores)
  const client1Id = await addTenantDoc("clients", {
    name: "Carlos Alberto Silva",
    email: "carlos@exemplo.com",
    phone: "(11) 98888-7777",
    cpf: "123.456.789-00",
    address: "Av. Paulista, 1000 - Bela Vista, São Paulo - SP"
  });

  const client2Id = await addTenantDoc("clients", {
    name: "Mariana Medeiros Costa",
    email: "mariana@exemplo.com",
    phone: "(11) 97777-6666",
    cpf: "987.654.321-11",
    address: "Rua Augusta, 500 - Consolação, São Paulo - SP"
  });

  const client3Id = await addTenantDoc("clients", {
    name: "Roberto de Souza",
    email: "roberto@exemplo.com",
    phone: "(21) 99999-8888",
    cpf: "456.789.123-22",
    address: "Av. Atlântica, 200 - Copacabana, Rio de Janeiro - RJ"
  });

  // 4. Cadastrar Pets
  const pet1Id = await addTenantDoc("pets", {
    name: "Thor",
    species: "Gato",
    breed: "Persa",
    birthDate: "2022-04-12",
    clientId: client1Id,
    photoUrl: "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&q=80&w=200",
    vaccines: [
      {
        name: "Vacina Tríplice Felina",
        dateAdministered: "2025-05-10",
        dateExpiration: "2026-05-10",
        status: "applied"
      }
    ],
    exams: [
      {
        name: "hemograma_thor.pdf",
        url: "data:application/pdf;base64,JVBERi0xLjQKJWRlZg==",
        type: "application/pdf",
        date: "2026-03-15T10:00:00.000Z"
      }
    ]
  });

  const pet2Id = await addTenantDoc("pets", {
    name: "Mel",
    species: "Cão",
    breed: "Golden Retriever",
    birthDate: "2020-09-18",
    clientId: client2Id,
    photoUrl: "https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&q=80&w=200",
    vaccines: [
      {
        name: "Vacina V10",
        dateAdministered: "2025-09-18",
        dateExpiration: "2026-09-18",
        status: "applied"
      },
      {
        name: "Vacina Antirrábica",
        dateAdministered: "2025-09-18",
        dateExpiration: "2026-09-18",
        status: "applied"
      }
    ],
    exams: []
  });

  // Criar perfis de vacina públicos correspondentes (para o QR Code)
  await setTenantDoc("pets", `${pet1Id}/publicProfile/vaccines`, {
    petName: "Thor",
    species: "Gato",
    breed: "Persa",
    photoUrl: "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&q=80&w=200",
    vaccines: [
      {
        name: "Vacina Tríplice Felina",
        dateAdministered: "2025-05-10",
        dateExpiration: "2026-05-10",
        status: "applied"
      }
    ]
  });

  await setTenantDoc("pets", `${pet2Id}/publicProfile/vaccines`, {
    petName: "Mel",
    species: "Cão",
    breed: "Golden Retriever",
    photoUrl: "https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&q=80&w=200",
    vaccines: [
      {
        name: "Vacina V10",
        dateAdministered: "2025-09-18",
        dateExpiration: "2026-09-18",
        status: "applied"
      },
      {
        name: "Vacina Antirrábica",
        dateAdministered: "2025-09-18",
        dateExpiration: "2026-09-18",
        status: "applied"
      }
    ]
  });

  const pet3Id = await addTenantDoc("pets", {
    name: "Luna",
    species: "Gato",
    breed: "SRD",
    birthDate: "2023-01-05",
    clientId: client2Id,
    photoUrl: "https://images.unsplash.com/photo-1533738363-b7f9aef128ce?auto=format&fit=crop&q=80&w=200",
    vaccines: [],
    exams: []
  });

  const pet4Id = await addTenantDoc("pets", {
    name: "Fred",
    species: "Cão",
    breed: "Bulldog Francês",
    birthDate: "2021-11-20",
    clientId: client3Id,
    photoUrl: "https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?auto=format&fit=crop&q=80&w=200",
    vaccines: [
      {
        name: "Vacina Antirrábica",
        dateAdministered: "2025-11-20",
        dateExpiration: "2026-11-20",
        status: "applied"
      }
    ],
    exams: []
  });

  await setTenantDoc("pets", `${pet4Id}/publicProfile/vaccines`, {
    petName: "Fred",
    species: "Cão",
    breed: "Bulldog Francês",
    photoUrl: "https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?auto=format&fit=crop&q=80&w=200",
    vaccines: [
      {
        name: "Vacina Antirrábica",
        dateAdministered: "2025-11-20",
        dateExpiration: "2026-11-20",
        status: "applied"
      }
    ]
  });

  // 5. Lançar Transações Financeiras Históricas
  // Lançar algumas despesas (saídas)
  await addTenantDoc("finance", {
    type: "expense",
    description: "Pagamento fornecedor - VetDistribuidora (Lote Vacinas)",
    amount: 525.00,
    date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    category: "Estoque",
    paymentMethod: "Boleto"
  });

  await addTenantDoc("finance", {
    type: "expense",
    description: "Aluguel da sala comercial da clínica",
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
    description: "Consulta e medicação de Thor",
    amount: 310.00,
    date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    category: "Consultas",
    paymentMethod: "PIX"
  });

  const transId2 = await addTenantDoc("finance", {
    type: "income",
    description: "Atendimento completo e vacinação da Mel",
    amount: 200.00,
    date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    category: "Consultas",
    paymentMethod: "Dinheiro"
  });

  await addTenantDoc("finance", {
    type: "income",
    description: "Venda avulsa: Shampoo Dermatológico e Antibiótico",
    amount: 170.00,
    date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    category: "Medicamentos",
    paymentMethod: "Cartão"
  });

  // 6. Cadastrar Prontuários Médicos (Records)
  // Prontuário 1 (Thor) - Já pago
  await addTenantDoc("records", {
    petId: pet1Id,
    date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    soap: {
      subjective: "Thor foi trazido pelo tutor Carlos com queixa de coceira e secreção marrom no ouvido esquerdo há 3 dias. Tutor relata que ele chacoalha muito a cabeça.",
      objective: "Frequência cardíaca: 140 bpm, Peso: 4.2kg, Temperatura: 38.6°C. Otoscopia revelou eritema importante no conduto auditivo externo esquerdo e secreção ceruminosa escura.",
      analysis: "Otite externa bilateral (mais acentuada à esquerda) de provável origem bacteriana ou fúngica secundária.",
      plan: "Limpeza do conduto com Otoguard e aplicação de Synulox 50mg por via oral de 12 em 12 horas por 7 dias. Retorno em 10 dias."
    },
    usedItems: [
      {
        itemId: itemId5,
        name: "Antibiótico Synulox 50mg (10 cpr)",
        quantity: 1,
        unit: "caixa",
        salePrice: 110.00
      }
    ],
    paymentStatus: "paid",
    financeTransactionId: transId1
  });

  // Prontuário 2 (Mel) - Já pago
  await addTenantDoc("records", {
    petId: pet2Id,
    date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    soap: {
      subjective: "Mel trazida por Mariana para consulta de rotina, pesagem e reforço anual de vacinas.",
      objective: "FC: 110 bpm, Peso: 28.5kg, Temp: 38.3°C. Mucosas coradas, linfonodos submandibulares normais. Sem outras alterações no exame físico geral.",
      analysis: "Animal saudável. Apto para imunização anual.",
      plan: "Administrada 1 dose de Vacina V10 Importada e 1 dose de Vacina Antirrábica. Tutor orientado a observar possíveis reações alérgicas nas primeiras 24h."
    },
    usedItems: [
      {
        itemId: itemId1,
        name: "Vacina V10 Importada",
        quantity: 1,
        unit: "dose",
        salePrice: 90.00
      },
      {
        itemId: itemId2,
        name: "Vacina Antirrábica",
        quantity: 1,
        unit: "dose",
        salePrice: 45.00
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
      subjective: "Fred foi trazido por Roberto com queixa de lambedura excessiva nas patas e vermelhidão entre os dígitos. Alimenta-se de ração comercial super premium.",
      objective: "FC: 120 bpm, Peso: 11.2kg, Temp: 38.5°C. Lesões eritematosas interdigitais com presença de saliva marrom nas 4 patas. Sem sinais de infecção profunda.",
      analysis: "Dermatite interdigital de contato ou hipersensibilidade alimentar secundária.",
      plan: "Realizar banhos semanais nas patas com Shampoo Dermatológico. Evitar passeios em gramados úmidos. Limpeza local diária com soro fisiológico. Retornar se não houver melhora."
    },
    usedItems: [
      {
        itemId: itemId3,
        name: "Shampoo Dermatológico 250ml",
        quantity: 1,
        unit: "frasco",
        salePrice: 60.00
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

  // 7. Agendamentos Clínicos (Appointments)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowDateStr = tomorrow.toISOString().split("T")[0];

  await addTenantDoc("appointments", {
    petId: pet2Id,
    clientId: client2Id,
    date: tomorrowDateStr,
    time: "10:00",
    description: "Retorno da Mel - Avaliação pós-vacinal",
    status: "scheduled",
    type: "Retorno"
  });

  const dayAfter = new Date();
  dayAfter.setDate(dayAfter.getDate() + 2);
  const dayAfterDateStr = dayAfter.toISOString().split("T")[0];

  await addTenantDoc("appointments", {
    petId: pet1Id,
    clientId: client1Id,
    date: dayAfterDateStr,
    time: "14:00",
    description: "Limpeza de tártaro sob anestesia",
    status: "scheduled",
    type: "Cirurgia"
  });
}

/**
 * Limpa todos os dados cadastrados na clínica ativa (tutores, pets, estoque, agendamentos, prontuários, financeiro, fornecedores).
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
