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

            function parseBedNumber (bedNumber) {
                if (bedNumber === null || angular.isUndefined(bedNumber)) {
                    return { prefix: '', num: Number.MAX_SAFE_INTEGER, str: '', type: 'null' };
                }
                var bedStr = bedNumber.toString();
                if (bedStr === '') {
                    return { prefix: '', num: Number.MAX_SAFE_INTEGER, str: '', type: 'empty' };
                }

                var lowerCaseStr = bedStr.toLowerCase();

                var numericMatch = lowerCaseStr.match(/^(\d+)(.*)$/);
                if (numericMatch && !isNaN(parseInt(numericMatch[1], 10))) {
                    return {
                        prefix: '', // No prefix for purely numeric start
                        num: parseInt(numericMatch[1], 10),
                        str: lowerCaseStr,
                        type: 'numeric'
                    };
                }

                var alphanumericMatch = lowerCaseStr.match(/^([a-z\s\-_#]+)(\d+)$/);
                if (alphanumericMatch) {
                    return {
                        prefix: alphanumericMatch[1],
                        num: parseInt(alphanumericMatch[2], 10),
                        str: lowerCaseStr,
                        type: 'alphanumeric'
                    };
                }

                return {
                    prefix: lowerCaseStr,
                    num: Number.MAX_SAFE_INTEGER,
                    str: lowerCaseStr,
                    type: 'nonNumericString'
                };
            }

            $scope.getSortedTableDetails = function () {
                return ($scope.tableDetails || []).slice().sort(function (a, b) {
                    // Sort directly by Bed number
                    var aBed = parseBedNumber(a['Bed']);
                    var bBed = parseBedNumber(b['Bed']);

                    const typeOrder = { 'numeric': 1, 'alphanumeric': 2, 'nonNumericString': 3, 'empty': 4, 'null': 5 };

                    if (aBed.type !== bBed.type) {
                        return typeOrder[aBed.type] - typeOrder[bBed.type];
                    }

                    switch (aBed.type) {
                    case 'numeric':
                    case 'alphanumeric':
                        if (aBed.prefix !== bBed.prefix) {
                            return aBed.prefix.localeCompare(bBed.prefix);
                        }
                        if (aBed.num !== bBed.num) {
                            return aBed.num - bBed.num;
                        }
                        return aBed.str.localeCompare(bBed.str);
                    case 'nonNumericString':
                        return aBed.str.localeCompare(bBed.str);
                    case 'empty':
                    case 'null':
                        return 0;
                    }

                    if (a['bed_id'] && b['bed_id'] && a['bed_id'] !== b['bed_id']) {
                        return Number(a['bed_id']) - Number(b['bed_id']);
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
