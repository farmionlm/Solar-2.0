import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET - Listar todos os clientes
export async function GET() {
  try {
    const clients = await prisma.client.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { projects: true }
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
    const body = await request.json();
    const { name, cpfCnpj, phone, email, address, moduleModel, inverterModel } = body;

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
        moduleModel: moduleModel?.trim() || null,
        inverterModel: inverterModel?.trim() || null,
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
    const body = await request.json();
    const { id, name, cpfCnpj, phone, email, address, moduleModel, inverterModel } = body;

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
        ...(moduleModel !== undefined && { moduleModel: moduleModel?.trim() || null }),
        ...(inverterModel !== undefined && { inverterModel: inverterModel?.trim() || null }),
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
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID não fornecido.' }, { status: 400 });
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
