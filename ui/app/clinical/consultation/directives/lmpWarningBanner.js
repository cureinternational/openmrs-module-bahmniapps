'use strict';

angular.module('bahmni.clinical')
    .directive('lmpWarningBanner', ['lmpWarningHelper', function (lmpWarningHelper) {
        return {
            restrict: 'E',
            scope: true,
            templateUrl: 'consultation/views/lmpWarningBanner.html',
            controller: ['$scope', function ($scope) {
                lmpWarningHelper.initializeLmpWarning($scope);
                $scope.dismissLmpWarning = function () {
                    lmpWarningHelper.dismissLmpWarning($scope);
                };
            }]
        };
    }]);
