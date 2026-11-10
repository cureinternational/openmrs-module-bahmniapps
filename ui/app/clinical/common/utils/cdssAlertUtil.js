'use strict';

// CDSS returns one alert per SNOMED code, so sibling formulations sharing that code must match it too
var hasReferenceCode = function (drug, code) {
    return !!code && (drug.drugReferenceMaps || []).some(function (map) {
        var term = map && map.conceptReferenceTerm;
        return term && String(term.code).trim() === String(code).trim();
    });
};

Bahmni.Clinical.CdssAlertUtil = {
    matchesMedication: function (cdssAlert, drug) {
        if (!cdssAlert.referenceMedications || !drug) {
            return false;
        }
        return cdssAlert.referenceMedications.some(function (referenceMedication) {
            if (!referenceMedication || !referenceMedication.coding) {
                return false;
            }
            return referenceMedication.coding.some(function (coding) {
                if (!coding) {
                    return false;
                }
                return drug.uuid === coding.code || drug.name === coding.display || hasReferenceCode(drug, coding.code);
            });
        });
    },
    hasActiveAlerts: function (alerts) {
        return (alerts || []).some(function (alert) {
            return alert.isActive;
        });
    }
};
