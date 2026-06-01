'use strict';

angular.module('bahmni.clinical')
    .factory('lmpWarningHelper', ['patientService', 'clinicalAppConfigService', function (patientService, clinicalAppConfigService) {
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

                patientService.getPatientLmpData(patient.uuid, config.conceptName).then(function (lmpData) {
                    if (lmpData && lmpData.daysSinceLmp > config.thresholdDays) {
                        scope.showLmpWarning = true;
                        scope.lmpWarning = {
                            daysSinceLmp: lmpData.daysSinceLmp
                        };
                    } else {
                        scope.showLmpWarning = false;
                    }
                }).catch(function () {
                    scope.showLmpWarning = false;
                });
            },

            dismissLmpWarning: function (scope) {
                scope.showLmpWarning = false;
            }
        };
    }]);
