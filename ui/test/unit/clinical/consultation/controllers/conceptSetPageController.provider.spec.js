'use strict';

describe('ConceptSetPageController - Provider Field Dirty State', function () {
    var formDirtyStateService;

    beforeEach(function () {
        module('bahmni.clinical');

        inject(function (_formDirtyStateService_) {
            formDirtyStateService = _formDirtyStateService_;
        });
    });

    describe('Dirty tracking with provider fields', function () {
        it('should detect when provider uuid changes', function () {
            var template = {
                observations: [{
                    concept: {uuid: 'provider-concept-uuid'},
                    value: {uuid: 'provider-uuid-1'}
                }]
            };

            var cleanState = formDirtyStateService.getObsValues([template]);

            // Change provider uuid
            template.observations[0].value = {uuid: 'provider-uuid-2'};
            var dirtyState = formDirtyStateService.getObsValues([template]);

            expect(dirtyState).not.toBe(cleanState);
        });

        it('should not mark dirty when provider metadata changes but uuid stays same', function () {
            var template = {
                observations: [{
                    concept: {uuid: 'provider-concept-uuid'},
                    value: {uuid: 'provider-uuid', name: 'Dr. Smith', id: 123}
                }]
            };

            var cleanState = formDirtyStateService.getObsValues([template]);

            // Only change name (metadata)
            template.observations[0].value = {uuid: 'provider-uuid', name: 'Dr. John Smith', id: 123};
            var currentState = formDirtyStateService.getObsValues([template]);

            expect(currentState).toBe(cleanState);
        });

        it('should handle string provider values', function () {
            var template = {
                observations: [{
                    concept: {uuid: 'provider-concept-uuid'},
                    value: '123'
                }]
            };

            var cleanState = formDirtyStateService.getObsValues([template]);

            // Keep same value
            template.observations[0].value = '123';
            var currentState = formDirtyStateService.getObsValues([template]);

            expect(currentState).toBe(cleanState);
        });

        it('should detect when string provider value changes', function () {
            var template = {
                observations: [{
                    concept: {uuid: 'provider-concept-uuid'},
                    value: '123'
                }]
            };

            var cleanState = formDirtyStateService.getObsValues([template]);

            // Change value
            template.observations[0].value = '456';
            var dirtyState = formDirtyStateService.getObsValues([template]);

            expect(dirtyState).not.toBe(cleanState);
        });

        it('should handle multiple provider observations', function () {
            var template = {
                observations: [
                    {
                        concept: {uuid: 'surgeon-uuid'},
                        value: {uuid: 'surgeon-uuid-1'}
                    },
                    {
                        concept: {uuid: 'anesthetist-uuid'},
                        value: {uuid: 'anesthetist-uuid-1'}
                    }
                ]
            };

            var cleanState = formDirtyStateService.getObsValues([template]);

            // Change one provider uuid
            template.observations[0].value = {uuid: 'surgeon-uuid-2'};
            var dirtyState = formDirtyStateService.getObsValues([template]);

            expect(dirtyState).not.toBe(cleanState);
        });
    });
});
