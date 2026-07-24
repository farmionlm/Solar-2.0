import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";

export const dynamic = 'force-dynamic';

// GET - Listar clientes com suporte a paginação
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const pageParam = searchParams.get('page');
    const limitParam = searchParams.get('limit');

    let whereClause: any = {};
    
    if (session.user.role !== 'ADMIN') {
      const companyId = session.user.role === 'PARTNER' ? session.user.id : session.user.companyId;
      whereClause = {
        OR: [
          { userId: companyId },
          { user: { companyId: companyId } }
        ]
      };
    }

    const isPaginated = Boolean(pageParam || limitParam);
    const page = Math.max(1, Number(pageParam) || 1);
    const limit = Math.min(500, Math.max(1, Number(limitParam) || 50));
    const skip = (page - 1) * limit;

    const clients = await prisma.client.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      skip: isPaginated ? skip : undefined,
      take: isPaginated ? limit : undefined,
      include: {
        _count: {
          select: { projects: true }
        },
        user: {
          select: { 
            id: true,
            name: true, 
            role: true, 
            companyId: true,
            company: {
              select: { id: true, name: true }
            }
          }
        }
      }
    });

    return NextResponse.json(clients);
  } catch (error) {
    console.error('Erro ao buscar clientes:', error);
    return NextResponse.json({ error: 'Erro interno ao buscar clientes.' }, { status: 500 });
  }
}

// POST - Criar novo cliente
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }

    const body = await request.json();
    const { name, cpfCnpj, phone, email, address, neighborhood, city, installationNumber, cep, procuracaoUrl, procuracaoName } = body;

    if (!name || name.trim() === '') {
      return NextResponse.json({ error: 'Nome do cliente é obrigatório.' }, { status: 400 });
    }

    const client = await prisma.client.create({
      data: {
        name: name.trim(),
        cpfCnpj: cpfCnpj?.trim() || null,
        phone: phone?.trim() || null,
        email: email?.trim() || null,
        address: address?.trim() || null,
        neighborhood: neighborhood?.trim() || null,
        city: city?.trim() || null,
        installationNumber: installationNumber?.trim() || null,
        cep: cep?.trim() || null,
        procuracaoUrl: procuracaoUrl || null,
        procuracaoName: procuracaoName || null,
        procuracaoUpdatedAt: procuracaoUrl ? new Date() : null,
        userId: session.user.id,
      }
    });

    return NextResponse.json(client, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar cliente:', error);
    return NextResponse.json({ error: 'Erro interno ao criar cliente.' }, { status: 500 });
  }
}

// PUT - Atualizar cliente (equipamentos, dados)
export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }

    const body = await request.json();
    const { id, name, cpfCnpj, phone, email, address, neighborhood, city, installationNumber, cep, procuracaoUrl, procuracaoName, concessionaria, protocolDate, signatureUrl } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID do cliente é obrigatório.' }, { status: 400 });
    }

    // Validação de propriedade (Security)
    if (session.user.role !== 'ADMIN') {
      const existingClient = await prisma.client.findUnique({
        where: { id },
        include: { user: { select: { companyId: true } } },
      });
      
      if (!existingClient) {
        return NextResponse.json({ error: 'Cliente não encontrado.' }, { status: 404 });
      }

      let isAllowed = false;
      if (existingClient.userId === session.user.id) {
        isAllowed = true; // Dono do cliente
      } else if (session.user.role === 'PARTNER' && existingClient.user?.companyId === session.user.id) {
        isAllowed = true; // Parceiro editando cliente do seu técnico
      }

      if (!isAllowed) {
        return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
      }
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name.trim();
    if (cpfCnpj !== undefined) updateData.cpfCnpj = cpfCnpj?.trim() || null;
    if (phone !== undefined) updateData.phone = phone?.trim() || null;
    if (email !== undefined) updateData.email = email?.trim() || null;
    if (address !== undefined) updateData.address = address?.trim() || null;
    if (neighborhood !== undefined) updateData.neighborhood = neighborhood?.trim() || null;
    if (city !== undefined) updateData.city = city?.trim() || null;
    if (installationNumber !== undefined) updateData.installationNumber = installationNumber?.trim() || null;
    if (cep !== undefined) updateData.cep = cep?.trim() || null;
    if (procuracaoUrl !== undefined) {
      updateData.procuracaoUrl = procuracaoUrl || null;
      updateData.procuracaoName = procuracaoName || null;
      updateData.procuracaoUpdatedAt = procuracaoUrl ? new Date() : null;
    }
    if (concessionaria !== undefined) updateData.concessionaria = concessionaria?.trim() || null;
    if (protocolDate !== undefined) {
      const parsedDate = protocolDate ? new Date(protocolDate) : null;
      updateData.protocolDate = parsedDate;
      // Calcula automaticamente slaDueDate como 15 dias úteis após o protocolo
      if (parsedDate) {
        const due = new Date(parsedDate);
        let businessDaysAdded = 0;
        while (businessDaysAdded < 15) {
          due.setDate(due.getDate() + 1);
          const day = due.getDay();
          if (day !== 0 && day !== 6) businessDaysAdded++;
        }
        updateData.slaDueDate = due;
      } else {
        updateData.slaDueDate = null;
      }
    }
    if (signatureUrl !== undefined) {
      updateData.signatureUrl = signatureUrl || null;
      updateData.signatureUpdatedAt = signatureUrl ? new Date() : null;
    }

    const client = await prisma.client.update({
      where: { id },
      data: updateData
    });

    return NextResponse.json(client);
  } catch (error) {
    console.error('Erro ao atualizar cliente:', error);
    return NextResponse.json({ error: 'Erro interno ao atualizar cliente.' }, { status: 500 });
  }
}

// DELETE - Excluir cliente
export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID não fornecido.' }, { status: 400 });
    }

    // Verificação de permissões hierárquicas
    if (session.user.role !== 'ADMIN') {
      const client = await prisma.client.findUnique({
        where: { id },
        include: { user: { select: { companyId: true } } },
      });
      
      if (!client) {
        return NextResponse.json({ error: 'Cliente não encontrado.' }, { status: 404 });
      }

      let isAllowed = false;
      if (client.userId === session.user.id) {
        isAllowed = true; // Dono do cliente
      } else if (session.user.role === 'PARTNER' && client.user?.companyId === session.user.id) {
        isAllowed = true; // Parceiro deletando cliente do seu técnico
      }

      if (!isAllowed) {
        return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
      }
    }

    await prisma.client.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao deletar cliente:', error);
    return NextResponse.json({ error: 'Erro interno ao deletar cliente.' }, { status: 500 });
  }
}
