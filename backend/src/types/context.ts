export interface AuthUser {
  id: number;
  username: string;
  email: string;
  role_id: number;
  role: 'Operator' | 'Supervisor' | 'Admin' | string;
  is_active: boolean;
}

export type AppVariables = {
  user: AuthUser;
};

export type AppEnv = {
  Variables: AppVariables;
};
