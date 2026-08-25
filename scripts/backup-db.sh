#!/bin/bash
# =============================================================================
# InsurFlow - Automated Database Backup Script (PostgreSQL & MongoDB)
# =============================================================================
# Description:
#   Performs automated containerized database backups (PostgreSQL & MongoDB),
#   compresses output with gzip, enforces a 7-day retention policy, and logs
#   execution details with timestamps.
# =============================================================================

set -eo pipefail

# ── Color Codes for Output ───────────────────────────────────────────────────
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ── Log Helper Function ──────────────────────────────────────────────────────
log_info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] [INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] [SUCCESS]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] [WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] [ERROR]${NC} $1" >&2
}

# ── Base Directory Resolution ────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

# ── Load Environment Variables ───────────────────────────────────────────────
ENV_FILE="${PROJECT_ROOT}/.env"
if [ -f "$ENV_FILE" ]; then
    log_info "Loading configuration from ${ENV_FILE}"
    # shellcheck disable=SC1090
    set -a
    source "$ENV_FILE"
    set +a
fi

# ── Configuration & Defaults ─────────────────────────────────────────────────
BACKUP_ROOT="${PROJECT_ROOT}/backups/db"
RETENTION_DAYS="${RETENTION_DAYS:-7}"
TIMESTAMP="$(date +'%Y%m%d_%H%M%S')"

# Database Configuration Defaults
POSTGRES_CONTAINER="${POSTGRES_CONTAINER:-insurflow_postgres}"
POSTGRES_DB="${POSTGRES_DB:-insurflow}"
POSTGRES_USER="${POSTGRES_USER:-postgres}"

MONGO_CONTAINER="${MONGO_CONTAINER:-insurflow_mongodb}"
MONGO_DB="${MONGO_DB:-assurance}"

# Ensure Backup Directory Exists
mkdir -p "${BACKUP_ROOT}"

log_info "Starting InsurFlow Automated Database Backup..."
log_info "Target Backup Directory: ${BACKUP_ROOT}"
log_info "Retention Policy: Keep last ${RETENTION_DAYS} days"

# ── Detect Running Database Container ─────────────────────────────────────────
BACKUP_SUCCESS=0

# 1. Check for PostgreSQL Container
if docker ps --format '{{.Names}}' | grep -q "^${POSTGRES_CONTAINER}$"; then
    log_info "Detected active PostgreSQL container: ${POSTGRES_CONTAINER}"
    BACKUP_FILE="${BACKUP_ROOT}/insurflow_postgres_${TIMESTAMP}.sql.gz"
    
    log_info "Executing pg_dump for database '${POSTGRES_DB}'..."
    if docker exec -t "${POSTGRES_CONTAINER}" pg_dump -U "${POSTGRES_USER}" "${POSTGRES_DB}" | gzip > "${BACKUP_FILE}"; then
        BACKUP_SIZE="$(du -h "${BACKUP_FILE}" | cut -f1)"
        log_success "PostgreSQL backup completed successfully: ${BACKUP_FILE} (Size: ${BACKUP_SIZE})"
        BACKUP_SUCCESS=1
    else
        log_error "PostgreSQL backup failed for database '${POSTGRES_DB}'"
        rm -f "${BACKUP_FILE}"
    fi
fi

# 2. Check for MongoDB Container
if docker ps --format '{{.Names}}' | grep -q "^${MONGO_CONTAINER}$"; then
    log_info "Detected active MongoDB container: ${MONGO_CONTAINER}"
    BACKUP_FILE="${BACKUP_ROOT}/insurflow_mongo_${TIMESTAMP}.archive.gz"
    
    log_info "Executing mongodump for database '${MONGO_DB}'..."
    if docker exec "${MONGO_CONTAINER}" mongodump --db "${MONGO_DB}" --archive --gzip > "${BACKUP_FILE}"; then
        BACKUP_SIZE="$(du -h "${BACKUP_FILE}" | cut -f1)"
        log_success "MongoDB backup completed successfully: ${BACKUP_FILE} (Size: ${BACKUP_SIZE})"
        BACKUP_SUCCESS=1
    else
        log_error "MongoDB backup failed for database '${MONGO_DB}'"
        rm -f "${BACKUP_FILE}"
    fi
fi

# ── Fallback Check ───────────────────────────────────────────────────────────
if [ $BACKUP_SUCCESS -eq 0 ]; then
    log_error "No running database container found matching '${POSTGRES_CONTAINER}' or '${MONGO_CONTAINER}'."
    log_error "Please verify your docker compose services are running via 'docker compose ps'."
    exit 1
fi

# ── Retention Policy Cleanup ─────────────────────────────────────────────────
log_info "Enforcing retention policy: pruning backups older than ${RETENTION_DAYS} days..."
DELETED_COUNT=0
while IFS= read -r file; do
    if [ -n "$file" ]; then
        log_warn "Deleting expired backup: ${file}"
        rm -f "$file"
        DELETED_COUNT=$((DELETED_COUNT + 1))
    fi
done < <(find "${BACKUP_ROOT}" -type f \( -name "*.sql.gz" -o -name "*.archive.gz" -o -name "*.gz" \) -mtime "+${RETENTION_DAYS}")

log_info "Retention cleanup completed. Pruned ${DELETED_COUNT} old backup file(s)."
log_success "InsurFlow Database Backup process completed successfully!"
exit 0
