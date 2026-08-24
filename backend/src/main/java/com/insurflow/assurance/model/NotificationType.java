package com.insurflow.assurance.model;

/**
 * Types of automated notification alerts.
 */
public enum NotificationType {
    ECHEANCE_RENOUVELLEMENT,
    QUITTANCE_IMPAYEE,
    SINISTRE_ALERTE,
    FRAUDE_IA,

    // Legacy values for backwards compatibility
    RENEWAL_30_DAYS,
    RENEWAL_15_DAYS
}
