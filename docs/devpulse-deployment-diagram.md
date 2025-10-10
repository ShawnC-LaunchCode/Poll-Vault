# DevPulse Deployment Diagram

Below is the Mermaid deployment diagram for the DevPulse Surveys MVP. Copy this block into a Markdown file in your repo (e.g., `docs/architecture.md`) and GitHub will render it automatically.

```mermaid
flowchart TD

%% CI/CD LAYER
A[Developer Commit] --> B[GitHub Actions CI/CD]
B --> C[Container Registry (GHCR)]

%% DEPLOYMENT LAYER
C --> D[Cloud Run / App Service\n(API Server Container)]
C --> E[Worker Container\n(Background Jobs)]

%% APP INFRASTRUCTURE
D --> F[(Postgres DB)]
D --> G[(Redis Cache)]
D --> H[(S3 / Object Store)]
E --> H
E --> F

%% FRONTEND
I[React Frontend / CDN (Vercel, CF)] --> D
J[Public Respondent UI\n/s/{surveyId}] --> D

%% OBSERVABILITY
D --> K[Sentry / LogDrain\n(Error tracking)]
D --> L[Metrics / Healthcheck\nPrometheus or Grafana]

subgraph CI/CD Pipeline
  B
  C
end

subgraph Cloud Infrastructure
  D
  E
  F
  G
  H
end

subgraph Frontend Layer
  I
  J
end

subgraph Observability
  K
  L
end
```

## How to use this diagram
- **GitHub:** paste the Mermaid block in any `.md` file in your repo; GitHub renders Mermaid natively (if enabled for your org) or you can use a Mermaid renderer plugin.
- **VS Code preview:** install "Markdown Preview Mermaid Support" extension.
- **Export:** Use Mermaid Live Editor or VS Code extensions to export PNG/SVG for slides or docs.
- **Editing:** update nodes or add the LLM pipeline nodes later (e.g., add an `Insights` node connected to the Worker container).

Legend:
- **CI/CD**: GitHub Actions & GHCR
- **App**: Cloud Run stateless containers
- **DB**: Postgres (managed)
- **Cache**: Redis for caching & rate-limiting
- **Store**: S3 object store for files & exports
