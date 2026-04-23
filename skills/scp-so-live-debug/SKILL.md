---
name: scp-so-live-debug
description: "Drive the local SandboxControlPlane (SCP) plus remote AKS Sandbox Orchestrator (SO) debug loop end to end: start local SCP with the right env vars, port-forward SO, build and push SO-related images, publish partner/image-puller artifacts when needed, create or reconcile SCP pools, and validate live execution-lease or warm-pool behavior in AKS. Use this whenever the user mentions local SCP plus remote SO, SandboxControlPlane plus Sandbox Orchestrator, c-1 or other AKS profiles, execution leases, feature plans like `skillsAgentOnly`, pool reconcile, local Service Bus queue permission issues, SO image build/push/deploy, or wants to prove that a live sandbox pod matches requested features."
---

# Local SCP plus remote Sandbox Orchestrator (SO) debug loop

Use this skill when the user wants to debug or validate the workflow where:

- **SCP runs locally**
- **Sandbox Orchestrator (SO) runs in AKS**
- tenant deployment and sandbox lifecycle still happen through the real cluster

This skill is for the live integration loop, not isolated unit testing.

## What this skill should accomplish

Depending on the user's goal, drive one or more of these flows:

1. start local SCP with the right environment and avoid fake-pool pitfalls
2. reach SO reliably through a port-forward
3. build and push new SO-related images to ACR
4. publish or refresh tenant chart artifacts
5. create, update, or reconcile SCP pools against the remote SO
6. validate execution-lease, warm-pool, or single-pod behavior with live cluster evidence

Always prefer the narrowest path that proves the user's point.

## Inputs to gather first

Resolve these before mutating anything:

- repo root and the SCP project path
- target AKS profile and namespaces
- partner, sandbox SKU, and sandbox namespace
- whether the user wants:
  - single-pod `sandboxes:acquire`
  - warm-pool checkout
  - chart or image rollout
  - pool reconcile or deployment recovery
- image tag or artifact version if deployment is involved
- whether a local SCP bearer token is already available

If the user only wants feature-plan validation, do not widen scope into image rollout unless it is actually required.

## Core operating modes

### 1. Start local SCP correctly

Run SCP from:

`sources\dev\LuminaService\SandboxControlPlane`

Set per-user queue overrides so local SCP does not collide with shared queues:

- `ServiceBus__DrainQueueName`
- `ServiceBus__ProvisionQueueName`
- `ServiceBus__PoolOperationQueueName`
- `ServiceBus__PartnerOperationQueueName`
- `ServiceBus__ReturnExecutionLeaseQueueName`
- `ServiceBus__IdleCheckQueueName`

Also set the local Cosmos DB override when needed:

- `CosmosDb__DatabaseName`

When you need a concrete local startup template, use this PowerShell shape and then substitute the per-user suffix:

```powershell
Set-Location '...\sources\dev\LuminaService\SandboxControlPlane'
$suffix = '<your-user-suffix>'
$env:CosmosDb__DatabaseName = 'test_db_<your-user-suffix>'
$env:ServiceBus__DrainQueueName = "sandbox-drain-jobs-$suffix"
$env:ServiceBus__ProvisionQueueName = "sandbox-provision-jobs-$suffix"
$env:ServiceBus__PoolOperationQueueName = "pool-operation-jobs-$suffix"
$env:ServiceBus__PartnerOperationQueueName = "partner-operation-jobs-$suffix"
$env:ServiceBus__ReturnExecutionLeaseQueueName = "execution-lease-return-jobs-$suffix"
$env:ServiceBus__IdleCheckQueueName = "sandbox-idle-check-jobs-$suffix"
dotnet run --launch-profile SandboxControlPlane -p:EnableSourceControlManagerQueries=false
```

Use the queue-name pattern above unless the current environment already uses a different per-user naming convention.

### 2. Avoid fake-pool mode unless the user explicitly wants it

For real SCP-plus-AKS pool validation, clear these before starting local SCP:

- `DEPLOY_ENVIRONMENT`
- `DevAks__SandboxDefinitionFilePath`
- `LUMINA_SANDBOX_ID`

Why: if SCP starts in `dev-aks` mode, execution-lease selection can use the fake DevAks pool path instead of the real active AKS pools, which makes live pool validation misleading.

### 3. Choose the right lease path

For **single-pod** feature-subset validation, start local SCP with:

- `WarmPool__CheckoutEnabled=false`

Why: for AKS execution leases, when warm checkout is enabled SCP routes through SO pre-provisioned checkout. That is useful for warm-pool scenarios, but it is the wrong path if the user wants proof that `sandboxes:acquire` honors the requested feature list.

For **warm-pool** validation, leave warm checkout enabled.

### 4. Start local SCP with the known build workaround

Use the existing launch profile, and when `Microsoft.Build.Tasks.Git` breaks because the worktree uses `refstorage`, include:

