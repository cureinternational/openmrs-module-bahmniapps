'use strict';

angular.module('bahmni.clinical')
    .factory('lmpWarningHelper', ['patientService', 'clinicalAppConfigService', function (patientService, clinicalAppConfigService) {
        var lmpDataCache = {}; // Cache: { patientUuid: lmpData }
        var currentPatientUuid = null;
        var config = clinicalAppConfigService.getLmpWarningConfig();

        var updateBanner = function (scope, lmpData, config) {
            scope.showLmpWarning = lmpData;

            if (scope.showLmpWarning) {
                scope.lmpWarning = { daysSinceLmp: lmpData.daysSinceLmp };
                const lmpRecordedDate = new Intl.DateTimeFormat(config.dateFormatLocale, {
                    day: config.dateDayFormat,
                    month: config.dateMonthFormat,
                    year: config.dateYearFormat
                }).format(new Date(lmpData.lmpDate));
                scope.lmpRecordedDate = lmpRecordedDate;
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

                currentPatientUuid = patient.uuid;

                scope.thresholdDays = config.thresholdDays;
                if (!config.conceptName || !scope.thresholdDays) {
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

            listenForSaveEvents: function (scope) {
                scope.$parent.$on('event:changes-saved', function () {
                    if (currentPatientUuid) {
                        delete lmpDataCache[currentPatientUuid];
                    }
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
