// @vitest-environment happy-dom
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
    CardFooter
} from '../../../src/components/ui/Card';

describe('Card Components', () => {
    it('renders Card with ref and className', () => {
        const ref = React.createRef<HTMLDivElement>();
        render(<Card ref={ref} className="test-class" data-testid="card">Content</Card>);

        const card = screen.getByTestId('card');
        expect(card).toBeInTheDocument();
        expect(card).toHaveClass('glass-card');
        expect(card).toHaveClass('test-class');
        expect(ref.current).toBe(card);
    });

    it('renders CardHeader with ref', () => {
        const ref = React.createRef<HTMLDivElement>();
        render(<CardHeader ref={ref} data-testid="header">Header</CardHeader>);
        expect(screen.getByTestId('header')).toBeInTheDocument();
        expect(ref.current).toBe(screen.getByTestId('header'));
    });

    it('renders CardTitle with ref', () => {
        const ref = React.createRef<HTMLParagraphElement>();
        render(<CardTitle ref={ref} data-testid="title">Title</CardTitle>);
        expect(screen.getByTestId('title')).toBeInTheDocument();
        expect(ref.current).toBe(screen.getByTestId('title'));
    });

    it('renders CardDescription with ref', () => {
        const ref = React.createRef<HTMLParagraphElement>();
        render(<CardDescription ref={ref} data-testid="desc">Desc</CardDescription>);
        expect(screen.getByTestId('desc')).toBeInTheDocument();
        expect(ref.current).toBe(screen.getByTestId('desc'));
    });

    it('renders CardContent with ref', () => {
        const ref = React.createRef<HTMLDivElement>();
        render(<CardContent ref={ref} data-testid="content">Content</CardContent>);
        expect(screen.getByTestId('content')).toBeInTheDocument();
        expect(ref.current).toBe(screen.getByTestId('content'));
    });

    it('renders CardFooter with ref', () => {
        const ref = React.createRef<HTMLDivElement>();
        render(<CardFooter ref={ref} data-testid="footer">Footer</CardFooter>);
        expect(screen.getByTestId('footer')).toBeInTheDocument();
        expect(ref.current).toBe(screen.getByTestId('footer'));
    });
});
