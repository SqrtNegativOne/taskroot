import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useStored } from './store';
import { api } from './api';

// Mock the API service
vi.mock('./api', () => ({
  api: {
    subscribeToStore: vi.fn(),
    saveStoreData: vi.fn(),
  }
}));

describe('useStored Hook', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    // Clear mock calls
    vi.clearAllMocks();
    
    // Default mock implementation for subscribeToStore that immediately calls onReady
    (api.subscribeToStore as any).mockImplementation((key: string, initial: any, onData: Function, onReady: Function) => {
      onReady();
      return () => {}; // return unsubscribe function
    });
  });

  afterEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('initializes with the provided fallback value if localStorage is empty', () => {
    const { result } = renderHook(() => useStored('test_key', { count: 0 }));

    expect(result.current[0]).toEqual({ count: 0 });
    expect(result.current[2]).toBe(true); // isLoaded should be true since we mocked onReady
  });

  it('initializes with value from localStorage if it exists', () => {
    localStorage.setItem('taskroot_test_key', JSON.stringify({ count: 5 }));
    
    const { result } = renderHook(() => useStored('test_key', { count: 0 }));

    expect(result.current[0]).toEqual({ count: 5 });
  });

  it('updates state, localStorage, and calls API when setValWrapper is called with a new value', () => {
    const { result } = renderHook(() => useStored('test_key', { count: 0 }));

    act(() => {
      // result.current[1] is the setValWrapper
      result.current[1]({ count: 10 });
    });

    expect(result.current[0]).toEqual({ count: 10 });
    expect(localStorage.getItem('taskroot_test_key')).toBe(JSON.stringify({ count: 10 }));
    expect(api.saveStoreData).toHaveBeenCalledWith('test_key', { count: 10 });
  });

  it('updates state, localStorage, and calls API when setValWrapper is called with an updater function', () => {
    const { result } = renderHook(() => useStored('test_key', { count: 2 }));

    act(() => {
      const setter = result.current[1] as any;
      setter((prev: any) => ({ count: prev.count + 3 }));
    });

    expect(result.current[0]).toEqual({ count: 5 });
    expect(localStorage.getItem('taskroot_test_key')).toBe(JSON.stringify({ count: 5 }));
    expect(api.saveStoreData).toHaveBeenCalledWith('test_key', { count: 5 });
  });

  it('updates state and localStorage when API subscription sends new data', () => {
    let capturedOnData: Function = () => {};
    
    (api.subscribeToStore as any).mockImplementation((key: string, initial: any, onData: Function, onReady: Function) => {
      capturedOnData = onData;
      onReady();
      return () => {};
    });

    const { result } = renderHook(() => useStored('test_key', { count: 0 }));

    act(() => {
      capturedOnData({ count: 42 }); // Simulate data coming from cloud
    });

    expect(result.current[0]).toEqual({ count: 42 });
    expect(localStorage.getItem('taskroot_test_key')).toBe(JSON.stringify({ count: 42 }));
  });
});
