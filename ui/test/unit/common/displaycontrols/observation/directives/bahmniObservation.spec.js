'use strict';

describe("BahmniObservation", function () {
    var appService, scope, $compile, mockBackend, observationsService, q, spinner, formHierarchyService, encounterService, providerInfoService, formPrintService;
    var simpleHtml = '<bahmni-observation section="section" patient="patient" is-on-dashboard="true" config="config" enrollment="enrollment" observations="observations"></bahmni-observation>';

    beforeEach(module('ngHtml2JsPreprocessor'));
    beforeEach(module('bahmni.common.patient'));
    beforeEach(module('bahmni.common.uiHelper'));
    beforeEach(module('bahmni.common.i18n'));
    beforeEach(module('bahmni.common.displaycontrol.observation', function ($provide) {
        observationsService = jasmine.createSpyObj('observationsService', ['fetch', 'fetchForEncounter', 'getByUuid', 'fetchForPatientProgram', 'encounterService']);
        appService = jasmine.createSpyObj('appService', ['getAppDescriptor']);
        appService.getAppDescriptor.and.returnValue({
            getConfigValue: function () {
                return {
                    concept: ""
                }
            }, getExtensions: function (a, b) {
                return {
                    maxPatientsPerBed: 2
                }
            },
            getConfig: function(){

            }
        });
        formHierarchyService = jasmine.createSpyObj('formHierarchyService',['build']);
        encounterService = jasmine.createSpyObj('encounterService',['findByEncounterUuid']);
        providerInfoService = jasmine.createSpyObj('providerInfoService', ['setProvider']);
        formPrintService = jasmine.createSpyObj('formPrintService', ['printForm']);
        formHierarchyService.build.and.returnValue(null);

        spinner = jasmine.createSpyObj('spinner', ['forPromise']);

        spinner.forPromise.and.callFake(function (param) {
            return {
                then: function () {
                    return {};
                }
            }
        });

        $provide.value('observationsService', observationsService);
        $provide.value('appService', appService);
        $provide.value('spinner', spinner);
        $provide.value('formHierarchyService',formHierarchyService);
        $provide.value('encounterService',encounterService);
        $provide.value('providerInfoService',providerInfoService);
        $provide.value('formPrintService',formPrintService);
    }));

    beforeEach(inject(function (_$compile_, $rootScope, $httpBackend, $q) {
        scope = $rootScope.$new();
        $compile = _$compile_;
        q = $q;
        mockBackend = $httpBackend;
    }));

    describe("Initialization", function () {
        it("should fetch observations for encounter if the encounterUuid is provided but formType is not formsV2", function () {
            scope.patient = {uuid: '123'};
            scope.config = {showGroupDateTime: false, encounterUuid: "encounterUuid", conceptNames: ["Concept Name"]};
            scope.section = {};
            observationsService.fetchForEncounter.and.returnValue(specUtil.respondWithPromise(q, {data: {}}));

            mockBackend.expectGET('../common/displaycontrols/observation/views/observationDisplayControl.html').respond("<div>dummy</div>");

            var element = $compile(simpleHtml)(scope);
            scope.$digest();
            var compiledElementScope = element.isolateScope();
            scope.$digest();

            expect(compiledElementScope).not.toBeUndefined();
            expect(compiledElementScope.config).not.toBeUndefined();
            expect(observationsService.fetchForEncounter).toHaveBeenCalledWith(scope.config.encounterUuid, scope.config.conceptNames);
            expect(observationsService.fetchForEncounter.calls.count()).toEqual(1);
            expect(observationsService.fetch.calls.count()).toEqual(0);
            expect(observationsService.fetchForPatientProgram.calls.count()).toEqual(0);
        });

        it("should fetch observations for encounter if formType is formsV2", function () {
            scope.patient = {uuid: '123'};
            scope.config = {showGroupDateTime: false, encounterUuid: "encounterUuid", formType: "formsV2"};
            scope.section = {};
            encounterService.findByEncounterUuid.and.returnValue(specUtil.respondWithPromise(q, {data: {observations: ["abc"]}}));

            mockBackend.expectGET('../common/displaycontrols/observation/views/observationDisplayControl.html').respond("<div>dummy</div>");

            var element = $compile(simpleHtml)(scope);
            scope.$digest();
            var compiledElementScope = element.isolateScope();
            scope.$digest();

            expect(compiledElementScope).not.toBeUndefined();
            expect(compiledElementScope.config).not.toBeUndefined();
            expect(encounterService.findByEncounterUuid).toHaveBeenCalledWith(scope.config.encounterUuid, { includeAll : false });
            expect(encounterService.findByEncounterUuid.calls.count()).toEqual(1);
            expect(observationsService.fetch.calls.count()).toEqual(0);
            expect(observationsService.fetchForPatientProgram.calls.count()).toEqual(0);
            expect(observationsService.fetchForEncounter.calls.count()).toEqual(0);
        });

        it("should fetch observations for patient if the encounterUuid is not provided", function () {
            scope.patient = {uuid: '123'};
            scope.config = {showGroupDateTime: false, conceptNames: ["Concept Name"], scope: "latest", numberOfVisits: 1};
            scope.section = {};
            observationsService.fetch.and.returnValue(specUtil.respondWithPromise(q, {data: {}}));

            mockBackend.expectGET('../common/displaycontrols/observation/views/observationDisplayControl.html').respond("<div>dummy</div>");

            var element = $compile(simpleHtml)(scope);
            scope.$digest();
            var compiledElementScope = element.isolateScope();
            scope.$digest();

            expect(compiledElementScope).not.toBeUndefined();
            expect(compiledElementScope.config).not.toBeUndefined();
            expect(observationsService.fetch).toHaveBeenCalledWith(scope.patient.uuid, scope.config.conceptNames, scope.config.scope,
                scope.config.numberOfVisits, undefined, undefined, undefined);
            expect(observationsService.fetch.calls.count()).toEqual(1);
            expect(observationsService.fetchForEncounter.calls.count()).toEqual(0);
            expect(observationsService.fetchForPatientProgram.calls.count()).toEqual(0);
        });

        it("should pass filterObsWithOrders from config to observationsService", function () {
            scope.patient = {uuid: '123'};
            scope.config = {showGroupDateTime: false, conceptNames: ["Height", "Weight"], scope: "latest", numberOfVisits: 1, filterObsWithOrders: false};
            scope.section = {};
            observationsService.fetch.and.returnValue(specUtil.respondWithPromise(q, {data: {}}));

            mockBackend.expectGET('../common/displaycontrols/observation/views/observationDisplayControl.html').respond("<div>dummy</div>");

            var element = $compile(simpleHtml)(scope);
            scope.$digest();
            var compiledElementScope = element.isolateScope();
            scope.$digest();

            expect(observationsService.fetch).toHaveBeenCalledWith(scope.patient.uuid, scope.config.conceptNames, scope.config.scope,
                scope.config.numberOfVisits, undefined, undefined, false);
            expect(observationsService.fetch.calls.count()).toEqual(1);
        });

        it("should fetch observations within daterange if you want to fetch program specific data.", function () {
            scope.patient = {uuid: '123'};
            scope.config = {showGroupDateTime: false, conceptNames: ["Concept Name"], scope: "latest", numberOfVisits: 1};
            scope.section = {};
            observationsService.fetch.and.returnValue(specUtil.respondWithPromise(q, {data: {}}));
            appService.getAppDescriptor.and.returnValue({
                getConfigValue: function () {
                    return {
                        showDetailsWithinDateRange: true
                    }
                }, getExtensions: function (a, b) {
                    return {
                        maxPatientsPerBed: 2
                    }
                },
                getConfig: function(){

                }
            });

            mockBackend.expectGET('../common/displaycontrols/observation/views/observationDisplayControl.html').respond("<div>dummy</div>");

            var element = $compile(simpleHtml)(scope);
            scope.$digest();
            var compiledElementScope = element.isolateScope();
            scope.$digest();

            expect(compiledElementScope).not.toBeUndefined();
            expect(compiledElementScope.config).not.toBeUndefined();
            expect(observationsService.fetch).toHaveBeenCalledWith(scope.patient.uuid, scope.config.conceptNames,
                scope.config.scope, scope.config.numberOfVisits, undefined, undefined, undefined);
            expect(observationsService.fetch.calls.count()).toEqual(1);
            expect(observationsService.fetchForEncounter.calls.count()).toEqual(0);
            expect(observationsService.fetchForPatientProgram.calls.count()).toEqual(0);
        });

        it("should fetch the only the specific observation if observation uuid is specified in config", function () {
            scope.patient = {uuid: '123'};
            scope.config = {observationUuid : "observationUuid"};
            scope.section = {};
            scope.enrollment = "uuid";
            observationsService.getByUuid.and.returnValue(specUtil.respondWithPromise(q, {data: {concept: {name: "obsConcept"}}}));
            mockBackend.expectGET('../common/displaycontrols/observation/views/observationDisplayControl.html').respond("<div>dummy</div>");

            var element = $compile(simpleHtml)(scope);
            scope.$digest();
            var compiledElementScope = element.isolateScope();
            scope.$digest();


            expect(observationsService.getByUuid).toHaveBeenCalledWith("observationUuid");
            expect(observationsService.getByUuid.calls.count()).toEqual(1);
        });

        it("should fetch observations for patient if the patientProgramUuid is provided", function () {
            scope.config = {conceptNames: ["Concept Name"], scope: "latest", obsIgnoreList: ["obsIgnoreList"]};
            scope.section = {};
            scope.enrollment = 'patientProgramUuid';
            observationsService.fetchForPatientProgram.and.returnValue(specUtil.respondWithPromise(q, {data: {}}));

            mockBackend.expectGET('../common/displaycontrols/observation/views/observationDisplayControl.html').respond("<div>dummy</div>");

            var element = $compile(simpleHtml)(scope);
            scope.$digest();
            var compiledElementScope = element.isolateScope();
            scope.$digest();

            expect(compiledElementScope).not.toBeUndefined();
            expect(compiledElementScope.config).not.toBeUndefined();

            expect(observationsService.fetchForPatientProgram).toHaveBeenCalledWith(scope.enrollment, scope.config.conceptNames, scope.config.scope, scope.config.obsIgnoreList);
            expect(observationsService.fetchForPatientProgram.calls.count()).toEqual(1);
            expect(observationsService.fetch.calls.count()).toEqual(0);
            expect(observationsService.fetchForEncounter.calls.count()).toEqual(0);
        });

        it("should only fetch observations from config which are fully specified", function () {
            scope.patient = {uuid: '123'};
            scope.config = {
                conceptNames: [
                    "Vitals",
                    "History and Examination"
                ],
                scope: "latest"
            };
            scope.section = {};
            scope.observations = [
                {
                    concept: {
                        name: "Vitals",
                        shortName: "Vitals"
                    }
                },
                {
                    concept: {
                        name: "History and Examination Template",
                        shortName: "History and Examination"
                    }
                }
            ];

            mockBackend.expectGET('../common/displaycontrols/observation/views/observationDisplayControl.html').respond("<div>dummy</div>");

            var element = $compile(simpleHtml)(scope);
            scope.$digest();
            var compiledElementScope = element.isolateScope();
            scope.$digest();

            expect(compiledElementScope.bahmniObservations[0].value.length).toEqual(1);
            expect(compiledElementScope.bahmniObservations[0].value[0].concept.name).toEqual("Vitals");
        });

        it("should only fetch observations from config specific to particular form", function () {
            scope.patient = {uuid: '123'};
            scope.config = {
                conceptNames: [
                    "Surgeon",
                ],
                filterByFormName: "form1",
            };
            scope.section = {};
            scope.observations = [
                {
                    concept: {
                        name: "Surgeon",
                        shortName: "Surgeon"
                    },
                    formFieldPath: "form1"
                },
                {
                    concept: {
                        name: "Surgeon",
                        shortName: "Surgeon"
                    },
                    formFieldPath: "form2"
                },
            ];
            var formResponse = {
                    data: {
                        resources: [
                            { value: 'form1' },
                            { value: 'form2' }
                        ]
                    }
                };

            mockBackend.expectGET("/openmrs/ws/rest/v1/bahmniie/form/allForms?v=custom:(version,name,uuid)").respond(formResponse);
            mockBackend.expectGET('../common/displaycontrols/observation/views/observationDisplayControl.html').respond("<div>dummy</div>");

            var element = $compile(simpleHtml)(scope);
            scope.$digest();
            var compiledElementScope = element.isolateScope();
            scope.$digest();

            expect(compiledElementScope.bahmniObservations[0].value.length).toEqual(1);
            expect(compiledElementScope.bahmniObservations[0].value[0].concept.name).toEqual("Surgeon");
            expect(compiledElementScope.bahmniObservations[0].value[0].formFieldPath).toEqual("form1");
        });

        it("should filter out every date group when none of the observations belong to the configured form", function () {
            scope.patient = {uuid: '123'};
            scope.config = {
                conceptNames: ["Surgeon"],
                filterByFormName: "form1"
            };
            scope.section = {};
            scope.observations = [
                {
                    concept: {name: "Surgeon", shortName: "Surgeon"},
                    formFieldPath: "form2",
                    encounterDateTime: "2026-01-01T10:00:00"
                },
                {
                    concept: {name: "Surgeon", shortName: "Surgeon"},
                    formFieldPath: "form2",
                    encounterDateTime: "2026-02-01T10:00:00"
                },
                {
                    concept: {name: "Surgeon", shortName: "Surgeon"},
                    formFieldPath: "form2",
                    encounterDateTime: "2026-03-01T10:00:00"
                }
            ];

            mockBackend.expectGET("/openmrs/ws/rest/v1/bahmniie/form/allForms?v=custom:(version,name,uuid)").respond({data: {}});
            mockBackend.expectGET('../common/displaycontrols/observation/views/observationDisplayControl.html').respond("<div>dummy</div>");

            var element = $compile(simpleHtml)(scope);
            scope.$digest();
            var compiledElementScope = element.isolateScope();
            scope.$digest();

            expect(compiledElementScope.bahmniObservations.length).toEqual(0);
        });

        it("should filter observations inside every date group, not just the first one", function () {
            scope.patient = {uuid: '123'};
            scope.config = {
                conceptNames: ["Surgeon"],
                filterByFormName: "form1"
            };
            scope.section = {};
            scope.observations = [
                {
                    concept: {name: "Surgeon", shortName: "Surgeon"},
                    formFieldPath: "form2",
                    encounterDateTime: "2026-01-01T10:00:00"
                },
                {
                    concept: {name: "Surgeon", shortName: "Surgeon"},
                    formFieldPath: "form1",
                    encounterDateTime: "2026-02-01T10:00:00"
                },
                {
                    concept: {name: "Surgeon", shortName: "Surgeon"},
                    formFieldPath: "form2",
                    encounterDateTime: "2026-03-01T10:00:00"
                }
            ];

            mockBackend.expectGET("/openmrs/ws/rest/v1/bahmniie/form/allForms?v=custom:(version,name,uuid)").respond({data: {}});
            mockBackend.expectGET('../common/displaycontrols/observation/views/observationDisplayControl.html').respond("<div>dummy</div>");

            var element = $compile(simpleHtml)(scope);
            scope.$digest();
            var compiledElementScope = element.isolateScope();
            scope.$digest();

            expect(compiledElementScope.bahmniObservations.length).toEqual(1);
            expect(compiledElementScope.bahmniObservations[0].value.length).toEqual(1);
            expect(compiledElementScope.bahmniObservations[0].value[0].formFieldPath).toEqual("form1");
        });

        it("should match form name from a versioned formFieldPath like 'FormName.1/2-0'", function () {
            scope.patient = {uuid: '123'};
            scope.config = {
                conceptNames: ["Surgeon"],
                filterByFormName: "Orthopaedic Operative Report"
            };
            scope.section = {};
            scope.observations = [
                {
                    concept: {name: "Surgeon", shortName: "Surgeon"},
                    formFieldPath: "Orthopaedic Operative Report.1/2-0"
                },
                {
                    concept: {name: "Surgeon", shortName: "Surgeon"},
                    formFieldPath: "Audiology Procedure Note.1/2-0"
                }
            ];

            mockBackend.expectGET("/openmrs/ws/rest/v1/bahmniie/form/allForms?v=custom:(version,name,uuid)").respond({data: {}});
            mockBackend.expectGET('../common/displaycontrols/observation/views/observationDisplayControl.html').respond("<div>dummy</div>");

            var element = $compile(simpleHtml)(scope);
            scope.$digest();
            var compiledElementScope = element.isolateScope();
            scope.$digest();

            expect(compiledElementScope.bahmniObservations[0].value.length).toEqual(1);
            expect(compiledElementScope.bahmniObservations[0].value[0].formFieldPath).toEqual("Orthopaedic Operative Report.1/2-0");
        });

        it("should match the configured form name case-insensitively", function () {
            scope.patient = {uuid: '123'};
            scope.config = {
                conceptNames: ["Surgeon"],
                filterByFormName: "ORTHOPAEDIC OPERATIVE REPORT"
            };
            scope.section = {};
            scope.observations = [
                {
                    concept: {name: "Surgeon", shortName: "Surgeon"},
                    formFieldPath: "Orthopaedic Operative Report.1/2-0"
                }
            ];

            mockBackend.expectGET("/openmrs/ws/rest/v1/bahmniie/form/allForms?v=custom:(version,name,uuid)").respond({data: {}});
            mockBackend.expectGET('../common/displaycontrols/observation/views/observationDisplayControl.html').respond("<div>dummy</div>");

            var element = $compile(simpleHtml)(scope);
            scope.$digest();
            var compiledElementScope = element.isolateScope();
            scope.$digest();

            expect(compiledElementScope.bahmniObservations[0].value.length).toEqual(1);
        });

        it("should drop observations that have no formFieldPath when filterByFormName is set", function () {
            scope.patient = {uuid: '123'};
            scope.config = {
                conceptNames: ["Surgeon"],
                filterByFormName: "form1"
            };
            scope.section = {};
            scope.observations = [
                {
                    concept: {name: "Surgeon", shortName: "Surgeon"},
                    formFieldPath: "form1"
                },
                {
                    concept: {name: "Surgeon", shortName: "Surgeon"}
                }
            ];

            mockBackend.expectGET("/openmrs/ws/rest/v1/bahmniie/form/allForms?v=custom:(version,name,uuid)").respond({data: {}});
            mockBackend.expectGET('../common/displaycontrols/observation/views/observationDisplayControl.html').respond("<div>dummy</div>");

            var element = $compile(simpleHtml)(scope);
            scope.$digest();
            var compiledElementScope = element.isolateScope();
            scope.$digest();

            expect(compiledElementScope.bahmniObservations[0].value.length).toEqual(1);
            expect(compiledElementScope.bahmniObservations[0].value[0].formFieldPath).toEqual("form1");
        });

        it("should not apply any form-name filtering when filterByFormName is absent from config", function () {
            scope.patient = {uuid: '123'};
            scope.config = {
                conceptNames: ["Surgeon"]
            };
            scope.section = {};
            scope.observations = [
                {
                    concept: {name: "Surgeon", shortName: "Surgeon"},
                    formFieldPath: "form1"
                },
                {
                    concept: {name: "Surgeon", shortName: "Surgeon"},
                    formFieldPath: "form2"
                }
            ];

            mockBackend.expectGET("/openmrs/ws/rest/v1/bahmniie/form/allForms?v=custom:(version,name,uuid)").respond({data: {}});
            mockBackend.expectGET('../common/displaycontrols/observation/views/observationDisplayControl.html').respond("<div>dummy</div>");

            var element = $compile(simpleHtml)(scope);
            scope.$digest();
            var compiledElementScope = element.isolateScope();
            scope.$digest();

            expect(compiledElementScope.bahmniObservations[0].value.length).toEqual(2);
        });

        it("should only fetch observations from config specific to multiple forms when filterByFormName is an array", function () {
            scope.patient = {uuid: '123'};
            scope.config = {
                conceptNames: ["Surgeon"],
                filterByFormName: ["form1", "form3"]
            };
            scope.section = {};
            scope.observations = [
                {
                    concept: {name: "Surgeon", shortName: "Surgeon"},
                    formFieldPath: "form1"
                },
                {
                    concept: {name: "Surgeon", shortName: "Surgeon"},
                    formFieldPath: "form2"
                },
                {
                    concept: {name: "Surgeon", shortName: "Surgeon"},
                    formFieldPath: "form3"
                }
            ];

            mockBackend.expectGET("/openmrs/ws/rest/v1/bahmniie/form/allForms?v=custom:(version,name,uuid)").respond({data: {}});
            mockBackend.expectGET('../common/displaycontrols/observation/views/observationDisplayControl.html').respond("<div>dummy</div>");

            var element = $compile(simpleHtml)(scope);
            scope.$digest();
            var compiledElementScope = element.isolateScope();
            scope.$digest();

            expect(compiledElementScope.bahmniObservations[0].value.length).toEqual(2);
            expect(compiledElementScope.bahmniObservations[0].value[0].formFieldPath).toEqual("form1");
            expect(compiledElementScope.bahmniObservations[0].value[1].formFieldPath).toEqual("form3");
        });
    });
});
