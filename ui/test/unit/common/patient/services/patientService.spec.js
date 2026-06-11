'use strict';

describe('patientService', function () {
    var rootScope, mockBackend, patientService, sessionService, appService;

    beforeEach(function () {
        module('bahmni.common.patient');
        module(function($provide) {
            sessionService = jasmine.createSpyObj('sessionService', ['getLoginLocationUuid']);
            $provide.value('sessionService', sessionService);
            appService = jasmine.createSpyObj('appDescriptor', ['getConfigValue']);
            $provide.value('appService', appService);
        });

        inject(function (_$rootScope_, _patientService_, $httpBackend) {
            rootScope = _$rootScope_;
            patientService = _patientService_;
            mockBackend = $httpBackend
        });
    });

    describe('getPatientContext', function () {
        it('should make http call to get patient context', function () {
            var patientUuid = 'patientUuid';
            var programUuid = 'programUuid';
            var personAttributes = [];
            var programAttributes = [];
            var patientIdentifiers = [];
            var results = {};
            mockBackend.expectGET('/openmrs/ws/rest/v1/bahmnicore/patientcontext?patientUuid=patientUuid&programUuid=programUuid').respond({results: results});

            patientService.getPatientContext(patientUuid, programUuid, personAttributes, programAttributes, patientIdentifiers).then(function (response) {
                expect(response.data.results).toEqual(results);
            });

            mockBackend.flush();
        });
    });

    describe('getPatientLmpData', function () {
        it('should fetch and return LMP data for single obs', function () {
            var patientUuid = 'patient-uuid-123';
            var conceptName = 'LMP Date';
            var lmpResponse = {
                results: [{
                    value: '2026-04-10',
                    auditInfo: { dateCreated: '2026-04-10T10:00:00.000+0000' }
                }]
            };

            mockBackend.expectGET(/\/openmrs\/ws\/rest\/v1\/obs.*patient=patient-uuid-123&concept=LMP%20Date/).respond(lmpResponse);

            patientService.getPatientLmpData(patientUuid, conceptName).then(function (data) {
                expect(data).toBeTruthy();
                expect(data.lmpDate).toBe('2026-04-10');
                expect(data.daysSinceLmp).not.toBeLessThan(0);
            });

            mockBackend.flush();
        });

        it('should return the most recently created obs when multiple obs exist', function () {
            var patientUuid = 'patient-uuid-multi';
            var conceptName = 'LMP Date';
            var lmpResponse = {
                results: [
                    {
                        value: '2026-02-01',
                        auditInfo: { dateCreated: '2026-06-11T09:23:25.000+0000' }
                    },
                    {
                        value: '2026-05-06',
                        auditInfo: { dateCreated: '2026-06-11T09:52:20.000+0000' }
                    },
                    {
                        value: '2026-05-01',
                        auditInfo: { dateCreated: '2026-06-11T09:28:45.000+0000' }
                    }
                ]
            };

            mockBackend.expectGET(/\/openmrs\/ws\/rest\/v1\/obs.*patient=patient-uuid-multi&concept=LMP%20Date/).respond(lmpResponse);

            patientService.getPatientLmpData(patientUuid, conceptName).then(function (data) {
                expect(data).toBeTruthy();
                expect(data.lmpDate).toBe('2026-05-06');
            });

            mockBackend.flush();
        });

        it('should return null when no observations found', function () {
            var patientUuid = 'patient-uuid-456';
            var conceptName = 'LMP Date';
            var emptyResponse = {results: []};

            mockBackend.expectGET(/\/openmrs\/ws\/rest\/v1\/obs.*patient=patient-uuid-456&concept=LMP%20Date/).respond(emptyResponse);

            patientService.getPatientLmpData(patientUuid, conceptName).then(function (data) {
                expect(data).toBeNull();
            });

            mockBackend.flush();
        });

        it('should return null for empty or null patientUuid', function () {
            var result1, result2;
            patientService.getPatientLmpData('', 'LMP Date').then(function (data) { result1 = data; });
            patientService.getPatientLmpData(null, 'LMP Date').then(function (data) { result2 = data; });
            rootScope.$apply();
            expect(result1).toBeNull();
            expect(result2).toBeNull();
        });

        it('should return null when conceptName is not provided', function () {
            var patientUuid = 'patient-uuid-no-concept';
            var result;
            patientService.getPatientLmpData(patientUuid).then(function (data) { result = data; });
            rootScope.$apply();
            expect(result).toBeNull();
        });

        it('should return null when observation value is empty', function () {
            var patientUuid = 'patient-uuid-789';
            var conceptName = 'LMP Date';
            var responseWithoutValue = {
                results: [{
                    value: null,
                    auditInfo: { dateCreated: '2026-06-11T09:00:00.000+0000' }
                }]
            };

            mockBackend.expectGET(/\/openmrs\/ws\/rest\/v1\/obs.*patient=patient-uuid-789&concept=LMP%20Date/).respond(responseWithoutValue);

            patientService.getPatientLmpData(patientUuid, conceptName).then(function (data) {
                expect(data).toBeNull();
            });

            mockBackend.flush();
        });

        it('should return null when LMP date is in the future', function () {
            var patientUuid = 'patient-uuid-future';
            var conceptName = 'LMP Date';
            var futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + 5);
            var futureDateStr = futureDate.getFullYear() + '-' +
                String(futureDate.getMonth() + 1).padStart(2, '0') + '-' +
                String(futureDate.getDate()).padStart(2, '0');

            var lmpResponse = {
                results: [{
                    value: futureDateStr,
                    auditInfo: { dateCreated: '2026-06-11T09:00:00.000+0000' }
                }]
            };

            mockBackend.expectGET(/\/openmrs\/ws\/rest\/v1\/obs.*patient=patient-uuid-future&concept=LMP%20Date/).respond(lmpResponse);

            patientService.getPatientLmpData(patientUuid, conceptName).then(function (data) {
                expect(data).toBeNull();
            });

            mockBackend.flush();
        });

        it('should handle API errors gracefully', function () {
            var patientUuid = 'patient-uuid-error';
            var conceptName = 'LMP Date';

            mockBackend.expectGET(/\/openmrs\/ws\/rest\/v1\/obs.*patient=patient-uuid-error&concept=LMP%20Date/).respond(500, 'Server Error');

            patientService.getPatientLmpData(patientUuid, conceptName).then(function (data) {
                expect(data).toBeNull();
            });

            mockBackend.flush();
        });

        it('should include correct daysSinceLmp in returned data', function () {
            var patientUuid = 'patient-uuid-with-days';
            var conceptName = 'LMP Date';
            var thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            var lmpDateStr = thirtyDaysAgo.getFullYear() + '-' +
                String(thirtyDaysAgo.getMonth() + 1).padStart(2, '0') + '-' +
                String(thirtyDaysAgo.getDate()).padStart(2, '0');

            var lmpResponse = {
                results: [{
                    value: lmpDateStr,
                    auditInfo: { dateCreated: '2026-06-11T09:00:00.000+0000' }
                }]
            };

            mockBackend.expectGET(/\/openmrs\/ws\/rest\/v1\/obs.*patient=patient-uuid-with-days&concept=LMP%20Date/).respond(lmpResponse);

            patientService.getPatientLmpData(patientUuid, conceptName).then(function (data) {
                expect(data.lmpDate).toBe(lmpDateStr);
                expect(data.daysSinceLmp).toBe(30);
            });

            mockBackend.flush();
        });
    })
});