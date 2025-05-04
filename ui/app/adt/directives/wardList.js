'use strict';

angular.module('bahmni.adt')
    .directive('wardList', ['appService', '$stateParams', function (appService, $stateParams) {
        return {
            restrict: 'E',
            controller: 'WardListController',
            scope: {
                ward: "="
            },
            templateUrl: "../adt/views/wardList.html",
            link: function ($scope, element, attrs) {
                var configuredLink = appService.getAppDescriptor().getConfigValue('patientDashboardLink');
                $scope.patientDashboardLink = configuredLink || "../clinical/#/{{configName}}/patient/{{patientUuid}}/dashboard";

                $scope.getPatientDashboardURL = function (patientUuid) {
                    if (!patientUuid) {
                        return '#';
                    }

                    var configName = $scope.configName || $stateParams.configName || Bahmni.Common.Constants.defaultExtensionName || 'default';
                    var linkTemplate = $scope.patientDashboardLink;

                    if (typeof linkTemplate !== 'string' || !linkTemplate) {
                        return '#';
                    }

                    try {
                        return appService.getAppDescriptor().formatUrl(linkTemplate, {
                            'configName': configName,
                            'patientUuid': patientUuid
                        });
                    } catch (e) {
                        console.error("Error formatting patient dashboard URL for UUID: " + patientUuid, "Template:", linkTemplate, "Error:", e);
                        return '#';
                    }
                };
            }
        };
    }]);
