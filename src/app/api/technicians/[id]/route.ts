import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";

export const dynamic = 'force-dynamic';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'PARTNER') {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }

    const { id } = await params;
    const { name, email, password } = await request.json();

    // Verify ownership
    const tech = await prisma.user.findUnique({ where: { id } });
    if (!tech || tech.companyId !== session.user.id || tech.role !== 'TECHNICIAN') {
      return NextResponse.json({ error: 'Técnico não encontrado ou sem permissão.' }, { status: 403 });
    }

    const updateData: any = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (password) {
      updateData.passwordHash = await bcrypt.hash(password, 10);
    }

    if (email && email !== tech.email) {
      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        return NextResponse.json({ error: 'E-mail já está em uso por outro usuário.' }, { status: 400 });
      }
    }

    const updated = await prisma.user.update({
      where: { id },
      data: updateData,
      select: { id: true, name: true, email: true }
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Erro ao atualizar técnico:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'PARTNER') {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }

    const { id } = await params;

    // Verify ownership
    const tech = await prisma.user.findUnique({ where: { id } });
    if (!tech || tech.companyId !== session.user.id || tech.role !== 'TECHNICIAN') {
      return NextResponse.json({ error: 'Técnico não encontrado ou sem permissão.' }, { status: 403 });
    }

    await prisma.user.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao deletar técnico:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
