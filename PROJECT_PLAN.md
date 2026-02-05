# Planejamento do Sistema de Controle de Acesso Biométrico - UniEventos

## 1. Arquitetura do Sistema

O sistema será composto por três módulos principais interconectados:

1.  **Frontend Web (React.js)**: Interface do usuário para visualização em tempo real dos acessos, dashboard e relatórios.
2.  **Backend API (Node.js/Express)**: Servidor central responsável pela lógica de negócios, gestão de eventos e persistência dos logs de acesso.
3.  **Biometric Bridge (Local Service - Node.js ou .NET)**: Aplicação desktop leve que roda na máquina conectada ao leitor Futronic. Ela captura o template e envia para o Backend (ou realiza validação local em cache).

### Fluxo de Dados:
`Leitor Futronic` -> `Bridge Local` -> `Backend API` -> `Banco de Dados` -> `Frontend Web (WebSocket/Polling)`

## 2. Modelagem do Banco de Dados (Sugestão PostgreSQL/MySQL)

### Tabela: `participantes` (Consulta/Leitura)
*Tabela espelho ou referência externa. O sistema assume que esta base já tem as biometrias.*
- `id` (PK, INT/UUID)
- `nome` (VARCHAR)
- `documento` (VARCHAR) - CPF ou RG
- `template_biometrico` (TEXT/BLOB) - Hash ou template da digital (ex: Base64 do FIR)
- `ativo` (BOOLEAN)

### Tabela: `eventos`
- `id` (PK, INT)
- `nome` (VARCHAR)
- `data_inicio` (DATETIME)
- `data_fim` (DATETIME)
- `status` (ENUM: 'agendado', 'em_andamento', 'finalizado')

### Tabela: `registros_acesso`
- `id` (PK, INT)
- `evento_id` (FK -> eventos)
- `participante_id` (FK -> participantes)
- `data_hora` (DATETIME)
- `tipo_acesso` (ENUM: 'entrada', 'saida')
- `status_validacao` (ENUM: 'sucesso', 'falha', 'nao_encontrado')
- `device_id` (VARCHAR) - Identificador da Bridge/Leitor

## 3. Estrutura de APIs (REST)

### Autenticação & Configuração
- `GET /api/status`: Verifica saúde do sistema.

### Eventos
- `GET /api/eventos`: Lista eventos ativos.
- `GET /api/eventos/:id/relatorio`: Dados para o relatório pós-evento.

### Validação e Acesso (Usado pela Bridge)
- `POST /api/acesso/validar`:
    - **Body**: `{ "evento_id": 1, "template": "BASE64...", "device_id": "gate_01" }`
    - **Response**: `{ "autorizado": true, "participante": { ... }, "mensagem": "Bem-vindo" }`

### Monitoramento (Usado pelo Frontend)
- `GET /api/acessos/ultimos?evento_id=1`: Polling para atualizar o modal de acesso em tempo real (ou via WebSocket).

## 4. Estrutura da Bridge Biométrica

A Bridge será um agente local.
- **Responsabilidade**: Carregar SDK Futronic (`FTRAPI.dll` ou similar), detectar dedo, capturar frame, extrair template.
- **Comunicação**: Envia requisição HTTP POST para o Backend com o template capturado.
- **Feedback**: Pode exibir LEDs ou bipar (se o hardware suportar) baseado na resposta da API.

## 5. Estratégia de Matching Biométrico

**Opção A (Servidor Central - Recomendada para < 5000 usuários)**:
- A Bridge envia o template (FIR/Minúcias) para o servidor.
- O Servidor carrega os templates do banco em memória (ou usa extensão de DB biométrico se houver) e realiza o "One-to-Many" matching.
- **Vantagem**: Segurança, centralização.
- **Desvantagem**: Latência de rede.

**Opção B (Match na Bridge - Baixa Latência)**:
- A Bridge baixa a lista de hashes/templates do evento no início.
- O Matching ocorre localmente na CPU do cliente.
- A Bridge envia apenas "Participante ID X Entrou".
- **Vantagem**: Extremamente rápido.
- **Desvantagem**: Sincronização de dados sensíveis para pontas locais.

*Adotaremos a Opção A inicialmente pela segurança e simplicidade da LGPD, armazenando templates apenas no servidor seguro.*

## 6. Estratégia de Relatórios

- Filtros: Por Evento, Por Horário, Por Tipo (Entrada/Saída).
- Exportação: CSV/PDF gerado no Backend.
- Dados: Quem foi, que horas entrou, que horas saiu (se houver saída), tempo de permanência.

---
**Próximos Passos no Desenvolvimento:**
1. Criar estrutura do projeto (Monorepo ou pastas separadas).
2. Configurar Backend Node.js básico.
3. Configurar Frontend React básico.
4. Criar simulação da Bridge (Script que "finge" ser o leitor enviando requests).
