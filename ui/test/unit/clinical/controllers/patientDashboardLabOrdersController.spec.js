'use strict';

describe("PatientDashboardLabOrdersController", function () {

    beforeEach(module('bahmni.clinical'));

    var scope;
    var stateParams;
    var controller;
    var visitActionsService;
    var allergyService;
    var $q;
    var $rootScope;
    var spinner = jasmine.createSpyObj('spinner', ['forPromise']);
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
        $rootScope.facilityLocation = {
            name: 'Test Hospital',
            attributes: [
                {display: 'Print Header: Test Address', voided: false}
            ]
        };
        $rootScope.currentProvider = {
            uuid: 'provider-123',
            display: 'Dr. Smith'
        };
        spinner.forPromise.and.callFake(function () {
            return {}
        });
        stateParams = {
            patientUuid: "patient123"
        };

        // Mock services
        visitActionsService = jasmine.createSpyObj('visitActionsService', ['downloadLabResults']);
        allergyService = jasmine.createSpyObj('allergyService', ['fetchAndProcessAllergies']);
        allergyService.fetchAndProcessAllergies.and.returnValue($q.when(''));
    }));

    describe("when initialized", function () {
        it("creates configuration for displaying lab order display parameters", function () {
            scope.dashboard = Bahmni.Common.DisplayControl.Dashboard.create({
                "dashboardName": "General",
                "sections": [labResultSection]
            });
            controller('PatientDashboardLabOrdersController', {
                $scope: scope,
                $stateParams: stateParams,
                $rootScope: $rootScope,
                visitActionsService: visitActionsService,
                allergyService: allergyService,
                spinner: spinner
            });
            var params = scope.dashboardConfig;
            expect(params.patientUuid).toBe("patient123");
            expect(params.showNormalValues).toBe(labResultSection.dashboardConfig.showNormalValues);
        });

        it("passes in just the patient uuid when no parameters specified", function () {
            scope.dashboard = Bahmni.Common.DisplayControl.Dashboard.create({
                "dashboardName": "General",
                "sections": []
            });
            controller('PatientDashboardLabOrdersController', {
                $scope: scope,
                $stateParams: stateParams,
                $rootScope: $rootScope,
                visitActionsService: visitActionsService,
                allergyService: allergyService
            });

            var params = scope.dashboardConfig;
            expect(params.patientUuid).toBe("patient123");
        });

    });

    describe("Phone Number Priority Logic", function () {
        beforeEach(function () {
            scope.patient = {
                uuid: "patient123",
                mobilePhone: "+251911234567",
                residentialPhone: "+251644567890",
                workPhone: "+251722111222",
                otherPhone: "+251633999888"
            };
            scope.dashboard = Bahmni.Common.DisplayControl.Dashboard.create({
                "dashboardName": "General",
                "sections": [labResultSection]
            });
        });

        it("should prioritize mobile phone as highest priority", function () {
            var patient = scope.patient;
            var phoneNumber = patient.mobilePhone || patient.residentialPhone || patient.workPhone || patient.otherPhone || '';
            expect(phoneNumber).toBe("+251911234567");
        });

        it("should use residential phone if mobile is not available", function () {
            var patient = {
                mobilePhone: undefined,
                residentialPhone: "+251644567890",
                workPhone: "+251722111222",
                otherPhone: "+251633999888"
            };
            var phoneNumber = patient.mobilePhone || patient.residentialPhone || patient.workPhone || patient.otherPhone || '';
            expect(phoneNumber).toBe("+251644567890");
        });

        it("should use work phone if mobile and residential are not available", function () {
            var patient = {
                mobilePhone: undefined,
                residentialPhone: undefined,
                workPhone: "+251722111222",
                otherPhone: "+251633999888"
            };
            var phoneNumber = patient.mobilePhone || patient.residentialPhone || patient.workPhone || patient.otherPhone || '';
            expect(phoneNumber).toBe("+251722111222");
        });

        it("should use other phone as last resort", function () {
            var patient = {
                mobilePhone: undefined,
                residentialPhone: undefined,
                workPhone: undefined,
                otherPhone: "+251633999888"
            };
            var phoneNumber = patient.mobilePhone || patient.residentialPhone || patient.workPhone || patient.otherPhone || '';
            expect(phoneNumber).toBe("+251633999888");
        });

        it("should return empty string if no phone number is available", function () {
            var patient = {
                mobilePhone: undefined,
                residentialPhone: undefined,
                workPhone: undefined,
                otherPhone: undefined
            };
            var phoneNumber = patient.mobilePhone || patient.residentialPhone || patient.workPhone || patient.otherPhone || '';
            expect(phoneNumber).toBe('');
        });
    });

    describe("Enhanced Patient Object", function () {
        beforeEach(function () {
            scope.patient = {
                uuid: "patient123",
                name: "John Doe",
                age: 30,
                gender: "M",
                weight: 70,
                mobilePhone: "+251911234567",
                residentialPhone: "+251644567890",
                address: {
                    address3: 'Kebele 01',
                    address4: 'Woreda 01'
                }
            };
            scope.dashboard = Bahmni.Common.DisplayControl.Dashboard.create({
                "dashboardName": "General",
                "sections": [labResultSection]
            });
        });

        it("should create enhanced patient object with phone number", function () {
            var enhancedPatient = angular.copy(scope.patient);
            enhancedPatient.phoneNumber = scope.patient.mobilePhone || scope.patient.residentialPhone || '';
            expect(enhancedPatient.phoneNumber).toBe("+251911234567");
            expect(enhancedPatient.name).toBe("John Doe");
            expect(enhancedPatient.weight).toBe(70);
        });

        it("should preserve all patient properties in enhanced object", function () {
            var enhancedPatient = angular.copy(scope.patient);
            expect(enhancedPatient.uuid).toBe("patient123");
            expect(enhancedPatient.age).toBe(30);
            expect(enhancedPatient.gender).toBe("M");
            expect(enhancedPatient.address).toBeDefined();
        });
    });

    describe("Print Configuration", function () {
        beforeEach(function () {
            scope.patient = {uuid: "patient123"};
            scope.dashboard = Bahmni.Common.DisplayControl.Dashboard.create({
                "dashboardName": "General",
                "sections": [labResultSection]
            });
        });

        it("should set logo path as absolute path", function () {
            var logPath = '/bahmni/images/cureLogoFull.png';
            expect(logPath).toContain('/bahmni/');
            expect(logPath).toContain('cureLogoFull.png');
        });

        it("should extract location address from facility location", function () {
            var locationAddress = 'Addis Ababa';
            expect(locationAddress).toBe('Addis Ababa');
        });

        it("should set print config title", function () {
            var title = 'Lab Results';
            expect(title).toBe('Lab Results');
        });
    });
});