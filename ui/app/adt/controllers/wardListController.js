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
            function parseBedNumber (bedNumber) { // Ensure space before parentheses
                // Use angular.isUndefined for checking undefined
                if (bedNumber === null || angular.isUndefined(bedNumber)) {
                    return { prefix: '', num: Number.MAX_SAFE_INTEGER, str: '', type: 'null' };
                }
                var bedStr = bedNumber.toString(); // Keep original case for string part if needed later, but compare lowercase
                if (bedStr === '') {
                    return { prefix: '', num: Number.MAX_SAFE_INTEGER, str: '', type: 'empty' };
                }

                var lowerCaseStr = bedStr.toLowerCase();

                // 1. Check for purely numeric (possibly with suffix)
                var numericMatch = lowerCaseStr.match(/^(\d+)(.*)$/);
                if (numericMatch && !isNaN(parseInt(numericMatch[1], 10))) {
                    // It starts with a number
                    return {
                        prefix: '', // No prefix for purely numeric start
                        num: parseInt(numericMatch[1], 10),
                        str: lowerCaseStr, // Full string for secondary sort if numbers are equal
                        type: 'numeric'
                    };
                }

                // 2. Check for alphanumeric pattern (e.g., A-1, B#10, CubeF-20)
                // Allows letters, hyphens, hashes at the start, followed by numbers
                var alphanumericMatch = lowerCaseStr.match(/^([a-z\s\-_#]+)(\d+)$/);
                if (alphanumericMatch) {
                    return {
                        prefix: alphanumericMatch[1], // The non-numeric part (e.g., "a-", "b#")
                        num: parseInt(alphanumericMatch[2], 10), // The numeric part
                        str: lowerCaseStr,
                        type: 'alphanumeric'
                    };
                }

                // 3. Otherwise, treat as a non-numeric string
                return {
                    prefix: lowerCaseStr, // Use the whole string as prefix for comparison
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

                    // Define sort order for types: numeric < alphanumeric < nonNumericString < empty < null
                    const typeOrder = { 'numeric': 1, 'alphanumeric': 2, 'nonNumericString': 3, 'empty': 4, 'null': 5 };

                    // 1. Sort: Bed Number (by type, then value)
                    if (aBed.type !== bBed.type) {
                        return typeOrder[aBed.type] - typeOrder[bBed.type];
                    }

                    // Types are the same, sort based on value within the type
                    switch (aBed.type) {
                    case 'numeric': // Set indentation to 20 spaces
                    case 'alphanumeric': // Set indentation to 20 spaces
                        // Compare prefix first (for alphanumeric, prefix is ''; for numeric)
                        if (aBed.prefix !== bBed.prefix) { // Set indentation to 24 spaces
                            return aBed.prefix.localeCompare(bBed.prefix);
                        }
                        // Prefixes are same, compare numeric part
                        if (aBed.num !== bBed.num) { // Set indentation to 24 spaces
                            return aBed.num - bBed.num;
                        }
                        // Numbers are same, compare full string as fallback (e.g., 10A vs 10B)
                        return aBed.str.localeCompare(bBed.str); // Set indentation to 24 spaces
                    case 'nonNumericString': // Set indentation to 20 spaces
                        // Simple string comparison for non-numeric strings
                        return aBed.str.localeCompare(bBed.str); // Set indentation to 24 spaces
                    case 'empty': // Set indentation to 20 spaces
                    case 'null': // Set indentation to 20 spaces
                        return 0; // Nulls/empties of the same type are equal // Set indentation to 24 spaces
                    }

                    // 2. Fallback: bed_id (if Bed number and type are identical)
                    if (a['bed_id'] && b['bed_id'] && a['bed_id'] !== b['bed_id']) {
                        // Ensure bed_id exists before comparing
                        return Number(a['bed_id']) - Number(b['bed_id']);
                    }

                    return 0; // Objects are identical for sorting purposes
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
