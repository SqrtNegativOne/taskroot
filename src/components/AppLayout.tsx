import { useLocation, Outlet } from "react-router-dom";
import { TitleBar } from "./shell";

export function AppLayout() {
    const location = useLocation();
    const current = location.pathname.substring(1) || 'plan';

    let appClass = 'app';
    if (current === 'do') appClass += ' app-do';
    if (current === 'settings') appClass += ' app-settings';

    return (
        <div className={appClass}>
            <TitleBar current={current} />
            <Outlet />
        </div>
    );
}
