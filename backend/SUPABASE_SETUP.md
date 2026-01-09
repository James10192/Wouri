# 🔑 Récupérer les Informations Supabase

Votre projet: **wouribot-dev**
Mot de passe DB: `9wUj2ozHqHKKf05C`

---

## Étape 1: Récupérer les Clés API (2 minutes)

### A. Aller sur le Dashboard Supabase

```bash
# 1. Ouvrir dans le navigateur:
https://supabase.com/dashboard/projects

# 2. Cliquer sur votre projet: "wouribot-dev"
```

### B. Récupérer URL + Keys

```bash
# 3. Aller dans: Settings → API
https://supabase.com/dashboard/project/wouribot-dev/settings/api

# 4. Vous verrez ces informations:

┌─────────────────────────────────────────────────────────────┐
│ Project URL                                                 │
│ https://xxxxxxxxx.supabase.co                              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Project API keys                                            │
│                                                              │
│ anon/public  (client-side)                                  │
│ eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3M...          │
│                                                              │
│ service_role (secret - server-side only)                    │
│ eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3M...          │
└─────────────────────────────────────────────────────────────┘
```

### C. Récupérer Database URL (pour Prisma)

```bash
# 5. Aller dans: Settings → Database
https://supabase.com/dashboard/project/wouribot-dev/settings/database

# 6. Descendre jusqu'à "Connection string"

# 7. Vous verrez 2 URLs:

┌─────────────────────────────────────────────────────────────┐
│ Connection string                                           │
│                                                              │
│ URI (Transaction Mode - pour Prisma migrations)             │
│ postgresql://postgres.xxx:9wUj2ozHqHKKf05C@aws-0-eu...     │
│ :5432/postgres                                              │
│                                                              │
│ URI (Session Mode - pour app runtime)                       │
│ postgresql://postgres.xxx:9wUj2ozHqHKKf05C@aws-0-eu...     │
│ :6543/postgres                                              │
└─────────────────────────────────────────────────────────────┘

# Notes:
# - Port 5432 = Direct connection (pour migrations Prisma)
# - Port 6543 = Pooled connection (pour app runtime)
# - Mot de passe déjà dans l'URL: 9wUj2ozHqHKKf05C
```

---

## Étape 2: Mettre à Jour le .env

Copiez les valeurs récupérées:

```bash
cd /home/levraimd/workspace/Wouribot/backend
nano .env
```

Remplacez ces lignes:

```env
# AVANT (placeholder):
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# APRÈS (vos vraies valeurs):
SUPABASE_URL=https://xxxxxxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOi... (la vraie clé anon)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOi... (la vraie clé service_role)

# Ajouter aussi le DATABASE_URL pour Prisma:
DATABASE_URL="postgresql://postgres.xxx:[email protected]:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.xxx:[email protected]:5432/postgres"
```

**Important:**
- `DATABASE_URL` (port 6543) = Pour l'app (connection pooling)
- `DIRECT_URL` (port 5432) = Pour les migrations Prisma

---

## Étape 3: Tester la Connexion

```bash
# Redémarrer le serveur:
bun run dev

# Dans un autre terminal:
curl http://localhost:4456/test/supabase

# ✅ Devrait retourner: {"success": true}
```

---

## Format Complet des URLs

### Project URL
```
https://[project-ref].supabase.co
```

### Anon Key (commence toujours par eyJ...)
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6I...
```

### Service Role Key (commence toujours par eyJ...)
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6I...
```

### Database URL (Pooled - Port 6543)
```
postgresql://postgres.[project-ref]:[password]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true
```

### Direct URL (Direct - Port 5432)
```
postgresql://postgres.[project-ref]:[password]@aws-0-eu-central-1.pooler.supabase.com:5432/postgres
```

---

## Aide

Si vous ne trouvez pas les informations:

1. **Dashboard**: https://supabase.com/dashboard/projects
2. **Sélectionner projet**: wouribot-dev
3. **Settings** → **API** (pour URL + Keys)
4. **Settings** → **Database** (pour Connection string)

Mot de passe déjà connu: `9wUj2ozHqHKKf05C` ✅
