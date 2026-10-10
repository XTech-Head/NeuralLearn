// getAuthedDbUser file
import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "@/config/db";
import { usersTable } from "@/config/schema";
import { eq } from "drizzle-orm";

export async function getAuthedDbUser() {
  const { userId } = await auth();
  if (!userId) {
    return { user: null, error: "Unauthorized" as const, status: 401 };
  }

  const clerkUser = await currentUser();
  const email =
    clerkUser?.primaryEmailAddress?.emailAddress ??
    clerkUser?.emailAddresses[0]?.emailAddress;
  if (!email) {
    return { user: null, error: "Unauthorized" as const, status: 401 };
  }

  const find = () =>
    db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);

  let [dbUser] = await find();

  if (!dbUser) {
    await db
      .insert(usersTable)
      .values({ name: clerkUser?.fullName ?? "User", email })
      .onConflictDoNothing();
    [dbUser] = await find();
  }

  if (!dbUser) {
    return { user: null, error: "User not found" as const, status: 404 };
  }
  return { user: dbUser, error: null, status: 200 };
}