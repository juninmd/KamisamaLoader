// @vitest-environment happy-dom
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import MainLayout from '../../src/layouts/MainLayout';
import { vi, describe, it, expect } from 'vitest';

// Mock SettingsContext
vi.mock('../../src/components/SettingsContext', () => ({
  useSettings: () => ({
    settings: {
      backgroundImage: '',
      backgroundOpacity: 0.5
    }
  })
}));

// Mock Lucide icons
vi.mock('lucide-react', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual as any,
    LayoutDashboard: () => <div data-testid="LayoutDashboard" />,
    Package: () => <div data-testid="Package" />,
    Settings: () => <div data-testid="Settings" />,
  };
});

describe('MainLayout Gaps', () => {
  it('should call onNavigate with "settings" when Settings button is clicked', () => {
    const onNavigate = vi.fn();
    render(
      <MainLayout activePage="dashboard" onNavigate={onNavigate}>
        <div>Content</div>
      </MainLayout>
    );

    const settingsButton = screen.getByText('Settings').closest('button');
    expect(settingsButton).toBeTruthy();

    fireEvent.click(settingsButton!);

    expect(onNavigate).toHaveBeenCalledWith('settings');
  });

  it('should call onNavigate with "mods" when My Mods button is clicked', () => {
    const onNavigate = vi.fn();
    render(
      <MainLayout activePage="dashboard" onNavigate={onNavigate}>
        <div>Content</div>
      </MainLayout>
    );

    const modsButton = screen.getByText('My Mods').closest('button');
    expect(modsButton).toBeTruthy();

    fireEvent.click(modsButton!);

    expect(onNavigate).toHaveBeenCalledWith('mods');
  });

  it('should call onNavigate with "dashboard" when Dashboard button is clicked', () => {
    const onNavigate = vi.fn();
    render(
      <MainLayout activePage="mods" onNavigate={onNavigate}>
        <div>Content</div>
      </MainLayout>
    );

    const dashboardButton = screen.getByText('Dashboard').closest('button');
    expect(dashboardButton).toBeTruthy();

    fireEvent.click(dashboardButton!);

    expect(onNavigate).toHaveBeenCalledWith('dashboard');
  });
});
