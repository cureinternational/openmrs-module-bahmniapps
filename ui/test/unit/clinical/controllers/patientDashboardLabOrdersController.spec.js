'use strict';

describe("PatientDashboardLabOrdersController", function () {

    beforeEach(module('bahmni.clinical'));

    var scope, stateParams, controller, visitActionsService, allergyService, observationsService, orderService, $q, $rootScope;

    var labResultSection = {
        "title": "Lab Results",
        "type": "labOrders",
        "dashboardConfig": {
            "title": null,
            "showChart": false,
            "showTable": true,
            "showNormalValues": true,
            "showCommentsExpanded": true,
            "showAccessionNotes": true
        }
    };

    beforeEach(inject(function ($controller, _$rootScope_, _$q_) {
        controller = $controller;
        $rootScope = _$rootScope_;
        $q = _$q_;
        scope = $rootScope.$new();
        scope.patient = {uuid: "patient123"};
        scope.dialogData = {};
        stateParams = {patientUuid: "patient123"};

        $rootScope.facilityLocation = {name: 'Test Hospital', address5: 'Test Address'};
        $rootScope.currentProvider = {uuid: 'provider-fallback', display: 'Dr. Fallback'};

        visitActionsService = jasmine.createSpyObj('visitActionsService', ['downloadLabResults']);
        allergyService = jasmine.createSpyObj('allergyService', ['fetchAndProcessAllergies']);
        allergyService.fetchAndProcessAllergies.and.returnValue($q.when('No allergies'));
        observationsService = jasmine.createSpyObj('observationsService', ['fetch']);
        observationsService.fetch.and.returnValue($q.when({data: []}));
        orderService = jasmine.createSpyObj('orderService', ['getOrderByUuid']);
        orderService.getOrderByUuid.and.returnValue($q.when({
            data: {orderer: {uuid: 'provider-uuid', display: 'Dr. Test', attributes: []}}
        }));
    }));

    var initController = function () {
        return controller('PatientDashboardLabOrdersController', {
            $scope: scope,
            $stateParams: stateParams,
            $rootScope: $rootScope,
            $q: $q,
            visitActionsService: visitActionsService,
            allergyService: allergyService,
            observationsService: observationsService,
            orderService: orderService
        });
    };

    describe("when initialized", function () {
        it("should create configuration for displaying lab orders", function () {
            scope.dashboard = Bahmni.Common.DisplayControl.Dashboard.create({
                "dashboardName": "General",
                "sections": [labResultSection]
            });
            initController();
            expect(scope.dashboardConfig.patientUuid).toBe("patient123");
            expect(scope.dashboardConfig.showNormalValues).toBe(labResultSection.dashboardConfig.showNormalValues);
        });

        it("should pass patient uuid when no section config exists", function () {
            scope.dashboard = Bahmni.Common.DisplayControl.Dashboard.create({
                "dashboardName": "General",
                "sections": []
            });
            initController();
            expect(scope.dashboardConfig.patientUuid).toBe("patient123");
        });
    });

    describe("Phone Number Resolution", function () {
        beforeEach(function () {
            scope.dashboard = Bahmni.Common.DisplayControl.Dashboard.create({
                "dashboardName": "General",
                "sections": [labResultSection]
            });
        });

        var triggerDownloadAndGetPatient = function () {
            initController();
            var labOrderResults = [{orderUuid: 'order-1', isPanel: false}];
            scope.$broadcast("event:downloadLabResultsFromDashboard", labOrderResults, '2024-01-01', 'acc-1');
            $rootScope.$digest();
            return visitActionsService.downloadLabResults.calls.mostRecent().args[0];
        };

        it("should set phoneNumber from mobilePhone when available", function () {
            scope.patient.mobilePhone = {value: "+251911234567"};
            scope.patient.residentialPhone = {value: "+251644567890"};
            var patient = triggerDownloadAndGetPatient();
            expect(patient.phoneNumber).toBe("+251911234567");
        });

        it("should use residentialPhone when mobilePhone is not set", function () {
            scope.patient.residentialPhone = {value: "+251644567890"};
            scope.patient.workPhone = {value: "+251722111222"};
            var patient = triggerDownloadAndGetPatient();
            expect(patient.phoneNumber).toBe("+251644567890");
        });

        it("should use workPhone when mobile and residential are not set", function () {
            scope.patient.workPhone = {value: "+251722111222"};
            scope.patient.otherPhone = {value: "+251633999888"};
            var patient = triggerDownloadAndGetPatient();
            expect(patient.phoneNumber).toBe("+251722111222");
        });

        it("should use otherPhone as last resort", function () {
            scope.patient.otherPhone = {value: "+251633999888"};
            var patient = triggerDownloadAndGetPatient();
            expect(patient.phoneNumber).toBe("+251633999888");
        });

        it("should not set phoneNumber when no phone fields available", function () {
            var patient = triggerDownloadAndGetPatient();
            expect(patient.phoneNumber).toBeUndefined();
        });
    });

    describe("Weight Fetch", function () {
        beforeEach(function () {
            scope.dashboard = Bahmni.Common.DisplayControl.Dashboard.create({
                "dashboardName": "General",
                "sections": [labResultSection]
            });
        });

        it("should call observationsService.fetch with null numberOfVisits to search across all visits", function () {
            initController();
            $rootScope.$digest();
            expect(observationsService.fetch).toHaveBeenCalledWith(
                "patient123",
                [Bahmni.Common.Constants.weightConceptName],
                'latest',
                null,
                null, null, null, null
            );
        });

        it("should set weight on patient when observation is returned", function () {
            observationsService.fetch.and.returnValue($q.when({data: [{value: 65.5}]}));
            initController();
            var labOrderResults = [{orderUuid: 'order-1', isPanel: false}];
            scope.$broadcast("event:downloadLabResultsFromDashboard", labOrderResults, '2024-01-01', 'acc-1');
            $rootScope.$digest();
            var patient = visitActionsService.downloadLabResults.calls.mostRecent().args[0];
            expect(patient.weight).toBe(65.5);
        });

        it("should not set weight when no observations are returned", function () {
            observationsService.fetch.and.returnValue($q.when({data: []}));
            initController();
            var labOrderResults = [{orderUuid: 'order-1', isPanel: false}];
            scope.$broadcast("event:downloadLabResultsFromDashboard", labOrderResults, '2024-01-01', 'acc-1');
            $rootScope.$digest();
            var patient = visitActionsService.downloadLabResults.calls.mostRecent().args[0];
            expect(patient.weight).toBeUndefined();
        });

        it("should proceed with download even when weight fetch fails", function () {
            observationsService.fetch.and.returnValue($q.reject('error'));
            initController();
            var labOrderResults = [{orderUuid: 'order-1', isPanel: false}];
            scope.$broadcast("event:downloadLabResultsFromDashboard", labOrderResults, '2024-01-01', 'acc-1');
            $rootScope.$digest();
            expect(visitActionsService.downloadLabResults).toHaveBeenCalled();
        });
    });

    describe("buildProvider - attribute mapping", function () {
        beforeEach(function () {
            scope.dashboard = Bahmni.Common.DisplayControl.Dashboard.create({
                "dashboardName": "General",
                "sections": [labResultSection]
            });
        });

        var triggerDownloadWithAttributes = function (attributes) {
            orderService.getOrderByUuid.and.returnValue($q.when({
                data: {orderer: {uuid: 'p1', display: 'Dr. Login Name', attributes: attributes}}
            }));
            initController();
            var labOrderResults = [{orderUuid: 'order-1', isPanel: false}];
            scope.$broadcast("event:downloadLabResultsFromDashboard", labOrderResults, '2024-01-01', 'acc-1');
            $rootScope.$digest();
            return visitActionsService.downloadLabResults.calls.mostRecent().args[4].provider;
        };

        it("should map Provider Full Name attribute to provider.fullName", function () {
            var provider = triggerDownloadWithAttributes([
                {value: 'Dr. John Doe', attributeType: {display: 'Provider Full Name'}}
            ]);
            expect(provider.fullName).toBe('Dr. John Doe');
        });

        it("should map Provider Title attribute to provider.title", function () {
            var provider = triggerDownloadWithAttributes([
                {value: 'MD', attributeType: {display: 'Provider Title'}}
            ]);
            expect(provider.title).toBe('MD');
        });

        it("should map Medical Licence Number attribute to provider.licenceNumber", function () {
            var provider = triggerDownloadWithAttributes([
                {value: 'LIC-12345', attributeType: {display: 'Medical Licence Number'}}
            ]);
            expect(provider.licenceNumber).toBe('LIC-12345');
        });

        it("should map all three attributes together", function () {
            var provider = triggerDownloadWithAttributes([
                {value: 'Dr. John Doe', attributeType: {display: 'Provider Full Name'}},
                {value: 'MD', attributeType: {display: 'Provider Title'}},
                {value: 'LIC-12345', attributeType: {display: 'Medical Licence Number'}}
            ]);
            expect(provider.fullName).toBe('Dr. John Doe');
            expect(provider.title).toBe('MD');
            expect(provider.licenceNumber).toBe('LIC-12345');
        });

        it("should match attribute names case-insensitively", function () {
            var provider = triggerDownloadWithAttributes([
                {value: 'Dr. John Doe', attributeType: {display: 'PROVIDER FULL NAME'}},
                {value: 'MD', attributeType: {display: 'provider title'}},
                {value: 'LIC-12345', attributeType: {display: 'Medical Licence Number'}}
            ]);
            expect(provider.fullName).toBe('Dr. John Doe');
            expect(provider.title).toBe('MD');
            expect(provider.licenceNumber).toBe('LIC-12345');
        });

        it("should trim whitespace from attribute type display name", function () {
            var provider = triggerDownloadWithAttributes([
                {value: 'Dr. John Doe', attributeType: {display: '  Provider Full Name  '}}
            ]);
            expect(provider.fullName).toBe('Dr. John Doe');
        });

        it("should set orderer display as provider name", function () {
            var provider = triggerDownloadWithAttributes([]);
            expect(provider.name).toBe('Dr. Login Name');
        });

        it("should ignore unrelated attributes", function () {
            var provider = triggerDownloadWithAttributes([
                {value: 'Doctor', attributeType: {display: 'practitioner_type'}},
                {value: true, attributeType: {display: 'Available for appointments'}},
                {value: 'Dr. John Doe', attributeType: {display: 'Provider Full Name'}}
            ]);
            expect(provider.fullName).toBe('Dr. John Doe');
            expect(provider.title).toBe('');
            expect(provider.licenceNumber).toBe('');
        });

        it("should handle empty attributes array", function () {
            var provider = triggerDownloadWithAttributes([]);
            expect(provider.fullName).toBe('');
            expect(provider.title).toBe('');
            expect(provider.licenceNumber).toBe('');
        });
    });

    describe("Download Lab Results event", function () {
        beforeEach(function () {
            scope.dashboard = Bahmni.Common.DisplayControl.Dashboard.create({
                "dashboardName": "General",
                "sections": [labResultSection]
            });
        });

        it("should call orderService.getOrderByUuid with the correct orderUuid and representation", function () {
            initController();
            var labOrderResults = [{orderUuid: 'order-uuid-1', isPanel: false}];
            scope.$broadcast("event:downloadLabResultsFromDashboard", labOrderResults, '2024-01-01', 'acc-1');
            $rootScope.$digest();
            expect(orderService.getOrderByUuid).toHaveBeenCalledWith(
                'order-uuid-1',
                'custom:(orderer:(uuid,display,attributes:(value,attributeType:(display))))'
            );
        });

        it("should use orderUuid from first test in a panel result", function () {
            initController();
            var labOrderResults = [{isPanel: true, tests: [{orderUuid: 'panel-order-uuid'}]}];
            scope.$broadcast("event:downloadLabResultsFromDashboard", labOrderResults, '2024-01-01', 'acc-1');
            $rootScope.$digest();
            expect(orderService.getOrderByUuid).toHaveBeenCalledWith(
                'panel-order-uuid',
                jasmine.any(String)
            );
        });

        it("should call visitActionsService.downloadLabResults with provider from order API", function () {
            orderService.getOrderByUuid.and.returnValue($q.when({
                data: {orderer: {uuid: 'p1', display: 'Dr. Test', attributes: [
                    {value: 'Dr. Full Name', attributeType: {display: 'Provider Full Name'}}
                ]}}
            }));
            initController();
            var labOrderResults = [{orderUuid: 'order-1', isPanel: false}];
            scope.$broadcast("event:downloadLabResultsFromDashboard", labOrderResults, '2024-01-01', 'acc-1');
            $rootScope.$digest();

            expect(visitActionsService.downloadLabResults).toHaveBeenCalled();
            var printConfig = visitActionsService.downloadLabResults.calls.mostRecent().args[4];
            expect(printConfig.provider.fullName).toBe('Dr. Full Name');
        });

        it("should fall back to currentProvider when orderUuid is missing", function () {
            initController();
            var labOrderResults = [{isPanel: false}]; // no orderUuid
            scope.$broadcast("event:downloadLabResultsFromDashboard", labOrderResults, '2024-01-01', 'acc-1');
            $rootScope.$digest();

            expect(orderService.getOrderByUuid).not.toHaveBeenCalled();
            var printConfig = visitActionsService.downloadLabResults.calls.mostRecent().args[4];
            expect(printConfig.provider).toEqual($rootScope.currentProvider);
        });

        it("should fall back to currentProvider when order API call fails", function () {
            orderService.getOrderByUuid.and.returnValue($q.reject('API error'));
            initController();
            var labOrderResults = [{orderUuid: 'order-1', isPanel: false}];
            scope.$broadcast("event:downloadLabResultsFromDashboard", labOrderResults, '2024-01-01', 'acc-1');
            $rootScope.$digest();

            var printConfig = visitActionsService.downloadLabResults.calls.mostRecent().args[4];
            expect(printConfig.provider).toEqual($rootScope.currentProvider);
        });

        it("should fall back to currentProvider when orderer is missing in order response", function () {
            orderService.getOrderByUuid.and.returnValue($q.when({data: {}}));
            initController();
            var labOrderResults = [{orderUuid: 'order-1', isPanel: false}];
            scope.$broadcast("event:downloadLabResultsFromDashboard", labOrderResults, '2024-01-01', 'acc-1');
            $rootScope.$digest();

            var printConfig = visitActionsService.downloadLabResults.calls.mostRecent().args[4];
            expect(printConfig.provider).toEqual($rootScope.currentProvider);
        });

        it("should include correct print config fields", function () {
            initController();
            var labOrderResults = [{orderUuid: 'order-1', isPanel: false}];
            scope.$broadcast("event:downloadLabResultsFromDashboard", labOrderResults, '2024-01-01', 'acc-1');
            $rootScope.$digest();

            var printConfig = visitActionsService.downloadLabResults.calls.mostRecent().args[4];
            expect(printConfig.locationName).toBe('Test Hospital');
            expect(printConfig.logo).toBe('/bahmni/images/cureLogoFull.png');
            expect(printConfig.title).toBe('Lab Results');
            expect(printConfig.locationAddress).toBe('Test Address');
        });

        it("should pass labOrderResults and accession details to downloadLabResults", function () {
            initController();
            var labOrderResults = [{orderUuid: 'order-1', isPanel: false}];
            scope.$broadcast("event:downloadLabResultsFromDashboard", labOrderResults, '2024-01-01', 'acc-uuid-1');
            $rootScope.$digest();

            var args = visitActionsService.downloadLabResults.calls.mostRecent().args;
            expect(args[1]).toBe(labOrderResults);
            expect(args[2]).toBe('2024-01-01');
            expect(args[3]).toBe('acc-uuid-1');
        });
    });
});
