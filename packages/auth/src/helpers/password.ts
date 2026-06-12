import bcrypt from "bcryptjs";

const saltRounds = 12;

export const hashPassword = (password: string): Promise<string> =>
  bcrypt.hash(password, saltRounds);

export const verifyPassword = (
  password: string,
  hash: string,
): Promise<boolean> => bcrypt.compare(password, hash);
