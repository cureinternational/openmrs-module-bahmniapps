'use strict';

angular.module('bahmni.clinical')
    .controller('PatientDashboardController', ['$scope', 'clinicalAppConfigService', 'clinicalDashboardConfig', 'printer',
        '$state', 'spinner', 'visitSummary', 'appService', '$stateParams', 'diseaseTemplateService', 'patientContext', '$location', '$filter', 'formDraftService', '$rootScope',
        function ($scope, clinicalAppConfigService, clinicalDashboardConfig, printer,
            $state, spinner, visitSummary, appService, $stateParams, diseaseTemplateService, patientContext, $location, $filter, formDraftService, $rootScope) {
            $scope.enableFormDraftFeature = appService.getAppDescriptor().getConfigValue('enableFormDraftFeature');
            $scope.patient = patientContext.patient;
            $scope.activeVisit = $scope.visitHistory.activeVisit;
            $scope.activeVisitData = {};
            $scope.obsIgnoreList = clinicalAppConfigService.getObsIgnoreList();
            $scope.clinicalDashboardConfig = clinicalDashboardConfig;
            $scope.visitSummary = visitSummary;
            $scope.enrollment = $stateParams.enrollment;
            $scope.isDashboardPrinting = false;

            // Draft timestamp initialization - can be removed after API integration
            var getDraftTimestamp = function () {
                var now = new Date();
                return {
                    date: $filter('date')(now, 'dd MMM yyyy'),
                    time: $filter('date')(now, 'hh:mm a')
                };
            };
            var draftTimestampObj = getDraftTimestamp();
            $scope.formDraft = {
                draftDate: draftTimestampObj.date,
                draftTime: draftTimestampObj.time,
                hasDrafts: false
            };
            var programConfig = appService.getAppDescriptor().getConfigValue("program") || {};
            $state.discardChanges = false;

            $scope.ipdDashboard = {
                hostData: {
                    patientId: $stateParams.patientUuid,
                    forDate: new Date().toUTCString()
                }
            };

            $scope.alergyData = {
                name: 'Customised for me!!!'
            };

            $scope.alergyApi = {
                callback: function () {
                    alert("We have a full fledged problem");
                }
            };

            $scope.stateChange = function () {
                return $state.current.name === 'patient.dashboard.show';
            };

            $scope.resumeDraft = function () {
                // COMMENTED OUT: Resume draft functionality disabled
                // // Set flag to auto-populate draft data in ConceptSetPageController
                // $rootScope.resumeDraftOnLoad = true;
                // // Navigate to last consultation tab if available, otherwise go to dashboard
                // if ($scope.lastConsultationTabUrl && $scope.lastConsultationTabUrl.url) {
                //     $location.url($scope.lastConsultationTabUrl.url);
                // } else {
                //     // Default to observations with all observation templates
                //     $state.go('patient.dashboard.show.observations', {
                //         patientUuid: $stateParams.patientUuid,
                //         encounterUuid: $scope.consultation.encounterUuid,
                //         conceptSetGroupName: 'All Observation Templates'
                //     });
                // }
            };

            // Check for existing drafts on page load
            var checkForExistingDrafts = function () {
                var patientUuid = $scope.patient ? $scope.patient.uuid : null;
                var providerUuid = $rootScope.currentProvider ? $rootScope.currentProvider.uuid : null;

                if (patientUuid && providerUuid) {
                    formDraftService.getDraft(patientUuid, providerUuid).then(
                        function (response) {
                            if (response.data && response.data.uuid && !response.data.markedAsSaved) {
                                $scope.formDraft.hasDrafts = true;
                                // Store draft data for use in ConceptSetPageController
                                $rootScope.draftData = response.data;
                                // Pre-populate draft timestamp if draft exists
                                var serverTimestamp = response.data.timestamp;
                                if (serverTimestamp) {
                                    var draftDate = $filter('date')(new Date(serverTimestamp), 'dd MMM yyyy');
                                    var draftTime = $filter('date')(new Date(serverTimestamp), 'hh:mm a');
                                    $scope.formDraft.draftDate = draftDate;
                                    $scope.formDraft.draftTime = draftTime;
                                }
                            } else {
                                $scope.formDraft.hasDrafts = false;
                                $scope.formDraft.draftDate = null;
                                $scope.formDraft.draftTime = null;
                                $rootScope.draftData = null;
                            }
                        },
                        function () {
                            // No draft found - suppress error silently
                            $scope.formDraft.hasDrafts = false;
                            $scope.formDraft.draftDate = null;
                            $scope.formDraft.draftTime = null;
                            $rootScope.draftData = null;
                        }
                    ).catch(function () {
                        // Catch any unhandled errors to prevent error notifications
                        $scope.formDraft.hasDrafts = false;
                        $scope.formDraft.draftDate = null;
                        $scope.formDraft.draftTime = null;
                        $rootScope.draftData = null;
                    });
                }
            };

            var cleanUpListenerSwitchDashboard = $scope.$on("event:switchDashboard", function (event, dashboard) {
                $scope.init(dashboard);
            });

            // Listen for draft saved event from ConceptSetPageController
            var cleanUpListenerDraftSaved = $scope.$on("draft:saved", function (event, draftTimestamp) {
                if (draftTimestamp && typeof draftTimestamp === 'object') {
                    $scope.formDraft.hasDrafts = true;
                    $scope.formDraft.draftDate = draftTimestamp.draftDate;
                    $scope.formDraft.draftTime = draftTimestamp.draftTime;
                }
            });

            // Listen for successful save and clear draft
            var cleanUpListenerSaveSuccessful = $scope.$on("event:save-successful", function () {
                // Clear draft state when consultation is saved
                $scope.formDraft.hasDrafts = false;
                $scope.formDraft.draftDate = null;
                $scope.formDraft.draftTime = null;
            });

            var cleanUpListenerPrintDashboard = $scope.$on("event:printDashboard", function (event, tab) {
                var printScope = $scope.$new();
                printScope.isDashboardPrinting = true;
                printScope.tabBeingPrinted = tab || clinicalDashboardConfig.currentTab;
                var dashboardModel = Bahmni.Common.DisplayControl.Dashboard.create(printScope.tabBeingPrinted, $filter);
                spinner.forPromise(diseaseTemplateService.getLatestDiseaseTemplates(
                    $stateParams.patientUuid,
                    clinicalDashboardConfig.getDiseaseTemplateSections(printScope.tabBeingPrinted),
                    null,
                    null
                ).then(function (diseaseTemplate) {
                    printScope.diseaseTemplates = diseaseTemplate;
                    printScope.sectionGroups = dashboardModel.getSections(printScope.diseaseTemplates);
                    printer.printFromScope('dashboard/views/dashboardPrint.html', printScope);
                }));
            });

            $scope.$on("$destroy", function () {
                cleanUpListenerSwitchDashboard();
                cleanUpListenerDraftSaved();
                cleanUpListenerSaveSuccessful();
                cleanUpListenerPrintDashboard();
            });

            var addTabNameToParams = function (board) {
                $location.search('currentTab', board.translationKey).replace();
            };

            var getCurrentTab = function () {
                var currentTabKey = $location.search().currentTab;
                var currentTab = $state.current.dashboard;
                if (currentTabKey) {
                    currentTab = _.find(clinicalDashboardConfig.visibleTabs, function (tab) {
                        return tab.translationKey === currentTabKey;
                    });
                }
                return (currentTab != undefined ? currentTab : clinicalDashboardConfig.currentTab);
            };

            $scope.init = function (dashboard) {
                dashboard.startDate = null;
                dashboard.endDate = null;
                if (programConfig.showDetailsWithinDateRange) {
                    dashboard.startDate = $stateParams.dateEnrolled;
                    dashboard.endDate = $stateParams.dateCompleted;
                }
                $state.current.dashboard = dashboard;
                clinicalDashboardConfig.switchTab(dashboard);
                addTabNameToParams(dashboard);
                var dashboardModel = Bahmni.Common.DisplayControl.Dashboard.create(dashboard, $filter);
                diseaseTemplateService.getLatestDiseaseTemplates(
                    $stateParams.patientUuid, clinicalDashboardConfig.getDiseaseTemplateSections(), dashboard.startDate, dashboard.endDate).then(function (diseaseTemplate) {
                        $scope.diseaseTemplates = diseaseTemplate;
                        $scope.sectionGroups = dashboardModel.getSections($scope.diseaseTemplates);
                    });
                $scope.currentDashboardTemplateUrl = $state.current.views['dashboard-content'] ?
                    $state.current.views['dashboard-content'].templateUrl : $state.current.views['dashboard-content'];
            };

            $scope.init(getCurrentTab());
            checkForExistingDrafts();
        }]);
