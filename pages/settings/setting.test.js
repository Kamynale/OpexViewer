import React from 'react';
import Settings from './index.js';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

describe('Setting', () => {
    it('Should render SettingsForm', () => {
        const textToFind = 'Добавить Token';
        const component = render(<Settings setTitle={() => {}} />);

        const heading = screen.getByText(textToFind);

        expect(heading).toBeInTheDocument();
        expect(component).toMatchSnapshot();
    });

    it('Should render Token', () => {
        const textToFind = 'Добавить';

        render(<Settings setTitle={() => {}} />);

        const heading = screen.getByText(textToFind);

        expect(heading).toBeInTheDocument();
    });
});
