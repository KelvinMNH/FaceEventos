import { SEED_DATA } from './SeedData';

const KEYS = {
    EVENTOS: 'unieventos_eventos',
    PARTICIPANTES: 'unieventos_participantes',
    LOGS: 'unieventos_logs'
};

class LocalStorageService {
    constructor() {
        this.init();
    }

    init() {
        if (!localStorage.getItem(KEYS.EVENTOS)) {
            localStorage.setItem(KEYS.EVENTOS, JSON.stringify(SEED_DATA.eventos));
        }
        if (!localStorage.getItem(KEYS.PARTICIPANTES)) {
            localStorage.setItem(KEYS.PARTICIPANTES, JSON.stringify(SEED_DATA.participantes));
        }
        if (!localStorage.getItem(KEYS.LOGS)) {
            localStorage.setItem(KEYS.LOGS, JSON.stringify(SEED_DATA.logs));
        }
    }

    // --- Helpers ---
    _get(key) {
        return JSON.parse(localStorage.getItem(key) || '[]');
    }

    _set(key, data) {
        localStorage.setItem(key, JSON.stringify(data));
    }

    _generateId(collection) {
        const items = this._get(collection);
        return items.length > 0 ? Math.max(...items.map(i => i.id)) + 1 : 1;
    }

    // --- Eventos ---
    getEventos() {
        return this._get(KEYS.EVENTOS);
    }

