import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, modulePower, totalKwp, totalModules, units, clientId, clientData, moduleModel, inverterModel } = body;

    // Validate request
    if (!modulePower || !totalKwp || !totalModules || !units || !Array.isArray(units)) {
      return NextResponse.json({ error: 'Dados incompletos ou inválidos.' }, { status: 400 });
    }

    // Se recebeu dados de novo cliente, cria o cliente primeiro
    let resolvedClientId = clientId || null;

    if (!resolvedClientId && clientData && clientData.name?.trim()) {
      const newClient = await prisma.client.create({
        data: {
          name: clientData.name.trim(),
          cpfCnpj: clientData.cpfCnpj?.trim() || null,
          phone: clientData.phone?.trim() || null,
          email: clientData.email?.trim() || null,
          address: clientData.address?.trim() || null,
        }
      });
      resolvedClientId = newClient.id;
    }

    // Save to database
    const project = await prisma.project.create({
      data: {
        name: name || 'Projeto sem nome',
        modulePower,
        totalKwp,
        totalModules,
        moduleModel: moduleModel || null,
        inverterModel: inverterModel || null,
        clientId: resolvedClientId,
        units: {
          create: units.map((unit: any) => ({
            code: String(unit.code),
            name: String(unit.name),
            monthlyCons: Number(unit.monthlyCons),
            dailyCons: Number(unit.dailyCons),
            requiredKwp: Number(unit.requiredKwp),
            requiredModules: Number(unit.requiredModules),
          })),
        },
      },
    });

    return NextResponse.json({ success: true, project, clientId: resolvedClientId }, { status: 201 });
  } catch (error) {
    console.error('Erro ao salvar projeto:', error);
    return NextResponse.json({ error: 'Erro interno ao salvar no banco de dados.' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const projects = await prisma.project.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { units: true }
        },
        units: true,
        client: true
      }
    });

    return NextResponse.json(projects);
  } catch (error) {
    console.error('Erro ao buscar projetos:', error);
    return NextResponse.json({ error: 'Erro interno ao buscar dados.' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID não fornecido.' }, { status: 400 });
    }

    await prisma.project.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao deletar projeto:', error);
    return NextResponse.json({ error: 'Erro interno ao deletar.' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, moduleModel, inverterModel } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID do projeto é obrigatório.' }, { status: 400 });
    }

    const project = await prisma.project.update({
      where: { id },
      data: {
        moduleModel: moduleModel?.trim() || null,
        inverterModel: inverterModel?.trim() || null,
      }
    });

    return NextResponse.json(project);
  } catch (error) {
    console.error('Erro ao atualizar projeto:', error);
    return NextResponse.json({ error: 'Erro interno ao atualizar.' }, { status: 500 });
  }
}
