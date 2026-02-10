# Projeto UniEventos - Documentação Técnica e Planejamento

## 1. Visão Geral
O **UniEventos** é uma solução completa para gestão de eventos e controle de acesso biométrico de alta performance. O sistema foi projetado para operar com leitores de impressão digital **Futronic FS80H**, oferecendo validação rápida, segura e resiliente a falhas de conexão.

---

## 2. Arquitetura do Sistema

O sistema opera em uma arquitetura de **Microserviços Locais**, dividida em três componentes principais que devem rodar simultaneamente:

### A. Backend (`/backend`)
*   **Tecnologia**: Node.js + Express + Sequelize.
*   **Banco de Dados**: Suporte híbrido a **SQLite** (Desenvolvimento/Local) e **Oracle** (Produção).
*   **Função**:
    *   API RESTful para o Frontend.
    *   Gestão de Participantes, Eventos e Logs.
    *   **Motor de Comparação Biométrica**: Utiliza a biblioteca `jimp` para realizar comparação visual ("Fuzzy Matching") entre a digital capturada e a armazenada, com tolerância configurável (atualmente 15%).

### B. Frontend (`/frontend`)
*   **Tecnologia**: React + Vite + CSS Moderno.
*   **Função**: Interface do usuário para operadores e participantes.
*   **Módulos**:
    *   **Painel de Controle**: Dashboard administrativo.
    *   **Recepção/Acesso**: Tela de validação com feedback em tempo real.
    *   **Totem**: Interface simplificada para autoatendimento.
    *   **Relatórios**: Geração de CSV e estatísticas.

### C. Biometric Bridge (`/bridge`)
*   **Tecnologia**: Node.js + Koffi (FFI) + WebSocket.
*   **Função**: Interage diretamente com o hardware (DLL do Futronic).
*   **Inovação**:
    *   Converte os dados RAW do leitor para Base64.
    *   Mantém conexão WebSocket persistente com o Frontend.
    *   Implementa **Auto-Reconnect** (detecta se o USB foi desconectado e recupera sozinho).

---

## 3. Fluxo de Dados (Biometria)

1.  **Captura**: O usuário coloca o dedo no leitor FS80H.
2.  **Processamento Local**: A `Bridge` detecta o dedo, captura o frame, e envia via WebSocket para o navegador (Frontend).
3.  **Envio**: O Frontend recebe a imagem e a envia via HTTP POST para a API do Backend (`/api/acesso/scan`).
4.  **Validação Inteligente (Backend)**:
    *   O Backend recupera todos os templates ativos do banco.
    *   Reconstrói as imagens usando `jimp`.
    *   Compara a imagem recebida com cada template.
    *   Se a diferença for menor que 15%, o acesso é liberado.

---

## 4. Funcionalidades Chave

### ✅ Controle de Acesso Inteligente
*   **Feedback Visual**: O operador vê em tempo real se o leitor está conectado ou se houve erro na leitura.
*   **Anti-Duplicidade**: O sistema impede que a mesma pessoa entre duas vezes consecutivas (configurável).
*   **Entrada Manual**: Opção de busca por Nome/CPF caso a biometria falhe.

### 📊 Relatórios Avançados
*   **Estatísticas em Tempo Real**: Gráficos de gênero, faixa etária e fluxo por hora.
*   **Exportação Híbrida**:
    *   **Relatório Geral**: Todos os acessos.
    *   **Relatório Manual**: Filtra apenas quem entrou sem biometria, facilitando auditoria.

### 🔄 Resiliência
*   O sistema foi desenhado para **não parar**. Se o leitor for desconectado, o software avisa mas não trava. Ao reconectar o USB, ele volta a funcionar automaticamente em segundos.

---

## 5. Estrutura de Pastas

```
UniEventos/
├── backend/            # API e Lógica de Negócios
│   ├── src/controllers # Lógica Biométrica (AcessoController.js)
│   ├── src/models      # Definição do Banco de Dados
│   └── server.js       # Ponto de entrada
├── frontend/           # Interface React
│   ├── src/pages       # Telas (ControleAcesso, Relatorio, etc)
│   └── src/components  # Componentes reutilizáveis
├── bridge/             # Driver Biométrico
│   ├── connector_futronic.js # Lógica de conexão USB
│   └── ftrScanAPI.dll  # Driver nativo (Windows)
└── README.md           # Guia de Instalação
```

---

## 6. Próximos Passos (Roadmap)

1.  **Otimização de Performance**: Migrar o "Fuzzy Matching" para C++ ou usar indexação se a base de usuários crescer acima de 5.000 (atualmente O(N) no Node.js).
2.  **Segurança**: Implementar criptografia ponta-a-ponta nos templates biométricos.
3.  **App Mobile**: Criar versão tablet para portaria móvel.
