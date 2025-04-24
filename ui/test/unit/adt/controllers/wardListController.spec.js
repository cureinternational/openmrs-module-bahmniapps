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
                { Bed: '', bed_id: 5, Ward: 'A' },
                { Bed: null, bed_id: 6, Ward: 'A' },
                { Bed: '101', bed_id: 7, Ward: 'B' },
                { Bed: '101', bed_id: 8, Ward: 'A' },
                { Bed: 'ZZZ', bed_id: 9, Ward: 'A' },
                { Bed: 'B01', bed_id: 10, Ward: 'A' },
                { Bed: 'B1', bed_id: 11, Ward: 'A' },
                { Bed: 'B#7', bed_id: 12, Ward: 'A' },
                { Bed: 'D-2', bed_id: 13, Ward: 'A' },
                { Bed: 'F-9', bed_id: 14, Ward: 'A' }
            ];
        });

        it('should sort by numeric, alphanumeric, and non-numeric bed numbers (ignoring Ward)', function () {
            var sorted = scope.getSortedTableDetails();
            var beds = sorted.map(function (row) { return row.Bed; });
            expect(beds).toEqual([
                '101',
                '101',
                '101',
                '101A',
                '102',
                '102B',
                'B01',
                'B1',
                'B#7',
                'D-2',
                'F-9',
                'ZZZ',
                '',
                null
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
                { Bed: 'Space 1', Ward: 'TestWard', bed_id: 14 },
                { Bed: 'Under_Score 10', Ward: 'TestWard', bed_id: 15 },
                { Bed: 'Space 5', Ward: 'TestWard', bed_id: 16 }
            ];

            var sorted = scope.getSortedTableDetails();
            var beds = sorted.map(function (row) { return row.Bed; });

            expect(beds).toEqual([
                '2',
                '10',
                'A-1',
                'A-2',
                'A-10',
                'A-20',
                'B01',
                'B2',
                'B3',
                'B11',
                'Space 1',
                'Space 5',
                'Under_Score 10',
                'CDE',
                '',
                null
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
