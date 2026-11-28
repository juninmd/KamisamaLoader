// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Switch } from '../../../src/components/ui/Switch';

describe('Switch Component', () => {
    it('renders with the switch role', () => {
        render(<Switch checked={false} onChange={() => {}} />);
        const control = screen.getByRole('switch');
        expect(control).toBeInTheDocument();
        expect(control).not.toBeChecked();
    });

    it('renders with label', () => {
        render(<Switch label="Test Label" checked={false} onChange={() => {}} />);
        expect(screen.getByText('Test Label')).toBeInTheDocument();
    });

    it('reports the next checked state', () => {
        const handleChange = vi.fn();
        render(<Switch checked={false} onChange={handleChange} />);

        fireEvent.click(screen.getByRole('switch'));

        expect(handleChange).toHaveBeenCalledWith(true);
    });

    it('can be disabled', () => {
        render(<Switch disabled checked={false} onChange={() => {}} />);
        expect(screen.getByRole('switch')).toBeDisabled();
    });

    it('applies custom className to the control wrapper', () => {
        const { container } = render(<Switch className="custom-class" checked={false} onChange={() => {}} />);
        const wrapper = container.querySelector('.custom-class');
        expect(wrapper).toBeInTheDocument();
        expect(wrapper).toHaveClass('sn-switch');
    });
});
