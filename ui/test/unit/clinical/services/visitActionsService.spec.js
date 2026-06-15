'use strict';

describe('visitActionsService', function () {
    var visitActionsService;
    var printer;
    var labOrderResultService;
    var appService;
    var appDescriptor;
    var $httpBackend;
    var $rootScope;

    beforeEach(module('bahmni.clinical'));

    beforeEach(module(function ($provide) {
        printer = jasmine.createSpyObj('printer', ['print']);
        labOrderResultService = jasmine.createSpyObj('labOrderResultService', ['getReferredOutPrintableLabOrders']);
        appDescriptor = jasmine.createSpyObj('appDescriptor', ['getConfigValue']);
        appDescriptor.getConfigValue.and.callFake(function (key) {
            if (key === 'primaryIdentifierTypeUuid') {
                return '8d79403a-c2cc-11de-8d13-0010c6dffd0f';
            }
        });
        appService = jasmine.createSpyObj('appService', ['getAppDescriptor']);
        appService.getAppDescriptor.and.returnValue(appDescriptor);

        $provide.value('printer', printer);
        $provide.value('labOrderResultService', labOrderResultService);
        $provide.value('appService', appService);
    }));

    beforeEach(inject(function (_visitActionsService_, _$httpBackend_, _$rootScope_) {
        visitActionsService = _visitActionsService_;
        $httpBackend = _$httpBackend_;
        $rootScope = _$rootScope_;
    }));

    afterEach(function () {
        $httpBackend.verifyNoOutstandingExpectation();
        $httpBackend.verifyNoOutstandingRequest();
    });

    it('should fetch extra identifiers and print prescription', function () {
        var patient = {
            uuid: 'patient-uuid',
            identifier: 'BAH0001'
        };

        $httpBackend.expectGET('/openmrs/ws/rest/v1/patient/patient-uuid/identifier?v=full').respond(200, {
            results: [
                {
                    identifier: 'PRIMARY-1',
                    preferred: true,
                    voided: false,
                    identifierType: {
                        uuid: '8d79403a-c2cc-11de-8d13-0010c6dffd0f',
                        name: 'Primary'
                    }
                },
                {
                    identifier: 'EXTRA-1',
                    preferred: false,
                    voided: false,
                    identifierType: {
                        uuid: '68aef23a-fba8-11ed-be56-0242ac120002',
                        display: 'Primero Patient ID',
                        name: 'Primero'
                    }
                },
                {
                    identifier: 'VOIDED-1',
                    preferred: false,
                    voided: true,
                    identifierType: {
                        uuid: 'other-uuid',
                        name: 'Other'
                    }
                }
            ]
        });

        visitActionsService.printPrescription(patient, '2026-06-15', 'visit-1', { copies: 1 });
        $httpBackend.flush();
        $rootScope.$digest();

        expect(patient.extraIdentifiers.length).toBe(1);
        expect(patient.extraIdentifiers[0].identifier).toBe('EXTRA-1');
        expect(patient.extraIdentifiers[0].identifierType.display).toBe('Primero Patient ID');
        expect(printer.print).toHaveBeenCalledWith('common/views/prescriptionPrint.html', {
            patient: patient,
            visitDate: '2026-06-15',
            visitUuid: 'visit-1',
            printParams: { copies: 1 }
        });
    });

    it('should use custom template url for lab results print', function () {
        var patient = {
            uuid: 'patient-uuid-2',
            identifier: 'BAH0002'
        };
        var labOrderResults = [{ orderName: 'CBC' }];
        var printableOrders = [{ orderName: 'CBC', referredOut: true }];
        labOrderResultService.getReferredOutPrintableLabOrders.and.returnValue(printableOrders);

        $httpBackend.expectGET('/openmrs/ws/rest/v1/patient/patient-uuid-2/identifier?v=full').respond(200, {
            results: []
        });

        visitActionsService.downloadLabResults(
            patient,
            labOrderResults,
            '2026-06-15T10:00:00.000Z',
            'accession-1',
            { templateUrl: 'custom/views/labResultsPrint.html' }
        );
        $httpBackend.flush();
        $rootScope.$digest();

        expect(labOrderResultService.getReferredOutPrintableLabOrders).toHaveBeenCalledWith(labOrderResults);
        expect(printer.print).toHaveBeenCalledWith('custom/views/labResultsPrint.html', {
            patient: patient,
            labOrderResults: printableOrders,
            accessionDateTime: '2026-06-15T10:00:00.000Z',
            accessionUuid: 'accession-1',
            printParams: { templateUrl: 'custom/views/labResultsPrint.html' }
        });
    });

    it('should use default template url when print params are not provided', function () {
        var patient = {
            uuid: 'patient-uuid-3',
            identifier: 'BAH0003'
        };
        var labOrderResults = [{ orderName: 'RFT' }];
        var printableOrders = [{ orderName: 'RFT', referredOut: true }];
        labOrderResultService.getReferredOutPrintableLabOrders.and.returnValue(printableOrders);

        $httpBackend.expectGET('/openmrs/ws/rest/v1/patient/patient-uuid-3/identifier?v=full').respond(200, {
            results: [
                {
                    identifier: 'EXTRA-2',
                    preferred: false,
                    voided: false,
                    identifierType: {
                        uuid: 'secondary-uuid',
                        name: 'Secondary ID'
                    }
                }
            ]
        });

        visitActionsService.downloadLabResults(patient, labOrderResults, 'now', 'accession-2');
        $httpBackend.flush();
        $rootScope.$digest();

        expect(patient.extraIdentifiers.length).toBe(1);
        expect(patient.extraIdentifiers[0].identifierType.name).toBe('Secondary ID');
        expect(patient.extraIdentifiers[0].identifierType.display).toBe('Secondary ID');
        expect(printer.print).toHaveBeenCalledWith('common/views/labResultsPrint.html', {
            patient: patient,
            labOrderResults: printableOrders,
            accessionDateTime: 'now',
            accessionUuid: 'accession-2',
            printParams: undefined
        });
    });
});
