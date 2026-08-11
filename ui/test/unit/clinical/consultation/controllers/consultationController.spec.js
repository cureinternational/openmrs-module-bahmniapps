'use strict';

describe('ConsultationController - isSaveDisabled', function () {
    var scope, rootScope, controller, visitHistory, retrospectiveEntryService, appService, appDescriptor;

    var createMocks = function (visitHistoryOverrides) {
        visitHistory = angular.extend({
            activeVisit: null,
            visits: []
        }, visitHistoryOverrides);

        retrospectiveEntryService = jasmine.createSpyObj('retrospectiveEntryService', ['getRetrospectiveEntry']);
        retrospectiveEntryService.getRetrospectiveEntry.and.returnValue(null);

        appDescriptor = jasmine.createSpyObj('appDescriptor', ['getConfigValue', 'getExtensions', 'formatUrl']);
        appDescriptor.getConfigValue.and.callFake(function (key) {
            if (key === 'allowConsultationWhenNoOpenVisit') return false;
            return null;
        });
        appDescriptor.getExtensions.and.returnValue([]);
        appDescriptor.formatUrl.and.returnValue('');

        appService = jasmine.createSpyObj('appService', ['getAppDescriptor']);
        appService.getAppDescriptor.and.returnValue(appDescriptor);
    };

    var buildController = function () {
        return controller('ConsultationController', {
            $scope: scope,
            $rootScope: rootScope,
            $state: { current: { name: 'patient.dashboard.show' }, params: {}, go: jasmine.createSpy('go'), href: jasmine.createSpy('href') },
            $location: jasmine.createSpyObj('$location', ['url', 'absUrl']),
            $translate: jasmine.createSpyObj('$translate', ['instant']),
            $stateParams: { patientUuid: 'patient-uuid', configName: 'default' },
            $window: { open: jasmine.createSpy('open'), onbeforeunload: null },
            $q: rootScope.$new().constructor,
            $filter: jasmine.createSpy('$filter').and.returnValue(function (board) { return board.label || ''; }),
            clinicalAppConfigService: {
                getAllConsultationBoards: jasmine.createSpy().and.returnValue([]),
                getConsultationBoardLink: jasmine.createSpy().and.returnValue('/consultation'),
                getVisitTypeForRetrospectiveEntries: jasmine.createSpy().and.returnValue(null),
                getDefaultVisitType: jasmine.createSpy().and.returnValue(null),
                getConsultationBoardLink: jasmine.createSpy().and.returnValue('')
            },
            diagnosisService: jasmine.createSpyObj('diagnosisService', ['populateDiagnosisInformation']),
            urlHelper: jasmine.createSpyObj('urlHelper', ['getPatientUrl']),
            contextChangeHandler: { execute: jasmine.createSpy().and.returnValue({ allow: true }), reset: jasmine.createSpy() },
            spinner: jasmine.createSpyObj('spinner', ['forPromise']),
            encounterService: jasmine.createSpyObj('encounterService', ['getEncountersForEncounterType', 'getEncounterType', 'create']),
            messagingService: jasmine.createSpyObj('messagingService', ['showMessage']),
            sessionService: jasmine.createSpyObj('sessionService', ['getLoginLocationUuid']),
            retrospectiveEntryService: retrospectiveEntryService,
            patientContext: { patient: { uuid: 'patient-uuid', name: 'Test Patient' } },
            patientVisitHistoryService: jasmine.createSpyObj('patientVisitHistoryService', ['getVisitHistory']),
            visitHistory: visitHistory,
            clinicalDashboardConfig: {
                tabs: [],
                visibleTabs: [],
                showTabs: jasmine.createSpy().and.returnValue(false),
                getUnOpenedTabs: jasmine.createSpy().and.returnValue([]),
                isCurrentTab: jasmine.createSpy().and.returnValue(false),
                closeTab: jasmine.createSpy(),
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
            conditionsService: jasmine.createSpyObj('conditionsService', ['save', 'getConditions', 'getFollowUpConditionConcept']),
            configurationService: jasmine.createSpyObj('configurationService', ['loadConfig']),
            auditLogService: jasmine.createSpyObj('auditLogService', ['log']),
            confirmBox: jasmine.createSpy('confirmBox'),
            virtualConsultService: jasmine.createSpyObj('virtualConsultService', ['launchMeeting']),
            adhocTeleconsultationService: jasmine.createSpyObj('adhocTeleconsultationService', ['generateAdhocTeleconsultationLink'])
        });
    };

    beforeEach(module('bahmni.clinical'));

    beforeEach(inject(function ($controller, $rootScope, $q) {
        controller = $controller;
        rootScope = $rootScope;
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

        it('should return true when there is no active visit and consultation without visit is not allowed', function () {
            createMocks({ activeVisit: null });
            buildController();

            expect(scope.isSaveDisabled()).toBe(true);
        });

        it('should return true when active visit is at a different location (visitHistory.activeVisit is null)', function () {
            // patientVisitHistoryService returns activeVisit=null when the visit exists but is at a different location
            createMocks({ activeVisit: null, visits: [{ uuid: 'other-loc-visit', location: { uuid: 'other-loc' } }] });
            buildController();

            expect(scope.isSaveDisabled()).toBe(true);
        });

        it('should return false when allowConsultationWhenNoOpenVisit config is true', function () {
            createMocks({ activeVisit: null });
            appDescriptor.getConfigValue.and.callFake(function (key) {
                if (key === 'allowConsultationWhenNoOpenVisit') return true;
                return null;
            });
            buildController();

            expect(scope.isSaveDisabled()).toBe(false);
        });

        it('should return false when in retrospective entry mode even without an active visit', function () {
            createMocks({ activeVisit: null });
            retrospectiveEntryService.getRetrospectiveEntry.and.returnValue({ date: new Date() });
            buildController();

            expect(scope.isSaveDisabled()).toBe(false);
        });
    });
});
