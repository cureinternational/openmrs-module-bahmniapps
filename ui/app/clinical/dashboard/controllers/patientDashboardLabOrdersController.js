'use strict';

angular.module('bahmni.clinical')
    .controller('PatientDashboardLabOrdersController', ['$scope', '$stateParams', '$rootScope', '$q', 'visitActionsService', 'allergyService', 'observationsService', 'orderService',
        function ($scope, $stateParams, $rootScope, $q, visitActionsService, allergyService, observationsService, orderService) {
            var labOrdersConfigParams = $scope.dashboard.getSectionByType("labOrders") || {};
            var patientParams = {"patientUuid": $scope.patient.uuid};
            $scope.dashboardConfig = {};
            $scope.expandedViewConfig = {};
            _.extend($scope.dashboardConfig, labOrdersConfigParams.dashboardConfig || {}, patientParams);
            _.extend($scope.expandedViewConfig, labOrdersConfigParams.expandedViewConfig || {}, patientParams);
            $scope.dialogData = {
                "patient": $scope.patient,
                "expandedViewConfig": $scope.expandedViewConfig
            };

            var enhancedPatient = angular.copy($scope.patient);

            // Resolve patient phone number from available phone fields
            if (enhancedPatient.mobilePhone) {
                enhancedPatient.phoneNumber = enhancedPatient.mobilePhone.value;
            } else if (enhancedPatient.residentialPhone) {
                enhancedPatient.phoneNumber = enhancedPatient.residentialPhone.value;
            } else if (enhancedPatient.workPhone) {
                enhancedPatient.phoneNumber = enhancedPatient.workPhone.value;
            } else if (enhancedPatient.otherPhone) {
                enhancedPatient.phoneNumber = enhancedPatient.otherPhone.value;
            }

            // Fetch patient allergies
            allergyService.fetchAndProcessAllergies($scope.patient.uuid).then(function (allergies) {
                enhancedPatient.allergies = allergies;
            }).catch(function () {
                enhancedPatient.allergies = '';
            });

            // Fetch latest patient weight across all visits
            var weightPromise = observationsService.fetch(
                $scope.patient.uuid,
                [Bahmni.Common.Constants.weightConceptName],
                'latest',
                null,
                null, null, null, null
            ).then(function (response) {
                if (response.data && response.data.length > 0) {
                    enhancedPatient.weight = response.data[0].value;
                    console.log('[LabResults] Weight fetched:', enhancedPatient.weight);
                } else {
                    console.warn('[LabResults] No weight observation found for patient');
                }
            }).catch(function (error) {
                console.error('[LabResults] Weight fetch failed:', error);
            });

            // Build print config from facility location and static defaults
            var labResultsPrintConfig = labOrdersConfigParams.labResultsPrint || {};
            labResultsPrintConfig.locationName = $rootScope.facilityLocation.name;
            labResultsPrintConfig.logo = '/bahmni/images/cureLogoFull.png';
            labResultsPrintConfig.title = 'Lab Results';
            labResultsPrintConfig.locationAddress = $rootScope.facilityLocation.address5;

            // Map orderer and selected provider attributes into a flat provider object
            var buildProvider = function (orderer, attributes) {
                var provider = {name: orderer.display, uuid: orderer.uuid, fullName: '', title: '', licenceNumber: ''};
                if (attributes) {
                    attributes.forEach(function (attr) {
                        var display = attr.attributeType.display.trim().toLowerCase();
                        if (display === 'provider full name') {
                            provider.fullName = attr.value;
                        } else if (display === 'provider title') {
                            provider.title = attr.value;
                        } else if (display === 'medical licence number') {
                            provider.licenceNumber = attr.value;
                        }
                    });
                }
                return provider;
            };

            // Fetch ordering provider details from Order API
            var fetchProvider = function (orderUuid) {
                console.log('[LabResults] Fetching provider for orderUuid:', orderUuid);
                return orderService.getOrderByUuid(orderUuid, 'custom:(orderer:(uuid,display,attributes:(value,attributeType:(display))))').then(function (response) {
                    var orderer = response.data.orderer;
                    if (orderer && orderer.uuid) {
                        var provider = buildProvider(orderer, orderer.attributes);
                        console.log('[LabResults] Provider built:', provider);
                        return provider;
                    }
                    console.warn('[LabResults] No orderer found in order response, falling back to currentProvider');
                    return $rootScope.currentProvider || {};
                }).catch(function (error) {
                    console.error('[LabResults] Provider fetch failed, falling back to currentProvider:', error);
                    return $rootScope.currentProvider || {};
                });
            };

            // Wait for weight and provider, then trigger PDF download
            $scope.$on("event:downloadLabResultsFromDashboard", function (event, labOrderResults, accessionDateTime, accessionUuid) {
                var firstResult = labOrderResults[0].isPanel ? labOrderResults[0].tests[0] : labOrderResults[0];
                var orderUuid = firstResult.orderUuid;
                console.log('[LabResults] Download triggered, orderUuid:', orderUuid);
                var providerPromise = orderUuid ? fetchProvider(orderUuid) : $q.when($rootScope.currentProvider || {});
                $q.all([weightPromise, providerPromise]).then(function (results) {
                    var provider = results[1];
                    console.log('[LabResults] Printing with patient:', enhancedPatient, 'provider:', provider);
                    var printConfig = angular.copy(labResultsPrintConfig);
                    printConfig.provider = provider;
                    visitActionsService.downloadLabResults(enhancedPatient, labOrderResults, accessionDateTime, accessionUuid, printConfig);
                });
            });
        }]);
