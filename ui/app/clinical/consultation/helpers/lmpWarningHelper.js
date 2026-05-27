'use strict';

angular.module('bahmni.clinical')
    .factory('lmpWarningHelper', ['$timeout', '$q', 'patientService', 'clinicalAppConfigService', function ($timeout, $q, patientService, clinicalAppConfigService) {
        return {
            initializeLmpWarning: function (scope) {
                if (!scope) {
                    return;
                }

                var patient = scope.patient || (scope.consultation && scope.consultation.patient);

                if (!patient || !patient.uuid) {
                    return;
                }

                if (patient.gender !== 'F') {
                    scope.showLmpWarning = false;
                    return;
                }

                var lmpConfig = clinicalAppConfigService.getLmpWarningConfig();
                var conceptName = lmpConfig.conceptName || Bahmni.Common.Constants.lmpConceptName;
                var thresholdDays = lmpConfig.thresholdDays || Bahmni.Clinical.Constants.lmpWarningThresholdDays;

                patientService.getPatientLmpData(patient.uuid, conceptName).then(function (lmpData) {
                    if (lmpData && lmpData.daysSinceLmp > thresholdDays) {
                        scope.showLmpWarning = true;
                        scope.lmpWarning = {
                            daysSinceLmp: lmpData.daysSinceLmp
                        };
                    } else {
                        scope.showLmpWarning = false;
                    }

                    if (!scope.$$phase) {
                        scope.$apply();
                    }
                }).catch(function () {
                    scope.showLmpWarning = false;
                    if (!scope.$$phase) {
                        scope.$apply();
                    }
                });
            },

            dismissLmpWarning: function (scope) {
                scope.showLmpWarning = false;
            }
        };
    }]);
