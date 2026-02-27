'use strict';

angular.module('bahmni.common.displaycontrol.dashboard')

    .directive('dashboardSection', function () {
        var controller = function ($scope, $rootScope) {
            $scope.$on("no-data-present-event", function () {
                $scope.section.isDataAvailable = !$scope.section.hideEmptyDisplayControl;
            });
            if ($scope.section.type === "ordersV2") {
                const orderType = $rootScope.orderTypeData.filter(function (item) {
                    return item.display === $scope.section.name;
                });
                $scope.ordersData = {...($scope.ordersData || {}), ...$scope.section};
                if (orderType.length > 0) {
                    $scope.ordersData.orderType = orderType[0];
                }
            }
        };
        return {
            restrict: 'E',
            controller: controller,
            templateUrl: "../common/displaycontrols/dashboard/views/dashboardSection.html"
        };
    });
