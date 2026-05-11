import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";

export const dynamic = 'force-dynamic';

// GET - Listar todos os clientes
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }

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

    const clients = await prisma.client.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { projects: true }
        },
        user: {
          select: { name: true, role: true, id: true }
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
    const { name, cpfCnpj, phone, email, address, neighborhood, city, installationNumber, cep } = body;

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
    const { id, name, cpfCnpj, phone, email, address, neighborhood, city, installationNumber, cep } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID do cliente é obrigatório.' }, { status: 400 });
    }

    const client = await prisma.client.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(cpfCnpj !== undefined && { cpfCnpj: cpfCnpj?.trim() || null }),
        ...(phone !== undefined && { phone: phone?.trim() || null }),
        ...(email !== undefined && { email: email?.trim() || null }),
        ...(address !== undefined && { address: address?.trim() || null }),
        ...(neighborhood !== undefined && { neighborhood: neighborhood?.trim() || null }),
        ...(city !== undefined && { city: city?.trim() || null }),
        ...(installationNumber !== undefined && { installationNumber: installationNumber?.trim() || null }),
        ...(cep !== undefined && { cep: cep?.trim() || null }),
      }
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
