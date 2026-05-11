import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../auth/[...nextauth]/route";

export const dynamic = 'force-dynamic';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { status } = body;

    if (!status) {
      return NextResponse.json({ error: 'Status é obrigatório.' }, { status: 400 });
    }

    // Verify ownership (Admin can edit all, others only if it belongs to their company)
    const project = await prisma.project.findUnique({
      where: { id },
      include: { client: true }
    });

    if (!project) {
      return NextResponse.json({ error: 'Projeto não encontrado.' }, { status: 404 });
    }

    // Ownership check for non-ADMIN users
    if (session.user.role !== 'ADMIN') {
      const companyId = session.user.role === 'PARTNER' ? session.user.id : session.user.companyId;
      const ownerUserId = project.client?.userId;
      // Check if the project's client belongs to this company
      if (companyId && ownerUserId) {
        const ownerUser = await prisma.user.findUnique({ where: { id: ownerUserId }, select: { companyId: true, id: true } });
        const ownerCompanyId = ownerUser?.companyId || ownerUser?.id;
        if (ownerCompanyId !== companyId && ownerUserId !== session.user.id) {
          return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
        }
      }
    }

    const updatedProject = await prisma.project.update({
      where: { id },
      data: { status }
    });

    // Log the action
    const companyIdForLog = session.user.role === 'PARTNER' ? session.user.id : (session.user.companyId || 'ADMIN');
    await prisma.auditLog.create({
      data: {
        action: 'STATUS_ALTERADO',
        details: `Projeto "${updatedProject.name || 'Sem nome'}" movido para ${status}.`,
        userId: session.user.id,
        companyId: companyIdForLog
      }
    });

    return NextResponse.json(updatedProject);
  } catch (error) {
    console.error('Erro ao atualizar status do projeto:', error);
    return NextResponse.json({ error: 'Erro interno ao atualizar status.' }, { status: 500 });
  }
}
