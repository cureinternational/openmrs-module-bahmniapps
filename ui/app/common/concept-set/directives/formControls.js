'use strict';

angular.module('bahmni.common.conceptSet')
    .directive('formControls', ['formService', 'spinner', '$timeout', '$translate', '$state', 'messagingService', 'appService', '$http', 'configurationService',
        function (formService, spinner, $timeout, $translate, $state, messagingService, appService, $http, configurationService) {
            var loadedFormDetails = {};
            var loadedFormTranslations = {};

            var controller = function ($scope) {
                var formUuid = $scope.form.formUuid;
                var formVersion = $scope.form.formVersion;
                var formName = $scope.form.formName;
                var collapse = $scope.form.collapseInnerSections && $scope.form.collapseInnerSections.value;
                var validateForm = $scope.validateForm || false;
                var locale = $translate.use();
                var allowedDomains = [];

                var unmountExistingForm = function () {
                    var containerEl = document.getElementById(formUuid);
                    if (containerEl && typeof unMountForm === 'function') {
                        unMountForm(containerEl);
                    }
                };

                var renderForm = function (formDetails, formTranslations) {
                    $scope.form.needsReRender = false;
                    unmountExistingForm();
                    var collapse = $scope.form.collapseInnerSections && $scope.form.collapseInnerSections.value;
                    $scope.form.component = renderWithControls(formDetails, $scope.form.observations,
                        formUuid, collapse, $scope.patient, validateForm, locale, formTranslations,
                        allowedDomains);
                };

                var loadForm = function () {
                    if (!loadedFormDetails[formUuid]) {
                        spinner.forPromise(formService.getFormDetail(formUuid, { v: "custom:(resources:(value))" })
                            .then(function (response) {
                                var formDetailsAsString = _.get(response, 'data.resources[0].value');
                                if (formDetailsAsString) {
                                    var formDetails = JSON.parse(formDetailsAsString);
                                    formDetails.version = formVersion;
                                    loadedFormDetails[formUuid] = formDetails;
                                    var formParams = { formName: formName, formVersion: formVersion, locale: locale, formUuid: formUuid };
                                    $scope.form.events = formDetails.events;
                                    spinner.forPromise(formService.getFormTranslations(formDetails.translationsUrl, formParams)
                                        .then(function (response) {
                                            var formTranslations = !_.isEmpty(response.data) ? response.data[0] : {};
                                            loadedFormTranslations[formUuid] = formTranslations;
                                            renderForm(formDetails, formTranslations);
                                        }, function () {
                                            var formTranslations = {};
                                            loadedFormTranslations[formUuid] = formTranslations;
                                            renderForm(formDetails, formTranslations);
                                        })
                                    );
                                }
                            })
                        );
                    } else {
                        $timeout(function () {
                            $scope.form.events = loadedFormDetails[formUuid].events;
                            renderForm(loadedFormDetails[formUuid], loadedFormTranslations[formUuid]);
                        }, 0, false);
                    }
                };

                configurationService.getConfigurations(['hyperlinkAllowedDomains'])
                    .then(function (configurations) {
                        var domainsData = configurations.hyperlinkAllowedDomains || '';
                        allowedDomains = (domainsData || '').split(',').map(function (d) { return d.trim(); }).filter(function (d) { return d; });
                        loadForm();
                    })
                    .catch(function (error) {
                        console.error('Failed to fetch hyperlink allowed domains:', error);
                        loadForm();
                    });

                $scope.$watch('form.collapseInnerSections', function () {
                    if (loadedFormDetails[formUuid]) {
                        renderForm(loadedFormDetails[formUuid], loadedFormTranslations[formUuid]);
                    }
                }, true);

                $scope.$watch('form.observations', function (newVal, oldVal) {
                    if (newVal !== oldVal && loadedFormDetails[formUuid] && $scope.form.needsReRender) {
                        renderForm(loadedFormDetails[formUuid], loadedFormTranslations[formUuid]);
                    }
                });

                $scope.$on('$destroy', function () {
                    $scope.form.needsReRender = false;
                    unmountExistingForm();
                    if ($scope.$parent.consultation && $scope.$parent.consultation.observationForms) {
                        if ($scope.form.component) {
                            var formObservations = $scope.form.component.getValue();
                            $scope.form.observations = formObservations.observations;
                            var hasError = formObservations.errors;
                            if (!_.isEmpty(hasError)) {
                                $scope.form.isValid = false;
                            }
                        }
                    }
                });
                function checkGroupMembers (formObservation, consultationObservation) {
                    var isGroupMemberChanged = [];
                    if (formObservation.groupMembers && formObservation.groupMembers.length > 0 && consultationObservation.groupMembers && consultationObservation.groupMembers.length > 0) {
                        for (var formGroupIndex = 0; formGroupIndex < formObservation.groupMembers.length; formGroupIndex++) {
                            var formGroupMember = formObservation.groupMembers[formGroupIndex];
                            for (var consultationGroupIndex = 0; consultationGroupIndex < consultationObservation.groupMembers.length; consultationGroupIndex++) {
                                var consultationGroupMember = consultationObservation.groupMembers[consultationGroupIndex];
                                (formGroupMember.value && formGroupMember.value.uuid && consultationGroupMember.value && consultationGroupMember.value.uuid) ?
                                isGroupMemberChanged[formGroupIndex] = (consultationGroupMember.value.uuid === formGroupMember.value.uuid) ? false : true :
                                isGroupMemberChanged[formGroupIndex] = (consultationGroupMember.value === formGroupMember.value || (formGroupMember.value && consultationGroupMember.value === formGroupMember.value.toString())) ? false : true;
                                if (!isGroupMemberChanged[formGroupIndex]) {
                                    break;
                                }
                            }
                        }
                        return isGroupMemberChanged.includes(true) ? true : false;
                    } else {
                        if (formObservation.value && formObservation.value.uuid && consultationObservation.value && consultationObservation.value.uuid) {
                            return (consultationObservation.value.uuid === formObservation.value.uuid) ? false : true;
                        } else {
                            return !((consultationObservation.value === formObservation.value || (formObservation.value && consultationObservation.value === formObservation.value.toString())));
                        }
                    }
                }

                function checkFormChanges ($scope) {
                    var isChanged = [];
                    $scope.dirtyForm = false;
                    if ($scope.form.observations.length > 0) {
                        if ($scope.$parent.consultation.observations.length === 0) {
                            return true;
                        }
                        for (var formIndex = 0; formIndex < $scope.form.observations.length; formIndex++) {
                            var formObservation = $scope.form.observations[formIndex];
                            for (var consultationIndex = 0; consultationIndex < $scope.$parent.consultation.observations.length; consultationIndex++) {
                                var consultationObservation = $scope.$parent.consultation.observations[consultationIndex];
                                isChanged[formIndex] = checkGroupMembers(formObservation, consultationObservation);
                                if (!isChanged[formIndex]) {
                                    break;
                                }
                            }
                        }
                        return isChanged.includes(true);
                    }
                }

                $scope.$on('$stateChangeStart', function (event, next, current) {
                    var uuid = $state.params.patientUuid;
                    var currentUuid = current.patientUuid;
                    if ($scope.form.component) {
                        var formObservations = $scope.form.component.getValue();
                        $scope.form.observations = formObservations.observations;
                    }
                    if (!$scope.changesSaved) {
                        $scope.dirtyForm = checkFormChanges($scope);
                    }
                    $state.newPatientUuid = currentUuid;
                    next.url.includes("/patient/search") ? $state.isPatientSearch = true : $state.isPatientSearch = false;
                    var isNavigating = next.url.includes("/patient/search") || (uuid !== currentUuid);
                    $state.dirtyConsultationForm = $state.discardChanges ? false : $scope.dirtyForm;
                    if (isNavigating && $state.dirtyConsultationForm) {
                        messagingService.showMessage('alert', "{{'ALERT_MESSAGE_ON_EXIT' | translate }}");
                        $state.reviewButtonFocused = true;
                        event.preventDefault();
                        spinner.hide(next.spinnerToken);
                    }
                });

                $scope.$on("event:changes-saved", function () {
                    $scope.changesSaved = true;
                    $scope.dirtyForm = false;
                });
            };

            return {
                restrict: 'E',
                scope: {
                    form: "=",
                    patient: "=",
                    validateForm: "="
                },
                controller: controller
            };
        }]);
