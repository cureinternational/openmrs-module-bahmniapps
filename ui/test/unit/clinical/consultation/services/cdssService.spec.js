describe('cdssService', function () {
    var consultationDataMock = {
        patient: {
            uuid: 'patient_uuid_here'
        },
        conditions: [
            {
                uuid: 'condition_uuid_1',
                status: 'CONFIRMED',
                concept: {
                    uuid: 'concept_uuid_1',
                    name: 'Condition Name 1'
                }
            }
        ],
        newlyAddedDiagnoses: [
            {
                uuid: 'diagnosis_uuid_1',
                certainty: 'CONFIRMED',
                codedAnswer: {
                    uuid: 'coded_answer_uuid_1',
                    name: 'Diagnosis Name 1'
                }
            },
            {
                uuid: 'diagnosis_uuid_2',
                certainty: 'CONFIRMED',
                codedAnswer: {
                    uuid: 'coded_answer_uuid_2',
                    name: 'Diagnosis Name 2'
                }
            }
        ],
        draftDrug: [
            {
                uuid: 'medication_uuid_1',
                drug: {
                    uuid: 'drug_uuid_1',
                    name: 'Drug Name 1'
                },
                instructions: 'Take once a day',
                effectiveStartDate: '2023-10-03T08:00:00Z',
                durationInDays: 7,
                durationUnit: 'DAYS',
                asNeeded: false,
                uniformDosingType: {
                    frequency: 'Once daily',
                    dose: 1
                },
                doseUnits: 'mg'
            }
        ]
    };

    var mockBundle = {
        "entry": [
            {
                "resource": {
                    "resourceType": "MedicationRequest",
                    "medicationCodeableConcept": {
                        "coding": [
                            {
                                "system": "dummySystem",
                                "code": "987654321",
                                "display": "Atorvastatin 10 mg oral tablet"
                            }
                        ],
                    }
                }
            },
            {
                "resource": {
                    "resourceType": "Condition",
                    "code": {
                        "coding": [{"system": "dummySystem", "code": "123456789", "display": "Asthma"}],
                        "text": "Asthma"
                    },
                    "subject": {"reference": "Patient/c3182a92-c3a9-415a-900d-178146c87062"}
                }
            }
        ]
    };

    var cdssService;
    var sentBundles = [];
    var treatmentService = jasmine.createSpyObj('treatmentService', ['getActiveDrugOrders']);
    treatmentService.getActiveDrugOrders.and.returnValue(Promise.resolve([]));
    var drugService = jasmine.createSpyObj('drugService', ['getDrugConceptSourceMapping', 'sendDiagnosisDrugBundle', 'getDrugById']);
    drugService.getDrugById.and.returnValue(Promise.resolve({}));
    drugService.sendDiagnosisDrugBundle.and.callFake(function (bundle) {
        sentBundles.push(bundle);
        return specUtil.respondWith({ data: [] });
    });
    drugService.getDrugConceptSourceMapping.and.callFake(function (drugUuid) {
        var system = 'http://example.com';
        if (drugUuid === 'drug_source_one_uuid') {
            system = 'http://source-one.example.org';
        } else if (drugUuid === 'drug_source_two_uuid') {
            system = 'http://source-two.example.org';
        }
        return specUtil.respondWith({
            data: {
                entry: [{
                    resource: {
                        code: {
                            coding: [{
                                system: system,
                                code: '12345',
                                display: 'Sample Drug'
                            }]
                        }
                    }
                }]
            }
        });
    });

    beforeEach(function () {
        sentBundles = [];
        module('bahmni.clinical');

        module(function ($provide) {
            $provide.value('drugService', drugService);
            $provide.value('treatmentService', treatmentService);
        });

        inject(['cdssService', '$rootScope', function (cdssServiceInjected, $rootScopeInjected) {
            cdssService = cdssServiceInjected;
            rootScope = $rootScopeInjected;
        }]);
    });

    it('Should feturn an object with parameters for cdss request', function () {
        var params = cdssService.createParams(consultationDataMock);
        expect(params.patient).toEqual(consultationDataMock.patient);
        expect(params.conditions).toEqual(consultationDataMock.conditions);
        expect(params.diagnosis).toEqual(consultationDataMock.newlyAddedDiagnoses);
        expect(params.medications).toEqual(consultationDataMock.draftDrug);
    });

    it('Should return saved diagnoses from current encounter in params for cdss request', function () {
        consultationDataMock.savedDiagnosesFromCurrentEncounter = [
            {
                uuid: 'saved_diagnosis_uuid_1',
                certainty: 'CONFIRMED',
                codedAnswer: {
                    uuid: 'saved_coded_answer_uuid_1',
                    name: 'Saved Diagnosis Name 1'
                }
            }
        ];
        var params = cdssService.createParams(consultationDataMock);
        expect(params.diagnosis.length).toEqual(3);
        expect(params.diagnosis[2]).toEqual(consultationDataMock.savedDiagnosesFromCurrentEncounter[0]);
        expect(params.medications).toEqual(consultationDataMock.draftDrug);
    });

    it('Should return condition from singular consultation.condition in params for cdss request', function () {
        consultationDataMock.condition = {
            concept: {
                uuid: 'singular_condition_concept_uuid_1',
                name: 'Singular Condition Name 1'
            }
        };
        var params = cdssService.createParams(consultationDataMock);
        expect(params.conditions.length).toEqual(2);
        expect(params.conditions[1]).toEqual(consultationDataMock.condition);
    });

    it('Should return a bundle of resources', function (done) {
        cdssService.createFhirBundle(consultationDataMock.patient, consultationDataMock.conditions, consultationDataMock.draftDrug, consultationDataMock.newlyAddedDiagnoses, 'http://example.com').then(function (fhirResult) {
            var bundle = fhirResult.bundle;
            expect(bundle.resourceType).toEqual('Bundle');
            expect(bundle.type).toEqual('collection');
            expect(bundle.entry.length).toEqual(3);
            expect(bundle.entry[0].resource.resourceType).toEqual('Condition');
            expect(bundle.entry[2].resource.resourceType).toEqual('MedicationRequest');
            done();
        });
    });

    it('Should add a coding from the resolved concept source for a diagnosis that only carries mappings', function (done) {
        var diagnoses = [
            {
                uuid: 'saved_diagnosis_uuid_1',
                certainty: 'CONFIRMED',
                codedAnswer: {
                    uuid: 'saved_coded_answer_uuid_1',
                    name: 'Asthma',
                    mappings: [
                        { source: 'External Source One', code: '195967001', name: 'Asthma' },
                        { source: 'External Source Two', code: 'J45.9', name: 'Asthma' }
                    ]
                }
            }
        ];
        cdssService.createFhirBundle(consultationDataMock.patient, [], [], diagnoses, 'http://example.com').then(function (fhirResult) {
            var bundle = fhirResult.bundle;
            var conditionResource = bundle.entry[0].resource;
            expect(conditionResource.resourceType).toEqual('Condition');
            expect(conditionResource.code.coding.length).toEqual(2);
            expect(conditionResource.code.coding[0]).toEqual({
                system: 'http://example.com',
                code: '195967001',
                display: 'Asthma'
            });
            expect(conditionResource.code.coding[1]).toEqual({
                system: undefined,
                code: 'saved_coded_answer_uuid_1',
                display: 'Asthma'
            });
            done();
        });
    });

    it('Should keep single uuid coding for a diagnosis without mappings', function (done) {
        var diagnoses = [
            {
                uuid: 'diagnosis_uuid_1',
                certainty: 'CONFIRMED',
                codedAnswer: {
                    uuid: 'coded_answer_uuid_1',
                    name: 'Diagnosis Name 1'
                }
            }
        ];
        cdssService.createFhirBundle(consultationDataMock.patient, [], [], diagnoses, 'http://example.com').then(function (fhirResult) {
            var bundle = fhirResult.bundle;
            var conditionResource = bundle.entry[0].resource;
            expect(conditionResource.code.coding.length).toEqual(1);
            expect(conditionResource.code.coding[0]).toEqual({
                system: undefined,
                code: 'coded_answer_uuid_1',
                display: 'Diagnosis Name 1'
            });
            done();
        });
    });

    it('Should not add a mapped coding for a diagnosis when no concept source has been resolved yet', function (done) {
        var diagnoses = [
            {
                uuid: 'saved_diagnosis_uuid_1',
                certainty: 'CONFIRMED',
                codedAnswer: {
                    uuid: 'saved_coded_answer_uuid_1',
                    name: 'Asthma',
                    mappings: [{ source: 'External Source One', code: '195967001', name: 'Asthma' }]
                }
            }
        ];
        cdssService.createFhirBundle(consultationDataMock.patient, [], [], diagnoses).then(function (fhirResult) {
            var bundle = fhirResult.bundle;
            var conditionResource = bundle.entry[0].resource;
            expect(conditionResource.code.coding.length).toEqual(1);
            expect(conditionResource.code.coding[0].code).toEqual('saved_coded_answer_uuid_1');
            expect(fhirResult.conceptSource).toEqual('');
            done();
        });
    });

    it('Should resolve the concept source from a newly added medication and use it for diagnoses', function (done) {
        var diagnoses = [
            {
                uuid: 'saved_diagnosis_uuid_1',
                certainty: 'CONFIRMED',
                codedAnswer: {
                    uuid: 'saved_coded_answer_uuid_1',
                    name: 'Asthma',
                    mappings: [{ source: 'External Source One', code: '195967001', name: 'Asthma' }]
                }
            }
        ];
        var medications = [
            {
                uuid: 'medication_uuid_1',
                drug: {
                    uuid: 'drug_uuid_1',
                    name: 'Propranolol',
                    drugReferenceMaps: [
                        {
                            conceptReferenceTerm: {
                                code: '55745002',
                                display: 'External Source: 55745002 (Propranolol)'
                            }
                        }
                    ]
                },
                instructions: 'Before meals',
                effectiveStartDate: '2023-10-03T08:00:00Z',
                durationInDays: 7,
                durationUnit: 'DAYS',
                asNeeded: false,
                uniformDosingType: { frequency: 'Once a day', dose: 1 },
                doseUnits: 'mg'
            }
        ];
        cdssService.createFhirBundle(consultationDataMock.patient, [], medications, diagnoses).then(function (fhirResult) {
            var bundle = fhirResult.bundle;
            var conditionResource = bundle.entry[0].resource;
            expect(conditionResource.resourceType).toEqual('Condition');
            expect(conditionResource.code.coding[0]).toEqual({
                system: 'http://example.com',
                code: '195967001',
                display: 'Asthma'
            });
            expect(fhirResult.conceptSource).toEqual('http://example.com');
            done();
        });
    });

    it('Should not let a concept source resolved for one bundle bleed into the next bundle', function (done) {
        var diagnosesWithMappings = [
            {
                uuid: 'saved_diagnosis_uuid_1',
                certainty: 'CONFIRMED',
                codedAnswer: {
                    uuid: 'saved_coded_answer_uuid_1',
                    name: 'Asthma',
                    mappings: [{ source: 'External Source One', code: '195967001', name: 'Asthma' }]
                }
            }
        ];
        var medications = [
            {
                uuid: 'medication_uuid_1',
                drug: {
                    uuid: 'drug_uuid_1',
                    name: 'Propranolol',
                    drugReferenceMaps: [
                        {
                            conceptReferenceTerm: {
                                code: '55745002',
                                display: 'External Source: 55745002 (Propranolol)'
                            }
                        }
                    ]
                },
                instructions: 'Before meals',
                effectiveStartDate: '2023-10-03T08:00:00Z',
                durationInDays: 7,
                durationUnit: 'DAYS',
                asNeeded: false,
                uniformDosingType: { frequency: 'Once a day', dose: 1 },
                doseUnits: 'mg'
            }
        ];
        cdssService.createFhirBundle(consultationDataMock.patient, [], medications, diagnosesWithMappings).then(function (firstResult) {
            expect(firstResult.conceptSource).toEqual('http://example.com');
            return cdssService.createFhirBundle(consultationDataMock.patient, [], [], diagnosesWithMappings);
        }).then(function (secondResult) {
            expect(secondResult.conceptSource).toEqual('');
            expect(secondResult.bundle.entry[0].resource.code.coding.length).toEqual(1);
            expect(secondResult.bundle.entry[0].resource.code.coding[0].code).toEqual('saved_coded_answer_uuid_1');
            done();
        });
    });

    it('Should use the concept source of the first medication in the list when several medications map to different systems', function (done) {
        var diagnoses = [
            {
                uuid: 'saved_diagnosis_uuid_1',
                certainty: 'CONFIRMED',
                codedAnswer: {
                    uuid: 'saved_coded_answer_uuid_1',
                    name: 'Asthma',
                    mappings: [{ source: 'External Source One', code: '195967001', name: 'Asthma' }]
                }
            }
        ];
        var medications = [
            {
                uuid: 'medication_uuid_1',
                drug: {
                    uuid: 'drug_source_one_uuid',
                    name: 'Propranolol',
                    drugReferenceMaps: [{ conceptReferenceTerm: { code: '55745002', display: 'Source One: 55745002 (Propranolol)' } }]
                },
                instructions: 'Before meals',
                effectiveStartDate: '2023-10-03T08:00:00Z',
                durationInDays: 7,
                durationUnit: 'DAYS',
                asNeeded: false,
                uniformDosingType: { frequency: 'Once a day', dose: 1 },
                doseUnits: 'mg'
            },
            {
                uuid: 'medication_uuid_2',
                drug: {
                    uuid: 'drug_source_two_uuid',
                    name: 'Salbutamol',
                    drugReferenceMaps: [{ conceptReferenceTerm: { code: 'J45.9', display: 'Source Two: J45.9 (Salbutamol)' } }]
                },
                instructions: 'When required',
                effectiveStartDate: '2023-10-03T08:00:00Z',
                durationInDays: 7,
                durationUnit: 'DAYS',
                asNeeded: true,
                uniformDosingType: { frequency: 'Once a day', dose: 1 },
                doseUnits: 'mg'
            }
        ];
        cdssService.createFhirBundle(consultationDataMock.patient, [], medications, diagnoses).then(function (fhirResult) {
            var bundle = fhirResult.bundle;
            var conditionResource = bundle.entry[0].resource;
            expect(conditionResource.code.coding[0]).toEqual({
                system: 'http://source-one.example.org',
                code: '195967001',
                display: 'Asthma'
            });
            expect(fhirResult.conceptSource).toEqual('http://source-one.example.org');
            done();
        });
    });

    it('Should not resolve a concept source from a diagnosis that carries mappings on its own', function (done) {
        var consultation = angular.copy(consultationDataMock);
        consultation.patient = { uuid: 'patient_uuid_here' };
        consultation.conditions = [];
        consultation.newlyAddedDiagnoses = [
            {
                uuid: 'saved_diagnosis_uuid_1',
                certainty: 'CONFIRMED',
                codedAnswer: {
                    uuid: 'saved_coded_answer_uuid_1',
                    name: 'Asthma',
                    mappings: [{ source: 'External Source One', code: '195967001', name: 'Asthma' }]
                }
            }
        ];
        consultation.savedDiagnosesFromCurrentEncounter = [];
        consultation.condition = null;
        consultation.newlyAddedTabTreatments = { allMedicationTabConfig: { treatments: [], orderSetTreatments: [] } };
        cdssService.getAlerts(true, consultation, consultation.patient);
        setTimeout(function () {
            var sentBundle = sentBundles[sentBundles.length - 1];
            expect(sentBundle.entry.length).toEqual(1);
            var conditionResource = sentBundle.entry[0].resource;
            expect(conditionResource.resourceType).toEqual('Condition');
            expect(conditionResource.code.coding.length).toEqual(1);
            expect(conditionResource.code.coding[0].code).toEqual('saved_coded_answer_uuid_1');
            done();
        }, 0);
    });

    it('Should prefer the reference term code over a polluted display', function (done) {
        var medications = [
            {
                uuid: 'medication_uuid_1',
                drug: {
                    uuid: 'drug_uuid_1',
                    name: 'Propranolol',
                    drugReferenceMaps: [
                        {
                            conceptReferenceTerm: {
                                code: '55745002',
                                display: 'External Source: 55745002 (Propranolol)'
                            }
                        }
                    ]
                },
                instructions: 'Before meals',
                effectiveStartDate: '2023-10-03T08:00:00Z',
                durationInDays: 7,
                durationUnit: 'DAYS',
                asNeeded: false,
                uniformDosingType: { frequency: 'Once a day', dose: 1 },
                doseUnits: 'mg'
            }
        ];
        cdssService.createFhirBundle(consultationDataMock.patient, [], medications, [], 'http://example.com').then(function (fhirResult) {
            var medicationRequest = fhirResult.bundle.entry[0].resource;
            expect(medicationRequest.resourceType).toEqual('MedicationRequest');
            expect(medicationRequest.medicationCodeableConcept.coding[0]).toEqual({
                system: 'http://example.com',
                code: '55745002',
                display: 'Propranolol'
            });
            done();
        });
    });

    it('Should fall back to the reference term display convention when no code is returned', function (done) {
        var medications = [
            {
                uuid: 'medication_uuid_1',
                drug: {
                    uuid: 'drug_uuid_1',
                    name: 'Sample Drug',
                    drugReferenceMaps: [
                        {
                            conceptReferenceTerm: {
                                display: 'External Source: 12345'
                            }
                        }
                    ]
                },
                instructions: 'Before meals',
                effectiveStartDate: '2023-10-03T08:00:00Z',
                durationInDays: 7,
                durationUnit: 'DAYS',
                asNeeded: false,
                uniformDosingType: { frequency: 'Once a day', dose: 1 },
                doseUnits: 'mg'
            }
        ];
        cdssService.createFhirBundle(consultationDataMock.patient, [], medications, [], 'http://example.com').then(function (fhirResult) {
            var medicationRequest = fhirResult.bundle.entry[0].resource;
            expect(medicationRequest.medicationCodeableConcept.coding[0]).toEqual({
                system: 'http://example.com',
                code: '12345',
                display: 'Sample Drug'
            });
            done();
        });
    });

    it('Should strip a trailing parenthetical from the display when no code is returned', function (done) {
        var medications = [
            {
                uuid: 'medication_uuid_1',
                drug: {
                    uuid: 'drug_uuid_1',
                    name: 'Propranolol',
                    drugReferenceMaps: [
                        {
                            conceptReferenceTerm: {
                                display: 'External Source: 55745002 (Propranolol)'
                            }
                        }
                    ]
                },
                instructions: 'Before meals',
                effectiveStartDate: '2023-10-03T08:00:00Z',
                durationInDays: 7,
                durationUnit: 'DAYS',
                asNeeded: false,
                uniformDosingType: { frequency: 'Once a day', dose: 1 },
                doseUnits: 'mg'
            }
        ];
        cdssService.createFhirBundle(consultationDataMock.patient, [], medications, [], 'http://example.com').then(function (fhirResult) {
            var medicationRequest = fhirResult.bundle.entry[0].resource;
            expect(medicationRequest.medicationCodeableConcept.coding[0]).toEqual({
                system: 'http://example.com',
                code: '55745002',
                display: 'Propranolol'
            });
            done();
        });
    });

    it('Should return an array of alerts sorted by status', function () {
        var alerts = [
            {
                uuid: 'alert_uuid_1',
                indicator: 'warning',
                isActive: false,
                detail: 'Alert Detail 1',
                source: {
                    url: 'http://example.com'
                }
            },
            {
                uuid: 'alert_uuid_2',
                indicator: 'critical',
                isActive: true,
                detail: 'Alert Detail 2',
                source: {
                    url: 'http://example.com'
                }
            },
            {
                uuid: 'alert_uuid_3',
                indicator: 'info',
                isActive: true,
                detail: 'Alert Detail 3',
                source: {
                    url: 'http://example.com'
                }
            }
        ];
        var sortedAlerts = cdssService.sortInteractionsByStatus(alerts);
        expect(sortedAlerts[0].indicator).toEqual('critical');
        expect(sortedAlerts[1].indicator).toEqual('warning');
        expect(sortedAlerts[2].indicator).toEqual('info');
    });

    it('Should return alerts with active status when new alerts present in bundle', function () {
        var newAlerts = [
            {
                uuid: 'alert_uuid_1',
                indicator: 'warning',
                isActive: false,
                detail: 'Alert Detail 1',
                source: {
                    url: 'http://example.com'
                },
                "referenceMedications": [
                    {
                        "coding": [
                            {
                                "system": "http://snomed.info/sct",
                                "code": "987654321",
                                "display": "Placeholder Medication1"
                            },
                            {
                                "system": "https://example.com",
                                "code": "987654321",
                                "display": "Placeholder Medication1"
                            }
                        ]
                    },
                    {
                        "coding": [
                            {
                                "system": "http://snomed.info/sct",
                                "code": "987654320",
                                "display": "Placeholder Medication2"
                            },
                            {
                                "system": "https://example.com",
                                "code": "987654320",
                                "display": "Placeholder Medication2"
                            }
                        ]
                    }
                ],
                "referenceConditions": [{
                    "coding": [
                        {
                            "system": "https://example.com",
                            "code": "123456789",
                            "display": "Placeholder Condition1"
                        },
                        {
                            "system": "http://snomed.info/sct",
                            "code": "123456789",
                            "display": "Placeholder Condition1"
                        }
                    ]
                },
                    {
                        "coding": [
                            {
                                "system": "https://example.com",
                                "code": "1234567890",
                                "display": "Placeholder Condition2"
                            },
                            {
                                "system": "http://snomed.info/sct",
                                "code": "1234567890",
                                "display": "Placeholder Condition2"
                            }
                        ]
                    }]
            }
        ];
        var currentAlert = [
        ];
        var updatedAlerts = cdssService.addNewAlerts(newAlerts, currentAlert, mockBundle);
        expect(updatedAlerts.length).toEqual(1);
        expect(updatedAlerts[0].isActive).toEqual(true);
    });
    it('Should return alerts with inactive status when alerts are already dismissed for the resources present in bundle', function () {
        var newAlerts = [
            {
                uuid: 'alert_uuid_1',
                indicator: 'warning',
                isActive: false,
                detail: 'Alert Detail 1',
                source: {
                    url: 'http://example.com'
                },
                "referenceMedications": [
                    {
                        "coding": [
                            {
                                "system": "http://snomed.info/sct",
                                "code": "987654321",
                                "display": "Placeholder Medication1"
                            },
                            {
                                "system": "https://example.com",
                                "code": "987654321",
                                "display": "Placeholder Medication1"
                            }
                        ]
                    },
                    {
                        "coding": [
                            {
                                "system": "http://snomed.info/sct",
                                "code": "987654320",
                                "display": "Placeholder Medication2"
                            },
                            {
                                "system": "https://example.com",
                                "code": "987654320",
                                "display": "Placeholder Medication2"
                            }
                        ]
                    }
                ],
                "referenceConditions": [{
                    "coding": [
                        {
                            "system": "https://example.com",
                            "code": "123456789",
                            "display": "Placeholder Condition1"
                        },
                        {
                            "system": "http://snomed.info/sct",
                            "code": "123456789",
                            "display": "Placeholder Condition1"
                        }
                    ]
                },
                    {
                        "coding": [
                            {
                                "system": "https://example.com",
                                "code": "1234567890",
                                "display": "Placeholder Condition2"
                            },
                            {
                                "system": "http://snomed.info/sct",
                                "code": "1234567890",
                                "display": "Placeholder Condition2"
                            }
                        ]
                    }]
            }
        ];
        var currentAlert = [
            {
                uuid: 'alert_uuid_1',
                indicator: 'warning',
                isActive: false,
                detail: 'Alert Detail 1',
                source: {
                    url: 'http://example.com'
                },
                "referenceMedications": [
                    {
                        "coding": [
                            {
                                "system": "http://snomed.info/sct",
                                "code": "987654321",
                                "display": "Placeholder Medication1"
                            },
                            {
                                "system": "https://example.com",
                                "code": "987654321",
                                "display": "Placeholder Medication1"
                            }
                        ]
                    },
                    {
                        "coding": [
                            {
                                "system": "http://snomed.info/sct",
                                "code": "987654320",
                                "display": "Placeholder Medication2"
                            },
                            {
                                "system": "https://example.com",
                                "code": "987654320",
                                "display": "Placeholder Medication2"
                            }
                        ]
                    }
                ],
                "referenceConditions": [{
                    "coding": [
                        {
                            "system": "https://example.com",
                            "code": "123456789",
                            "display": "Placeholder Condition1"
                        },
                        {
                            "system": "http://snomed.info/sct",
                            "code": "123456789",
                            "display": "Placeholder Condition1"
                        }
                    ]
                },
                    {
                        "coding": [
                            {
                                "system": "https://example.com",
                                "code": "1234567890",
                                "display": "Placeholder Condition2"
                            },
                            {
                                "system": "http://snomed.info/sct",
                                "code": "1234567890",
                                "display": "Placeholder Condition2"
                            }
                        ]
                    }]
            }
        ];
        var updatedAlerts = cdssService.addNewAlerts(newAlerts, currentAlert, mockBundle);
        expect(updatedAlerts.length).toEqual(1);
        expect(updatedAlerts[0].isActive).toEqual(false);
    });
    it('Should return alerts with active status when current alerts are  active for the resources present in bundle', function () {
        var newAlerts = [
            {
                uuid: 'alert_uuid_1',
                indicator: 'warning',
                isActive: false,
                detail: 'Alert Detail 1',
                source: {
                    url: 'http://example.com'
                },
                "referenceMedications": [
                    {
                        "coding": [
                            {
                                "system": "http://snomed.info/sct",
                                "code": "987654321",
                                "display": "Placeholder Medication1"
                            },
                            {
                                "system": "https://example.com",
                                "code": "987654321",
                                "display": "Placeholder Medication1"
                            }
                        ]
                    },
                    {
                        "coding": [
                            {
                                "system": "http://snomed.info/sct",
                                "code": "987654320",
                                "display": "Placeholder Medication2"
                            },
                            {
                                "system": "https://example.com",
                                "code": "987654320",
                                "display": "Placeholder Medication2"
                            }
                        ]
                    }
                ],
                "referenceConditions": [{
                    "coding": [
                        {
                            "system": "https://example.com",
                            "code": "123456789",
                            "display": "Placeholder Condition1"
                        },
                        {
                            "system": "http://snomed.info/sct",
                            "code": "123456789",
                            "display": "Placeholder Condition1"
                        }
                    ]
                },
                    {
                        "coding": [
                            {
                                "system": "https://example.com",
                                "code": "1234567890",
                                "display": "Placeholder Condition2"
                            },
                            {
                                "system": "http://snomed.info/sct",
                                "code": "1234567890",
                                "display": "Placeholder Condition2"
                            }
                        ]
                    }]
            }
        ];
        var currentAlert = [
            {
                uuid: 'alert_uuid_1',
                indicator: 'warning',
                isActive: true,
                detail: 'Alert Detail 1',
                source: {
                    url: 'http://example.com'
                },
                "referenceMedications": [
                    {
                        "coding": [
                            {
                                "system": "http://snomed.info/sct",
                                "code": "987654321",
                                "display": "Placeholder Medication1"
                            },
                            {
                                "system": "https://example.com",
                                "code": "987654321",
                                "display": "Placeholder Medication1"
                            }
                        ]
                    },
                    {
                        "coding": [
                            {
                                "system": "http://snomed.info/sct",
                                "code": "987654320",
                                "display": "Placeholder Medication2"
                            },
                            {
                                "system": "https://example.com",
                                "code": "987654320",
                                "display": "Placeholder Medication2"
                            }
                        ]
                    }
                ],
                "referenceConditions": [{
                    "coding": [
                        {
                            "system": "https://example.com",
                            "code": "123456789",
                            "display": "Placeholder Condition1"
                        },
                        {
                            "system": "http://snomed.info/sct",
                            "code": "123456789",
                            "display": "Placeholder Condition1"
                        }
                    ]
                },
                    {
                        "coding": [
                            {
                                "system": "https://example.com",
                                "code": "1234567890",
                                "display": "Placeholder Condition2"
                            },
                            {
                                "system": "http://snomed.info/sct",
                                "code": "1234567890",
                                "display": "Placeholder Condition2"
                            }
                        ]
                    }]
            }
        ];
        var updatedAlerts = cdssService.addNewAlerts(newAlerts, currentAlert, mockBundle);
        expect(updatedAlerts.length).toEqual(1);
        expect(updatedAlerts[0].isActive).toEqual(true);
    });

    describe('getAlerts after save', function () {
        var savedOrder = {
            uuid: 'saved_order_uuid',
            drug: {uuid: 'drug_uuid_1', name: 'Drug Name 1'},
            drugNameDisplay: 'Drug Name 1',
            instructions: 'Take once a day',
            effectiveStartDate: '2023-10-03T08:00:00Z',
            durationInDays: 7,
            asNeeded: false,
            uniformDosingType: {frequency: 'Once daily', dose: 1},
            doseUnits: 'mg'
        };
        var existing = [{uuid: 'a1', isActive: true, detail: 'x', summary: 'x', indicator: 'critical'}];
        var consultationWithSavedOrder = function (orders) {
            return {
                conditions: [],
                newlyAddedDiagnoses: [],
                newlyAddedTabTreatments: {allMedicationTabConfig: {treatments: [], orderSetTreatments: []}},
                activeAndScheduledDrugOrders: orders
            };
        };

        beforeEach(function () {
            drugService.sendDiagnosisDrugBundle.calls.reset();
            treatmentService.getActiveDrugOrders.calls.reset();
            treatmentService.getActiveDrugOrders.and.returnValue(Promise.resolve([]));
            rootScope.cdssAlerts = existing;
        });

        it('should fetch active orders from the server when the consultation has none', function (done) {
            var contract = {uuid: 'srv_order', drug: {uuid: 'drug_uuid_1', name: 'Drug Name 1'}, dosingInstructions: {dose: 1, doseUnits: 'mg', frequency: 'Once a day'}};
            treatmentService.getActiveDrugOrders.and.returnValue(Promise.resolve([contract]));
            spyOn(Bahmni.Clinical.DrugOrderViewModel, 'createFromContract').and.returnValue(savedOrder);
            drugService.sendDiagnosisDrugBundle.and.returnValue(Promise.resolve({data: [{uuid: 'a2', detail: 'y', summary: 'y'}]}));
            var consultation = consultationWithSavedOrder(undefined);
            delete consultation.activeAndScheduledDrugOrders;
            cdssService.getAlerts(true, consultation, {uuid: 'p1'}).then(function () {
                expect(treatmentService.getActiveDrugOrders).toHaveBeenCalledWith('p1');
                var bundle = drugService.sendDiagnosisDrugBundle.calls.mostRecent().args[0];
                expect(bundle.entry.some(function (e) { return e.resource.resourceType === 'MedicationRequest'; })).toBe(true);
                done();
            });
        });

        it('should add SNOMED reference maps to saved orders that lack them', function (done) {
            drugService.getDrugById.and.returnValue(Promise.resolve({drugReferenceMaps: [{conceptReferenceTerm: {code: '12345'}}]}));
            drugService.getDrugConceptSourceMapping.and.returnValue(Promise.resolve({data: {entry: [{resource: {code: {coding: [{system: 'http://snomed.info/sct'}]}}}]}}));
            drugService.sendDiagnosisDrugBundle.and.returnValue(Promise.resolve({data: []}));
            cdssService.getAlerts(true, consultationWithSavedOrder([savedOrder]), {uuid: 'p1'}).then(function () {
                expect(drugService.getDrugById).toHaveBeenCalledWith('drug_uuid_1');
                var bundle = drugService.sendDiagnosisDrugBundle.calls.mostRecent().args[0];
                var request = bundle.entry.filter(function (e) { return e.resource.resourceType === 'MedicationRequest'; })[0].resource;
                expect(request.medicationCodeableConcept.coding[0]).toEqual({system: 'http://snomed.info/sct', code: '12345', display: 'Drug Name 1'});
                done();
            });
        });

        it('should not send variable-dose orders (no uniform frequency) to CDSS', function (done) {
            drugService.sendDiagnosisDrugBundle.and.returnValue(Promise.resolve({data: []}));
            var variableOrder = angular.extend({}, savedOrder, {uuid: 'vdp_order', uniformDosingType: {}});
            cdssService.getAlerts(true, consultationWithSavedOrder([variableOrder]), {uuid: 'p1'}).then(function () {
                var bundle = drugService.sendDiagnosisDrugBundle.calls.count() ? drugService.sendDiagnosisDrugBundle.calls.mostRecent().args[0] : {entry: []};
                expect(bundle.entry.some(function (e) { return e.resource.resourceType === 'MedicationRequest'; })).toBe(false);
                done();
            });
        });

        it('should not fetch active orders when the consultation already has them', function (done) {
            treatmentService.getActiveDrugOrders.calls.reset();
            drugService.sendDiagnosisDrugBundle.and.returnValue(Promise.resolve({data: []}));
            cdssService.getAlerts(true, consultationWithSavedOrder([savedOrder]), {uuid: 'p1'}).then(function () {
                expect(treatmentService.getActiveDrugOrders).not.toHaveBeenCalled();
                done();
            });
        });

        it('should fetch active orders from the server when the consultation has an empty list', function (done) {
            var contract = {uuid: 'srv_order', drug: {uuid: 'drug_uuid_1', name: 'Drug Name 1'}, dosingInstructions: {dose: 1, doseUnits: 'mg', frequency: 'Once a day'}};
            treatmentService.getActiveDrugOrders.and.returnValue(Promise.resolve([contract]));
            spyOn(Bahmni.Clinical.DrugOrderViewModel, 'createFromContract').and.returnValue(savedOrder);
            drugService.sendDiagnosisDrugBundle.and.returnValue(Promise.resolve({data: []}));
            cdssService.getAlerts(true, consultationWithSavedOrder([]), {uuid: 'p1'}).then(function () {
                expect(treatmentService.getActiveDrugOrders).toHaveBeenCalledWith('p1');
                var bundle = drugService.sendDiagnosisDrugBundle.calls.mostRecent().args[0];
                expect(bundle.entry.some(function (e) { return e.resource.resourceType === 'MedicationRequest'; })).toBe(true);
                done();
            });
        });

        it('should skip CDSS and keep existing alerts when fetching active orders fails', function (done) {
            treatmentService.getActiveDrugOrders.and.returnValue(Promise.reject(new Error('network')));
            var consultation = consultationWithSavedOrder(undefined);
            delete consultation.activeAndScheduledDrugOrders;
            consultation.newlyAddedDiagnoses = [{codedAnswer: {uuid: 'd1', name: 'Glaucoma', mappings: [{code: '23986001'}]}}];
            cdssService.getAlerts(true, consultation, {uuid: 'p1'}).then(function () {
                expect(drugService.sendDiagnosisDrugBundle).not.toHaveBeenCalled();
                expect(rootScope.cdssAlerts).toBe(existing);
                done();
            });
        });

        it('should skip CDSS and keep existing alerts when fetching active orders fails after save', function (done) {
            treatmentService.getActiveDrugOrders.and.returnValue(Promise.reject(new Error('network')));
            var consultation = consultationWithSavedOrder(undefined);
            delete consultation.activeAndScheduledDrugOrders;
            cdssService.getAlerts(true, consultation, {uuid: 'p1'}, true).then(function () {
                expect(drugService.sendDiagnosisDrugBundle).not.toHaveBeenCalled();
                expect(rootScope.cdssAlerts).toBe(existing);
                done();
            });
        });

        it('should still send the diagnosis when the fetch succeeds but the patient has no active orders', function (done) {
            drugService.sendDiagnosisDrugBundle.and.returnValue(Promise.resolve({data: []}));
            var consultation = consultationWithSavedOrder([]);
            consultation.newlyAddedDiagnoses = [{codedAnswer: {uuid: 'd1', name: 'Glaucoma', mappings: [{code: '23986001'}]}}];
            cdssService.getAlerts(true, consultation, {uuid: 'p1'}).then(function () {
                expect(drugService.sendDiagnosisDrugBundle).toHaveBeenCalled();
                done();
            });
        });

        it('should send saved orders as MedicationRequest', function (done) {
            drugService.sendDiagnosisDrugBundle.and.returnValue(Promise.resolve({data: [{uuid: 'a2', detail: 'y', summary: 'y'}]}));
            cdssService.getAlerts(true, consultationWithSavedOrder([savedOrder]), {uuid: 'p1'}, true).then(function () {
                var bundle = drugService.sendDiagnosisDrugBundle.calls.mostRecent().args[0];
                expect(bundle.entry.length).toBe(1);
                expect(bundle.entry[0].resource.resourceType).toBe('MedicationRequest');
                expect(bundle.entry[0].resource.id).toBe('saved_order_uuid');
                done();
            });
        });

        it('should not call CDSS or clear alerts when nothing but the patient is available', function (done) {
            cdssService.getAlerts(true, consultationWithSavedOrder([]), {uuid: 'p1'}, true).then(function () {
                expect(drugService.sendDiagnosisDrugBundle).not.toHaveBeenCalled();
                expect(rootScope.cdssAlerts).toBe(existing);
                done();
            });
        });

        it('should keep existing alerts when post-save response is empty', function (done) {
            drugService.sendDiagnosisDrugBundle.and.returnValue(Promise.resolve({data: []}));
            cdssService.getAlerts(true, consultationWithSavedOrder([savedOrder]), {uuid: 'p1'}, true).then(function () {
                expect(rootScope.cdssAlerts).toBe(existing);
                done();
            });
        });

        it('should ignore discontinued and voided saved orders', function (done) {
            var orders = [angular.extend({}, savedOrder, {action: 'DISCONTINUE'}), angular.extend({}, savedOrder, {uuid: 'v', voided: true})];
            cdssService.getAlerts(true, consultationWithSavedOrder(orders), {uuid: 'p1'}, true).then(function () {
                expect(drugService.sendDiagnosisDrugBundle).not.toHaveBeenCalled();
                done();
            });
        });

        it('should include saved orders before save so a new diagnosis is checked against them', function (done) {
            drugService.sendDiagnosisDrugBundle.and.returnValue(Promise.resolve({data: []}));
            var consultation = consultationWithSavedOrder([savedOrder]);
            consultation.newlyAddedDiagnoses = [{codedAnswer: {uuid: 'd1', name: 'Glaucoma', mappings: [{code: '23986001'}]}}];
            cdssService.getAlerts(true, consultation, {uuid: 'p1'}).then(function () {
                var types = drugService.sendDiagnosisDrugBundle.calls.mostRecent().args[0].entry.map(function (e) {
                    return e.resource.resourceType;
                });
                expect(types).toContain('MedicationRequest');
                expect(types).toContain('Condition');
                done();
            });
        });

        it('should still replace alerts with an empty response before save', function (done) {
            drugService.sendDiagnosisDrugBundle.and.returnValue(Promise.resolve({data: []}));
            cdssService.getAlerts(true, consultationWithSavedOrder([savedOrder]), {uuid: 'p1'}).then(function () {
                expect(rootScope.cdssAlerts).toEqual([]);
                done();
            });
        });
    });

    describe('removeAlertsForDrug', function () {
        var drugAlert = {
            uuid: 'alert_1',
            referenceMedications: [{
                coding: [{code: 'drug_uuid_1', display: 'Drug Name 1'}]
            }]
        };
        var otherAlert = {
            uuid: 'alert_2',
            referenceMedications: [{
                coding: [{code: 'drug_uuid_2', display: 'Drug Name 2'}]
            }]
        };

        beforeEach(function () {
            rootScope.cdssAlerts = [drugAlert, otherAlert];
        });

        it('removes alerts that reference the drug by uuid', function () {
            var removed = cdssService.removeAlertsForDrug({uuid: 'drug_uuid_1', name: 'Some other name'});
            expect(removed).toEqual([drugAlert]);
            expect(rootScope.cdssAlerts).toEqual([otherAlert]);
        });

        it('removes alerts that reference the drug by display name', function () {
            var removed = cdssService.removeAlertsForDrug({name: 'Drug Name 1'});
            expect(removed).toEqual([drugAlert]);
            expect(rootScope.cdssAlerts).toEqual([otherAlert]);
        });

        it('restores removed alerts without duplicating existing ones', function () {
            var removed = cdssService.removeAlertsForDrug({uuid: 'drug_uuid_1'});
            cdssService.restoreAlerts(removed);
            cdssService.restoreAlerts(removed);
            expect(rootScope.cdssAlerts).toEqual([otherAlert, drugAlert]);
        });
    });
});
