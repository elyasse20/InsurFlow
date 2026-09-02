# RAPPORT DE PROJET DE FIN D'ANNÉE (PFA - 4IIR)

```
========================================================================================
                          ÉCOLE MAROCAINE DES SCIENCES DE L'INGÉNIEUR
                                         EMSI RABAT / CASABLANCA
                          Filière : Ingénierie Informatique et Réseaux (4IIR)
========================================================================================
```

---

<div align="center">

---

\newpage

# Dédicaces

*À nos très chers parents, pour leurs sacrifices incommensurables, leur soutien indéfectible, leur amour inconditionnel et leurs prières tout au long de notre parcours universitaire et personnel.*

*À nos frères et sœurs, pour leur encouragement constant, leur présence chaleureuse et leur bienveillance.*

*À l'ensemble de nos professeurs et formateurs de l'École Marocaine des Sciences de l'Ingénieur (EMSI), qui nous ont transmis le savoir, la rigueur technique et la passion de l'ingénierie logicielle.*

*À tous nos collègues et amis de la promotion 4IIR, avec lesquels nous avons partagé des moments d'apprentissage inoubliables et stimulants.*

*À tous ceux qui ont contribué, de près ou de loin, à l'aboutissement de ce travail.*

<div align="right">
<em>Nous vous dédions ce modeste travail en témoignage de notre profonde gratitude.</em>
</div>

---

\newpage

# Remerciements

Au terme de ce projet de fin d'année, nous tenons à exprimer notre profonde gratitude et nos sincères remerciements à toutes les personnes qui ont contribué à la réussite de ce travail d'ingénierie.

