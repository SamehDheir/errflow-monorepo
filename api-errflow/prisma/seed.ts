import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // Check if super admin user already exists
  let admin = await prisma.user.findUnique({
    where: { email: 'admin@errflow.com' }
  });

  if (!admin) {
    const adminPassword = await bcrypt.hash('admin2134', 10);
    admin = await prisma.user.create({
      data: {
        email: 'admin@errflow.com',
        name: 'Super Admin',
        passwordHash: adminPassword,
        role: 'SUPER_ADMIN',
        organizationId: null, // Super admin doesn't need organization
      },
    });
  }

  console.log('Admin seed data created:');
  console.log('Admin:', admin.email);
  console.log('Password: admin2134');
  console.log('Role:', admin.role);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
