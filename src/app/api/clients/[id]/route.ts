import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";

export const dynamic = 'force-dynamic';

// GET - Buscar cliente por ID com seus projetos
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }

    const { id } = await params;

    const client = await prisma.client.findUnique({
      where: { id },
      include: {
        projects: {
          orderBy: { createdAt: 'desc' },
          include: {
            units: true,
            inverters: true,
            _count: {
              select: { units: true }
            }
          }
        }
      }
    });

    if (!client) {
      return NextResponse.json({ error: 'Cliente não encontrado.' }, { status: 404 });
    }

    return NextResponse.json(client);
  } catch (error) {
    console.error('Erro ao buscar cliente:', error);
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }
}
