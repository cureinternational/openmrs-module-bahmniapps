import React from 'react';
import { render } from '@testing-library/react';
import { ProviderNotifications } from './ProviderNotifications';

jest.mock('../../Components/ProviderNotificationPatients/PatientsList', () => {
    return jest.fn(() => <div data-testid="patients-list"></div>);
});

jest.mock('react-intl', () => ({
    FormattedMessage: ({ id, defaultMessage }) => <span>{defaultMessage}</span>
}));

describe('ProviderNotifications', () => {
    it('should render acknowledgementRequiredText correctly', () => {
        const { queryByText } = render(<ProviderNotifications />);

        expect(queryByText('Acknowledgement required')).toBeTruthy();
    });

    it('should render PatientsList component', () => {
        const { queryByTestId } = render(<ProviderNotifications />);
        const patientsList = queryByTestId('patients-list');

        expect(patientsList).toBeTruthy();
    });
});