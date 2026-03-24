# Documentação da API - UniEventos

Esta documentação descreve os endpoints RESTful disponíveis no backend do UniEventos gerados pelo Express. Todas as rotas (exceto autenticação) exigem o envio de um **Token JWT** no header `Authorization: Bearer <token>`.

A URL base padrão local é `http://localhost:3000/api`.

---

##  1. Autenticação

### `POST /login`
*   **Descrição:** Autentica um usuário no sistema e devolve um token JWT.
*   **Acesso:** Público
*   **Body (JSON):**
    ```json
    {
      "username": "admin",
      "password": "sua-senha"
    }
    ```
*   **Retorno Sucesso (200):** `{ "token": "eyJhb...", "user": { "id": 1, "role": "admin" } }`

---

##  2. Eventos

### `GET /eventos`
*   **Descrição:** Retorna a lista de todos os eventos cadastrados.
*   **Acesso:** Protegido (Requer JWT)
*   **Retorno Sucesso (200):** Array de objetos `Evento`.

### `POST /eventos`
*   **Descrição:** Cria um novo evento.
*   **Acesso:** Protegido (Requer JWT de **Admin**)
*   **Body:** Dados do evento (nome, data, hora, etc).

### `GET /evento-ativo`
*   **Descrição:** Retorna os detalhes do evento que está atualmente marcado como ativo (ocorrendo no momento).
*   **Acesso:** Protegido (Requer JWT)

### `GET /eventos/:id`
*   **Descrição:** Retorna os detalhes de um evento específico pelo ID.
*   **Acesso:** Protegido (Requer JWT)

### `POST /eventos/:id/ativar`
*   **Descrição:** Define o evento especificado como o único evento "ativo" no sistema para recepção.
*   **Acesso:** Protegido (Requer JWT)

### `POST /eventos/:id/finalizar`
*   **Descrição:** Encerra o evento. Após isso, o sistema pode registrar saídas automáticas para fechamento de relatórios.
*   **Acesso:** Protegido (Requer JWT)

### `DELETE /eventos/:id`
*   **Descrição:** Exclui permanentemente um evento e todos os seus logs associados.
*   **Acesso:** Protegido (Requer JWT de **Admin**)

---

##  3. Acesso e Catraca (Biometria)

### `POST /scan`
*   **Descrição:** Registra a tentativa de acesso facial. Recebe o `identified_id` (se reconhecido pelo frontend) ou `force_match_id`.
*   **Acesso:** Protegido (Requer JWT)
*   **Body (JSON):**
    ```json
    { "imagemBase64": "iVBORw0KGgo..." }
    ```
*   **Retorno:** Liberação do acesso (Sucesso) ou bloqueio.

### `POST /cadastrar-entrada`
*   **Descrição:** Efetiva o registro de entrada após uma validação biométrica bem sucedida para novos usuários não mapeados inicialmente (Cadastro Rápido).
*   **Acesso:** Protegido (Requer JWT)

### `POST /manual-entry`
*   **Descrição:** Força a entrada de um participante de forma manual (bypass de biometria). Muito usado quando o reconhecimento facial falha sistematicamente ou o participante não possui biometria cadastrada.
*   **Acesso:** Protegido (Requer JWT)

### `POST /registrar-saida`
*   **Descrição:** Registra a saída de um participante do evento ativo.
*   **Acesso:** Protegido (Requer JWT)

### `GET /logs`
*   **Descrição:** Retorna todo o histórico de tentativas de acesso, entradas, saídas, autorizações e negações. Utilizado pela tela de Relatórios.
*   **Acesso:** Protegido (Requer JWT)

### `POST /simulate` (Dev Only)
*   **Descrição:** Rota utilizada para testes de desenvolvimento para simular um acesso sem a necessidade física de biometria ou câmera.

---

##  4. Participantes

### `GET /participantes`
*   **Descrição:** Lista todos os participantes cadastrados no banco unificado.
*   **Acesso:** Protegido (Requer JWT)

### `GET /participantes/busca`
*   **Descrição:** Busca participantes usando query strings (ex: `?cpf=...` ou `?nome=...`). Útil para entrada manual na catraca.
*   **Acesso:** Protegido (Requer JWT)

### `POST /registrar-acompanhante`
*   **Descrição:** Vincula um acompanhante a um participante títular e registra a entrada dele no evento ativo.
*   **Acesso:** Protegido (Requer JWT)

---

##  5. Saúde do Sistema

### `GET /status`
*   **Descrição:** Rota de Heartbeat. Verifica se o backend Node.js está online e respondendo.
*   **Acesso:** Público
*   **Retorno Sucesso (200):** `{ "online": true, "time": "2026-02-26T12:00:00.000Z" }`

---

**Software de autoria de Kelvin Higino**  
Para contato, acesse: [kelvinti.pages.dev](https://kelvinti.pages.dev)
