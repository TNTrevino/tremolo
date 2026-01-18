import { createContext, useContext, useState, ReactNode } from 'react';
import { User, AuthContextType, SignupData } from '@/shared/types';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mock user data for demonstration
const mockUsers: User[] = [
  {
    id: '1',
    email: 'demo@tremolo.com',
    firstName: 'Demo',
    lastName: 'User',
    role: 'student',
    joinDate: '2024-01-01',
  },
];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem('tremolo-user');
    return stored ? JSON.parse(stored) : null;
  });

  const login = async (email: string, _password: string): Promise<boolean> => {
    // Mock authentication
    const foundUser = mockUsers.find((u) => u.email === email);
    if (foundUser || email === 'demo@tremolo.com') {
      const userToStore = foundUser ?? mockUsers[0] ?? null;
      if (userToStore) {
        setUser(userToStore);
        localStorage.setItem('tremolo-user', JSON.stringify(userToStore));
        return true;
      }
    }
    return false;
  };

  const signup = async (data: SignupData): Promise<boolean> => {
    // Mock signup - create new user
    const joinDateString = new Date().toISOString().split('T')[0];
    const newUser: User = {
      id: Date.now().toString(),
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      role: data.role,
      joinDate: joinDateString ?? '',
    };
    mockUsers.push(newUser);
    return true;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('tremolo-user');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        signup,
        logout,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
