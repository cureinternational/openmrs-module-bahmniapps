'use strict';

angular.module('bahmni.clinical')
    .controller('PatientDashboardLabOrdersController', ['$scope', '$stateParams', '$rootScope', 'visitActionsService', 'allergyService',
        function ($scope, $stateParams, $rootScope, visitActionsService, allergyService) {
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

            if (enhancedPatient.mobilePhone) {
                enhancedPatient.phoneNumber = enhancedPatient.mobilePhone.value;
            } else if (enhancedPatient.residentialPhon) {
                enhancedPatient.phoneNumber = enhancedPatient.residentialPhone.value;
            } else if ($scope.patient.workPhone) {
                enhancedPatient.phoneNumber = enhancedPatient.workPhone.value;
            } else if ($scope.patient.otherPhone) {
                enhancedPatient.phoneNumber = enhancedPatient.otherPhone.value;
            }
            // Fetch allergies and enhance patient object
            allergyService.fetchAndProcessAllergies($scope.patient.uuid).then(function (allergies) {
                enhancedPatient.allergies = allergies;
            }).catch(function (error) {
                console.warn('Failed to fetch allergies:', error);
                enhancedPatient.allergies = '';
            });

            var labResultsPrintConfig = labOrdersConfigParams.labResultsPrint || {};
            labResultsPrintConfig.locationName = $rootScope.facilityLocation.name;
            labResultsPrintConfig.logo = '/bahmni/images/cureLogoFull.png';
            labResultsPrintConfig.title = 'Lab Results';
            labResultsPrintConfig.locationAddress = $rootScope.facilityLocation.address5;

            $scope.$on("event:downloadLabResultsFromDashboard", function (event, labOrderResults, accessionDateTime, accessionUuid) {
                visitActionsService.downloadLabResults(enhancedPatient, labOrderResults, accessionDateTime, accessionUuid, labResultsPrintConfig);
            });
        }]);
