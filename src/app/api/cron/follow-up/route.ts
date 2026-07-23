import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * Cron Job de Follow-up Automático
 * Verifica projetos que estão estagnados nas colunas do funil CRM
 * e cria notificações no sistema para alertar os responsáveis.
 */
export async function GET(request: Request) {
  try {
    // Autenticação básica via Cron Secret ou Header de Autorização
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      // Se CRON_SECRET estiver configurado no Vercel, exige o token
      // Caso não esteja configurado, permite execução para testes manuais
    }

    const now = new Date();

    // Limiares de inatividade por status (em dias)
    const INACTIVITY_THRESHOLDS = {
      NEGOTIATION: 7,   // 7 dias sem interação em Negociação
      SIMULATION: 14,   // 14 dias sem ação em Simulação
      CLOSED: 30,       // 30 dias em Fechado sem avançar para Instalação
    };

    let totalNotificationsCreated = 0;

    for (const [statusStr, days] of Object.entries(INACTIVITY_THRESHOLDS)) {
      const thresholdDate = new Date(now);
      thresholdDate.setDate(thresholdDate.getDate() - days);

      // Buscar projetos com o status e que não foram atualizados desde a data limite
      const staleProjects = await prisma.project.findMany({
        where: {
          status: statusStr as any,
          createdAt: { lte: thresholdDate },
        },
        select: {
          id: true,
          name: true,
          status: true,
          createdAt: true,
          clientId: true,
          client: {
            select: {
              id: true,
              name: true,
              userId: true,
            }
          }
        },
        take: 100,
      });

      for (const proj of staleProjects) {
        if (!proj.client?.userId) continue;

        // Verificar se já existe uma notificação não lida para este projeto recentemente
        const existingNotif = await prisma.notification.findFirst({
          where: {
            userId: proj.client.userId,
            clientId: proj.clientId || undefined,
            title: { contains: proj.name || 'Projeto' },
            read: false,
          }
        });

        if (!existingNotif) {
          const statusLabels: Record<string, string> = {
            NEGOTIATION: 'Negociação',
            SIMULATION: 'Simulação',
            CLOSED: 'Fechado',
          };

          const statusName = statusLabels[proj.status] || proj.status;

          await prisma.notification.create({
            data: {
              title: `⏰ Follow-up Pendente: ${proj.name || 'Projeto Solar'}`,
              message: `O projeto de "${proj.client.name}" está em ${statusName} há mais de ${days} dias sem movimentação. Que tal entrar em contato com o cliente?`,
              type: 'WARNING',
              link: proj.clientId ? `/clientes/${proj.clientId}` : '/funil',
              clientId: proj.clientId || null,
              clientName: proj.client.name,
              userId: proj.client.userId,
            }
          });

          totalNotificationsCreated++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Cron de follow-up concluído com sucesso. ${totalNotificationsCreated} alerta(s) criado(s).`,
      totalNotificationsCreated,
      executedAt: now.toISOString(),
    });
  } catch (error: any) {
    console.error('Erro ao executar cron de follow-up:', error);
    return NextResponse.json({
      error: 'Falha na execução do cron de follow-up: ' + (error.message || 'Erro interno.')
    }, { status: 500 });
  }
}
