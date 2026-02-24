# FaceEventos - Sistema de Controle de Acesso por Reconhecimento Facial

Sistema web funcional de controle de acesso a eventos com reconhecimento facial em tempo real, desenvolvido integralmente no navegador sem necessidade de backend.

## Visão Geral

O sistema utiliza a câmera do dispositivo para identificar participantes cadastrados por biometria facial. Ao detectar um rosto reconhecido, o acesso é registrado automaticamente com data e hora de entrada. Todos os dados são persistidos no `localStorage` do navegador.

Para fins de apresentação, existe um botão "Simular" na tela de controle de acesso que gera entradas aleatórias a partir dos participantes cadastrados. Esse recurso é apenas auxiliar — o fluxo principal opera com reconhecimento facial real via câmera.

## Tecnologias

- React + Vite
- face-api.js — detecção e reconhecimento facial via TensorFlow.js no navegador
- LocalStorage — persistência de dados sem servidor
- Vanilla CSS

## Arquitetura

```
Câmera do Dispositivo
        |
   face-api.js (TensorFlow.js no navegador)
        |
   ServicoArmazenamento.js (LocalStorage)
        |
   Interface React (Vite)
```

## Estrutura do Projeto

```
frontend/
  src/
    pages/
      ListaEventos.jsx          # Listagem e ativação de eventos
      CriarEvento.jsx           # Formulário de criação de evento
      ControleAcesso.jsx        # Tela principal com câmera e dashboard
      CadastroParticipante.jsx  # Cadastro biométrico facial
      ListaParticipantes.jsx    # Listagem, edição e exclusão de participantes
      RelatorioEvento.jsx       # Logs de acesso e exportação CSV
    components/
      Navbar.jsx
      ModalConfirmacao.jsx
      ModalMensagem.jsx
    services/
      ServicoArmazenamento.js   # CRUD e lógica de negócio via LocalStorage
      DadosIniciais.js          # Dados de seed para primeira execução
```

## Fluxo de Controle de Acesso

1. Evento é criado e ativado na tela de listagem.
2. Participantes são cadastrados com captura de foto via câmera. O `face-api.js` extrai um descritor facial de 128 dimensões e salva no `localStorage`.
3. Na tela de controle de acesso, a câmera detecta rostos continuamente.
4. Ao detectar um rosto, o descritor é comparado com todos os descritores cadastrados usando distância euclidiana (threshold: 0.55).
5. Se reconhecido e ainda não registrado no evento: grava o log de acesso e exibe modal de confirmação.
6. Se reconhecido mas já registrado: exibe apenas um toast discreto sem gravar novo log, preservando o horário original de entrada.

## Funcionalidades

- Gestão de eventos (criar, listar, ativar, finalizar)
- Cadastro de participantes com biometria facial via câmera
- Reconhecimento facial em tempo real
- Registro de acesso com horário de entrada fixo (imutável após primeiro acesso)
- Prevenção de duplo registro no mesmo evento
- Dashboard com estatísticas em tempo real (total, gênero, faixa etária)
- Lista de participantes presentes com horário de entrada
- Busca na lista de entradas
- Registro manual de acesso por nome ou documento
- Relatório de acessos com exportação CSV
- Layout responsivo (desktop e mobile)
- Botão de simulação para demonstração sem câmera

## Como Executar

Pré-requisito: Node.js instalado.

```bash
cd frontend
npm install
npm run dev
```

Acesse em `http://localhost:5173`.

## Observações

- Os dados ficam armazenados no `localStorage` do navegador. Limpar o cache do navegador remove todos os registros.
- O reconhecimento facial é processado localmente, sem envio de dados para servidores externos.
- Para melhor precisão na identificação, recomenda-se boa iluminação no momento do cadastro e do acesso.

## Autor

Desenvolvido por Kelvin Higino.
