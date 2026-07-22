import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const project = await prisma.project.findUnique({
      where: { id },
      include: { client: true },
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

    // Notificar o consultor responsável se o cliente estiver vinculado a um usuário
    if (project.client?.userId) {
      try {
        await prisma.notification.create({
          data: {
            title: "Proposta Aprovada!",
            message: `A proposta "${project.name || id}" foi aprovada online pelo cliente ${project.client.name}.`,
            type: "SUCCESS",
            userId: project.client.userId,
            clientId: project.client.id,
            clientName: project.client.name,
            link: `/clientes/${project.client.id}`,
          },
        });
      } catch {
        // Ignorar se falhar criação de notificação
      }
    }

    return NextResponse.json({ success: true, project: updated });
  } catch (error) {
    console.error("Erro ao aprovar proposta:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
