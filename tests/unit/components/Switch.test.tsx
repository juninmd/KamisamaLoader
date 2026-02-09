// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Switch } from '../../../src/components/ui/Switch';

describe('Switch Component', () => {
    it('renders correctly', () => {
        render(<Switch checked={false} onChange={() => {}} />);
        const checkbox = screen.getByRole('checkbox');
        expect(checkbox).toBeInTheDocument();
        expect(checkbox).not.toBeChecked();
    });

    it('renders with label', () => {
        render(<Switch label="Test Label" checked={false} onChange={() => {}} />);
        expect(screen.getByText('Test Label')).toBeInTheDocument();
    });

    it('handles change events', () => {
        const handleChange = vi.fn();
        render(<Switch checked={false} onChange={handleChange} />);

        const checkbox = screen.getByRole('checkbox');
        fireEvent.click(checkbox);

        expect(handleChange).toHaveBeenCalled();
    });

    it('can be disabled', () => {
        render(<Switch disabled checked={false} onChange={() => {}} />);
        const checkbox = screen.getByRole('checkbox');
        expect(checkbox).toBeDisabled();
    });

    it('applies custom className', () => {
        const { container } = render(<Switch className="custom-class" checked={false} onChange={() => {}} />);
        // The class is applied to the div sibling of input
        const switchBg = container.querySelector('.custom-class');
        expect(switchBg).toBeInTheDocument();
    });
});
