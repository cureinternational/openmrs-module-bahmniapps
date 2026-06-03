'use strict';

angular.module('bahmni.clinical')
    .factory('lmpWarningHelper', ['patientService', 'clinicalAppConfigService', function (patientService, clinicalAppConfigService) {
        var lmpDataCache = {}; // Cache: { patientUuid: lmpData }

        var updateBanner = function (scope, lmpData, config) {
            scope.showLmpWarning = lmpData && lmpData.daysSinceLmp > config.thresholdDays;
            if (scope.showLmpWarning) {
                scope.lmpWarning = { daysSinceLmp: lmpData.daysSinceLmp };
            }
        };

        return {
            initializeLmpWarning: function (scope) {
                if (!scope) {
                    return;
                }

                var patient = scope.patient || (scope.consultation && scope.consultation.patient);

                if (!patient || !patient.uuid || patient.gender !== 'F') {
                    scope.showLmpWarning = false;
                    return;
                }

                var config = clinicalAppConfigService.getLmpWarningConfig();
                if (!config.conceptName || !config.thresholdDays) {
                    scope.showLmpWarning = false;
                    return;
                }

                // Check cache first
                if (lmpDataCache[patient.uuid]) {
                    updateBanner(scope, lmpDataCache[patient.uuid], config);
                    return;
                }

                // If not in cache, fetch from API
                patientService.getPatientLmpData(patient.uuid, config.conceptName).then(function (lmpData) {
                    // Cache the result
                    lmpDataCache[patient.uuid] = lmpData;
                    updateBanner(scope, lmpData, config);
                }).catch(function () {
                    scope.showLmpWarning = false;
                });
            },

            dismissLmpWarning: function (scope) {
                scope.showLmpWarning = false;
            },

            clearCache: function (patientUuid) {
                if (patientUuid) {
                    delete lmpDataCache[patientUuid];
                } else {
                    lmpDataCache = {};
                }
            }
        };
    }]);
