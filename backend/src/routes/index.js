const express = require('express');
const router = express.Router();

const EventoController = require('../controllers/EventoController');
const AcessoController = require('../controllers/AcessoController');
const ParticipanteController = require('../controllers/ParticipanteController');

const AuthController = require('../controllers/AuthController');

// Rota de Login (Pública)
router.post('/login', AuthController.login);

// Rota para validar sessão e obter dados do usuário (Protegida)
router.get('/me', AuthController.verifyToken, AuthController.me);

// Rotas de Eventos
router.get('/eventos', AuthController.verifyToken, EventoController.listar);
router.post('/eventos', AuthController.verifyToken, AuthController.requireAdmin, EventoController.criar); // Admin only
router.post('/eventos/:uuid/ativar', AuthController.verifyToken, EventoController.ativar);
router.post('/eventos/:uuid/finalizar', AuthController.verifyToken, AuthController.requireAdmin, EventoController.finalizar); 
router.get('/evento-ativo', AuthController.verifyToken, EventoController.getAtivo);
router.get('/eventos/:uuid', AuthController.verifyToken, EventoController.buscarPorUuid);
router.put('/eventos/:uuid', AuthController.verifyToken, AuthController.requireAdmin, EventoController.atualizar);
router.delete('/eventos/:uuid', AuthController.verifyToken, AuthController.requireAdmin, EventoController.excluir);

// Rotas de Acesso
router.post('/scan', AuthController.verifyToken, AcessoController.scan);
router.post('/simulate', AuthController.verifyToken, AcessoController.simulate);
router.post('/manual-entry', AuthController.verifyToken, AcessoController.manualEntry);
// router.post('/cadastrar-entrada', AuthController.verifyToken, AcessoController.cadastrarEntrada); // Desabilitado - participantes agora apenas via integração API Sync
router.post('/renovar-biometria', AuthController.verifyToken, AcessoController.renovarBiometriaEEntrar);
router.post('/registrar-saida', AuthController.verifyToken, AcessoController.registrarSaida);
router.post('/biometria/comparar', AuthController.verifyToken, AcessoController.compare);
router.get('/biometria/candidatos', AuthController.verifyToken, AcessoController.candidates);
router.get('/logs', AuthController.verifyToken, AcessoController.getLogs);

// Rotas de Participantes
router.get('/participantes/busca', AuthController.verifyToken, ParticipanteController.buscar);
router.get('/participantes', AuthController.verifyToken, ParticipanteController.listar);
router.post('/registrar-acompanhante', AuthController.verifyToken, ParticipanteController.registrarAcompanhante);

// Rotas de Sincronização de Participantes
router.get('/participantes/sync/status', AuthController.verifyToken, ParticipanteController.syncStatus);
router.post('/participantes/sync', AuthController.verifyToken, AuthController.requireAdmin, ParticipanteController.forceSync);
router.get('/participantes/enriquecimento/status', AuthController.verifyToken, ParticipanteController.enriquecimentoStatus);

// Rotas CRUD de Participantes (Admin Only)
// (Criação e edição manual desabilitadas para garantir que dados venham estritamente da Sync API)
router.post('/participantes/:id/biometria', AuthController.verifyToken, AuthController.requireAdmin, ParticipanteController.atualizarBiometria);
router.delete('/participantes/:id/biometria', AuthController.verifyToken, AuthController.requireAdmin, ParticipanteController.limparBiometria);

// Status (Público)
router.get('/status', (req, res) => res.json({ online: true, time: new Date() }));

module.exports = router;
