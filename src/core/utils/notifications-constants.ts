export const ID_LENGTH = 9;
const SYNC_POLL_INTERVAL_MS = 5000;

export const ANIMATION_DELAY_MS = 150;

export function useNotification() {
    return useContext(NotificationContext);
}

