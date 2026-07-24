import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    // Determine the company ID to filter projects by company
    // A project belongs to a client, and a client belongs to a user (Partner or Technician)
    const companyId = session.user.role === 'PARTNER' ? session.user.id : session.user.companyId;

    let projectWhereClause: any = {};
    
    if (session.user.role !== 'ADMIN') {
      projectWhereClause = {
        client: {
          OR: [
            { userId: companyId },
            { user: { companyId: companyId } }
          ]
        },
        createdAt: { gte: sixMonthsAgo }
      };
    } else {
      projectWhereClause = {
        createdAt: { gte: sixMonthsAgo }
      };
    }

    // 1. Total Projects
    const totalProjects = await prisma.project.count({
      where: projectWhereClause
    });

    // 2. Total kWp, Faturamento e Status
    const projects = await prisma.project.findMany({
      where: projectWhereClause,
      select: {
        id: true,
        name: true,
        totalKwp: true,
        estimatedCost: true,
        createdAt: true,
        status: true,
        lossReason: true,
        lossDetails: true,
        client: {
          select: {
            id: true,
            name: true,
            concessionaria: true,
            protocolDate: true,
            user: {
              select: {
                id: true,
                name: true,
                role: true,
              }
            }
          }
        }
      }
    });

    const totalKwp = projects.reduce((acc, curr) => acc + (curr.totalKwp || 0), 0);
    const totalEstimatedRevenue = projects.reduce((acc, curr) => acc + (curr.estimatedCost || ((curr.totalKwp || 0) * 3800)), 0);

    const openProjects = projects.filter(p => p.status === 'SIMULATION' || p.status === 'NEGOTIATION');
    const openEstimatedRevenue = openProjects.reduce((acc, curr) => acc + (curr.estimatedCost || ((curr.totalKwp || 0) * 3800)), 0);

    const closedCount = projects.filter(p => p.status === 'CLOSED' || p.status === 'INSTALLATION' || p.status === 'COMPLETED').length;
    const conversionRatePercent = totalProjects > 0 ? Math.round((closedCount / totalProjects) * 100) : 0;
    const averageTicket = totalProjects > 0 ? Math.round(totalEstimatedRevenue / totalProjects) : 0;

    // 3. Status Distribution
    const statusCounts = projects.reduce((acc: Record<string, number>, curr) => {
      acc[curr.status] = (acc[curr.status] || 0) + 1;
      return acc;
    }, {});

    const statusData = [
      { name: 'Simulação', value: statusCounts.SIMULATION || 0 },
      { name: 'Negociação', value: statusCounts.NEGOTIATION || 0 },
      { name: 'Fechado', value: statusCounts.CLOSED || 0 },
      { name: 'Instalação', value: statusCounts.INSTALLATION || 0 },
      { name: 'Concluído', value: statusCounts.COMPLETED || 0 },
      { name: 'Perdido', value: statusCounts.CANCELED || 0 },
    ];

    // 4. Monthly Evolution (Last 6 months)
    const monthlyDataMap: Record<string, { name: string, projetos: number, kwp: number }> = {};

    projects.forEach(p => {
      const monthYear = new Date(p.createdAt).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
      if (!monthlyDataMap[monthYear]) {
        monthlyDataMap[monthYear] = { name: monthYear, projetos: 0, kwp: 0 };
      }
      monthlyDataMap[monthYear].projetos += 1;
      monthlyDataMap[monthYear].kwp += p.totalKwp || 0;
    });

    const monthlyData = Object.values(monthlyDataMap);

    // 5. C2 — Analytics de Motivos de Perda (CANCELED)
    const canceledProjects = projects.filter(p => p.status === 'CANCELED');
    const lossReasonMap: Record<string, number> = {};
    canceledProjects.forEach(p => {
      const reason = p.lossReason?.trim() || 'Outros / Não informado';
      lossReasonMap[reason] = (lossReasonMap[reason] || 0) + 1;
    });
    const lossReasonData = Object.entries(lossReasonMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    // 6. H1 — Painel por Concessionária
    const concessionariaMap: Record<string, {
      name: string;
      total: number;
      simulacao: number;
      negociacao: number;
      homologacao: number;
      concluido: number;
      cancelado: number;
      kwpTotal: number;
    }> = {};

    projects.forEach(p => {
      const concName = p.client?.concessionaria?.trim() || 'Não informada';
      if (!concessionariaMap[concName]) {
        concessionariaMap[concName] = {
          name: concName,
          total: 0,
          simulacao: 0,
          negociacao: 0,
          homologacao: 0,
          concluido: 0,
          cancelado: 0,
          kwpTotal: 0,
        };
      }
      const item = concessionariaMap[concName];
      item.total += 1;
      item.kwpTotal += p.totalKwp || 0;
      if (p.status === 'SIMULATION') item.simulacao += 1;
      else if (p.status === 'NEGOTIATION') item.negociacao += 1;
      else if (p.status === 'CLOSED' || p.status === 'INSTALLATION') item.homologacao += 1;
      else if (p.status === 'COMPLETED') item.concluido += 1;
      else if (p.status === 'CANCELED') item.cancelado += 1;
    });

    const concessionariaData = Object.values(concessionariaMap)
      .map(c => ({ ...c, kwpTotal: Number(c.kwpTotal.toFixed(2)) }))
      .sort((a, b) => b.total - a.total);

    // 7. D2 — Performance por Técnico / Responsável
    const teamMap: Record<string, {
      id: string;
      name: string;
      role: string;
      totalProjects: number;
      closedProjects: number;
      totalKwp: number;
      totalRevenue: number;
      conversionRate: number;
    }> = {};

    projects.forEach(p => {
      const u = p.client?.user;
      const userId = u?.id || 'unassigned';
      const userName = u?.name || 'Sem responsável';
      const userRole = u?.role || 'N/A';

      if (!teamMap[userId]) {
        teamMap[userId] = {
          id: userId,
          name: userName,
          role: userRole === 'ADMIN' ? 'Admin' : userRole === 'PARTNER' ? 'Parceiro' : 'Técnico',
          totalProjects: 0,
          closedProjects: 0,
          totalKwp: 0,
          totalRevenue: 0,
          conversionRate: 0,
        };
      }
      const member = teamMap[userId];
      member.totalProjects += 1;
      member.totalKwp += p.totalKwp || 0;
      member.totalRevenue += p.estimatedCost || ((p.totalKwp || 0) * 3800);
      if (['CLOSED', 'INSTALLATION', 'COMPLETED'].includes(p.status)) {
        member.closedProjects += 1;
      }
    });

    const teamPerformance = Object.values(teamMap).map(member => ({
      ...member,
      totalKwp: Number(member.totalKwp.toFixed(2)),
      totalRevenue: Math.round(member.totalRevenue),
      conversionRate: member.totalProjects > 0 ? Math.round((member.closedProjects / member.totalProjects) * 100) : 0,
    })).sort((a, b) => b.closedProjects - a.closedProjects);

    const canceledProjectsList = projects
      .filter(p => p.status === 'CANCELED' || Boolean(p.lossReason))
      .map(p => ({
        id: p.id,
        name: p.name || 'Projeto sem nome',
        totalKwp: Number((p.totalKwp || 0).toFixed(2)),
        estimatedCost: Math.round(p.estimatedCost || ((p.totalKwp || 0) * 3800)),
        createdAt: p.createdAt,
        lossReason: p.lossReason || 'Outros / Não informado',
        clientId: p.client?.id || null,
        clientName: p.client?.name || 'Sem cliente vinculado',
      }))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // 8. Procurações a Vencer (<= 15 dias) ou Vencidas
    const now = new Date();
    const fifteenDaysFromNow = new Date();
    fifteenDaysFromNow.setDate(fifteenDaysFromNow.getDate() + 15);

    const procuracaoClients = await prisma.client.findMany({
      where: {
        procuracaoExpirationDate: {
          lte: fifteenDaysFromNow,
        },
      },
      select: {
        id: true,
        name: true,
        procuracaoName: true,
        procuracaoExpirationDate: true,
      },
      orderBy: {
        procuracaoExpirationDate: 'asc',
      },
    });

    const procuracaoAlerts = procuracaoClients.map((c) => {
      const exp = new Date(c.procuracaoExpirationDate!);
      const diffTime = exp.getTime() - now.getTime();
      const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return {
        id: c.id,
        clientName: c.name,
        docName: c.procuracaoName || 'Procuração.pdf',
        expirationDate: c.procuracaoExpirationDate,
        daysRemaining,
        isExpired: daysRemaining < 0,
      };
    });

    return NextResponse.json({
      totalProjects,
      closedProjects: closedCount,
      canceledProjectsCount: canceledProjectsList.length,
      canceledProjectsList,
      procuracaoAlerts,
      totalKwp: Number(totalKwp.toFixed(2)),
      totalEstimatedRevenue: Math.round(totalEstimatedRevenue),
      openEstimatedRevenue: Math.round(openEstimatedRevenue),
      conversionRatePercent,
      averageTicket,
      statusData,
      monthlyData,
      lossReasonData,
      concessionariaData,
      teamPerformance
    });

  } catch (error) {
    console.error('Erro na API de Analytics:', error);
    return NextResponse.json({ error: 'Erro interno ao buscar métricas.' }, { status: 500 });
  }
}
