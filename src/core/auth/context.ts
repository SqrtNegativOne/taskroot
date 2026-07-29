import { createContext } from "react";

interface User {
    uid: string;
    email?: string;
    displayName?: string;
    photoURL?: string;
}

interface AuthContextType {
    user?: User;
    loading: boolean;
    loginWithGoogle: () => Promise<void>;
    logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType>({
    user: undefined,
    loading: true,
    loginWithGoogle: async () => {},
    logout: async () => {},
});
