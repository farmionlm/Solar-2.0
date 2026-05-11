import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const modules = await prisma.solarModule.findMany({
      orderBy: { model: 'asc' }
    });
    return NextResponse.json(modules);
  } catch (error) {
    console.error('Erro na API de Módulos:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }

    const { manufacturer, model, powerW } = await request.json();

    if (!manufacturer || !model || !powerW) {
      return NextResponse.json({ error: 'Dados incompletos.' }, { status: 400 });
    }

    const newModule = await prisma.solarModule.create({
      data: {
        manufacturer,
        model,
        powerW: Number(powerW)
      }
    });

    return NextResponse.json(newModule, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar módulo:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
