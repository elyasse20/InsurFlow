# CAHIER DES CHARGES DÉTAILLÉ (CDC)

**Projet :** InsurFlow — Système de Gestion Globale de Production, Règlements et Exercices Comptables d'Assurance  
**Version :** 2.1 (Intégration Complète du Module Exercice Comptable)  
**Statut :** Spécifications Détaillées Validées & Implémentées  
**Date :** Juillet 2026  
**Auteur :** Équipe d'Ingénierie & Architecture Système InsurFlow  

---

## 1. CONTEXTE ET OBJECTIFS DU PROJET

### 1.1 Contexte Général
Le secteur du courtage et de l'agence d'assurance nécessite une traçabilité rigoureuse des contrats émis (polices d'assurance), des primes d'assurances collectées, du commissionnement et des flux financiers aussi bien au niveau des clients souscripteurs qu'au niveau des compagnies d'assurances partenaires (CIE).

Le projet **InsurFlow** est issu de la refonte globale et modernisation d'un outil legacy (Node.js/React) vers une solution applicative d'entreprise robuste, évolutive et sécurisée, basée sur **Spring Boot 3.3 (Java 21)** pour le backend REST et **Next.js 15 (TypeScript)** pour le frontend web.

### 1.2 Objectifs Stratégiques & Opérationnels
1. **Digitalisation & Centralisation :** Offrir une plateforme unique pour la gestion du portefeuille clients (Particuliers & Sociétés), des polices d'assurance et des encaissements/décaissements.
2. **Gestion Native des Exercices Comptables :** Séparer de manière étanche les comptes, bilans et tableaux de bord par **Exercice Financier / Année Comptable** (ex: 2024, 2025, 2026), avec un positionnement automatique par défaut sur l'exercice de l'année en cours.
3. **Conformité aux Registres d'Assurance :** Couvrir l'intégralité des obligations de tenue de registres de production :
   - `PROD S C` (Production Standard Sans Commission)
   - `PROD A C` (Production Standard Avec Commissions & Règlements)
   - `MARITIME` (Production Spécifique Maritime avec Certificat, Navire et N° d'Ordre)
   - `MARITIME A C` (Production Maritime avec Commissions, Règlements et Co-assurance / Répartitions)
4. **Double Circuit Financier :** Séparer de manière stricte les règlements encaissements (Client vers Agence) des règlements décaissements (Agence vers Compagnie d'Assurance / CIE).
5. **Pilotage Analytics & Reporting par Exercice :** Fournir un tableau de bord exécutif en temps réel (KPIs financiers, suivi du reste à recouvrer, répartition par catégorie de risques et top compagnies d'assurance) filtrable par exercice, ainsi qu'un export automatisé des registres aux formats **PDF** et **Excel (CSV)**.

---

## 2. ARCHITECTURE TECHNIQUE & CHOIX TECHNOLOGIQUES

### 2.1 Stack Technologique

```
+-------------------------------------------------------------------+
|                        FRONTEND WEB                               |
| Next.js 15 (App Router) | TypeScript | Tailwind CSS | Radix UI    |
| ExerciceSelector | Axios (Interceptor JWT) | jsPDF & AutoTable    |
+-------------------------------------------------------------------+
                                 | HTTP / REST (JSON)
                                 v
+-------------------------------------------------------------------+
|                        BACKEND REST API                           |
| Spring Boot 3.3 (Java 21) | Spring Security (Stateless JWT)       |
| Spring Data MongoDB | Lombok | Jackson JSON                       |
+-------------------------------------------------------------------+
                                 | MongoDB Protocol
                                 v
+-------------------------------------------------------------------+
|                        BASE DE DONNÉES                            |
| MongoDB (Collections: users, clients, productions, regelements,   |
| compagnes, categories, natures, parametres, tva)                  |
+-------------------------------------------------------------------+
```

### 2.2 Composants Backend (Spring Boot)
- **Framework :** Spring Boot 3.3.x sous Java 21 LTS.
- **Sécurité :** Spring Security avec authentification sans état (**Stateless JWT**) via algorithme HMAC/RS256 (`JwtAuthFilter`, `JwtUtil`). Hachage sécurisé des mots de passe avec **BCrypt**.
- **Accès aux données :** Spring Data MongoDB repositories avec mapping orienté documents et calculs virtuels d'exercice (`@Transient getExercice()`).
- **Gestion des fichiers :** `FileStorageService` pour la réception et la numérisation sécurisée des pièces justificatives clients.

### 2.3 Composants Frontend (Next.js)
- **Framework UI :** Next.js 15 (App Router) & React 19.
- **Langage :** TypeScript pour un typage strict et une réduction des erreurs à l'exécution.
- **Composants Dédiés :** `ExerciceSelector` (menu déroulant de sélection d'exercice réutilisable avec icône calendrier).
- **Styling :** Tailwind CSS avec approche responsive (Mobile, Tablette, Desktop HD/4K) et espacements aérés (Design System Modern Whitespace).
- **Exportation :** Export CSV UTF-8 avec BOM (Byte Order Mark pour support des caractères spéciaux et arabes dans MS Excel) et export PDF paginé mis en forme avec mention d'exercice via `jspdf-autotable`.

---

## 3. SPÉCIFICATIONS FONCTIONNELLES DÉTAILLÉES

### 3.1 Module 1 : Authentification & Sécurité (RBAC)

#### Fonctions requises :
1. **Connexion Sécurisée (`POST /api/auth/login`) :**
   - Authentification par identifiant (email ou nom d'utilisateur) et mot de passe.
   - Restitution d'un jeton JWT contenant les claims d'identité, la date d'expiration et le rôle attribué (`ADMIN` ou `USER`).
2. **Gestion des Utilisateurs (`/users`) :**
   - **Rôle ADMIN :** Création, modification en ligne (avec option de mise à jour du mot de passe), consultation et suppression de comptes utilisateurs.
   - **Rôle USER :** Accès limité aux opérations métiers sans pouvoir modifier les comptes d'accès ou les paramètres système stratégiques.
   - **Garde de Sécurité :** Impossibilité pour l'utilisateur connecté de supprimer son propre compte (bouton désactivé dynamiquement avec badge "Vous").
   - **Initialisation Automatique (Seeding) :** `DataInitializer` génère un compte Administrateur par défaut lors de la première initialisation de l'application.

---

### 3.2 Module 2 : Gestion du Portefeuille Clients (CRM Assurance)

#### Fonctions requises :
1. **Typologie de Clientèle :**
   - **Client Particulier :**
     - Champs requis : CIN (Carte d'Identité Nationale), Nom, Prénom, Téléphone, Adresse.
   - **Client Société (Personne Morale) :**
     - Champs requis : Raison Sociale / Nom, ICE (Identifiant Commun de l'Entreprise — **contrôle strict à 15 chiffres**), IF (Identifiant Fiscal), RC (Registre de Commerce), Téléphone, Adresse.
2. **Numérisation & Documents Joints :**
   - Possibilité de télécharger un document joint (Scan CIN, Registre de Commerce, Attestation). Stockage physique sur serveur via `FileStorageService` et lien de consultation direct.
3. **Suivi du Compte Financier Client :**
   - Attribution d'un `budget` et suivi en temps réel du `credit` (créances/encours client dus à l'agence).

---

### 3.3 Module 3 : Gestion des Opérations & Production d'Assurances

Le module Production gère la saisie et le suivi de toutes les polices souscrites.

#### 3.3.1 Données Générales de Production
- **Nature d'opération :** Sélection parmi le référentiel (ex: Affaire Nouvelle, Renouvellement, Avenant, Resiliation).
- **Client :** Association avec un client existant (Particulier ou Société).
- **Dates & Périodes :** Date d'effet du contrat (`dateEff`), Mois d'émission/demande (`moisDem` au format `AAAA-MM`).
- **Compagnie d'assurance :** Choix de la compagnie émettrice principale.
- **Catégorie d'assurance :** Automobile, Maritime, Transport, Incendie, Risques Divers, Maladie, etc.
- **N° de Police :** Identifiant unique du contrat attribué par la compagnie.
- **Taux de TVA :** Sélection du taux applicable (ex: 14%, 20%).

#### 3.3.2 Spécificités du Registre MARITIME
Pour répondre aux exigences réglementaires et métiers du secteur Maritime (`MARITIME` et `MARITIME A C`) :
- **N° d'Ordre (`ordre`) :** Numéro séquentiel interne de registre maritime.
- **Navire (`navire`) :** Nom du bâtiment / navire couvert.
- **Certificat (`certificat`) :** Numéro du certificat d'assurance maritime.
- **Référence Compagnie (`refCie`) :** Référence dossier de la compagnie maritime.

#### 3.3.3 Moteur de Calcul des Primes & Exercice
Une police d'assurance est constituée d'une ou plusieurs lignes de paramètres financières (`ProductionParameter`) :
$$\text{Prime Ligne} = \text{Primes Nettet} + \text{Taxe} + \text{Taxe Parafiscale} + \text{Accessoires} + \text{CNPC}$$
$$\text{Montant Total Police} = \sum_{i=1}^{n} \text{Prime Ligne}_i$$
L'entité déduit automatiquement son **Exercice comptable** (`getExercice()`) à partir de l'année du mois d'émission (`moisDem`) ou de la date d'effet (`dateEff`).

#### 3.3.4 Ventilation Multi-Compagnies (Co-assurance / Co-courtage)
Dans les contrats complexes (notamment Maritimes `MARITIME A C`), la prime peut être partagée entre plusieurs compagnies d'assurances co-assureurs :
- Définition d'une liste de ventilations (`CompagneRepartition`) précisant la Compagnie Partenaire et le Pourcentage de participation (ex: AtlantaSanad 40%, RMA 30%, Wafa 30%).

---

### 3.4 Module 4 : Gestion des Règlements & Double Circuit Financier

Le système gère la totalité du cycle de règlement d'une police d'assurance via une entité `Reglement` liée à la `Production`.

#### 3.4.1 Dualité des Règlements (Double Circuit)
1. **Circuit Encaissements Clients (`payments`) :**
   - Enregistrement des versements effectués par le client souscripteur à l'agence d'assurance.
   - Informations capturées : Date de paiement, Montant (DH), Mode de règlement (Espèces, Chèque, Virement, Effet), Référence (N° Chèque/Virement).
   - Impact direct sur le solde du client : réduction automatique du crédit/créance client.
2. **Circuit Décaissements Compagnie / CIE (`paymentscie`) :**
   - Enregistrement des reversements de primes effectués par l'agence à la compagnie d'assurance émettrice.
   - Informations capturées : Date de versement, Montant reversement (DH), Mode de règlement, Référence bordereau/chèque.
   - **Isolement comptable :** Les règlements CIE n'affectent en aucun cas la créance du client souscripteur.
3. **N° de Facture :**
   - Saisie et association du numéro de facture officiel d'agence (`numFacture`).

#### 3.4.2 Calcul Automatique des Statuts de Règlement
À chaque enregistrement ou modification de paiement, le système recalcule le statut de l'opération :
$$\text{Reste à Payer Client} = \text{Montant Total Police} - \sum (\text{Paiements Client})$$

| Statut | Condition de déclenchement |
| :--- | :--- |
| **`EN_ATTENTE`** | Total des paiements client = 0 DH |
| **`PARTIEL`** | 0 DH < Total des paiements client < Montant Total Police |
| **`PAYE`** | Total des paiements client $\ge$ Montant Total Police |

---

### 3.5 Module 5 : Gestion des Exercices Comptables (Années Financières)

Ce module garantit l’étanchéité et la conformité de l’analyse financière par exercice comptable.

#### 5.1 Principes de Gestion d'Exercice
1. **Positionnement Automatique :** Lors de l'ouverture de l'application, l'exercice de l'année courante (ex: **2026**) est automatiquement sélectionné.
2. **Sélecteur d'Exercice (`ExerciceSelector`) :** Un menu déroulant accessible sur le Dashboard et le registre des Opérations permet à l'utilisateur de basculer instantanément vers un autre exercice (ex: `2024`, `2025`, `2026`, `2027`).
3. **Calculs d'API Filtrés (`GET /api/dashboard/stats?exercice=YYYY`) :** L'ensemble des indicateurs du Dashboard et du volume des émissions est restreint à l'exercice sélectionné.

---

### 3.6 Module 6 : Tableau de Bord Analytics & Indicateurs (KPIs)

Page centrale d'accueil (`/dashboard`) offrant une visibilité à 360° sur la santé financière et l'activité de l'agence pour l'exercice sélectionné.

#### 6.1 Indicateurs Clés de Performance (KPI Cards)
- **Total Opérations :** Nombre total de polices enregistrées au cours de l'exercice.
- **Chiffre d'Affaires / Volume Émis :** Somme cumulée des montants totaux des polices émises pour l'exercice.
- **Primes Encaissées :** Total des paiements effectivement reçus des clients au cours de l'exercice.
- **Reste à Recouvrer :** Total de l'encours client non encore réglé pour l'exercice.
- **Portefeuille Clients :** Nombre de clients actifs gérés.

#### 6.2 Visualisations Graphiques Intégrées
1. **Évolution Mensuelle de l'Exercice :** Histogramme des 12 mois de l'exercice sélectionné (`janv.` à `déc.`).
2. **Répartition par Catégorie de Risque :** Graphique circulaire / Donut synthétisant la part des différentes catégories sur l'exercice.
3. **Top Compagnies d'Assurance :** Barres de classement des compagnies partenaires en fonction du volume d'affaires apporté sur l'exercice.

#### 6.3 Suivi des Dernières Opérations
Tableau synthétique affichant les 5 dernières polices émettrices de l'exercice avec accès direct à la fiche de règlement et leur statut mis à jour en temps réel.

---

### 3.7 Module 7 : Recherche, Filtres Avancés & Exportations

#### 7.1 Moteur de Filtrage Multi-Critères
Sur le registre des opérations (`/operations`), l'utilisateur dispose d'un panneau de filtres temps réel :
- **Filtre par Exercice Comptable :** Sélection de l'année financière ciblée via `ExerciceSelector`.
- **Recherche textuelle globale :** Par nom de client, numéro de police ou numéro d'ordre.
- **Filtre par Catégorie d'assurance.**
- **Filtre par Compagnie d'assurance.**
- **Filtre par Mois d'émission (`Mois/Année`).**

#### 7.2 Exportation des Données avec Mention d'Exercice
- **Export Excel (CSV) :** Génération instantanée du registre filtré. Inclusion du BOM UTF-8 (`\uFEFF`) et nommage dynamique du fichier (ex: `operations_exercice_2026.csv`).
- **Export PDF Professionnel :** Mise en page automatique avec titre explicite (ex: `Liste des Opérations — Exercice 2026`), en-tête officiel de l'agence, pagination et totaux généraux calculés en bas de page (`jspdf` + `jspdf-autotable`).

---

### 3.8 Module 8 : Administration & Référentiels (Tables de Paramétrage)

Interface permettant à l'administrateur de gérer les tables de référence garantissant l'intégrité des listes déroulantes de saisie :
- **Compagnies (`/compagnes`) :** Nom, Code, Contact.
- **Catégories (`/categories`) :** Intitulé de la branche d'assurance.
- **Natures (`/natures`) :** Intitulé des types d'avenants/opérations.
- **Taux TVA (`/tva`) :** Taux applicables.
- **Paramètres de Prime (`/parametres`) :** Frais fixes et composantes de calcul.

---

## 4. SPÉCIFICATIONS NON-FONCTIONNELLES

### 4.1 Performance & Disponibilité
- **Temps de réponse API :** $< 200\text{ ms}$ pour les requêtes de lecture et de calcul d'agrégations par exercice.
- **Indexation Base de Données :** Index MongoDB configurés sur les champs fréquemment interrogés (`numpolice`, `client`, `type`, `status`).
- **Chargement Frontend :** Optimisation Next.js Server & Client Components pour un rendu instantané des élements interactifs lors des changements d'exercice.

### 4.2 Ergonomie & UI/UX Standards
- **Charte Graphique :** Palette de couleurs professionnelle dédiée aux institutions financières (Camaïeu de bleus d'affaires, ardoise et contrastes accessibles).
- **Espacement & Lisibilité :** Respect strict du système *Whitespace* (remplissage `px-10 py-10`, grilles `gap-8`) empêchant l'encombrement visuel des grands tableaux de données.
- **Adaptabilité Responsivité :** Ergonomie garantie sur écrans de bureau, portables et tablettes.

### 4.3 Sécurité & Protection des Données
- **Contrôle d'accès :** Validation systematic du JWT sur toutes les routes REST d'API (`/api/**`).
- **Protection CORS :** Restriction stricte des origines frontend autorisées (`CORS_ORIGINS`).
- **Contrôles de Saisie :** Validation côté client et backend des formats (ex: ICE entreprise strictement composé de 15 chiffres numériques, CIN valide, montants positifs).

### 4.4 Maintenance & Évolutivité
- **Architecture en Couches (Clean Architecture) :** Séparation étanche Controller -> Service -> Repository -> Model.
- **Typage Strict :** Absence d'utilisation de types `any` dans le code TypeScript frontend (`types/index.ts`).

---

## 5. MATRICE DE CORRESPONDANCE DES REGISTRES MÉTIES

| Colonne Registre Excel Originel | Entité & Champ App applicatif | Module Système |
| :--- | :--- | :--- |
| **POLICE** | `Production.numpolice` | Opérations & Production |
| **ORDRE** | `Production.ordre` | Opérations (Maritime) |
| **CLIENT** | `Client.nom` / `Production.client` | Portefeuille Client |
| **DATE EFF** | `Production.dateEff` | Opérations & Production |
| **MOIS DEM / EXERCICE** | `Production.moisDem` / `getExercice()` | Opérations & Exercices |
| **COMPAGNIE** | `Production.compagne` | Opérations & Referentiels |
| **N° FACTURE** | `Reglement.numFacture` | Règlements |
| **NAVIRE / CERTIFICAT** | `Production.navire` / `certificat` | Opérations (Maritime) |
| **REGLER PAR LE CLIENT** | `Reglement.payments` | Circuit Encaissement Client |
| **REGLER A LA CIE** | `Reglement.paymentscie` | Circuit Décaissements CIE |
| **RÉPARTITION CO-ASSURANCE** | `Production.repartitions` | Co-assurance / Ventilation |

---

## 6. PLAN DE RECETTE ET VALIDATION (VERIFICATION PLAN)

1. **Validation Authentification & Droits :**
   - Vérification de la création d'un utilisateur et de l'interdiction de suppression du compte propre de l'admin.
2. **Validation Saisie Production & Maritime :**
   - Création d'une police standard et d'une police maritime avec N° d'Ordre, Navire et répartition multi-compagnies.
3. **Validation de la Séparation des Exercices Comptables :**
   - Sélection de l'exercice 2026 sur le Dashboard et vérification de l'affichage des KPIs de 2026.
   - Basculement sur l'exercice 2025 et confirmation de l'actualisation dynamique des statistiques et du graphique sur 12 mois (`2025-01` à `2025-12`).
4. **Validation Double Circuit de Règlement :**
   - Saisie d'un acompte client et vérification du passage du statut de `EN_ATTENTE` à `PARTIEL`.
   - Saisie du solde client et vérification du passage automatique au statut `PAYE`.
   - Saisie d'un règlement décaissement CIE et confirmation de l'absence d'impact sur le solde client.
5. **Validation des Exports & Analytics :**
   - Contrôle de la présence de l'exercice sélectionné dans l'en-tête du fichier PDF et du nom de fichier Excel CSV.
   - Génération d'un fichier Excel CSV et vérification de la parfaite ouverture dans MS Excel sans altération des accents.
