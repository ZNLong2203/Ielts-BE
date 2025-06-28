export interface IUser {
  id: string;
  profiles: Profile;
  email: string;
  role: string;
}

export interface Profile {
  full_name: string;
}