    createEvento(eventoData) {
        const eventos = this._get(KEYS.EVENTOS);
        const newEvento = {
            id: this._generateId(KEYS.EVENTOS),
            ...eventoData,
            status: 'agendado', // Default
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        eventos.push(newEvento);
        this._set(KEYS.EVENTOS, eventos);
        return newEvento;
    }

    ativarEvento(id) {
        const eventos = this._get(KEYS.EVENTOS);
        const updatedEventos = eventos.map(e => ({
            ...e,
            status: e.id === id ? 'ativo' : (e.status === 'ativo' ? 'finalizado' : e.status), // Desativa outros ativos
            updatedAt: new Date().toISOString()
        }));
        this._set(KEYS.EVENTOS, updatedEventos);
        return updatedEventos.find(e => e.id === id);
    }

    getEventoAtivo() {
        const eventos = this._get(KEYS.EVENTOS);
        return eventos.find(e => e.status === 'ativo');
    }

    finalizarEvento(id) {
        const eventos = this._get(KEYS.EVENTOS);
        const updatedEventos = eventos.map(e =>
            e.id === id ? { ...e, status: 'finalizado', updatedAt: new Date().toISOString() } : e
        );
        this._set(KEYS.EVENTOS, updatedEventos);
        return true;
    }

    // --- Participantes ---
    getParticipantes(page = 1, limit = 20) {
        const participantes = this._get(KEYS.PARTICIPANTES);
        const total = participantes.length;
        const totalPages = Math.ceil(total / limit);
        const start = (page - 1) * limit;
        const end = start + limit;
        const data = participantes.slice(start, end);
        return { data, total, totalPages, page };
    }

    buscarParticipantes(query) {
        if (!query) return [];
        const participantes = this._get(KEYS.PARTICIPANTES);
        const q = query.toLowerCase();
        return participantes.filter(p =>
            (p.nome && p.nome.toLowerCase().includes(q)) ||
            (p.matricula && p.matricula.includes(query)) ||
            (p.documento && p.documento.includes(query))
        );
    }

    createParticipante(participanteData) {
        const participantes = this._get(KEYS.PARTICIPANTES);

        // Check duplicidade CPF
        if (participanteData.cpf) {
            const exists = participantes.find(p => p.cpf === participanteData.cpf);
            if (exists) throw new Error('CPF já cadastrado');
        }

        const newParticipante = {
            id: this._generateId(KEYS.PARTICIPANTES),
            ...participanteData,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        participantes.push(newParticipante);
        this._set(KEYS.PARTICIPANTES, participantes);
        return newParticipante;
    }

    updateParticipante(id, data) {
        const participantes = this._get(KEYS.PARTICIPANTES);
        const index = participantes.findIndex(p => p.id === id);
        if (index === -1) throw new Error('Participante não encontrado');

        const updatedParticipante = { ...participantes[index], ...data, updatedAt: new Date().toISOString() };
        participantes[index] = updatedParticipante;
        this._set(KEYS.PARTICIPANTES, participantes);
        return updatedParticipante;
    }

    deleteParticipante(id) {
        const participantes = this._get(KEYS.PARTICIPANTES);
        const filtered = participantes.filter(p => p.id !== id);
        this._set(KEYS.PARTICIPANTES, filtered);
        return true;
    }

    // --- Logs / Biometria ---
    getLogs(eventoId = null) {
        const logs = this._get(KEYS.LOGS);
        // Join with Participante info
        const participantes = this._get(KEYS.PARTICIPANTES);
        const enrichedLogs = logs.map(log => {
            const participante = participantes.find(p => p.id === log.ParticipanteId);
            return { ...log, Participante: participante }; // Add full participant object
        });

        if (eventoId) {
            return enrichedLogs.filter(l => l.EventoId == eventoId); // Loose equality for string/number match
        }
        // Return sorted by recent first
        return enrichedLogs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    registrarAcesso(participanteId, eventoId, status = 'sucesso') {
        const logs = this._get(KEYS.LOGS);
        const newLog = {
            id: this._generateId(KEYS.LOGS),
            ParticipanteId: participanteId,
            EventoId: eventoId,
            data_hora: new Date().toISOString(),
            status_validacao: status,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        logs.push(newLog);
        this._set(KEYS.LOGS, logs);

        // Return enriched log
        const participantes = this._get(KEYS.PARTICIPANTES);
        const p = participantes.find(p => p.id === participanteId);
        return { ...newLog, Participante: p, access_id: newLog.id };
    }

    // Simulação Biometria
    validarBiometria(descriptor, eventoId) {
        // Na prática, comparar descriptors reais no browser é pesado (euclidian distance).
        // Aqui vamos simplificar: se o descriptor for igual a string salva (simulação) OU 
        // se tivermos enviado um ID específico "simulado".

        // Como o descriptor vem do face-api array, vamos tentar achar alguém com biometria cadastrada.
        // Numa demo real browser-only, poderíamos usar face-api.euclideanDistance se tivessimos todos os descriptors carregados.

        // SIMPLIFICAÇÃO PARA PORTFOLIO:
        // Vamos assumir que qualquer rosto detectado é válido SE for muito parecido com o último cadastrado (para teste)
        // OU, para ser mais robusto: Vamos retornar "Não Encontrado" a menos que use o botão "Simular Acesso" com ID conhecido.

        // Mas a UI chama /biometria/validar passando o descriptor real do face-api.
        // Vamos tentar encontrar alguém com biometria.

        const participantes = this._get(KEYS.PARTICIPANTES);
        // Filtrar quem tem biometria
        const comBiometria = participantes.filter(p => p.template_biometrico);

        // Se não tiver ninguém, retorna false
        if (comBiometria.length === 0) return { authorized: false };

        // Mock de verificação:
        // Se estamos passando uma string "bio_kelvin_123" (simulação manual), achamos pelo exato match.
        // Se estamos passando um array (face-api), NÂO vamos conseguir match real sem a lib completa aqui.
        // DECISÃO: O `descriptor` que chega aqui via face-api.js é um Array(128).
        // Vamos apenas retornar aleatório ou fixo para demo? Não, seria ruim.

        // MELHOR: Vamos salvar o descriptor no localStorage como string JSON.
        // E aqui, vamos fazer loop e calcular distância euclidiana simples?
        // Sim, é possível.

        let match = null;
        const descriptorArr = Array.isArray(descriptor) ? descriptor : Object.values(descriptor);

        // Se for string de simulação
        if (typeof descriptor === 'string' && descriptor.startsWith('bio_')) {
            match = comBiometria.find(p => p.template_biometrico === descriptor);
        }
        // Se for array numérico (real face-api)
        else if (Array.isArray(descriptorArr) && descriptorArr.length > 0) {
            // Tentar encontrar alguém com distância < 0.6 (threshold padrão)
            // Precisamos parsear os templates salvos
            match = comBiometria.find(p => {
                try {
                    const saved = JSON.parse(p.template_biometrico);
                    if (Array.isArray(saved)) {
                        const dist = this.euclideanDistance(descriptorArr, saved);
                        return dist < 0.55; // Threshold um pouco mais estrito
                    }
                } catch (e) { return false; }
                return false;
            });
        }

        if (match) {
            return {
                authorized: true,
                participante: match,
                access_id: this.registrarAcesso(match.id, eventoId, 'sucesso').id
            };
        }

        return { authorized: false, access_id: this.registrarAcesso(null, eventoId, 'nao_encontrado').id };
    }

    euclideanDistance(arr1, arr2) {
        if (arr1.length !== arr2.length) return 1.0;
        return Math.sqrt(arr1.reduce((sum, val, i) => sum + Math.pow(val - arr2[i], 2), 0));
    }
}

export const db = new LocalStorageService();
