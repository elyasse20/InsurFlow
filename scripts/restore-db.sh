#!/bin/bash
# =============================================================================
# InsurFlow - Database Restore Helper Script (PostgreSQL & MongoDB)
# =============================================================================
# Usage:
#   ./scripts/restore-db.sh <path_to_backup_file>
#
# Examples:
#   ./scripts/restore-db.sh backups/db/insurflow_postgres_20260825_020000.sql.gz
#   ./scripts/restore-db.sh backups/db/insurflow_mongo_20260825_020000.archive.gz
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

# ── Input Validation ─────────────────────────────────────────────────────────
if [ $# -lt 1 ]; then
    log_error "Usage: $0 <path_to_backup_file>"
    echo "Examples:"
    echo "  $0 backups/db/insurflow_postgres_20260825_020000.sql.gz"
    echo "  $0 backups/db/insurflow_mongo_20260825_020000.archive.gz"
    exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "$BACKUP_FILE" ]; then
    log_error "Specified backup file does not exist: ${BACKUP_FILE}"
    exit 1
fi

# ── Base Directory & Environment ─────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

ENV_FILE="${PROJECT_ROOT}/.env"
if [ -f "$ENV_FILE" ]; then
    log_info "Loading configuration from ${ENV_FILE}"
    # shellcheck disable=SC1090
    set -a
    source "$ENV_FILE"
    set +a
fi

POSTGRES_CONTAINER="${POSTGRES_CONTAINER:-insurflow_postgres}"
POSTGRES_DB="${POSTGRES_DB:-insurflow}"
POSTGRES_USER="${POSTGRES_USER:-postgres}"

MONGO_CONTAINER="${MONGO_CONTAINER:-insurflow_mongodb}"
MONGO_DB="${MONGO_DB:-assurance}"

log_warn "================================================================"
log_warn " CAUTION: Database restore will overwrite existing target data!"
log_warn " Target Backup File: ${BACKUP_FILE}"
log_warn "================================================================"

read -r -p "Are you sure you want to proceed with the restore? (y/N): " CONFIRM
if [[ ! "$CONFIRM" =~ ^[Yy]$ ]]; then
    log_info "Database restore cancelled by user."
    exit 0
fi

# ── PostgreSQL Restore (.sql or .sql.gz) ─────────────────────────────────────
if [[ "$BACKUP_FILE" == *.sql.gz ]] || [[ "$BACKUP_FILE" == *.sql ]]; then
    log_info "Detected PostgreSQL dump file."
    
    if ! docker ps --format '{{.Names}}' | grep -q "^${POSTGRES_CONTAINER}$"; then
        log_error "PostgreSQL container '${POSTGRES_CONTAINER}' is not running."
        exit 1
    fi

    log_info "Restoring PostgreSQL database '${POSTGRES_DB}' inside '${POSTGRES_CONTAINER}'..."
    if [[ "$BACKUP_FILE" == *.sql.gz ]]; then
        gunzip -c "${BACKUP_FILE}" | docker exec -i "${POSTGRES_CONTAINER}" psql -U "${POSTGRES_USER}" -d "${POSTGRES_DB}"
    else
        docker exec -i "${POSTGRES_CONTAINER}" psql -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" < "${BACKUP_FILE}"
    fi

    log_success "PostgreSQL database restore completed successfully!"
    exit 0
fi

# ── MongoDB Restore (.archive.gz or .gz) ──────────────────────────────────────
if [[ "$BACKUP_FILE" == *.archive.gz ]] || [[ "$BACKUP_FILE" == *.gz ]]; then
    log_info "Detected MongoDB archive dump file."
    
    if ! docker ps --format '{{.Names}}' | grep -q "^${MONGO_CONTAINER}$"; then
        log_error "MongoDB container '${MONGO_CONTAINER}' is not running."
        exit 1
    fi

    log_info "Restoring MongoDB database '${MONGO_DB}' inside '${MONGO_CONTAINER}'..."
    docker exec -i "${MONGO_CONTAINER}" mongorestore --db "${MONGO_DB}" --archive --gzip --drop < "${BACKUP_FILE}"

    log_success "MongoDB database restore completed successfully!"
    exit 0
fi

log_error "Unsupported backup file format. Expected .sql.gz, .sql, or .archive.gz."
exit 1
