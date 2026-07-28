# Kubernetes Operations Guide: `shipping-on-the-air`

This repository/guide provides a cheat sheet of useful `kubectl` commands for managing, debugging, and operating microservices deployed in the **`shipping-on-the-air`** Kubernetes namespace.

---

## 📌 Namespace Context
- **Namespace:** `shipping-on-the-air`
- **Core Services:**
  - `order-service` (Port: `8001`)
  - `shipment-orchestrator` (Port: `8002`)
  - `drone-service` (Port: `8003`)
  - `kafka`
  - `zookeeper`

---

## 🔍 1. Resource Inspection & Status

Check the status of running workloads, pods, and network services within the namespace.

### View All Resources
View all workloads, services, pods, and deployments created in the namespace:
```bash
kubectl get all -n shipping-on-the-air
```

### View Running Pods
List all active pods/containers:
```bash
kubectl get pods -n shipping-on-the-air
```

### View Services & Ports
Inspect active Kubernetes Services and their internal cluster IP/port mappings:
```bash
kubectl get services -n shipping-on-the-air
```
---

## 📜 2. Log Monitoring & Streaming

Monitor real-time application logs for troubleshooting and debugging.

### Stream Deployment Logs
Stream real-time log output for specific deployments:

* **Shipment Orchestrator:**
  ```bash
  kubectl logs -f deployment/shipment-orchestrator -n shipping-on-the-air
  ```

* **Order Service:**
  ```bash
  kubectl logs -f deployment/order-service -n shipping-on-the-air
  ```

### Tail Order Service Logs by Label
Watch logs for `order-service` pods, fetching the last 20 lines first:
```bash
kubectl logs -l app=order-service -n shipping-on-the-air --tail=20 -f
```

---

## 🌐 3. Port Forwarding (Local Access)

Expose internal Kubernetes services to your local machine (`0.0.0.0`).

| Service | Local Port | Target Port | Command |
| :--- | :---: | :---: | :--- |
| **Order Service** | `8001` | `8001` | `kubectl port-forward --address 0.0.0.0 svc/order-service 8001:8001 -n shipping-on-the-air` |
| **Shipment Orchestrator** | `8002` | `8002` | `kubectl port-forward --address 0.0.0.0 svc/shipment-orchestrator 8002:8002 -n shipping-on-the-air` |
| **Drone Service** | `8003` | `8003` | `kubectl port-forward --address 0.0.0.0 svc/drone-service 8003:8003 -n shipping-on-the-air` |

---

## 🔄 4. Lifecycle Management & Deployment Updates

### Restart Services
Perform a rolling restart of the `order-service` deployment (e.g., to pick up configuration updates or refresh instances):
```bash
kubectl rollout restart deployment/order-service -n shipping-on-the-air
```

### Clean Up Stale Deployments
Delete old message broker deployments to prevent image conflicts:
```bash
kubectl delete deployment kafka zookeeper -n shipping-on-the-air --ignore-not-found
```

Delete a specific deployment (`order-service`):
```bash
kubectl delete deployment order-service -n shipping-on-the-air
```

---

## ⚠️ 5. Emergency Cleanup (Reset)

> **Warning:** Running this command will delete **ALL** resources (Pods, Deployments, Services, ConfigMaps, etc.) in the `shipping-on-the-air` namespace. Use with caution.

```bash
kubectl delete all --all -n shipping-on-the-air
```
