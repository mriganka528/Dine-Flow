import jwt from "jsonwebtoken";
import {
  ADMIN_SESSION_MAX_AGE,
  ADMIN_SESSION_COOKIE,
  ADMIN_REMEMBERED_SESSION_MAX_AGE,
} from "@/lib/admin-session";
import { Role } from "@prisma/client";

type AdminTokenInput = {
  id: string;
  email: string;
  role: Role;
};

export {
  ADMIN_REMEMBERED_SESSION_MAX_AGE,
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_MAX_AGE,
};

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET is required to generate admin sessions");
  }

  return secret;
}

export function generateAdminToken(admin: AdminTokenInput, expiresIn = ADMIN_SESSION_MAX_AGE) {
  return jwt.sign(
    {
      adminId: admin.id,
      email: admin.email,
      role: admin.role,
    },
    getJwtSecret(),
    {
      audience: "foodbot-admin",
      expiresIn,
      issuer: "foodbot",
      subject: admin.id,
    },
  );
}
