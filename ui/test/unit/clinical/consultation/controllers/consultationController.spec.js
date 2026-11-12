'use strict';

describe('ConsultationController - isSaveDisabled', function () {
    var scope, rootScope, controller, $q, visitHistory, retrospectiveEntryService, appDescriptor, appService;
    var encounterSvc, formDraftSvc, diagnosisSvc, messagingSvc, conditionsSvc, stateMock, windowMock, spinnerMock;

    var createMocks = function (visitHistoryOverrides) {
        visitHistory = angular.extend({ activeVisit: null, visits: [] }, visitHistoryOverrides);

        retrospectiveEntryService = jasmine.createSpyObj('retrospectiveEntryService', ['getRetrospectiveEntry']);
        retrospectiveEntryService.getRetrospectiveEntry.and.returnValue(null);

        appDescriptor = jasmine.createSpyObj('appDescriptor', ['getConfigValue', 'getExtensions', 'formatUrl']);
        appDescriptor.getConfigValue.and.callFake(function (key) {
            return key === 'adtNavigationConfig' ? {} : null;
        });
        appDescriptor.getExtensions.and.returnValue([]);
        appDescriptor.formatUrl.and.returnValue('');

        appService = jasmine.createSpyObj('appService', ['getAppDescriptor']);
        appService.getAppDescriptor.and.returnValue(appDescriptor);

        encounterSvc = jasmine.createSpyObj('encounterService', ['getEncountersForEncounterType', 'getEncounterType', 'create']);
        formDraftSvc = jasmine.createSpyObj('formDraftService', ['getDraft', 'saveDraft', 'markDraftAsSaved']);
        formDraftSvc.markDraftAsSaved.and.returnValue($q.when({}));
        diagnosisSvc = jasmine.createSpyObj('diagnosisService', ['populateDiagnosisInformation']);
        messagingSvc = jasmine.createSpyObj('messagingService', ['showMessage']);
        conditionsSvc = jasmine.createSpyObj('conditionsService', ['save', 'getConditions']);
        spinnerMock = jasmine.createSpyObj('spinner', ['forPromise', 'hide']);
        spinnerMock.forPromise.and.callFake(function (p) { return p; });
        stateMock = { current: { name: 'patient.dashboard.show' }, params: {}, go: jasmine.createSpy(), href: jasmine.createSpy(), discardChanges: false, transitionTo: jasmine.createSpy('transitionTo').and.returnValue($q.when({})) };
        windowMock = { open: jasmine.createSpy(), onbeforeunload: null };
    };

    var buildController = function () {
        encounterSvc.getEncountersForEncounterType.and.returnValue($q.when({ data: { results: [] } }));

        return controller('ConsultationController', {
            $scope: scope,
            $rootScope: rootScope,
            $q: $q,
            $state: stateMock,
            $location: jasmine.createSpyObj('$location', ['url']),
            $translate: jasmine.createSpyObj('$translate', ['instant']),
            $stateParams: { patientUuid: 'patient-uuid', configName: 'default' },
            $window: windowMock,
            $filter: jasmine.createSpy('$filter').and.returnValue(function () { return ''; }),
            clinicalAppConfigService: {
                getAllConsultationBoards: jasmine.createSpy().and.returnValue([]),
                getConsultationBoardLink: jasmine.createSpy().and.returnValue(''),
                getVisitTypeForRetrospectiveEntries: jasmine.createSpy().and.returnValue(null),
                getDefaultVisitType: jasmine.createSpy().and.returnValue(null)
            },
            diagnosisService: diagnosisSvc,
            urlHelper: jasmine.createSpyObj('urlHelper', ['getPatientUrl']),
            contextChangeHandler: { execute: jasmine.createSpy().and.returnValue({ allow: true }), reset: jasmine.createSpy() },
            spinner: spinnerMock,
            encounterService: encounterSvc,
            messagingService: messagingSvc,
            sessionService: jasmine.createSpyObj('sessionService', ['getLoginLocationUuid']),
            retrospectiveEntryService: retrospectiveEntryService,
            patientContext: { patient: { uuid: 'patient-uuid', name: 'Test Patient' } },
            patientVisitHistoryService: jasmine.createSpyObj('patientVisitHistoryService', ['getVisitHistory']),
            visitHistory: visitHistory,
            clinicalDashboardConfig: {
                tabs: [], visibleTabs: [],
                showTabs: jasmine.createSpy().and.returnValue(false),
                getUnOpenedTabs: jasmine.createSpy().and.returnValue([]),
                isCurrentTab: jasmine.createSpy().and.returnValue(false),
                closeTab: jasmine.createSpy(),
                allowAdhocTeleConsultation: false,
                quickPrints: false,
                showPrint: jasmine.createSpy().and.returnValue(false)
            },
            appService: appService,
            ngDialog: jasmine.createSpyObj('ngDialog', ['open', 'openConfirm', 'close', 'closeAll']),
            configurations: {
                encounterConfig: jasmine.createSpy().and.returnValue({ getPatientDocumentEncounterTypeUuid: jasmine.createSpy().and.returnValue('uuid1') }),
                dosageFrequencyConfig: jasmine.createSpy().and.returnValue({}),
                dosageInstructionConfig: jasmine.createSpy().and.returnValue({}),
                consultationNoteConcept: jasmine.createSpy().and.returnValue({}),
                labOrderNotesConcept: jasmine.createSpy().and.returnValue({})
            },
            visitConfig: { tabs: [] },
            conditionsService: conditionsSvc,
            configurationService: jasmine.createSpyObj('configurationService', ['loadConfig']),
            auditLogService: jasmine.createSpyObj('auditLogService', ['log']),
            confirmBox: jasmine.createSpy(),
            virtualConsultService: jasmine.createSpyObj('virtualConsultService', ['launchMeeting']),
            adhocTeleconsultationService: jasmine.createSpyObj('adhocTeleconsultationService', ['generateAdhocTeleconsultationLink']),
            formDraftService: formDraftSvc,
            autoSaveService: jasmine.createSpyObj('autoSaveService', ['start', 'stop', 'getIntervalMs'])
        });
    };

    beforeEach(module('bahmni.clinical'));

    beforeEach(inject(function ($controller, $rootScope, _$q_) {
        controller = $controller;
        rootScope = $rootScope;
        $q = _$q_;
        scope = rootScope.$new();
        scope.$parent = rootScope.$new();
        scope.$parent.$parent = rootScope.$new();
        scope.$parent.$parent.$broadcast = jasmine.createSpy('$broadcast');
        rootScope.currentUser = { addToRecentlyViewed: jasmine.createSpy() };
        rootScope.currentProvider = { uuid: 'provider-uuid' };
        rootScope.collapseControlPanel = jasmine.createSpy();
    }));

    describe('isSaveDisabled', function () {
        it('should return false when patient has an active visit at current location', function () {
            createMocks({ activeVisit: { uuid: 'visit-uuid', location: { uuid: 'loc-uuid' } } });
            buildController();
            expect(scope.isSaveDisabled()).toBe(false);
        });

        it('should return true when there is no active visit', function () {
            createMocks({ activeVisit: null });
            buildController();
            expect(scope.isSaveDisabled()).toBe(true);
        });

        // activeVisit is null when a visit exists but at a different location (filtered by patientVisitHistoryService)
        it('should return true when active visit is at a mismatched location', function () {
            createMocks({ activeVisit: null, visits: [{ uuid: 'other-visit', location: { uuid: 'other-loc' } }] });
            buildController();
            expect(scope.isSaveDisabled()).toBe(true);
        });

        it('should return false when in retrospective entry mode without an active visit', function () {
            createMocks({ activeVisit: null });
            retrospectiveEntryService.getRetrospectiveEntry.and.returnValue({ date: new Date() });
            buildController();
            expect(scope.isSaveDisabled()).toBe(false);
        });
    });

    // mobileHeader.html binds ng-disabled="isSaveDisabled()" on the mobile save button
    describe('mobile save button - isSaveDisabled()', function () {
        it('should be enabled (false) when active visit exists — mobile save button is clickable', function () {
            createMocks({ activeVisit: { uuid: 'visit-uuid', location: { uuid: 'loc-uuid' } } });
            buildController();
            expect(scope.isSaveDisabled()).toBe(false);
        });

        it('should be disabled (true) when no active visit — mobile save button is blocked', function () {
            createMocks({ activeVisit: null });
            buildController();
            expect(scope.isSaveDisabled()).toBe(true);
        });

        it('should be disabled (true) when visit is at a different location — mobile save button is blocked', function () {
            createMocks({ activeVisit: null, visits: [{ uuid: 'other-visit', location: { uuid: 'other-loc' } }] });
            buildController();
            expect(scope.isSaveDisabled()).toBe(true);
        });

        it('should be enabled (false) in retrospective mode — mobile save button is clickable', function () {
            createMocks({ activeVisit: null });
            retrospectiveEntryService.getRetrospectiveEntry.and.returnValue({ date: new Date() });
            buildController();
            expect(scope.isSaveDisabled()).toBe(false);
        });
    });

    describe('save - duplicate submission and stale form protection', function () {
        var formObs = function (uuid, extra) {
            return angular.extend({ uuid: uuid, formNamespace: 'Bahmni', formFieldPath: 'Form.1/1-0', concept: { uuid: 'c-' + uuid } }, extra);
        };
        var savedEncounter = function (observations) {
            return {
                data: {
                    encounterUuid: 'enc-uuid', encounterType: 'Consultation', visitUuid: 'v', observations: observations || [], orders: [],
                    extensions: {}, patientUuid: 'patient-uuid', providers: [], bahmniDiagnoses: [], disposition: null, accessionNotes: [], drugOrders: []
                }
            };
        };
        beforeEach(function () {
            createMocks({ activeVisit: { uuid: 'visit-uuid', location: { uuid: 'loc-uuid' } } });
            rootScope.cdssAlerts = [];
            sessionStorage.removeItem('formSaveCompleted');
        });

        var setupConsultation = function (observations) {
            scope.consultation = {
                encounterUuid: 'enc-uuid',
                observations: observations || [],
                observationForms: [],
                preSaveHandler: { fire: jasmine.createSpy() },
                postSaveHandler: { fire: jasmine.createSpy() },
                conditions: []
            };
            scope.$parent.consultation = scope.consultation;
        };

        var arrangeHappyPath = function (serverObs) {
            encounterSvc.getEncounterType.and.returnValue($q.when({ uuid: 'type-uuid' }));
            encounterSvc.create.and.returnValue($q.when(savedEncounter([formObs('new-1')])));
            diagnosisSvc.populateDiagnosisInformation.and.callFake(function (patientUuid, consultation) {
                consultation.postSaveHandler = { fire: jasmine.createSpy() };
                return $q.when(consultation);
            });
            conditionsSvc.save.and.returnValue($q.when({}));
            conditionsSvc.getConditions.and.returnValue($q.when([]));
        };

        var shown = function (key) {
            return _.some(messagingSvc.showMessage.calls.allArgs(), function (args) {
                return args[0] === 'error' && args[1].indexOf(key) > -1;
            });
        };

        var build = function () {
            buildController();
            // the controller registers $parent/$rootScope stubs used by save; keep the spec focused on persistence
            scope.$parent.$parent.$broadcast = jasmine.createSpy('$broadcast');
        };

        it('should create the encounter on a normal save', function () {
            setupConsultation([formObs('obs-1')]);
            arrangeHappyPath([formObs('obs-1')]);
            build();

            scope.save();
            rootScope.$digest();

            expect(encounterSvc.create.calls.count()).toBe(1);
            expect(shown('CLINICAL_SAVE_FAILURE_MESSAGE_KEY')).toBe(false);
        });

        it('should ignore a second save while the first one is still in flight', function () {
            setupConsultation([formObs('obs-1')]);
            arrangeHappyPath([formObs('obs-1')]);
            var pendingCreate = $q.defer();
            encounterSvc.create.and.returnValue(pendingCreate.promise);
            build();

            scope.save();
            rootScope.$digest();
            scope.save();
            rootScope.$digest();

            expect(encounterSvc.create.calls.count()).toBe(1);

            pendingCreate.reject({ status: 500 });
            rootScope.$digest();
            scope.save();
            rootScope.$digest();
            expect(encounterSvc.create.calls.count()).toBe(2);
        });

        it('should report a genuine save failure when the encounter POST itself fails', function () {
            setupConsultation([formObs('obs-1')]);
            arrangeHappyPath([formObs('obs-1')]);
            encounterSvc.create.and.returnValue($q.reject({ status: 500, data: {} }));
            build();

            scope.save();
            rootScope.$digest();

            expect(shown('CLINICAL_SAVE_FAILURE_MESSAGE_KEY')).toBe(true);
            expect(stateMock.transitionTo).not.toHaveBeenCalled();
        });

        it('should rebind the saved observations when the diagnosis lookup fails after a successful save', function () {
            setupConsultation([formObs('obs-1')]);
            arrangeHappyPath([formObs('obs-1')]);
            diagnosisSvc.populateDiagnosisInformation.and.returnValue($q.reject({ status: 500 }));
            build();

            scope.save();
            rootScope.$digest();

            expect(scope.$parent.consultation.observations.map(function (o) { return o.uuid; })).toEqual(['new-1']);
            expect(shown('CLINICAL_SAVE_FAILURE_MESSAGE_KEY')).toBe(false);
            expect(stateMock.transitionTo).toHaveBeenCalled();
        });

        it('should say data was saved (not "not saved") and rebind when a post-save step throws', function () {
            setupConsultation([formObs('obs-1')]);
            arrangeHappyPath([formObs('obs-1')]);
            stateMock.transitionTo.and.returnValue($q.reject({ message: 'transition failed' }));
            build();

            scope.save();
            rootScope.$digest();

            expect(shown('CLINICAL_SAVE_PARTIAL_MESSAGE_KEY')).toBe(true);
            expect(shown('CLINICAL_SAVE_FAILURE_MESSAGE_KEY')).toBe(false);
        });

        it('should refuse another save until the form is reloaded after a committed save whose refresh failed', function () {
            setupConsultation([formObs('obs-1')]);
            arrangeHappyPath([formObs('obs-1')]);
            stateMock.transitionTo.and.returnValue($q.reject({ message: 'transition failed' }));
            build();

            scope.save();
            rootScope.$digest();
            expect(encounterSvc.create.calls.count()).toBe(1);

            scope.save();
            rootScope.$digest();

            expect(encounterSvc.create.calls.count()).toBe(1);
            expect(shown('CLINICAL_FORM_STALE_MESSAGE_KEY')).toBe(true);
        });
    });

    describe('save - unknown outcome and cross-tab serialisation', function () {
        var formObs = function (uuid) {
            return { uuid: uuid, formNamespace: 'Bahmni', formFieldPath: 'Form.1/1-0', concept: { uuid: 'c-' + uuid } };
        };
        var savedEncounter = function (observations) {
            return {
                data: {
                    encounterUuid: 'enc-uuid', encounterType: 'Consultation', visitUuid: 'v', observations: observations, orders: [],
                    extensions: {}, patientUuid: 'patient-uuid', providers: [], bahmniDiagnoses: [], disposition: null, accessionNotes: [], drugOrders: []
                }
            };
        };
        var shown = function (key) {
            return _.some(messagingSvc.showMessage.calls.allArgs(), function (args) {
                return args[0] === 'error' && args[1].indexOf(key) > -1;
            });
        };
        var setupConsultation = function (targetScope, encounterUuid, observations) {
            targetScope.consultation = {
                encounterUuid: encounterUuid,
                observations: observations,
                observationForms: [],
                preSaveHandler: { fire: jasmine.createSpy() },
                postSaveHandler: { fire: jasmine.createSpy() },
                conditions: []
            };
            targetScope.$parent.consultation = targetScope.consultation;
        };
        var newScope = function () {
            var s = rootScope.$new();
            s.$parent = rootScope.$new();
            s.$parent.$parent = rootScope.$new();
            s.$parent.$parent.$broadcast = jasmine.createSpy('$broadcast');
            return s;
        };
        var arrange = function () {
            encounterSvc.getEncounterType.and.returnValue($q.when({ uuid: 'type-uuid' }));
            diagnosisSvc.populateDiagnosisInformation.and.callFake(function (patientUuid, consultation) {
                consultation.postSaveHandler = { fire: jasmine.createSpy() };
                return $q.when(consultation);
            });
            conditionsSvc.save.and.returnValue($q.when({}));
            conditionsSvc.getConditions.and.returnValue($q.when([]));
        };

        beforeEach(function () {
            createMocks({ activeVisit: { uuid: 'visit-uuid', location: { uuid: 'loc-uuid' } } });
            rootScope.cdssAlerts = [];
            arrange();
        });

        it('should block the next save when the outcome is unknown and there is no encounter to compare against', function () {
            setupConsultation(scope, undefined, []);
            encounterSvc.create.and.returnValue($q.reject({ status: -1 }));
            buildController();

            scope.save();
            rootScope.$digest();
            expect(shown('CLINICAL_SAVE_UNCONFIRMED_MESSAGE_KEY')).toBe(true);

            scope.save();
            rootScope.$digest();
            expect(encounterSvc.create.calls.count()).toBe(1);
            expect(shown('CLINICAL_FORM_STALE_MESSAGE_KEY')).toBe(true);
        });

        it('should treat gateway timeouts as an unknown outcome', function () {
            setupConsultation(scope, undefined, []);
            encounterSvc.create.and.returnValue($q.reject({ status: 504 }));
            buildController();

            scope.save();
            rootScope.$digest();

            expect(shown('CLINICAL_SAVE_UNCONFIRMED_MESSAGE_KEY')).toBe(true);
        });

        it('should allow a retry after a definite server error even without an encounter', function () {
            setupConsultation(scope, undefined, []);
            encounterSvc.create.and.returnValue($q.reject({ status: 500, data: {} }));
            buildController();

            scope.save();
            rootScope.$digest();
            expect(shown('CLINICAL_SAVE_FAILURE_MESSAGE_KEY')).toBe(true);
            expect(shown('CLINICAL_SAVE_UNCONFIRMED_MESSAGE_KEY')).toBe(false);

            scope.save();
            rootScope.$digest();
            expect(encounterSvc.create.calls.count()).toBe(2);
        });

        it('should allow a retry after a timeout when the server shows nothing was saved', function () {
            setupConsultation(scope, 'enc-uuid', [formObs('obs-1')]);
            encounterSvc.create.and.returnValue($q.reject({ status: -1 }));
            buildController();

            scope.save();
            rootScope.$digest();
            scope.save();
            rootScope.$digest();

            expect(encounterSvc.create.calls.count()).toBe(2);
        });

    });
});
