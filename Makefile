# Makefile for local Kubernetes development with kind.
# Infrastructure (Kafka, MongoDB, KEDA) is installed separately from app services,
# mirroring production where these would be managed independently.

CLUSTER_NAME := aura
NAMESPACE := aura-system
HELM_DIR := infra/helm
KIND_CONFIG := infra/kind-config.yaml

SERVICES := web-server customer-management frontend
INFRA := kafka mongodb

.PHONY: help cluster destroy build load deps deps-uninstall services services-uninstall install uninstall status test

## — Help —

help: ## Show available targets and descriptions
	@echo "Usage: make <target>"
	@echo ""
	@echo "Targets:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'

## — Cluster lifecycle —

cluster: ## Create kind cluster with port mappings
	@if kind get clusters 2>/dev/null | grep -q "^$(CLUSTER_NAME)$$"; then \
		echo "Cluster '$(CLUSTER_NAME)' already exists"; \
	else \
		echo "==> Creating kind cluster..."; \
		kind create cluster --name $(CLUSTER_NAME) --config $(KIND_CONFIG); \
	fi

destroy: ## Destroy kind cluster
	@echo "==> Destroying kind cluster..."
	kind delete cluster --name $(CLUSTER_NAME)

## — Build & load images —

build: ## Build all application Docker images
	@echo "==> Building Docker images..."
	@for svc in $(SERVICES); do \
		echo "  Building aura/$$svc:latest..."; \
		docker build -t aura/$$svc:latest -f apps/$$svc/Dockerfile . ; \
	done

load: build ## Build and load all images into kind cluster
	@echo "==> Loading app images into kind..."
	@for svc in $(SERVICES); do \
		kind load docker-image aura/$$svc:latest --name $(CLUSTER_NAME); \
	done
	@echo "==> Pulling and loading infrastructure images..."
	# OCI images with attestation manifests fail with `kind load docker-image`,
	# so we use direct containerd import as a workaround.
	@for img in apache/kafka:3.9.0 mongo:8.0; do \
		docker pull $$img 2>/dev/null || true; \
		docker save $$img | docker exec -i $(CLUSTER_NAME)-control-plane \
			ctr --namespace=k8s.io images import --digests --snapshotter=overlayfs -; \
	done

## — Dependencies (Kafka, MongoDB, KEDA) —

deps: ## Install infrastructure dependencies (kafka, mongodb, keda)
	# KEDA must be installed first — its CRDs are required before the app
	# charts can create ScaledObject resources.
	@echo "==> Installing KEDA..."
	helm repo add kedacore https://kedacore.github.io/charts 2>/dev/null || true
	helm repo update kedacore
	helm upgrade --install keda kedacore/keda \
		--namespace $(NAMESPACE) --create-namespace \
		--set operator.replicaCount=1 \
		--wait --timeout 5m
	@echo "==> Installing Kafka..."
	helm upgrade --install kafka $(HELM_DIR)/kafka \
		--namespace $(NAMESPACE) \
		--wait --timeout 5m
	@echo "==> Installing MongoDB..."
	helm upgrade --install mongodb $(HELM_DIR)/mongodb \
		--namespace $(NAMESPACE) \
		--wait --timeout 5m

deps-uninstall: ## Uninstall infrastructure dependencies
	-helm uninstall kafka --namespace $(NAMESPACE)
	-helm uninstall mongodb --namespace $(NAMESPACE)
	-helm uninstall keda --namespace $(NAMESPACE)

## — Application services —

services: ## Install application services (web-server, customer-management, frontend)
	@for svc in $(SERVICES); do \
		echo "==> Installing $$svc..."; \
		helm upgrade --install $$svc $(HELM_DIR)/$$svc \
			--namespace $(NAMESPACE) \
			--wait --timeout 5m; \
	done

services-uninstall: ## Uninstall application services
	@for svc in $(SERVICES); do \
		echo "==> Uninstalling $$svc..."; \
		helm uninstall $$svc --namespace $(NAMESPACE) 2>/dev/null || true; \
	done

## — Combined targets —

install: cluster load deps services ## Full install: cluster + images + deps + services
	@echo ""
	@echo "============================================"
	@echo "  Aura system deployed successfully!"
	@echo "  Frontend: http://localhost:8080"
	@echo "  API:      http://localhost:3000"
	@echo "============================================"

uninstall: services-uninstall deps-uninstall ## Uninstall all services and dependencies

## — Utilities —

status: ## Show pod status in the aura-system namespace
	kubectl get pods -n $(NAMESPACE)

test: ## Run a quick smoke test against the deployed services
	@echo "==> Testing POST /api/buy..."
	@curl -sf -X POST http://localhost:3000/api/buy \
		-H "Content-Type: application/json" \
		-d '{"username":"test","userId":"user-1","price":9.99}' && echo ""
	@echo "==> Waiting for Kafka consumer..."
	@sleep 3
	@echo "==> Testing GET /api/purchases/user-1..."
	@curl -sf http://localhost:3000/api/purchases/user-1 && echo ""
	@echo "==> Testing frontend..."
	@curl -sf -o /dev/null http://localhost:8080 && echo "Frontend OK"
	@echo "==> All tests passed!"
