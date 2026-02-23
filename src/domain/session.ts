import type { Role } from "./roles";
import type { UserId } from "./ids";

export type Session = Readonly<{
  role: Role;
  userId: UserId;
}>;