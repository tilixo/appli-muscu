# Carnet Muscu

Suivi de séances de sport et de nutrition, en PWA 100 % hors-ligne. Aucune donnée ne quitte le téléphone (IndexedDB via Dexie).

Stack : Vite, React, TypeScript, Tailwind CSS, Dexie, vite-plugin-pwa, react-router, recharts.

## Lancer en local

```bash
npm install
npm run dev        # http://localhost:5173, exposé aussi sur le réseau local
```

`npm test` lance les tests unitaires (Vitest). `npm run build` vérifie les types puis construit dans `dist/`. `npm run preview` sert ce build (port 4173), avec le service worker.

## Tester sur iPhone (réseau local)

1. Mac/PC et iPhone sur le même Wi-Fi.
2. `npm run dev` affiche une adresse `Network: http://192.168.x.x:5173`. Ouvre-la dans Safari sur l'iPhone.
3. En HTTP sur le réseau local, Safari ne considère pas la page comme sécurisée : l'interface et les données fonctionnent, mais **pas** le service worker (mode hors-ligne), le stockage persistant ni la caméra. Pour tester ces points, passe par la version déployée sur GitHub Pages (HTTPS).

## Déployer sur GitHub Pages

1. Crée un dépôt GitHub (privé ou public) et pousse ce projet sur la branche `main`.
2. Dans le dépôt : **Settings → Pages → Build and deployment → Source : GitHub Actions**.
3. Chaque push sur `main` lance `.github/workflows/deploy.yml`. L'app est publiée sur `https://<utilisateur>.github.io/<nom-du-depot>/`.

Le chemin de base (`base` de Vite) est déduit automatiquement du nom du dépôt via la variable `BASE_PATH`.

## Installer sur l'écran d'accueil

1. Ouvre l'URL GitHub Pages dans **Safari** (pas Chrome).
2. Bouton **Partager** → **Sur l'écran d'accueil** → **Ajouter**.
3. Lance l'app depuis l'icône une première fois avec du réseau : tout est mis en cache, ensuite elle fonctionne hors-ligne.
4. Quand une nouvelle version est déployée, un bandeau « Nouvelle version disponible » propose la mise à jour.

## Données

- Schéma Dexie versionné dans `src/db/db.ts` : pour toute évolution, ajouter une nouvelle `db.version(N)` (ne jamais modifier une version existante).
- Dates stockées en ISO 8601, affichées en fr-FR, semaines du lundi au dimanche.
- Pense à exporter régulièrement tes données (Réglages, à partir de la phase 4) : désinstaller l'app supprime les données.

## Icônes

`python3 scripts/gen-icons.py` (nécessite Pillow) régénère les PNG de `public/icons/`.
