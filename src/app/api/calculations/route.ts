import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });

    const body = await request.json();
    const { name, modulePower, totalKwp, totalModules, units, clientId, clientData, moduleModel, inverterModel, installationNumber } = body;

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
          neighborhood: clientData.neighborhood?.trim() || null,
          city: clientData.city?.trim() || null,
          cep: clientData.cep?.trim() || null,
          installationNumber: clientData.installationNumber?.trim() || null,
          userId: session.user.id,
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
        installationNumber: installationNumber || null,
        clientId: resolvedClientId,
        units: {
          create: units.map((unit: { code: string | number; name: string; monthlyCons: string | number; dailyCons: string | number; requiredKwp: string | number; requiredModules: string | number }) => ({
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

    const companyId = session.user.role === 'PARTNER' ? session.user.id : (session.user.companyId || 'ADMIN');

    await prisma.auditLog.create({
      data: {
        action: 'PROJETO_CRIADO',
        details: `Simulação gerada: ${project.name} (${project.totalKwp} kWp)`,
        userId: session.user.id,
        companyId: companyId
      }
    });

    return NextResponse.json({ success: true, project, clientId: resolvedClientId }, { status: 201 });
  } catch (error) {
    console.error('Erro ao salvar projeto:', error);
    return NextResponse.json({ error: 'Erro interno ao salvar no banco de dados.' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });

    const whereClause = session.user.role === 'ADMIN' ? {} : { client: { userId: session.user.id } };

    const projects = await prisma.project.findMany({
      where: whereClause,
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
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });

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
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });

    const body = await request.json();
    const { 
      id, moduleModel, inverterModel,
      generationKwh, reductionPercent, moduleManufacturer, moduleArea,
      moduleCurrent, inverterManufacturer, inverterOutputPower,
      inverterOutputCurrent, areaOccupied, professionalName, professionalCrt,
      inverters, installationNumber
    } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID do projeto é obrigatório.' }, { status: 400 });
    }

    const project = await prisma.project.update({
      where: { id },
      data: {
        ...(moduleModel !== undefined && { moduleModel: moduleModel?.trim() || null }),
        ...(inverterModel !== undefined && { inverterModel: inverterModel?.trim() || null }),
        ...(generationKwh !== undefined && { generationKwh: generationKwh ? Number(generationKwh) : null }),
        ...(reductionPercent !== undefined && { reductionPercent: reductionPercent ? Number(reductionPercent) : null }),
        ...(moduleManufacturer !== undefined && { moduleManufacturer: moduleManufacturer?.trim() || null }),
        ...(moduleArea !== undefined && { moduleArea: moduleArea ? Number(moduleArea) : null }),
        ...(moduleCurrent !== undefined && { moduleCurrent: moduleCurrent ? Number(moduleCurrent) : null }),
        ...(inverterManufacturer !== undefined && { inverterManufacturer: inverterManufacturer?.trim() || null }),
        ...(inverterOutputPower !== undefined && { inverterOutputPower: inverterOutputPower ? Number(inverterOutputPower) : null }),
        ...(inverterOutputCurrent !== undefined && { inverterOutputCurrent: inverterOutputCurrent ? Number(inverterOutputCurrent) : null }),
        ...(areaOccupied !== undefined && { areaOccupied: areaOccupied ? Number(areaOccupied) : null }),
        ...(professionalName !== undefined && { professionalName: professionalName?.trim() || null }),
        ...(professionalCrt !== undefined && { professionalCrt: professionalCrt?.trim() || null }),
        ...(installationNumber !== undefined && { installationNumber: installationNumber?.trim() || null }),
      }
    });

    if (Array.isArray(inverters)) {
      await prisma.projectInverter.deleteMany({ where: { projectId: id } });
      if (inverters.length > 0) {
        await prisma.projectInverter.createMany({
          data: inverters.map((inv: { manufacturer?: string; model?: string; outputPower?: string | number; outputCurrent?: string | number; quantity?: string | number; numMppts?: string | number; inputsPerMppt?: string | number; mpptInputs?: string | null; stringLayout?: string | null }) => ({
            projectId: id,
            manufacturer: inv.manufacturer || null,
            model: inv.model || null,
            outputPower: inv.outputPower ? Number(inv.outputPower) : null,
            outputCurrent: inv.outputCurrent ? Number(inv.outputCurrent) : null,
            quantity: inv.quantity ? Number(inv.quantity) : 1,
            numMppts: inv.numMppts ? Number(inv.numMppts) : 1,
            inputsPerMppt: inv.inputsPerMppt ? Number(inv.inputsPerMppt) : 1,
            mpptInputs: inv.mpptInputs || null,
            stringLayout: inv.stringLayout || null,
          }))

        });
      }
    }


    return NextResponse.json(project);
  } catch (error) {
    console.error('Erro ao atualizar projeto:', error);
    return NextResponse.json({ error: 'Erro interno ao atualizar.' }, { status: 500 });
  }
}

// Re-simulação: atualiza kWp, módulos e unidades de um projeto existente
export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });

    const body = await request.json();
    const { id, modulePower, totalKwp, totalModules, units, installationNumber } = body;

    if (!id || !modulePower || !totalKwp || !totalModules || !Array.isArray(units)) {
      return NextResponse.json({ error: 'Dados incompletos.' }, { status: 400 });
    }

    // Apaga unidades antigas e insere as novas
    await prisma.consumerUnit.deleteMany({ where: { projectId: id } });

    const project = await prisma.project.update({
      where: { id },
      data: {
        modulePower: Number(modulePower),
        totalKwp: Number(totalKwp),
        totalModules: Number(totalModules),
        ...(installationNumber !== undefined && { installationNumber: installationNumber?.trim() || null }),
        generationKwh: Math.round(Number(totalKwp) * 120),
        units: {
          create: units.map((unit: { code: string | number; name: string; monthlyCons: string | number; dailyCons: string | number; requiredKwp: string | number; requiredModules: string | number }) => ({
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


    return NextResponse.json({ success: true, project });
  } catch (error) {
    console.error('Erro ao re-simular projeto:', error);
    return NextResponse.json({ error: 'Erro interno ao re-simular.' }, { status: 500 });
  }
}
