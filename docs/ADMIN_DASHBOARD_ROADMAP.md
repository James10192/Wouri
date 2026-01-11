# Wouri Bot Admin Dashboard - Roadmap

This roadmap focuses on the admin dashboard and the supporting backend APIs
needed to manage Wouri Bot, improve answer quality, and grow the knowledge base.

## Phase 0 - Foundations (Week 0-1)

Goal: Ensure data persistence and safe admin access.

- Define DB schema for admin features
  - tables: `conversations`, `messages`, `feedback`, `knowledge_base`,
    `translations`, `service_checks`.
  - add indexes for `created_at`, `region`, `language`.
- Add admin authentication (API key or JWT)
  - middleware to protect `/admin/*` routes.
  - secret management in env (`ADMIN_API_KEY`).
- Logging + observability basics
  - structured logs (request id, user id, model, latency).
  - error tracking (Sentry or similar).

Deliverables
- Schema migration scripts.
- Admin auth middleware.
- Minimal logging conventions.

## Phase 1 - Conversation & Message Stream (Week 1-2)

Goal: See what users ask and what the system replies.

- Persist user and assistant messages
  - store `role`, `text`, `model`, `usage`, `metadata`, `region`, `language`.
  - attach tool invocations and sources.
- Admin endpoints (read-only)
  - `GET /admin/conversations`
  - `GET /admin/conversations/:id/messages`
  - `GET /admin/messages`
- Dashboard UI
  - live stream view (polling or SSE).
  - filters: date range, model, language, region.

Deliverables
- Stored conversation history.
- Read-only admin UI for message stream.

## Phase 2 - Feedback Loop + Knowledge Base (Week 2-4)

Goal: let admins correct answers and improve retrieval.

- Feedback capture
  - `POST /admin/feedback` with rating + correction text.
  - link to message id.
- Knowledge ingestion
  - `POST /admin/knowledge` with content + metadata.
  - embed content and store in vector DB.
- Quality controls
  - require sources or block unsafe answers.
  - show citations in UI.

Deliverables
- Feedback workflow in admin.
- Knowledge ingestion pipeline + re-embed.

## Phase 3 - Local Language & Translation (Week 4-5)

Goal: consistent translations and local language support.

- Translation store
  - `POST /admin/translations` and `GET /admin/translations`.
- Glossary and term mapping
  - key crops, pests, practices.
- UI enhancements
  - per-language toggles, translation preview.

Deliverables
- Translation CRUD in admin.
- Glossary management UI.

## Phase 4 - Monitoring & Reliability (Week 5-6)

Goal: operational visibility and system health.

- Service health endpoints
  - `GET /admin/monitoring` with Groq, Supabase, OpenWeather.
- Dashboards
  - latency, error rate, request volume.
  - top unanswered questions.
- Alerts
  - notify on failures or quota exhaustion.

Deliverables
- Monitoring panel with real-time status.
- Alerts for critical errors.

## Phase 5 - Advanced Features (Week 6+)

Goal: expand intelligence and product value.

- Photo diagnosis (image input)
- Seasonal calendar and reminders
- Market price integration
- Personalized advice by farmer profile

Deliverables
- MVP of one advanced feature.

## Dependencies & Notes

- Vector embeddings: ensure a stable embedding model for ingestion.
- Multi-tenant safety if multiple regions/clients are added.
- Data governance: track sources, licenses, and validity.

## Suggested Priority Order

1. Phase 0 + Phase 1 (foundation + visibility)
2. Phase 2 (feedback + knowledge)
3. Phase 3 (translations)
4. Phase 4 (monitoring)
5. Phase 5 (advanced features)

