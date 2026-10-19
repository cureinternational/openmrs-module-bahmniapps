'use strict';

describe('TreatmentController', function () {
    var $controller, $rootScope, $scope, appService, mockAppDescriptor, filter;
    var clinicalAppConfigService, cdssService;
    beforeEach(module('bahmni.clinical'));

    beforeEach(inject(function (_$controller_, _$rootScope_, _$filter_) {
        $controller = _$controller_;
        $rootScope = _$rootScope_;
        $scope = $rootScope.$new();
        clinicalAppConfigService = jasmine.createSpyObj('clinicalAppConfigService', ['getVisitTypeForRetrospectiveEntries']);
        cdssService = jasmine.createSpyObj('cdssService', ['sortInteractionsByStatus']);
        mockAppDescriptor = jasmine.createSpyObj('appDescriptor', ['getExtensionById', 'getConfigValue']);
        mockAppDescriptor.getExtensionById.and.returnValue({extensionParams: {sections: {allergies: {}}}});
        mockAppDescriptor.getConfigValue.and.returnValue(null);

        appService = jasmine.createSpyObj('appService', ['getAppDescriptor']);
        appService.getAppDescriptor.and.returnValue(mockAppDescriptor);
        filter = _$filter_;
    }));

    var createController = function () {
        return $controller('TreatmentController', {
            $scope: $scope,
            treatmentConfig: {drugOrderHistoryConfig: {view: 'default'}},
            $stateParams: {tabConfigName: 'allMedicationTabConfig'},
            appService: appService,
            clinicalAppConfigService: clinicalAppConfigService,
            cdssService: cdssService,
            $filter: filter
        });
    };

    describe('pharmacist review banner', function () {
        it('should not initialize pharmacistBanner when feature flag is disabled', function () {
            createController();
            expect($scope.pharmacistBannerEnabled).toBe(false);
            expect($scope.pharmacistBanner).toBeUndefined();
        });

        it('should initialize pharmacistBanner when feature flag is enabled', function () {
            mockAppDescriptor.getConfigValue.and.returnValue(true);
            createController();
            expect($scope.pharmacistBannerEnabled).toBe(true);
            expect($scope.pharmacistBanner).toEqual({confirmed: false, hasUndispensedOrders: false});
        });

        it('should set pharmacistBanner.confirmed to true on confirmPharmacistReview when enabled', function () {
            mockAppDescriptor.getConfigValue.and.returnValue(true);
            createController();
            $scope.confirmPharmacistReview();
            expect($scope.pharmacistBanner.confirmed).toBe(true);
        });

        it('should set dispensePrivilege from constants when enabled', function () {
            mockAppDescriptor.getConfigValue.and.returnValue(true);
            createController();
            expect($scope.dispensePrivilege).toEqual('bahmni:clinical:dispense');
        });
    });

    it('should initialize the newlyAddedTabTreatments', function () {
        var controller = $controller('TreatmentController', {
            $scope: $scope,
            treatmentConfig: {drugOrderHistoryConfig: {view: 'default'}},
            $stateParams: {tabConfigName: 'allMedicationTabConfig'},
            appService: appService,
            clinicalAppConfigService: clinicalAppConfigService,
            cdssService: cdssService,
            $filter: filter
        });
        controller.initializeTreatments = jasmine.createSpy('initializeTreatments');
        $scope.consultation = {
            newlyAddedTabTreatments: {
                allMedicationTabConfig: {
                    treatments: [],
                    orderSetTreatments: [],
                    newOrderSet: "new order"
                }
            }
        }
        $scope.$apply();
        expect($scope.newOrderSet).toEqual("new order");
    });

    describe('CDSS alerts on drug orders', function () {
        it('should attach matched alerts to treatments and variable dose treatments when alerts arrive', function () {
            cdssService.sortInteractionsByStatus.and.callFake(function (alerts) { return alerts; });
            createController();
            $scope.consultation = {
                newlyAddedTabTreatments: {
                    allMedicationTabConfig: {
                        treatments: [{ drug: { uuid: 'drug-1', name: 'Drug One' } }],
                        orderSetTreatments: [],
                        newOrderSet: {}
                    }
                },
                variableDoseTreatments: [{ drug: { uuid: 'drug-2', name: 'Drug Two' } }]
            };
            $rootScope.$apply();

            $rootScope.cdssAlerts = [
                { uuid: 'alert-1', indicator: 'critical', referenceMedications: [{ coding: [{ code: 'drug-1', display: 'Drug One' }] }] },
                { uuid: 'alert-2', indicator: 'warning', referenceMedications: [{ coding: [{ code: 'drug-2', display: 'Drug Two' }] }] }
            ];
            $rootScope.$apply();

            expect($scope.treatments[0].alerts.length).toBe(1);
            expect($scope.treatments[0].alerts[0].uuid).toBe('alert-1');
            expect($scope.variableDoseTreatments[0].alerts.length).toBe(1);
            expect($scope.variableDoseTreatments[0].alerts[0].uuid).toBe('alert-2');
        });
    });

});
