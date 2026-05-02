import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const adminEmail = 'admin@solar.com';
  
  // Verifica se o usuário já existe para não duplicar
  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail }
  });

  if (existingAdmin) {
    console.log('O usuário Admin já existe no banco de dados!');
    return;
  }

  // Gera o hash da senha padrão
  const passwordHash = await bcrypt.hash('admin123', 10);

  // Cria o usuário
  const admin = await prisma.user.create({
    data: {
      name: 'Admin Master',
      email: adminEmail,
      passwordHash: passwordHash,
      role: 'ADMIN',
    }
  });

  console.log('✅ SUCESSO: O usuário Administrador foi criado!');
  console.log('===================================================');
  console.log(`E-mail de acesso: ${admin.email}`);
  console.log(`Senha de acesso: admin123`);
  console.log('===================================================');
  console.log('IMPORTANTE: Não se esqueça de trocar essa senha pelo Painel quando fizer o primeiro login!');
}

main()
  .catch((e) => {
    console.error('Erro ao criar usuário admin:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
