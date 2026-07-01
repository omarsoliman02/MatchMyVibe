# MatchMyVibe

> Décidez en groupe où sortir, sans débattre.

**MatchMyVibe** aide un groupe d'amis à choisir un lieu de sortie. Chacun saisit ses préférences (budget, régime alimentaire, type de sortie, position), et l'application propose les **meilleurs lieux compatibles autour du groupe**, classés par une IA. Les membres votent en temps réel, et c'est réglé.

---

## ✨ Fonctionnement

1. **Crée un groupe** et invite tes amis avec un simple code d'invitation.
2. **Chaque membre donne ses préférences** : budget, régime (végétarien, vegan, halal, casher, sans gluten…), types de lieux (restaurant, bar, café, boîte, cinéma, bowling, escape game) et sa position GPS.
3. **L'app calcule le barycentre géographique** du groupe, cherche les lieux autour via OpenStreetMap, les **classe** (type recherché + compatibilité régime + proximité), puis fait **curer le top 3 par l'IA (Google Gemini)**.
4. **Les membres votent en direct** (Server-Sent Events) sur la recommandation préférée.

Le matching combine un **classement déterministe** (instantané et fiable) et une **curation par IA**. Si Gemini est indisponible ou trop lent, l'app retombe silencieusement sur le classement déterministe — l'utilisateur n'est jamais bloqué.

## 🧮 Comment fonctionne le scoring

Avant que l'IA n'intervienne, chaque lieu trouvé autour du groupe reçoit une **note sur 1** calculée simplement, sans intelligence artificielle — cette étape est donc instantanée et toujours disponible, même si l'IA est en panne.

Chaque lieu part avec une petite note de base, puis gagne des points selon 4 critères, chacun avec son propre poids :

| Critère | Bonus | Explication |
|---|---|---|
| 🎯 Type de sortie recherché | jusqu'à **+0,30** | Plus les membres du groupe sont d'accord sur le type de lieu (restaurant, bar, cinéma…), plus le bonus est fort. |
| 🥗 Régime alimentaire | **+0,12** par régime | Si le lieu est tagué comme compatible avec un régime demandé (végétarien, vegan, halal…), un bonus s'ajoute pour chaque régime respecté. |
| 💶 Budget | **+0,15** | Si le lieu affiche une information de prix exploitable (entrée gratuite ou tarif indiqué) et que ce prix est dans le budget moyen du groupe. ⚠️ Limite connue : OpenStreetMap ne fournit quasiment jamais de prix fiable pour les restaurants/bars/cafés, donc ce bonus s'applique surtout aux lieux à entrée payante (cinéma, bowling, escape game). Sans information de prix, on reste neutre plutôt que de deviner. |
| 📍 Proximité | jusqu'à **+0,25** | Plus le lieu est proche du point central du groupe (le barycentre géographique de toutes les positions), plus le bonus est élevé. Au-delà de 1,2 km, il n'y a plus de bonus. |

Le total est ensuite plafonné à 1 : un lieu qui coche toutes les cases obtient la note maximale.

**Exemple concret** : un groupe de 2 amis cherche un restaurant, l'un est végétarien, budget moyen 20 €.
- Un **restaurant végétarien** à 300 m du groupe, sans info de prix → note ≈ 0,40 (base) + 0,30 (type demandé) + 0,12 (végétarien) + 0,25 × (1 − 300/1200) ≈ **0,95**.
- Un **bar** à 2 km, sans rapport avec le régime demandé → note ≈ 0,40 (base) seulement, aucun autre bonus (le bar n'est pas le type recherché, pas de tag végétarien, trop loin pour le bonus proximité) → **0,40**.

Cette note sert ensuite de filtre de présélection : les meilleurs lieux sont transmis à l'IA (Google Gemini), qui affine le classement final et rédige un résumé pour chaque recommandation.

## 🧱 Stack technique

| Domaine | Technologie |
|---|---|
| Framework | [Next.js 16](https://nextjs.org) (App Router, Turbopack) · React 19 |
| Langage | TypeScript |
| Base de données | PostgreSQL + [Prisma 7](https://www.prisma.io) |
| Authentification | NextAuth (credentials) + bcrypt |
| IA | [Google Gemini](https://ai.google.dev) (`gemini-2.5-flash-lite`) |
| Données lieux | [OpenStreetMap Overpass API](https://overpass-api.de) (sans clé) |
| Temps réel | Server-Sent Events |
| UI | Tailwind CSS 4 · thème clair/sombre |
| Validation | Zod |
| Tests | Jest + Testing Library |

## 🚀 Démarrage rapide

### Prérequis

- [Node.js](https://nodejs.org) 22+
- Une instance **PostgreSQL** (ou Docker)
- Une clé API **Google Gemini** ([obtenir une clé](https://aistudio.google.com/app/apikey)) — optionnelle : sans elle, le classement déterministe prend le relais.

### Option A — Docker (recommandé)

Lance l'application **et** une base PostgreSQL en une commande :

```bash
cp .env.example .env.local      # renseigne GEMINI_API_KEY
docker compose up
```

➡️ Ouvre [http://localhost:3000](http://localhost:3000)

### Option B — Local

```bash
# 1. Dépendances
npm install

# 2. Variables d'environnement
cp .env.example .env.local      # renseigne DATABASE_URL, NEXTAUTH_SECRET, GEMINI_API_KEY

# 3. Base de données
npm run db:generate             # génère le client Prisma
npm run db:migrate              # applique les migrations

# 4. Serveur de dev
npm run dev
```

➡️ Ouvre [http://localhost:3000](http://localhost:3000)

## 🔑 Variables d'environnement

Copie `.env.example` vers `.env.local` puis renseigne :

| Variable | Description |
|---|---|
| `DATABASE_URL` | URL de connexion PostgreSQL |
| `NEXTAUTH_SECRET` | Secret de signature des sessions NextAuth (génère-le avec `openssl rand -base64 32`) |
| `NEXTAUTH_URL` | URL publique de l'app (`http://localhost:3000` en dev) |
| `GEMINI_API_KEY` | Clé API Google Gemini (optionnelle) |

> Les fichiers `.env*` (hors `.env.example`) sont ignorés par Git : aucun secret n'est versionné.

## 🧪 Tests

```bash
npm test            # lance la suite Jest
npm run test:watch  # mode watch
```

## 📜 Scripts disponibles

| Script | Rôle |
|---|---|
| `npm run dev` | Serveur de développement |
| `npm run build` | Build de production |
| `npm run start` | Sert le build de production |
| `npm run lint` | ESLint |
| `npm test` | Tests Jest |
| `npm run db:migrate` | Applique les migrations Prisma |
| `npm run db:studio` | Ouvre Prisma Studio |
| `npm run db:generate` | Génère le client Prisma |

## 🗂️ Structure du projet

```
src/
├── app/
│   ├── (app)/          # pages authentifiées (dashboard, groupes, sessions)
│   ├── (auth)/         # connexion / inscription
│   └── api/            # routes API (auth, groups, match, votes, sse…)
├── components/         # composants UI React
├── lib/
│   ├── matching/       # classement déterministe des lieux
│   ├── gemini/         # curation du top 3 par IA
│   ├── overpass/       # client OpenStreetMap + calcul du barycentre
│   ├── sse/            # broadcaster temps réel
│   ├── auth/           # config NextAuth + validation
│   └── prisma/         # client Prisma
└── types/              # types partagés
prisma/                 # schéma + migrations
__tests__/              # tests Jest (API + lib)
```

## 📄 Licence

Projet étudiant — usage libre à des fins d'apprentissage.
