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
                if (bedNumber === null || bedNumber === undefined) {
                    return { num: Number.MAX_SAFE_INTEGER, str: '', isNonNumericString: false, isEmpty: false, isNull: true };
                }
                if (bedNumber === '') {
                    return { num: Number.MAX_SAFE_INTEGER, str: '', isNonNumericString: false, isEmpty: true, isNull: false };
                }

                var bedStr = bedNumber.toString().toLowerCase();
                var match = bedStr.match(/^(\d+)/); // Match leading digits
                var numPart = match ? parseInt(match[1], 10) : Number.MAX_SAFE_INTEGER;
                // True if it doesn't start with a digit AND cannot be parsed as a number entirely (e.g., 'A', 'ZZZ')
                var isNonNumericString = !match && isNaN(parseInt(bedStr, 10));

                return {
                    num: numPart,
                    str: bedStr,
                    isNonNumericString: isNonNumericString,
                    isEmpty: false,
                    isNull: false
                };
            }

            $scope.getSortedTableDetails = function () {
                return ($scope.tableDetails || []).slice().sort(function (a, b) {
                    var aBed = parseBedNumber(a['Bed']);
                    var bBed = parseBedNumber(b['Bed']);

                    // 1. Handle null (always last)
                    if (aBed.isNull !== bBed.isNull) {
                        return aBed.isNull ? 1 : -1;
                    }
                    // 2. Handle empty string (before null, after others)
                    if (aBed.isEmpty !== bBed.isEmpty) {
                        return aBed.isEmpty ? 1 : -1;
                    }
                    // 3. Handle Non-Numeric vs Numeric/Alphanumeric (Non-numeric comes after)
                    if (aBed.isNonNumericString !== bBed.isNonNumericString) {
                        return aBed.isNonNumericString ? 1 : -1;
                    }

                    // At this point, a and b are of the same type (both numeric/alphanumeric, both non-numeric, both empty, or both null)

                    // 4. If both are Non-Numeric, sort alphabetically
                    if (aBed.isNonNumericString) { // && bBed.isNonNumericString is implied
                        return aBed.str.localeCompare(bBed.str);
                    }

                    // 5. If both are Numeric/Alphanumeric
                    if (!aBed.isNonNumericString && !aBed.isEmpty && !aBed.isNull) { // && same for bBed is implied
                        // Sort by numeric part first
                        if (aBed.num !== bBed.num) {
                            return aBed.num - bBed.num;
                        }
                        // Then by full string part (e.g., 101A vs 101B)
                        if (aBed.str !== bBed.str) {
                            return aBed.str.localeCompare(bBed.str);
                        }
                    }

                    // Fallbacks: Trigger if primary criteria (Bed number and type) are identical

                    // 6. Fallback to bed_id
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
