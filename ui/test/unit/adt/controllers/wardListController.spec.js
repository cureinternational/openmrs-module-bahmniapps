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
                { Bed: 'ZZZ', bed_id: 9, Ward: 'A' } // non-numeric bed number
            ];
        });

        it('should sort by numeric and alphanumeric bed numbers', function () {
            var sorted = scope.getSortedTableDetails();
            var beds = sorted.map(function (row) { return row.Bed; });
            // Ensure expected order includes the fallback sorting logic
            expect(beds).toEqual(['101', '101', '101', '101A', '102', '102B', 'ZZZ', '', null]);
        });

        it('should sort missing or invalid bed numbers last', function () {
            var sorted = scope.getSortedTableDetails();
            expect(sorted[sorted.length - 1].Bed).toBe(null);
            expect(sorted[sorted.length - 2].Bed).toBe('');
        });

        it('should use bed_id as fallback when bed numbers are the same', function () {
            var sorted = scope.getSortedTableDetails();
            // Filter for '101' beds and check their bed_id order based on the sorting logic (numeric, then bed_id, then Ward)
            var bed101Rows = sorted.filter(function (row) { return row.Bed === '101'; });
            var bedIds = bed101Rows.map(function (row) { return row.bed_id; });
            // Expected order: bed_id 2 (Ward A), bed_id 8 (Ward A), bed_id 7 (Ward B)
            expect(bedIds).toEqual([2, 8, 7]);
        });

        it('should use Ward as fallback when bed_id is the same', function () {
            // Add a row with the same bed_id (2) but different Ward ('C')
            scope.tableDetails.push({ Bed: '101', bed_id: 2, Ward: 'C' });
            var sorted = scope.getSortedTableDetails();
            // Filter for rows with bed_id 2
            var bedId2Rows = sorted.filter(function (row) { return row.bed_id === 2; });
            // Expecting two rows with bed_id 2
            expect(bedId2Rows.length).toBe(2);
            // Check Ward order (A before C)
            expect(bedId2Rows[0].Ward).toBe('A');
            expect(bedId2Rows[1].Ward).toBe('C');
        });
    });
});
