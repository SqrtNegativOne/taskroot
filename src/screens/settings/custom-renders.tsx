import type { ReactNode } from "react";
import type { CustomSettingRenderProps } from "../../core/store/settingsSchema";
import {
    ExportDataButton,
    ImportTasksButton,
    LogoutButton,
    ClearAllDataButton,
} from "./SettingActions";

type CustomRender = (props: CustomSettingRenderProps) => ReactNode;

export const CUSTOM_RENDERS: Record<string, CustomRender> = {
    logout: () => <LogoutButton />,
    exportData: () => <ExportDataButton />,
    importTasks: (props) => <ImportTasksButton settings={props.settings} />,
    clearAllData: () => <ClearAllDataButton />,
};
