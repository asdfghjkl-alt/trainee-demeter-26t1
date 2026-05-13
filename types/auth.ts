export interface LoginFormData {
  email: string;
  password: string;
}

export interface RegisterFormData extends LoginFormData {
  fname: string;
  lname: string;
  phone: string;
  confirmPassword?: string;
}
