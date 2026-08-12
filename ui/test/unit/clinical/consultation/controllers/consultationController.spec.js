'use strict';

describe('ConsultationController - isSaveDisabled', function () {
    var scope, rootScope, controller, $q, visitHistory, retrospectiveEntryService, appDescriptor, appService;

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
    };

    var buildController = function () {
        var encounterSvc = jasmine.createSpyObj('encounterService', ['getEncountersForEncounterType', 'getEncounterType', 'create']);
        encounterSvc.getEncountersForEncounterType.and.returnValue($q.when({ data: { results: [] } }));

        return controller('ConsultationController', {
            $scope: scope,
            $rootScope: rootScope,
            $q: $q,
            $state: { current: { name: 'patient.dashboard.show' }, params: {}, go: jasmine.createSpy(), href: jasmine.createSpy(), discardChanges: false },
            $location: jasmine.createSpyObj('$location', ['url']),
            $translate: jasmine.createSpyObj('$translate', ['instant']),
            $stateParams: { patientUuid: 'patient-uuid', configName: 'default' },
            $window: { open: jasmine.createSpy(), onbeforeunload: null },
            $filter: jasmine.createSpy('$filter').and.returnValue(function () { return ''; }),
            clinicalAppConfigService: {
                getAllConsultationBoards: jasmine.createSpy().and.returnValue([]),
                getConsultationBoardLink: jasmine.createSpy().and.returnValue(''),
                getVisitTypeForRetrospectiveEntries: jasmine.createSpy().and.returnValue(null),
                getDefaultVisitType: jasmine.createSpy().and.returnValue(null)
            },
            diagnosisService: jasmine.createSpyObj('diagnosisService', ['populateDiagnosisInformation']),
            urlHelper: jasmine.createSpyObj('urlHelper', ['getPatientUrl']),
            contextChangeHandler: { execute: jasmine.createSpy().and.returnValue({ allow: true }), reset: jasmine.createSpy() },
            spinner: jasmine.createSpyObj('spinner', ['forPromise', 'hide']),
            encounterService: encounterSvc,
            messagingService: jasmine.createSpyObj('messagingService', ['showMessage']),
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
            conditionsService: jasmine.createSpyObj('conditionsService', ['save', 'getConditions']),
            configurationService: jasmine.createSpyObj('configurationService', ['loadConfig']),
            auditLogService: jasmine.createSpyObj('auditLogService', ['log']),
            confirmBox: jasmine.createSpy(),
            virtualConsultService: jasmine.createSpyObj('virtualConsultService', ['launchMeeting']),
            adhocTeleconsultationService: jasmine.createSpyObj('adhocTeleconsultationService', ['generateAdhocTeleconsultationLink']),
            formDraftService: jasmine.createSpyObj('formDraftService', ['getDraft', 'saveDraft', 'markDraftAsSaved']),
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
});
