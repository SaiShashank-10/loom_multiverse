# ADR 0002: pgvector over dedicated vector DB

**Decision:** Use PostgreSQL + pgvector.
**Rationale:** Reduces infrastructure complexity by keeping relational and vector data in the same ACID-compliant database.
