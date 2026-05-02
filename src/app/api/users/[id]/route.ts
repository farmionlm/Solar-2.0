import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";
import bcrypt from "bcryptjs";

export const dynamic = 'force-dynamic';

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
    }

    const { id } = await context.params;
    const { name, email, password } = await request.json();

    if (!name || !email) {
      return NextResponse.json({ error: 'Nome e e-mail são obrigatórios.' }, { status: 400 });
    }

    // Check if email belongs to someone else
    const existingEmail = await prisma.user.findUnique({ where: { email } });
    if (existingEmail && existingEmail.id !== id) {
      return NextResponse.json({ error: 'Este e-mail já está sendo usado por outro usuário.' }, { status: 400 });
    }

    const updateData: any = { name, email };
    
    // If password is provided, hash and update it
    if (password && password.trim() !== '') {
      updateData.passwordHash = await bcrypt.hash(password, 10);
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      select: { id: true, name: true, email: true, role: true }
    });

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error('Erro ao atualizar usuário:', error);
    return NextResponse.json({ error: 'Erro interno ao atualizar usuário.' }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
    }

    const { id } = await context.params;
    const { adminPassword } = await request.json();

    if (!adminPassword) {
      return NextResponse.json({ error: 'A senha de administrador é obrigatória para esta ação.' }, { status: 400 });
    }

    // Verify admin password
    const adminUser = await prisma.user.findUnique({
      where: { id: session.user.id }
    });

    if (!adminUser) {
      return NextResponse.json({ error: 'Administrador não encontrado.' }, { status: 404 });
    }

    const isPasswordValid = await bcrypt.compare(adminPassword, adminUser.passwordHash);
    if (!isPasswordValid) {
      return NextResponse.json({ error: 'Senha de administrador incorreta.' }, { status: 403 });
    }

    // Check if target user exists
    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser) {
      return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 });
    }

    // Perform cascading delete safely within a transaction
    await prisma.$transaction(async (tx) => {
      // 1. Delete all projects associated with clients of this user
      await tx.project.deleteMany({
        where: {
          client: {
            userId: id
          }
        }
      });

      // 2. Delete all clients of this user
      await tx.client.deleteMany({
        where: {
          userId: id
        }
      });

      // 3. Delete the user
      await tx.user.delete({
        where: { id }
      });
    });

    return NextResponse.json({ success: true, message: 'Parceiro e todos os seus dados foram excluídos.' });
  } catch (error) {
    console.error('Erro ao excluir parceiro:', error);
    return NextResponse.json({ error: 'Erro interno ao excluir o parceiro.' }, { status: 500 });
  }
}
