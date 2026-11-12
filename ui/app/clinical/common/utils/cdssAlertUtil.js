'use strict';

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
                return drug.uuid === coding.code || drug.name === coding.display;
            });
        });
    },
    hasActiveAlerts: function (alerts) {
        return (alerts || []).some(function (alert) {
            return alert.isActive;
        });
    }
};
