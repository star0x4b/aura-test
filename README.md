# Aura Purchase Management System

A microservices-based purchase management system built with TypeScript, Kafka, MongoDB, and React.

## Architecture

```
Browser → Frontend (React/nginx) → Web Server (Express) → Kafka → Customer Management (Express) → MongoDB
```

- **Frontend** - React + Vite + shadcn/ui served by nginx. Proxies `/api` to web-server.
- **Web Server** - Customer-facing API. Publishes purchases to Kafka and proxies read queries.
- **Customer Management** - Kafka consumer that persists purchases to MongoDB. Exposes query API.
- **Kafka** - Message broker between web-server and customer-management.
- **MongoDB** - Persistent storage for purchase records.
- **KEDA** - Autoscaling: CPU-based for web-server, Kafka consumer lag-based for customer-management.

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/)
- [kind](https://kind.sigs.k8s.io/docs/user/quick-start/#installation)
- [kubectl](https://kubernetes.io/docs/tasks/tools/)
- [Helm](https://helm.sh/docs/intro/install/)
- [Node.js 22+](https://nodejs.org/) (for local development)

## Quick Start

```bash
make install
```

This runs the full pipeline: creates a kind cluster, builds and loads Docker images, installs infrastructure dependencies (Kafka, MongoDB, KEDA), and deploys all application services.

Once deployed:
- **Frontend**: http://localhost:8080
- **API**: http://localhost:3000

Run `make test` to verify the deployment with a quick smoke test.

## Makefile Targets

| Target | Description |
|---|---|
| `make help` | Show all available targets |
| `make cluster` | Create kind cluster with port mappings |
| `make build` | Build all application Docker images |
| `make load` | Build and load all images into kind cluster |
| `make deps` | Install infrastructure dependencies (Kafka, MongoDB, KEDA) |
| `make services` | Install application services |
| `make install` | Full install: cluster + images + deps + services |
| `make uninstall` | Uninstall all services and dependencies |
| `make destroy` | Destroy kind cluster |
| `make status` | Show pod status |
| `make test` | Run smoke test against deployed services |

### Updating a single service

Each application service has its own Helm chart, so you can update them independently:

```bash
# Rebuild and reload a single service
docker build -t aura/web-server:latest -f apps/web-server/Dockerfile .
kind load docker-image aura/web-server:latest --name aura
helm upgrade web-server infra/helm/web-server --namespace aura-system

# Or update all services at once
make load services
```

## Helm Chart Structure

Charts are split by concern — infrastructure and application services are installed separately, reflecting a production setup where Kafka/MongoDB would be managed independently.

```
infra/helm/
├── kafka/                    # Kafka broker (KRaft mode, local dev)
├── mongodb/                  # MongoDB single instance (local dev)
├── web-server/               # Customer-facing API + KEDA ScaledObject
├── customer-management/      # Kafka consumer + query API + KEDA ScaledObject
└── frontend/                 # React app served by nginx
```

In production, replace the local kafka/mongodb charts with your managed service configuration (MSK, Atlas, etc.) and update the service env vars accordingly.

## Local Development

```bash
# Install dependencies
npm install

# Build shared package first
npm run build:shared

# Start services (each in a separate terminal)
npm run dev:web-server
npm run dev:customer-management
npm run dev:frontend
```

Requires local Kafka (localhost:9092) and MongoDB (localhost:27017).

## API Endpoints

| Method | Path | Description |
|---|---|---|
| POST | /api/buy | Submit a purchase (202) |
| GET | /api/purchases/:userId | Get purchases for a user |
| GET | /healthz | Health check |
| GET | /readyz | Readiness check |

### POST /api/buy

```json
{
  "username": "john_doe",
  "userId": "user-123",
  "price": 29.99
}
```

## Project Structure

```
aura-test/
├── Makefile                      # Build, deploy, and manage targets
├── packages/shared/              # @aura/shared - types & constants
├── apps/
│   ├── web-server/               # Customer-facing API
│   ├── customer-management/      # Kafka consumer + query API
│   └── frontend/                 # React UI
└── infra/
    ├── kind-config.yaml          # kind cluster configuration
    └── helm/
        ├── kafka/                # Kafka chart (local dev)
        ├── mongodb/              # MongoDB chart (local dev)
        ├── web-server/           # Web server chart
        ├── customer-management/  # Customer management chart
        └── frontend/             # Frontend chart
```
