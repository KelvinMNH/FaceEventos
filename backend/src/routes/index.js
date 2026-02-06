const express = require('express');
const router = express.Router();

const EventoController = require('../controllers/EventoController');
const AcessoController = require('../controllers/AcessoController');
const ParticipanteController = require('../controllers/ParticipanteController');

const AuthController = require('../controllers/AuthController');

// Rota de Login (Pública)
router.post('/login', AuthController.login);

// Rotas de Eventos
router.get('/eventos', AuthController.verifyToken, EventoController.listar);
router.post('/eventos', AuthController.verifyToken, AuthController.requireAdmin, EventoController.criar); // Admin only
router.post('/eventos/:id/ativar', AuthController.verifyToken, EventoController.ativar);
router.post('/eventos/:id/finalizar', AuthController.verifyToken, EventoController.finalizar); // Finalizar requer token (confirmação será logica no front/back)
router.get('/evento-ativo', AuthController.verifyToken, EventoController.getAtivo);

// Rotas de Acesso (Algumas podem precisar de token se o totem for autenticado, por hora vamos proteger tudo que é "sistema")
// Scan e Simulate geralmente são públicos ou token de maquina, mas aqui é web, então protege.
router.post('/scan', AuthController.verifyToken, AcessoController.scan);
router.post('/simulate', AuthController.verifyToken, AcessoController.simulate);
router.post('/manual-entry', AuthController.verifyToken, AcessoController.manualEntry);
router.post('/cadastrar-entrada', AuthController.verifyToken, AcessoController.cadastrarEntrada);
router.post('/registrar-saida', AuthController.verifyToken, AcessoController.registrarSaida);
router.get('/logs', AuthController.verifyToken, AcessoController.getLogs);

// Rotas de Participantes
router.get('/participantes/busca', AuthController.verifyToken, ParticipanteController.buscar);
router.get('/participantes', AuthController.verifyToken, ParticipanteController.listar);
router.post('/registrar-acompanhante', AuthController.verifyToken, ParticipanteController.registrarAcompanhante);

// Status (Público)
router.get('/status', (req, res) => res.json({ online: true, time: new Date() }));

module.exports = router;