- `-p:EnableSourceControlManagerQueries=false`

For test runs, also add:

- `-p:IncludeSourceRevisionInInformationalVersion=false`

### 5. Auth and cluster bootstrap

Before using this skill live:

- make sure local SCP is reachable, usually at `https://localhost:44300`
- make sure SO is reachable through the port-forward, usually at `http://localhost:18080`
- ensure `kubelogin` is on `PATH` before using `kubectl` against AKS
- if SCP mutation needs auth and a token is not already available, ask the user for a Swagger-issued bearer token rather than inventing a new auth path

## Reaching SO reliably

Prefer a port-forward to the SO service:

- namespace: `sandbox-system-<profile>`
- service: `sandbox-orchestrator`
- local port: typically `18080`

Treat the port-forward as the default stable control path for local debugging.

Do not assume the workstation-to-cluster path is more reliable than the port-forward.

## Concrete SCP API route patterns

Use these exact SCP route shapes when you need deterministic control-plane calls:

- sandbox SKU:
  - `GET /api/v1/partners/{partner}/sandboxSkus/{sandboxSku}`
  - `PUT /api/v1/partners/{partner}/sandboxSkus/{sandboxSku}`
- pools:
  - `GET /api/v1/partners/{partner}/sandboxSkus/{sandboxSku}/sandboxNamespaces/{sandboxNamespace}/pools`
  - `GET /api/v1/partners/{partner}/sandboxSkus/{sandboxSku}/sandboxNamespaces/{sandboxNamespace}/pools/{pool}`
  - `GET /api/v1/partners/{partner}/sandboxSkus/{sandboxSku}/sandboxNamespaces/{sandboxNamespace}/pools/{pool}/operations`
  - `GET /api/v1/partners/{partner}/sandboxSkus/{sandboxSku}/sandboxNamespaces/{sandboxNamespace}/pools/{pool}/operations/{operationId}?reconcile=true`
- execution leases:
  - `POST /api/v3/partners/{partner}/sandboxSkus/{sandboxSku}/sandboxNamespaces/{sandboxNamespace}/workspaces/{workspaceId}/executionScopes/{executionScopeId}/executionLeases`
  - `GET /api/v3/partners/{partner}/sandboxSkus/{sandboxSku}/sandboxNamespaces/{sandboxNamespace}/workspaces/{workspaceId}/executionScopes/{executionScopeId}/executionLeases/{executionLeaseId}`
  - `POST /api/v3/partners/{partner}/sandboxSkus/{sandboxSku}/sandboxNamespaces/{sandboxNamespace}/workspaces/{workspaceId}/executionScopes/{executionScopeId}/executionLeases/{executionLeaseId}:return`

If the user only needs a fresh single-pod validation, generate fresh IDs for:

- `workspaceId`
- `executionScopeId`

and use those directly in the acquire route.

## Deployment and rollout flow

Use this sequence when images or tenant artifacts changed:

1. build the SO or related images with the repo's existing build flow
2. push the new images to the target ACR
3. determine whether a new artifact version is required
4. if charts changed or artifact path does not exist, package and upload:
   - partner chart tgz
   - image-puller chart tgz
   - partner manifest
   - image-puller manifest
5. create or update the target SCP pool
6. reconcile the pool operation until terminal success
7. validate the tenant namespace and live workloads

If the user only changed runtime images that are baked into the artifacts, do not skip the artifact publication step.

Do not invent ad-hoc image build or push commands if the repo already contains a native flow. First search the repo for the component's existing build and publish entrypoints, then reuse them. Prefer:

