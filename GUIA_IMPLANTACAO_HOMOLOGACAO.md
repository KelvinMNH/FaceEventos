# Guia de Implantação - Ambiente de Homologação (UniEventos)

Este documento fornece as instruções necessárias para o analista de infraestrutura configurar e subir o ambiente de UniEventos utilizando Docker.

## Pré-requisitos
- Docker e Docker Compose instalados.
- Acesso à internet para baixar as imagens base (Node, Nginx, Oracle).

## Estrutura de Arquivos Críticos
O ambiente é controlado por dois arquivos principais na raiz do projeto:
- `docker-compose.yml`: Orquestração dos serviços.
- `.env`: Configurações sensíveis e de ambiente.

## Passo a Passo para Implantação

### 1. Configuração do Arquivo de Ambiente (.env)
Edite o arquivo `.env` na raiz do projeto. As variáveis cruciais são:

> [!IMPORTANT]
> **JWT_SECRET**: Altere este valor para uma chave aleatória e complexa. Esta chave é usada para assinar os tokens de acesso do sistema.
> **DB_PASS**: Senha do banco de dados Oracle. Certifique-se de que coincida com a definida no `docker-compose.yml` se estiver usando o container de banco do projeto.

---

### 2. Inicialização do Ambiente
Execute o seguinte comando no terminal (dentro da pasta raiz do projeto):

```bash
docker-compose up -d --build
```

Este comando irá:
1. Construir a imagem do **Frontend** (Multi-stage build).
2. Construir a imagem do **Backend** (Debian-slim com drivers Oracle).
3. Subir o container **Oracle Database** (Gvenzl Oracle Free).
4. Configurar a rede isolada `unieventos-net`.

---

### 3. Monitoramento e Logs
Para facilitar o diagnóstico sem precisar entrar nos containers, configuramos volumes de log:

- **Logs de Biometria**: `./backend/biometria_debug.log` (Mapeado no host para acompanhamento em tempo real).
- **Pasta de Logs Geral**: `./backend/logs/` (Para logs de sistema arquivados).

Para ver os logs do Docker em tempo real:
```bash
docker-compose logs -f backend
```

---

## Observações de Segurança (Homologação)
- O **Frontend** roda na porta `5174` (mapeada para a 80 interna do Nginx).
- O **Backend** roda na porta `3000`.
- O **Banco de Dados** está exposto na porta `1521` (pode ser fechado no firewall se necessário, pois a rede interna do Docker já permite a comunicação entre backend e db).

---

## Troubleshooting
Se o backend falhar ao conectar no banco na primeira execução, verifique o `healthcheck` do Oracle. O backend está configurado para aguardar o banco ficar "Healthy" antes de iniciar.
