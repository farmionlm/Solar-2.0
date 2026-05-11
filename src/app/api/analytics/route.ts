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

    let userFilter = {};
    if (session.user.role === 'TECHNICIAN') {
      userFilter = { clientId: { not: undefined } }; // Basic filter, actually technicians can see company data or just theirs
      // To keep it simple, let's show company-wide stats to everyone in the company, or restrict to Admin/Partner
    }

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
        }
      };
    }

    // 1. Total Projects
    const totalProjects = await prisma.project.count({
      where: projectWhereClause
    });

    // 2. Total kWp
    const projects = await prisma.project.findMany({
      where: projectWhereClause,
      select: { totalKwp: true, createdAt: true, status: true }
    });

    const totalKwp = projects.reduce((acc, curr) => acc + (curr.totalKwp || 0), 0);

    // 3. Status Distribution
    const statusCounts = projects.reduce((acc: any, curr) => {
      acc[curr.status] = (acc[curr.status] || 0) + 1;
      return acc;
    }, {});

    const statusData = [
      { name: 'Simulação', value: statusCounts.SIMULATION || 0 },
      { name: 'Negociação', value: statusCounts.NEGOTIATION || 0 },
      { name: 'Fechado', value: statusCounts.CLOSED || 0 },
      { name: 'Instalação', value: statusCounts.INSTALLATION || 0 },
      { name: 'Concluído', value: statusCounts.COMPLETED || 0 },
    ];

    // 4. Monthly Evolution (Last 6 months)
    const monthlyDataMap: any = {};
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);

    projects.forEach(p => {
      if (new Date(p.createdAt) >= sixMonthsAgo) {
        const monthYear = new Date(p.createdAt).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
        if (!monthlyDataMap[monthYear]) {
          monthlyDataMap[monthYear] = { name: monthYear, projetos: 0, kwp: 0 };
        }
        monthlyDataMap[monthYear].projetos += 1;
        monthlyDataMap[monthYear].kwp += p.totalKwp || 0;
      }
    });

    const monthlyData = Object.values(monthlyDataMap);

    return NextResponse.json({
      totalProjects,
      totalKwp: Number(totalKwp.toFixed(2)),
      statusData,
      monthlyData
    });

  } catch (error) {
    console.error('Erro na API de Analytics:', error);
    return NextResponse.json({ error: 'Erro interno ao buscar métricas.' }, { status: 500 });
  }
}
