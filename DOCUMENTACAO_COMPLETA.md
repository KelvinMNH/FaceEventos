# 📘 Documentação Completa - UniEventos

Este documento unifica e atualiza todos os requisitos, manuais de infraestrutura e guias de operação do sistema UniEventos.

---

## 1. Requisitos e Regras de Negócio

### 1.1 Funcionalidades Principais
*   **Gestão de Eventos:** Criação, ativação e finalização de eventos com controle de status.
*   **Controle de Participantes:** Sincronização automática via API externa (CoopMais) e enriquecimento de dados.
*   **Acesso Biométrico:** Reconhecimento facial de alta precisão para entrada e saída.
*   **Acompanhantes:** Registro de acompanhantes vinculado a um participante responsável.
*   **Dashboard em Tempo Real:** Visualização de ocupação, gênero predominante, faixa etária e fluxo de horários.
*   **Logs de Auditoria:** Registro de todas as ações administrativas e tentativas de acesso.

### 1.2 Regras de Entrada e Saída
*   **Duplicidade:** O sistema impede a re-entrada de um participante que já possui uma entrada ativa no mesmo evento.
*   **Checkout em Cascata:** Ao registrar a saída de um participante, o sistema realiza automaticamente o checkout de todos os seus acompanhantes vinculados.
*   **Controle de Limites:** Eventos podem ter limite máximo de acompanhantes por participante.

---

## 2. Infraestrutura e Docker

O UniEventos foi migrado para uma arquitetura de containers, utilizando **Docker** e **Oracle Database**.

### 2.1 Requisitos de Ambiente
*   Docker e Docker Compose instalados.
*   Acesso à rede para sincronização com a API CoopMais.

### 2.2 Estrutura do Docker (`docker-compose.yml`)
O sistema é composto por 3 containers principais:
1.  **Backend:** Node.js API (Porta 3001).
2.  **Frontend:** Vite/React App servido via Nginx (Porta 80).
3.  **Base de Dados:** Oracle Database XE 21c (Porta 1521).

### 2.3 Como Iniciar
Para subir todo o ambiente, basta executar o script na raiz:
```bash
./iniciar-docker.bat
```
Ou manualmente via terminal:
```bash
docker-compose up -d --build
```

---

## 3. Guia de API (Endpoints Principais)

### 3.1 Autenticação
*   `POST /login`: Autentica usuário e retorna token JWT.
*   `GET /me`: Valida token e retorna dados do usuário logado.

### 3.2 Participantes
*   `GET /participantes/busca?q={termo}`: Busca participante por nome, CPF ou CRM (Case-insensitive).
*   `POST /participantes/:id/biometria`: Salva novo template facial.
*   `GET /participantes/sync/status`: Retorna detalhes da última sincronização automática.

### 3.3 Eventos e Acesso
*   `POST /scan`: Processa reconhecimento facial e registra entrada.
*   `POST /manual-entry`: Registra entrada via busca manual (sem biometria).
*   `POST /registrar-saida`: Realiza o checkout do participante e acompanhantes.
*   `GET /logs`: Retorna histórico detalhado de acessos.

---

## 4. Guia de Homologação e Testes

### 4.1 Validação de Migração
- [x] Conexão com Oracle Database.
- [x] Persistência de dados em volumes Docker.
- [x] Busca case-insensitive para CRMs e Nomes.
- [x] Padronização de CPFs (somente números).

### 4.2 Testes de Stress
O sistema foi validado para suportar sincronização de lotes com mais de 13.000 registros sem degradação de performance nas buscas manuais ou biométricas.

---

## 5. Manutenção

*   **Logs do Sistema:** Podem ser visualizados via `docker logs -f backend`.
*   **Banco de Dados:** O banco Oracle persiste os dados na pasta `./oracle_data` (mapeada no volume).
*   **Ambiente Local:** O arquivo `.env` deve estar configurado com `DB_DIALECT=oracle`.

---
*Atualizado em: 08/04/2026*
