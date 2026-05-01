'use strict';

angular.module('bahmni.common.services')
    .factory('autoSaveService', ['$interval', '$rootScope', 'appService', 'formDraftService', 'formDirtyStateService', function ($interval, $rootScope, appService, formDraftService, formDirtyStateService) {
        var observationFormState = {
            isDirty: false,
            formDraft: null,
            patient: null,
            provider: null,
            selectedObsTemplate: null,
            saveCallback: null
        };

        var autoSaveIntervalPromise = null;

        var getAutoSaveIntervalMs = function () {
            var seconds = appService.getAppDescriptor().getConfigValue('autoSaveIntervalSeconds');
            if (seconds && !isNaN(seconds) && seconds > 0) {
                return seconds * 1000;
            }
            return 15 * 60 * 1000;
        };

        var triggerAutoSave = function () {
            if (!observationFormState.isDirty) {
                stopAutoSaveInterval();
                return;
            }

            if (observationFormState.saveCallback) {
                observationFormState.saveCallback();
            } else {
                performDirectSave();
            }
        };

        var performDirectSave = function () {
            if (!observationFormState.patient || !observationFormState.provider) {
                return;
            }
            var patientUuid = observationFormState.patient.uuid;
            var providerUuid = observationFormState.provider.uuid;
            var formData = formDirtyStateService.serializeFormData(observationFormState.selectedObsTemplate);

            formDraftService.saveDraft(patientUuid, providerUuid, formData).then(function (response) {
                observationFormState.isDirty = false;
            });
        };

        var startAutoSaveInterval = function () {
            if (!autoSaveIntervalPromise) {
                var intervalMs = getAutoSaveIntervalMs();
                autoSaveIntervalPromise = $interval(triggerAutoSave, intervalMs);
            }
        };

        var stopAutoSaveInterval = function () {
            if (autoSaveIntervalPromise) {
                $interval.cancel(autoSaveIntervalPromise);
                autoSaveIntervalPromise = null;
            }
        };

        var service = {
            registerObservationForm: function (formDraftScope, patient, provider, selectedObsTemplate, saveCallback) {
                observationFormState.formDraft = formDraftScope;
                observationFormState.patient = patient;
                observationFormState.provider = provider;
                observationFormState.selectedObsTemplate = selectedObsTemplate;
                observationFormState.saveCallback = saveCallback;
            },

            unregisterObservationForm: function () {
                // Only clear the callback - keep the form state so background saves can still happen
                observationFormState.saveCallback = null;
            },

            markObservationsAsDirty: function (isDirty) {
                var wasClean = !observationFormState.isDirty;
                observationFormState.isDirty = isDirty;

                // Start interval when form becomes dirty (transition from clean to dirty)
                if (isDirty && wasClean) {
                    startAutoSaveInterval();
                }

                // Stop interval when form becomes clean (transition from dirty to clean)
                if (!isDirty && !wasClean) {
                    stopAutoSaveInterval();
                }
            },

            getObservationFormState: function () {
                return observationFormState;
            },

            stopAutoSave: function () {
                observationFormState.isDirty = false;
                stopAutoSaveInterval();
            },

            stopAutoSaveIntervalForTesting: function () {
                stopAutoSaveInterval();
            },

            startAutoSaveIntervalForTesting: function () {
                startAutoSaveInterval();
            }
        };

        return service;
    }]);
