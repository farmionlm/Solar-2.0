import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const inverters = await prisma.solarInverter.findMany({
      orderBy: { model: 'asc' }
    });
    return NextResponse.json(inverters);
  } catch (error) {
    console.error('Erro na API de Inversores:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }

    const { manufacturer, model, powerW, numMppts, inputsPerMppt } = await request.json();

    if (!manufacturer || !model || !powerW) {
      return NextResponse.json({ error: 'Dados incompletos.' }, { status: 400 });
    }

    const newInverter = await prisma.solarInverter.create({
      data: {
        manufacturer,
        model,
        powerW: Number(powerW),
        numMppts: numMppts ? Number(numMppts) : null,
        inputsPerMppt: inputsPerMppt ? Number(inputsPerMppt) : null,
      }
    });

    return NextResponse.json(newInverter, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar inversor:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
