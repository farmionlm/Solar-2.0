import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";

export const dynamic = 'force-dynamic';

// GET: Buscar notificações do usuário + sincronizar alertas de SLA
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }

    const userId = session.user.id;

    // Buscar notificações existentes no DB para o usuário
    const dbNotifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return NextResponse.json(dbNotifications);
  } catch (error: any) {
    console.error('Erro ao buscar notificações:', error);
    return NextResponse.json({ error: 'Erro ao buscar notificações: ' + error.message }, { status: 500 });
  }
}

// PATCH: Marcar notificações como lidas
export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();

    if (body.all) {
      // Marcar todas como lidas
      await prisma.notification.updateMany({
        where: { userId, read: false },
        data: { read: true },
      });
      return NextResponse.json({ success: true, message: 'Todas as notificações foram marcadas como lidas.' });
    } else if (body.id) {
      // Marcar uma notificação específica
      const notification = await prisma.notification.update({
        where: { id: body.id },
        data: { read: true },
      });
      return NextResponse.json(notification);
    }

    return NextResponse.json({ error: 'ID ou flag "all" não fornecido.' }, { status: 400 });
  } catch (error: any) {
    console.error('Erro ao atualizar notificação:', error);
    return NextResponse.json({ error: 'Erro ao atualizar notificação: ' + error.message }, { status: 500 });
  }
}

// POST: Criar uma notificação
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }

    const body = await request.json();
    const { title, message, type = 'INFO', link, clientId, clientName } = body;

    if (!title || !message) {
      return NextResponse.json({ error: 'Título e mensagem são obrigatórios.' }, { status: 400 });
    }

    const notification = await prisma.notification.create({
      data: {
        title,
        message,
        type,
        link,
        clientId,
        clientName,
        userId: session.user.id,
      },
    });

    return NextResponse.json(notification, { status: 201 });
  } catch (error: any) {
    console.error('Erro ao criar notificação:', error);
    return NextResponse.json({ error: 'Erro ao criar notificação: ' + error.message }, { status: 500 });
  }
}

// DELETE: Excluir notificação
export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID da notificação é obrigatório.' }, { status: 400 });
    }

    await prisma.notification.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Erro ao excluir notificação:', error);
    return NextResponse.json({ error: 'Erro ao excluir notificação: ' + error.message }, { status: 500 });
  }
}
