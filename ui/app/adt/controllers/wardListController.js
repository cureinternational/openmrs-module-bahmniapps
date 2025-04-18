'use strict';

angular.module('bahmni.adt')
    .controller('WardListController', ['$scope', 'queryService', 'spinner', '$q', '$window', '$stateParams', 'appService', '$rootScope',
        function ($scope, queryService, spinner, $q, $window, $stateParams, appService, $rootScope) {
            const enableIPDFeature = appService.getAppDescriptor().getConfigValue('enableIPDFeature');
            $scope.gotoPatientDashboard = function (patientUuid, visitUuid) {
                var options = $.extend({}, $stateParams);
                $.extend(options, { patientUuid: patientUuid, visitUuid: visitUuid || null });
                if (enableIPDFeature) {
                    $window.location = appService.getAppDescriptor().formatUrl(Bahmni.ADT.Constants.mfeIpdDashboard, options, true);
                } else {
                    $window.location = appService.getAppDescriptor().formatUrl(Bahmni.ADT.Constants.ipdDashboard, options, true);
                }
            };

            $scope.searchText = '';
            $scope.iconAttributeConfig = appService.getAppDescriptor().getConfigValue('iconAttribute') || {};
            $scope.searchTextFilter = function (row) {
                var searchText = $scope.searchText;
                if (!searchText) {
                    return true;
                }
                searchText = searchText.toLowerCase();
                const excludedKeys = ["hiddenAttributes", "$$hashKey", "Diagnosis"];
                var attributes = Object.keys(row).filter(function (key) {
                    return !excludedKeys.includes(key);
                });

                return attributes.some(function (attribute) {
                    const rowValue = row[attribute].toString();
                    return rowValue && rowValue.toLowerCase().includes(searchText);
                });
            };

            // Utility to extract numeric and string parts for sorting
            function parseBedNumber (bedNumber) {
                if (!bedNumber) return {num: Number.MAX_SAFE_INTEGER, str: ''};
                var match = bedNumber.match(/(\d+)|([a-zA-Z]+)/g);
                if (!match) return {num: Number.MAX_SAFE_INTEGER, str: bedNumber};
                var num = parseInt(match[0], 10);
                return {
                    num: isNaN(num) ? Number.MAX_SAFE_INTEGER : num,
                    str: bedNumber.toString().toLowerCase()
                };
            }

            $scope.getSortedTableDetails = function () {
                return ($scope.tableDetails || []).slice().sort(function (a, b) {
                    // 1. Sort by numeric part of bed_number (Bed)
                    var aBed = parseBedNumber(a['Bed']);
                    var bBed = parseBedNumber(b['Bed']);
                    if (aBed.num !== bBed.num) {
                        return aBed.num - bBed.num;
                    }
                    // 2. If numeric part is same, sort by string part (e.g., 101A, 101B)
                    if (aBed.str !== bBed.str) {
                        return aBed.str.localeCompare(bBed.str);
                    }
                    // 3. Fallback to bed_id if available
                    if (a['bed_id'] && b['bed_id'] && a['bed_id'] !== b['bed_id']) {
                        return a['bed_id'] - b['bed_id'];
                    }
                    // 4. Fallback to Ward name
                    if (a['Ward'] && b['Ward'] && a['Ward'] !== b['Ward']) {
                        return ('' + a['Ward']).localeCompare('' + b['Ward']);
                    }
                    return 0;
                });
            };

            var getTableDetails = function () {
                var params = {
                    q: "emrapi.sqlGet.wardsListDetails",
                    v: "full",
                    location_name: $scope.ward.ward.name
                };
                return queryService.getResponseFromQuery(params).then(function (response) {
                    $scope.tableDetails = Bahmni.ADT.WardDetails.create(response.data, $rootScope.diagnosisStatus, $scope.iconAttributeConfig.attrName);
                    $scope.tableHeadings = $scope.tableDetails.length > 0 ? Object.keys($scope.tableDetails[0]).filter(function (name) { return name !== $scope.iconAttributeConfig.attrName; }) : [];
                });
            };
            spinner.forPromise(getTableDetails());
        }]);
