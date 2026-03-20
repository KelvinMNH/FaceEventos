# Requisitos Funcionais - UniEventos

Este documento detalha as funcionalidades e regras de negócio do sistema UniEventos, extraídas via análise técnica do código-fonte (Backend Node.js e Frontend React).

---

## 1. Gestão de Eventos

- **RF01 - Cadastro de Eventos**: Permite criar eventos com Nome, Local, Data/Hora e Imagem de Capa (Banner/Logo).
- **RF02 - Configuração de Regras do Evento**: Cada evento possui configurações independentes de regras de acesso, como "Habilitar Check-out" (Saída) e "Permitir Acompanhantes" (com definição de limite máximo por participante).
- **RF03 - Simultaneidade**: Suporte nativo a múltiplos eventos ativos ao mesmo tempo. Cada evento possui um UUID único que isola logs, participantes e estatísticas.
- **RF04 - Evento Finalizado (Relatório)**: Ao finalizar um evento, o sistema gera uma saída automática virtual para todos que não fizeram check-out, permitindo o cálculo do tempo médio de permanência e auditoria completa dos logs.
- **RF05 - Auditoria de Eventos**: O sistema registra no banco de dados (LogAuditoria) quem criou, editou ou excluiu um evento.

## 2. Gestão de Participantes e Acompanhantes

- **RF06 - Gestão e Detalhes de Participantes**: Interface completa para visualização de dados detalhados (CPF, CRM, Nome, Especialidade, Empresa) e busca multi-critério. Permite a gestão individual de cada perfil cadastrado na base.
- **RF07 - Saúde da Base (Enriquecimento)**: O sistema monitora a qualidade dos dados (Gênero, Data de Nascimento, Especialidade) e exibe um percentual de "Saúde da Base" no Dashboard.
- **RF08 - Gestão de Acompanhantes**: Registro de convidados vinculados a um participante responsável.
- **RF09 - Limite de Acompanhantes**: O sistema valida o limite máximo definido nas configurações do evento (campo max_acompanhantes).
- **RF10 - Sincronização Corporativa**: Interface para monitorar a integração automática com a base da Unimed (novos cadastros, modificações e inativações).

## 3. Reconhecimento Facial e Biometria

- **RF11 - Captura e Manutenção de Biometria**: Interface integrada à gestão de participantes para Captura, Atualização ou Exclusão do template biométrico facial via Webcam, permitindo o pré-cadastro antes do início dos eventos.
- **RF12 - Identificação em Tempo Real**: No painel Controle de Acesso, o sistema identifica rostos automaticamente e valida contra a base de dados em milissegundos.
- **RF13 - Feedback Visual Estendido**: Balões flutuantes seguem a cabeça do usuário na tela de acesso para indicar status (Identificado, Já Entrou, Não Cadastrado).
- **RF14 - Renovação Biométrica**: No momento da entrada, o operador pode "Renovar Biometria" de um participante cujo template esteja desatualizado ou com falha.
- **RF15 - Privacidade (DLP/LGPD)**: Função explícita para "Limpar Biometria", removendo permanentemente a foto e o template do banco de dados a pedido do usuário.

## 4. Controle de Acesso e Check-out

- **RF16 - Entrada Manual e Localização por Nome**: O sistema permite o registro de acesso sem a necessidade de biometria facial, através da busca manual por Nome, CPF ou CRM, servindo como alternativa padrão para participantes sem cadastro biométrico ou restrições técnicas.
- **RF17 - Registro de Novo Participante na Portaria**: Possibilidade de realizar o cadastro rápido de um participante diretamente na tela de controle de acesso para liberação imediata.
- **RF18 - Check-out (Saída)**: Registro de saída via Totem ou Painel de Controle para controle de ocupação.
- **RF19 - Check-out em Cascata**: Ao registrar a saída de um responsável, o sistema realiza o checkout automático de todos os seus acompanhantes vinculados.

## 5. Dashboards e Relatórios

- **RF20 - Ocupação em Tempo Real**: Monitoramento constante de (Entradas - Saídas) para controle de capacidade do local.
- **RF21 - Perfil Demográfico**: Estatísticas automáticas de Gênero Predominante e Faixas Etárias (18-25, 26-35, 36-50, 50+).
- **RF22 - Gráfico de Fluxo Horário**: Visualização dinâmica (SVG) das entradas distribuídas por hora.
- **RF23 - Exportação CSV (Full)**: Botão no relatório para exportar a lista completa de participantes, incluindo horários, permanência e acompanhantes.
- **RF24 - Exportação CSV (Exceção)**: Botão específico para exportar apenas os registros de entrada realizados sem biometria (entradas manuais).

---

## Regras de Negócio (RN)

1. **RN01 (Vínculo)**: Um acompanhante só pode ter sua entrada registrada se o seu respectivo responsável estiver presente.
2. **RN02 (Isolamento)**: Dados biométricos são globais; logs de acesso são por EventoId.
3. **RN03 (Inativação)**: Participantes inativos bloqueiam novos acessos.
4. **RN04 (Calculo de Permanência)**: Para eventos finalizados, a permanência é calculada com base no log de entrada e na data de encerramento do evento (saída virtual).
5. **RN05 (Re-entrada)**: Uma vez realizado o checkout, a re-entrada depende da configuração de segurança do evento (padrão: bloqueado).
6. **RN06 (Flexibilidade de Identificação)**: O uso de biometria facial é o método preferencial de identificação, mas não é obrigatório. O sistema garante total funcionalidade (logs, estatísticas e relatórios) para entradas realizadas via localização manual.

---
*Documento gerado em 20/03/2026 com base na análise do repositório UniEventos.*