- existing scripts under the component tree
- `eng\`, `scripts\`, or `build\` entrypoints
- pipeline yaml snippets already used for the same image

If there are multiple choices, reuse the one that already targets the same image repository and tag format.

## Pool create and reconcile rules

When creating AKS pools through SCP:

- `sandboxConfiguration` is the placeholder-to-image-version map, not the full sandbox config
- `properties` must be the flat AKS pool properties object, not nested incorrectly under a second AKS wrapper

If local SCP returns `403 Forbidden` on pool create or pool return because it cannot send to a per-user Service Bus queue, do not assume the operation failed completely. The documents may already be persisted.

For pool operations, use the persisted operation plus:

- `GET .../operations/{operationId}?reconcile=true`

to drive the workflow manually until it reaches a terminal state.

If the original `403` response does not give you `operationId`, recover it in this order:

1. list pools and find the persisted pool by expected name
2. list that pool's operations
3. choose the newest operation for the intended create or update attempt
4. then poll the specific operation with `?reconcile=true`

If no persisted pool or operation exists, stop treating the `403` as recoverable and tell the user the request must be retried from the create step.

## Single-pod feature-plan validation

Use this flow when the user wants proof that a live pod matches requested features:

1. verify the sandbox SKU advertises the requested feature plan
2. if multiple feature plans are present, ensure `enable_execution_scope=true`
3. create or reuse a pool whose sandbox configuration includes the requested plan
4. start local SCP with `WarmPool__CheckoutEnabled=false`
5. call:
   - `POST /api/v3/partners/{partner}/sandboxSkus/{sandboxSku}/sandboxNamespaces/{sandboxNamespace}/workspaces/{workspaceId}/executionScopes/{executionScopeId}/executionLeases`
6. pass a body like:

```json
{
  "featurePlan": "skillsAgentOnly"
}
```

7. poll the execution lease until `Active` or terminal failure
8. inspect the actual sandbox pod in the tenant runtime namespace
9. compare live container names against the expected feature set

For this path, success means the **sandbox pod**, not the warm-pool pod, contains exactly the expected feature containers.

For `skillsAgentOnly`, expect this live container set:

- `controller-main`
- `egress-proxy`
- `egress-llm`
- `operator`
- `skills-agent`

Treat these as default-only containers that should be absent in the acquired single pod:

- `terminal-shell`
- `desktop-browser`
- `desktop-libreoffice`
- `enterprise-tools`

Use the lease response as the first source of pod evidence. If the lease reaches `Active`, expect:

- `featurePlan = skillsAgentOnly`
- `providerSpec.aks.podName`

Then locate the actual pod with:

```powershell
kubectl get pod <podName> -A -o wide
kubectl get pod <podName> -n <actual-namespace> -o jsonpath='{.spec.containers[*].name}'
```

If the namespace is unclear, find the pod by name across all namespaces rather than assuming the logical namespace from the lease is the physical runtime namespace.

## Warm-pool interpretation

A full warm-pool pod is often expected and is **not** proof that single-pod acquire ignored the requested feature plan.

Keep these interpretations separate:

- **warm-pool pod**: pre-provisioned shared capacity
- **single acquired sandbox pod**: the live evidence for `sandboxes:acquire`

If the user asks whether feature selection worked, inspect the acquired sandbox pod first.

## Known local debugging pitfalls

### Service Bus `Send` permissions

Local SCP may lack `Send` on per-user queues such as:

- `pool-operation-jobs-<user>`
- `execution-lease-return-jobs-<user>`

Typical symptoms:

- pool create returns `403`
- lease return gets stuck in `Returning`

Recovery:

- for pool operations, use persisted op plus `?reconcile=true`
- for cleanup, if needed, call SO lifecycle APIs directly through the port-forward and verify the pod is actually deleted

When execution-lease return hits this queue permission gap, it is acceptable to clean up through SO directly:

- `POST /partner/{partner}/sku/{sku}/namespace/{runtimeNamespace}/sandboxes/{sandboxId}:return`
- then poll:
  - `GET /partner/{partner}/sku/{sku}/namespace/{runtimeNamespace}/sandboxes:operations/{operationId}`

Only consider cleanup complete after the SO return operation succeeds and the sandbox pod is actually gone from the cluster.

### Fake-pool confusion

If live pool GET shows the right pool but execution-lease selection ignores it, check whether local SCP accidentally started in `dev-aks` mode.

### Feature-plan fallback

If SCP cannot find a pool advertising the requested non-default plan, it can fall back to `default`. Always inspect:

- the effective lease `featurePlan`
- the attempted pool IDs
- the live pool document's `feature_plans`

## Practical validation commands

Use commands like these when gathering live evidence:

```powershell
curl.exe --insecure https://localhost:44300/swagger/index.html
curl.exe http://localhost:18080/healthz
kubectl get pods -A | Select-String '<sandbox-pod-name-or-profile>'
helm list -A | Select-String '<profile-or-tenant-namespace>'
```

For single-pod proof, prefer the exact pod-name lookup over loose namespace guesses.

## Report structure

When you finish, report in this order:

## Target
- repo path
- SCP mode
- SO namespace or port-forward
- partner, sandbox SKU, and namespace

## Actions
- what was started, built, pushed, uploaded, or reconciled

## Evidence
- lease or operation IDs
- selected pool
- pod name and namespace
- live container list or deployment state

## Outcome
- what was proven
- what failed or was worked around

## Examples

**Example 1**

User: "Start local SCP against c-1, disable warm checkout, and prove that `skillsAgentOnly` acquire only launches the expected containers."

Use this skill to:

- start SCP in real-pool mode
- set `WarmPool__CheckoutEnabled=false`
- acquire the execution lease
- inspect the acquired sandbox pod

**Example 2**

User: "I changed the SO image and partner chart. Build, push, publish artifacts, reconcile the pool, and validate the tenant rollout."

Use this skill to:

- build and push images
- publish artifacts
- drive SCP pool reconcile
- validate the deployed tenant namespace

**Example 3**

User: "Local SCP pool create is returning 403 but I think the operation persisted. Can you recover it and keep going?"

Use this skill to:

- inspect the persisted pool operation
- manually reconcile it
- continue validation without waiting on the broken queue path
