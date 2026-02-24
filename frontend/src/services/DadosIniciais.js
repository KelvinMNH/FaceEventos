const EVENTS = [
    {
        id: 1,
        nome: 'Congresso de Tecnologia 2026',
        data_inicio: '2026-05-20',
        hora_inicio: '09:00',
        local: 'Centro de Convenções',
        imagem: null,
        status: 'ativo',
        permitir_acompanhantes: false,
        max_acompanhantes: 0,
        descricao: 'Um evento imperdível sobre as tendências tecnológicas para o futuro.',
        organizador: 'Departamento de TI',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    },
    {
        id: 2,
        nome: 'Workshop de IA Generativa',
        data_inicio: '2025-11-15',
        hora_inicio: '14:00',
        local: 'Sala 3B',
        imagem: null,
        status: 'finalizado',
        permitir_acompanhantes: true,
        max_acompanhantes: 1,
        descricao: 'Workshop prático sobre criação de prompts e uso de LLMs.',
        organizador: 'Grupo de Pesquisa em IA',
        createdAt: new Date('2025-10-01').toISOString(),
        updatedAt: new Date('2025-11-16').toISOString()
    },
    {
        id: 3,
        nome: 'Feira de Inovação 2025',
        data_inicio: '2025-09-10',
        hora_inicio: '10:00',
        local: 'Pátio Central',
        imagem: null,
        status: 'finalizado',
        permitir_acompanhantes: true,
        max_acompanhantes: 3,
        descricao: 'Exposição de projetos inovadores dos alunos de engenharia.',
        organizador: 'Coordenação de Engenharia',
        createdAt: new Date('2025-08-01').toISOString(),
        updatedAt: new Date('2025-09-11').toISOString()
    },
    {
        id: 4,
        nome: 'Semana Acadêmica de Design',
        data_inicio: '2025-04-05',
        hora_inicio: '19:00',
        local: 'Auditório Principal',
        imagem: null,
        status: 'finalizado',
        permitir_acompanhantes: false,
        max_acompanhantes: 0,
        descricao: 'Palestras com grandes nomes do design nacional.',
        organizador: 'Centro Acadêmico de Design',
        createdAt: new Date('2025-03-01').toISOString(),
        updatedAt: new Date('2025-04-06').toISOString()
    }
];

// Gerador de Participantes
const generateParticipants = (count) => {
    const parts = [];
    const names = [
        'Ana', 'Bruno', 'Carla', 'Daniel', 'Eduarda', 'Felipe', 'Gabriela', 'Hugo', 'Inês', 'João',
        'Karina', 'Lucas', 'Mariana', 'Nicolas', 'Olivia', 'Pedro', 'Quezia', 'Rafael', 'Sara', 'Tiago',
        'Ursula', 'Vinicius', 'Wanessa', 'Xavier', 'Yasmim', 'Zeca', 'Alice', 'Bernardo', 'Cecília', 'Davi'
    ];
    const surnames = [
        'Silva', 'Santos', 'Oliveira', 'Souza', 'Rodrigues', 'Ferreira', 'Alves', 'Pereira', 'Lima', 'Gomes',
        'Costa', 'Ribeiro', 'Martins', 'Carvalho', 'Almeida', 'Lopes', 'Soares', 'Fernandes', 'Vieira', 'Barbosa'
    ];

    for (let i = 1; i <= count; i++) {
        const name = `${names[Math.floor(Math.random() * names.length)]} ${surnames[Math.floor(Math.random() * surnames.length)]}`;

        // Gerar CPF válido (apenas formato)
        const cpf = `${Math.floor(Math.random() * 900) + 100}.${Math.floor(Math.random() * 900) + 100}.${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 90) + 10}`;

        parts.push({
            id: i,
            nome: name,
            documento: cpf,
            cpf: cpf,
            matricula: `202${Math.floor(Math.random() * 5)}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
            genero: Math.random() > 0.5 ? 'M' : 'F',
            data_nascimento: `199${Math.floor(Math.random() * 9)}-${Math.floor(Math.random() * 11) + 1}-${Math.floor(Math.random() * 28) + 1}`,
            foto: null,
            template_biometrico: i <= 5 ? `bio_${i}` : null, // Apenas alguns com bio simulada
            createdAt: new Date('2025-01-01').toISOString(),
            updatedAt: new Date('2025-01-01').toISOString()
        });
    }
    return parts;
};

const PARTICIPANTS = generateParticipants(40); // 40 participantes totais

// Gerar logs para os eventos passados
const generateLogs = () => {
    const logs = [];
    let logId = 1;

    // Eventos passados: ids 2, 3, 4
    const finishedEvents = EVENTS.filter(e => e.status === 'finalizado');

    finishedEvents.forEach(evento => {
        // Selecionar 10 participantes aleatórios para cada evento
        // Embaralhar participantes
        const shuffled = [...PARTICIPANTS].sort(() => 0.5 - Math.random());
        const selected = shuffled.slice(0, 10);

        const eventDate = new Date(evento.data_inicio + 'T' + evento.hora_inicio);

        selected.forEach(p => {
            // Random time around start time (up to 30 mins before or after)
            const timeOffset = (Math.random() * 60 - 30) * 60000;
            const logTime = new Date(eventDate.getTime() + timeOffset);

            logs.push({
                id: logId++,
                ParticipanteId: p.id,
                EventoId: evento.id,
                data_hora: logTime.toISOString(),
                status_validacao: 'sucesso',
                createdAt: logTime.toISOString(),
                updatedAt: logTime.toISOString()
            });
        });
    });

    return logs;
};

const LOGS = generateLogs();

export const SEED_DATA = {
    eventos: EVENTS,
    participantes: PARTICIPANTS,
    logs: LOGS
};
