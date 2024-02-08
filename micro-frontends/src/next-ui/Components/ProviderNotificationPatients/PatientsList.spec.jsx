import React from 'react';
import { render, waitFor } from '@testing-library/react';
import PatientsList from './PatientsList';

const mockGetEmergencyDrugAcknowledgements = jest.fn();

const mockData = [
  {
    "identifier": "ET904706",
    "name": "Hanif Oreo",
    "gender": "M",
    "patient_uuid": "a319d19c-03bd-425e-83ef-6799507548f2",
    "date_of_birth": 1389810600000,
    "medication_administration_uuid": "ae7e79b9-e831-4602-944d-6739f491f7cf",
    "administered_date_time": [
      2024,
      1,
      17,
      16,
      17,
      59
    ],
    "administered_drug_name": "Azithromycin 500 mg Tablet",
    "administered_dose": 1,
    "administered_dose_units": "Tablet(s)",
    "administered_route": "Oral",
    "medication_administration_performer_uuid": "868c8723-ac15-4b34-b55e-35314a1e6e53",
    "visit_uuid": "39d4c60f-dbfc-4290-a2ec-603fcb650d96"
  },
  {
    "identifier": "ET904844",
    "name": "Aby K",
    "gender": "M",
    "patient_uuid": "8755ff3f-1eb6-42f1-92cd-7fb6f6e428ef",
    "date_of_birth": 1359484200000,
    "medication_administration_uuid": "8fc88156-1212-4c01-8f2f-a6b872a85501",
    "administered_date_time": [
      2024,
      1,
      30,
      16,
      29,
      33
    ],
    "administered_drug_name": "Paracetamol 250 mg Suppository",
    "administered_dose": 1,
    "administered_dose_units": "Tablet(s)",
    "administered_route": "Oral",
    "medication_administration_performer_uuid": "0e56149a-fc47-448f-bd14-f0c8cc5826c4",
    "visit_uuid": "6f0c44e9-9555-45d2-acd5-8d6721029b67"
  },
]

const sortedMockData = [
  [
    {
      name: 'Hanif Oreo',
      date_of_birth: '2024-01-17',
      gender: 'Male',
      identifier: '123',
      patient_uuid: 'patientUuid123',
      visit_uuid: 'visitUuid123',
    },
  ],
  [
    {
      name: 'Aby K',
      date_of_birth: '2024-01-30',
      gender: 'Male',
      identifier: '456',
      patient_uuid: 'patientUuid456',
      visit_uuid: 'visitUuid456',
    },
  ],
]

jest.mock('../../utils/providerNotifications/ProviderNotificationUtils', () => ({
  getEmergencyDrugAcknowledgements: () => mockGetEmergencyDrugAcknowledgements(),
  getProvider: jest.fn().mockResolvedValue({currentProvider: {uuid: 'mock-provider-uuid'}}),
  sortMedicationList: jest.fn().mockReturnValue(sortedMockData),
}));

jest.mock('./PatientListContent', () => 'PatientListContent');

jest.mock('../../utils/utils', () => ({
  calculateAgeFromEpochDOB: jest.fn().mockReturnValue(30),
  formatArrayDateToDefaultDateFormat: jest.fn().mockReturnValue(1 / 1 / 2000),
  formatGender: jest.fn().mockReturnValue("Male")
}));

jest.mock("../../utils/cookieHandler/cookieHandler", () => {
  const originalModule = jest.requireActual("../../utils/cookieHandler/cookieHandler");
  return {
    ...originalModule,
    getCookies: jest.fn().mockReturnValue({
      "bahmni.user.location": '{"uuid":"0fbbeaf4-f3ea-11ed-a05b-0242ac120002"}',
    }),
  };
});

describe('PatientsList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it('should render without crashing', () => {
    const {container} = render(<PatientsList/>);
    expect(container).toMatchSnapshot();
  })

  it('should render PatientListWithMedications correctly with mocked data', async () => {
    mockGetEmergencyDrugAcknowledgements.mockImplementation(() => (mockData));
    const {queryByText, debug} = render(<PatientsList/>);

    debug();
    await waitFor(() => {
      expect(queryByText('Aby K - Male, 30')).toBeTruthy();
      expect(queryByText('Hanif Oreo - Male, 30')).toBeTruthy();
    })
  });
});