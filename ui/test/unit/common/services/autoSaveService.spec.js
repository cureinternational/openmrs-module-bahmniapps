'use strict';

describe('autoSaveService', function () {
    var autoSaveService, intervalMock, appService, formDraftService, formDirtyStateService;

    beforeEach(module('bahmni.common.services'));

    beforeEach(function () {
        intervalMock = jasmine.createSpy('$interval').and.callFake(function (fn, delay) {
            intervalMock._registeredFn = fn;
            intervalMock._registeredDelay = delay;
            return {intervalId: delay};
        });
        intervalMock.cancel = jasmine.createSpy('cancel');

        appService = {
            getAppDescriptor: function () {
                return {
                    getConfigValue: function (key) {
                        if (key === 'autoSaveIntervalSeconds') return null;
                        return null;
                    }
                };
            }
        };

        formDraftService = {
            saveDraft: jasmine.createSpy('saveDraft').and.returnValue(Promise.resolve({data: {}}))
        };

        formDirtyStateService = {
            serializeFormData: jasmine.createSpy('serializeFormData').and.returnValue('{}')
        };

        module(function ($provide) {
            $provide.value('$interval', intervalMock);
            $provide.value('appService', appService);
            $provide.value('formDraftService', formDraftService);
            $provide.value('formDirtyStateService', formDirtyStateService);
        });

        inject(function (_autoSaveService_) {
            autoSaveService = _autoSaveService_;
            // Stop the interval started during service init to avoid interference
            autoSaveService.stopAutoSaveIntervalForTesting();
            intervalMock.calls.reset();
            intervalMock._registeredFn = null;
            intervalMock._registeredDelay = null;
        });
    });

    describe('interval management', function () {
        it('should use 15 minutes as the default interval', function () {
            autoSaveService.markObservationsAsDirty(true);
            expect(intervalMock._registeredDelay).toBe(15 * 60 * 1000);
        });

        it('should use configured interval when autoSaveIntervalSeconds is set', function () {
            appService.getAppDescriptor = function () {
                return {
                    getConfigValue: function (key) {
                        if (key === 'autoSaveIntervalSeconds') return 60;
                        return null;
                    }
                };
            };
            autoSaveService.markObservationsAsDirty(true);
            expect(intervalMock._registeredDelay).toBe(60 * 1000);
        });

        it('should start interval when isDirty becomes true', function () {
            autoSaveService.markObservationsAsDirty(false);
            expect(intervalMock.calls.count()).toBe(0);

            autoSaveService.markObservationsAsDirty(true);
            expect(intervalMock.calls.count()).toBe(1);
        });

        it('should stop interval when isDirty becomes false', function () {
            autoSaveService.markObservationsAsDirty(true);
            var intervalCallCount = intervalMock.calls.count();

            autoSaveService.markObservationsAsDirty(false);
            expect(intervalMock.cancel).toHaveBeenCalled();
        });

        it('should not start a second interval if one is already running', function () {
            autoSaveService.markObservationsAsDirty(true);
            var callCountAfterFirst = intervalMock.calls.count();

            autoSaveService.markObservationsAsDirty(true);
            expect(intervalMock.calls.count()).toBe(callCountAfterFirst);
        });

        it('should cancel the interval when stopAutoSaveIntervalForTesting is called', function () {
            autoSaveService.markObservationsAsDirty(true);
            autoSaveService.stopAutoSaveIntervalForTesting();
            expect(intervalMock.cancel).toHaveBeenCalled();
        });

        it('should cancel interval and mark as clean on stopAutoSave', function () {
            autoSaveService.markObservationsAsDirty(true);
            autoSaveService.stopAutoSave();
            expect(intervalMock.cancel).toHaveBeenCalled();
            expect(autoSaveService.getObservationFormState().isDirty).toBe(false);
        });

        it('should stop interval on subsequent isDirty ticks when form becomes clean', function () {
            autoSaveService.markObservationsAsDirty(true);
            autoSaveService.markObservationsAsDirty(false);
            expect(intervalMock.cancel).toHaveBeenCalled();
        });
    });

    describe('triggerAutoSave behavior', function () {
        it('should skip save if isDirty is false and stop interval', function () {
            autoSaveService.registerObservationForm({isDirty: false}, {uuid: 'p1'}, {uuid: 'pv1'}, {}, function() {});
            autoSaveService.markObservationsAsDirty(true);
            var saveCallback = jasmine.createSpy('saveCallback');
            autoSaveService.registerObservationForm({isDirty: false}, {uuid: 'p1'}, {uuid: 'pv1'}, {}, saveCallback);

            // Mark as clean
            autoSaveService.markObservationsAsDirty(false);
            // Simulate interval tick
            intervalMock._registeredFn();
            expect(intervalMock.cancel).toHaveBeenCalled();
        });

        it('should call saveCallback when controller is active', function () {
            var saveCallback = jasmine.createSpy('saveCallback');
            autoSaveService.registerObservationForm({isDirty: true}, {uuid: 'p1'}, {uuid: 'pv1'}, {}, saveCallback);
            autoSaveService.markObservationsAsDirty(true);

            intervalMock._registeredFn();
            expect(saveCallback).toHaveBeenCalled();
        });

        it('should perform direct save when controller is inactive', function () {
            autoSaveService.registerObservationForm({isDirty: true}, {uuid: 'p1'}, {uuid: 'pv1'}, {}, null);
            autoSaveService.markObservationsAsDirty(true);

            intervalMock._registeredFn();
            expect(formDraftService.saveDraft).toHaveBeenCalledWith('p1', 'pv1', '{}');
        });
    });

    describe('registerObservationForm / unregisterObservationForm', function () {
        it('should store formDraft, patient, and provider on register', function () {
            var formDraft = {isDirty: false};
            var patient = {uuid: 'p1'};
            var provider = {uuid: 'pv1'};

            autoSaveService.registerObservationForm(formDraft, patient, provider, {});
            var state = autoSaveService.getObservationFormState();

            expect(state.formDraft).toBe(formDraft);
            expect(state.patient).toBe(patient);
            expect(state.provider).toBe(provider);
        });

        it('should clear saveCallback on unregister but keep form state', function () {
            var callback = function () {};
            autoSaveService.registerObservationForm({isDirty: true}, {uuid: 'p1'}, {uuid: 'pv1'}, {}, callback);
            autoSaveService.unregisterObservationForm();
            var state = autoSaveService.getObservationFormState();

            expect(state.saveCallback).toBeNull();
            expect(state.patient).not.toBeNull();
            expect(state.provider).not.toBeNull();
        });

    });

    describe('markObservationsAsDirty', function () {
        it('should set isDirty to true and start interval', function () {
            autoSaveService.markObservationsAsDirty(true);
            expect(autoSaveService.getObservationFormState().isDirty).toBe(true);
            expect(intervalMock.calls.count()).toBe(1);
        });

        it('should set isDirty to false and stop interval', function () {
            autoSaveService.markObservationsAsDirty(true);
            autoSaveService.markObservationsAsDirty(false);
            expect(autoSaveService.getObservationFormState().isDirty).toBe(false);
            expect(intervalMock.cancel).toHaveBeenCalled();
        });

        it('should not re-start interval on multiple dirty calls', function () {
            autoSaveService.markObservationsAsDirty(true);
            var callCount = intervalMock.calls.count();

            autoSaveService.markObservationsAsDirty(true);
            expect(intervalMock.calls.count()).toBe(callCount);
        });
    });

    describe('directSave behavior', function () {
        it('should mark form as clean after successful direct save', function () {
            var successHandler;
            formDraftService.saveDraft.and.callFake(function () {
                return {
                    then: function (success, error) {
                        successHandler = success;
                        return { then: function () {} };
                    }
                };
            });

            autoSaveService.registerObservationForm({}, {uuid: 'p1'}, {uuid: 'pv1'}, {});
            autoSaveService.markObservationsAsDirty(true);

            // Simulate direct save
            intervalMock._registeredFn();

            // Trigger success callback
            successHandler({data: {}});

            expect(autoSaveService.getObservationFormState().isDirty).toBe(false);
        });
    });
});
