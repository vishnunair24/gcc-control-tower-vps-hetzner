const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL || 'admin@example.com';
  const password = process.env.ADMIN_PASSWORD || 'ChangeMe!23';
  const name = process.env.ADMIN_NAME || 'Administrator';

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    if (existing.role !== 'admin') {
      await prisma.user.update({ where: { email }, data: { role: 'admin', approved: true, disabled: false } });
      console.log('Promoted existing user to admin:', email);
    } else {
      console.log('Admin already exists:', email);
    }
    return;
  }

  const hash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      email,
      name,
      password: hash,
      role: 'admin',
      approved: true,
      disabled: false,
      mustSetPassword: false
    }
  });

  console.log('Created admin user:', user.email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
