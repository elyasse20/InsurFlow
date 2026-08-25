# InsurFlow Ansible Server Provisioning & Configuration Management

Ce répertoire contient l'automatisation Ansible pour provisionner et configurer l'environnement de production sur la machine virtuelle Azure (Ubuntu 22.04 LTS) pour **InsurFlow**.

---

## 📁 Structure du Répertoire

```
ansible/
├── ansible.cfg       # Configuration globale (désactivation host key checking, inventaire par défaut, format yaml)
├── inventory.ini     # Inventaire des serveurs cibles avec adresses IP et variables hôtes
├── playbook.yml      # Playbook principal pour l'installation et la configuration
└── README.md         # Guide d'exécution et documentation
```

---

## 📋 Prérequis

1. **Ansible** installé sur votre machine locale ou agent CI/CD :
   ```bash
   # Sur Ubuntu/Debian / WSL
   sudo apt update
   sudo apt install -y ansible sshpass
   ```
2. **Collection Community General** (fournie par défaut avec la plupart des installations Ansible) :
   ```bash
   ansible-galaxy collection install community.general
   ```
3. Accès SSH configuré vers la VM Azure (`158.158.112.79`).

---

## 🚀 Guide d'Exécution

### 1. Vérification de la Syntaxe (`--syntax-check`)
Avant d'exécuter le playbook, assurez-vous qu'il ne contient aucune erreur de syntaxe :
```bash
ansible-playbook -i inventory.ini playbook.yml --syntax-check
```

---

### 2. Test à blanc / Dry Run (`--check`)
Simule l'exécution sans appliquer de modifications réelles sur la machine cible :

- **Avec mot de passe SSH & sudo** :
  ```bash
  ansible-playbook -i inventory.ini playbook.yml --check --ask-pass --ask-become-pass
  ```
- **Avec clé SSH privée** :
  ```bash
  ansible-playbook -i inventory.ini playbook.yml --check --private-key ~/.ssh/id_rsa
  ```

---

### 3. Exécution Complète du Playbook

- **Avec mot de passe SSH & sudo** :
  ```bash
  ansible-playbook -i inventory.ini playbook.yml --ask-pass --ask-become-pass
  ```
- **Avec clé SSH privée** :
  ```bash
  ansible-playbook -i inventory.ini playbook.yml --private-key ~/.ssh/id_rsa
  ```

---

## 🛡️ Tâches Effectuées par le Playbook

| Étape | Description |
| :--- | :--- |
| **Mise à jour Système** | Mise à jour des paquets `apt` et installation des utilitaires (`curl`, `git`, `ufw`, etc.) |
| **Docker Engine Officiel** | Ajout du trousseau GPG officiel, ajout du dépôt Docker et installation de Docker CE + Compose plugin |
| **Permissions Utilisateur** | Ajout de `adminuser` au groupe `docker` pour exécuter Docker sans `sudo` |
| **Sécurisation UFW** | Blocage des connexions entrantes par défaut et ouverture des ports : `22` (SSH), `80` (HTTP), `443` (HTTPS), `3000` (Frontend), `8080` (Backend) |
| **Synchronisation Projet** | Clonage/Pull du dépôt [InsurFlow](https://github.com/elyasse20/InsurFlow.git) sur la branche `main` dans `/home/adminuser/InsurFlow` |

---

## 🔍 Commandes de Vérification sur le Serveur

Après l'exécution d'Ansible, connectez-vous au serveur et testez les services :

```bash
# Vérifier le statut de Docker
sudo systemctl status docker

# Vérifier la version de Docker & Docker Compose
docker --version
docker compose version

# Vérifier les règles du Pare-feu UFW
sudo ufw status verbose

# Vérifier le dossier de l'application
ls -la /home/adminuser/InsurFlow
```
