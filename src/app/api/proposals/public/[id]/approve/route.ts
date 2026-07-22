import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const project = await prisma.project.findUnique({
      where: { id },
    });

    if (!project) {
      return NextResponse.json({ error: "Proposta não encontrada" }, { status: 404 });
    }

    // Atualizar status do projeto para CLOSED (Fechado/Aprovado)
    const updated = await prisma.project.update({
      where: { id },
      data: {
        status: "CLOSED",
      },
    });

    // Registra log de auditoria
    try {
      await prisma.auditLog.create({
        data: {
          action: "PROPOSAL_APPROVED_BY_CLIENT",
          details: `Proposta ${project.name || id} foi aprovada online pelo cliente final.`,
        },
      });
    } catch {
      // Ignore se auditoria falhar por conta de userId opcional
    }

    return NextResponse.json({ success: true, project: updated });
  } catch (error) {
    console.error("Erro ao aprovar proposta:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
