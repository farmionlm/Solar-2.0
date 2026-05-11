import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'PARTNER') {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }

    const technicians = await prisma.user.findMany({
      where: { 
        role: 'TECHNICIAN',
        companyId: session.user.id 
      },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        _count: {
          select: { clients: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(technicians);
  } catch (error) {
    console.error('Erro ao buscar técnicos:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'PARTNER') {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }

    const { name, email, password } = await request.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Nome, email e senha são obrigatórios.' }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ error: 'E-mail já está em uso.' }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const newTechnician = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: 'TECHNICIAN',
        companyId: session.user.id
      },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
      }
    });

    return NextResponse.json(newTechnician, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar técnico:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
