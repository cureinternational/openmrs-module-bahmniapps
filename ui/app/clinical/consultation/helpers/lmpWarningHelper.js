'use strict';

angular.module('bahmni.clinical')
    .factory('lmpWarningHelper', ['$q', 'patientService', 'clinicalAppConfigService', function ($q, patientService, clinicalAppConfigService) {
        var getResolvedLmpConfig = function () {
            var config = clinicalAppConfigService.getLmpWarningConfig();
            var conceptName = config.conceptName;
            var thresholdDays = config.thresholdDays;

            if (!conceptName || !thresholdDays) {
                return null;
            }

            return {
                conceptName: conceptName,
                thresholdDays: thresholdDays
            };
        };

        var applyScope = function (scope) {
            if (!scope.$$phase) {
                scope.$apply();
            }
        };

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

                var lmpConfig = getResolvedLmpConfig();
                if (!lmpConfig) {
                    scope.showLmpWarning = false;
                    return;
                }

                patientService.getPatientLmpData(patient.uuid, lmpConfig.conceptName).then(function (lmpData) {
                    if (lmpData && lmpData.daysSinceLmp > lmpConfig.thresholdDays) {
                        scope.showLmpWarning = true;
                        scope.lmpWarning = {
                            daysSinceLmp: lmpData.daysSinceLmp
                        };
                    } else {
                        scope.showLmpWarning = false;
                    }

                    applyScope(scope);
                }).catch(function () {
                    scope.showLmpWarning = false;
                    applyScope(scope);
                });
            },

            dismissLmpWarning: function (scope) {
                scope.showLmpWarning = false;
            }
        };
    }]);
