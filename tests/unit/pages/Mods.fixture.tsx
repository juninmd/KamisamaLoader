import { vi } from 'vitest';
class MockIntersectionObserver {
    callback: any;
    constructor(callback: any) {
        this.callback = callback;
        (window as any).__observerCallback = callback;
        (window as any).__observerInstance = this;
    }
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
}
window.IntersectionObserver = MockIntersectionObserver as any;
vi.mock('../../../src/components/CategorySidebar', () => ({
    default: ({ onCategorySelect, categories }: any) => (<div data-testid="category-sidebar">
            <button onClick={() => onCategorySelect('Misc')}>Select Misc</button>
            <div data-testid="cat-count">{categories?.length || 0}</div>
        </div>)
}));
