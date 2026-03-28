import prisma from "../src/lib/prisma";

function getArg(name: string): string | undefined {
  const idx = process.argv.indexOf(name);
  if (idx === -1) return undefined;
  return process.argv[idx + 1];
}

function normalizeEmail(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

async function main() {
  const email = normalizeEmail(getArg("--email") ?? process.argv[2]);
  if (!email) {
    throw new Error('Usage: tsx scripts/delete-user.ts --email "test@example.com"');
  }

  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true, email: true, displayId: true } });
  if (!existing) {
    console.log(`No user found for ${email}`);
    return;
  }

  await prisma.user.delete({ where: { email } });
  console.log(`Deleted user ${email} (id=${existing.id}, displayId=${existing.displayId})`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect().catch(() => undefined);
  });