Nous exprimons nos vifs remerciements à notre encadrant pédagogique de l'**École Marocaine des Sciences de l'Ingénieur (EMSI)**, Pr. [Nom de l'encadrant], pour son encadrement bienveillant, ses conseils méthodologiques éclairés, sa disponibilité constante et ses orientations techniques précieuses tout au long de ce projet.

Nous tenons également à adresser nos sincères remerciements à notre encadrant professionnel au sein de l'organisme d'accueil, M. [Nom de l'encadrant], pour la confiance qu'il nous a accordée en nous confiant ce projet d'envergure, pour son partage d'expertise métier dans le secteur des assurances marocaines et pour son suivi rigoureux des livrables.

Nos remerciements s'adressent également au corps professoral et à la direction pédagogique de l'EMSI pour la qualité de la formation dispensée durant notre cursus d'ingénieur en Informatique et Réseaux.

Enfin, nous remercions l'ensemble des membres de l'équipe technique et métier de l'organisme d'accueil pour leur accueil chaleureux, leur collaboration et leur disponibilité lors des phases d'analyse des processus existants et de recette applicative.

---

\newpage

# Table des Matières

- [Introduction Générale](#introduction-générale)
- [Chapitre 1 : Présentation du cadre de projet](#chapitre-1--présentation-du-cadre-de-projet)
  - [1. Introduction](#1-introduction)
  - [2. Présentation de la société d&#39;accueil](#2-présentation-de-la-société-daccueil)
    - [2.1. Secteur d&#39;activité et missions](#21-secteur-dactivité-et-missions)
    - [2.2. Structure organisationnelle et organigramme](#22-structure-organisationnelle-et-organigramme)
    - [2.3. Outils informatiques et environnement initial](#23-outils-informatiques-et-environnement-initial)
  - [3. Étude de l&#39;existant](#3-étude-de-lexistant)
    - [3.1. Description de l&#39;existant](#31-description-de-lexistant)
    - [3.2. Critique de l&#39;existant](#32-critique-de-lexistant)
    - [3.3. Solution proposée](#33-solution-proposée)
  - [4. Choix de modèle de développement](#4-choix-de-modèle-de-développement)
    - [4.1. Démarche Agile Scrum](#41-démarche-agile-scrum)
    - [4.2. Rôles et cérémonies Scrum](#42-rôles-et-cérémonies-scrum)
  - [5. Planification du projet](#5-planification-du-projet)
    - [5.1. Planning prévisionnel](#51-planning-prévisionnel)
    - [5.2. Planning réel et analyse des écarts](#52-planning-réel-et-analyse-des-écarts)
  - [6. Conclusion](#6-conclusion)
- [Chapitre 2 : Spécification des besoins](#chapitre-2--spécification-des-besoins)
  - [1. Introduction](#1-introduction-1)
  - [2. Spécification des besoins fonctionnels](#2-spécification-des-besoins-fonctionnels)
    - [2.1. Gestion des polices d&#39;assurance et production](#21-gestion-des-polices-dassurance-et-production)
    - [2.2. Gestion financière et double circuit de règlements](#22-gestion-financière-et-double-circuit-de-règlements)
    - [2.3. Gestion du portefeuille clients et conformité KYC](#23-gestion-du-portefeuille-clients-et-conformité-kyc)
    - [2.4. Module de facturation et génération documentaire](#24-module-de-facturation-et-génération-documentaire)
    - [2.5. Modules d&#39;Intelligence Artificielle : Sinistres et Risques](#25-modules-dintelligence-artificielle--sinistres-et-risques)
    - [2.6. Tableau de bord analytics et exercices comptables](#26-tableau-de-bord-analytics-et-exercices-comptables)
    - [2.7. Administration système, sécurité RBAC et référentiels](#27-administration-système-sécurité-rbac-et-référentiels)
  - [3. Spécification des besoins non fonctionnels](#3-spécification-des-besoins-non-fonctionnels)
  - [4. Présentation des cas d&#39;utilisation](#4-présentation-des-cas-dutilisation)
    - [4.1. Présentation des acteurs](#41-présentation-des-acteurs)
    - [4.2. Description des cas d&#39;utilisation](#42-description-des-cas-dutilisation)
    - [4.3. Diagramme des cas d&#39;utilisation global](#43-diagramme-des-cas-dutilisation-global)
  - [5. Conclusion](#5-conclusion-1)
- [Chapitre 3 : Conception du système](#chapitre-3--conception-du-système)
  - [1. Introduction](#1-introduction-2)
  - [2. Modélisation dynamique](#2-modélisation-dynamique)
    - [2.1. Diagrammes de séquences](#21-diagrammes-de-séquences)
    - [2.2. Diagrammes de collaboration](#22-diagrammes-de-collaboration)
    - [2.3. Diagrammes d&#39;états-transitions](#23-diagrammes-détats-transitions)
    - [2.4. Diagrammes d&#39;activité](#24-diagrammes-dactivité)
  - [3. Modélisation statique](#3-modélisation-statique)
    - [3.1. Diagramme de classes](#31-diagramme-de-classes)
    - [3.2. Modèle relationnel (MLD)](#32-modèle-relationnel-mld)
    - [3.3. Dictionnaire de données](#33-dictionnaire-de-données)
    - [3.4. Architecture de l&#39;application](#34-architecture-de-lapplication)
      - [3.4.1. Architecture logicielle](#341-architecture-logicielle)
      - [3.4.2. Architecture matérielle](#342-architecture-matérielle)
  - [4. Conclusion](#4-conclusion-2)
- [Chapitre 4 : Réalisation du système](#chapitre-4--réalisation-du-système)
  - [1. Introduction](#1-introduction-3)
  - [2. Environnement de développement](#2-environnement-de-développement)
    - [2.1. Environnement matériel](#21-environnement-matériel)
    - [2.2. Environnement logiciel](#22-environnement-logiciel)
  - [3. Principales interfaces graphiques](#3-principales-interfaces-graphiques)
    - [3.1. Page d&#39;authentification sécurisée et contrôle d&#39;accès JWT](#31-page-dauthentification-sécurisée-et-contrôle-daccès-jwt)
    - [3.2. Tableau de bord exécutif &amp; analytics par exercice comptable](#32-tableau-de-bord-exécutif--analytics-par-exercice-comptable)
    - [3.3. Registre de production des opérations et filtres multi-critères](#33-registre-de-production-des-opérations-et-filtres-multi-critères)
    - [3.4. Formulaire de police maritime et ventilation co-assurance](#34-formulaire-de-police-maritime-et-ventilation-co-assurance)
    - [3.5. Fiche de détail du double circuit financier (Clients &amp; CIE)](#35-fiche-de-détail-du-double-circuit-financier-clients--cie)
    - [3.6. Module facturation, devis proforma et factures d&#39;avoir](#36-module-facturation-devis-proforma-et-factures-davoir)
    - [3.7. Document officiel de facturation et devis PDF haute résolution](#37-document-officiel-de-facturation-et-devis-pdf-haute-résolution)
    - [3.8. Modal d&#39;analyse intelligente des sinistres par IA (Claims AI)](#38-modal-danalyse-intelligente-des-sinistres-par-ia-claims-ai)
    - [3.9. Registre et pilotage du cycle de vie des sinistres](#39-registre-et-pilotage-du-cycle-de-vie-des-sinistres)
    - [3.10. Stack d&#39;observabilité et monitoring de production (Grafana / Prometheus)](#310-stack-dobservabilité-et-monitoring-de-production-grafana--prometheus)
    - [3.11. Pipeline d&#39;automatisation DevSecOps (CI/CD GitHub Actions &amp; Scans Trivy)](#311-pipeline-dautomatisation-devsecops-cicd-github-actions--scans-trivy)
  - [4. Conclusion](#4-conclusion-3)
- [Conclusion Générale](#conclusion-générale)
- [Bibliographie et Nétographie](#bibliographie-et-nétographie)
- [Annexes](#annexes)

---

\newpage

# Liste des Figures

- **Figure 1 :** Structure organisationnelle de l'organisme d'accueil
- **Figure 2 :** Cycle de vie Scrum appliqué au projet InsurFlow
- **Figure 3 :** Diagramme de Gantt Prévisionnel du projet InsurFlow
- **Figure 4 :** Diagramme de Gantt Réel du projet InsurFlow
- **Figure 5 :** Diagramme des cas d'utilisation global du système InsurFlow
- **Figure 6 :** Diagramme de séquences « Authentification utilisateur et génération de jeton JWT »
- **Figure 7 :** Diagramme de séquences « Saisie d'une police d'assurance maritime et répartition co-assurance »
- **Figure 8 :** Diagramme de séquences « Enregistrement d'un encaissement client et recalcul du solde »
- **Figure 9 :** Diagramme de séquences « Émission de facture et génération de document PDF certifié »
- **Figure 10 :** Diagramme de séquences « Analyse automatisée d'un sinistre par le moteur IA »
- **Figure 11 :** Diagramme de collaboration « Gestion des encaissements et mise à jour financière »
- **Figure 12 :** Diagramme d'états-transitions du statut de règlement d'une police d'assurance
- **Figure 13 :** Diagramme d'états-transitions d'une facture
- **Figure 14 :** Diagramme d'activité « Processus complet d'émission de police et de facturation »
- **Figure 15 :** Diagramme d'activité « Traitement du double circuit de règlement financier »
- **Figure 16 :** Diagramme de classes métier du système InsurFlow
- **Figure 17 :** Architecture logicielle 3-tiers (Diagramme de composants)
- **Figure 18 :** Architecture matérielle et infrastructure Cloud (Diagramme de déploiement)
- **Figure 19 :** Interface de la Page d'Authentification Sécurisée et Contrôle d'Accès JWT
- **Figure 20 :** Interface du Tableau de Bord Exécutif & Analytics par Exercice Comptable
- **Figure 21 :** Interface du Registre de Production des Opérations avec filtres multi-critères et exports
- **Figure 22 :** Interface du Formulaire de Saisie d'une Police Maritime et ventilation Co-assurance
- **Figure 23 :** Interface de la Fiche de Détail du Double Circuit Financier (Clients & CIE)
- **Figure 24 :** Interface du Module Facturation, Devis Proforma et Factures d'Avoir
- **Figure 25 :** Document officiel de Facture / Devis PDF généré via le moteur OpenPDF
- **Figure 26 :** Interface du Modal d'Analyse Intelligente des Sinistres par IA (Claims AI)
- **Figure 27 :** Tableau de bord et registre de gestion du portefeuille de sinistres
- **Figure 28 :** Interface du Tableau de Bord d'Observabilité & Monitoring Grafana / Prometheus
- **Figure 29 :** Pipeline CI/CD DevSecOps sous GitHub Actions avec scans de sécurité Trivy

---

\newpage

# Liste des Tableaux

- **Tableau 1 :** Description du cas d'utilisation « Authentification et Contrôle d'accès »
- **Tableau 2 :** Description du cas d'utilisation « Enregistrement d'une Police d'Assurance »
- **Tableau 3 :** Description du cas d'utilisation « Gestion du Double Circuit de Règlements »
- **Tableau 4 :** Description du cas d'utilisation « Génération et Téléchargement de Facture PDF »
- **Tableau 5 :** Description du cas d'utilisation « Analyse Intelligente d'une Déclaration de Sinistre »
- **Tableau 6 :** Description du cas d'utilisation « Pilotage Analytics et Filtrage par Exercice Comptable »
- **Tableau 7 :** Dictionnaire de données du système InsurFlow
- **Tableau 8 :** Spécifications de l'environnement matériel de développement et de déploiement

---

\newpage

# Introduction Générale

Le secteur de l'assurance et du courtage constitue l'un des piliers stratégiques de l'économie marocaine et internationale. Il garantit la pérennité des investissements des entreprises, protège les patrimoines individuels et absorbe les risques financiers inhérents aux activités professionnelles et personnelles. Au Maroc, ce secteur est encadré par des exigences réglementaires strictes édictées par l'Autorité de Contrôle des Assurances et de la Prévoyance Sociale (ACAPS) et régies par la Loi n° 17-99 portant Code des Assurances. Ces dispositions imposent aux intermédiaires d'assurance (courtiers et agents généraux) une rigueur absolue dans la tenue des registres de production, la gestion des créances clients, la réconciliation financière avec les compagnies d'assurance mandantes et la conservation des pièces justificatives.

Cependant, de nombreuses structures de courtage et cabinets d'assurance opèrent encore à l'aide d'outils hétérogènes, fragmentés ou semi-manuels, principalement basés sur des classeurs papier et des feuilles de calcul Microsoft Excel disparates (`PROD S C`, `PROD A C`, `MARITIME`, `MARITIME A C`). Cette organisation artisanale génère des dysfonctionnements majeurs : redondance massive des saisies, risques élevés d'erreurs de calcul sur les taxes et accessoires, opacité dans le suivi des encaissements clients et des reversements aux compagnies d'assurances (CIE), impossibilité d'isoler rigoureusement les exercices comptables annuels, et absence d'outils analytiques d'aide à la décision. De surcroît, le traitement des déclarations de sinistres et l'évaluation des risques de souscription demeurent des processus lents, dépourvus de mécanismes automatisés de détection des fraudes ou d'orientation juridique selon les barèmes conventionnels.

C'est dans ce contexte que s'inscrit notre Projet de Fin d'Année (PFA). Notre objectif principal est de concevoir et de réaliser **InsurFlow**, une plateforme ERP d'entreprise moderne, sécurisée, cloud-native et enrichie par l'Intelligence Artificielle. InsurFlow est spécialement conçue pour moderniser l'intégralité de la chaîne de valeur du courtage d'assurance :

- La gestion centralisée du portefeuille clients avec conformité KYC (contrôle strict de l'Identifiant Commun de l'Entreprise à 15 chiffres, CIN, Registre de Commerce) ;
- La production et l'émission des polices d'assurance standards et maritimes (avec numéro d'ordre interne, navires, certificats et ventilation co-assurance multi-compagnies) ;
- La gestion étanche d'un **double circuit financier** isolant les encaissements clients des décaissements compagnies ;
- La clôture et l'analyse étanche par **exercice comptable financier** ;
- La facturation automatisée (factures standards, devis proforma, avoirs) avec génération de documents PDF officiels et exports Excel sécurisés en encodage UTF-8 BOM ;
- L'assistance intelligente à la gestion des sinistres (évaluation de responsabilité, chiffrage net après franchise et détection des fraudes) et l'aide à la souscription par IA ;
- Un déploiement automatisé selon les standards **DevSecOps** sur infrastructure Cloud Azure avec supervision en temps réel (Prometheus / Grafana).

Pour rendre compte de l'ensemble des travaux menés, ce rapport s'articule autour de quatre chapitres complémentaires :

- Le **Chapitre 1** est consacré à la présentation du cadre du projet, de l'organisme d'accueil, à l'étude critique de l'existant, à la solution proposée, au choix de la méthodologie Agile Scrum et au planning prévisionnel ;
- Le **Chapitre 2** détaille la spécification des besoins fonctionnels et non fonctionnels, l'identification des acteurs, la description textuelle normalisée des cas d'utilisation et le diagramme global des cas d'utilisation ;
- Le **Chapitre 3** aborde la conception approfondie du système à travers la modélisation dynamique UML 2 (diagrammes de séquences boîte blanche, collaboration, états-transitions, activités), la modélisation statique (diagramme de classes, modèle relationnel, dictionnaire de données exhaustif) ainsi que l'architecture logicielle 3-tiers et l'architecture matérielle de déploiement ;
- Le **Chapitre 4** décrit la phase de réalisation, comprenant l'environnement matériel et logiciel adopté, la présentation commentée des principales interfaces graphiques développées et la chaîne DevSecOps.

Enfin, une **Conclusion Générale** récapitule les objectifs atteints, souligne les défis techniques surmontés et ouvre sur les perspectives d'évolution future du système InsurFlow.

---

\newpage

# Chapitre 1 : Présentation du cadre de projet

## 1. Introduction

Ce premier chapitre a pour vocation d'introduire le cadre organisationnel et méthodologique dans lequel s'est déroulé notre projet de fin d'année. Nous présentons dans un premier temps l'organisme d'accueil, ses missions et son environnement informatique initial. Nous réalisons ensuite une étude approfondie de l'existant afin de mettre en exergue ses insuffisances et de justifier la solution novatrice proposée. Enfin, nous explicitons le choix du modèle de cycle de vie de développement logiciel adopté (Agile Scrum) et détaillons le planning prévisionnel du projet.

## 2. Présentation de la société d'accueil

### 2.1. Secteur d'activité et missions

Notre projet s'est déroulé au sein d'un cabinet de courtage en assurances associé à la structure d'ingénierie logicielle **YK Software Solutions**. L'organisme d'accueil opère en tant qu'intermédiaire agréé entre les grandes compagnies d'assurance opérant sur le marché marocain (telles que Sanlam Maroc, Wafa Assurance, RMA, AtlantaSanad, AXA Assurance Maroc) et une clientèle diversifiée composée d'entreprises industrielles, de sociétés de transport et logistique, de flottes maritimes et de particuliers.

Les missions fondamentales de l'organisme consistent à :

- Conseiller les clients souscripteurs et négocier pour leur compte les meilleures couvertures d'assurance au meilleur coût ;
- Émettre et enregistrer les polices d'assurance, quittances et avenants dans le respect des barèmes réglementaires ;
- Assurer le recouvrement des primes d'assurance auprès des clients et reverser les montants dus aux compagnies d'assurance mandantes après déduction des commissions contractuelles ;
- Assister les assurés lors de la survenance de sinistres (expertise, recours, indemnisation) ;
- Assurer la conservation légale et l'archivage des documents contractuels et comptables.

### 2.2. Structure organisationnelle et organigramme

L'organisme d'accueil s'articule autour de quatre départements opérationnels complémentaires :

1. **La Direction Générale :** Définit les orientations stratégiques, les partenariats avec les compagnies et supervise la rentabilité globale.
2. **Le Département Production & Souscription :** Prend en charge l'accueil des clients, la tarification, l'élaboration des contrats et la tenue des registres de production.
3. **Le Département Comptabilité & Recouvrement :** Supervise la facturation, l'encaissement des primes, la gestion des créances clients et le règlement des soldes aux compagnies d'assurance.
4. **Le Département Systèmes d'Information & Digitalisation :** Assure le maintien opérationnel du parc informatique, la sécurité des données et le pilotage des projets de transformation numérique.

```mermaid
graph TD
    DG["Direction Générale"]
    DP["Département Production & Souscription"]
    DC["Département Comptabilité & Recouvrement"]
    DSI["Département Systèmes d'Information"]
  
    DG --> DP
    DG --> DC
    DG --> DSI
  
    DP --> P1["Cellule Assurances Entreprises & Maritime"]
    DP --> P2["Cellule Assurances Particuliers & Flottes"]
  
    DC --> C1["Cellule Encaissements Clients"]
    DC --> C2["Cellule Règlements Compagnies (CIE)"]
  
    DSI --> S1["Ingénierie Logicielle & Cloud"]
    DSI --> S2["Support & Sécurité des Données"]
```

<div align="center">
<b>Figure 1 : Structure organisationnelle de l'organisme d'accueil</b>
</div>

### 2.3. Outils informatiques et environnement initial

Avant le lancement de notre projet, le service de production utilisait un outil historique (legacy) reposant sur une architecture Node.js/React minimale couplée à une utilisation prédominante de fichiers Microsoft Excel partagés en réseau local. Ces classeurs, articulés autour de feuilles de calcul nommées `PROD S C`, `PROD A C`, `MARITIME` et `MARITIME A C`, faisaient office d'unique référentiel de travail pour la saisie des opérations d'assurance et le lettrage des règlements.

## 3. Étude de l'existant

### 3.1. Description de l'existant

L'analyse des modalités de travail au sein de l'agence a mis en lumière un processus séquentiel fortement tributaire de manipulations humaines :

1. **Saisie des contrats :** Lors de la souscription d'une police (automobile, risques divers, transport ou maritime), le gestionnaire reporte manuellement les informations dans le classeur Excel correspondant. Pour les contrats maritimes, la saisie inclut le nom du navire, le numéro de certificat, le numéro d'ordre interne et les parts de co-assurance.
2. **Calcul des primes :** Le montant total de la police est calculé en additionnant la prime nette, les taxes applicables, la taxe parafiscale, les accessoires et la contribution CNPC.
3. **Règlements et encaissements :** Lorsqu'un client effectue un versement (par chèque, virement ou espèces), le comptable saisit la ligne de paiement dans la colonne du registre. En parallèle, lorsqu'un chèque de reversement est émis au profit de la compagnie d'assurance (CIE), une seconde saisie est effectuée.
4. **Facturation :** Les factures étaient rédigées manuellement sur un modèle Word, sans synchronisation automatique avec les quittances émises.

### 3.2. Critique de l'existant

L'étude critique du système existant a permis d'identifier plusieurs faiblesses majeures :

- **Absence de séparation des exercices comptables :** Toutes les opérations étaient consignées de manière continue dans les mêmes fichiers sans cloisonnement étanche par année fiscale. Les bilans de fin d'année et les comparaisons inter-exercices imposaient des manipulations complexes et sources d'erreurs.
- **Risques majeurs d'intégrité et redondance des données :** L'absence de base de données relationnelle ou documentaire centralisée entraînait des doublons, des discordances entre les fiches clients et des pertes d'historique en cas d'écrasement de fichier.
- **Confusion dans le double circuit financier :** L'imbrication des règlements clients (encaissements) et des règlements compagnies (décaissements) sur les mêmes lignes de tableur faussait le calcul des créances réelles des clients et compliquait le rapprochement des comptes de courtage.
- **Défaut de validation des formats réglementaires :** Aucun contrôle systématique n'était opéré sur des identifiants cruciaux tels que l'ICE (Identifiant Commun de l'Entreprise à 15 chiffres) ou les numéros de CIN.
- **Inexistence d'outils d'aide à la décision et d'IA :** Les gestionnaires ne disposaient d'aucun tableau de bord de performance en temps réel, ni d'outil automatisé pour qualifier la gravité des sinistres ou évaluer le risque de souscription.
- **Vulnérabilités de sécurité et d'auditabilité :** Absence de traçabilité des modifications, pas de chiffrement des données sensibles, authentification rudimentaire et absence de plan de reprise d'activité.

### 3.3. Solution proposée

Face à ces constats, nous avons proposé la conception et la réalisation de la plateforme **InsurFlow**, un ERP d'assurance full-stack cloud-native offrant :

- Une **architecture applicative d'entreprise** moderne reposant sur **Spring Boot 3.3 (Java 21 LTS)** pour le backend REST et **Next.js 15 / React 19 (TypeScript)** pour le frontend réactif ;
- Une **gestion native et étanche des exercices comptables**, permettant de filtrer instantanément l'ensemble des indicateurs, registres et opérations par année fiscale ;
- Une modélisation fidèle de la totalité des **registres de production d'assurance** (`PROD S C`, `PROD A C`, `MARITIME`, `MARITIME A C`) avec gestion de la co-assurance multi-compagnies ;
- Un **double circuit financier indépendant** garantissant la séparation comptable entre les encaissements souscripteurs et les décaissements compagnies d'assurance ;
- Un moteur complet de **facturation et de génération documentaire PDF certifiée** (OpenPDF & jsPDF-autotable) avec exports Excel CSV en encodage UTF-8 avec BOM ;
- Des **modules d'Intelligence Artificielle** pour l'évaluation des risques de souscription et l'analyse automatisée des déclarations de sinistres (chiffrage, barème ACAPS et détection de fraude) ;
- Une chaîne d'intégration et de déploiement continu **DevSecOps** automatisée via GitHub Actions, analyse de vulnérabilités Trivy, conteneurisation Docker multi-services, reverse-proxy Nginx TLS 1.3 avec certificats Let's Encrypt et observabilité temps réel sous Prometheus / Grafana sur machine virtuelle Azure.

## 4. Choix de modèle de développement

### 4.1. Démarche Agile Scrum

Pour conduire ce projet dans les meilleures conditions de flexibilité, de qualité et de réactivité face à l'évolution des exigences métiers, nous avons adopté la méthodologie **Agile Scrum**.

Ce choix se justifie par :

- La nécessité d'itérations courtes (Sprints de 2 à 3 semaines) permettant de valider régulièrement les fonctionnalités auprès des utilisateurs finaux ;
- La capacité à intégrer rapidement les retours métiers sur les spécificités des registres d'assurance et des calculs de taxes ;
- Une visibilité transparente sur l'avancement des développements via un Backlog de produit hiérarchisé ;
- La maîtrise des risques techniques grâce à l'intégration continue et aux tests automatisés.

```mermaid
graph LR
    PB["Product Backlog"] --> SP["Sprint Planning"]
    SP --> SB["Sprint Backlog"]
    SB --> SPRINT["Sprint (2-3 Semaines)"]
    SPRINT --> DAILY["Daily Scrum (15 min)"]
    DAILY --> SPRINT
    SPRINT --> INCR["Incrément Potentiellement Livrable"]
    INCR --> SR["Sprint Review"]
    SR --> SRET["Sprint Retrospective"]
    SRET --> SP
```

<div align="center">
<b>Figure 2 : Cycle de vie Scrum appliqué au projet InsurFlow</b>
</div>

### 4.2. Rôles et cérémonies Scrum

Dans le cadre de notre organisation :

- **Product Owner (PO) :** Représenté par notre encadrant professionnel, garant de la vision métier, de la priorisation des exigences du cahier des charges et de la validation des recettes applicatives.
- **Scrum Master & Équipe de Développement :** Assuré par nous-mêmes, veillant au respect des principes agiles, à la levée des blocages techniques, à la conception architecturale, au développement full-stack et au déploiement DevSecOps.
- **Cérémonies appliquées :** Sprint Planning en début d'itération, points d'avancement réguliers, Sprint Review lors de la livraison des incréments logiciels et Sprint Retrospective pour optimiser nos pratiques d'ingénierie.

## 5. Planification du projet

La conduite de notre projet s'est articulée autour de la méthode Agile Scrum sur une période intensive de deux mois (8 semaines), s'étalant du 1er juillet au 1er septembre. Afin d'assurer un pilotage rigoureux et de mesurer l'efficacité de nos itérations, nous distinguons la planification prévisionnelle initiale du déroulement réel observé sur le terrain à travers des diagrammes de Gantt chronologiques.

### 5.1. Planning prévisionnel

Le diagramme de Gantt prévisionnel détaille l'enchaînement initial théorique des différentes phases de développement réparties sur les 8 semaines de stage (du 01 juillet au 01 septembre).

[Insérer ici l'image : Figure 3 - Diagramme de Gantt Prévisionnel du projet InsurFlow]

<div align="center">
<b>Figure 3 : Diagramme de Gantt Prévisionnel du projet InsurFlow</b>
</div>

### 5.2. Planning réel et analyse des écarts

Le diagramme de Gantt réel retrace l'exécution effective des activités tout au long du stage et met en évidence la flexibilité opérée durant les sprints.

[Insérer ici l'image : Figure 4 - Diagramme de Gantt Réel du projet InsurFlow]

<div align="center">
<b>Figure 4 : Diagramme de Gantt Réel du projet InsurFlow</b>
</div>

**Commentaire analytique sur le déroulement réel :**  
La comparaison entre la trajectoire prévisionnelle et la réalité du terrain montre un respect rigoureux du calendrier global. La complexité liée à la modélisation des polices maritimes et du double circuit financier a nécessité une semaine supplémentaire lors du sprint Core ERP (étalé jusqu'au 14 août). Grâce à la réactivité Scrum et à l'ajustement du backlog, le déploiement sur la machine virtuelle Azure, la recette fonctionnelle et la finalisation de la rédaction du rapport ont été menés en parallèle sur la seconde quinzaine d'août, permettant une livraison complète et opérationnelle au 1er septembre.

## 6. Conclusion

Ce premier chapitre nous a permis de situer le projet dans son contexte d'ingénierie, de présenter l'organisme d'accueil et d'établir un diagnostic rigoureux du système d'information existant. Les lacunes constatées justifient pleinement le développement de la plateforme InsurFlow selon la méthodologie Agile Scrum. Le chapitre suivant est consacré à la spécification formelle et détaillée des besoins fonctionnels et non fonctionnels du système.

---

\newpage

# Chapitre 2 : Spécification des besoins

## 1. Introduction

La réussite d'un projet d'ingénierie logicielle dépend de l'exactitude de la phase d'ingénierie des exigences. Ce chapitre a pour objectif de spécifier de manière exhaustive l'ensemble des besoins auxquels la plateforme InsurFlow doit répondre. Nous distinguons rigoureusement les besoins fonctionnels, structurés par domaine métier et hiérarchisés, des besoins non fonctionnels qui régissent la qualité, la sécurité et la performance du système. Nous présentons ensuite les acteurs du système ainsi que les cas d'utilisation formalisés selon les standards académiques et le diagramme global des cas d'utilisation.

## 2. Spécification des besoins fonctionnels

Les besoins fonctionnels représentent les services et opérations métiers indispensables que le système doit offrir aux utilisateurs.

### 2.1. Gestion des polices d'assurance et production

Ce besoin concerne la capture, le calcul et le suivi des contrats d'assurance émis par l'agence.

#### 2.1.1. Saisie des polices standards (`PROD S C` et `PROD A C`)

Le système doit permettre au gestionnaire de saisir l'ensemble des caractéristiques d'une police : client souscripteur, nature d'opération (Affaire Nouvelle, Renouvellement, Avenant, Résiliation), date d'effet, mois de demande (`moisDem` au format `AAAA-MM`), compagnie d'assurance émettrice, catégorie/branche de risque, numéro de police et taux de TVA applicable.

#### 2.1.2. Spécificités du registre maritime (`MARITIME` et `MARITIME A C`)

Pour les opérations maritimes, le système doit obligatoirement capturer des données techniques supplémentaires :

- Numéro d'Ordre séquentiel interne (`ordre`) ;
- Nom du navire ou du bâtiment couvert (`navire`) ;
- Numéro du certificat d'assurance maritime (`certificat`) ;
- Référence dossier de la compagnie (`refCie`).

#### 2.1.3. Répartition co-assurance multi-compagnies

Dans le cadre de polices souscrites en co-assurance ou co-courtage, le système doit permettre de ventiler la prime entre plusieurs compagnies d'assurances partenaires en renseignant pour chacune le pourcentage de couverture attribué (ex: AtlantaSanad 40%, RMA 30%, Wafa 30%).

#### 2.1.4. Moteur de calcul automatisé des primes

Le système doit calculer automatiquement les montants totaux de prime à partir d'une ou plusieurs lignes de paramètres financiers selon la formule réglementaire :

$$
\text{Prime Ligne} = \text{Prime Nette} + \text{Taxe} + \text{Taxe Parafiscale} + \text{Accessoires} + \text{CNPC}
$$

$$
\text{Montant Total Police} = \sum_{i=1}^{n} \text{Prime Ligne}_i
$$

### 2.2. Gestion financière et double circuit de règlements

Ce module assure la traçabilité intégrale des flux monétaires générés par les polices d'assurance.

#### 2.2.1. Circuit des encaissements clients

Le système doit enregistrer les règlements versés par les assurés (espèces, chèque avec date d'échéance et banque émettrice, virement bancaire ou effet). Chaque encaissement validé vient automatiquement réduire le crédit (créance) du client souscripteur.

#### 2.2.2. Circuit des décaissements compagnies d'assurance (CIE)

Le système doit enregistrer de manière totalement étanche les reversements effectués par l'agence de courtage aux compagnies d'assurance mandantes. Ces opérations de décaissement n'impactent en aucun cas la situation de créance du client souscripteur.

#### 2.2.3. Calcul automatique du statut de règlement

À chaque mouvement financier, le système doit recalculer en temps réel l'état de l'opération :

- `EN_ATTENTE` : Aucun encaissement client enregistré ;
- `PARTIEL` : Total des encaissements client strictement inférieur au montant total de la police ;
- `PAYE` : Total des encaissements client supérieur ou égal au montant total de la police.

### 2.3. Gestion du portefeuille clients et conformité KYC

Ce besoin assure la gestion centralisée et le contrôle de conformité des souscripteurs.

#### 2.3.1. Gestion des clients particuliers

Saisie de la Carte d'Identité Nationale (CIN), nom, prénom, numéro de téléphone, adresse et suivi du crédit accordé.

#### 2.3.2. Gestion des clients sociétés (personnes morales)

Saisie obligatoire de la raison sociale, de l'Identifiant Commun de l'Entreprise (**ICE soumis à une validation stricte de 15 chiffres numériques**), de l'Identifiant Fiscal (IF), du Registre de Commerce (RC), du téléphone et de l'adresse.

#### 2.3.3. Gestion Électronique des Documents (GED)

Possibilité de télécharger, stocker sur le serveur sécurisé et visualiser les pièces justificatives associées aux dossiers clients (scan CIN, attestation ICE, modèle J du registre de commerce).

### 2.4. Module de facturation et génération documentaire

#### 2.4.1. Gestion des factures standards, devis proforma et avoirs

Le système doit permettre la création de factures standards adossées aux opérations, de devis proforma pour les prospects et de factures d'avoir pour les annulations ou régularisations comptables.

#### 2.4.2. Génération de documents PDF officiels

Le système doit générer à la volée des factures et bordereaux au format PDF haute résolution, respectant la charte graphique officielle de l'agence, mentionnant le détail des taxes (TVA, HT, TTC) et le statut de paiement.

#### 2.4.3. Exportation universelle des registres

Exportation des tables d'opérations et de règlements aux formats PDF paginé (avec jsPDF-AutoTable) et Excel CSV avec inclusion du préfixe UTF-8 BOM pour garantir la parfaite lisibilité des caractères accentués et arabes sous Microsoft Excel.

### 2.5. Modules d'Intelligence Artificielle : Sinistres et Risques

#### 2.5.1. Analyseur intelligent de sinistres (Claims AI)

Le système doit intégrer un moteur d'analyse sémantique capable de traiter les descriptions d'accidents et constats amiables pour :

- Évaluer le taux de responsabilité selon la réglementation ACAPS et la convention CISA/CID ;
- Établir le décompte financier net (Dommages estimés - Franchise contractuelle) ;
- Calculer un score de suspicion de fraude (de 0 à 100) avec détection d'anomalies (déclaration tardive selon l'Article 20 de la Loi 17-99, accident sans tiers, souscription trop récente) ;
- Formuler des préconisations d'actions immédiates (mandatement d'expert, réquisition de PV de police).

#### 2.5.2. Évaluation prédictive du risque de souscription (Risk Assessment AI)

Analyse du profil du client (historique de sinistres, budget, usage du véhicule, kilométrage annuel) pour générer un score de risque, une recommandation tarifaire et des garanties complémentaires préconisées.

#### 2.5.3. Assistant conversationnel contextuel (AI Copilot)

Assistant interactif accessible sur l'ensemble des pages de l'ERP pour guider l'opérateur sur les règles de gestion d'assurance, la navigation et les synthèses de dossiers.

### 2.6. Tableau de bord analytics et exercices comptables

#### 2.6.1. Sélecteur universel d'exercice comptable (`ExerciceSelector`)

Positionnement automatique par défaut sur l'exercice de l'année courante (ex: 2026), avec possibilité de basculer instantanément sur un exercice antérieur ou futur.

#### 2.6.2. Indicateurs clés de performance (KPIs)

Affichage en temps réel du volume d'affaires émis (DH), des primes encaissées, du reste à recouvrer, du nombre d'opérations et du volume du portefeuille client pour l'exercice sélectionné.

#### 2.6.3. Visualisations graphiques interactives

Histogramme de l'activité mensuelle sur 12 mois (`janv.` à `déc.`), graphique circulaire de répartition des primes par catégorie de risque et classement des meilleures compagnies d'assurance partenaires.

### 2.7. Administration système, sécurité RBAC et référentiels

#### 2.7.1. Gestion des accès à base de rôles (RBAC)

Gestion des utilisateurs avec distinction entre le rôle `ADMIN` (gestion complète des comptes, paramétrages et audits) et le rôle `USER` / `OPERATOR` (opérations de saisie et consultation).

#### 2.7.2. Protection du compte administrateur

Interdiction technique pour tout administrateur connecté de supprimer son propre compte utilisateur.

#### 2.7.3. Gestion des référentiels système

Interface de paramétrage dynamique des tables de référence : Compagnies d'assurance, Catégories/Branches, Natures d'opérations, Taux de TVA et Paramètres de prime.

## 3. Spécification des besoins non fonctionnels

Les besoins non fonctionnels définissent les contraintes de qualité et les exigences techniques indispensables :

- **Sécurité et Confidentialité :** Authentification sans état basée sur des jetons **JWT (JSON Web Token)** signés cryptographiquement via algorithme HMAC-SHA256. Hachage à sens unique des mots de passe avec **BCrypt** salé. Chiffrement de toutes les communications en transit via le protocole **TLS 1.3**. Protection stricte contre les failles courantes (CORS, XSS, CSRF, Injection NoSQL).
- **Performance et Réactivité :** Temps de réponse des endpoints REST inférieur à **200 ms** pour 95% des requêtes d'agrégation et de lecture. Optimisation du rendu frontend via les Server/Client Components de Next.js.
- **Ergonomie et Design System :** Interface web responsive épurée reposant sur une politique stricte d'espaces blancs (*Modern Whitespace Architecture*), garantissant une lisibilité maximale sur écrans Full HD, 4K, ordinateurs portables et tablettes.
- **Disponibilité et Résilience :** Déploiement conteneurisé sous Docker garantissant un redémarrage automatique en cas de défaillance (`restart: unless-stopped`). Procédures automatisées de sauvegarde de la base de données avec rétention tournante.
- **Maintenabilité et Évolutivité :** Architecture logicielle en couches découplées (*Clean Architecture* Controller-Service-Repository), typage strict TypeScript éliminant tout type indéfini (`any`) et modularité facilitant l'ajout de nouvelles branches d'assurance.

## 4. Présentation des cas d'utilisation

### 4.1. Présentation des acteurs

Le système interagit avec quatre types d'acteurs :

1. **Administrateur Système :** Responsable de la gestion des utilisateurs, de la configuration des référentiels (compagnies, taux TVA, paramètres), de l'audit système et des clôtures d'exercices.
2. **Gestionnaire de Production / Courtier :** Responsable de la création des dossiers clients, de la saisie des polices d'assurance (standards et maritimes), de la soumission aux moteurs IA et de la génération des devis.
3. **Responsable Comptable & Financier :** En charge de la saisie des encaissements clients, des reversements compagnies, du suivi du recouvrement des créances et de l'émission des factures.
4. **Moteur d'Intelligence Artificielle (Acteur Secondaire) :** Système expert et algorithmes sémantiques traitant les requêtes d'analyse de risque et de détection de fraudes sur les sinistres.

### 4.2. Description des cas d'utilisation

Les tableaux suivants présentent la description textuelle normalisée des cas d'utilisation majeurs conformément au guide de l'EMSI.

<div align="center">
<b>Tableau 1 : Description du cas d'utilisation « Authentification et Contrôle d'accès »</b>
</div>

| Rubrique                         | Description                                                                                                                                                                                                                                                                                                                                                                                                             |
| :------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Cas n°**                | CU-01                                                                                                                                                                                                                                                        |
| **Acteur(s) :**            | Tous les acteurs (Administrateur, Courtier, Comptable)                                                                                                                                                                                                                                                                                                                                                                  |
| **Objectif :**             | Permettre à un utilisateur de se connecter de manière sécurisée et d'obtenir ses autorisations d'accès.                                                                                                                                                                                                                                                                                                            |
| **Pré-condition(s) :**    | L'utilisateur doit disposer d'un compte actif préalablement créé dans le système.                                                                                                                                                                                                                                                                                                                                   |
| **Post-condition(s) :**    | Un jeton JWT valide est transmis au client HTTP et l'utilisateur accède au tableau de bord selon son rôle.                                                                                                                                                                                                                                                                                                            |
| **Scénario nominal :**    | 1. L'utilisateur accède à la page de connexion.2. L'utilisateur saisit son identifiant (nom d'utilisateur ou email) et son mot de passe.3. L'utilisateur valide le formulaire.4. Le système vérifie l'existence du compte et compare le condensat BCrypt.5. Le système génère un jeton JWT contenant l'identité et le rôle (`ADMIN`/`USER`).6. Le système redirige l'utilisateur vers le tableau de bord. |
| **Scénario alternatif :** | 4.a. Identifiants invalides : Le système affiche un message d'erreur explicite « Identifiants incorrects » et invite à une nouvelle saisie.4.b. Compte désactivé : Le système bloque l'accès et notifie l'utilisateur de contacter l'administrateur.                                                                                                                                                            |

\

<div align="center">
<b>Tableau 2 : Description du cas d'utilisation « Enregistrement d'une Police d'Assurance »</b>
</div>

| Rubrique                         | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| :------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Cas n°**                | CU-02                                                                                                                                                                                                                                                                                                                                                                                                         |
| **Acteur(s) :**            | Gestionnaire de Production / Courtier                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| **Objectif :**             | Créer et enregistrer une nouvelle police d'assurance (standard ou maritime) avec calcul des primes et co-assurance.                                                                                                                                                                                                                                                                                                                                                                                       |
| **Pré-condition(s) :**    | L'utilisateur est authentifié et le client souscripteur existe dans le référentiel.                                                                                                                                                                                                                                                                                                                                                                                                                     |
| **Post-condition(s) :**    | La police est persistée en base, le montant total est calculé, l'exercice comptable est rattaché et une fiche de règlement est initialisée.                                                                                                                                                                                                                                                                                                                                                           |
| **Scénario nominal :**    | 1. L'utilisateur accède au formulaire de nouvelle production.2. L'utilisateur sélectionne le client, la nature d'opération, la catégorie et la compagnie.3. L'utilisateur renseigne le numéro de police, la date d'effet et le mois d'émission.4. Si la catégorie est MARITIME, l'utilisateur renseigne le N° d'ordre, le navire, le certificat et ventile les parts de co-assurance.5. L'utilisateur saisit les composantes de prime (nette, taxes, accessoires, CNPC).6. Le système calcule instantanément le montant total TTC et l'exercice associé.7. L'utilisateur valide l'enregistrement.8. Le système persiste la police et initialise l'état de règlement à `EN_ATTENTE`. |
| **Scénario alternatif :** | 4.a. La somme des pourcentages de répartition ne correspond pas à 100% : Le système signale une anomalie de ventilation et bloque la validation.5.a. Champs obligatoires manquants : Le système surligne les erreurs de validation du formulaire.                                                                                                                                                                                                                                                                                                                                                                                  |

\

<div align="center">
<b>Tableau 3 : Description du cas d'utilisation « Gestion du Double Circuit de Règlements »</b>
</div>

| Rubrique                         | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| :------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Cas n°**                | CU-03                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| **Acteur(s) :**            | Responsable Comptable & Financier                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| **Objectif :**             | Enregistrer les versements clients et les reversements compagnies tout en maintenant l'étanchéité des soldes.                                                                                                                                                                                                                                                                                                                                                                                                 |
| **Pré-condition(s) :**    | La police d'assurance existe et une fiche de règlement est associée.                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| **Post-condition(s) :**    | Les lignes de paiement sont enregistrées, le crédit client est ajusté et le statut de règlement est actualisé.                                                                                                                                                                                                                                                                                                                                                                                              |
| **Scénario nominal :**    | 1. L'utilisateur consulte la fiche de règlement d'une police.2. L'utilisateur choisit le circuit : Encaissement Client ou Décaissement Compagnie.3. L'utilisateur saisit la date, le montant, le mode de paiement (espèces, chèque, virement) et les références bancaires.4. L'utilisateur valide le paiement.5. Le système enregistre la transaction.6. Si le paiement concerne le client, le système déduit le montant de la créance client.7. Le système compare le cumul des paiements clients au montant total de la police et met à jour le statut (`EN_ATTENTE`, `PARTIEL`, `PAYE`). |
| **Scénario alternatif :** | 3.a. Le montant saisi est supérieur au solde restant dû : Le système affiche un avertissement de trop-perçu tout en autorisant la régularisation.6.a. Le paiement est un décaissement CIE : Le système enregistre le paiement sans altérer le crédit du client souscripteur.                                                                                                                                                                                                                                                                                                                         |

\

<div align="center">
<b>Tableau 4 : Description du cas d'utilisation « Génération et Téléchargement de Facture PDF »</b>
</div>

| Rubrique                         | Description                                                                                                                                                                                                                                                                                                                                                                                                   |
| :------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Cas n°**                | CU-04                                                                                                                                                                                                                                                                                                                                                                                                         |
| **Acteur(s) :**            | Responsable Comptable / Courtier                                                                                                                                                                                                                                                                                                                                                                              |
| **Objectif :**             | Émettre une facture officielle (Standard, Proforma ou Avoir) et télécharger le document PDF certifié.                                                                                                                                                                                                                                                                                                     |
| **Pré-condition(s) :**    | L'utilisateur est authentifié et l'opération associée est enregistrée.                                                                                                                                                                                                                                                                                                                                    |
| **Post-condition(s) :**    | La facture est numérotée de façon unique et le document PDF conforme est streamé vers le navigateur.                                                                                                                                                                                                                                                                                                      |
| **Scénario nominal :**    | 1. L'utilisateur accède au module de facturation.2. L'utilisateur sélectionne l'opération concernée ou clique sur « Nouveau Devis Proforma ».3. Le système calcule les montants HT, TVA et TTC.4. L'utilisateur confirme la génération de la facture.5. L'utilisateur clique sur le bouton « Télécharger PDF ».6. Le backend génère le flux binaire PDF via OpenPDF et l'envoie au navigateur. |
| **Scénario alternatif :** | 2.a. Génération d'une facture d'avoir : L'utilisateur clique sur « Avoir » sur une facture existante. Le système crée une facture négative de régularisation avec référence à la facture initiale.                                                                                                                                                                                                 |

\

<div align="center">
<b>Tableau 5 : Description du cas d'utilisation « Analyse Intelligente d'une Déclaration de Sinistre »</b>
</div>

| Rubrique                         | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| :------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Cas n°**                | CU-05                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| **Acteur(s) :**            | Courtier / Gestionnaire Sinistres, Moteur IA                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| **Objectif :**             | Analyser sémantiquement un constat de sinistre pour qualifier la responsabilité, le décompte net et le risque de fraude.                                                                                                                                                                                                                                                                                                                                                                                           |
| **Pré-condition(s) :**    | Le dossier client et la police sont identifiés.                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| **Post-condition(s) :**    | Un rapport d'analyse structuré avec scoring de fraude et plan d'action est restitué au gestionnaire.                                                                                                                                                                                                                                                                                                                                                                                                                |
| **Scénario nominal :**    | 1. L'utilisateur ouvre le modal « Claims AI Analyzer ».2. L'utilisateur renseigne le texte descriptif du sinistre, la date, les dommages estimés et la franchise.3. L'utilisateur lance l'analyse.4. Le moteur IA extrait les entités, applique les règles de la convention CISA/CID et de l'Article 20 de la Loi 17-99.5. Le moteur IA calcule le score de fraude (0-100) et le montant net d'indemnisation.6. Le système affiche la synthèse exécutive, les drapeaux d'alerte et les actions recommandées. |
| **Scénario alternatif :** | 4.a. Description incomplète ou ambiguë : Le système attribue un score de risque intermédiaire et préconise l'intervention prioritaire d'un expert automobile agréé.                                                                                                                                                                                                                                                                                                                                            |

\

<div align="center">
<b>Tableau 6 : Description du cas d'utilisation « Pilotage Analytics et Filtrage par Exercice Comptable »</b>
</div>

| Rubrique                         | Description                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| :------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Cas n°**                | CU-06                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| **Acteur(s) :**            | Administrateur, Décideur, Courtier                                                                                                                                                                                                                                                                                                                                                                                                                       |
| **Objectif :**             | Consulter les indicateurs de performance financière et filtrer l'intégralité des données par année fiscale.                                                                                                                                                                                                                                                                                                                                          |
| **Pré-condition(s) :**    | L'utilisateur est connecté à la plateforme.                                                                                                                                                                                                                                                                                                                                                                                                             |
| **Post-condition(s) :**    | Les graphiques, KPIs et registres sont instantanément recalibrés sur l'exercice sélectionné.                                                                                                                                                                                                                                                                                                                                                          |
| **Scénario nominal :**    | 1. L'utilisateur accède au Tableau de Bord (`/dashboard`).2. Le système affiche par défaut les métriques de l'exercice en cours (ex: 2026).3. L'utilisateur clique sur le composant `ExerciceSelector` et choisit un autre exercice (ex: 2025).4. Le système émet une requête `GET /api/dashboard/stats?exercice=2025`.5. Le système actualise dynamiquement les KPIs, la courbe des 12 mois, le donut de catégories et le top compagnies. |
| **Scénario alternatif :** | 3.a. Aucun enregistrement sur l'exercice sélectionné : Le système affiche des compteurs à zéro et un message informatif sans provoquer d'erreur applicative.                                                                                                                                                                                                                                                                                         |

### 4.3. Diagramme des cas d'utilisation global

Le diagramme suivant modélise l'ensemble des interactions entre les différents acteurs et les fonctionnalités du système InsurFlow.

```mermaid
graph TB
    subgraph Acteurs
        ADMIN(("Administrateur"))
        COURTIER(("Courtier / Gestionnaire"))
        COMPTABLE(("Comptable & Financier"))
        IA(("Moteur IA"))
    end

    subgraph "Plateforme InsurFlow ERP"
        CU1["Authentification & Gestion Profil"]
        CU2["Gestion du Portefeuille Clients (KYC/GED)"]
        CU3["Saisie & Gestion des Polices (Production)"]
        CU4["Gestion des Spécificités Maritimes"]
        CU5["Ventilation Co-assurance Multi-Compagnies"]
        CU6["Double Circuit de Règlements (Clients/CIE)"]
        CU7["Gestion de la Facturation (FAC/PRF/AVR)"]
        CU8["Analyse de Sinistres & Scoring Fraude"]
        CU9["Évaluation Prédictive du Risque de Souscription"]
        CU10["Assistant Conversationnel Copilot"]
        CU11["Pilotage Analytics & Exercices Comptables"]
        CU12["Gestion des Référentiels & Utilisateurs"]
        CU13["Exportation des Registres (PDF/Excel CSV)"]
    end

    ADMIN --> CU1
    ADMIN --> CU12
    ADMIN --> CU11
    ADMIN --> CU2
    ADMIN --> CU3
    ADMIN --> CU6
    ADMIN --> CU7
    ADMIN --> CU13

    COURTIER --> CU1
    COURTIER --> CU2
    COURTIER --> CU3
    COURTIER --> CU4
    COURTIER --> CU5
    COURTIER --> CU8
    COURTIER --> CU9
    COURTIER --> CU10
    COURTIER --> CU11
    COURTIER --> CU13

    COMPTABLE --> CU1
    COMPTABLE --> CU2
    COMPTABLE --> CU6
    COMPTABLE --> CU7
    COMPTABLE --> CU11
    COMPTABLE --> CU13

    CU8 -.-> IA
    CU9 -.-> IA
    CU10 -.-> IA

    CU3 -.->|<<include>>| CU4
    CU3 -.->|<<include>>| CU5
    CU6 -.->|<<extend>>| CU7
```

<div align="center">
<b>Figure 5 : Diagramme des cas d'utilisation global du système InsurFlow</b>
</div>

## 5. Conclusion

Dans ce chapitre, nous avons établi une analyse rigoureuse et détaillée des besoins fonctionnels et non fonctionnels du système InsurFlow. Nous avons identifié les différents profils d'utilisateurs et décrit de manière normalisée les cas d'utilisation majeurs. Cette spécification précise constitue le socle fondamental sur lequel repose la phase de conception présentée dans le chapitre suivant.

---

\newpage

# Chapitre 3 : Conception du système

## 1. Introduction

Ce chapitre est dédié à la conception détaillée de la solution technique en répondant précisément à la question : **COMMENT FAIRE**. Nous adoptons les standards du langage de modélisation unifié **UML 2** en privilégiant une approche « boîte blanche » afin de rendre compte des interactions internes entre les objets, les composants logiciels et la couche de persistance. Nous présentons dans un premier temps la modélisation dynamique (diagrammes de séquences, collaboration, états-transitions et activités), puis la modélisation statique (diagramme de classes métier, modèle relationnel/document, dictionnaire de données exhaustif) pour conclure sur l'architecture logicielle 3-tiers et l'architecture matérielle de déploiement Cloud.

## 2. Modélisation dynamique

### 2.1. Diagrammes de séquences

Les diagrammes de séquences ci-après illustrent le comportement dynamique du système lors de l'exécution des processus clés.

#### 2.1.1. Authentification utilisateur et génération de jeton JWT

Le diagramme modélise les échanges lors de la connexion avec vérification du mot de passe haché par BCrypt et émission du jeton JWT.

```mermaid
sequenceDiagram
    autonumber
    actor User as Utilisateur
    participant View as LoginForm (Next.js)
    participant AuthCtrl as AuthController
    participant UserSvc as UserService
    participant UserRepo as UserRepository
    participant JwtUtil as JwtUtil
    participant DB as MongoDB (users)

    User->>View: Saisie email/username + mot de passe
    View->>AuthCtrl: POST /api/auth/login (LoginRequest)
    AuthCtrl->>UserSvc: authenticate(username, rawPassword)
    UserSvc->>UserRepo: findByUsernameOrEmail(identifier)
    UserRepo->>DB: Query { $or: [{username}, {email}] }
    DB-->>UserRepo: Document User
    UserRepo-->>UserSvc: Optional<User>
  
    alt Utilisateur introuvable ou mot de passe invalide
        UserSvc-->>AuthCtrl: BadCredentialsException
        AuthCtrl-->>View: HTTP 401 Unauthorized
        View-->>User: Affichage "Identifiants invalides"
    else Authentification réussie
        UserSvc->>JwtUtil: generateToken(UserPrincipal)
        JwtUtil-->>UserSvc: tokenJWT (HMAC-SHA256)
        UserSvc-->>AuthCtrl: AuthResponse(token, role, email)
        AuthCtrl-->>View: HTTP 200 OK + JSON AuthResponse
        View->>View: Stockage token (js-cookie / State)
        View-->>User: Redirection vers /dashboard
    end
```

<div align="center">
<b>Figure 6 : Diagramme de séquences « Authentification utilisateur et génération de jeton JWT »</b>
</div>

**Note Explicative Pédagogique :** Ce diagramme illustre pas à pas comment le système contrôle l'identité d'un utilisateur et lui délivre un passeport numérique sécurisé (jeton JWT). Pour l'utilisateur et le cabinet, cela garantit une protection absolue des données et une gestion stricte des privilèges (Admin / Opérateur) sans jamais faire transiter le mot de passe en clair.

#### 2.1.2. Saisie d'une police d'assurance maritime et répartition co-assurance

Ce diagramme détaille la validation et la persistance d'une police maritime complexe avec création conjointe de la fiche de règlement et rattachement à l'exercice comptable.

```mermaid
sequenceDiagram
    autonumber
    actor Courtier as Courtier / Gestionnaire
    participant UI as ProductionForm (Next.js)
    participant ProdCtrl as ProductionController
    participant ProdSvc as ProductionService
    participant RegSvc as ReglementService
    participant ProdRepo as ProductionRepository
    participant RegRepo as ReglementRepository
    participant DB as MongoDB

    Courtier->>UI: Saisie Police Maritime (Client, Navire, Ordre, Répartitions, Primes)
    UI->>UI: Contrôle local (Somme répartitions == 100%)
    UI->>ProdCtrl: POST /api/productions (ProductionRequest)
    ProdCtrl->>ProdSvc: createProduction(ProductionRequest)
    ProdSvc->>ProdSvc: Calcul MontantTotal & Exercice (moisDem)
    ProdSvc->>ProdRepo: save(ProductionEntity)
    ProdRepo->>DB: Insert into 'productions'
    DB-->>ProdRepo: Saved Production
    ProdRepo-->>ProdSvc: Production (avec ID généré)
  
    ProdSvc->>RegSvc: initReglementForProduction(savedProduction)
    RegSvc->>RegSvc: Création Reglement (Status: EN_ATTENTE)
    RegSvc->>RegRepo: save(ReglementEntity)
    RegRepo->>DB: Insert into 'regelements'
    DB-->>RegRepo: Saved Reglement
    RegRepo-->>RegSvc: Reglement
  
    ProdSvc-->>ProdCtrl: ProductionDTO
    ProdCtrl-->>UI: HTTP 201 Created + JSON
    UI-->>Courtier: Notification succès & rafraîchissement registre
```

<div align="center">
<b>Figure 7 : Diagramme de séquences « Saisie d'une police d'assurance maritime et répartition co-assurance »</b>
</div>

**Note Explicative Pédagogique :** Ce diagramme retrace le parcours de création d'une police maritime avec calcul automatique des taxes et ventilation dynamique des primes entre co-assureurs. Pour le courtier, ce mécanisme élimine tout risque d'erreur mathématique et initialise immédiatement le dossier financier de règlement associé.

#### 2.1.3. Enregistrement d'un encaissement client et recalcul du solde

Ce diagramme illustre le double circuit de règlement : l'encaissement client ajuste le crédit de l'assuré et fait transiter le statut de l'opération vers `PARTIEL` ou `PAYE`.

```mermaid
sequenceDiagram
    autonumber
    actor Comptable as Responsable Comptable
    participant UI as ReglementDetailView
    participant RegCtrl as ReglementController
    participant RegSvc as ReglementService
    participant ClientSvc as ClientService
    participant RegRepo as ReglementRepository
    participant ClientRepo as ClientRepository
    participant DB as MongoDB

    Comptable->>UI: Saisie Paiement Client (Montant, Mode, N° Chèque)
    UI->>RegCtrl: POST /api/regelements/{id}/payments (PaymentRequest)
    RegCtrl->>RegSvc: addPayment(id, PaymentRequest)
    RegSvc->>RegRepo: findById(id)
    RegRepo->>DB: Query 'regelements'
    DB-->>RegRepo: ReglementEntity
  
    RegSvc->>RegSvc: payments.add(new Payment)
    RegSvc->>RegSvc: recalculateStatus() -> PARTIEL / PAYE
    RegSvc->>RegRepo: save(ReglementEntity)
    RegRepo->>DB: Update 'regelements'
  
    RegSvc->>ClientSvc: adjustClientCredit(clientId, -montant)
    ClientSvc->>ClientRepo: updateCredit(clientId, delta)
    ClientRepo->>DB: Update 'clients' set credit = credit - montant
  
    RegSvc-->>RegCtrl: ReglementUpdatedDTO
    RegCtrl-->>UI: HTTP 200 OK + JSON
    UI-->>Comptable: Mise à jour visuelle des jauges et statuts
```

<div align="center">
<b>Figure 8 : Diagramme de séquences « Enregistrement d'un encaissement client et recalcul du solde »</b>
</div>

**Note Explicative Pédagogique :** Ce diagramme illustre le traitement instantané d'un paiement client (chèque, virement ou espèces) et la mise à jour en direct de son solde débiteur. Pour le responsable financier, cette synchronisation offre une visibilité immédiate sur les créances recouvrées et le reste à payer sans aucun recalcul manuel.

#### 2.1.4. Émission de facture et génération de document PDF certifié

Ce diagramme montre le traitement d'émission d'une facture et sa compilation binaire en document PDF officiel via OpenPDF côté serveur.

```mermaid
sequenceDiagram
    autonumber
    actor User as Gestionnaire / Comptable
    participant UI as InvoicesPage
    participant InvCtrl as InvoiceController
    participant InvSvc as InvoiceService
    participant PdfSvc as InvoicePdfService
    participant InvRepo as InvoiceRepository
    participant DB as MongoDB

    User->>UI: Clic sur "Générer Facture" ou "Télécharger PDF"
    UI->>InvCtrl: GET /api/invoices/{id}/pdf
    InvCtrl->>InvSvc: getInvoiceById(id)
    InvSvc->>InvRepo: findById(id)
    InvRepo->>DB: Query 'invoices'
    DB-->>InvRepo: InvoiceEntity
    InvRepo-->>InvSvc: Invoice
  
    InvCtrl->>PdfSvc: generateInvoicePdf(Invoice)
    PdfSvc->>PdfSvc: Compilation layout OpenPDF (En-têtes, Tableaux HT/TVA/TTC, Signature)
    PdfSvc-->>InvCtrl: byte[] (PDF Stream)
    InvCtrl-->>UI: HTTP 200 OK (Content-Type: application/pdf)
    UI-->>User: Ouverture/Téléchargement du document PDF certifié
```

<div align="center">
<b>Figure 9 : Diagramme de séquences « Émission de facture et génération de document PDF certifié »</b>
</div>

**Note Explicative Pédagogique :** Ce diagramme détaille la transformation d'une facture enregistrée en document PDF officiel haute résolution grâce au moteur OpenPDF. Pour le cabinet et ses clients, cela assure la délivrance instantanée d'un justificatif comptable infalsifiable, conforme aux obligations fiscales marocaines.

#### 2.1.5. Analyse automatisée d'un sinistre par le moteur IA

Ce diagramme modélise l'évaluation sémantique, le chiffrage financier net, la vérification des règles ACAPS / Loi 17-99 et le calcul du score de fraude.

```mermaid
sequenceDiagram
    autonumber
    actor Gestionnaire as Gestionnaire Sinistres
    participant Modal as ClaimsAnalyzerModal
    participant AiCtrl as AiController
    participant AiSvc as AiClaimAnalysisService
    participant RulesEngine as InsuranceRules & FraudEngine

    Gestionnaire->>Modal: Saisie Déclaration Sinistre + Dommages + Franchise
    Modal->>AiCtrl: POST /api/ai/claims-analyzer (ClaimAnalysisRequest)
    AiCtrl->>AiSvc: analyzeClaim(request)
    AiSvc->>RulesEngine: evaluateRuleEngine(request)
  
    RulesEngine->>RulesEngine: Détection motifs (Choc isolé, Délit fuite, Déclaration tardive Art. 20)
    RulesEngine->>RulesEngine: Calcul Score Fraude (0-100) & Niveau (FAIBLE, MOYEN, ÉLEVÉ)
    RulesEngine->>RulesEngine: Détermination Responsabilité (Barème ACAPS / CISA)
    RulesEngine->>RulesEngine: Calcul Net Payout = Max(0, Dommages - Franchise)
    RulesEngine->>RulesEngine: Génération Recommandations d'actions
  
    RulesEngine-->>AiSvc: ClaimAnalysisResponse
    AiSvc-->>AiCtrl: ClaimAnalysisResponse
    AiCtrl-->>Modal: HTTP 200 OK + JSON
    Modal-->>Gestionnaire: Restitution du rapport d'expertise IA interactif
```

<div align="center">
<b>Figure 10 : Diagramme de séquences « Analyse automatisée d'un sinistre par le moteur IA »</b>
</div>

**Note Explicative Pédagogique :** Ce diagramme montre l'évaluation experte d'une déclaration d'accident par intelligence artificielle, combinant analyse textuelle, barème conventionnel ACAPS et détection d'anomalies de fraude. Pour le gestionnaire, cet assistant accélère le règlement des assurés de bonne foi tout en bloquant les dossiers suspects.

### 2.2. Diagrammes de collaboration

Le diagramme de collaboration met l'accent sur l'organisation spatiale des objets lors de la gestion d'un encaissement et de l'ajustement du solde client.

```mermaid
graph TD
    UI["1: SaisirPaiement(req) / ReglementDetailView"]
    CTRL["2: addPayment(id, req) / ReglementController"]
    SVC["3: processPayment() / ReglementService"]
    REPO_R["4: save() / ReglementRepository"]
    SVC_C["5: adjustCredit() / ClientService"]
    REPO_C["6: updateCredit() / ClientRepository"]
    DB[("7: Persister / MongoDB")]

    UI -->|1. Envoi requête| CTRL
    CTRL -->|2. Invoquer métier| SVC
    SVC -->|3. Recalculer statut & persister| REPO_R
    REPO_R -->|4. Écriture document| DB
    SVC -->|5. Déduire créance client| SVC_C
    SVC_C -->|6. Mettre à jour solde| REPO_C
    REPO_C -->|7. Écriture client| DB
```

<div align="center">
<b>Figure 11 : Diagramme de collaboration « Gestion des encaissements et mise à jour financière »</b>
</div>

**Note Explicative Pédagogique :** Ce diagramme met en relief l'organisation spatiale et les interactions coordonnées entre les modules lors d'un encaissement. Il assure aux décideurs une parfaite traçabilité des flux financiers, reliant chaque centime perçu au contrat et au compte client correspondant.

### 2.3. Diagrammes d'états-transitions

Ces diagrammes décrivent le cycle de vie des entités fondamentales du système.

#### 2.3.1. Cycle de vie du statut de règlement d'une police

Une opération d'assurance naît à l'état `EN_ATTENTE`. L'enregistrement d'acomptes la fait transiter à l'état `PARTIEL`, tandis que le versement intégral de la prime déclenche le passage automatique à l'état `PAYE`.

```mermaid
stateDiagram-v2
    [*] --> EN_ATTENTE : Création de la police d'assurance
  
    EN_ATTENTE --> PARTIEL : Versement partiel (0 < TotalPaiements < MontantTotal)
    EN_ATTENTE --> PAYE : Paiement intégral direct (TotalPaiements >= MontantTotal)
  
    PARTIEL --> PARTIEL : Nouveaux versements partiels cumulés
    PARTIEL --> PAYE : Solde total réglé (TotalPaiements >= MontantTotal)
  
    PAYE --> PARTIEL : Annulation/Rejet d'un chèque ou réajustement de prime
    PAYE --> [*] : Clôture de l'exercice comptable
```

<div align="center">
<b>Figure 12 : Diagramme d'états-transitions du statut de règlement d'une police d'assurance</b>
</div>

**Note Explicative Pédagogique :** Ce schéma résume les étapes de la vie financière d'un contrat d'assurance, depuis son émission en attente jusqu'à son solde complet. Il permet aux équipes opérationnelles d'identifier en un coup d'œil l'état exact des recouvrements sans ambiguïté.

#### 2.3.2. Cycle de vie d'une facture

Une facture standard ou proforma est créée à l'état `UNPAID`. Elle évolue selon les encaissements ou peut faire l'objet d'une facture d'avoir rectificative.

```mermaid
stateDiagram-v2
    [*] --> UNPAID : Émission de la Facture
  
    UNPAID --> PARTIAL : Encaissement d'un acompte
    UNPAID --> PAID : Règlement intégral
  
    PARTIAL --> PAID : Règlement du reliquat
  
    UNPAID --> CANCELLED_AVOIR : Annulation par Facture d'Avoir
    PARTIAL --> CANCELLED_AVOIR : Annulation/Régularisation par Avoir
    PAID --> CANCELLED_AVOIR : Remboursement / Avoir émis
  
    PAID --> [*]
    CANCELLED_AVOIR --> [*]
```

<div align="center">
<b>Figure 13 : Diagramme d'états-transitions d'une facture</b>
</div>

**Note Explicative Pédagogique :** Ce diagramme retrace les statuts possibles d'une facture, garantissant une gestion comptable saine et interdisant toute altération non autorisée d'une pièce émise autrement que par une facture d'avoir.

### 2.4. Diagrammes d'activité

Les diagrammes d'activité modélisent le cheminement des flux de contrôle et des flux de données à travers les différentes étapes de traitement.

#### 2.4.1. Processus complet d'émission de police et de facturation

```mermaid
graph TD
    Start((Début)) --> SaisieClient["Sélection ou création du client (Contrôle ICE/CIN)"]
    SaisieClient --> ChoixBranche{"Catégorie = MARITIME ?"}
  
    ChoixBranche -- Oui --> SaisieMaritime["Saisie N° Ordre, Navire, Certificat & Ventilation Co-assurance"]
    ChoixBranche -- Non --> SaisieStandard["Saisie Police Standard (N° Police, Catégorie, Cie)"]
  
    SaisieMaritime --> SaisiePrimes["Saisie des composantes de prime (Nette, Taxes, Accessoires)"]
    SaisieStandard --> SaisiePrimes
  
    SaisiePrimes --> CalculAuto["Calcul automatique Montant Total & Détermination Exercice"]
    CalculAuto --> PersistProd["Persistance de la Police en Base de Données"]
    PersistProd --> InitReg["Initialisation de la Fiche de Règlement (Statut: EN_ATTENTE)"]
    InitReg --> GenDoc{"Générer Facture ou Devis Proforma ?"}
  
    GenDoc -- Facture Standard --> GenFacture["Création Facture & Numérotation Unique"]
    GenDoc -- Devis Proforma --> GenProforma["Création Devis Proforma"]
    GenDoc -- Plus tard --> Fin((Fin))
  
    GenFacture --> ExportPDF["Compilation & Téléchargement du PDF officiel"]
    GenProforma --> ExportPDF
    ExportPDF --> Fin
```

<div align="center">
<b>Figure 14 : Diagramme d'activité « Processus complet d'émission de police et de facturation »</b>
</div>

**Note Explicative Pédagogique :** Ce diagramme cartographie la suite logique d'actions exécutées par le conseiller pour émettre une police et éditer les documents associés. Il simplifie la formation des collaborateurs en offrant un guide métier fluide et sans risque d'omission d'étape.

#### 2.4.2. Traitement du double circuit de règlement financier

```mermaid
graph TD
    A((Début)) --> B["Sélection de l'opération d'assurance"]
    B --> C{"Type de règlement ?"}
  
    C -- Encaissement Client --> D["Saisie date, montant, mode (Chèque, Espèces, Virement)"]
    D --> E["Ajout du paiement à la liste 'payments'"]
    E --> F["Mise à jour créance client : Crédit = Crédit - Montant"]
    F --> G["Recalcul du Statut : Cumul Paiements vs Montant Total"]
    G --> H{"Cumul >= Total ?"}
    H -- Oui --> I["Statut = PAYE"]
    H -- Non --> J{"Cumul > 0 ?"}
    J -- Oui --> K["Statut = PARTIEL"]
    J -- Non --> L["Statut = EN_ATTENTE"]
  
    C -- Décaissement Compagnie CIE --> M["Saisie date, montant reversement, réf bordereau"]
    M --> N["Ajout du paiement à la liste 'paymentscie'"]
    N --> O["Isolement comptable : Aucun impact sur le crédit client"]
  
    I --> P["Sauvegarde en base & Actualisation Dashboard"]
    K --> P
    L --> P
    O --> P
    P --> Q((Fin))
```

<div align="center">
<b>Figure 15 : Diagramme d'activité « Traitement du double circuit de règlement financier »</b>
</div>

**Note Explicative Pédagogique :** Ce diagramme schématise l'aiguillage étanche entre l'argent encaissé auprès des assurés et les fonds reversés aux compagnies partenaires. Pour le cabinet, cette séparation rigoureuse prévient toute confusion de trésorerie et garantit des bilans comptables irréprochables.

## 3. Modélisation statique

### 3.1. Diagramme de classes

Le diagramme de classes métier modélise la structure statique du système InsurFlow en précisant pour chaque classe ses attributs typés et ses méthodes métier.

```mermaid
classDiagram
    class User {
        -String id
        -String username
        -String email
        -String password
        -UserRole role
        -boolean enabled
        -LocalDateTime createdAt
        -LocalDateTime updatedAt
        +getAuthorities() Collection
        +isEnabled() boolean
    }

    class Client {
        -String id
        -ClientType type
        -String cin
        -String nom
        -String prenom
        -String tel
        -String adresse
        -String doc
        -String ice
        -String identifiantFiscal
        -String rc
        -LocalDateTime dateDebut
        -double budget
        -double credit
        -LocalDateTime createdAt
        -LocalDateTime updatedAt
        +isSociete() boolean
        +validateIce() boolean
        +adjustCredit(double amount) void
    }

    class Production {
        -String id
        -String natureOperation
        -String client
        -LocalDate dateEff
        -String moisDem
        -String compagne
        -double tvaRate
        -String category
        -String numpolice
        -String refCie
        -String certificat
        -String navire
        -String ordre
        -List~CompagneRepartition~ repartitions
        -List~ProductionParameter~ parameters
        -LocalDateTime createdAt
        -LocalDateTime updatedAt
        +getMontantTotal() double
        +getExercice() Integer
    }

    class ProductionParameter {
        -String name
        -double primes
        -double taxe
        -double taxepara
        -double accessoire
        -double cnpc
        -double commission
        +getTotalLigne() double
    }

    class CompagneRepartition {
        -String compagneName
        -double percent
        +calculateShare(double total) double
    }

    class Reglement {
        -String id
        -Production production
        -String natureOperation
        -String client
        -LocalDate dateEff
        -String moisDem
        -String compagne
        -String category
        -String numpolice
        -double montantTotal
        -String numFacture
        -List~Payment~ payments
        -List~Payment~ paymentscie
        -ReglementStatus status
        -LocalDateTime createdAt
        -LocalDateTime updatedAt
        +getTotalPaiements() double
        +getTotalPaiementsCie() double
        +getExercice() Integer
        +updateStatus() void
    }

    class Payment {
        -PaymentMode mode
        -double montant
        -LocalDate dateEcheance
        -String banque
        -String numero
        -String emporteur
        -LocalDate dateVirement
        -String doc
        -String commentaire
    }

    class Invoice {
        -String id
        -String invoiceNumber
        -String operationId
        -String clientName
        -String policyNumber
        -String compagne
        -String category
        -double amountHT
        -double tvaRate
        -double tvaAmount
        -double amountTTC
        -double paidAmount
        -double remainingAmount
        -InvoiceType type
        -InvoiceStatus status
        -LocalDate dueDate
        -String notes
        -LocalDateTime createdAt
        -LocalDateTime updatedAt
        +calculateTotals() void
        +isPaid() boolean
    }

    class Notification {
        -String id
        -String title
        -String message
        -NotificationType type
        -NotificationSeverity severity
        -String referenceId
        -String clientName
        -Double amount
        -String policyNumber
        -LocalDate expirationDate
        -boolean isRead
        -LocalDateTime createdAt
    }

    class Compagne {
        -String id
        -String compagneName
        -List~CompagneCategory~ categories
    }

    class CompagneCategory {
        -String name
        -String indec
        -List~CompagneParameter~ parameters
    }

    class CompagneParameter {
        -String name
        -double percent
    }

    Production "1" *-- "many" ProductionParameter : contient
    Production "1" *-- "many" CompagneRepartition : ventile
    Reglement "1" o-- "1" Production : référence
    Reglement "1" *-- "many" Payment : encaisse (client)
    Reglement "1" *-- "many" Payment : décaisse (CIE)
    Client "1" <-- "many" Production : souscrit
    Production "1" <-- "0..1" Invoice : facture
    Compagne "1" *-- "many" CompagneCategory : propose
```

<div align="center">
<b>Figure 16 : Diagramme de classes métier du système InsurFlow</b>
</div>

**Note Explicative Pédagogique :** Ce diagramme structure l'ensemble des concepts métier manipulés par l'ERP (Clients, Polices, Règlements, Factures) et explicite leurs relations. Il constitue le plan d'architecte du logiciel, garantissant une organisation rigoureuse, modulaire et sans risque de redondance de données.

### 3.2. Modèle relationnel (MLD)

Pour implémenter la persistance au sein de notre base de données orientée documents MongoDB, nous avons appliqué les règles de passage standard de la modélisation objet/relationnelle :

1. **Règle 1 (Entités principales) :** Chaque classe métier autonome (`User`, `Client`, `Production`, `Reglement`, `Invoice`, `Compagne`, `Notification`) devient une collection indépendante identifiée par une clé primaire unique `_id` de type ObjectId/String.
2. **Règle 2 (Agrégations fortes / Compositions) :** Les classes dépendantes n'ayant pas d'existence autonome en dehors de leur parent (`ProductionParameter`, `CompagneRepartition`, `Payment`) sont directement imbriquées sous forme de tableaux de sous-documents (*embedded documents*) au sein de leur document parent (`productions`, `regelements`). Cela optimise considérablement les performances de lecture en évitant les jointures complexes.
3. **Règle 3 (Associations faibles) :** La relation entre `Reglement` et `Production` est matérialisée par une référence d'identifiant (`$ref: "productions", $id: "..."`), garantissant la cohérence tout en évitant la duplication de structures lourdes.
4. **Règle 4 (Dénormalisation contrôlée) :** Pour maximiser la rapidité d'affichage des listes et des exports analytiques par exercice comptable, certains champs descriptifs (`client`, `compagne`, `category`, `numpolice`, `moisDem`) sont dénormalisés dans la collection `regelements`.

#### Schéma formel du Modèle Logique de Données :

- **USERS** (<ins>id</ins>, username, email, password, role, enabled, createdAt, updatedAt)
- **CLIENTS** (<ins>id</ins>, type, cin, nom, prenom, tel, adresse, doc, ice, if, rc, dateDebut, budget, credit, createdAt, updatedAt)
- **PRODUCTIONS** (<ins>id</ins>, natureOperation, #client, dateEff, moisDem, compagne, tvaRate, category, numpolice, refCie, certificat, navire, ordre, repartitions[ ], parameters[ ], createdAt, updatedAt)
- **REGELEMENTS** (<ins>id</ins>, #production_id, natureOperation, client, dateEff, moisDem, compagne, category, numpolice, montantTotal, numFacture, payments[ ], paymentscie[ ], status, createdAt, updatedAt)
- **INVOICES** (<ins>id</ins>, invoiceNumber, #operationId, clientName, policyNumber, compagne, category, amountHT, tvaRate, tvaAmount, amountTTC, paidAmount, remainingAmount, type, status, dueDate, notes, createdAt, updatedAt)
- **COMPAGNES** (<ins>id</ins>, compagneName, categories[ ])
- **NOTIFICATIONS** (<ins>id</ins>, title, message, type, severity, referenceId, clientName, amount, policyNumber, expirationDate, isRead, createdAt)

### 3.3. Dictionnaire de données

Le tableau 7 dresse le dictionnaire de données complet du système InsurFlow conformément aux directives du modèle EMSI.

<div align="center">
<b>Tableau 7 : Dictionnaire de données du système InsurFlow</b>
</div>

| Nom de la colonne                | Type de données  | Taille | Obligatoire (Oui/Non) | Valeur par défaut |           Valeurs autorisées           | Clé Primaire | Clé Étrangère | Nom de la Table / Collection |
| :------------------------------- | :---------------- | :----: | :-------------------: | :----------------: | :-------------------------------------: | :-----------: | :--------------: | :--------------------------- |
| **id**                     | String (ObjectId) |   24   |          Oui          |   Auto-généré   |            Hash hexadécimal            |      Oui      |       Non       | `users`                    |
| **username**               | String (Varchar)  |   50   |          Oui          |         -         |             Chaîne unique             |      Non      |       Non       | `users`                    |
| **email**                  | String (Varchar)  |  100  |          Oui          |         -         |           Format email valide           |      Non      |       Non       | `users`                    |
| **password**               | String (Varchar)  |   60   |          Oui          |         -         |          Hash BCrypt ($2a$)          |      Non      |       Non       | `users`                    |
| **role**                   | Enum / String     |   20   |          Oui          |      `USER`      |    `ADMIN`, `USER`, `OPERATOR`    |      Non      |       Non       | `users`                    |
| **enabled**                | Boolean           |   1   |          Oui          |      `true`      |           `true`, `false`           |      Non      |       Non       | `users`                    |
| **id**                     | String (ObjectId) |   24   |          Oui          |   Auto-généré   |            Hash hexadécimal            |      Oui      |       Non       | `clients`                  |
| **type**                   | Enum / String     |   20   |          Oui          |  `particulier`  |      `particulier`, `societe`      |      Non      |       Non       | `clients`                  |
| **cin**                    | String (Varchar)  |   20   |          Non          |      `null`      |    Alphanumérique (ex:`AB123456`)    |      Non      |       Non       | `clients`                  |
| **nom**                    | String (Varchar)  |  150  |          Oui          |         -         |              Chaîne texte              |      Non      |       Non       | `clients`                  |
| **prenom**                 | String (Varchar)  |  100  |          Non          |      `null`      |              Chaîne texte              |      Non      |       Non       | `clients`                  |
| **tel**                    | String (Varchar)  |   30   |          Oui          |         -         |          Format téléphonique          |      Non      |       Non       | `clients`                  |
| **adresse**                | String (Text)     |  255  |          Non          |      `null`      |              Chaîne texte              |      Non      |       Non       | `clients`                  |
| **ice**                    | String (Varchar)  |   15   |          Non          |      `null`      |    **Exactement 15 chiffres**    |      Non      |       Non       | `clients`                  |
| **if** (identifiantFiscal) | String (Varchar)  |   30   |          Non          |      `null`      |             Alphanumérique             |      Non      |       Non       | `clients`                  |
| **rc**                     | String (Varchar)  |   30   |          Non          |      `null`      |             Alphanumérique             |      Non      |       Non       | `clients`                  |
| **budget**                 | Double            |   8   |          Oui          |      `0.0`      |            Positif$\ge 0$            |      Non      |       Non       | `clients`                  |
| **credit**                 | Double            |   8   |          Oui          |      `0.0`      |          Réel (créance due)          |      Non      |       Non       | `clients`                  |
| **doc**                    | String (Varchar)  |  255  |          Non          |      `null`      |        Chemin fichier numérisé        |      Non      |       Non       | `clients`                  |
| **id**                     | String (ObjectId) |   24   |          Oui          |   Auto-généré   |            Hash hexadécimal            |      Oui      |       Non       | `productions`              |
| **natureOperation**        | String (Varchar)  |   50   |          Oui          |         -         | `Affaire Nouvelle`, `Avenant`, etc. |      Non      |       Non       | `productions`              |
| **client**                 | String (Varchar)  |  150  |          Oui          |         -         |              Nom du client              |      Non      |       Oui       | `productions`              |
| **dateEff**                | Date (LocalDate)  |   10   |          Oui          |         -         |          Format`AAAA-MM-JJ`          |      Non      |       Non       | `productions`              |
| **moisDem**                | String (Varchar)  |   7   |          Oui          |         -         |            Format`AAAA-MM`            |      Non      |       Non       | `productions`              |
| **compagne**               | String (Varchar)  |  100  |          Oui          |         -         |        Nom compagnie partenaire        |      Non      |       Non       | `productions`              |
| **tvaRate**                | Double            |   8   |          Oui          |      `0.0`      |       `0.0`, `14.0`, `20.0`       |      Non      |       Non       | `productions`              |
| **category**               | String (Varchar)  |   50   |          Oui          |         -         |   `AUTOMOBILE`, `MARITIME`, etc.   |      Non      |       Non       | `productions`              |
| **numpolice**              | String (Varchar)  |   50   |          Oui          |         -         |        Numéro de contrat unique        |      Non      |       Non       | `productions`              |
| **ordre**                  | String (Varchar)  |   50   |          Non          |      `null`      |      N° ordre interne (Maritime)      |      Non      |       Non       | `productions`              |
| **navire**                 | String (Varchar)  |  100  |          Non          |      `null`      |            Nom du bâtiment            |      Non      |       Non       | `productions`              |
| **certificat**             | String (Varchar)  |   50   |          Non          |      `null`      |         N° certificat maritime         |      Non      |       Non       | `productions`              |
| **refCie**                 | String (Varchar)  |   50   |          Non          |      `null`      |         Référence dossier CIE         |      Non      |       Non       | `productions`              |
| **repartitions**           | Array (JSON)      |   -   |          Non          |       `[]`       |    Liste`{compagneName, percent}`    |      Non      |       Non       | `productions`              |
| **parameters**             | Array (JSON)      |   -   |          Oui          |       `[]`       |      Liste`{primes, taxe, ...}`      |      Non      |       Non       | `productions`              |
| **id**                     | String (ObjectId) |   24   |          Oui          |   Auto-généré   |            Hash hexadécimal            |      Oui      |       Non       | `regelements`              |
| **production**             | DBRef (ObjectId)  |   24   |          Oui          |         -         |      Identifiant de la production      |      Non      |       Oui       | `regelements`              |
| **montantTotal**           | Double            |   8   |          Oui          |      `0.0`      |     Montant total TTC de la police     |      Non      |       Non       | `regelements`              |
| **numFacture**             | String (Varchar)  |   50   |          Non          |      `null`      |      Numéro de facture officielle      |      Non      |       Non       | `regelements`              |
| **payments**               | Array (JSON)      |   -   |          Oui          |       `[]`       |       Liste des versements client       |      Non      |       Non       | `regelements`              |
| **paymentscie**            | Array (JSON)      |   -   |          Non          |       `[]`       |        Liste des règlements CIE        |      Non      |       Non       | `regelements`              |
| **status**                 | Enum / String     |   20   |          Oui          |   `EN_ATTENTE`   |  `EN_ATTENTE`, `PARTIEL`, `PAYE`  |      Non      |       Non       | `regelements`              |
| **id**                     | String (ObjectId) |   24   |          Oui          |   Auto-généré   |            Hash hexadécimal            |      Oui      |       Non       | `invoices`                 |
| **invoiceNumber**          | String (Varchar)  |   50   |          Oui          |         -         |      Unique (ex:`FAC-2026-001`)      |      Non      |       Non       | `invoices`                 |
| **amountHT**               | Double            |   8   |          Oui          |      `0.0`      |           Montant Hors Taxes           |      Non      |       Non       | `invoices`                 |
| **tvaAmount**              | Double            |   8   |          Oui          |      `0.0`      |       Montant de la TVA calculée       |      Non      |       Non       | `invoices`                 |
| **amountTTC**              | Double            |   8   |          Oui          |      `0.0`      |     Montant Toutes Taxes Comprises     |      Non      |       Non       | `invoices`                 |
| **paidAmount**             | Double            |   8   |          Oui          |      `0.0`      |       Cumul des montants réglés       |      Non      |       Non       | `invoices`                 |
| **remainingAmount**        | Double            |   8   |          Oui          |      `0.0`      |        Reliquat restant à payer        |      Non      |       Non       | `invoices`                 |
| **type**                   | Enum / String     |   20   |          Oui          |    `STANDARD`    |  `STANDARD`, `PROFORMA`, `AVOIR`  |      Non      |       Non       | `invoices`                 |
| **status**                 | Enum / String     |   20   |          Oui          |     `UNPAID`     |    `UNPAID`, `PARTIAL`, `PAID`    |      Non      |       Non       | `invoices`                 |

### 3.4. Architecture de l'application

#### 3.4.1. Architecture logicielle

La solution InsurFlow adopte une architecture 3-tiers découplée, favorisant l'indépendance des couches, la maintenabilité et la testabilité unitaire.

```mermaid
graph TD
    subgraph "Couche Présentation (Frontend - Next.js 15)"
        UI_PAGE["Pages App Router (/dashboard, /operations, /factures)"]
        UI_COMP["Composants UI & Modales (ExerciceSelector, CopilotWidget)"]
        UI_LIB["Client HTTP Axios (Intercepteur JWT) & jsPDF"]
        UI_PAGE --> UI_COMP
        UI_COMP --> UI_LIB
    end

    subgraph "Couche Métier & API (Backend - Spring Boot 3.3)"
        API_SEC["Filtre de Sécurité JWT (JwtAuthFilter & SecurityFilterChain)"]
        API_CTRL["Contrôleurs REST (ProductionController, ReglementController, AiController)"]
        API_SVC["Services Métier (ProductionService, ReglementService, AiClaimAnalysisService)"]
        API_REPO["Spring Data MongoDB Repositories"]
      
        API_SEC --> API_CTRL
        API_CTRL --> API_SVC
        API_SVC --> API_REPO
    end

    subgraph "Couche Données & Supervision"
        DATA_DB[("Base de Données Documentaire MongoDB 7.0")]
        METRICS["Actuator & Micrometer Prometheus"]
    end

    UI_LIB -->|HTTPS / REST JSON| API_SEC
    API_REPO -->|Protocole MongoDB| DATA_DB
    API_SVC -->|Instrumentation| METRICS
```

<div align="center">
<b>Figure 17 : Architecture logicielle 3-tiers (Diagramme de composants)</b>
</div>

**Note Explicative Pédagogique :** Ce diagramme illustre le découpage du logiciel en trois blocs autonomes : l'interface utilisateur, la logique de calcul métier et le stockage des données. Cette architecture garantit que l'application reste extrêmement réactive, modulable et facile à faire évoluer dans le temps.

#### 3.4.2. Architecture matérielle

Le déploiement d'InsurFlow est réalisé sur une machine virtuelle hébergée sur le Cloud Microsoft Azure (région *Spain Central*), provisionnée par infrastructure-as-code avec **Terraform** et configurée avec **Ansible**. L'ensemble des services applicatifs s'exécute dans des conteneurs isolés au sein d'un réseau pont Docker (`insurflow_net`), sécurisés par un reverse-proxy **Nginx** en TLS 1.3 avec certificats Let's Encrypt et supervisés par **Prometheus** et **Grafana**.

```mermaid
graph TB
    subgraph "Client Internet"
        NAV["Navigateur Web Client (HTTPS / Port 443)"]
    end

    subgraph "Azure Cloud - Machine Virtuelle Linux Ubuntu 22.04 LTS"
        subgraph "Reverse Proxy & Sécurité Périmétrique"
            NGINX["Conteneur Nginx (TLS 1.2 / TLS 1.3 / HTTP/2)"]
            CERTBOT["Conteneur Certbot (Renouvellement SSL Let's Encrypt)"]
        end

        subgraph "Conteneurs Applicatifs Docker"
            FRONT["Conteneur Frontend (Next.js 15 / Node.js 20 - Port 3000)"]
            BACK["Conteneur Backend (Spring Boot 3.3 / Java 21 - Port 8080)"]
            MONGO[("Conteneur MongoDB 7.0 (Base 'assurance' - Port 27017)")]
        end

        subgraph "Conteneurs Observabilité"
            PROM["Conteneur Prometheus (Scraping métriques Actuator)"]
            GRAF["Conteneur Grafana (Dashboards temps réel)"]
        end
    end

    NAV -->|Requête chiffrée SSL Port 443| NGINX
    NGINX -->|Proxy / | FRONT
    NGINX -->|Proxy /api/ | BACK
    NGINX -->|Proxy /grafana/ | GRAF
    CERTBOT -.->|Partage volume /var/www/certbot| NGINX
  
    FRONT -->|Appels REST internes| BACK
    BACK -->|Persistance NoSQL| MONGO
    PROM -->|Scrape /actuator/prometheus| BACK
    GRAF -->|Source de données PromQL| PROM
```

<div align="center">
<b>Figure 18 : Architecture matérielle et infrastructure Cloud (Diagramme de déploiement)</b>
</div>

**Note Explicative Pédagogique :** Ce schéma décrit l'hébergement sécurisé de l'application sur le Cloud Azure dans des conteneurs Docker protégés par un chiffrement SSL/TLS. Pour les utilisateurs, cela garantit une accessibilité permanente 24h/24 et une protection maximale contre les pannes et attaques réseau.

## 4. Conclusion

Ce chapitre de conception a permis de formaliser l'ensemble des aspects dynamiques et statiques du système InsurFlow. Grâce aux diagrammes de séquences UML 2 boîte blanche, aux diagrammes d'états-transitions, au diagramme de classes enrichi, au modèle logique de données et au dictionnaire de données exhaustif, nous disposons d'une vision conceptuelle claire et robuste. Le chapitre suivant présente la réalisation concrète du système ainsi que l'environnement de développement et de déploiement DevSecOps.

---

\newpage

# Chapitre 4 : Réalisation du système

## 1. Introduction

Ce quatrième et dernier chapitre est consacré à la phase de concrétisation et de réalisation technique de la plateforme InsurFlow. Nous y détaillons l'environnement matériel et logiciel adopté tant pour les postes de développement que pour l'infrastructure de production Cloud. Nous présentons ensuite une sélection des principales interfaces graphiques développées, accompagnées de descriptions techniques approfondies expliquant leurs fonctionnalités et leur intégration avec les services backend et les modules d'Intelligence Artificielle.

## 2. Environnement de développement

### 2.1. Environnement matériel

Le tableau 8 résume les caractéristiques matérielles des stations de travail utilisées pour l'ingénierie du projet ainsi que les spécifications du serveur Cloud de déploiement.

<div align="center">
<b>Tableau 8 : Spécifications de l'environnement matériel de développement et de déploiement</b>
</div>

| Composant / Ressource             | Station de Développement Locale                        | Serveur Cloud de Production (Azure VM)         |
| :-------------------------------- | :------------------------------------------------------ | :--------------------------------------------- |
| **Type de machine**         | Ordinateur portable d'ingénierie                       | Machine Virtuelle Azure`Standard_D2s_v3`     |
| **Processeur (CPU)**        | Intel Core i7 12ème Génération (10 cœurs @ 4.7 GHz) | 2 vCPUs dédiés x86_64                        |
| **Mémoire Vive (RAM)**     | 16 Go DDR4 (3200 MHz)                                   | 8 Go RAM ECC                                   |
| **Stockage Principal**      | 512 Go SSD NVMe M.2 (Lecture 3500 Mo/s)                 | 64 Go Premium SSD LRS                          |
| **Système d'Exploitation** | Windows 11 Professionnel 64-bit / WSL2 Ubuntu 22.04     | Ubuntu Server 22.04 LTS (Jammy Jellyfish)      |
| **Connectivité Réseau**   | Fibre Optique 100 Mbps                                  | Bande passante Azure 1 Gbps + IP Publique Fixe |

### 2.2. Environnement logiciel

L'écosystème logiciel retenu pour la construction d'InsurFlow comprend des technologies modernes et éprouvées :

#### Côté Backend & Données :

- **Java 21 LTS (Temurin JDK) :** Langage de programmation robuste offrant les *virtual threads* et une excellente performance d'exécution.
- **Spring Boot 3.3.4 :** Framework d'entreprise fournissant l'injection de dépendances, Spring Security, Spring Data MongoDB et Spring Mail.
- **JJWT 0.12.6 :** Bibliothèque de signature et validation cryptographique des jetons stateless JWT.
- **OpenPDF 1.3.40 :** Moteur haute performance de génération et compilation de documents PDF certifiés.
- **MongoDB 7.0 Community Edition :** Base de données orientée documents offrant une flexibilité optimale pour les données de polices d'assurance complexes et les calculs d'agrégation.
- **Micrometer & Spring Actuator :** Exposition des métriques JVM, HTTP et MongoDB pour le scraping Prometheus.

#### Côté Frontend & Client :

- **Next.js 15.2 / React 19 :** Framework web réactif basé sur l'App Router, combinant Server Components pour la rapidité et Client Components pour l'interactivité.
- **TypeScript 5 :** Typage statique strict garantissant l'absence de bugs d'exécution sur les structures financières.
- **Tailwind CSS v4 & Radix UI :** Framework CSS utilitaire couplé à des composants d'interface accessibles et conformes au design system *Modern Whitespace*.
- **Lucide React & React Icons :** Bibliothèque unifiée d'icônes vectorielles.
- **jsPDF & jsPDF-AutoTable :** Moteur de génération de rapports et de registres PDF côté client.
- **Axios :** Client HTTP avec intercepteur automatique pour l'injection du header `Authorization: Bearer <token>`.

#### DevOps, Cloud & DevSecOps :

- **Docker & Docker Compose v2.27 :** Conteneurisation multi-services (`mongodb`, `backend`, `frontend`, `nginx`, `certbot`, `prometheus`, `grafana`).
- **Nginx 1.25 Alpine :** Serveur Web et reverse-proxy haute performance avec terminaison SSL/TLS 1.3, compression Gzip et HTTP/2.
- **Terraform 1.7 :** Infrastructure-as-Code pour le provisionnement reproductible des ressources réseau et VM sur Microsoft Azure.
- **Ansible 2.16 :** Automatisation du durcissement système, de l'installation du moteur Docker et des configurations de sécurité.
- **Trivy (Aqua Security) :** Scanner DevSecOps intégré dans GitHub Actions pour l'analyse statique des vulnérabilités (CVEs critiques et élevées) du code et des dépendances.
- **Prometheus & Grafana :** Stack d'observabilité temps réel pour la surveillance de la disponibilité et des temps de réponse.

## 3. Principales interfaces graphiques

### 3.1. Page d'authentification sécurisée et contrôle d'accès JWT

`[Insérer ici la capture d'écran : Figure 19 - Page d'Authentification Sécurisée et Gestion des Rôles]`

Cette interface d'authentification (`/login`) constitue le point d'entrée sécurisé de la plateforme InsurFlow. Elle garantit l'étanchéité des accès en vérifiant les identifiants saisis face aux hachages cryptographiques BCrypt stockés en base MongoDB. Dès validation, le serveur Spring Boot émet un jeton stateless JWT (JSON Web Token) signé HMAC-SHA256 contenant le rôle de l'utilisateur (`ADMIN` ou `OPERATOR`), injecté ensuite dans les en-têtes HTTP de chaque requête via Axios. Le composant Next.js gère la redirection dynamique et applique les restrictions d'accès aux routes protégées selon le profil habilité.

```
+----------------------------------------------------------------------------------------------------+
|                                      InsurFlow ERP Cloud Suite                                     |
|                                [ Connexion Sécurisée à l'Espace Pro ]                              |
+----------------------------------------------------------------------------------------------------+
|                                                                                                    |
|      Identifiant / Email :     [ admin@insurflow.ma                                     ]          |
|      Mot de passe :            [ •••••••••••••••••••••                                  ]          |
|                                                                                                    |
|      Rôle détecté :            [ Administrateur Système (Accès Total)                   ]          |
|      Environnement :           [ Production Sécurisée SSL/TLS 1.3                       ]          |
|                                                                                                    |
|                                [   SE CONNECTER À LA SESSION ERP   ]                               |
|                                                                                                    |
|      Sécurité : Authentification JWT Stateless 256 bits | Protection CSRF & Rate-Limiting Actifs   |
+----------------------------------------------------------------------------------------------------+
```

<div align="center">
<b>Figure 19 : Interface de la Page d'Authentification Sécurisée et Contrôle d'Accès JWT</b>
</div>

### 3.2. Tableau de bord exécutif & analytics par exercice comptable

`[Insérer ici la capture d'écran : Figure 20 - Tableau de Bord Exécutif & Analytics par Exercice Comptable]`

Le Tableau de Bord Exécutif (`/dashboard`) offre une tour de contrôle financière et opérationnelle en temps réel. Il embarque en en-tête le sélecteur d'exercice comptable `ExerciceSelector` (ex: exercice 2026), permettant de filtrer instantanément l'intégralité des indicateurs de gestion sans recharger la page. L'écran met en exergue quatre cartes de KPIs majeurs : le Chiffre d'Affaires total émis, les Primes encaissées, le Reste à recouvrer (créances assurés) et le nombre d'opérations enregistrées. Deux graphiques interactifs visualisent la progression mensuelle sur 12 mois et la répartition sectorielle des primes par branche de risque (Automobile, Maritime, Accidents du Travail).

```
+----------------------------------------------------------------------------------------------------+
|  InsurFlow ERP        [ Exercice : 2026 v ]        [ Notifications (3) ]       [ Admin (Connecté) ]|
+----------------------------------------------------------------------------------------------------+
|  [ 128 Opérations ]    [ 1 450 000 DH ]       [ 980 000 DH ]       [ 470 000 DH ]     [ 45 Clients]|
|  Total Exercice        Volume Total Émis      Primes Encaissées    Reste à Recouvrer  Portefeuille |
+----------------------------------------------------------------------------------------------------+
|  Évolution Mensuelle des Primes Émises (2026)      |  Répartition par Catégorie de Risque          |
|  [|||  ||||  |||||  |||  ||||||  ||||  |||||  ...] |  [ AUTOMOBILE: 45% | MARITIME: 30% | AT: 25% ]|
+----------------------------------------------------------------------------------------------------+
|  Dernières Opérations Émises (Exercice Comptable 2026)                                             |
|  POL-74278   | Société Atlas Transport | MARITIME   | 45 000 DH | PAYÉ     | [ Fiche Règlement ]   |
|  POL-30469   | M. Karim Alami          | AUTOMOBILE |  4 200 DH | PARTIEL  | [ Fiche Règlement ]   |
|  POL-88102   | Société BTP Tanger      | AT         | 18 300 DH | EN_COURS | [ Fiche Règlement ]   |
+----------------------------------------------------------------------------------------------------+
```

<div align="center">
<b>Figure 20 : Interface du Tableau de Bord Exécutif & Analytics par Exercice Comptable</b>
</div>

### 3.3. Registre de production des opérations et filtres multi-critères

`[Insérer ici la capture d'écran : Figure 21 - Registre de Production des Opérations avec filtres en temps réel et exports]`

L'interface du Registre de Production (`/operations`) rassemble l'ensemble des contrats et avenants souscrits par le cabinet. Elle est dotée d'une barre de filtrage multicritères réactive (recherche textuelle instantanée sur le client ou la police, sélection de l'exercice fiscal, choix de la compagnie et du mois d'effet). Le composant intègre deux boutons stratégiques d'exportation de données : un export Excel CSV certifié avec signature binaire UTF-8 BOM garantissant l'intégrité des caractères accentués arabes et français, et un export PDF paginé haute définition prêt pour les audits de l'ACAPS.

```
+----------------------------------------------------------------------------------------------------+
|  Registre des Opérations de Production                 [ + Nouvelle Police ]  [ Export CSV ] [ PDF]|
+----------------------------------------------------------------------------------------------------+
|  [ Recherche client, police... ] [ Exercice: 2026 v ] [ Cie: Toutes v ] [ Catégorie: AUTOMOBILE v ]|
+----------------------------------------------------------------------------------------------------+
|  N° Police  | Client            | Date Eff   | Mois Dém | Compagnie     | Montant TTC | Statut     |
|  POL-1092   | Sté Maghreb Fret  | 01/02/2026 | 2026-02  | Sanlam Maroc  | 18 500 DH   | PAYÉ       |
|  POL-1093   | M. Ahmed Bennani  | 15/02/2026 | 2026-02  | Wafa Assur    |  3 800 DH   | EN_ATTENTE |
|  POL-1094   | Sté Tanger Marine | 20/02/2026 | 2026-02  | AtlantaSanad  | 62 000 DH   | PARTIEL    |
|  POL-1095   | M. Youssef Tazi   | 24/02/2026 | 2026-02  | RMA Assurance |  7 150 DH   | PAYÉ       |
+----------------------------------------------------------------------------------------------------+
```

<div align="center">
<b>Figure 21 : Interface du Registre de Production des Opérations avec filtres multi-critères et exports</b>
</div>

### 3.4. Formulaire de police maritime et ventilation co-assurance

`[Insérer ici la capture d'écran : Figure 22 - Formulaire de Police Maritime et Ventilation Co-Assurance Dynamique]`

Ce formulaire spécialisé prend en charge la souscription des risques maritimes (`MARITIME` et `MARITIME A C`). Il permet d'enregistrer les métadonnées maritimes réglementaires : nom du navire, numéro de certificat maritime et numéro d'ordre séquentiel interne. Son atout majeur réside dans son module de répartition en co-assurance : le gestionnaire peut associer plusieurs compagnies d'assurances partenaires en renseignant leur quote-part respective. Une jauge interactive vérifie en temps réel que le cumul des pourcentages atteint exactement 100%, bloquant toute validation asymétrique afin de garantir la cohérence des écritures comptables.

Afin d'éviter les erreurs de saisie et de garantir la cohérence contractuelle, le formulaire de souscription intègre un moteur d'auto-génération séquentielle du numéro de police. Dès la sélection de la compagnie d'assurance partenaire, le système extrait le trigramme institutionnel (ex: SANLAM, RMA, WAFA, ALLIANZ), récupère l'exercice comptable de la date d'effet et calcule l'incrément séquentiel unique selon le schéma standardisé `POL-{COMPAGNIE}-{ANNEE}-{00X}`. Un contrôle d'intégrité en cascade propage automatiquement cette référence vers les modules de facturation et de gestion des sinistres.

```
+----------------------------------------------------------------------------------------------------+
|  Nouvelle Police d'Assurance — Branche MARITIME & CO-ASSURANCE                                     |
+----------------------------------------------------------------------------------------------------+
|  Client : [ Société Marocaine de Cabotage v ]        Nature Opération : [ Affaire Nouvelle v ]     |
|  N° Police : [ POL-MAR-2026-88 ]                      N° Ordre Interne : [ 74278 ]                 |
|  Nom du Navire : [ MV TANGER EXPRESS ]               N° Certificat : [ CERT-9942 ]                |
+----------------------------------------------------------------------------------------------------+
|  Ventilation Co-Assurance Multi-Compagnies :                                                       |
|  - AtlantaSanad (Compagnie Apéritrice) : [ 50 % ]                                                  |
|  - RMA Royale Marocaine d'Assurance   : [ 30 % ]                                                  |
|  - Wafa Assurance                     : [ 20 % ]          [ JAUGE : 100 % — RÉPARTITION CONFORME ] |
+----------------------------------------------------------------------------------------------------+
|  Décomposition Primes : Nette [ 50 000 DH ] Taxes [ 7 000 DH ] Accessoires [ 500 DH ]             |
|  Montant Total TTC Calculé : 57 500 DH                        [ Annuler ] [ Enregistrer la Police ]|
+----------------------------------------------------------------------------------------------------+
```

<div align="center">
<b>Figure 22 : Interface du Formulaire de Saisie d'une Police Maritime et ventilation Co-assurance</b>
</div>

### 3.5. Fiche de détail du double circuit financier (Clients & CIE)

`[Insérer ici la capture d'écran : Figure 23 - Fiche de Détail du Double Circuit Financier (Clients & CIE)]`

L'écran de détail du règlement (`/regelements/[id]`) matérialise l'étanchéité comptable du double circuit financier d'InsurFlow. La vue est scindée en deux volets distincts et synchronisés : le **Circuit 1 (Encaissements Clients)** enregistre les paiements de l'assuré (espèces, chèques bancaires, virements) et ajuste en temps réel le solde de la créance ainsi que l'état d'acquittement (`EN_ATTENTE`, `PARTIEL`, `PAYÉ`). Le **Circuit 2 (Reversements Compagnies CIE)** consigne les décaissements et bordereaux reversés à l'assureur porteur de risque, garantissant une parfaite isolation entre la dette de l'assuré et la trésorerie due aux partenaires.

```
+----------------------------------------------------------------------------------------------------+
|  Fiche de Règlement — Police N° POL-MAR-2026-88 (Total TTC : 57 500 DH)     [ Statut : PARTIEL ]   |
|  Client : Sté Marocaine de Cabotage | Réf Facture : [ FAC-2026-0042 ]                              |
+----------------------------------------------------------------------------------------------------+
|  CIRCUIT 1 : ENCAISSEMENTS CLIENT (Total Reçu : 30 000 DH | Solde Restant Dû : 27 500 DH)         |
|  - 02/02/2026 | Chèque Attijari N° 449201 | 20 000 DH | Émis par : Client  | Enregistré par : Admin|
|  - 15/02/2026 | Virement Bancaire         | 10 000 DH | Réf : VIR-88391    | Enregistré par : Admin|
|  [ + Saisir un Encaissement Client ]                                                               |
+----------------------------------------------------------------------------------------------------+
|  CIRCUIT 2 : REVERSEMENTS COMPAGNIE CIE (Total Reversé à AtlantaSanad : 25 000 DH)                 |
|  - 10/02/2026 | Virement Bordereau N° 881 | 25 000 DH | Décaissé par le Cabinet (Compte CIE)       |
|  [ + Saisir un Reversement Compagnie CIE ]                                                         |
+----------------------------------------------------------------------------------------------------+
```

<div align="center">
<b>Figure 23 : Interface de la Fiche de Détail du Double Circuit Financier (Clients & CIE)</b>
</div>

### 3.6. Module facturation, devis proforma et factures d'avoir

`[Insérer ici la capture d'écran : Figure 24 - Module Facturation, Devis Proforma et Factures d'Avoir]`

Le module de Facturation (`/factures`) centralise l'émission, la consultation et la régularisation de toutes les pièces comptables du cabinet. Il gère trois typologies documentaires : les **Factures Standards** pour les contrats souscrits, les **Devis Proforma** (avec mention légale automatique de validité contractuelle de 30 jours pour la prospection commerciale), et les **Factures d'Avoir** pour les annulations ou ristournes de primes. Chaque pièce bénéficie d'un identifiant chronologique unique et d'un suivi dynamique de son statut de règlement (`UNPAID`, `PARTIAL`, `PAID`).

```
+----------------------------------------------------------------------------------------------------+
|  Module Facturation & Gestion Documentaire                         [ + Nouveau Devis Proforma ]    |
+----------------------------------------------------------------------------------------------------+
|  [ Total Facturé : 850 000 DH ]   [ Total Encaissé : 620 000 DH ]   [ Avoirs Émis : 15 000 DH ]    |
+----------------------------------------------------------------------------------------------------+
|  N° Facture    | Date Émission | Type Document | Client / Raison Sociale | Montant TTC | Statut    |
|  FAC-2026-001  | 05/01/2026    | STANDARD      | Sté Atlas Transport     | 45 000 DH   | PAYÉ      |
|  PRF-2026-012  | 10/02/2026    | PROFORMA (30j)| Sté Logistique Nord     | 12 500 DH   | EN COURS  |
|  AVR-2026-003  | 18/02/2026    | AVOIR         | M. Karim Alami          | -2 100 DH   | RÉGLÉ     |
+----------------------------------------------------------------------------------------------------+
```

<div align="center">
<b>Figure 24 : Interface du Module Facturation, Devis Proforma et Factures d'Avoir</b>
</div>

### 3.7. Document officiel de facturation et devis PDF haute résolution

`[Insérer ici la capture d'écran : Figure 25 - Document de Facture / Devis PDF généré via le moteur OpenPDF]`

Cette interface restitue l'aperçu vectoriel du document PDF compilé côté serveur par le moteur Java OpenPDF. Le document généré respecte fidèlement les normes de facturation marocaine : en-tête officiel du cabinet, identification complète du client (ICE 15 chiffres, CIN, Identifiant Fiscal, Patente), tableau détaillé des primes avec ventilation Hors Taxes (HT), taux et montants de TVA (14% ou 20%), taxe parafiscale, accessoires, et total général TTC. Le pied de page certifie le document avec mention du tribunal compétent et signature numérique de l'agence.

```
+----------------------------------------------------------------------------------------------------+
|  CABINET DE COURTAGE ASSURANCE YK SOFTWARE                       FACTURE N° : FAC-2026-0042        |
|  Boulevard d'Anfa, Casablanca - ICE : 001892837000042            Date d'émission : 15/02/2026      |
+----------------------------------------------------------------------------------------------------+
|  DESTINATAIRE (CLIENT) :                                         DÉTAILS CONTRAT :                 |
|  Société Marocaine de Cabotage                                   Police : POL-MAR-2026-88          |
|  ICE : 002991823000091 | RC : 49201 | IF : 339201                Branche : MARITIME                |
+----------------------------------------------------------------------------------------------------+
|  Désignation des Garanties / Rubriques             |  Taux TVA  |  Montant HT MAD  |  Total TTC    |
|  Prime Nette Maritime (Navire MV TANGER EXPRESS)   |    14 %    |    50 000,00     |   57 000,00   |
|  Accessoires de Police et Frais d'Émission         |    20 %    |       500,00     |      600,00   |
+----------------------------------------------------------------------------------------------------+
|  TOTAL HORS TAXES (HT) :                                                         50 500,00 MAD     |
|  MONTANT TOTAL TVA :                                                              7 100,00 MAD     |
|  NET À PAYER TOUTES TAXES COMPRISES (TTC) :                                      57 600,00 MAD     |
+----------------------------------------------------------------------------------------------------+
|  Cachet & Signature Électronique de l'Intermédiaire Agréé             Document certifié conforme   |
+----------------------------------------------------------------------------------------------------+
```

<div align="center">
<b>Figure 25 : Document officiel de Facture / Devis PDF généré via le moteur OpenPDF</b>
</div>

### 3.8. Modal d'analyse intelligente des sinistres par IA (Claims AI)

`[Insérer ici la capture d'écran : Figure 26 - Modal d'Analyse Intelligente des Sinistres par IA (Claims AI)]`

L'assistant intelligent de gestion des sinistres (`Claims AI`) se présente sous la forme d'une fenêtre modale interactive accessible depuis la fiche de contrat et le registre des sinistres. L'assistant intelligent élimine toute redondance en liant dynamiquement le client sélectionné à son portefeuille de contrats actifs : le sélecteur restreint instantanément le choix aux seules polices souscrites par l'assuré. Dès l'analyse du constat amiable, le moteur d'inférence confronte le récit aux exigences de la Loi n° 17-99 (Code des Assurances) en auditant le respect du délai légal de déclaration (Article 20, seuil de 5 jours ouvrés). Parallèlement, il détermine automatiquement le degré de responsabilité selon les conventions CID / CISA (Barème ACAPS) et calcule le décompte net d'indemnisation par imputation de la franchise contractuelle.

```
+----------------------------------------------------------------------------------------------------+
|  [ AI CLAIMS ANALYZER ] — Expertise Intelligente de Déclaration de Sinistre & Fraude               |
+----------------------------------------------------------------------------------------------------+
|  Client : [ M. Omar Tazi ]               Police Rattachée : [ POL-AUTO-2026-104 ]                  |
|  Récit du Constat Amiable :                                                                        |
|  "Choc arrière sur voie rapide suite à un freinage d'urgence du véhicule tiers B. Déclaration       |
|   transmise avec 12 jours de retard par rapport à la date de l'accident."                          |
|  Dommages Estimés : [ 15 000 DH ]        Franchise Contractuelle : [ 2 000 DH ]                    |
+----------------------------------------------------------------------------------------------------+
|  RAPPORT D'EXPERTISE AUTOMATISÉ IA :                                                               |
|  * Score de Suspicion de Fraude : [ 65/100 — RISQUE MOYEN ]                                        |
|  * Responsabilité Établie : 0% Responsable (Recours intégral 100% contre Tiers — Barème CISA)      |
|  * Décompte Financier Net : 13 000 DH (Dommages 15 000 DH - Franchise déductible 2 000 DH)         |
|  * Anomalie Détectée : Déclaration tardive > 5 jours ouvrés (Article 20 de la Loi n° 17-99)       |
|  * Recommandation : Exiger justificatif du retard (force majeure) et mandater un expert agréé      |
+----------------------------------------------------------------------------------------------------+
```

<div align="center">
<b>Figure 26 : Interface du Modal d'Analyse Intelligente des Sinistres par IA (Claims AI)</b>
</div>

### 3.9. Registre et pilotage du cycle de vie des sinistres

`[Insérer ici la capture d'écran : Figure 27 - Tableau de bord et registre de gestion du portefeuille de sinistres]`

Ce module centralise l'ensemble du portefeuille des sinistres instruits au sein du cabinet. Il modélise le cycle de vie complet du dossier à travers une machine à états finis (DÉCLARÉ $\rightarrow$ EN EXPERTISE $\rightarrow$ INDEMNISÉ $\rightarrow$ CLÔTURÉ). Le tableau de bord restitue en temps réel les indicateurs clés de sinistralité (encours global indemnisable, taux de responsabilité moyen, distribution du score de fraude IA) et propose une pagination dynamique et multicritère (filtres par statut légal, compagnie apéritrice et niveau de risque).

```
+----------------------------------------------------------------------------------------------------+
|  InsurFlow ERP — Module Gestion des Sinistres & Arbitrage ACAPS            [ + Nouveau Sinistre IA]|
+----------------------------------------------------------------------------------------------------+
|  [ 6 Sinistres Actifs ]     [ 2 En Expertise ]      [ 163 200 DH ]             [ 27.8 / 100 ]      |
|  Portefeuille Global        Instruction en cours    Indemnités Nettes Dues     Score Fraude Moyen  |
+----------------------------------------------------------------------------------------------------+
|  [ Recherche sinistre, client... ] [ Statut : Tous v ] [ Risque : Tous v ]                         |
+----------------------------------------------------------------------------------------------------+
|  Réf. Sinistre | Client / Assuré    | N° Police & Compagnie | Score Fraude IA | Net MAD   | Statut   |
|  SIN-2026-0001 | Sté Maghreb Fret   | POL-ATLANTA-2026-001  | 12/100 (Faible) | 16 500 DH | EXPERTISE|
|  SIN-2026-0002 | M. Youssef Mansouri| POL-SANLAM-2026-001   | 42/100 (Moyen)  |  7 700 DH | DÉCLARÉ  |
|  SIN-2026-0003 | Sté Atlas Transport| POL-RMA-2026-001      | 08/100 (Faible) | 37 000 DH | INDEMNISÉ|
|  SIN-2026-0006 | Mme Amina Amrani   | POL-AXA-2026-001      | 78/100 (Élevé)  | 25 000 DH | DÉCLARÉ  |
+----------------------------------------------------------------------------------------------------+
|  Affichage de 1 à 6 sur 6 sinistres                  [ 10 / page v ] [ Précédent ] [ 1 ] [ Suivant]|
+----------------------------------------------------------------------------------------------------+
```

<div align="center">
<b>Figure 27 : Tableau de bord et registre de gestion du portefeuille de sinistres</b>
</div>

### 3.10. Stack d'observabilité et monitoring de production (Grafana / Prometheus)

`[Insérer ici la capture d'écran : Figure 28 - Tableau de Bord d'Observabilité et Monitoring Grafana / Prometheus]`

Cette interface de supervision d'infrastructure (`/grafana`) centralise les métriques techniques collectées en temps réel par Prometheus via Spring Boot Actuator et Micrometer. Elle permet aux ingénieurs système de surveiller l'état de santé des conteneurs Docker en production sur la VM Azure : taux d'usage CPU et mémoire vive de la machine hôte, allocation de la mémoire Heap de la machine virtuelle Java 21, latences des requêtes HTTP (percentiles p95 et p99), volumétrie des connexions actives au pool MongoDB et statut de disponibilité des services (Uptime 99.9%).

```
+----------------------------------------------------------------------------------------------------+
|  Grafana Monitoring Dashboard — Plateforme InsurFlow Production             [ Uptime : 99.98 % ]   |
+----------------------------------------------------------------------------------------------------+
|  [ CPU Usage : 14.2 % ]       [ RAM JVM : 512 Mo / 2 Go ]      [ HTTP Req/s : 42.5 req/s ]         |
|  Charge Système VM Azure      Heap Memory Java 21              Débit Requêtes Spring Boot          |
+----------------------------------------------------------------------------------------------------+
|  Latence des Endpoints REST (/api/...)             |  Statut des Conteneurs Docker (insurflow_net) |
|  p50: 12ms | p95: 45ms | p99: 110ms                |  - backend (Spring Boot 3.3)   : [ HEALTHY ]  |
|  [-----------------------------------------------] |  - frontend (Next.js 15)       : [ HEALTHY ]  |
|  Volume Connexions MongoDB 7.0                     |  - mongodb (Database 7.0)      : [ HEALTHY ]  |
|  Actives : 8 | En attente : 0                      |  - nginx (Reverse Proxy TLS)   : [ HEALTHY ]  |
+----------------------------------------------------------------------------------------------------+
```

<div align="center">
<b>Figure 28 : Interface du Tableau de Bord d'Observabilité & Monitoring Grafana / Prometheus</b>
</div>

### 3.11. Pipeline d'automatisation DevSecOps (CI/CD GitHub Actions & Scans Trivy)

`[Insérer ici la capture d'écran : Figure 29 - Pipeline CI/CD DevSecOps sous GitHub Actions avec scans de sécurité Trivy]`

L'intégration et le déploiement continus sont orchestrés par GitHub Actions (`deploy.yml`). Le workflow DevSecOps déclenché à chaque commit sur la branche `main` automatise trois étapes rigoureuses : la compilation et validation unitaire (Maven tests Java 21 et vérification TypeScript strict Next.js), l'audit statique de sécurité via le scanner Trivy bloquant toute dépendance présentant une vulnérabilité critique ou élevée, et le déploiement automatisé par tunnel SSH sur la machine virtuelle Azure avec mise à jour à chaud des conteneurs Docker Compose.

```mermaid
graph LR
    P["Push sur main"] --> STAGE1["Stage 1: Build & Tests<br>(Maven test + npm typecheck)"]
    STAGE1 --> STAGE2["Stage 2: Security Scan<br>(Trivy Scan CVE Critical/High)"]
    STAGE2 --> STAGE3["Stage 3: CD Azure VM<br>(SSH Deploy + Docker Compose Build)"]
    STAGE3 --> PROD["Application en Ligne Sécurisée<br>(https://insurflow-app.duckdns.org)"]
```

<div align="center">
<b>Figure 29 : Pipeline CI/CD DevSecOps sous GitHub Actions avec scans de sécurité Trivy</b>
</div>

## 4. Conclusion

Ce quatrième chapitre a mis en lumière la réalisation concrète et le déploiement opérationnel d'InsurFlow. En combinant un environnement matériel et logiciel de pointe, des interfaces soignées respectant les règles ergonomiques du *Modern Whitespace*, des modules d'Intelligence Artificielle à forte valeur ajoutée et une chaîne DevSecOps entièrement automatisée, nous avons délivré une solution ERP complète, robuste et immédiatement exploitable par l'organisme d'accueil.

---

\newpage

# Conclusion Générale

Au terme de ce Projet de Fin d'Année (PFA) de 4ème Année en Ingénierie Informatique et Réseaux à l'École Marocaine des Sciences de l'Ingénieur (EMSI), nous avons mené avec succès l'étude, la conception et la réalisation de la plateforme ERP d'assurance **InsurFlow**.

Ce projet est né de la volonté de résoudre les problématiques structurelles rencontrées par les cabinets de courtage d'assurance, caractérisées par l'utilisation d'outils disparates et de feuilles de calcul manuelles (`PROD S C`, `PROD A C`, `MARITIME`, `MARITIME A C`). Cette organisation engendrait des risques d'erreurs comptables, un manque de traçabilité des créances clients et une opacité dans les règlements dus aux compagnies d'assurance mandantes.

Pour répondre à ces défis, nous avons conçu une solution logicielle d'entreprise full-stack et cloud-native apportant des réponses concrètes et innovantes :

- **La gestion native et étanche des exercices comptables :** L'intégration du composant `ExerciceSelector` et des filtres temporels sur l'ensemble de l'ERP permet d'isoler rigoureusement les données financières par année comptable, simplifiant les clôtures fiscales et le pilotage analytique.
- **La modélisation exhaustive des registres métiers :** Le système prend en charge l'intégralité des particularités de l'assurance marocaine, notamment la branche maritime avec gestion des numéros d'ordre, navires, certificats et ventilation des primes en co-assurance multi-compagnies.
- **Le double circuit financier indépendant :** La séparation étanche entre le circuit d'encaissement client (qui ajuste automatiquement le crédit de l'assuré) et le circuit de décaissement compagnie (CIE) garantit une clarté comptable absolue et élimine tout risque de discordance.
- **La facturation certifiée et l'export universel :** L'automatisation des factures, devis proforma et avoirs couplée à la génération de PDF officiels (OpenPDF / jsPDF) et d'exports Excel en encodage UTF-8 BOM assure une interopérabilité sans faille.
- **L'intégration de l'Intelligence Artificielle :** Le module d'analyse des sinistres qualifie automatiquement les responsabilités selon le barème conventionnel ACAPS / CISA, effectue le décompte net après franchise et évalue le score de suspicion de fraude (0-100) en appliquant les règles de la Loi n° 17-99.
- **L'excellence opérationnelle DevSecOps :** L'automatisation de l'infrastructure sur Azure via Terraform et Ansible, la conteneurisation Docker, la sécurisation TLS 1.3 sous Nginx, les scans de sécurité Trivy et la supervision Prometheus / Grafana confèrent à la plateforme une résilience de niveau industriel.

Sur le plan personnel et académique, ce projet a constitué une expérience particulièrement enrichissante. Il nous a permis de consolider nos compétences en architecture logicielle d'entreprise (Spring Boot 3.3, Java 21, Next.js 15, TypeScript), d'approfondir la modélisation formelle UML 2 boîte blanche, de maîtriser les pratiques DevSecOps et de nous immerger dans les règles complexes du droit des assurances.

En guise de **perspectives d'évolution future**, nous envisageons :

1. L'intégration de la signature électronique qualifiée conforme à la Loi n° 53-05 sur l'échange électronique des données juridiques ;
2. L'interconnexion par API directe (Webservices / EDI) avec les systèmes d'information centraux des principales compagnies d'assurance pour la transmission automatisée des bordereaux de quittances ;
3. Le développement d'une application mobile dédiée aux assurés pour la déclaration géolocalisée de sinistres en temps réel avec téléversement de photographies analysées par vision par ordinateur.

---

\newpage

# Bibliographie et Nétographie

## Bibliographie

[1] ROQUES, Pascal. *UML 2 par la pratique : Études de cas et exercices corrigés*, Paris, Éditions Eyrolles, 5ème Édition, 2008, 380 pages.
[2] AUDIBERT, Laurent. *UML 2 : De l'apprentissage à la pratique*, Paris, Éditions Ellipses, 2014, 256 pages.
[3] WALLS, Craig. *Spring in Action, Sixth Edition*, Shelter Island, Manning Publications, 2022, 520 pages.
[4] MARTIN, Robert C. *Clean Architecture: A Craftsman's Guide to Software Structure and Design*, Boston, Prentice Hall, 2017, 432 pages.
[5] ROYAUME DU MAROC. *Loi n° 17-99 portant Code des Assurances*, Bulletin Officiel n° 5054, Rabat, Secrétariat Général du Gouvernement, 2002.
[6] ACAPS. *Recueil des textes réglementaires relatifs aux intermédiaires d'assurances*, Rabat, Autorité de Contrôle des Assurances et de la Prévoyance Sociale, 2021.

## Nétographie

[7] https://spring.io/projects/spring-boot : Documentation officielle du framework Spring Boot 3.3 et Spring Security.
[8] https://nextjs.org/docs : Documentation de référence pour Next.js 15, React 19 et l'App Router.
[9] https://www.mongodb.com/docs/ : Guides de modélisation et d'indexation pour MongoDB 7.0.
[10] https://www.aquasec.com/products/trivy/ : Documentation de l'outil d'analyse de sécurité et de vulnérabilités DevSecOps Trivy.
[11] https://nginx.org/en/docs/ : Guide de configuration avancée et durcissement TLS pour Nginx HTTP Server.
[12] https://prometheus.io/docs/introduction/overview/ : Documentation du système de collecte de métriques et d'alerting Prometheus.
[13] https://developer.mozilla.org/fr/docs/Web/HTTP : Référentiel MDN sur les standards HTTP, CORS et les protocoles de sécurité web.

---

\newpage

# Annexes

## Annexe A : Extraits de code source métier (Spring Boot)

### 1. Logique d'analyse intelligente des sinistres (`AiClaimAnalysisService.java`)

```java
package com.insurflow.assurance.service;

import com.insurflow.assurance.dto.*;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import java.util.ArrayList;
import java.util.List;

@Service
@Slf4j
public class AiClaimAnalysisService {

    public ClaimAnalysisResponse analyzeClaim(ClaimAnalysisRequest request) {
        String text = (request.getClaimText() != null) ? request.getClaimText().trim().toLowerCase() : "";
        int fraudScore = 15;
        List<String> riskFlags = new ArrayList<>();
        List<String> recommendedActions = new ArrayList<>();

        double estimatedDamage = request.getEstimatedDamage() != null ? request.getEstimatedDamage() : 8500.0;
        double deductible = request.getDeductible() != null ? request.getDeductible() : 1500.0;

        // Détection heuristique d'anomalies (Loi 17-99 et Barème ACAPS)
        boolean isSoloNoThirdParty = text.contains("sans tiers") || text.contains("obstacle fixe") || text.contains("poteau");
        boolean isLateDeclaration = text.contains("retard") || text.contains("10 jours") || text.contains("15 jours");
        boolean isRecentSubscription = text.contains("souscrit hier") || text.contains("nouvelle police");

        if (isSoloNoThirdParty) {
            fraudScore += 25;
            riskFlags.add("Accident sans tiers identifié en stationnement / choc isolé (Vérifier absence de maquillage).");
        }
        if (isLateDeclaration) {
            fraudScore += 20;
            riskFlags.add("Déclaration tardive > 5 jours ouvrés (Article 20 de la Loi n° 17-99).");
            recommendedActions.add("Vérifier le motif légal du retard de déclaration (Cas fortuit ou force majeure).");
        }
        if (isRecentSubscription) {
            fraudScore += 30;
            riskFlags.add("Sinistre survenu à proximité immédiate de la souscription (Antériorité possible).");
            recommendedActions.add("Vérifier l'heure exacte d'encaissement de la quittance initiale.");
        }

        fraudScore = Math.max(5, Math.min(95, fraudScore));
        String fraudLevel = (fraudScore < 35) ? "FAIBLE" : (fraudScore < 65) ? "MOYEN" : "ÉLEVÉ";
        double netPayout = Math.max(0.0, estimatedDamage - deductible);

        FinancialBreakdownDto breakdown = FinancialBreakdownDto.builder()
                .estimatedDamage(estimatedDamage)
                .deductible(deductible)
                .netPayout(netPayout)
                .currency("MAD")
                .notes("Calcul net d'indemnisation après imputation de la franchise contractuelle.")
                .build();

        return ClaimAnalysisResponse.builder()
                .executiveSummary("Déclaration de sinistre analysée pour " + request.getClientName())
                .liabilityAssessment("Responsabilité conventionnelle selon barème ACAPS / CISA.")
                .financialBreakdown(breakdown)
                .fraudRiskScore(fraudScore)
                .fraudRiskLevel(fraudLevel)
                .riskFlags(riskFlags)
                .recommendedActions(recommendedActions)
                .build();
    }
}
```

## Annexe B : Configuration Nginx sécurisée avec TLS 1.3 (`nginx/default.conf`)

```nginx
server {
    listen 80;
    server_name insurflow-app.duckdns.org;
    location /.well-known/acme-challenge/ { root /var/www/certbot; }
    location / { return 301 https://$host$request_uri; }
}

server {
    listen 443 ssl;
    http2 on;
    server_name insurflow-app.duckdns.org;

    ssl_certificate /etc/letsencrypt/live/insurflow-app.duckdns.org/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/insurflow-app.duckdns.org/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384;

    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;

    location /api/ {
        proxy_pass http://backend:8080/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        proxy_pass http://frontend:3000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## Annexe C : Définition d'infrastructure Terraform (`infra/main.tf`)

```hcl
resource "azurerm_resource_group" "rg" {
  name     = "InsurFlow-RG"
  location = "spaincentral"
}

resource "azurerm_virtual_network" "vnet" {
  name                = "InsurFlow-VNet"
  address_space       = ["10.0.0.0/16"]
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
}

resource "azurerm_linux_virtual_machine" "vm" {
  name                = "InsurFlow-Server"
  resource_group_name = azurerm_resource_group.rg.name
  location            = azurerm_resource_group.rg.location
  size                = "Standard_D2s_v3"
  admin_username      = "adminuser"
  network_interface_ids = [azurerm_network_interface.nic.id]

  os_disk {
    caching              = "ReadWrite"
    storage_account_type = "Standard_LRS"
  }

  source_image_reference {
    publisher = "Canonical"
    offer     = "0001-com-ubuntu-server-jammy"
    sku       = "22_04-lts"
    version   = "latest"
  }
}
```
