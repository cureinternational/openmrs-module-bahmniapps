'use strict';

angular.module('bahmni.common.config')
    .directive('showIfPrivilege', ['$rootScope', function ($rootScope) {
        return {
            scope: {
                showIfPrivilege: "@"
            },
            link: function (scope, element) {
                var privileges = scope.showIfPrivilege.split(',');
                var requiredPrivilege = false;
                if ($rootScope.currentUser) {
                    var allTypesPrivileges = _.map($rootScope.currentUser.privileges, _.property('name'));
                    var intersect = _.intersectionWith(allTypesPrivileges, privileges, _.isEqual);
                    intersect.length > 0 ? requiredPrivilege = true : requiredPrivilege = false;
                }
                if (!requiredPrivilege) {
                    element.hide();
                }
            }
        };
    }])
    .directive('showIfHasPrivilege', ['$rootScope', function ($rootScope) {
        return {
            restrict: 'A',
            scope: false,
            link: function (scope, element, attrs) {
                var privilege = attrs.showIfHasPrivilege;
                var hasPrivilege = $rootScope.currentUser
                    ? _.some($rootScope.currentUser.privileges, {name: privilege})
                    : false;
                if (!hasPrivilege) {
                    element.hide();
                }
            }
        };
    }]);

