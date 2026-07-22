import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            city: true,
            concessionaria: true,
          },
        },
        units: true,
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Proposta não encontrada" }, { status: 404 });
    }

    return NextResponse.json(project);
  } catch (error) {
    console.error("Erro ao buscar proposta pública:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
