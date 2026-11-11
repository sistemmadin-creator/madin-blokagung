import { describe, it, expect, beforeEach } from 'vitest';
import { useTableViewerStore } from '@/stores/useTableViewerStore';

describe('useTableViewerStore', () => {
  beforeEach(() => {
    const store = useTableViewerStore.getState();
    store.setFloatingToolsVisible(false);
    store.resetZoom();
    store.setSearchQuery('');
  });

  it('mengontrol visibilitas floating toolbar dengan benar', () => {
    const store = useTableViewerStore.getState();
    expect(store.isFloatingToolsVisible).toBe(false);

    store.toggleFloatingTools();
    expect(useTableViewerStore.getState().isFloatingToolsVisible).toBe(true);

    store.setFloatingToolsVisible(false);
    expect(useTableViewerStore.getState().isFloatingToolsVisible).toBe(false);
  });

  it('mengatur zoom in, zoom out, reset, dan fit to screen', () => {
    const store = useTableViewerStore.getState();
    expect(store.zoomMode).toBe('100');
    expect(store.zoomScale).toBe(1);

    store.zoomIn();
    expect(useTableViewerStore.getState().zoomScale).toBe(1.15);
    expect(useTableViewerStore.getState().zoomMode).toBe('custom');

    store.zoomOut();
    expect(useTableViewerStore.getState().zoomScale).toBe(1);

    store.setFitToScreen();
    expect(useTableViewerStore.getState().zoomMode).toBe('fit');

    store.resetZoom();
    expect(useTableViewerStore.getState().zoomMode).toBe('100');
    expect(useTableViewerStore.getState().zoomScale).toBe(1);
  });

  it('mengelola pencarian tabel dan navigasi hasil pencarian', () => {
    const store = useTableViewerStore.getState();
    store.setSearchQuery('nahwu');
    expect(useTableViewerStore.getState().searchQuery).toBe('nahwu');

    store.setMatchesInfo(3, 0);
    expect(useTableViewerStore.getState().totalMatches).toBe(3);
    expect(useTableViewerStore.getState().activeMatchIndex).toBe(0);

    store.nextMatch();
    expect(useTableViewerStore.getState().activeMatchIndex).toBe(1);

    store.nextMatch();
    expect(useTableViewerStore.getState().activeMatchIndex).toBe(2);

    // wrap around
    store.nextMatch();
    expect(useTableViewerStore.getState().activeMatchIndex).toBe(0);

    // prev match wrap around
    store.prevMatch();
    expect(useTableViewerStore.getState().activeMatchIndex).toBe(2);
  });
});
