import { useState, useEffect } from "react";
import { storeRegistry } from "./storeRegistry";
import { Repository, repos } from "./repositories";

export function useRepository<T>(repo: Repository<T>): [T, (val: T | ((prev: T) => T)) => void, boolean] {
    const [val, setVal] = useState<T>(() => repo.get());
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        const unregister = storeRegistry.registerUpdater(repo.key, setVal);
        setIsLoaded(true);
        return unregister;
    }, [repo.key]);

    return [val, (newVal) => repo.set(newVal), isLoaded];
}

export const useSettings = () => useRepository(repos.settings);
export const useTasks = () => useRepository(repos.tasks);
export const useEvents = () => useRepository(repos.events);
export const useDistractions = () => useRepository(repos.distractions);
export const useDistractionStatuses = () => useRepository(repos.distractionStatuses);
export const useDistractionColumns = () => useRepository(repos.distractionColumns);
export const useStopwatch = () => useRepository(repos.stopwatch);
export const useTimeLogs = () => useRepository(repos.time_logs);
export const useTips = () => useRepository(repos.tips);
export const useNotes = () => useRepository(repos.notes);
export const useTaskQuery = () => useRepository(repos.taskQuery);
export const useTaskFilters = () => useRepository(repos.taskFilters);
export const useTaskSort = () => useRepository(repos.taskSort);
export const useRestItems = () => useRepository(repos.restItems);
export const useTestKey = () => useRepository(repos.test_key);
export const useCalFilters = () => useRepository(repos.calFilters);
export const useCalSort = () => useRepository(repos.calSort);
export const useTimeFilters = () => useRepository(repos.timeFilters);
export const useTimeSort = () => useRepository(repos.timeSort);
export const useCalendars = () => useRepository(repos.calendars);
