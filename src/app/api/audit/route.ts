import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== 'PARTNER' && session.user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }

    const companyId = session.user.role === 'ADMIN' ? undefined : session.user.id;

    const logs = await prisma.auditLog.findMany({
      where: companyId ? { companyId } : {},
      orderBy: { createdAt: 'desc' },
      take: 100, // Limit to 100 recent logs
      include: {
        user: {
          select: { name: true, role: true }
        }
      }
    });

    return NextResponse.json(logs);
  } catch (error) {
    console.error('Erro na API de Auditoria:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }

    const { action, details } = await request.json();

    if (!action || !details) {
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 });
    }

    const companyId = session.user.role === 'PARTNER' ? session.user.id : session.user.companyId;

    if (!companyId) {
      return NextResponse.json({ error: 'Usuário sem empresa vinculada.' }, { status: 400 });
    }

    const log = await prisma.auditLog.create({
      data: {
        action,
        details,
        userId: session.user.id,
        companyId: companyId
      }
    });

    return NextResponse.json(log, { status: 201 });
  } catch (error) {
    console.error('Erro ao gravar log:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
