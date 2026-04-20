'use strict';

angular.module('bahmni.clinical')
    .controller('ConceptSetPageController', ['$scope', '$rootScope', '$stateParams', 'conceptSetService',
        'clinicalAppConfigService', 'messagingService', 'configurations', '$state', 'spinner',
        'contextChangeHandler', '$q', '$translate', 'formService', '$timeout', '$filter', 'appService', 'formDraftService',
        function ($scope, $rootScope, $stateParams, conceptSetService,
                  clinicalAppConfigService, messagingService, configurations, $state, spinner,
              contextChangeHandler, $q, $translate, formService, $timeout, $filter, appService, formDraftService) {
            $scope.consultation.selectedObsTemplate = $scope.consultation.selectedObsTemplate || [];
            $scope.allTemplates = $scope.allTemplates || [];
            $scope.scrollingEnabled = false;
            $scope.enableFormDraftFeature = appService.getAppDescriptor().getConfigValue('enableFormDraftFeature');
            var extensions = clinicalAppConfigService.getAllConceptSetExtensions($stateParams.conceptSetGroupName);
            var configs = clinicalAppConfigService.getAllConceptsConfig();
            var visitType = configurations.encounterConfig().getVisitTypeByUuid($scope.consultation.visitTypeUuid);
            $scope.context = {visitType: visitType, patient: $scope.patient};
            var numberOfLevels = 2;
            var fields = ['uuid', 'name:(name,display)', 'names:(uuid,conceptNameType,name)'];
            var customRepresentation = Bahmni.ConceptSet.CustomRepresentationBuilder.build(fields, 'setMembers', numberOfLevels);
            var allConceptSections = [];

            var init = function () {
                if (!($scope.allTemplates !== undefined && $scope.allTemplates.length > 0)) {
                    spinner.forPromise(conceptSetService.getConcept({
                        name: "All Observation Templates",
                        v: "custom:" + customRepresentation
                    }).then(function (response) {
                        var allTemplates = response.data.results[0].setMembers;
                        createConceptSections(allTemplates);
                        if ($state.params.programUuid) {
                            showOnlyTemplatesFilledInProgram();
                        }

                        // Retrieve Form Details
                        if (!($scope.consultation.observationForms !== undefined && $scope.consultation.observationForms.length > 0)) {
                            spinner.forPromise(formService.getFormList($scope.consultation.encounterUuid)
                                .then(function (response) {
                                    $scope.consultation.observationForms = getObservationForms(response.data);
                                    concatObservationForms();
                                })
                            );
                        } else {
                            concatObservationForms();
                        }
                    }));
                }
            };
            var templatesReadyForPopulation = false;

            var concatObservationForms = function () {
                $scope.allTemplates = getSelectedObsTemplate(allConceptSections);
                $scope.uniqueTemplates = _.uniqBy($scope.allTemplates, 'label');
                $scope.allTemplates = $scope.allTemplates.concat($scope.consultation.observationForms);
                if ($scope.consultation.selectedObsTemplate.length == 0) {
                    initializeDefaultTemplates();
                    if ($scope.consultation.observations && $scope.consultation.observations.length > 0) {
                        addTemplatesInSavedOrder();
                    }
                    var templateToBeOpened = getLastVisitedTemplate() ||
                        _.first($scope.consultation.selectedObsTemplate);

                    if (templateToBeOpened) {
                        openTemplate(templateToBeOpened);
                    }
                }
                $timeout(setupDirtyTracking, 0);
                templatesReadyForPopulation = true;

                // Trigger auto-populate if data is already available
                // COMMENTED OUT: Resume draft functionality disabled
                // if ($rootScope.resumeDraftOnLoad && $rootScope.draftData && $rootScope.draftData.formData) {
                //     $timeout(function () {
                //         populateFormWithDraftData($rootScope.draftData.formData);
                //         dirtyTrackingState.cleanState = getObsValues();
                //         $scope.formDraft.isDirty = false;
                //         messagingService.showMessage("info", $translate.instant("DRAFT_RESUMED_KEY"));
                //         $rootScope.resumeDraftOnLoad = false;
                //     }, 100);
                // }
            };

            var addTemplatesInSavedOrder = function () {
                var templatePreference = JSON.parse(localStorage.getItem("templatePreference"));
                if (templatePreference && templatePreference.patientUuid === $scope.patient.uuid &&
                    !_.isEmpty(templatePreference.templates) && $rootScope.currentProvider.uuid === templatePreference.providerUuid) {
                    insertInSavedOrder(templatePreference);
                } else {
                    insertInDefaultOrder();
                }
            };

            var insertInSavedOrder = function (templatePreference) {
                var templateNames = templatePreference.templates;
                _.each(templateNames, function (templateName) {
                    var foundTemplates = _.filter($scope.allTemplates, function (allTemplate) {
                        return allTemplate.conceptName === templateName;
                    });
                    if (foundTemplates.length > 0) {
                        _.each(foundTemplates, function (template) {
                            if (!_.isEmpty(template.observations)) {
                                insertTemplate(template);
                            }
                        });
                    }
                });
            };

            var insertInDefaultOrder = function () {
                _.each($scope.allTemplates, function (template) {
                    if (template.observations.length > 0) {
                        insertTemplate(template);
                    }
                });
            };

            var insertTemplate = function (template) {
                if (template && !(template.isDefault() || template.alwaysShow)) {
                    $scope.consultation.selectedObsTemplate.push(template);
                }
            };

            var getLastVisitedTemplate = function () {
                return _.find($scope.consultation.selectedObsTemplate, function (template) {
                    return template.id === $scope.consultation.lastvisited;
                });
            };

            var openTemplate = function (template) {
                template.isOpen = true;
                template.isLoaded = true;
                template.klass = "active";
            };

            var initializeDefaultTemplates = function () {
                $scope.consultation.selectedObsTemplate = _.filter($scope.allTemplates, function (template) {
                    return template.isDefault() || template.alwaysShow;
                });
            };

            $scope.filterTemplates = function () {
                $scope.uniqueTemplates = _.uniqBy($scope.allTemplates, 'label');
                if ($scope.consultation.searchParameter) {
                    $scope.uniqueTemplates = _.filter($scope.uniqueTemplates, function (template) {
                        return _.includes(template.label.toLowerCase(), $scope.consultation.searchParameter.toLowerCase());
                    });
                }
                return $scope.uniqueTemplates;
            };

            var showOnlyTemplatesFilledInProgram = function () {
                spinner.forPromise(conceptSetService.getObsTemplatesForProgram($state.params.programUuid).success(function (data) {
                    if (data.results.length > 0 && data.results[0].mappings.length > 0) {
                        _.map(allConceptSections, function (conceptSection) {
                            conceptSection.isAdded = false;
                            conceptSection.alwaysShow = false;
                        });

                        _.map(data.results[0].mappings, function (template) {
                            var matchedTemplate = _.find(allConceptSections, {uuid: template.uuid});
                            if (matchedTemplate) {
                                matchedTemplate.alwaysShow = true;
                            }
                        });
                    }
                }));
            };

            var createConceptSections = function (allTemplates) {
                _.map(allTemplates, function (template) {
                    var conceptSetExtension = _.find(extensions, function (extension) {
                        return extension.extensionParams.conceptName === template.name.name;
                    }) || {};
                    var conceptSetConfig = configs[template.name.name] || {};
                    var observationsForTemplate = getObservationsForTemplate(template);
                    if (observationsForTemplate && observationsForTemplate.length > 0) {
                        _.each(observationsForTemplate, function (observation) {
                            allConceptSections.push(new Bahmni.ConceptSet.ConceptSetSection(conceptSetExtension, $rootScope.currentUser, conceptSetConfig, [observation], template));
                        });
                    } else {
                        allConceptSections.push(new Bahmni.ConceptSet.ConceptSetSection(conceptSetExtension, $rootScope.currentUser, conceptSetConfig, [], template));
                    }
                });
            };

            var collectObservationsFromConceptSets = function () {
                $scope.consultation.observations = [];
                _.each($scope.consultation.selectedObsTemplate, function (conceptSetSection) {
                    if (conceptSetSection.observations[0]) {
                        $scope.consultation.observations.push(conceptSetSection.observations[0]);
                    }
                });
            };

            var getObservationsForTemplate = function (template) {
                return _.filter($scope.consultation.observations, function (observation) {
                    return !observation.formFieldPath && observation.concept.uuid === template.uuid;
                });
            };

            var getSelectedObsTemplate = function (allConceptSections) {
                return allConceptSections.filter(function (conceptSet) {
                    if (conceptSet.isAvailable($scope.context)) {
                        return true;
                    }
                });
            };

            $scope.stopAutoClose = function ($event) {
                $event.stopPropagation();
            };

            $scope.addTemplate = function (template) {
                $scope.scrollingEnabled = true;
                $scope.showTemplatesList = false;
                var index = _.findLastIndex($scope.consultation.selectedObsTemplate, function (consultationTemplate) {
                    return consultationTemplate.label == template.label;
                });

                if (index != -1 && $scope.consultation.selectedObsTemplate[index].allowAddMore) {
                    var clonedObj = template.clone();
                    clonedObj.klass = "active";
                    $scope.consultation.selectedObsTemplate.splice(index + 1, 0, clonedObj);
                } else {
                    template.toggle();
                    template.klass = "active";
                    if (index > -1) {
                        $scope.consultation.selectedObsTemplate[index] = template;
                    } else {
                        $scope.consultation.selectedObsTemplate.push(template);
                    }
                }
                $scope.consultation.searchParameter = "";
                messagingService.showMessage("info", $translate.instant("CLINICAL_TEMPLATE_ADDED_SUCCESS_KEY", {label: template.label}));
            };

            $scope.getNormalized = function (conceptName) {
                return conceptName.replace(/['\.\s\(\)\/,\\]+/g, "_");
            };

            $scope.consultation.preSaveHandler.register("collectObservationsFromConceptSets", collectObservationsFromConceptSets);
            // Form Code :: Start
            var getObservationForms = function (observationsForms) {
                var forms = [];
                var observations = $scope.consultation.observations || [];
                _.each(observationsForms, function (observationForm) {
                    var extension = _.find(extensions, function (ext) {
                        return (ext.extensionParams.formName && (observationForm.formName === ext.extensionParams.formName || observationForm.name === ext.extensionParams.formName));
                    }) || {};
                    var formUuid = observationForm.formUuid || observationForm.uuid;
                    var formName = observationForm.name || observationForm.formName;
                    var formVersion = observationForm.version || observationForm.formVersion;
                    var privileges = observationForm.privileges;
                    var labels = observationForm.nameTranslation ? JSON.parse(observationForm.nameTranslation) : [];
                    var label = formName;
                    if (labels.length > 0) {
                        var locale = localStorage.getItem("NG_TRANSLATE_LANG_KEY") || "en";
                        var currentLabel = labels.find(function (label) {
                            return label.locale === locale;
                        });
                        if (currentLabel) { label = currentLabel.display; }
                    }
                    if ($scope.isFormEditableByTheUser(observationForm)) {
                        var newForm = new Bahmni.ObservationForm(formUuid, $rootScope.currentUser,
                                                                   formName, formVersion, observations, label, extension);
                        newForm.privileges = privileges;
                        forms.push(newForm);
                    }
                });

                return forms;
            };
            $scope.isFormEditableByTheUser = function (form) {
                var result = false;
                if ((typeof form.privileges != 'undefined') && (form.privileges != null) && (form.privileges.length != 0)) {
                    form.privileges.forEach(function (formPrivilege) {
                        _.find($rootScope.currentUser.privileges, function (privilege) {
                            if (formPrivilege.privilegeName === privilege.name) {
                                if (formPrivilege.editable) {
                                    result = formPrivilege.editable;
                                } else {
                                    if (formPrivilege.viewable) {
                                        result = true;
                                    }
                                }
                            }
                        });
                    });
                } else { result = true; }
                return result;
            };

            $scope.formDraft = {
                draftDate: null,
                draftTime: null,
                showSpinner: false,
                statusMessage: null,
                statusParams: {},
                statusError: false,
                isDirty: false,
                hasDrafts: false
            };

            var dirtyTrackingState = {
                cleanState: null,
                initialized: false,
                watchDeregister: null,
                draftResumeWatchDeregister: null,
                suppressTracking: false,
                suppressionUnsuppressPromise: null,
                suppressionWindowMs: 1500,
                form2SyncListenerRegistered: false,
                form2InputListener: null,
                form2ChangeListener: null
            };

            var clearDraftStatus = function () {
                $scope.formDraft.hasDrafts = false;
                $scope.formDraft.draftDate = null;
                $scope.formDraft.draftTime = null;
                $scope.formDraft.statusMessage = null;
                $scope.formDraft.statusParams = {};
                $scope.formDraft.statusError = false;
            };

            var getTemplateObservationsForDirtyTracking = function (template) {
                // For form2 forms (with component), prefer component's observations
                if (template.component && angular.isFunction(template.component.getValue)) {
                    var formValue = template.component.getValue() || {};
                    if (formValue.observations && formValue.observations.length > 0) {
                        return formValue.observations;
                    }
                    // If component has no observations, fall through to template.observations
                }
                // For standard forms or when component observations are empty, use template observations
                return template.observations || [];
            };

            var collectObsValues = function (obs, values) {
                if (!obs) {
                    return;
                }
                if (obs.isMultiSelect) {
                    var selectedKeys = _.keys(obs.selectedObs || {}).filter(function (k) {
                        return k.indexOf('$') !== 0;
                    });
                    if (selectedKeys.length > 0) {
                        values.push(obs.selectedObs);
                    }
                    return;
                }
                if (obs.groupMembers && obs.groupMembers.length > 0) {
                    _.each(obs.groupMembers, function (member) {
                        collectObsValues(member, values);
                    });
                    return;
                }
                if (obs.value !== null && obs.value !== undefined) {
                    values.push(obs.value);
                }
            };

            var getObsValues = function () {
                var values = [];
                if ($scope.consultation.selectedObsTemplate) {
                    _.each($scope.consultation.selectedObsTemplate, function (template) {
                        var observations = getTemplateObservationsForDirtyTracking(template);
                        if (observations.length > 0) {
                            _.each(observations, function (obs) {
                                collectObsValues(obs, values);
                            });
                        }
                    });
                }
                return angular.toJson(values);
            };

            var syncForm2Observations = function () {
                if ($scope.consultation.observationForms) {
                    _.each($scope.consultation.observationForms, function (form) {
                        if (form.component && angular.isFunction(form.component.getValue)) {
                            var formValue = form.component.getValue() || {};
                            if (formValue.observations) {
                                var newObsJson = angular.toJson(formValue.observations);
                                var oldObsJson = angular.toJson(form.observations || []);
                                // Only update if observations actually changed to avoid infinite digest loops
                                if (newObsJson !== oldObsJson) {
                                    form.observations = formValue.observations;
                                }
                            }
                        }
                    });
                }
            };

            var form2SyncEvents = ['input', 'change', 'keyup', 'click'];

            var registerForm2SyncListeners = function () {
                if (dirtyTrackingState.form2SyncListenerRegistered) {
                    return;
                }

                var doc = window.document;
                if (!doc || !doc.addEventListener) {
                    return;
                }

                var syncOnForm2Interaction = function () {
                    $scope.$evalAsync(syncForm2Observations);
                };

                dirtyTrackingState.form2InputListener = syncOnForm2Interaction;
                dirtyTrackingState.form2ChangeListener = syncOnForm2Interaction;
                _.each(form2SyncEvents, function (eventName) {
                    doc.addEventListener(eventName, syncOnForm2Interaction, true);
                });
                dirtyTrackingState.form2SyncListenerRegistered = true;
            };

            var unregisterForm2SyncListeners = function () {
                var doc = window.document;
                if (dirtyTrackingState.form2SyncListenerRegistered && doc && doc.removeEventListener) {
                    _.each(form2SyncEvents, function (eventName) {
                        doc.removeEventListener(eventName, dirtyTrackingState.form2InputListener, true);
                    });
                }
                dirtyTrackingState.form2SyncListenerRegistered = false;
                dirtyTrackingState.form2InputListener = null;
                dirtyTrackingState.form2ChangeListener = null;
            };

            var setupDirtyTracking = function () {
                if (dirtyTrackingState.initialized) {
                    return;
                }
                dirtyTrackingState.initialized = true;
                dirtyTrackingState.cleanState = getObsValues();

                dirtyTrackingState.watchDeregister = $scope.$watch(getObsValues, function (newVal, oldVal) {
                    if (newVal !== oldVal) {
                        if (dirtyTrackingState.suppressTracking) {
                            dirtyTrackingState.cleanState = newVal;
                            $scope.formDraft.isDirty = false;
                            return;
                        }
                        $scope.formDraft.isDirty = newVal !== dirtyTrackingState.cleanState;
                    }
                });

                // Sync form2 values when users interact with React controls.
                registerForm2SyncListeners();
            };

            var suppressDirtyTrackingDuringSaveRefresh = function () {
                dirtyTrackingState.suppressTracking = true;
                $scope.formDraft.isDirty = false;
                dirtyTrackingState.cleanState = getObsValues();
                if (dirtyTrackingState.suppressionUnsuppressPromise) {
                    $timeout.cancel(dirtyTrackingState.suppressionUnsuppressPromise);
                }
                dirtyTrackingState.suppressionUnsuppressPromise = $timeout(function () {
                    dirtyTrackingState.cleanState = getObsValues();
                    $scope.formDraft.isDirty = false;
                    dirtyTrackingState.suppressTracking = false;
                    dirtyTrackingState.suppressionUnsuppressPromise = null;
                }, dirtyTrackingState.suppressionWindowMs);
            };

            var resetDirtyTracking = function (restartTracking) {
                if (dirtyTrackingState.watchDeregister) {
                    dirtyTrackingState.watchDeregister();
                    dirtyTrackingState.watchDeregister = null;
                }
                unregisterForm2SyncListeners();
                dirtyTrackingState.initialized = false;
                dirtyTrackingState.suppressTracking = false;
                if (dirtyTrackingState.suppressionUnsuppressPromise) {
                    $timeout.cancel(dirtyTrackingState.suppressionUnsuppressPromise);
                    dirtyTrackingState.suppressionUnsuppressPromise = null;
                }
                $scope.formDraft.isDirty = false;
                if (restartTracking !== false) {
                    $timeout(setupDirtyTracking, 0);
                }
            };

            var serializeFormData = function () {
                var observations = [];
                if ($scope.consultation.selectedObsTemplate) {
                    _.each($scope.consultation.selectedObsTemplate, function (template) {
                        var templateObs = getTemplateObservationsForDirtyTracking(template);
                        observations = observations.concat(templateObs);
                    });
                }
                return angular.toJson(observations);
            };

            var saveFormDraft = function () {
                $scope.formDraft.statusError = false;
                $scope.formDraft.showSpinner = true;

                var patientUuid = $scope.patient ? $scope.patient.uuid : null;
                var providerUuid = $rootScope.currentProvider ? $rootScope.currentProvider.uuid : null;
                var formData = serializeFormData();

                formDraftService.saveDraft(patientUuid, providerUuid, formData).then(function (response) {
                    var serverTimestamp = response.data.timestamp;
                    var savedDate = new Date(serverTimestamp);
                    var draftDate = $filter('date')(savedDate, 'dd MMM yyyy');
                    var draftTime = $filter('date')(savedDate, 'hh:mm a');

                    $scope.formDraft.statusMessage = 'SAVED_AS_DRAFT_KEY';
                    $scope.formDraft.statusParams = {draftDate: draftDate, draftTime: draftTime};
                    $scope.formDraft.draftDate = draftDate;
                    $scope.formDraft.draftTime = draftTime;
                    $scope.formDraft.isDirty = false;
                    $scope.formDraft.hasDrafts = true;
                    dirtyTrackingState.cleanState = getObsValues();
                    $rootScope.$broadcast('draft:saved', {draftDate: draftDate, draftTime: draftTime});
                }, function () {
                    $scope.formDraft.statusMessage = 'CHANGES_NOT_SAVED_KEY';
                    $scope.formDraft.statusError = true;
                }).finally(function () {
                    $scope.formDraft.showSpinner = false;
                });
            };

            $scope.saveAsDraft = saveFormDraft;

            var draftContextWatchDeregister = null;

            // Check for existing drafts when patient and provider context is available
            var checkForExistingDrafts = function () {
                var patientUuid = $scope.patient ? $scope.patient.uuid : null;
                var providerUuid = $rootScope.currentProvider ? $rootScope.currentProvider.uuid : null;

                if (!(patientUuid && providerUuid)) {
                    return false;
                }

                formDraftService.getDraft(patientUuid, providerUuid).then(
                    function (response) {
                        if (response.data && response.data.uuid && !response.data.markedAsSaved) {
                            $scope.formDraft.hasDrafts = true;
                            // Store draft data in rootScope for use across controllers
                            $rootScope.draftData = response.data;
                            // Pre-populate draft timestamp if draft exists
                            var serverTimestamp = response.data.timestamp;
                            if (serverTimestamp) {
                                var draftDate = $filter('date')(new Date(serverTimestamp), 'dd MMM yyyy');
                                var draftTime = $filter('date')(new Date(serverTimestamp), 'hh:mm a');
                                $scope.formDraft.draftDate = draftDate;
                                $scope.formDraft.draftTime = draftTime;
                                $scope.formDraft.statusMessage = 'SAVED_AS_DRAFT_KEY';
                                $scope.formDraft.statusParams = {draftDate: draftDate, draftTime: draftTime};
                            }
                        } else {
                            $rootScope.draftData = null;
                            clearDraftStatus();
                        }
                    },
                    function () {
                        // No draft found - suppress error silently
                        $rootScope.draftData = null;
                        clearDraftStatus();
                    }
                ).catch(function () {
                    // Catch any unhandled errors to prevent error notifications
                    $rootScope.draftData = null;
                    clearDraftStatus();
                });

                return true;
            };

            var registerDraftContextWatcher = function () {
                if (draftContextWatchDeregister) {
                    return;
                }

                draftContextWatchDeregister = $scope.$watchGroup([
                    function () {
                        return $scope.patient && $scope.patient.uuid;
                    },
                    function () {
                        return $rootScope.currentProvider && $rootScope.currentProvider.uuid;
                    }
                ], function (newValues) {
                    if (newValues[0] && newValues[1]) {
                        checkForExistingDrafts();
                        draftContextWatchDeregister();
                        draftContextWatchDeregister = null;
                    }
                });
            };

            // Recursively populate observation values from draft
            var populateObservationValues = function (templateObs, draftObs) {
                if (!templateObs || !draftObs) {
                    return;
                }

                // Copy simple value properties
                if (draftObs.value !== undefined && draftObs.value !== null) {
                    templateObs.value = draftObs.value;
                }

                if (draftObs.comment) {
                    templateObs.comment = draftObs.comment;
                }

                // Handle multi-select observations
                if (draftObs.isMultiSelect && draftObs.selectedObs) {
                    templateObs.selectedObs = angular.copy(draftObs.selectedObs);
                }

                // Handle group member observations - recursively populate values
                if (draftObs.groupMembers && draftObs.groupMembers.length > 0 &&
                    templateObs.groupMembers && templateObs.groupMembers.length > 0) {
                    var draftGroupMap = {};
                    // Build a map of draft group members by concept UUID
                    _.each(draftObs.groupMembers, function (draftMember) {
                        if (draftMember.concept && draftMember.concept.uuid) {
                            draftGroupMap[draftMember.concept.uuid] = draftMember;
                        }
                    });
                    // Populate template group members with values from draft
                    _.each(templateObs.groupMembers, function (templateMember) {
                        var conceptUuid = templateMember.concept ? templateMember.concept.uuid : null;
                        if (conceptUuid && draftGroupMap[conceptUuid]) {
                            populateObservationValues(templateMember, draftGroupMap[conceptUuid]);
                        }
                    });
                }
            };

            // Populate form fields with draft data
            var populateFormWithDraftData = function (draftFormData) {
                try {
                    var draftedObservations = JSON.parse(draftFormData);
                    if (!draftedObservations || draftedObservations.length === 0) {
                        return;
                    }

                    // Create a map of concept UUIDs to drafted observations for quick lookup
                    var draftMap = {};
                    _.each(draftedObservations, function (obs) {
                        if (obs.concept && obs.concept.uuid) {
                            if (!draftMap[obs.concept.uuid]) {
                                draftMap[obs.concept.uuid] = [];
                            }
                            draftMap[obs.concept.uuid].push(obs);
                        }
                    });

                    // Iterate through templates and populate them with draft data
                    _.each($scope.consultation.selectedObsTemplate, function (template) {
                        if (template.observations && template.observations.length > 0) {
                            _.each(template.observations, function (templateObs) {
                                var conceptUuid = templateObs.concept ? templateObs.concept.uuid : null;
                                if (conceptUuid && draftMap[conceptUuid]) {
                                    var draftObs = draftMap[conceptUuid][0]; // Get first matching draft observation
                                    // Populate values without replacing the observation object
                                    populateObservationValues(templateObs, draftObs);
                                }
                            });
                        }
                    });

                    $scope.formDraft.isDraftResumed = true;
                } catch (e) {
                    console.error('Error parsing draft data:', e);
                    $scope.formDraft.statusMessage = 'ERROR_LOADING_DRAFT_KEY';
                    $scope.formDraft.statusError = true;
                }
            };

            // Disable Save as Draft button after successful form save
            var resetDraftStateAfterSave = function () {
                resetDirtyTracking();
                suppressDirtyTrackingDuringSaveRefresh();
                clearDraftStatus();
            };
            $scope.consultation.postSaveHandler.register("resetDraftStateAfterSave", resetDraftStateAfterSave);

            // Watch for draft data becoming available if resuming and templates are ready
            // COMMENTED OUT: Resume draft functionality disabled
            // dirtyTrackingState.draftResumeWatchDeregister = $scope.$watch(function () {
            //     return $rootScope.draftData && $rootScope.resumeDraftOnLoad;
            // }, function (newVal) {
            //     if (newVal && templatesReadyForPopulation && $rootScope.resumeDraftOnLoad) {
            //         // Data and templates are both ready, populate form
            //         $timeout(function () {
            //             if ($rootScope.draftData && $rootScope.draftData.formData) {
            //                 populateFormWithDraftData($rootScope.draftData.formData);
            //                 dirtyTrackingState.cleanState = getObsValues();
            //                 $scope.formDraft.isDirty = false;
            //                 messagingService.showMessage("info", $translate.instant("DRAFT_RESUMED_KEY"));
            //                 $rootScope.resumeDraftOnLoad = false;
            //                 // Stop watching after successful population
            //                 if (dirtyTrackingState.draftResumeWatchDeregister) {
            //                     dirtyTrackingState.draftResumeWatchDeregister();
            //                     dirtyTrackingState.draftResumeWatchDeregister = null;
            //                 }
            //             }
            //         }, 50);
            //     }
            // });

            // Listen for successful save and disable Save as Draft button
            var saveSuccessfulListener = $rootScope.$on('event:save-successful', function () {
                // Disable the Save as Draft button
                resetDirtyTracking();
                suppressDirtyTrackingDuringSaveRefresh();
                $scope.formDraft.showSpinner = false;
                clearDraftStatus();
            });

            var saveStartedListener = $rootScope.$on('event:save-started', function () {
                $scope.formDraft.showSpinner = false;
                clearDraftStatus();
            });

            $scope.$on('$destroy', function () {
                if (dirtyTrackingState.watchDeregister) {
                    dirtyTrackingState.watchDeregister();
                }
                if (dirtyTrackingState.draftResumeWatchDeregister) {
                    dirtyTrackingState.draftResumeWatchDeregister();
                }
                if (dirtyTrackingState.suppressionUnsuppressPromise) {
                    $timeout.cancel(dirtyTrackingState.suppressionUnsuppressPromise);
                }
                unregisterForm2SyncListeners();
                if (draftContextWatchDeregister) {
                    draftContextWatchDeregister();
                    draftContextWatchDeregister = null;
                }
                saveSuccessfulListener();
                saveStartedListener();
            });

            init();
            // COMMENTED OUT: Resume draft functionality disabled - now always check for drafts
            // if (resuming draft from banner, don't wait for checkForExistingDrafts)
            // The data should already be in $rootScope from the dashboard controller
            // Otherwise, check for drafts immediately or when context becomes available
            // if (!$rootScope.resumeDraftOnLoad) {
            if (!checkForExistingDrafts()) {
                registerDraftContextWatcher();
            }
            // }
        }]);
