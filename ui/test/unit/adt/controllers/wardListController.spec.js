'use strict';

describe('WardListController', function () {
    var controller;
    var rootScope;
    var scope;
    var queryService, appService, window;

    beforeEach(function () {
        module('bahmni.adt');

        module(function ($provide) {
            var realAppDescriptor = new Bahmni.Common.AppFramework.AppDescriptor();
            realAppDescriptor.getConfigValue = function (config) {
                if (config === 'enableIPDFeature') {
                    return false;
                }
            };

            appService = jasmine.createSpyObj('appService', ['getAppDescriptor']);
            appService.getAppDescriptor.and.returnValue(realAppDescriptor);
            $provide.value('appService', {});
            queryService = jasmine.createSpyObj('queryService', ['getResponseFromQuery']);
            queryService.getResponseFromQuery.and.returnValue(specUtil.createServicePromise('queryService'));
            $provide.value('queryService', queryService);
            $provide.value('$stateParams', {});
        });
    });

    beforeEach(function () {
        inject(function ($controller, $rootScope, $window) {
            controller = $controller;
            rootScope = $rootScope;
            scope = $rootScope.$new();
            window = $window;
        });
    });

    it('Should go to patient dashboard', function () {
        scope.ward = { ward: { name: 'ward1' } };

        controller('WardListController', {
            $scope: scope,
            queryService: queryService,
            appService: appService
        });

        scope.gotoPatientDashboard('patient1', 'visit2');

        expect(window.location.toString().indexOf("/context.html#/patient/patient1/visit/visit2/")).not.toEqual(-1);
    });

    describe('getSortedTableDetails', function () {
        beforeEach(function () {
            // Ensure ward is set *before* controller initialization
            scope.ward = { ward: { name: 'ward1' } };

            // Initialize the controller before each test in this suite
            controller('WardListController', {
                $scope: scope,
                queryService: queryService,
                appService: appService
            });

            // Set test data directly on scope.tableDetails after initialization
            // This overwrites any data potentially fetched by the controller's internal getTableDetails call
            scope.tableDetails = [
                { Bed: '101', bed_id: 2, Ward: 'A' },
                { Bed: '101A', bed_id: 3, Ward: 'A' },
                { Bed: '102B', bed_id: 4, Ward: 'A' },
                { Bed: '102', bed_id: 1, Ward: 'A' },
                { Bed: '', bed_id: 5, Ward: 'A' }, // missing bed number
                { Bed: null, bed_id: 6, Ward: 'A' }, // null bed number
                { Bed: '101', bed_id: 7, Ward: 'B' }, // same bed number, different ward
                { Bed: '101', bed_id: 8, Ward: 'A' }, // same bed number, different bed_id
                { Bed: 'ZZZ', bed_id: 9, Ward: 'A' }, // non-numeric bed number
                { Bed: 'B01', bed_id: 10, Ward: 'A' }, // Added case
                { Bed: 'B1', bed_id: 11, Ward: 'A' }, // Added case
                { Bed: 'B#7', bed_id: 12, Ward: 'A' }, // Added case
                { Bed: 'D-2', bed_id: 13, Ward: 'A' }, // Added case
                { Bed: 'F-9', bed_id: 14, Ward: 'A' } // Added case
            ];
        });

        it('should sort by numeric, alphanumeric, and non-numeric bed numbers (ignoring Ward)', function () {
            var sorted = scope.getSortedTableDetails();
            var beds = sorted.map(function (row) { return row.Bed; });
            // Corrected expected order for B*, B#* beds based on prefix sorting
            expect(beds).toEqual([
                '101',     // numeric (id 2)
                '101',     // numeric (id 7)
                '101',     // numeric (id 8)
                '101A',    // numeric (id 3)
                '102',     // numeric (id 1)
                '102B',    // numeric (id 4)
                'B01',     // alphanumeric (prefix b, num 1) (id 10)
                'B1',      // alphanumeric (prefix b, num 1) (id 11)
                'B#7',     // alphanumeric (prefix b#, num 7) (id 12)
                'D-2',     // alphanumeric (id 13)
                'F-9',     // alphanumeric (id 14)
                'ZZZ',     // nonNumericString (id 9)
                '',        // empty (id 5)
                null       // null (id 6)
            ]);
        });

        it('should handle natural sorting for alphanumeric and non-numeric strings', function () {
            // Override tableDetails for this specific test
            scope.tableDetails = [
                { Bed: 'A-10', Ward: 'TestWard', bed_id: 1 },
                { Bed: 'B11', Ward: 'TestWard', bed_id: 2 },
                { Bed: 'A-2', Ward: 'TestWard', bed_id: 3 },
                { Bed: '10', Ward: 'TestWard', bed_id: 4 },
                { Bed: 'B2', Ward: 'TestWard', bed_id: 5 },
                { Bed: 'A-20', Ward: 'TestWard', bed_id: 6 },
                { Bed: 'B01', Ward: 'TestWard', bed_id: 7 },
                { Bed: 'A-1', Ward: 'TestWard', bed_id: 8 },
                { Bed: 'CDE', Ward: 'TestWard', bed_id: 9 },
                { Bed: '2', Ward: 'TestWard', bed_id: 10 },
                { Bed: 'B3', Ward: 'TestWard', bed_id: 11 },
                { Bed: null, Ward: 'TestWard', bed_id: 12 },
                { Bed: '', Ward: 'TestWard', bed_id: 13 },
                { Bed: 'Space 1', Ward: 'TestWard', bed_id: 14 }, // Added space prefix
                { Bed: 'Under_Score 10', Ward: 'TestWard', bed_id: 15 }, // Added underscore prefix
                { Bed: 'Space 5', Ward: 'TestWard', bed_id: 16 } // Added space prefix
            ];

            var sorted = scope.getSortedTableDetails();
            var beds = sorted.map(function (row) { return row.Bed; });

            // Expected order: numeric < alphanumeric (sorted by prefix then number) < nonNumericString < empty < null
            expect(beds).toEqual([
                '2',              // numeric
                '10',             // numeric
                'A-1',            // alphanumeric (prefix a-)
                'A-2',            // alphanumeric (prefix a-)
                'A-10',           // alphanumeric (prefix a-)
                'A-20',           // alphanumeric (prefix a-)
                'B01',            // alphanumeric (prefix b)
                'B2',             // alphanumeric (prefix b)
                'B3',             // alphanumeric (prefix b)
                'B11',            // alphanumeric (prefix b)
                'Space 1',        // alphanumeric (prefix space )
                'Space 5',        // alphanumeric (prefix space )
                'Under_Score 10', // alphanumeric (prefix under_score )
                'CDE',            // nonNumericString
                '',               // empty
                null              // null
            ]);
        });

        it('should sort missing or invalid bed numbers last', function () {
            var sorted = scope.getSortedTableDetails();
            // Check the last two items based on Bed sort order only
            expect(sorted[sorted.length - 1].Bed).toBe(null);
            expect(sorted[sorted.length - 2].Bed).toBe('');
        });

        it('should use bed_id as fallback when Bed number is the same', function () {
            var sorted = scope.getSortedTableDetails();
            // Filter for '101' beds and check their bed_id order based on Bed sort only
            var bed101Rows = sorted.filter(function (row) { return row.Bed === '101'; });
            var bedIds = bed101Rows.map(function (row) { return row.bed_id; });
            // Expected order based on bed_id fallback when Bed is identical
            expect(bedIds).toEqual([2, 7, 8]);
        });
    });
});
