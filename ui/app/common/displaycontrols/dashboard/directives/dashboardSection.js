'use strict';

angular.module('bahmni.common.displaycontrol.dashboard')

    .directive('dashboardSection', function () {
        var controller = function ($scope) {
            $scope.$on("no-data-present-event", function () {
                $scope.section.isDataAvailable = !$scope.section.hideEmptyDisplayControl;
            });
            if ($scope.section.type === "ordersV2") {
                $scope.ordersData = $scope.section;
            }
        };
        return {
            restrict: 'E',
            controller: controller,
            templateUrl: "../common/displaycontrols/dashboard/views/dashboardSection.html"
        };
    });
