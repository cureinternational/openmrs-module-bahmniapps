'use strict';

angular.module('bahmni.registration')
    .controller('NavigationController', ['$scope', '$location', 'appService', '$sce',
        function ($scope, $location, appService, $sce) {
            $scope.extensions = appService.getAppDescriptor().getExtensions("org.bahmni.registration.navigation", "link");
            var path = $location.path();
            $scope.hasPrint = !(path === "/search" || path === "/patient/new");
            $scope.goTo = function (url) {
                $location.url(url);
            };

            $scope.htmlLabel = function (label) {
                return $sce.trustAsHtml(label);
            };

            $scope.sync = function () {
            };
        }]);
