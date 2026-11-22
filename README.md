# Cockpit DSCG 2027 — version installable (hors ligne)

Application de pilotage des révisions DSCG 2027 (UE 1, UE 2, UE 4) : programme officiel (arrêté du 4 août 2025), calendrier CNAM Nancy 2026-2027, planning automatique, répétition espacée J+1/3/7/15/30, flashcards, notes avec formules, chrono Pomodoro, examens blancs, carnet d'erreurs, statistiques.

- **Hors ligne** : après la première ouverture, l'app s'ouvre et fonctionne sans internet.
- **Synchronisation** : quand tu es connectée, chaque modification part vers ta base Supabase ; au retour du réseau, tout se met à jour seul. En cas de modification sur deux appareils, la version la plus récente de chaque document gagne.

## Mise en ligne (environ 20 minutes, une seule fois)

### 1. Supabase (la sauvegarde en ligne)
1. Crée un compte gratuit sur https://supabase.com puis **New project** (nom : `cockpit-dscg`, région Europe, note le mot de passe de la base).
2. Menu **SQL Editor** → **New query** → colle tout le contenu de `supabase.sql` → **Run**. Message attendu : « Success. No rows returned ».
3. **Project Settings → API Keys** : copie la **clé publique** (*publishable key*, ou *anon key* dans l'onglet des clés historiques). Dans **Project Settings → Data API** (ou en haut de la page API), copie l'**URL du projet** (`https://xxxx.supabase.co`).
   Ne copie jamais la clé *secret* / *service_role*.

### 2. GitHub Pages (l'hébergement de l'app)
1. Crée un compte sur https://github.com puis **New repository** : nom `cockpit-dscg`, **Public**, coche « Add a README file », **Create repository**.
2. Dans le dépôt : **Add file → Upload files**, glisse **le contenu** du dossier décompressé (index.html, sw.js, manifest.webmanifest et les dossiers css, js, vendor, fonts, icons), puis **Commit changes**.
3. **Settings → Pages** : *Source* = « Deploy from a branch », *Branch* = `main`, dossier `/ (root)` → **Save**. Après 1 à 2 minutes, l'adresse apparaît : `https://<ton-identifiant>.github.io/cockpit-dscg/`.

### 3. Relier les deux
1. Dans Supabase : **Authentication → URL Configuration** → *Site URL* = l'adresse GitHub Pages ci-dessus → **Save** (le lien de confirmation par e-mail renverra vers l'app).
2. Ouvre l'adresse de l'app dans Chrome → **Réglages → Compte et synchronisation** : colle l'URL et la clé publique → **Enregistrer la connexion**.
3. Saisis ton e-mail et un mot de passe → **Créer mon compte** → clique sur le lien reçu par e-mail → reviens dans l'app → **Se connecter**.

### 4. Installer sur le PC
Dans Chrome, icône **Installer** à droite de la barre d'adresse (ou menu ⋮ → **Enregistrer et partager → Installer la page en tant qu'application**). L'app a ensuite sa propre fenêtre et son icône.

### 5. Reprendre les données de la version Claude (si tu l'as déjà utilisée)
Version Claude : **Réglages → Exporter (JSON)**. Version installée : **Réglages → Importer** ce fichier.

## Mettre à jour l'app plus tard
Remplace les fichiers modifiés dans GitHub (**Add file → Upload files**), en changeant aussi `VERSION` en haut de `sw.js` (ex. `cockpit-dscg-v2`) pour que les appareils récupèrent la nouvelle version.

## Bon à savoir
- La clé publique Supabase peut être visible : la sécurité repose sur les règles RLS de `supabase.sql` (chacune ne voit que ses données).
- Projet gratuit Supabase : s'il reste inutilisé longtemps, Supabase peut le mettre en pause ; les données sont conservées et il se réactive depuis le tableau de bord. Pendant ce temps, l'app continue de fonctionner hors ligne.
- Exporte de temps en temps une sauvegarde JSON (Réglages).
