import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * POST /api/projects/[id]/accept
 * Endpoint público (sem autenticação) para registrar o aceite online de uma proposta pelo cliente.
 * Chamado pela página /p/[id] quando o cliente clica em "Aceitar Proposta Online".
 */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const project = await prisma.project.findUnique({
      where: { id },
      select: { id: true, status: true, name: true, clientId: true },
    });

    if (!project) {
      return NextResponse.json({ error: 'Projeto não encontrado.' }, { status: 404 });
    }

    // Apenas projetos em negociação podem ser aceitos pelo cliente
    if (project.status !== 'SIMULATION' && project.status !== 'NEGOTIATION') {
      return NextResponse.json(
        { error: 'Esta proposta não está disponível para aceite.' },
        { status: 409 }
      );
    }

    // Transiciona para CLOSED (Fechado / Aceito)
    const updated = await prisma.project.update({
      where: { id },
      data: { status: 'CLOSED' },
    });

    // Registra transição no histórico do funil (D1)
    await prisma.projectStatusHistory.create({
      data: {
        projectId: id,
        fromStatus: project.status,
        toStatus: 'CLOSED',
      },
    });

    // Audit log — sem userId pois é uma ação pública do cliente
    await prisma.auditLog.create({
      data: {
        action: 'PROPOSTA_ACEITA_CLIENTE',
        details: `Proposta "${project.name || id}" aceita pelo cliente via link público.`,
        userId: 'PUBLIC',
        companyId: 'PUBLIC',
      },
    });

    return NextResponse.json({ success: true, status: updated.status });
  } catch (error) {
    console.error('[accept] Erro ao registrar aceite da proposta:', error);
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }
}
